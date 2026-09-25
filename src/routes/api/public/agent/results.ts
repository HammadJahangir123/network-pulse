import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyAgent } from "@/lib/agent.server";

const ResultSchema = z.object({
  results: z
    .array(
      z.object({
        requestId: z.string().uuid().nullable().optional(),
        storeId: z.string().uuid(),
        success: z.boolean(),
        responseTime: z.number().int().min(0).max(60000).nullable(),
        error: z.string().max(200).nullable().optional(),
        checkedAt: z.string().datetime().optional(),
      }),
    )
    .max(2000),
});

/** The LAN agent reports real ping/health-check results here. */
export const Route = createFileRoute("/api/public/agent/results")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await verifyAgent(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const parsed = ResultSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
        const { supabaseAdmin } = auth;
        const nowIso = new Date().toISOString();

        await supabaseAdmin.from("monitoring_settings").update({ agent_last_heartbeat: nowIso }).eq("id", 1);

        for (const r of parsed.data.results) {
          const at = r.checkedAt ?? nowIso;
          const update: {
            status: string;
            response_time: number | null;
            last_ping: string;
            last_error: string | null;
            agent_status: string;
            updated_at: string;
            last_seen?: string;
          } = {
            status: r.success ? "online" : "offline",
            response_time: r.success ? (r.responseTime ?? null) : null,
            last_ping: at,
            last_error: r.success ? null : (r.error ?? "Request timed out"),
            agent_status: "connected",
            updated_at: nowIso,
          };
          if (r.success) update.last_seen = at;
          await supabaseAdmin.from("stores").update(update).eq("id", r.storeId);
          if (r.requestId) {
            await supabaseAdmin
              .from("ping_requests")
              .update({
                status: "done",
                success: r.success,
                response_time: r.success ? r.responseTime : null,
                error: r.success ? null : (r.error ?? "Request timed out"),
                completed_at: at,
              })
              .eq("id", r.requestId);
          }
        }
        return Response.json({ ok: true, received: parsed.data.results.length });
      },
    },
  },
});
