import type { StoreStatus } from "@/lib/monitoring-types";

const MAP: Record<StoreStatus, { label: string; dot: string; text: string; icon: string }> = {
  online: { label: "Online", dot: "bg-ok", text: "text-ok", icon: "●" },
  offline: { label: "Offline", dot: "bg-crit", text: "text-crit", icon: "▲" },
  unknown: { label: "Not checked", dot: "bg-faint", text: "text-muted-foreground", icon: "○" },
};

export function StatusBadge({ status }: { status: StoreStatus }) {
  const s = MAP[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${s.text}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      <span aria-hidden="true" className="text-[9px] leading-none">
        {s.icon}
      </span>
      {s.label}
    </span>
  );
}
