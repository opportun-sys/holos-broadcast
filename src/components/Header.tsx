import { Button } from "@/components/ui/button";
import { Tv, LogOut, Menu, Shield, Library, Calendar, Radio, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserRole } from "@/hooks/useUserRole";

const Header = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useUserRole();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Déconnexion réussie",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  return (
    <header className="border-b border-border/50 backdrop-blur-xl bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <div className="relative">
            <div className="absolute inset-0 gradient-broadcast blur-xl opacity-50" />
            <Tv className="w-8 h-8 text-primary relative z-10" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Média+Broadcast
          </h1>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background z-50">
            <DropdownMenuItem onClick={() => navigate("/dashboard")} className="gap-2 cursor-pointer">
              <Tv className="w-4 h-4" />
              Chaînes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/library")} className="gap-2 cursor-pointer">
              <Library className="w-4 h-4" />
              Bibliothèque
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/schedule/:channelId")} className="gap-2 cursor-pointer">
              <Calendar className="w-4 h-4" />
              Grille de programme
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/transmission/:channelId")} className="gap-2 cursor-pointer">
              <Radio className="w-4 h-4" />
              Transmission TNT
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate("/admin/activation-keys")} className="gap-2 cursor-pointer">
                <Shield className="w-4 h-4" />
                Clés d'activation
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer">
              <LogOut className="w-4 h-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;
