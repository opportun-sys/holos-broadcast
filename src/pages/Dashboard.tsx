import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import ChannelCard from "@/components/ChannelCard";
import CreateChannelDialog from "@/components/CreateChannelDialog";
import { Loader2, Tv } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  description: string | null;
  status: string;
  is_live: boolean;
  logo_url: string | null;
}

const Dashboard = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadChannels = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
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
            <h2 className="text-3xl font-bold mb-2">Mes Chaînes</h2>
            <p className="text-muted-foreground">
              Gérez vos chaînes de diffusion et leur programmation
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
              Créez votre première chaîne pour commencer la diffusion
            </p>
            <CreateChannelDialog onChannelCreated={loadChannels} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                id={channel.id}
                name={channel.name}
                description={channel.description || undefined}
                status={channel.status}
                isLive={channel.is_live}
                logoUrl={channel.logo_url || undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
