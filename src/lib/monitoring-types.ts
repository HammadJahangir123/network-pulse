// Shared, client-safe types for the monitoring layer.

export type StoreStatus = "online" | "offline" | "checking" | "unknown";

export type Brand = {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
};

export type StoreRow = {
  id: string;
  brandId: string;
  brandCode: string;
  brandName: string;
  sequence: number;
  storeCode: string;
  storeName: string;
  dbName: string;
  localIp: string;
  status: StoreStatus;
  responseTime: number | null;
  lastChecked: string | null;
  lastSeen: string | null;
  lastError: string | null;
  monitoringEnabled: boolean;
};

export type AgentState = {
  configured: boolean;
  connected: boolean;
  lastHeartbeat: string | null;
  name: string | null;
};

export type Snapshot = {
  brands: Brand[];
  stores: StoreRow[];
  agent: AgentState;
  settings: { autoEnabled: boolean; intervalSeconds: number };
  access: { isAdmin: boolean; canManage: boolean; email: string | null };
  checkedAt: string;
};

export type PingRequestResult =
  | { ok: true; requestId: string }
  | { ok: false; reason: "not_connected" | "disabled" | "forbidden" | "not_found"; message: string };

export type PingPoll =
  | { state: "pending" }
  | {
      state: "done";
      success: boolean;
      responseTime: number | null;
      error: string | null;
      checkedAt: string;
    };

export const AGENT_STALE_MS = 90_000;

/** Last manual check result shown in the UI for a store. */
export type CheckResult = { success: boolean; responseTime: number | null; error: string | null };
