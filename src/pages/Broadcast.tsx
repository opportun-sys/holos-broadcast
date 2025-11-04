import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Play, Square, Tv } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Progress } from '@/components/ui/progress';
import { StreamLinks } from '@/components/StreamLinks';
import { TNTTransmission } from '@/components/TNTTransmission';

interface Channel {
  id: string;
  name: string;
  is_live: boolean;
  hls_url: string | null;
  logo_url: string | null;
  schedule_active: boolean;
}

interface CurrentProgram {
  id: string;
  title: string;
  type: string;
  start_time: string;
  duration_minutes: number;
  asset_id: string | null;
  video_url?: string | null;
}

export default function Broadcast() {
  const { channelId } = useParams<{ channelId: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [currentProgram, setCurrentProgram] = useState<CurrentProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<CurrentProgram | null>(null);
  const [playlistPrograms, setPlaylistPrograms] = useState<CurrentProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const handlePlay = async () => {
    if (!channelId) return;
    
    setIsPlaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('stream-orchestrator', {
        body: { 
          channelId,
          action: 'start'
        }
      });

      if (error) throw error;

      toast({
        title: "Lecture démarrée",
        description: "Le contenu est maintenant en lecture",
      });

      await fetchChannelData();
      await fetchPlaylistPrograms();
    } catch (error) {
      console.error('Error starting playback:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer la lecture",
        variant: "destructive"
      });
      setIsPlaying(false);
    }
  };

  const handleStop = async () => {
    if (!channelId) return;
    
    setIsPlaying(false);
    try {
      const { error } = await supabase.functions.invoke('stream-orchestrator', {
        body: { 
          channelId,
          action: 'stop'
        }
      });

      if (error) throw error;

      toast({
        title: "Lecture arrêtée",
        description: "Le contenu a été mis en pause",
      });

      await fetchChannelData();
    } catch (error) {
      console.error('Error stopping playback:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'arrêter la lecture",
        variant: "destructive"
      });
    }
  };

  const handleCut = async () => {
    if (!channelId) return;
    
    try {
      const { error } = await supabase
        .from('channels')
        .update({ is_live: true, schedule_active: true })
        .eq('id', channelId);
      
      if (error) throw error;

      toast({
        title: "Envoyé à l'antenne",
        description: "Le contenu est maintenant diffusé en direct",
      });

      await fetchChannelData();
    } catch (error) {
      console.error('Error sending to antenna:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer à l'antenne",
        variant: "destructive"
      });
    }
  };


  useEffect(() => {
    if (channelId) {
      fetchChannelData();
      fetchCurrentProgram();
      fetchPlaylistPrograms();
    }
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    const channel = supabase
      .channel('program_schedule_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'program_schedule',
          filter: `channel_id=eq.${channelId}`
        },
        () => {
          fetchPlaylistPrograms();
          fetchCurrentProgram();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchChannelData = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      setChannel({
        ...data,
        schedule_active: (data as any).schedule_active || false
      } as Channel);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la chaîne',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentProgram = async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('program_schedule')
        .select(`
          *,
          video_assets (
            file_url
          )
        `)
        .eq('channel_id', channelId)
        .lte('start_time', now)
        .order('start_time', { ascending: false })
        .limit(2);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const currentProgramData = {
          ...data[0],
          video_url: (data[0] as any).video_assets?.file_url || null
        };
        setCurrentProgram(currentProgramData);
        
        if (data.length > 1) {
          const nextProgramData = {
            ...data[1],
            video_url: (data[1] as any).video_assets?.file_url || null
          };
          setNextProgram(nextProgramData);
        }
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
    }
  };

  const fetchPlaylistPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('program_schedule')
        .select(`
          *,
          video_assets (
            file_url
          )
        `)
        .eq('channel_id', channelId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      
      if (data) {
        const programs = data.map((item: any) => ({
          ...item,
          video_url: item.video_assets?.file_url || null
        }));
        setPlaylistPrograms(programs);
      }
    } catch (error) {
      console.error('Error fetching playlist programs:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          Chargement...
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="p-6">
            <h2 className="text-2xl font-bold">Chaîne introuvable</h2>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container-fluid px-6 py-4">
        {/* Top Row - Real-time Antenna Monitor */}
        <div className="mb-4">
          <Card className="bg-card border-border">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">ANTENNE EN TEMPS RÉEL</h2>
              <div className="flex items-center gap-4">
                {channel?.schedule_active && (
                  <Badge className="bg-red-500 animate-pulse">
                    <Radio className="h-3 w-3 mr-1" />
                    DIFFUSION EN COURS
                  </Badge>
                )}
                <div className="text-xl font-mono text-foreground">
                  {currentTime.toLocaleTimeString('fr-FR')}
                </div>
              </div>
            </div>
            
            <div className="relative">
              {channel?.hls_url && channel?.schedule_active ? (
                <VideoPlayer 
                  src={channel.hls_url}
                  poster={channel.logo_url || undefined}
                  autoplay={true}
                  className="w-full aspect-video"
                />
              ) : (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <div className="text-center">
                    <Radio className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                    <p className="text-xl text-muted-foreground">
                      {channel?.schedule_active ? 'En attente du flux...' : 'Aucune diffusion active'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {currentProgram && channel?.schedule_active && (
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{currentProgram.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(currentProgram.start_time).toLocaleTimeString('fr-FR')} - 
                      Durée: {currentProgram.duration_minutes} min
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {currentProgram.type === 'live' ? 'LIVE RTMP' : 'VOD'}
                  </Badge>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-380px)]">
          
          {/* Left Column - PROGRAM (Playlist) */}
          <div className="col-span-6 flex flex-col gap-4">
            <Card className="flex-1 bg-card border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">PROGRAM (Playlist)</h2>
              </div>
              
              {/* Preview Area */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
                {currentProgram?.video_url ? (
                  <>
                    <VideoPlayer 
                      src={currentProgram.video_url}
                      autoplay={false}
                      className="w-full h-full"
                    />
                    {channel?.schedule_active && (
                      <Badge className="absolute top-4 right-4 bg-green-500 animate-pulse">
                        GRILLE ACTIVE
                      </Badge>
                    )}
                  </>
                ) : currentProgram ? (
                  <div className="text-center p-8">
                    <h3 className="text-4xl font-bold text-white mb-4">{currentProgram.title}</h3>
                    <p className="text-white/70">
                      {currentProgram.type === 'live' ? 'Direct RTMP' : 'Aucune vidéo'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucun programme</p>
                  </div>
                )}
              </div>

              {/* VOD Progress */}
              {currentProgram && currentProgram.type !== 'live' && (
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium text-muted-foreground">VOD</span>
                    <Progress value={33} className="flex-1" />
                    <span className="text-sm text-muted-foreground">0:13 / {currentProgram.duration_minutes}</span>
                  </div>
                </div>
              )}

              {/* Control Buttons */}
              <div className="p-4 border-b border-border flex gap-3">
                <Button 
                  variant={isPlaying ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={handlePlay}
                  disabled={isPlaying}
                >
                  <Play className="h-4 w-4" />
                  Play
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleStop}
                  disabled={!isPlaying}
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
                <Button 
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={handleCut}
                >
                  <Tv className="h-4 w-4" />
                  Cut
                </Button>
              </div>

              {/* Now Playing Section - Playlist Programs */}
              <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-2xl font-bold mb-4">Now</h3>
                
                {playlistPrograms.length > 0 ? (
                  <div className="space-y-3">
                    {playlistPrograms.map((program, index) => (
                      <div 
                        key={program.id}
                        className={`rounded-lg p-3 ${
                          index === 0 
                            ? 'bg-muted/50 border-l-4 border-primary' 
                            : 'bg-primary/10'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">{program.title}</h4>
                            <Badge variant="secondary" className="mt-1">
                              {program.type === 'live' ? 'LIVE' : 'VOD'}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(program.start_time).toLocaleTimeString('fr-FR')} - 
                              Durée: {program.duration_minutes} min
                            </p>
                          </div>
                        </div>
                        {index === 0 && (
                          <>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>En cours</span>
                            </div>
                            <Progress value={40} className="mt-2" />
                          </>
                        )}
                        {program.video_url && (
                          <div className="mt-3">
                            <VideoPlayer 
                              src={program.video_url}
                              autoplay={false}
                              className="w-full aspect-video rounded"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Radio className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun programme dans la playlist</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - LIVE (Antenne) Preview */}
          <div className="col-span-6 flex flex-col gap-4">
            <Card className="flex-1 bg-card border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">PREVIEW PROGRAMME</h2>
              </div>

              {/* Live Program Preview with Player */}
              <div className="flex-1 flex flex-col">
                <div className="relative flex-1">
                  {playlistPrograms.length > 0 && playlistPrograms[0]?.video_url ? (
                    <div className="h-full">
                      <VideoPlayer 
                        src={playlistPrograms[0].video_url}
                        autoplay={isPlaying}
                        className="w-full h-full"
                      />
                      {channel?.is_live && (
                        <Badge className="absolute top-4 right-4 bg-red-500 animate-pulse">
                          <Radio className="h-3 w-3 mr-1" />
                          EN DIRECT
                        </Badge>
                      )}
                    </div>
                  ) : playlistPrograms.length > 0 ? (
                    <div className="aspect-video bg-black flex items-center justify-center">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold text-white mb-2">
                          {playlistPrograms[0].title}
                        </h3>
                        <p className="text-white/70">
                          {playlistPrograms[0].type === 'live' ? 'Direct RTMP' : 'Aucune vidéo'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-black flex items-center justify-center">
                      <div className="text-center">
                        <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Aucun programme</p>
                      </div>
                    </div>
                  )}
                </div>

                {playlistPrograms.length > 0 && (
                  <div className="p-4 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{playlistPrograms[0].title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(playlistPrograms[0].start_time).toLocaleTimeString('fr-FR')} - 
                          Durée: {playlistPrograms[0].duration_minutes} min
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {playlistPrograms[0].type === 'live' ? 'LIVE' : 'VOD'}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Row - Stream Links and TNT Transmission */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <StreamLinks 
            channelId={channelId!}
            hlsUrl={channel?.hls_url || undefined}
          />
          <TNTTransmission channelId={channelId!} />
        </div>
      </div>
    </div>
  );
}
