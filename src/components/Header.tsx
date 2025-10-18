import { Button } from "@/components/ui/button";
import { Tv, LogOut, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const Header = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

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

  const NavLinks = () => (
    <nav className="flex flex-col md:flex-row gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/dashboard");
          setIsOpen(false);
        }}
      >
        Chaînes
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          navigate("/library");
          setIsOpen(false);
        }}
      >
        Bibliothèque
      </Button>
    </nav>
  );

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

        <div className="hidden md:flex items-center gap-2">
          <NavLinks />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <div className="flex flex-col gap-4 mt-8">
              <NavLinks />
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="gap-2 justify-start"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;
