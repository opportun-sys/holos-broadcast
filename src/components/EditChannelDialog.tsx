import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
}

interface EditChannelDialogProps {
  channel: Channel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChannelUpdated: () => void;
}

const EditChannelDialog = ({ channel, open, onOpenChange, onChannelUpdated }: EditChannelDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setDescription(channel.description || "");
      setLogoUrl(channel.logo_url || "");
    }
  }, [channel]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom de la chaîne est requis",
      });
      return;
    }

    if (!channel) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("channels")
        .update({
          name,
          description: description || null,
          logo_url: logoUrl || null,
        })
        .eq("id", channel.id);

      if (error) throw error;

      toast({
        title: "Chaîne mise à jour !",
        description: `${name} a été modifiée avec succès.`,
      });
      
      onOpenChange(false);
      onChannelUpdated();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Modifier la chaîne</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre chaîne de diffusion.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nom de la chaîne</Label>
            <Input
              id="edit-name"
              placeholder="Ma Chaîne TV"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Description de votre chaîne..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-logo">URL du logo</Label>
            <Input
              id="edit-logo"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="gradient-broadcast"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditChannelDialog;
