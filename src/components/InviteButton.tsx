import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function InviteButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const PROJECT_ID = "7de12d3f-1ae2-4d4d-ad43-22ec1c88e4d4";
  const PUBLIC_ORIGIN = `https://project--${PROJECT_ID}.lovable.app`;

  const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
  const isPreviewHost =
    currentHost.startsWith("id-preview--") ||
    currentHost.startsWith("preview--") ||
    currentHost.endsWith(".lovableproject.com");
  const isCustomOrLovableApp =
    typeof window !== "undefined" &&
    !isPreviewHost &&
    currentHost !== "" &&
    currentHost !== "localhost";

  const origin = isCustomOrLovableApp ? window.location.origin : PUBLIC_ORIGIN;
  const joinUrl = `${origin}/join`;
  const showPublishWarning = isPreviewHost;


  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success("Link gekopieerd!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiëren mislukt");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SmashRanking — doe mee met de ladder",
          text: "Doe mee met onze tennis ladder competitie:",
          url: joinUrl,
        });

      } catch {
        /* user cancelled */
      }
    } else {
      copy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="font-display uppercase tracking-wider">
          <Share2 className="h-4 w-4" /> Uitnodigen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-wide">
            Nodig spelers uit
          </DialogTitle>
          <DialogDescription>
            Deel deze link of laat ze de QR-code scannen.
          </DialogDescription>
        </DialogHeader>

        {showPublishWarning && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
            Let op: publiceer eerst je app via de <strong>Publish</strong>-knop rechtsboven, anders moeten ontvangers eerst inloggen bij Lovable om de uitnodiging te openen. De link hieronder wijst al naar je publieke app-URL.
          </div>
        )}


        <div className="flex justify-center rounded-lg bg-white p-4">
          <QRCodeSVG value={joinUrl} size={200} />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <code className="flex-1 truncate text-xs">{joinUrl}</code>
          <Button size="icon" variant="ghost" onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <Button onClick={share} className="w-full font-display uppercase tracking-wider">
          <Share2 className="h-4 w-4" /> Deel uitnodiging
        </Button>
      </DialogContent>
    </Dialog>
  );
}
