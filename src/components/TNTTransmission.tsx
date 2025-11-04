import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Radio } from "lucide-react";

interface TNTTransmissionProps {
  channelId: string;
}

export const TNTTransmission = ({ channelId }: TNTTransmissionProps) => {
  const { toast } = useToast();
  const [protocol, setProtocol] = useState<'udp' | 'rtmp' | 'http'>('udp');
  const [target, setTarget] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  const handleConfigure = async () => {
    if (!target) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse cible",
        variant: "destructive",
      });
      return;
    }

    setIsConfiguring(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Non authentifié');
      }

      const { data, error } = await supabase.functions.invoke('ffmpeg-cloud', {
        body: {
          channelId,
          action: 'transmit',
          transmission: {
            protocol,
            target,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Transmission configurée",
        description: `La transmission TNT vers ${target} a été configurée avec succès`,
      });

      console.log('Transmission configured:', data);
    } catch (error) {
      console.error('Error configuring transmission:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de configurer la transmission",
        variant: "destructive",
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  const getPlaceholder = () => {
    switch (protocol) {
      case 'udp':
        return 'udp://192.168.1.100:1234';
      case 'rtmp':
        return 'rtmp://tnt.example.com/live/stream';
      case 'http':
        return 'http://192.168.1.100:8080';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          Transmission TNT
        </CardTitle>
        <CardDescription>
          Configurez la sortie vers un émetteur TNT (IP, UDP, RTMP)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="protocol">Protocole</Label>
          <Select value={protocol} onValueChange={(value: 'udp' | 'rtmp' | 'http') => setProtocol(value)}>
            <SelectTrigger id="protocol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="udp">UDP</SelectItem>
              <SelectItem value="rtmp">RTMP</SelectItem>
              <SelectItem value="http">HTTP/IP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Adresse cible</Label>
          <Input
            id="target"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder={getPlaceholder()}
          />
        </div>

        <Button 
          onClick={handleConfigure} 
          disabled={isConfiguring || !target}
          className="w-full"
        >
          {isConfiguring ? "Configuration..." : "Configurer la transmission"}
        </Button>
      </CardContent>
    </Card>
  );
};
