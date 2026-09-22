import { StatusBadge } from "./StatusBadge";
import { formatRelative } from "@/lib/format";
import type { PingResult, StoreRow } from "@/lib/monitoring-types";

export type Filters = {
  sequence: string;
  storeCode: string;
  shopName: string;
  dbName: string;
  ipAddress: string;
  status: string;
};

export const EMPTY_FILTERS: Filters = {
  sequence: "",
  storeCode: "",
  shopName: "",
  dbName: "",
  ipAddress: "",
  status: "all",
};

export function applyFilters(stores: StoreRow[], f: Filters): StoreRow[] {
  const t = (v: string) => v.trim().toLowerCase();
  return stores.filter((s) => {
    if (f.sequence.trim() && !String(s.sequence).startsWith(f.sequence.trim())) return false;
    if (f.storeCode.trim() && !s.storeCode.toLowerCase().includes(t(f.storeCode))) return false;
    if (f.shopName.trim() && !s.shopName.toLowerCase().includes(t(f.shopName))) return false;
    if (f.dbName.trim() && !s.dbName.toLowerCase().includes(t(f.dbName))) return false;
    if (f.ipAddress.trim() && !s.ipAddress.includes(f.ipAddress.trim())) return false;
    if (f.status !== "all" && s.status !== f.status) return false;
    return true;
  });
}

const inputClass =
  "w-full rounded-md bg-panel/60 px-2 py-1.5 text-[12px] text-foreground outline-none ring-1 ring-border placeholder:text-faint focus:ring-2 focus:ring-ring";

export function StoreTable({
  stores,
  scopeLabel,
  filters,
  onFilterChange,
  onClearFilters,
  selectedId,
  onSelect,
  pingingIds,
  results,
  onPing,
  onEdit,
  onAdd,
  loading,
  error,
}: {
  stores: StoreRow[];
  scopeLabel: string;
  filters: Filters;
  onFilterChange: (next: Filters) => void;
  onClearFilters: () => void;
  selectedId: string | null;
  onSelect: (store: StoreRow) => void;
  pingingIds: Set<string>;
  results: Record<string, PingResult>;
  onPing: (store: StoreRow) => void;
  onEdit: (store: StoreRow) => void;
  onAdd: () => void;
  loading: boolean;
  error: string | null;
}) {

  const set = (key: keyof Filters) => (value: string) =>
    onFilterChange({ ...filters, [key]: value });

  return (
    <div className="panel-glass overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="text-[13px] font-medium">Store inventory</div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums text-faint">
            {stores.length} rows · {scopeLabel}
          </span>
          <button
            onClick={onClearFilters}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-faint transition-colors hover:bg-panel hover:text-foreground"
          >
            Clear filters
          </button>
          <button
            onClick={onAdd}
            className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + Add Store
          </button>

        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-[13px]">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-faint">
              <th className="w-[68px] px-4 py-2 text-left font-medium">Seq</th>
              <th className="w-[120px] px-2 text-left font-medium">Store Code</th>
              <th className="px-2 text-left font-medium">Shop Name</th>
              <th className="w-[150px] px-2 text-left font-medium">DB Name</th>
              <th className="w-[130px] px-2 text-left font-medium">IP Address</th>
              <th className="w-[140px] px-2 text-left font-medium">Online Status</th>
              <th className="w-[120px] px-2 text-left font-medium">Ping</th>
              <th className="w-[120px] px-4 text-right font-medium">Actions</th>
            </tr>
            <tr className="border-b border-border bg-panel/30">
              <th className="px-4 py-2.5">
                <input
                  aria-label="Search by sequence"
                  inputMode="numeric"
                  value={filters.sequence}
                  onChange={(e) => set("sequence")(e.target.value)}
                  placeholder="No."
                  className={`${inputClass} font-mono`}
                />
              </th>
              <th className="px-2">
                <input
                  aria-label="Search by store code"
                  value={filters.storeCode}
                  onChange={(e) => set("storeCode")(e.target.value)}
                  placeholder="Store code"
                  className={inputClass}
                />
              </th>
              <th className="px-2">
                <input
                  aria-label="Search by shop name"
                  value={filters.shopName}
                  onChange={(e) => set("shopName")(e.target.value)}
                  placeholder="Shop name"
                  className={inputClass}
                />
              </th>
              <th className="px-2">
                <input
                  aria-label="Search by DB name"
                  value={filters.dbName}
                  onChange={(e) => set("dbName")(e.target.value)}
                  placeholder="DB name"
                  className={inputClass}
                />
              </th>
              <th className="px-2">
                <input
                  aria-label="Search by IP address"
                  value={filters.ipAddress}
                  onChange={(e) => set("ipAddress")(e.target.value)}
                  placeholder="IP"
                  className={`${inputClass} font-mono`}
                />
              </th>
              <th className="px-2">
                <select
                  aria-label="Filter by online status"
                  value={filters.status}
                  onChange={(e) => set("status")(e.target.value)}
                  className={inputClass}
                >
                  <option value="all">All</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unknown">Not checked</option>
                </select>
              </th>
              <th className="px-2" />
              <th className="px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {error ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-crit">
                  Monitoring data could not be loaded. {error}
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-faint">
                  Loading store network…
                </td>
              </tr>
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-faint">
                  No stores match these filters.
                </td>
              </tr>
            ) : (
              stores.map((store) => {
                const isPinging = pingingIds.has(store.id);
                const result = results[store.id];
                return (
                  <tr
                    key={store.id}
                    onClick={() => onSelect(store)}
                    className={`cursor-pointer transition-colors hover:bg-panel/70 ${
                      selectedId === store.id ? "bg-panel/80" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono tabular-nums text-faint">
                      {String(store.sequence).padStart(2, "0")}
                    </td>
                    <td className="px-2 font-mono font-medium tabular-nums">{store.storeCode}</td>
                    <td className="px-2">{store.shopName}</td>
                    <td className="px-2 font-mono text-muted-foreground">{store.dbName}</td>
                    <td className="px-2 font-mono tabular-nums text-muted-foreground">
                      {store.ipAddress}
                    </td>
                    <td className="px-2">
                      {isPinging ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-warn">
                          <span className="animate-pingsoft size-1.5 rounded-full bg-warn" />
                          Pinging…
                        </span>
                      ) : (
                        <StatusBadge status={store.status} />
                      )}
                    </td>
                    <td
                      className="px-2 font-mono text-[12px] tabular-nums"
                      title={`Last checked ${formatRelative(store.lastPing)}`}
                    >
                      {isPinging ? (
                        <span className="animate-pingsoft text-faint">—</span>
                      ) : store.status === "online" && store.responseTime !== null ? (
                        <span className="text-ok">{store.responseTime}ms</span>
                      ) : store.status === "offline" ? (
                        <span className="text-crit">Failed</span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPing(store);
                        }}
                        disabled={isPinging}
                        className={`rounded-md px-2.5 py-1 text-[12px] font-medium ring-1 transition-colors ${
                          isPinging
                            ? "animate-pingsoft bg-panel/60 text-faint ring-border"
                            : result?.success
                              ? "bg-ok/10 text-ok ring-ok/40"
                              : result && !result.success
                                ? "bg-crit/10 text-crit ring-crit/40"
                                : "bg-panel/60 text-foreground ring-border hover:bg-panel"
                        }`}
                      >
                        {isPinging
                          ? "Pinging…"
                          : result?.success
                            ? `✓ ${result.responseTime}ms`
                            : result
                              ? "✕ Failed"
                              : "Ping"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
