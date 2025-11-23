import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Key, Tv } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [activationKey, setActivationKey] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkAuth();
  }, [navigate]);

  const getMachineId = () => {
    let machineId = localStorage.getItem('machine_id');
    if (!machineId) {
      machineId = `${navigator.userAgent}-${Date.now()}-${Math.random()}`;
      localStorage.setItem('machine_id', machineId);
    }
    return machineId;
  };

  const handleActivateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedKey = activationKey.trim().toUpperCase();
    
    // Validate key format
    if (!trimmedKey || trimmedKey.length < 10) {
      toast.error("Veuillez entrer une clé d'activation valide");
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting activation with key:', trimmedKey.substring(0, 10) + '...');
      const machineId = getMachineId();
      
      const { data, error } = await supabase.functions.invoke('validate-activation-key', {
        body: {
          key: trimmedKey,
          machineId,
          ipAddress: null,
        },
      });

      console.log('Activation response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast.error("Erreur de connexion au serveur. Veuillez réessayer.");
        return;
      }

      if (!data || !data.success) {
        const errorMessage = data?.message || "Clé d'activation invalide ou expirée";
        console.error('Validation failed:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      // Set session
      if (data.session) {
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error("Erreur lors de la création de la session");
          return;
        }
      }

      toast.success("✅ Activation réussie ! Bienvenue sur Média+Broadcast");
      setTimeout(() => navigate("/"), 500);
    } catch (error: any) {
      console.error('Activation error:', error);
      toast.error(error.message || "Erreur inattendue lors de l'activation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-hero opacity-50" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      
      <Card className="w-full max-w-md glass-card relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 gradient-broadcast blur-xl opacity-50" />
              <Tv className="w-10 h-10 text-primary relative z-10" />
            </div>
            <Key className="h-8 w-8 text-secondary" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Média+Broadcast
          </CardTitle>
          <CardDescription>
            Entrez votre clé d'activation pour accéder à la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivateKey} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                required
                disabled={loading}
                className="text-center font-mono text-lg tracking-wider"
                maxLength={29}
              />
              <p className="text-xs text-muted-foreground text-center">
                Format: 5 groupes de 5 caractères séparés par des tirets
              </p>
            </div>
            <Button type="submit" className="w-full gradient-broadcast" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activer ma licence
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
