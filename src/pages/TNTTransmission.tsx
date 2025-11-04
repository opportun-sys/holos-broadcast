import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Antenna, Power, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TNTTransmission as TNTTransmissionComponent } from '@/components/TNTTransmission';

interface TransmissionLog {
  id: string;
  status: string;
  format: string | null;
  bitrate: number | null;
  audio_format: string | null;
  protocol: string | null;
  error_message: string | null;
  started_at: string | null;
  created_at: string;
}

export default function TNTTransmission() {
  const { channelId } = useParams<{ channelId: string }>();
  const { isAdmin, isOperator } = useUserRole();
  const [logs, setLogs] = useState<TransmissionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [config, setConfig] = useState({
    format: '1080i',
    audio: 'stereo_48khz',
    protocol: 'UDP'
  });

  useEffect(() => {
    if (channelId) {
      fetchLogs();
    }
  }, [channelId]);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('transmission_logs')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLogs(data || []);
      
      const activeLog = data?.find(log => log.status === 'connected');
      setIsTransmitting(!!activeLog);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les logs',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTransmission = async () => {
    if (!isAdmin) {
      toast({
        title: 'Accès refusé',
        description: 'Seuls les administrateurs peuvent démarrer la transmission',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newStatus = isTransmitting ? 'idle' : 'connected';
      
      const { error } = await supabase.from('transmission_logs').insert({
        channel_id: channelId,
        status: newStatus,
        format: config.format,
        audio_format: config.audio,
        protocol: config.protocol,
        started_at: isTransmitting ? null : new Date().toISOString()
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: isTransmitting ? 'Transmission arrêtée' : 'Transmission démarrée'
      });

      setIsTransmitting(!isTransmitting);
      fetchLogs();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la transmission',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      connected: { variant: 'default', label: 'Connecté' },
      idle: { variant: 'secondary', label: 'Inactif' },
      error: { variant: 'destructive', label: 'Erreur' }
    };
    const config = variants[status] || variants.idle;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-cyan-400 bg-clip-text text-transparent">
            Transmission TNT
          </h1>
          <p className="text-muted-foreground mt-2">
            Supervision de la sortie vers diffuseur TNT
          </p>
        </div>

        <div className="mb-6">
          <TNTTransmissionComponent channelId={channelId!} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Antenna className="h-5 w-5" />
                Statut de transmission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">État:</span>
                {getStatusBadge(isTransmitting ? 'connected' : 'idle')}
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="font-medium text-foreground">{config.format}</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio:</span>
                  <span className="font-medium text-foreground">{config.audio}</span>
                </div>
                <div className="flex justify-between">
                  <span>Protocole:</span>
                  <span className="font-medium text-foreground">{config.protocol}</span>
                </div>
              </div>
              {isAdmin && (
                <Button
                  onClick={handleToggleTransmission}
                  className="w-full"
                  variant={isTransmitting ? 'destructive' : 'default'}
                >
                  <Power className="h-4 w-4 mr-2" />
                  {isTransmitting ? 'Arrêter la transmission' : 'Activer la transmission'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                {isAdmin ? 'Paramètres de sortie TNT' : 'Lecture seule'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="format">Format vidéo</Label>
                <Select
                  value={config.format}
                  onValueChange={(value) => setConfig({ ...config, format: value })}
                  disabled={!isAdmin || isTransmitting}
                >
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1080i">1080i</SelectItem>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="PAL">PAL</SelectItem>
                    <SelectItem value="NTSC">NTSC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="audio">Format audio</Label>
                <Select
                  value={config.audio}
                  onValueChange={(value) => setConfig({ ...config, audio: value })}
                  disabled={!isAdmin || isTransmitting}
                >
                  <SelectTrigger id="audio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stereo_48khz">Stéréo 48 kHz</SelectItem>
                    <SelectItem value="mono_48khz">Mono 48 kHz</SelectItem>
                    <SelectItem value="surround_48khz">Surround 48 kHz</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="protocol">Protocole</Label>
                <Select
                  value={config.protocol}
                  onValueChange={(value) => setConfig({ ...config, protocol: value })}
                  disabled={!isAdmin || isTransmitting}
                >
                  <SelectTrigger id="protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UDP">UDP</SelectItem>
                    <SelectItem value="SRT">SRT</SelectItem>
                    <SelectItem value="SDI">SDI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Historique des transmissions</CardTitle>
            <CardDescription>Les 10 dernières sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucun historique
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statut</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Protocole</TableHead>
                    <TableHead>Démarré à</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.format || '-'}</TableCell>
                      <TableCell>{log.protocol || '-'}</TableCell>
                      <TableCell>
                        {log.started_at
                          ? new Date(log.started_at).toLocaleString('fr-FR')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">{log.error_message}</span>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
