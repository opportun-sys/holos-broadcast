import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { SimpleVideoPlayer } from '@/components/SimpleVideoPlayer';
import { PlaylistManager } from '@/components/PlaylistManager';

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playlistHlsUrl, setPlaylistHlsUrl] = useState<string | null>(null);
  const [isPlaylistOnAir, setIsPlaylistOnAir] = useState(false);


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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channels',
          filter: `id=eq.${channelId}`
        },
        (payload) => {
          // Update on-air status when channel.schedule_active changes
          const newData = payload.new as any;
          if (newData.schedule_active) {
            setIsPlaylistOnAir(true);
          }
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
              {isPlaylistOnAir && playlistHlsUrl ? (
                <SimpleVideoPlayer 
                  src={playlistHlsUrl}
                  poster={channel?.logo_url || undefined}
                  autoplay={true}
                  className="w-full aspect-video"
                />
              ) : channel?.is_live && channel?.hls_url ? (
                <SimpleVideoPlayer 
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
                      {playlistHlsUrl && !isPlaylistOnAir 
                        ? 'Playlist en attente - Cliquez sur "Playlist à l\'antenne"' 
                        : channel?.schedule_active 
                        ? 'En attente du flux...' 
                        : 'Aucune diffusion active'}
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
          
          {/* Left Column - Playlist Manager */}
          <div className="col-span-6 flex flex-col gap-4">
            <PlaylistManager 
              channelId={channelId || ''} 
              programs={playlistPrograms}
              onRefresh={() => {
                fetchChannelData();
                fetchPlaylistPrograms();
              }}
              onPlaylistStart={(hlsUrl) => {
                setPlaylistHlsUrl(hlsUrl);
                setIsPlaylistOnAir(false); // Not on air yet, just in preview
              }}
              onPlaylistStop={() => {
                setPlaylistHlsUrl(null);
                setIsPlaylistOnAir(false);
              }}
            />
          </div>

          {/* Right Column - Preview */}
          <div className="col-span-6 flex flex-col gap-4">
            <Card className="flex-1 bg-card border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">PREVIEW PROGRAMME</h2>
              </div>

              {/* Preview Area */}
              <div className="flex-1 flex flex-col">
                <div className="relative flex-1 bg-black flex items-center justify-center">
                  {playlistHlsUrl && !isPlaylistOnAir ? (
                    <SimpleVideoPlayer 
                      src={playlistHlsUrl}
                      autoplay={true}
                      className="w-full h-full"
                    />
                  ) : nextProgram ? (
                    <div className="text-center p-8">
                      <h3 className="text-4xl font-bold text-white mb-4">{nextProgram.title}</h3>
                      <p className="text-white/70">Programme à venir</p>
                      <Badge variant="secondary" className="mt-4">
                        {nextProgram.type === 'live' ? 'LIVE' : 'VOD'}
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Aucun programme de prévisualisation</p>
                    </div>
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
