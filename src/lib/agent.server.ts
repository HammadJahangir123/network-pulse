import { createHash, timingSafeEqual } from "crypto";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Verifies the agent bearer token. Returns the admin client on success. */
export async function verifyAgent(request: Request) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token.length > 200) return null;

  const { data: settings } = await supabaseAdmin
    .from("monitoring_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!settings?.agent_token_hash) return null;

  const a = Buffer.from(hashToken(token));
  const b = Buffer.from(settings.agent_token_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { supabaseAdmin, settings };
}
