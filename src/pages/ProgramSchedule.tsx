import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Trash2, Video, Radio, Play, FileVideo, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { VideoPlayer } from '@/components/VideoPlayer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ProgramItem {
  id: string;
  title: string;
  type: string;
  start_time: string;
  duration_minutes: number;
  repeat_pattern: string | null;
  asset_id: string | null;
}

interface VideoAsset {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  category: string | null;
  tags: string[];
}

export default function ProgramSchedule() {
  const { channelId } = useParams<{ channelId: string }>();
  const { isAdmin, isOperator } = useUserRole();
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVideosLoading, setIsVideosLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoAsset | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isScheduleActive, setIsScheduleActive] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '',
    type: 'vod',
    start_time: '',
    duration_minutes: 60,
    repeat_pattern: 'none'
  });

  useEffect(() => {
    if (channelId) {
      fetchPrograms();
      fetchVideos();
      fetchScheduleStatus();
    }
  }, [channelId]);

  const fetchScheduleStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('schedule_active')
        .eq('id', channelId)
        .maybeSingle();
      
      if (error) throw error;
      setIsScheduleActive((data as any)?.schedule_active || false);
    } catch (error) {
      console.error('Error fetching schedule status:', error);
    }
  };

  const toggleScheduleActive = async () => {
    try {
      const newStatus = !isScheduleActive;
      const { error } = await supabase
        .from('channels')
        .update({ schedule_active: newStatus } as any)
        .eq('id', channelId);
      
      if (error) throw error;
      
      setIsScheduleActive(newStatus);
      toast({
        title: newStatus ? 'Grille activée' : 'Grille désactivée',
        description: newStatus 
          ? 'La grille de programme est maintenant diffusée à l\'antenne'
          : 'La diffusion de la grille est arrêtée'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut',
        variant: 'destructive'
      });
    }
  };

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('program_schedule')
        .select('*')
        .eq('channel_id', channelId)
        .order('start_time', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la grille',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('video_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les vidéos',
        variant: 'destructive'
      });
    } finally {
      setIsVideosLoading(false);
    }
  };

  const handleAddProgram = async () => {
    if (!newProgram.title || !newProgram.start_time) {
      toast({
        title: 'Erreur',
        description: 'Titre et heure de début requis',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.from('program_schedule').insert({
        channel_id: channelId,
        title: newProgram.title,
        type: newProgram.type,
        start_time: new Date(newProgram.start_time).toISOString(),
        duration_minutes: newProgram.duration_minutes,
        repeat_pattern: newProgram.repeat_pattern === 'none' ? null : newProgram.repeat_pattern
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Programme ajouté'
      });

      setIsDialogOpen(false);
      setNewProgram({
        title: '',
        type: 'vod',
        start_time: '',
        duration_minutes: 60,
        repeat_pattern: 'none'
      });
      fetchPrograms();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter le programme',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteProgram = async (id: string) => {
    try {
      const { error } = await supabase
        .from('program_schedule')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Programme supprimé'
      });
      fetchPrograms();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer',
        variant: 'destructive'
      });
    }
  };

  const handleAddVideoToPlaylist = async (videoId: string, video: VideoAsset) => {
    if (!channelId) {
      toast({
        title: 'Erreur',
        description: 'ID de chaîne manquant',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('Adding video to playlist:', { videoId, channelId, video });
      
      const { data, error } = await supabase.from('program_schedule').insert({
        channel_id: channelId,
        title: video.title,
        type: 'vod',
        start_time: new Date().toISOString(),
        duration_minutes: video.duration_minutes || 60,
        repeat_pattern: null,
        asset_id: videoId
      }).select();

      if (error) {
        console.error('Error adding video to playlist:', error);
        throw error;
      }

      console.log('Video added successfully:', data);

      toast({
        title: 'Succès',
        description: `"${video.title}" ajoutée à la grille`
      });

      fetchPrograms();
    } catch (error: any) {
      console.error('Failed to add video:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter la vidéo',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-cyan-400 bg-clip-text text-transparent">
              Grille de Programme
            </h1>
            <p className="text-muted-foreground mt-2">
              Planifiez votre diffusion 24/7
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={async () => {
                try {
                  // Activer le schedule
                  const { error: scheduleError } = await supabase
                    .from('channels')
                    .update({ schedule_active: true } as any)
                    .eq('id', channelId);
                  
                  if (scheduleError) throw scheduleError;
                  
                  // Démarrer le stream orchestrator
                  const { error: streamError } = await supabase.functions.invoke('stream-orchestrator', {
                    body: { 
                      channelId,
                      action: 'start',
                      outputConfig: {
                        protocol: 'hls',
                        targetUrl: `https://media-plus.app/streams/${channelId}/master.m3u8`
                      }
                    }
                  });
                  
                  if (streamError) throw streamError;
                  
                  setIsScheduleActive(true);
                  toast({
                    title: 'Playlist envoyée',
                    description: 'La grille de programme est maintenant active et prête à être diffusée à l\'antenne',
                  });
                  
                  // Rediriger vers la page Broadcast
                  window.location.href = `/broadcast/${channelId}`;
                } catch (error) {
                  toast({
                    title: 'Erreur',
                    description: 'Impossible d\'envoyer la playlist',
                    variant: 'destructive'
                  });
                }
              }}
              variant="default"
              className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <Play className="h-4 w-4" />
              Envoyer à l'antenne
            </Button>
            <Button 
              onClick={toggleScheduleActive}
              variant={isScheduleActive ? "default" : "outline"}
              className="gap-2"
            >
              {isScheduleActive ? (
                <>
                  <Check className="h-4 w-4" />
                  Grille activée
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Activer la grille
                </>
              )}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Ajouter un programme
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau programme</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={newProgram.title}
                    onChange={(e) => setNewProgram({ ...newProgram, title: e.target.value })}
                    placeholder="Nom du programme"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newProgram.type}
                    onValueChange={(value) => setNewProgram({ ...newProgram, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vod">Vidéo (VOD)</SelectItem>
                      <SelectItem value="live">Direct (RTMP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="start_time">Heure de début *</Label>
                  <Input
                    id="start_time"
                    type="datetime-local"
                    value={newProgram.start_time}
                    onChange={(e) => setNewProgram({ ...newProgram, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Durée (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={newProgram.duration_minutes}
                    onChange={(e) => setNewProgram({ ...newProgram, duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="repeat">Répétition</Label>
                  <Select
                    value={newProgram.repeat_pattern}
                    onValueChange={(value) => setNewProgram({ ...newProgram, repeat_pattern: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucune" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      <SelectItem value="daily">Quotidienne</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddProgram} className="w-full">
                  Ajouter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Calendar Section */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Calendrier</CardTitle>
              <CardDescription>
                Sélectionnez une date pour voir la programmation
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={fr}
                className="rounded-md border pointer-events-auto"
              />
            </CardContent>
          </Card>

          {/* Programs for Selected Date */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                Programmes du {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
              </CardTitle>
              <CardDescription>
                {isScheduleActive ? (
                  <Badge variant="default" className="gap-1">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Diffusion active
                  </Badge>
                ) : (
                  <Badge variant="secondary">En attente</Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">Chargement...</div>
              ) : programs.filter(p => {
                const programDate = new Date(p.start_time);
                return programDate.toDateString() === selectedDate.toDateString();
              }).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun programme pour cette date
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Heure de début</TableHead>
                      <TableHead>Durée</TableHead>
                      <TableHead>Répétition</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.filter(p => {
                      const programDate = new Date(p.start_time);
                      return programDate.toDateString() === selectedDate.toDateString();
                    }).map((program) => (
                      <TableRow key={program.id}>
                        <TableCell>
                          {program.type === 'live' ? (
                            <Badge variant="default" className="gap-1">
                              <Radio className="h-3 w-3" />
                              Live
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Video className="h-3 w-3" />
                              VOD
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{program.title}</TableCell>
                        <TableCell>
                          {new Date(program.start_time).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </TableCell>
                        <TableCell>{program.duration_minutes} min</TableCell>
                        <TableCell>
                          {program.repeat_pattern ? (
                            <Badge variant="outline">{program.repeat_pattern}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProgram(program.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Library Section */}
        <Card>
          <CardHeader>
            <CardTitle>Bibliothèque Vidéo</CardTitle>
            <CardDescription>
              Sélectionnez des vidéos à ajouter à la grille de programme
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isVideosLoading ? (
              <div className="text-center py-12">Chargement...</div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune vidéo disponible. Importez d'abord des vidéos dans la bibliothèque.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <FileVideo className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{video.title}</CardTitle>
                      {video.description && (
                        <CardDescription>{video.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {video.duration_minutes && (
                          <p>Durée: {video.duration_minutes} min</p>
                        )}
                        {video.category && (
                          <p>Catégorie: {video.category}</p>
                        )}
                        {video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {video.tags.map((tag, i) => (
                              <Badge key={i} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setPreviewVideo(video)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Prévisualiser
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAddVideoToPlaylist(video.id, video)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Ajouter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!previewVideo} onOpenChange={() => setPreviewVideo(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{previewVideo?.title}</DialogTitle>
            {previewVideo?.description && (
              <CardDescription>{previewVideo.description}</CardDescription>
            )}
          </DialogHeader>
          {previewVideo && (
            <VideoPlayer 
              src={previewVideo.file_url} 
              poster={previewVideo.thumbnail_url || undefined}
              className="w-full h-[500px]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
