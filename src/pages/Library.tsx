import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, Play, Trash2, Edit } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VideoAsset {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  thumbnail_url: string | null;
  duration_minutes: number | null;
  encoding_status: string;
  tags: string[];
  category: string | null;
  created_at: string;
}

export default function Library() {
  const { isAdmin, isOperator } = useUserRole();
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: '',
    tags: ''
  });

  useEffect(() => {
    fetchVideos();
  }, []);

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
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier le type de fichier
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm', 'video/x-msvideo'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Erreur',
          description: 'Format de fichier non supporté. Utilisez MP4, MOV, MKV, WEBM ou AVI.',
          variant: 'destructive'
        });
        return;
      }

      // Vérifier la taille (2GB max)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast({
          title: 'Erreur',
          description: 'Le fichier est trop volumineux. Maximum 2GB.',
          variant: 'destructive'
        });
        return;
      }

      setSelectedFile(file);
      // Pré-remplir le titre avec le nom du fichier
      if (!uploadData.title) {
        setUploadData({ ...uploadData, title: file.name.replace(/\.[^/.]+$/, '') });
      }
    }
  };

  const handleUpload = async () => {
    if (!uploadData.title) {
      toast({
        title: 'Erreur',
        description: 'Le titre est requis',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un fichier vidéo',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Upload du fichier vers Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // Créer l'entrée dans la base de données
      const { error: dbError } = await supabase.from('video_assets').insert({
        title: uploadData.title,
        description: uploadData.description || null,
        category: uploadData.category || null,
        tags: uploadData.tags ? uploadData.tags.split(',').map(t => t.trim()) : [],
        file_url: publicUrl,
        user_id: user.id,
        encoding_status: 'ready'
      });

      if (dbError) throw dbError;

      toast({
        title: 'Succès',
        description: 'Vidéo importée avec succès'
      });

      setIsUploadOpen(false);
      setUploadData({ title: '', description: '', category: '', tags: '' });
      setSelectedFile(null);
      fetchVideos();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'importer la vidéo',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Récupérer l'URL du fichier avant de supprimer
      const video = videos.find(v => v.id === id);
      
      if (video && video.file_url.includes('videos/')) {
        // Extraire le chemin du fichier depuis l'URL
        const urlParts = video.file_url.split('/videos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0];
          
          // Supprimer le fichier du storage
          await supabase.storage
            .from('videos')
            .remove([filePath]);
        }
      }

      // Supprimer l'entrée de la base de données
      const { error } = await supabase
        .from('video_assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Vidéo supprimée'
      });
      fetchVideos();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la vidéo',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      ready: 'default',
      pending: 'secondary',
      error: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-cyan-400 bg-clip-text text-transparent">
              Bibliothèque Vidéo
            </h1>
            <p className="text-muted-foreground mt-2">
              Gérez vos contenus vidéo et médias
            </p>
          </div>
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Importer une vidéo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importer une nouvelle vidéo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Fichier vidéo *</Label>
                  <Input
                    id="file"
                    type="file"
                    accept="video/mp4,video/quicktime,video/x-matroska,video/webm,video/x-msvideo"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Formats acceptés : MP4, MOV, MKV, WEBM, AVI (max 2GB)
                  </p>
                  {selectedFile && (
                    <p className="text-sm text-primary mt-2">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={uploadData.title}
                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                    placeholder="Nom de la vidéo"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    placeholder="Description de la vidéo"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    value={uploadData.category}
                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                    placeholder="Films, Séries, Documentaires..."
                  />
                </div>
                <div>
                  <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                  <Input
                    id="tags"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                    placeholder="action, thriller, 2024"
                  />
                </div>
                <Button 
                  onClick={handleUpload} 
                  className="w-full"
                  disabled={isUploading || !selectedFile}
                >
                  {isUploading ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Importation en cours...
                    </>
                  ) : (
                    'Ajouter à la bibliothèque'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Chargement...</div>
        ) : videos.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune vidéo</CardTitle>
              <CardDescription>
                Commencez par importer votre première vidéo
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card key={video.id} className="overflow-hidden">
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Play className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{video.title}</CardTitle>
                    {getStatusBadge(video.encoding_status)}
                  </div>
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
                    <Button variant="outline" size="sm" className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      Prévisualiser
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(video.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
