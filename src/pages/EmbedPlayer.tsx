import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VideoPlayer } from '@/components/VideoPlayer';
import { Loader2 } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  hls_url: string | null;
  is_live: boolean;
  logo_url: string | null;
  embed_enabled: boolean;
  embed_primary_color: string;
  embed_show_guide: boolean;
}

export default function EmbedPlayer() {
  const { channelId } = useParams<{ channelId: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      console.error('Error fetching channel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!channel || !channel.embed_enabled) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <p>Diffusion non disponible</p>
      </div>
    );
  }

  if (!channel.hls_url) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Chaîne hors ligne</p>
          <p className="text-sm text-gray-400">La diffusion n'a pas encore démarré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black">
      <VideoPlayer 
        src={channel.hls_url}
        autoplay={true}
        className="w-full h-full"
      />
      {channel.embed_show_guide && (
        <div 
          className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent"
          style={{ color: channel.embed_primary_color }}
        >
          <p className="font-semibold">{channel.name}</p>
        </div>
      )}
    </div>
  );
}
