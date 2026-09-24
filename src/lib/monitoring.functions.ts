/**
 * MONITORING API
 * Dashboard -> these server functions -> ping queue -> Office LAN Agent -> store IP.
 * The browser never pings anything. No results are simulated: if the agent
 * is not connected, the UI is told so.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validatePrivateIp } from "./ip";
import {
  AGENT_STALE_MS,
  type PingPoll,
  type PingRequestResult,
  type Snapshot,
  type StoreRow,
  type StoreStatus,
} from "./monitoring-types";

type Ctx = { supabase: any; userId: string };

async function getAccess(ctx: Ctx) {
  const [{ data: isAdmin }, { data: isOperator }] = await Promise.all([
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
    ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "operator" }),
  ]);
  return { isAdmin: !!isAdmin, canManage: !!isAdmin || !!isOperator };
}

async function loadSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("monitoring_settings").select("*").eq("id", 1).maybeSingle();
  const hb = data?.agent_last_heartbeat ?? null;
  return {
    settings: {
      autoEnabled: data?.auto_enabled ?? true,
      intervalSeconds: data?.interval_seconds ?? 60,
    },
    agent: {
      configured: !!data?.agent_token_hash,
      connected: !!data?.agent_token_hash && !!hb && Date.now() - new Date(hb).getTime() < AGENT_STALE_MS,
      lastHeartbeat: hb,
      name: data?.agent_name ?? null,
    },
  };
}

async function loadSnapshot(ctx: Ctx & { claims?: any }): Promise<Snapshot> {
  const [brandsRes, storesRes, access, s] = await Promise.all([
    ctx.supabase.from("brands").select("*").order("sort_order"),
    ctx.supabase.from("stores").select("*").order("sequence"),
    getAccess(ctx),
    loadSettings(),
  ]);
  if (brandsRes.error) throw new Error(brandsRes.error.message);
  if (storesRes.error) throw new Error(storesRes.error.message);

  const brands = (brandsRes.data ?? []).map((b: any) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    sortOrder: b.sort_order,
  }));
  const byId = new Map(brands.map((b: any) => [b.id, b]));
  const stores: StoreRow[] = (storesRes.data ?? [])
    .map((st: any) => {
      const brand: any = byId.get(st.brand_id);
      if (!brand) return null;
      return {
        id: st.id,
        brandId: st.brand_id,
        brandCode: brand.code,
        brandName: brand.name,
        sequence: st.sequence,
        storeCode: st.store_code,
        storeName: st.shop_name,
        dbName: st.db_name,
        localIp: st.ip_address,
        status: st.status as StoreStatus,
        responseTime: st.response_time,
        lastChecked: st.last_ping,
        lastSeen: st.last_seen,
        lastError: st.last_error ?? null,
        monitoringEnabled: st.monitoring_enabled ?? true,
      } satisfies StoreRow;
    })
    .filter(Boolean) as StoreRow[];

  return {
    brands,
    stores,
    ...s,
    access: { ...access, email: ctx.claims?.email ?? null },
    checkedAt: new Date().toISOString(),
  };
}

export const getSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadSnapshot(context as any));

// ---------- Store management ----------

type StoreInput = {
  id: string | null;
  brandId: string;
  sequence: number;
  storeCode: string;
  storeName: string;
  dbName: string;
  localIp: string;
  monitoringEnabled: boolean;
};

function validateStore(input: any): StoreInput {
  const text = (v: unknown, field: string, max: number) => {
    const s = typeof v === "string" ? v.trim() : "";
    if (!s) throw new Error(`${field} is required`);
    if (s.length > max) throw new Error(`${field} must be under ${max} characters`);
    return s;
  };
  const seq = Number(input?.sequence);
  if (!Number.isInteger(seq) || seq < 1 || seq > 100000) throw new Error("Sequence must be a whole number");
  const ip = String(input?.localIp ?? "").trim();
  const ipError = validatePrivateIp(ip);
  if (ipError) throw new Error(ipError);
  return {
    id: typeof input?.id === "string" && input.id ? input.id : null,
    brandId: text(input?.brandId, "Brand", 64),
    sequence: seq,
    storeCode: text(input?.storeCode, "Store code", 40),
    storeName: text(input?.storeName, "Store name", 120),
    dbName: text(input?.dbName, "DB name", 120),
    localIp: ip,
    monitoringEnabled: input?.monitoringEnabled !== false,
  };
}

export const saveStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateStore)
  .handler(async ({ data, context }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const access = await getAccess(context as any);
    if (!access.canManage) return { ok: false, error: "You don't have permission to manage stores" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const row = {
      brand_id: data.brandId,
      sequence: data.sequence,
      store_code: data.storeCode,
      shop_name: data.storeName,
      db_name: data.dbName,
      ip_address: data.localIp,
      monitoring_enabled: data.monitoringEnabled,
      agent_status: "unknown",
      updated_at: now,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("stores").update(row).eq("id", data.id)
      : await supabaseAdmin.from("stores").insert({ ...row, status: "unknown" });
    if (error) {
      return {
        ok: false,
        error: error.code === "23505" ? "A store with this store code already exists" : error.message,
      };
    }
    return { ok: true };
  });

export const deleteStore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storeId: string }) => {
    if (!input?.storeId || typeof input.storeId !== "string") throw new Error("storeId is required");
    return { storeId: input.storeId };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const access = await getAccess(context as any);
    if (!access.canManage) return { ok: false, error: "You don't have permission to delete stores" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", data.storeId);
    return error ? { ok: false, error: error.message } : { ok: true };
  });

// ---------- Network checks (queued for the LAN agent) ----------

export const requestPing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { storeId: string }) => {
    if (!input?.storeId || typeof input.storeId !== "string") throw new Error("storeId is required");
    return { storeId: input.storeId };
  })
  .handler(async ({ data, context }): Promise<PingRequestResult> => {
    const access = await getAccess(context as any);
    if (!access.canManage) return { ok: false, reason: "forbidden", message: "You don't have permission to run network checks" };
    const { agent } = await loadSettings();
    if (!agent.connected) {
      return { ok: false, reason: "not_connected", message: "Monitoring Service Not Connected" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store } = await supabaseAdmin.from("stores").select("id, ip_address").eq("id", data.storeId).maybeSingle();
    if (!store) return { ok: false, reason: "not_found", message: "Store not found" };

    const { data: req, error } = await supabaseAdmin
      .from("ping_requests")
      .insert({ store_id: store.id, ip_address: store.ip_address, requested_by: (context as any).userId })
      .select("id")
      .single();
    if (error || !req) throw new Error(error?.message ?? "Could not queue ping");
    await supabaseAdmin.from("stores").update({ status: "checking" }).eq("id", store.id);
    return { ok: true, requestId: req.id };
  });

export const getPingResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string }) => {
    if (!input?.requestId || typeof input.requestId !== "string") throw new Error("requestId is required");
    return { requestId: input.requestId };
  })
  .handler(async ({ data }): Promise<PingPoll> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req } = await supabaseAdmin.from("ping_requests").select("*").eq("id", data.requestId).maybeSingle();
    if (!req) return { state: "done", success: false, responseTime: null, error: "Request not found", checkedAt: new Date().toISOString() };
    if (req.status === "done") {
      return {
        state: "done",
        success: !!req.success,
        responseTime: req.response_time,
        error: req.error,
        checkedAt: req.completed_at ?? new Date().toISOString(),
      };
    }
    // Agent never answered: report honestly, don't guess a status.
    if (Date.now() - new Date(req.created_at).getTime() > 30_000) {
      const now = new Date().toISOString();
      const msg = "Monitoring agent did not respond";
      await supabaseAdmin.from("ping_requests").update({ status: "done", success: false, error: msg, completed_at: now }).eq("id", req.id);
      await supabaseAdmin.from("stores").update({ status: "unknown", last_error: msg }).eq("id", req.store_id).eq("status", "checking");
      return { state: "done", success: false, responseTime: null, error: msg, checkedAt: now };
    }
    return { state: "pending" };
  });

export const checkAllNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { brandId: string | null }) => ({ brandId: typeof input?.brandId === "string" ? input.brandId : null }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; queued: number; message: string }> => {
    const access = await getAccess(context as any);
    if (!access.canManage) return { ok: false, queued: 0, message: "You don't have permission to run network checks" };
    const { agent } = await loadSettings();
    if (!agent.connected) return { ok: false, queued: 0, message: "Monitoring Service Not Connected" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("stores").select("id, ip_address").eq("monitoring_enabled", true);
    if (data.brandId) q = q.eq("brand_id", data.brandId);
    const { data: stores } = await q;
    const rows = (stores ?? []).map((s) => ({ store_id: s.id, ip_address: s.ip_address, requested_by: (context as any).userId }));
    if (rows.length) {
      await supabaseAdmin.from("ping_requests").insert(rows);
      await supabaseAdmin.from("stores").update({ status: "checking" }).in("id", rows.map((r) => r.store_id));
    }
    return { ok: true, queued: rows.length, message: `Queued ${rows.length} checks` };
  });

// ---------- Settings / agent / team (admin) ----------

async function requireAdmin(context: any) {
  const access = await getAccess(context);
  if (!access.isAdmin) throw new Error("Only admins can change monitoring settings");
}

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { autoEnabled: boolean; intervalSeconds: number }) => {
    const n = Number(input?.intervalSeconds);
    if (!Number.isInteger(n) || n < 15 || n > 3600) throw new Error("Interval must be 15–3600 seconds");
    return { autoEnabled: !!input?.autoEnabled, intervalSeconds: n };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("monitoring_settings")
      .update({ auto_enabled: data.autoEnabled, interval_seconds: data.intervalSeconds, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateAgentToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { hashToken } = await import("./agent.server");
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const token = "egagent_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("monitoring_settings")
      .update({ agent_token_hash: hashToken(token), agent_last_heartbeat: null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { token };
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: users }, { data: roles }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    return (users?.users ?? []).map((u) => {
      const r = (roles ?? []).filter((x) => x.user_id === u.id).map((x) => x.role as string);
      return {
        id: u.id,
        email: u.email ?? "",
        role: r.includes("admin") ? "admin" : r.includes("operator") ? "operator" : "viewer",
      };
    });
  });

export const setUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; operator: boolean }) => {
    if (!input?.userId || typeof input.userId !== "string") throw new Error("userId is required");
    return { userId: input.userId, operator: !!input.operator };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.operator) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.userId, role: "operator" }, { onConflict: "user_id,role" });
    } else {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "operator");
    }
    return { ok: true };
  });
