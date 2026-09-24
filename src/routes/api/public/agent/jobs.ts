import { createFileRoute } from "@tanstack/react-router";
import { verifyAgent } from "@/lib/agent.server";

/**
 * Polled by the Office LAN Monitoring Agent every few seconds.
 * Doubles as the heartbeat. Returns queued manual pings and the
 * auto-monitoring schedule + store list.
 */
export const Route = createFileRoute("/api/public/agent/jobs")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await verifyAgent(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin, settings } = auth;
        const now = new Date().toISOString();
        const name = (request.headers.get("x-agent-name") ?? "").slice(0, 80) || null;

        await supabaseAdmin
          .from("monitoring_settings")
          .update({ agent_last_heartbeat: now, agent_name: name })
          .eq("id", 1);

        const { data: pending } = await supabaseAdmin
          .from("ping_requests")
          .select("id, store_id, ip_address")
          .eq("status", "pending")
          .order("created_at")
          .limit(200);
        const ids = (pending ?? []).map((p) => p.id);
        if (ids.length) {
          await supabaseAdmin.from("ping_requests").update({ status: "claimed" }).in("id", ids);
        }

        const { data: stores } = settings.auto_enabled
          ? await supabaseAdmin.from("stores").select("id, ip_address").eq("monitoring_enabled", true)
          : { data: [] as { id: string; ip_address: string }[] };

        return Response.json({
          serverTime: now,
          autoEnabled: settings.auto_enabled,
          intervalSeconds: settings.interval_seconds,
          pingRequests: (pending ?? []).map((p) => ({ requestId: p.id, storeId: p.store_id, ip: p.ip_address })),
          stores: (stores ?? []).map((s) => ({ storeId: s.id, ip: s.ip_address })),
        });
      },
    },
  },
});
