import type { ReactNode } from "react";
import { StatusBadge } from "./StatusBadge";
import { formatClock, formatRelative } from "@/lib/format";
import type { CheckResult, StoreRow } from "@/lib/monitoring-types";

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
      <span className="text-faint">{label}</span>
      <span className="text-right font-mono tabular-nums">{value}</span>
    </div>
  );
}

export function StoreDetailPanel({
  store,
  pinging,
  result,
  agentConnected,
  canManage,
  onPing,
  onClose,
}: {
  store: StoreRow | null;
  pinging: boolean;
  result: CheckResult | null;
  agentConnected: boolean;
  canManage: boolean;
  onPing: (store: StoreRow) => void;
  onClose: () => void;
}) {
  if (!store) {
    return (
      <aside className="hidden w-80 shrink-0 border-l border-border bg-panel/55 p-5 backdrop-blur-xl xl:block">
        <div className="text-[11px] font-medium uppercase tracking-wide text-faint">Store Detail</div>
        <p className="mt-6 text-[13px] leading-relaxed text-faint">
          Select any row in the table to see the store's details and run a network check.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-panel/55 p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-faint">Store Detail</div>
          <div className="mt-1 text-lg font-semibold tracking-tight">{store.storeName}</div>
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
        <Field label="Local IP" value={store.localIp} />
        <Field label="Online Status" value={<StatusBadge status={store.status} agentConnected={agentConnected} />} />
        <Field label="Last Checked" value={formatClock(store.lastChecked)} />
        <Field label="Response Time" value={store.responseTime === null ? "—" : `${store.responseTime}ms`} />
        <Field label="Last Seen" value={formatRelative(store.lastSeen)} />
        <Field label="Monitoring" value={store.monitoringEnabled ? "Enabled" : "Disabled"} />
        {store.lastError ? <Field label="Last Error" value={store.lastError} /> : null}
      </div>

      {result ? (
        <div
          className={`mt-4 rounded-lg p-3 text-[12px] font-medium ${
            result.success ? "bg-ok/10 text-ok" : "bg-crit/10 text-crit"
          }`}
        >
          {result.success
            ? `✓ Ping Successful — ${result.responseTime ?? "?"}ms`
            : `✕ Ping Failed${result.error ? ` — ${result.error}` : ""}`}
        </div>
      ) : null}

      {!agentConnected ? (
        <div className="mt-4 rounded-lg bg-crit/10 p-3 text-[12px] font-medium text-crit">
          Monitoring Service Not Connected
        </div>
      ) : null}

      {canManage ? (
        <div className="mt-auto pt-5">
          <button
            onClick={() => onPing(store)}
            disabled={pinging || !agentConnected}
            className="w-full rounded-lg bg-primary py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {pinging ? "Pinging…" : "Ping Now"}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
