import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Eastgate Store IT Dashboard" },
      { name: "description", content: "Sign in to the Eastgate Industries store IT monitoring dashboard." },
      { property: "og:title", content: "Sign in — Eastgate Store IT Dashboard" },
      { property: "og:description", content: "Sign in to the Eastgate Industries store IT monitoring dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const field =
  "w-full rounded-md bg-panel/60 px-2.5 py-2 text-[13px] text-foreground outline-none ring-1 ring-border placeholder:text-faint focus:ring-2 focus:ring-ring";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/" });
    });
    void supabase.auth.getSession().then(({ data: d }) => d.session && navigate({ to: "/" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === "signup") setMsg("Check your email to confirm your account, then sign in.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
      <form onSubmit={submit} className="panel-glass w-full max-w-sm space-y-3 rounded-xl p-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Store IT Dashboard</h1>
          <p className="text-[12px] text-faint">Eastgate Industries PVT Limited</p>
        </div>
        <input className={field} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={field} type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {msg ? <p role="alert" className="text-[12px] text-warn">{msg}</p> : null}
        <button disabled={busy} className="w-full rounded-lg bg-primary py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          onClick={async () => {
            const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (r.error) setMsg(r.error.message);
          }}
          className="w-full rounded-lg bg-panel/60 py-2 text-[13px] font-medium ring-1 ring-border hover:bg-panel"
        >
          Continue with Google
        </button>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-[12px] text-faint hover:text-foreground">
          {mode === "signin" ? "No account? Create one" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
