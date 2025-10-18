import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Code, Copy, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Channel {
  id: string;
  name: string;
  embed_enabled: boolean;
  embed_show_guide: boolean;
  embed_primary_color: string;
  allowed_domains: string[];
}

export default function EmbedSettings() {
  const { channelId } = useParams<{ channelId: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');

  useEffect(() => {
    if (channelId) {
      fetchChannel();
    }
  }, [channelId]);

  const fetchChannel = async () => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      setChannel(data);
      setEmbedUrl(`${window.location.origin}/embed/${data.id}`);
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

  const handleUpdateSettings = async (updates: Partial<Channel>) => {
    if (!channel) return;

    try {
      const { error } = await supabase
        .from('channels')
        .update(updates)
        .eq('id', channelId);

      if (error) throw error;

      setChannel({ ...channel, ...updates });
      toast({
        title: 'Succès',
        description: 'Paramètres mis à jour'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    toast({
      title: 'Copié',
      description: 'Code copié dans le presse-papiers'
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const embedCode = `<iframe 
  src="${embedUrl}" 
  width="100%" 
  height="500" 
  frameborder="0" 
  allowfullscreen>
</iframe>`;

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-cyan-400 bg-clip-text text-transparent">
            Intégration Iframe
          </h1>
          <p className="text-muted-foreground mt-2">
            Intégrez {channel.name} sur votre site web
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code d'intégration
              </CardTitle>
              <CardDescription>
                Copiez ce code dans votre page HTML
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{embedCode}</code>
                </pre>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(embedCode)}
                >
                  {isCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">URL:</Badge>
                <code className="text-sm text-muted-foreground">{embedUrl}</code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres du lecteur</CardTitle>
              <CardDescription>
                Personnalisez l'apparence et le comportement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="embed-enabled">Activer l'intégration</Label>
                  <p className="text-sm text-muted-foreground">
                    Autoriser l'intégration de cette chaîne
                  </p>
                </div>
                <Switch
                  id="embed-enabled"
                  checked={channel.embed_enabled}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings({ embed_enabled: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-guide">Afficher le guide TV</Label>
                  <p className="text-sm text-muted-foreground">
                    Montrer les programmes en cours et à venir
                  </p>
                </div>
                <Switch
                  id="show-guide"
                  checked={channel.embed_show_guide}
                  onCheckedChange={(checked) =>
                    handleUpdateSettings({ embed_show_guide: checked })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Couleur principale</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={channel.embed_primary_color}
                    onChange={(e) =>
                      handleUpdateSettings({ embed_primary_color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    value={channel.embed_primary_color}
                    onChange={(e) =>
                      handleUpdateSettings({ embed_primary_color: e.target.value })
                    }
                    placeholder="#2563EB"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Couleur des boutons et éléments interactifs
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>
                Contrôlez où votre chaîne peut être intégrée
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allowed-domains">Domaines autorisés</Label>
                <Input
                  id="allowed-domains"
                  placeholder="example.com, mysite.com"
                  defaultValue={channel.allowed_domains.join(', ')}
                  onBlur={(e) => {
                    const domains = e.target.value
                      .split(',')
                      .map((d) => d.trim())
                      .filter(Boolean);
                    handleUpdateSettings({ allowed_domains: domains });
                  }}
                />
                <p className="text-sm text-muted-foreground">
                  Laissez vide pour autoriser tous les domaines (séparés par des virgules)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Aperçu</CardTitle>
              <CardDescription>
                Prévisualisation du lecteur intégré
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">
                  Aperçu du lecteur (à implémenter)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
