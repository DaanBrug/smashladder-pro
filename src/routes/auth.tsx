import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — SmashRanking" },
      { name: "description", content: "Sign in to SmashRanking with a magic link." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/dashboard", replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: name ? { display_name: name } : undefined,
      },
    });
    setSending(false);
    if (error) toast.error(error.message);
    else { setSent(true); toast.success("Magic link sent. Check your inbox."); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <Link to="/" className="absolute left-4 top-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="card-surface w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold uppercase tracking-wider">SmashRanking</span>
        </div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">No passwords. We'll email you a magic link.</p>
        {sent ? (
          <div className="mt-6 rounded-md border border-primary/40 bg-primary/5 p-4 text-sm">
            Check <strong>{email}</strong> for your magic link. Open it on this device to finish signing in.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="name">Display name <span className="text-muted-foreground">(first time only)</span></Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" />
            </div>
            <Button type="submit" disabled={sending} className="w-full font-display uppercase tracking-wider">
              {sending ? "Sending..." : "Send magic link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
