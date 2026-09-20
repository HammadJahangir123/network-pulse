import { StatusBadge } from "./StatusBadge";
import { formatClock, formatRelative } from "@/lib/format";
import type { PingResult, StoreRow } from "@/lib/monitoring-types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-faint">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

export function StoreDetailPanel({
  store,
  pinging,
  result,
  onPing,
  onClose,
}: {
  store: StoreRow | null;
  pinging: boolean;
  result: PingResult | null;
  onPing: (store: StoreRow) => void;
  onClose: () => void;
}) {
  if (!store) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-border bg-panel/55 p-5 backdrop-blur-xl xl:block">
        <div className="text-[11px] font-medium uppercase tracking-wide text-faint">
          Store Detail
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-faint">
          Select any row in the table to inspect a shop, review its agent status and run a ping.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel/55 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-faint">
            Store Detail
          </div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{store.shopName}</div>
          <div className="font-mono text-[12px] tabular-nums text-muted-foreground">
            {store.storeCode} · {store.brandName}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:bg-panel hover:text-foreground"
          aria-label="Close store details"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 space-y-3 text-[13px]">
        <Field label="Brand" value={store.brandCode} />
        <Field label="DB Name" value={store.dbName} />
        <Field label="IP Address" value={store.ipAddress} />
        <Field label="Online Status" value={<StatusBadge status={store.status} />} />
        <Field label="Last Ping" value={formatClock(store.lastPing)} />
        <Field
          label="Response Time"
          value={store.responseTime === null ? "—" : `${store.responseTime}ms`}
        />
        <Field label="Last Seen" value={formatRelative(store.lastSeen)} />
        <div className="flex items-center justify-between">
          <span className="text-faint">Agent Status</span>
          <span
            className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${
              store.agentStatus === "connected" ? "text-ok" : "text-crit"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                store.agentStatus === "connected" ? "bg-ok" : "bg-crit"
              }`}
            />
            {store.agentStatus === "connected" ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-lg p-3 text-[12px] font-medium ${
            result.success ? "bg-ok/10 text-ok" : "bg-crit/10 text-crit"
          }`}
        >
          {result.success ? "✓" : "✕"} {result.message}
        </div>
      ) : null}

      <div className="mt-6 rounded-lg bg-panel/50 p-3 text-[11px] leading-relaxed text-faint ring-1 ring-border">
        Local agent on the shop LAN reports status. Browsers cannot ping private IPs directly —
        results relay via the monitoring API.
      </div>

      <div className="mt-auto pt-5">
        <button
          onClick={() => onPing(store)}
          disabled={pinging}
          className="w-full rounded-lg bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {pinging ? "Pinging…" : "Ping Now"}
        </button>
      </div>
    </aside>
  );
}
