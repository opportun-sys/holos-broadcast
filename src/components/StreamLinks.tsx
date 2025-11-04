import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StreamLinksProps {
  channelId: string;
  hlsUrl?: string;
  iframeUrl?: string;
}

export const StreamLinks = ({ channelId, hlsUrl, iframeUrl }: StreamLinksProps) => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copié !",
      description: `${label} copié dans le presse-papiers`,
    });
  };

  const defaultHlsUrl = hlsUrl || `https://stream.ffmpeg.cloud/${channelId}/playlist.m3u8`;
  const defaultIframeUrl = iframeUrl || `https://stream.ffmpeg.cloud/embed/${channelId}`;
  const iframeCode = `<iframe src="${defaultIframeUrl}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Liens de diffusion</CardTitle>
        <CardDescription>
          Copiez ces liens pour intégrer votre flux ailleurs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Lien HLS (.m3u8)</label>
          <div className="flex gap-2">
            <Input value={defaultHlsUrl} readOnly />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(defaultHlsUrl, "Lien HLS")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(defaultHlsUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Lien iframe</label>
          <div className="flex gap-2">
            <Input value={defaultIframeUrl} readOnly />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(defaultIframeUrl, "Lien iframe")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => window.open(defaultIframeUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Code iframe complet</label>
          <div className="flex gap-2">
            <Input value={iframeCode} readOnly className="font-mono text-xs" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(iframeCode, "Code iframe")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
