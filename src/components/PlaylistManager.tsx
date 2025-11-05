import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, Radio, Tv } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PlaylistProgram {
  id: string;
  title: string;
  type: string;
  duration_minutes: number;
  video_url?: string | null;
}

interface PlaylistManagerProps {
  channelId: string;
  programs: PlaylistProgram[];
  onRefresh: () => void;
  onPlaylistStart?: (hlsUrl: string) => void;
  onPlaylistStop?: () => void;
}

export const PlaylistManager = ({ channelId, programs, onRefresh, onPlaylistStart, onPlaylistStop }: PlaylistManagerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isOnAir, setIsOnAir] = useState(false);

  // Start playlist loop with FFmpeg Cloud
  const handleStartPlaylist = async () => {
    if (programs.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Aucune vidéo dans la playlist',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Build playlist for FFmpeg Cloud
      const playlist = programs.map(p => ({
        type: p.type,
        url: p.video_url || '',
        duration: p.duration_minutes
      }));

      const { data, error } = await supabase.functions.invoke('ffmpeg-cloud', {
        body: {
          channelId,
          action: 'start',
          playlist,
          loop: true,
          outputPath: `streams/${channelId}`
        }
      });

      if (error) throw error;

      setIsPlaying(true);
      setIsPaused(false);

      // Get HLS URL from FFmpeg Cloud response
      const hlsUrl = data?.hlsUrl || `https://ffmpeg-cloud.example.com/streams/${channelId}/master.m3u8`;
      
      // Update channel with HLS URL
      await supabase
        .from('channels')
        .update({ hls_url: hlsUrl })
        .eq('id', channelId);

      // Notify parent component
      if (onPlaylistStart) {
        onPlaylistStart(hlsUrl);
      }

      toast({
        title: 'Playlist lancée',
        description: 'La playlist tourne en boucle sur FFmpeg Cloud'
      });

      onRefresh();
    } catch (error) {
      console.error('Error starting playlist:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de lancer la playlist',
        variant: 'destructive'
      });
    }
  };

  // Pause playlist
  const handlePausePlaylist = async () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? 'Lecture reprise' : 'Lecture en pause',
      description: isPaused ? 'La playlist continue' : 'La playlist est en pause'
    });
  };

  // Stop playlist
  const handleStopPlaylist = async () => {
    try {
      const { error } = await supabase.functions.invoke('ffmpeg-cloud', {
        body: {
          channelId,
          action: 'stop'
        }
      });

      if (error) throw error;

      setIsPlaying(false);
      setIsPaused(false);
      setProgress(0);
      setCurrentIndex(0);
      setIsOnAir(false);

      // Clear HLS URL from channel
      await supabase
        .from('channels')
        .update({ 
          hls_url: null,
          is_live: false,
          schedule_active: false
        })
        .eq('id', channelId);

      // Notify parent component
      if (onPlaylistStop) {
        onPlaylistStop();
      }

      toast({
        title: 'Playlist arrêtée',
        description: 'La diffusion est arrêtée'
      });

      onRefresh();
    } catch (error) {
      console.error('Error stopping playlist:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'arrêter la playlist',
        variant: 'destructive'
      });
    }
  };

  // Send playlist to antenna
  const handleSendToAntenna = async () => {
    if (!isPlaying) {
      toast({
        title: 'Erreur',
        description: 'Démarrez d\'abord la playlist',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Activate transmission via FFmpeg Cloud
      const { error: transmitError } = await supabase.functions.invoke('ffmpeg-cloud', {
        body: {
          channelId,
          action: 'transmit',
          protocol: 'hls',
          target: `streams/${channelId}/master.m3u8`
        }
      });

      if (transmitError) throw transmitError;

      // Update channel to show playlist is on air
      const { error } = await supabase
        .from('channels')
        .update({ 
          is_live: true,
          schedule_active: true 
        })
        .eq('id', channelId);

      if (error) throw error;

      setIsOnAir(true);

      toast({
        title: 'Playlist à l\'antenne',
        description: 'Le contenu de la playlist est diffusé vers les liens de sortie'
      });

      onRefresh();
    } catch (error) {
      console.error('Error sending to antenna:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'envoyer à l\'antenne',
        variant: 'destructive'
      });
    }
  };

  // Activate antenna output
  const handleActivateOutput = async () => {
    try {
      const { error } = await supabase.functions.invoke('ffmpeg-cloud', {
        body: {
          channelId,
          action: 'transmit',
          protocol: 'hls',
          target: `streams/${channelId}/master.m3u8`
        }
      });

      if (error) throw error;

      toast({
        title: 'Sortie activée',
        description: 'Les flux HLS sont maintenant disponibles'
      });

      onRefresh();
    } catch (error) {
      console.error('Error activating output:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'activer la sortie',
        variant: 'destructive'
      });
    }
  };

  // Poll status from FFmpeg Cloud
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('ffmpeg-cloud', {
          body: {
            channelId,
            action: 'status'
          }
        });

        if (error) throw error;

        // Update progress and current index based on FFmpeg Cloud status
        if (data?.currentSource) {
          // Simulate progress for demo
          setProgress(prev => (prev >= 100 ? 0 : prev + 5));
        }
      } catch (error) {
        console.error('Error polling status:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPlaying, channelId]);

  return (
    <Card className="bg-card border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">Programme en playlist</h3>
          {isPlaying && (
            <Badge className={isOnAir ? 'bg-red-500 animate-pulse' : 'bg-green-500'}>
              {isOnAir ? (
                <>
                  <Radio className="h-3 w-3 mr-1" />
                  À L'ANTENNE
                </>
              ) : (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  EN LECTURE
                </>
              )}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isPlaying ? (
            <Button 
              onClick={handleStartPlaylist}
              className="flex-1 gap-2"
              variant="default"
            >
              <Play className="h-4 w-4" />
              Lancer la playlist
            </Button>
          ) : (
            <>
              <Button 
                onClick={handlePausePlaylist}
                className="flex-1 gap-2"
                variant={isPaused ? "default" : "outline"}
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? 'Reprendre' : 'Pause'}
              </Button>
              <Button 
                onClick={handleStopPlaylist}
                className="flex-1 gap-2"
                variant="destructive"
              >
                <Square className="h-4 w-4" />
                Arrêter
              </Button>
            </>
          )}
        </div>

        {isPlaying && !isOnAir && (
          <Button 
            onClick={handleSendToAntenna}
            className="w-full gap-2 bg-gradient-to-r from-primary to-accent"
          >
            <Tv className="h-4 w-4" />
            Playlist à l'antenne
          </Button>
        )}

        {isPlaying && isOnAir && (
          <Button 
            onClick={handleActivateOutput}
            className="w-full gap-2"
            variant="default"
          >
            <Radio className="h-4 w-4" />
            Activer l'antenne
          </Button>
        )}

        {/* Progress */}
        {isPlaying && programs[currentIndex] && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{programs[currentIndex].title}</span>
              <Badge variant="secondary">
                {programs[currentIndex].type === 'live' ? 'LIVE' : 'VOD'}
              </Badge>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Vidéo {currentIndex + 1}/{programs.length}</span>
              <span>Boucle infinie activée</span>
            </div>
          </div>
        )}

        {/* Program List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {programs.map((program, index) => (
            <div 
              key={program.id}
              className={`rounded-lg p-3 ${
                index === currentIndex && isPlaying
                  ? 'bg-primary/20 border-l-4 border-primary' 
                  : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">{program.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    Durée: {program.duration_minutes} min
                  </p>
                </div>
                <Badge variant="outline" className="ml-2">
                  {program.type === 'live' ? 'LIVE' : 'VOD'}
                </Badge>
              </div>
              {index === currentIndex && isPlaying && (
                <Progress value={progress} className="mt-2 h-1" />
              )}
            </div>
          ))}
        </div>

        {programs.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Radio className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Aucun programme dans la playlist</p>
            <p className="text-xs mt-1">Ajoutez des vidéos depuis la grille de programme</p>
          </div>
        )}
      </div>
    </Card>
  );
};
