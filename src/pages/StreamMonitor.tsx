import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, AlertCircle, CheckCircle, Clock, Radio } from 'lucide-react';

export default function StreamMonitor() {
  const { channelId } = useParams<{ channelId: string }>();
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (channelId) {
      fetchStats();
      fetchLogs();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`monitor-${channelId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'streaming_sessions',
            filter: `channel_id=eq.${channelId}`
          },
          () => {
            fetchStats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'webhook_logs',
            filter: `channel_id=eq.${channelId}`
          },
          () => {
            fetchLogs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [channelId]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stream-monitor', {
        body: { channelId, action: 'get_stats' }
      });

      if (error) throw error;
      setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stream-monitor', {
        body: { 
          channelId, 
          action: 'get_logs',
          data: { limit: 50 }
        }
      });

      if (error) throw error;
      setLogs(data.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Monitoring & Logs</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              {stats?.is_active ? (
                <Radio className="h-8 w-8 text-green-500 animate-pulse" />
              ) : (
                <Radio className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">État</p>
                <p className="text-2xl font-bold">
                  {stats?.is_active ? 'ACTIF' : 'INACTIF'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Temps diffusion</p>
                <p className="text-2xl font-bold">{stats?.total_streaming_minutes || 0} min</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Programmes joués</p>
                <p className="text-2xl font-bold">{stats?.programs_played || 0}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Erreurs</p>
                <p className="text-2xl font-bold">{stats?.error_count || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Active Outputs */}
        {stats?.outputs && stats.outputs.length > 0 && (
          <Card className="p-4 mb-6">
            <h2 className="text-xl font-bold mb-4">Sorties actives</h2>
            <div className="space-y-2">
              {stats.outputs.map((output: any) => (
                <div key={output.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div>
                    <Badge>{output.protocol.toUpperCase()}</Badge>
                    <p className="text-sm mt-1">{output.target_url}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {output.bitrate_kbps && `${output.bitrate_kbps} kbps`}
                    </p>
                    <p className="text-sm text-muted-foreground">{output.resolution}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Logs Tabs */}
        <Card className="p-4">
          <Tabs defaultValue="sessions">
            <TabsList>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="playlist">Playlist</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="transmission">Transmission</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs?.sessions?.map((session: any) => (
                    <div key={session.id} className="p-3 bg-muted rounded">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(session.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-sm">Source: {session.source_type}</p>
                      {session.error_message && (
                        <p className="text-sm text-red-500 mt-1">{session.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="playlist">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs?.playlist_logs?.map((log: any) => (
                    <div key={log.id} className="p-3 bg-muted rounded">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{log.program_schedule?.title}</h4>
                        <Badge>{log.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Début: {new Date(log.started_at).toLocaleTimeString('fr-FR')}
                        </span>
                        {log.ended_at && (
                          <span>
                            Fin: {new Date(log.ended_at).toLocaleTimeString('fr-FR')}
                          </span>
                        )}
                        {log.duration_seconds && (
                          <span>{Math.round(log.duration_seconds / 60)} min</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="webhooks">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs?.webhook_logs?.map((log: any) => (
                    <div key={log.id} className="p-3 bg-muted rounded">
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{log.event_type}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <pre className="text-xs bg-background p-2 rounded overflow-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="transmission">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {logs?.transmission_logs?.map((log: any) => (
                    <div key={log.id} className="p-3 bg-muted rounded">
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{log.status}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <p>Protocol: {log.protocol}</p>
                        <p>Format: {log.format}</p>
                        {log.bitrate && <p>Bitrate: {log.bitrate} kbps</p>}
                        {log.error_message && (
                          <p className="text-red-500">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-6 flex gap-4">
          <Button onClick={fetchStats}>
            <Activity className="mr-2 h-4 w-4" />
            Actualiser stats
          </Button>
          <Button variant="outline" onClick={fetchLogs}>
            Actualiser logs
          </Button>
        </div>
      </div>
    </div>
  );
}
