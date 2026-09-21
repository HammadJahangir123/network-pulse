import { useEffect, useState } from "react";

import type { AgentStatus, Brand, StoreRow } from "@/lib/monitoring-types";

export type StoreFormValues = {
  id: string | null;
  brandId: string;
  sequence: string;
  storeCode: string;
  shopName: string;
  dbName: string;
  ipAddress: string;
  agentStatus: AgentStatus;
};

function emptyValues(brandId: string, nextSequence: number): StoreFormValues {
  return {
    id: null,
    brandId,
    sequence: String(nextSequence),
    storeCode: "",
    shopName: "",
    dbName: "",
    ipAddress: "",
    agentStatus: "connected",
  };
}

export function toFormValues(
  store: StoreRow | null,
  brands: Brand[],
  defaultBrandId: string,
  nextSequence: number,
): StoreFormValues {
  if (!store) return emptyValues(defaultBrandId || (brands[0]?.id ?? ""), nextSequence);
  return {
    id: store.id,
    brandId: store.brandId,
    sequence: String(store.sequence),
    storeCode: store.storeCode,
    shopName: store.shopName,
    dbName: store.dbName,
    ipAddress: store.ipAddress,
    agentStatus: store.agentStatus,
  };
}

const field =
  "w-full rounded-md bg-panel/60 px-2.5 py-2 text-[13px] text-foreground outline-none ring-1 ring-border placeholder:text-faint focus:ring-2 focus:ring-ring";

export function StoreFormDialog({
  open,
  initial,
  brands,
  saving,
  error,
  onCancel,
  onSave,
  onDelete,
}: {
  open: boolean;
  initial: StoreFormValues;
  brands: Brand[];
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (values: StoreFormValues) => void;
  onDelete?: (id: string) => void;
}) {
  const [values, setValues] = useState<StoreFormValues>(initial);

  useEffect(() => {
    if (open) setValues(initial);
  }, [open, initial]);

  if (!open) return null;

  const set = (key: keyof StoreFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const isEdit = Boolean(values.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? "Edit store" : "Add store"}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
        className="panel-glass w-full max-w-xl rounded-xl p-5"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">
              {isEdit ? "Edit store" : "Add store"}
            </h2>
            <p className="text-[12px] text-faint">
              All fields are required. Online status comes from monitoring, not from this form.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-[12px] text-faint hover:bg-panel hover:text-foreground"
          >
            Close
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[12px] text-muted-foreground">
            Brand
            <select
              required
              value={values.brandId}
              onChange={(e) => set("brandId")(e.target.value)}
              className={`mt-1 ${field}`}
            >
              <option value="">Select brand…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[12px] text-muted-foreground">
            Sequence
            <input
              required
              inputMode="numeric"
              value={values.sequence}
              onChange={(e) => set("sequence")(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="1"
              className={`mt-1 font-mono ${field}`}
            />
          </label>

          <label className="text-[12px] text-muted-foreground">
            Store code
            <input
              required
              maxLength={40}
              value={values.storeCode}
              onChange={(e) => set("storeCode")(e.target.value)}
              placeholder="TE-001"
              className={`mt-1 font-mono ${field}`}
            />
          </label>

          <label className="text-[12px] text-muted-foreground">
            Shop name
            <input
              required
              maxLength={120}
              value={values.shopName}
              onChange={(e) => set("shopName")(e.target.value)}
              placeholder="Gulberg Flagship"
              className={`mt-1 ${field}`}
            />
          </label>

          <label className="text-[12px] text-muted-foreground">
            DB name
            <input
              required
              maxLength={120}
              value={values.dbName}
              onChange={(e) => set("dbName")(e.target.value)}
              placeholder="TE_GULBERG"
              className={`mt-1 font-mono ${field}`}
            />
          </label>

          <label className="text-[12px] text-muted-foreground">
            IP address
            <input
              required
              maxLength={45}
              value={values.ipAddress}
              onChange={(e) => set("ipAddress")(e.target.value)}
              placeholder="192.168.10.5"
              className={`mt-1 font-mono ${field}`}
            />
          </label>

          <label className="text-[12px] text-muted-foreground sm:col-span-2">
            Agent status
            <select
              value={values.agentStatus}
              onChange={(e) => set("agentStatus")(e.target.value)}
              className={`mt-1 ${field}`}
            >
              <option value="connected">Connected</option>
              <option value="disconnected">Disconnected</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
        </div>

        {error ? (
          <p role="alert" className="mt-3 text-[12px] text-crit">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={() => values.id && onDelete(values.id)}
                className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-crit ring-1 ring-crit/40 transition-colors hover:bg-crit/10"
              >
                Delete store
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-panel/60 px-3 py-1.5 text-[12px] font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-lg px-4 py-1.5 text-[12px] font-medium transition-colors ${
                saving
                  ? "animate-pingsoft bg-panel/60 text-faint ring-1 ring-border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
