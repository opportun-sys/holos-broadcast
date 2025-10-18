import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateChannelDialogProps {
  onChannelCreated: () => void;
}

const CreateChannelDialog = ({ onChannelCreated }: CreateChannelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Le nom de la chaîne est requis",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Utilisateur non connecté");
      }

      const { error } = await supabase.from("channels").insert({
        name,
        description,
        user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Chaîne créée !",
        description: `${name} a été créée avec succès.`,
      });
      
      setOpen(false);
      setName("");
      setDescription("");
      onChannelCreated();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gradient-broadcast shadow-broadcast">
          <Plus className="w-4 h-4 mr-2" />
          Créer une chaîne
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle>Créer une nouvelle chaîne</DialogTitle>
          <DialogDescription>
            Configurez votre chaîne de diffusion. Vous pourrez ajouter des programmes ensuite.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la chaîne</Label>
            <Input
              id="name"
              placeholder="Ma Chaîne TV"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description de votre chaîne..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="gradient-broadcast"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChannelDialog;
