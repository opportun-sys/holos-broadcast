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
import { Plus, Trash2, Video, Radio } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProgramItem {
  id: string;
  title: string;
  type: string;
  start_time: string;
  duration_minutes: number;
  repeat_pattern: string | null;
}

export default function ProgramSchedule() {
  const { channelId } = useParams<{ channelId: string }>();
  const { isAdmin, isOperator } = useUserRole();
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProgram, setNewProgram] = useState({
    title: '',
    type: 'video',
    start_time: '',
    duration_minutes: 60,
    repeat_pattern: 'none'
  });

  useEffect(() => {
    if (channelId) {
      fetchPrograms();
    }
  }, [channelId]);

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
        type: 'video',
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
                      <SelectItem value="video">Vidéo (VOD)</SelectItem>
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

        {isLoading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : programs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun programme</CardTitle>
              <CardDescription>
                Commencez par ajouter votre premier programme
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
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
                {programs.map((program) => (
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
          </Card>
        )}
      </div>
    </div>
  );
}
