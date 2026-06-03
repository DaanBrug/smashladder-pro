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

  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join` : "/join";

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
          title: "Doe mee met SmashRanking",
          text: "Join de tennis ladder competitie:",
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
