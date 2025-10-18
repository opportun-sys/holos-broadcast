import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

  useEffect(() => {
    if (channelId) {
      fetchChannelData();
      fetchCurrentProgram();
    }
  }, [channelId]);

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
          <Card>
            <CardHeader>
              <CardTitle>Chaîne introuvable</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-cyan-400 bg-clip-text text-transparent">
            {channel.name}
          </h1>
          <p className="text-muted-foreground mt-2">Diffusion en direct</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center relative">
                {channel.hls_url ? (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <p className="text-muted-foreground">Lecteur vidéo HLS</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Aucun flux disponible</p>
                  </div>
                )}
                {channel.is_live && (
                  <Badge className="absolute top-4 right-4 bg-red-500">
                    <Radio className="h-3 w-3 mr-1 animate-pulse" />
                    EN DIRECT
                  </Badge>
                )}
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {currentProgram ? currentProgram.title : 'Hors antenne'}
                    </h3>
                    {currentProgram && (
                      <p className="text-sm text-muted-foreground">
                        {currentProgram.type === 'live' ? 'Direct' : 'VOD'} • {currentProgram.duration_minutes} min
                      </p>
                    )}
                  </div>
                  <Badge variant={channel.is_live ? 'default' : 'secondary'}>
                    {channel.is_live ? 'Live' : 'Programme'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Guide TV
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentProgram && (
                  <div className="border-l-4 border-primary pl-4">
                    <Badge variant="default" className="mb-2">Maintenant</Badge>
                    <h4 className="font-semibold">{currentProgram.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(currentProgram.start_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • {currentProgram.duration_minutes} min
                    </p>
                  </div>
                )}
                
                {nextProgram && (
                  <div className="border-l-4 border-muted pl-4">
                    <Badge variant="outline" className="mb-2">À suivre</Badge>
                    <h4 className="font-semibold">{nextProgram.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(nextProgram.start_time).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })} • {nextProgram.duration_minutes} min
                    </p>
                  </div>
                )}

                {!currentProgram && !nextProgram && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun programme planifié
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Statut de diffusion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">État:</span>
                  <span className="text-sm font-medium">
                    {channel.is_live ? 'En direct' : 'Programme'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Source:</span>
                  <span className="text-sm font-medium">
                    {currentProgram?.type === 'live' ? 'RTMP' : 'VOD'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Format:</span>
                  <span className="text-sm font-medium">HLS</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
