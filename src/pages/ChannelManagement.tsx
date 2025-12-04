import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import CreateChannelDialog from "@/components/CreateChannelDialog";
import EditChannelDialog from "@/components/EditChannelDialog";
import DeleteChannelDialog from "@/components/DeleteChannelDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Tv, MoreHorizontal, Pencil, Trash2, Radio, Play, Settings } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
  is_live: boolean | null;
  logo_url: string | null;
  created_at: string;
}

const ChannelManagement = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();

  const loadChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error("Error loading channels:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, [navigate]);

  const handleEdit = (channel: Channel) => {
    setEditChannel(channel);
    setEditDialogOpen(true);
  };

  const handleDelete = (channel: Channel) => {
    setChannelToDelete({ id: channel.id, name: channel.name });
    setDeleteDialogOpen(true);
  };

  const handleNavigate = (path: string, channelId: string) => {
    sessionStorage.setItem('lastChannelId', channelId);
    navigate(path);
  };

  const getStatusBadge = (channel: Channel) => {
    if (channel.is_live) {
      return (
        <Badge className="gradient-live shadow-live gap-1">
          <Radio className="w-3 h-3" />
          EN DIRECT
        </Badge>
      );
    }
    if (channel.status === "program") {
      return (
        <Badge className="gradient-broadcast gap-1">
          <Play className="w-3 h-3" />
          Programmé
        </Badge>
      );
    }
    return <Badge variant="secondary">Hors ligne</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Gestion des Chaînes</h2>
            <p className="text-muted-foreground">
              Créez, modifiez et gérez vos chaînes de diffusion
            </p>
          </div>
          <CreateChannelDialog onChannelCreated={loadChannels} />
        </div>

        {channels.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-6">
              <Tv className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">Aucune chaîne</h3>
            <p className="text-muted-foreground mb-6">
              Créez votre première chaîne pour commencer
            </p>
            <CreateChannelDialog onChannelCreated={loadChannels} />
          </div>
        ) : (
          <div className="glass-card rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Logo</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead className="w-[150px]">Actions rapides</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.id}>
                    <TableCell>
                      {channel.logo_url ? (
                        <img
                          src={channel.logo_url}
                          alt={channel.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Tv className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {channel.description || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(channel)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(channel.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleNavigate(`/broadcast/${channel.id}`, channel.id)}
                          title="Antenne"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleNavigate(`/schedule/${channel.id}`, channel.id)}
                          title="Grille"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(channel)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(channel)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      <EditChannelDialog
        channel={editChannel}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onChannelUpdated={loadChannels}
      />

      <DeleteChannelDialog
        channelId={channelToDelete?.id || null}
        channelName={channelToDelete?.name || ""}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onChannelDeleted={loadChannels}
      />
    </div>
  );
};

export default ChannelManagement;
