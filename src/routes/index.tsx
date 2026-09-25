import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { supabase } from "@/integrations/supabase/client";
import {
  checkAllNow,
  deleteStore,
  generateAgentToken,
  getPingResult,
  getSnapshot,
  requestPing,
  saveStore,
} from "@/lib/monitoring.functions";
import type { CheckResult, Snapshot, StoreRow } from "@/lib/monitoring-types";


const AUTO_REFRESH_MS = 30_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) void navigate({ to: "/auth" });
      else setAuthed(true);
    });
    void supabase.auth.getSession().then(({ data: d }) => {
      if (!d.session) void navigate({ to: "/auth" });
      else setAuthed(true);
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);
  if (!authed) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-[13px] text-faint">Loading…</div>;
  }
  return <DashboardInner />;
}

function DashboardInner() {
  const fetchSnapshot = useServerFn(getSnapshot);
  const checkAll = useServerFn(checkAllNow);
  const ping = useServerFn(requestPing);
  const poll = useServerFn(getPingResult);
  const save = useServerFn(saveStore);
  const remove = useServerFn(deleteStore);
  const genToken = useServerFn(generateAgentToken);

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [brandCode, setBrandCode] = useState<string>("ALL");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pingingIds, setPingingIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, CheckResult>>({});
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

  // Refresh Now: queue checks for the LAN agent (if connected), then reload.
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      if (snapshotRef.current?.agent.connected && snapshotRef.current.access.canManage) {
        const res = await checkAll({ data: { brandId: null } });
        setNotice(res.ok ? null : res.message);
        await sleep(3000);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, [checkAll, load]);

  const snapshotRef = useRef<Snapshot | null>(null);
  snapshotRef.current = snapshot;

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const agentConnected = snapshot?.agent.connected ?? false;
  const canManage = snapshot?.access.canManage ?? false;
  const isAdmin = snapshot?.access.isAdmin ?? false;
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
        const req = await ping({ data: { storeId: store.id } });
        if (!req.ok) {
          setNotice(req.message);
          return;
        }
        for (let i = 0; i < 20; i++) {
          await sleep(1500);
          const r = await poll({ data: { requestId: req.requestId } });
          if (r.state === "done") {
            setResults((prev) => ({
              ...prev,
              [store.id]: { success: r.success, responseTime: r.responseTime, error: r.error },
            }));
            break;
          }
        }
        await load();
      } catch (e) {
        setNotice(e instanceof Error ? e.message : "Ping failed");
      } finally {
        setPingingIds((prev) => {
          const next = new Set(prev);
          next.delete(store.id);
          return next;
        });
      }
    },
    [ping, poll, load],
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
        const result = await save({
          data: {
            id: values.id,
            brandId: values.brandId,
            sequence: Number(values.sequence),
            storeCode: values.storeCode,
            storeName: values.storeName,
            dbName: values.dbName,
            localIp: values.localIp,
            monitoringEnabled: values.monitoringEnabled,
          },
        });
        if (!result.ok) {
          setFormError(result.error);
          return;
        }
        await load();
        setFormOpen(false);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Could not save this store");
      } finally {
        setFormSaving(false);
      }
    },
    [save, load],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setFormSaving(true);
      setFormError(null);
      try {
        const res = await remove({ data: { storeId: id } });
        if (!res.ok) {
          setFormError(res.error ?? "Could not delete this store");
          return;
        }
        await load();
        setSelectedId((prev) => (prev === id ? null : prev));
        setFormOpen(false);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Could not delete this store");
      } finally {
        setFormSaving(false);
      }
    },
    [remove, load],
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
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-medium ring-1 ${
                  agentConnected ? "bg-ok/10 text-ok ring-ok/40" : "bg-crit/10 text-crit ring-crit/40"
                }`}
              >
                {agentConnected ? `● Agent connected${snapshot?.agent.name ? ` · ${snapshot.agent.name}` : ""}` : "▲ Monitoring Service Not Connected"}
              </span>
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
              <button
                onClick={() => void supabase.auth.signOut()}
                className="rounded-lg px-2 py-1.5 text-[12px] text-faint hover:bg-panel hover:text-foreground"
                title={snapshot?.access.email ?? undefined}
              >
                Sign out
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
          {notice ? (
            <div role="status" className="mb-4 flex items-center justify-between rounded-lg bg-warn/10 px-3 py-2 text-[12px] text-warn">
              {notice}
              <button onClick={() => setNotice(null)} className="text-faint hover:text-foreground">✕</button>
            </div>
          ) : null}
          {snapshot && !agentConnected ? (
            <div className="panel-glass mb-5 rounded-xl p-4 text-[13px]">
              <div className="font-medium text-crit">Monitoring Service Not Connected</div>
              <p className="mt-1 text-[12px] text-faint">
                Online/offline status appears only once the office LAN monitoring program is running and
                reporting in. {snapshot.agent.configured ? "A key has been issued but the program hasn't checked in recently." : "No monitoring key has been issued yet."}
              </p>
              {isAdmin ? (
                <div className="mt-3 space-y-2">
                  <button
                    onClick={async () => {
                      try {
                        const r = await genToken();
                        setAgentToken(r.token);
                        await load();
                      } catch (e) {
                        setNotice(e instanceof Error ? e.message : "Could not create key");
                      }
                    }}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {snapshot.agent.configured ? "Issue new agent key" : "Create agent key"}
                  </button>
                  {agentToken ? (
                    <div className="rounded-md bg-panel/60 p-3 text-[12px] ring-1 ring-border">
                      <div className="text-faint">Copy this key now — it won't be shown again. On an office PC run:</div>
                      <code className="mt-1 block break-all font-mono text-[11px]">
                        DASHBOARD_URL={typeof window !== "undefined" ? window.location.origin : ""} AGENT_TOKEN={agentToken} node eastgate-agent.mjs
                      </code>
                      <a href="/agent/eastgate-agent.mjs" download className="mt-2 inline-block text-primary underline">
                        Download eastgate-agent.mjs
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
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
            agentConnected={agentConnected}
            canManage={canManage}
            onPing={handlePing}
            onEdit={openEdit}
            onAdd={openAdd}

            loading={loading}
            error={error}
          />
        </main>
      </div>

      <StoreDetailPanel
        store={selected}
        pinging={selected ? pingingIds.has(selected.id) : false}
        result={selected ? (results[selected.id] ?? null) : null}
        agentConnected={agentConnected}
        canManage={canManage}
        onPing={handlePing}
        onClose={() => setSelectedId(null)}
      />

      {formInitial ? (
        <StoreFormDialog
          open={formOpen}
          initial={formInitial}
          brands={brands}
          saving={formSaving}
          error={formError}
          onCancel={() => setFormOpen(false)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </div>

  );
}
