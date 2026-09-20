/**
 * MONITORING API
 * --------------
 * Server-side boundary between the dashboard UI and the shop monitoring
 * agents. The UI never talks to a shop LAN directly — it only calls these
 * functions, which today use the mock agent and later will forward to the
 * real agent relay.
 */
import { createServerFn } from "@tanstack/react-start";

import type {
  AgentStatus,
  PingResult,
  Snapshot,
  StoreRow,
  StoreStatus,
} from "./monitoring-types";

type DbStore = {
  id: string;
  brand_id: string;
  sequence: number;
  store_code: string;
  shop_name: string;
  db_name: string;
  ip_address: string;
  status: string;
  last_ping: string | null;
  response_time: number | null;
  last_seen: string | null;
  agent_status: string;
};

function toRow(store: DbStore, brand: { code: string; name: string }): StoreRow {
  return {
    id: store.id,
    brandId: store.brand_id,
    brandCode: brand.code,
    brandName: brand.name,
    sequence: store.sequence,
    storeCode: store.store_code,
    shopName: store.shop_name,
    dbName: store.db_name,
    ipAddress: store.ip_address,
    status: store.status as StoreStatus,
    lastPing: store.last_ping,
    responseTime: store.response_time,
    lastSeen: store.last_seen,
    agentStatus: store.agent_status as AgentStatus,
  };
}

async function loadSnapshot(): Promise<Snapshot> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: brands, error: brandError }, { data: stores, error: storeError }] =
    await Promise.all([
      supabaseAdmin.from("brands").select("*").order("sort_order"),
      supabaseAdmin.from("stores").select("*").order("sequence"),
    ]);

  if (brandError) throw new Error(brandError.message);
  if (storeError) throw new Error(storeError.message);

  const brandList = (brands ?? []).map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    sortOrder: b.sort_order,
  }));
  const byId = new Map(brandList.map((b) => [b.id, b]));

  return {
    brands: brandList,
    stores: (stores ?? [])
      .map((s) => {
        const brand = byId.get(s.brand_id);
        return brand ? toRow(s as DbStore, brand) : null;
      })
      .filter((s): s is StoreRow => s !== null)
      .sort((a, b) =>
        a.brandCode === b.brandCode
          ? a.sequence - b.sequence
          : a.brandCode.localeCompare(b.brandCode),
      ),
    checkedAt: new Date().toISOString(),
  };
}

/** Current stored state of every brand and store. No probing. */
export const getSnapshot = createServerFn({ method: "GET" }).handler(async () => loadSnapshot());

/** Runs a monitoring sweep across all stores (or one brand) and stores results. */
export const runSweep = createServerFn({ method: "POST" })
  .inputValidator((input: { brandCode?: string | null }) => ({
    brandCode: input?.brandCode ?? null,
  }))
  .handler(async ({ data }): Promise<Snapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { probeStore } = await import("./monitoring-agent.server");

    const { data: brands } = await supabaseAdmin.from("brands").select("id, code");
    const brandId = data.brandCode
      ? (brands ?? []).find((b) => b.code === data.brandCode)?.id ?? null
      : null;

    let query = supabaseAdmin.from("stores").select("*");
    if (brandId) query = query.eq("brand_id", brandId);
    const { data: stores, error } = await query;
    if (error) throw new Error(error.message);

    const now = new Date().toISOString();
    const updated = await Promise.all(
      (stores ?? []).map(async (store) => {
        const probe = await probeStore({
          storeCode: store.store_code,
          ipAddress: store.ip_address,
          agentStatus: store.agent_status,
        });
        const status: StoreStatus =
          probe.agentStatus === "disconnected" ? "unknown" : probe.reachable ? "online" : "offline";
        return {
          ...store,
          status,
          response_time: probe.responseTime,
          last_ping: now,
          last_seen: status === "online" ? now : store.last_seen,
          updated_at: now,
        };
      }),
    );

    if (updated.length > 0) {
      const { error: writeError } = await supabaseAdmin.from("stores").upsert(updated);
      if (writeError) throw new Error(writeError.message);
    }

    return loadSnapshot();
  });

/** On-demand ping of a single store through its monitoring agent. */
export const pingStore = createServerFn({ method: "POST" })
  .inputValidator((input: { storeId: string }) => {
    if (!input?.storeId || typeof input.storeId !== "string") {
      throw new Error("storeId is required");
    }
    return { storeId: input.storeId };
  })
  .handler(async ({ data }): Promise<PingResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { probeStore } = await import("./monitoring-agent.server");

    const { data: store, error } = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("id", data.storeId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!store) throw new Error("Store not found");

    const probe = await probeStore({
      storeCode: store.store_code,
      ipAddress: store.ip_address,
      agentStatus: store.agent_status,
    });
    const status: StoreStatus =
      probe.agentStatus === "disconnected" ? "unknown" : probe.reachable ? "online" : "offline";
    const now = new Date().toISOString();

    await supabaseAdmin
      .from("stores")
      .update({
        status,
        response_time: probe.responseTime,
        last_ping: now,
        last_seen: status === "online" ? now : store.last_seen,
        updated_at: now,
      })
      .eq("id", store.id);

    return {
      storeId: store.id,
      success: status === "online",
      status,
      responseTime: probe.responseTime,
      checkedAt: now,
      message:
        status === "online"
          ? `Ping successful — ${probe.responseTime}ms`
          : status === "unknown"
            ? "No agent on this shop network"
            : "Ping failed — host unreachable",
    };
  });
