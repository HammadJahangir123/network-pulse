// Shared, client-safe types for the monitoring layer.

export type StoreStatus = "online" | "offline" | "unknown";
export type AgentStatus = "connected" | "disconnected" | "unknown";

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
  shopName: string;
  dbName: string;
  ipAddress: string;
  status: StoreStatus;
  lastPing: string | null;
  responseTime: number | null;
  lastSeen: string | null;
  agentStatus: AgentStatus;
};

export type Snapshot = {
  brands: Brand[];
  stores: StoreRow[];
  checkedAt: string;
};

export type PingResult = {
  storeId: string;
  success: boolean;
  status: StoreStatus;
  responseTime: number | null;
  checkedAt: string;
  message: string;
};
