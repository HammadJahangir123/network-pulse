import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BrandBreakdown } from "@/components/dashboard/BrandBreakdown";
import { StoreDetailPanel } from "@/components/dashboard/StoreDetailPanel";
import {
  StoreFormDialog,
  toFormValues,
  type StoreFormValues,
} from "@/components/dashboard/StoreFormDialog";
import { SummaryCards, computeTotals } from "@/components/dashboard/SummaryCards";
import { EMPTY_FILTERS, StoreTable, applyFilters, type Filters } from "@/components/dashboard/StoreTable";
import { formatClock } from "@/lib/format";
import { deleteStore, getSnapshot, pingStore, runSweep, saveStore } from "@/lib/monitoring.functions";
import type { PingResult, Snapshot, StoreRow } from "@/lib/monitoring-types";


const AUTO_REFRESH_MS = 45_000;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Store Network Monitoring — Eastgate Industries" },
      {
        name: "description",
        content:
          "Live reachability of every Eastgate retail store across all brands: online status, ping latency and per-shop agent health.",
      },
      { property: "og:title", content: "Store Network Monitoring — Eastgate Industries" },
      {
        property: "og:description",
        content:
          "Live reachability of every Eastgate retail store across all brands: online status, ping latency and per-shop agent health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const fetchSnapshot = useServerFn(getSnapshot);
  const sweep = useServerFn(runSweep);
  const ping = useServerFn(pingStore);
  const save = useServerFn(saveStore);
  const remove = useServerFn(deleteStore);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandCode, setBrandCode] = useState<string>("ALL");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pingingIds, setPingingIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, PingResult>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<StoreFormValues | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const busy = useRef(false);


  const load = useCallback(async () => {
    try {
      const data = await fetchSnapshot();
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [fetchSnapshot]);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const data = await sweep({ data: { brandCode: null } });
      setSnapshot(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      busy.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, [sweep]);

  useEffect(() => {
    void load().then(() => refresh());
  }, [load, refresh]);

  useEffect(() => {
    const id = setInterval(() => void refresh(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const brands = snapshot?.brands ?? [];
  const allStores = snapshot?.stores ?? [];

  const scopedStores = useMemo(
    () => (brandCode === "ALL" ? allStores : allStores.filter((s) => s.brandCode === brandCode)),
    [allStores, brandCode],
  );
  const visibleStores = useMemo(() => applyFilters(scopedStores, filters), [scopedStores, filters]);
  const totals = useMemo(() => computeTotals(scopedStores), [scopedStores]);
  const selected = allStores.find((s) => s.id === selectedId) ?? null;
  const scopeLabel =
    brandCode === "ALL"
      ? "All brands"
      : (brands.find((b) => b.code === brandCode)?.name ?? brandCode);

  const handlePing = useCallback(
    async (store: StoreRow) => {
      setPingingIds((prev) => new Set(prev).add(store.id));
      try {
        const result = await ping({ data: { storeId: store.id } });
        setResults((prev) => ({ ...prev, [store.id]: result }));
        setSnapshot((prev) =>
          prev
            ? {
                ...prev,
                stores: prev.stores.map((s) =>
                  s.id === store.id
                    ? {
                        ...s,
                        status: result.status,
                        responseTime: result.responseTime,
                        lastPing: result.checkedAt,
                        lastSeen: result.success ? result.checkedAt : s.lastSeen,
                      }
                    : s,
                ),
              }
            : prev,
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ping failed");
      } finally {
        setPingingIds((prev) => {
          const next = new Set(prev);
          next.delete(store.id);
          return next;
        });
      }
    },
    [ping],
  );

  const nextSequence = useMemo(
    () => (scopedStores.length ? Math.max(...scopedStores.map((s) => s.sequence)) + 1 : 1),
    [scopedStores],
  );
  const defaultBrandId =
    brandCode === "ALL"
      ? (brands[0]?.id ?? "")
      : (brands.find((b) => b.code === brandCode)?.id ?? "");

  const openAdd = useCallback(() => {
    setFormError(null);
    setFormInitial(toFormValues(null, brands, defaultBrandId, nextSequence));
    setFormOpen(true);
  }, [brands, defaultBrandId, nextSequence]);

  const openEdit = useCallback(
    (store: StoreRow) => {
      setFormError(null);
      setFormInitial(toFormValues(store, brands, defaultBrandId, nextSequence));
      setFormOpen(true);
    },
    [brands, defaultBrandId, nextSequence],
  );

  const handleSave = useCallback(
    async (values: StoreFormValues) => {
      setFormSaving(true);
      setFormError(null);
      try {
        const data = await save({
          data: {
            id: values.id,
            brandId: values.brandId,
            sequence: Number(values.sequence),
            storeCode: values.storeCode,
            shopName: values.shopName,
            dbName: values.dbName,
            ipAddress: values.ipAddress,
            agentStatus: values.agentStatus,
          },
        });
        setSnapshot(data);
        setFormOpen(false);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Could not save this store");
      } finally {
        setFormSaving(false);
      }
    },
    [save],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setFormSaving(true);
      setFormError(null);
      try {
        const data = await remove({ data: { storeId: id } });
        setSnapshot(data);
        setSelectedId((prev) => (prev === id ? null : prev));
        setFormOpen(false);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Could not delete this store");
      } finally {
        setFormSaving(false);
      }
    },
    [remove],
  );



  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-5 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Store Network Monitoring</h1>
              <p className="text-[12px] text-faint">Eastgate Industries PVT Limited · IT Operations</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] tabular-nums text-faint">
                Last updated {formatClock(snapshot?.checkedAt ?? null)}
              </span>
              <button
                onClick={() => void refresh()}
                disabled={refreshing}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors ${
                  refreshing
                    ? "animate-pingsoft bg-panel/60 text-faint ring-border"
                    : "bg-primary text-primary-foreground ring-transparent hover:bg-primary/90"
                }`}
              >
                {refreshing ? "Refreshing…" : "Refresh Now"}
              </button>
            </div>
          </div>

          <nav className="mt-4 flex flex-wrap gap-1.5" aria-label="Brand filter">
            {[{ code: "ALL", name: "All Brands" }, ...brands].map((b) => {
              const active = brandCode === b.code;
              return (
                <button
                  key={b.code}
                  onClick={() => {
                    setBrandCode(b.code);
                    setFilters(EMPTY_FILTERS);
                  }}
                  aria-pressed={active}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-medium ring-1 transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground ring-transparent"
                      : "bg-panel/60 text-muted-foreground ring-border hover:bg-panel hover:text-foreground"
                  }`}
                >
                  {b.code === "ALL" ? (
                    "All Brands"
                  ) : (
                    <>
                      <span className="font-mono">{b.code}</span> {b.name}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="p-5">
          <SummaryCards totals={totals} scope={scopeLabel} />
          {brandCode === "ALL" ? (
            <BrandBreakdown brands={brands} stores={allStores} onSelect={setBrandCode} />
          ) : null}
          <StoreTable
            stores={visibleStores}
            scopeLabel={scopeLabel}
            filters={filters}
            onFilterChange={setFilters}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
            selectedId={selectedId}
            onSelect={(s) => setSelectedId(s.id)}
            pingingIds={pingingIds}
            results={results}
            onPing={handlePing}
            loading={loading}
            error={error}
          />
        </main>
      </div>

      <StoreDetailPanel
        store={selected}
        pinging={selected ? pingingIds.has(selected.id) : false}
        result={selected ? (results[selected.id] ?? null) : null}
        onPing={handlePing}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
