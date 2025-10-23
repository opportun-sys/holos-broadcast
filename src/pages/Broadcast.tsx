import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Play, Pause, Type } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Progress } from '@/components/ui/progress';

interface Channel {
  id: string;
  name: string;
  is_live: boolean;
  hls_url: string | null;
  logo_url: string | null;
}

interface CurrentProgram {
  title: string;
  type: string;
  start_time: string;
  duration_minutes: number;
}

export default function Broadcast() {
  const { channelId } = useParams<{ channelId: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [currentProgram, setCurrentProgram] = useState<CurrentProgram | null>(null);
  const [nextProgram, setNextProgram] = useState<CurrentProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const handleStartStream = async () => {
    if (!channelId) return;
    
    setIsStartingStream(true);
    try {
      const { data, error } = await supabase.functions.invoke('stream-playlist', {
        body: { channelId }
      });

      if (error) throw error;

      toast({
        title: "Flux démarré",
        description: `Playlist en direct créée avec ${data.playlist?.length || 0} vidéos`,
      });

      // Refresh channel data to get new HLS URL
      await fetchChannelData();
    } catch (error) {
      console.error('Error starting stream:', error);
      toast({
        title: "Erreur",
        description: "Impossible de démarrer le flux",
        variant: "destructive"
      });
    } finally {
      setIsStartingStream(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchChannelData();
      fetchCurrentProgram();
    }
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
      setChannel(data);
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
        .select('*')
        .eq('channel_id', channelId)
        .lte('start_time', now)
        .order('start_time', { ascending: false })
        .limit(2);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentProgram(data[0]);
        if (data.length > 1) {
          setNextProgram(data[1]);
        }
      }
    } catch (error) {
      console.error('Error fetching programs:', error);
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
        {/* Three Column Layout */}
        <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
          
          {/* Left Column - PROGRAM (Playlist) */}
          <div className="col-span-4 flex flex-col gap-4">
            <Card className="flex-1 bg-card border-border">
              <div className="p-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">PROGRAM (Playlist)</h2>
              </div>
              
              {/* Preview Area */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
                {currentProgram ? (
                  <div className="text-center p-8">
                    <h3 className="text-4xl font-bold text-white mb-4">{currentProgram.title}</h3>
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

              {/* Action Buttons */}
              <div className="p-4 border-b border-border flex gap-3">
                <Button variant="outline" className="flex-1">
                  Prévisualiser
                </Button>
                <Button variant="outline" className="flex-1">
                  Supprimer
                </Button>
              </div>

              {/* Now Playing Section */}
              <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-2xl font-bold mb-4">Now</h3>
                
                {currentProgram && (
                  <div className="space-y-3">
                    {/* Current Item */}
                    <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-primary">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{currentProgram.title}</h4>
                          <Badge variant="secondary" className="mt-1">
                            {currentProgram.type === 'live' ? 'LIVE' : 'VOD'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>1:13 / {currentProgram.duration_minutes}:00</span>
                      </div>
                      <Progress value={40} className="mt-2" />
                    </div>

                    {/* Next Item */}
                    {nextProgram && (
                      <div className="bg-primary/20 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary text-primary-foreground rounded px-2 py-1 text-sm font-bold">
                            -10
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{nextProgram.title}</h4>
                            <Badge variant="secondary" className="mt-1">
                              {nextProgram.type === 'live' ? 'LIVE' : 'VOD'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Center Column - Controls */}
          <div className="col-span-4 flex flex-col gap-4 items-center justify-start pt-8">
            {/* Title/Text Button */}
            <Card className="w-48 h-48 bg-card border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-smooth">
              <Type className="h-24 w-24 text-foreground" />
            </Card>

            {/* Control Buttons Row */}
            <div className="flex gap-3">
              <Button size="lg" variant="outline" className="w-20 h-20 text-2xl font-bold">
                C
              </Button>
              <Button size="lg" variant="outline" className="w-20 h-20">
                <Pause className="h-8 w-8" />
              </Button>
            </div>

            {/* Dissolve Button */}
            <Button variant="secondary" size="lg" className="px-8">
              Dissolve
            </Button>

            {/* Streams List */}
            <Card className="w-full max-w-md mt-8 bg-card border-border">
              <div className="p-4 border-b border-border">
                <h3 className="text-xl font-bold">Streams</h3>
              </div>
              <div className="p-4 space-y-3">
                {currentProgram && (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{currentProgram.title}</span>
                    <Badge className="w-fit bg-yellow-500 text-black">LIVE</Badge>
                  </div>
                )}
                {nextProgram && (
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-muted-foreground">{nextProgram.title}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - LIVE (Antenne) */}
          <div className="col-span-4 flex flex-col gap-4">
            <Card className="flex-1 bg-card border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">LIVE (Antenne)</h2>
                <div className="text-xl font-mono text-foreground">
                  {currentTime.toLocaleTimeString('fr-FR')}
                </div>
              </div>

              {/* Live Preview */}
              <div className="relative">
                {channel.hls_url ? (
                  <VideoPlayer 
                    src={channel.hls_url}
                    poster={channel.logo_url || undefined}
                    autoplay={channel.is_live}
                    className="w-full aspect-video"
                  />
                ) : (
                  <div className="aspect-video bg-black flex items-center justify-center">
                    <div className="text-center">
                      <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Aucun flux actif
                      </p>
                    </div>
                  </div>
                )}
                {channel.is_live && (
                  <Badge className="absolute top-4 right-4 bg-red-500 shadow-live">
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    EN DIRECT
                  </Badge>
                )}
              </div>

              {/* Live Controls */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-end gap-4">
                  {!channel.is_live ? (
                    <Button 
                      onClick={handleStartStream}
                      disabled={isStartingStream}
                      className="gap-2"
                      size="lg"
                    >
                      <Play className="h-5 w-5" />
                      {isStartingStream ? "Démarrage..." : "Forcer le direct"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="lg">
                      Forcer le direct
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
