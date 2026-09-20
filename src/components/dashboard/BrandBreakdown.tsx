import type { Brand, StoreRow } from "@/lib/monitoring-types";

export function BrandBreakdown({
  brands,
  stores,
  onSelect,
}: {
  brands: Brand[];
  stores: StoreRow[];
  onSelect: (code: string) => void;
}) {
  const rows = brands.map((brand) => {
    const list = stores.filter((s) => s.brandCode === brand.code);
    return {
      brand,
      total: list.length,
      online: list.filter((s) => s.status === "online").length,
      offline: list.filter((s) => s.status === "offline").length,
      unknown: list.filter((s) => s.status === "unknown").length,
    };
  });

  return (
    <div className="panel-glass mb-5 overflow-hidden rounded-xl">
      <div className="border-b border-border px-4 py-3 text-[13px] font-medium">
        Brand-wise status
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-faint">
            <th className="px-4 py-2 text-left font-medium">Brand</th>
            <th className="px-2 py-2 text-right font-medium">Total</th>
            <th className="px-2 py-2 text-right font-medium">Online</th>
            <th className="px-2 py-2 text-right font-medium">Offline</th>
            <th className="px-4 py-2 text-right font-medium">Not checked</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr
              key={r.brand.id}
              onClick={() => onSelect(r.brand.code)}
              className="cursor-pointer transition-colors hover:bg-panel/70"
            >
              <td className="px-4 py-2.5">
                <span className="font-mono text-faint">{r.brand.code}</span>{" "}
                <span className="font-medium">{r.brand.name}</span>
              </td>
              <td className="px-2 text-right font-mono tabular-nums">{r.total}</td>
              <td className="px-2 text-right font-mono tabular-nums text-ok">{r.online}</td>
              <td className="px-2 text-right font-mono tabular-nums text-crit">{r.offline}</td>
              <td className="px-4 text-right font-mono tabular-nums text-faint">{r.unknown}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
