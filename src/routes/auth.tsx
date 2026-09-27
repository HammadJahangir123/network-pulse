import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { EastgateLogo } from "@/components/EastgateLogo";
import { Button } from "@/components/ui/button";
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
  "h-11 w-full rounded-md bg-background px-3 text-sm text-foreground outline-none ring-1 ring-border placeholder:text-faint focus:ring-2 focus:ring-ring";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void navigate({ to: "/" });
    });
    void supabase.auth.getUser().then(({ data }) => data.user && navigate({ to: "/" }));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setSuccess(false);
    try {
      const result =
        mode === "signin"
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: window.location.origin },
            });
      if (result.error) {
        setMsg(result.error.message);
      } else if (mode === "signup" && !result.data.session) {
        setSuccess(true);
        setMsg("Account created. Check your email to confirm it, then sign in.");
      }
    } catch {
      setMsg("We couldn't complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setMsg(null);
    setSuccess(false);
    setPassword("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4 text-foreground sm:p-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
      <form onSubmit={submit} className="panel-glass w-full max-w-md rounded-xl p-6 sm:p-8">
        <div className="mb-8 border-b border-border pb-6">
          <EastgateLogo className="h-11 w-auto max-w-[190px]" />
          <p className="mt-5 text-[11px] font-medium uppercase text-faint">Store IT Management</p>
          <h1 className="mt-1 text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to access the Store IT Dashboard."
              : "Create an account to manage store systems."}
          </p>
        </div>
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Email address
            <input className={`${field} mt-1.5`} type="email" required autoComplete="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input className={`${field} mt-1.5`} type="password" required minLength={6} autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </div>
        {msg ? <p role="alert" className={`mt-4 rounded-md px-3 py-2 text-xs ${success ? "bg-ok/10 text-ok" : "bg-crit/10 text-crit"}`}>{msg}</p> : null}
        <Button disabled={busy} className="mt-5 h-11 w-full">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <div className="my-5 flex items-center gap-3 text-[11px] text-faint before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">OR</div>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (result.error) {
              setMsg(result.error.message);
              setBusy(false);
            }
          }}
          className="h-11 w-full"
        >
          Continue with Google
        </Button>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New to Eastgate?" : "Already have an account?"}{" "}
          <button type="button" onClick={switchMode} className="font-medium text-foreground underline underline-offset-4">
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </form>
    </div>
  );
}
