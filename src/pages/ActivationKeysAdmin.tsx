import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Copy, Check, Shield } from "lucide-react";
import Header from "@/components/Header";

interface ActivationKey {
  id: string;
  key: string;
  created_at: string;
  activated_at: string | null;
  expires_at: string;
  is_active: boolean;
  usage_count: number;
  max_usage: number | null;
  machine_id: string | null;
  ip_address: string | null;
}

const ActivationKeysAdmin = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [keys, setKeys] = useState<ActivationKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [durationMonths, setDurationMonths] = useState<"3" | "6" | "12">("12");
  const [maxUsage, setMaxUsage] = useState("");
  const [count, setCount] = useState("1");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast.error("Accès réservé aux administrateurs");
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadKeys();
    }
  }, [isAdmin]);

  const loadKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('activation_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      console.error('Error loading keys:', error);
      toast.error("Erreur lors du chargement des clés");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKeys = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session expirée");

      const { data, error } = await supabase.functions.invoke('generate-activation-key', {
        body: {
          durationMonths: parseInt(durationMonths),
          maxUsage: maxUsage ? parseInt(maxUsage) : null,
          count: parseInt(count),
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(data.message);
      await loadKeys();
      setMaxUsage("");
      setCount("1");
    } catch (error: any) {
      console.error('Error generating keys:', error);
      toast.error(error.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Clé copiée dans le presse-papiers");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleActive = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('activation_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId);

      if (error) throw error;

      toast.success(currentStatus ? "Clé désactivée" : "Clé activée");
      await loadKeys();
    } catch (error: any) {
      toast.error("Erreur lors de la modification");
    }
  };

  const getKeyStatus = (key: ActivationKey) => {
    if (!key.is_active) return { label: "Désactivée", variant: "secondary" as const };
    if (new Date(key.expires_at) < new Date()) return { label: "Expirée", variant: "destructive" as const };
    if (key.max_usage && key.usage_count >= key.max_usage) return { label: "Limite atteinte", variant: "destructive" as const };
    if (key.activated_at) return { label: "Active", variant: "default" as const };
    return { label: "Non activée", variant: "outline" as const };
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Gestion des clés d'activation</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Générer de nouvelles clés</CardTitle>
            <CardDescription>
              Créez des clés d'activation pour autoriser l'accès à la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Durée de validité</Label>
                <Select value={durationMonths} onValueChange={(v) => setDurationMonths(v as "3" | "6" | "12")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 mois</SelectItem>
                    <SelectItem value="6">6 mois</SelectItem>
                    <SelectItem value="12">12 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Limite d'utilisation (optionnel)</Label>
                <Input
                  type="number"
                  placeholder="Illimité"
                  value={maxUsage}
                  onChange={(e) => setMaxUsage(e.target.value)}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre de clés</Label>
                <Input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  min="1"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={handleGenerateKeys} disabled={generating} className="w-full">
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Générer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clés d'activation existantes</CardTitle>
            <CardDescription>
              {keys.length} clé(s) au total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead>Activée le</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead>Utilisations</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Aucune clé d'activation
                      </TableCell>
                    </TableRow>
                  ) : (
                    keys.map((key) => {
                      const status = getKeyStatus(key);
                      return (
                        <TableRow key={key.id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <span>{key.key}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyKey(key.key)}
                              >
                                {copiedKey === key.key ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>{new Date(key.created_at).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            {key.activated_at ? new Date(key.activated_at).toLocaleDateString('fr-FR') : '-'}
                          </TableCell>
                          <TableCell>{new Date(key.expires_at).toLocaleDateString('fr-FR')}</TableCell>
                          <TableCell>
                            {key.usage_count} {key.max_usage ? `/ ${key.max_usage}` : ''}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(key.id, key.is_active)}
                            >
                              {key.is_active ? "Désactiver" : "Activer"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivationKeysAdmin;
