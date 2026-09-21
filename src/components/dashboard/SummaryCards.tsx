import type { StoreRow } from "@/lib/monitoring-types";

export type Totals = {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  avgResponse: number | null;
};

export function computeTotals(stores: StoreRow[]): Totals {
  const online = stores.filter((s) => s.status === "online");
  const times = online.map((s) => s.responseTime).filter((t): t is number => typeof t === "number");
  return {
    total: stores.length,
    online: online.length,
    offline: stores.filter((s) => s.status === "offline").length,
    unknown: stores.filter((s) => s.status === "unknown").length,
    avgResponse: times.length
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : null,
  };
}

function Card({
  label,
  value,
  unit,
  note,
  tone,
}: {
  label: string;
  value: string;
  unit?: string | undefined;
  note: string;
  tone?: "ok" | "crit" | "muted";
}) {
  const toneClass =
    tone === "ok" ? "text-ok" : tone === "crit" ? "text-crit" : tone === "muted" ? "text-muted-foreground" : "";
  return (
    <div className="panel-glass rounded-xl p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-faint">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight ${toneClass}`}>
        {value}
        {unit ? <span className="text-base font-medium text-faint">{unit}</span> : null}
      </div>
      <div className="mt-1 text-[11px] text-faint">{note}</div>
    </div>
  );
}

export function SummaryCards({ totals, scope }: { totals: Totals; scope: string }) {
  const pct = totals.total ? Math.round((totals.online / totals.total) * 100) : 0;
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Card label="Total Stores" value={String(totals.total)} note={scope} />
      <Card label="Online" value={String(totals.online)} note={`${pct}% reachable`} tone="ok" />
      <Card label="Offline" value={String(totals.offline)} note="Ping failed" tone="crit" />
      <Card label="Not Checked" value={String(totals.unknown)} note="Awaiting agent" tone="muted" />
      <Card
        label="Avg Response"
        value={totals.avgResponse === null ? "—" : String(totals.avgResponse)}
        unit={totals.avgResponse === null ? undefined : "ms"}
        note={`Across ${totals.online} pings`}
      />
    </div>
  );
}
