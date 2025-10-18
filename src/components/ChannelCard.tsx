import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tv, Radio, Settings, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChannelCardProps {
  id: string;
  name: string;
  description?: string;
  status: string;
  isLive: boolean;
  logoUrl?: string;
}

const ChannelCard = ({ id, name, description, status, isLive, logoUrl }: ChannelCardProps) => {
  const navigate = useNavigate();

  const getStatusBadge = () => {
    if (isLive) {
      return (
        <Badge className="gradient-live shadow-live gap-1 animate-pulse">
          <Radio className="w-3 h-3" />
          EN DIRECT
        </Badge>
      );
    }
    if (status === "program") {
      return (
        <Badge className="gradient-broadcast gap-1">
          <Play className="w-3 h-3" />
          Programmé
        </Badge>
      );
    }
    return <Badge variant="secondary">Hors ligne</Badge>;
  };

  return (
    <Card className="glass-card overflow-hidden group hover:shadow-broadcast transition-smooth cursor-pointer">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-smooth"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center gradient-hero">
            <Tv className="w-16 h-16 text-primary/50" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          {getStatusBadge()}
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {description}
          </p>
        )}
        
        <div className="flex gap-2">
          <Button
            onClick={() => navigate(`/channel/${id}`)}
            className="flex-1 gradient-broadcast"
          >
            <Settings className="w-4 h-4 mr-2" />
            Gérer
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/watch/${id}`)}
            className="flex-1"
          >
            <Play className="w-4 h-4 mr-2" />
            Voir
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ChannelCard;
