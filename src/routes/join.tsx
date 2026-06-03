import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { joinCompetition, getMe } from "@/lib/smash.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/join")({
  head: () => ({
    meta: [
      { title: "Join the ladder — SmashRanking" },
      { name: "description", content: "Join the open SmashRanking ladder competition." },
    ],
  }),
  component: JoinPage,
});

function JoinPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const join = useServerFn(joinCompetition);
  const me = useServerFn(getMe);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setLoading(false); });
  }, []);

  const handleJoin = async () => {
    try {
      await join();
      toast.success("You're in! Welcome to the ladder.");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading…</div>;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="card-surface w-full max-w-md p-8 text-center">
        <h1 className="font-display text-3xl font-bold uppercase tracking-wide">Join the ladder</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You're about to register for the active SmashRanking competition.
          If the competition has already started, you'll be placed at the bottom.
        </p>
        {user ? (
          <Button onClick={handleJoin} className="mt-6 w-full font-display uppercase tracking-wider">
            Join now
          </Button>
        ) : (
          <Link to="/auth" className="mt-6 inline-block w-full rounded-md bg-primary px-4 py-2 font-display font-bold uppercase tracking-wider text-primary-foreground">
            Sign in to join
          </Link>
        )}
      </div>
    </div>
  );
}
