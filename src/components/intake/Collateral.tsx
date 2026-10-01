import { useMemo, useState, type FormEvent } from "react";
import { formatMoneyInput } from "@/lib/intake/model";
import { staffById } from "@/lib/intake/stages";
import { useOrigination } from "@/lib/intake/store";
import { Field, Select, TextInput } from "./fields";
import { SwarmLog } from "./SwarmLog";

const KINDS = [
  { id: "property", label: "Property", advance: 0.85 },
  { id: "land", label: "Land", advance: 0.75 },
  { id: "machine", label: "Machine", advance: 0.8 },
  { id: "lease", label: "Lease", advance: 0.6 },
  { id: "realEstate", label: "Real estate", advance: 0.85 },
  { id: "equipment", label: "Equipment", advance: 0.8 },
  { id: "accountsReceivable", label: "Accounts receivable", advance: 0.5 },
  { id: "vehicle", label: "Vehicle", advance: 0.8 },
  { id: "inventory", label: "Inventory", advance: 0.5 },
  { id: "other", label: "Other", advance: 0.7 },
] as const;

function moneyNum(raw?: string) {
  if (!raw) return 0;
  const n = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function usd(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function Collateral() {
  const items = useOrigination((s) => s.collaterals);
  const pledges = useOrigination((s) => s.pledges);
  const insurance = useOrigination((s) => s.insurance);
  const loan = useOrigination((s) => s.loan);
  const addCollateral = useOrigination((s) => s.addCollateral);
  const runStageAgents = useOrigination((s) => s.runStageAgents);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const processor = staffById("pr-jordan");

  const [kind, setKind] = useState("property");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [location, setLocation] = useState("");
  const [lienPosition, setLienPosition] = useState("1");
  const [description, setDescription] = useState("");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  const kindMeta = KINDS.find((k) => k.id === kind) ?? KINDS[0];
  const stated = moneyNum(value);
  const lendable = stated * kindMeta.advance;

  const totals = useMemo(() => {
    const pledged = pledges.reduce((sum, p) => {
      const item = items.find((i) => i.itemId === p.itemId);
      return sum + moneyNum(p.pledgedValue || item?.value);
    }, 0);
    const lendableSum = items.reduce((sum, i) => {
      const adv = KINDS.find((k) => k.id === i.kind)?.advance ?? 0.7;
      return sum + moneyNum(i.value) * adv;
    }, 0);
    const loanAmt = moneyNum(loan?.loanAmount);
    const insured = items.filter((i) => insurance.some((p) => p.itemId === i.itemId && p.carrier)).length;
    return {
      pledged,
      lendable: lendableSum,
      loanAmt,
      coverage: loanAmt ? pledged / loanAmt : 0,
      insured,
      uninsured: items.length - insured,
    };
  }, [items, pledges, insurance, loan]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!label.trim()) {
      setError("Describe the collateral.");
      return;
    }
    setBusy(true);
    try {
      await addCollateral({
        kind,
        label: label.trim(),
        description: description.trim(),
        value,
        location: location.trim(),
        pledge: true,
        lienPosition: Number(lienPosition) || 1,
        carrier,
        policyNumber,
        coverageAmount: value,
        expiresOn,
      });
      setLabel("");
      setValue("");
      setLocation("");
      setDescription("");
      setCarrier("");
      setPolicyNumber("");
      setExpiresOn("");
      setLienPosition("1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add collateral.");
    } finally {
      setBusy(false);
    }
  }

  const ready = items.length > 0 && pledges.length > 0;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Collateral — {processor.name}. Typed item, lien position, location, pledge, and insurance.
        Mock UCC-1 / lien search on the worker. Coverage is advisory — Underwriting decides.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      {items.length > 0 ? (
        <div className="grid sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-white border border-line px-4 py-3">
            <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">Facility</p>
            <p className="text-lg font-medium mb-0">{totals.loanAmt ? usd(totals.loanAmt) : "—"}</p>
          </div>
          <div className="rounded-lg bg-white border border-line px-4 py-3">
            <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">Pledged</p>
            <p className="text-lg font-medium mb-0">{usd(totals.pledged)}</p>
          </div>
          <div className="rounded-lg bg-white border border-line px-4 py-3">
            <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">Coverage</p>
            <p className={`text-lg font-medium mb-0 ${totals.coverage >= 1 ? "text-good" : "text-ink"}`}>
              {totals.loanAmt ? `${Math.round(totals.coverage * 100)}%` : "—"}
            </p>
          </div>
          <div className="rounded-lg bg-white border border-line px-4 py-3">
            <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">Lendable (haircut)</p>
            <p className="text-lg font-medium mb-0">{usd(totals.lendable)}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={onAdd} className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div>
          <h2 className="text-lg mb-1">Add pledged item</h2>
          <p className="text-sm text-ink-soft mb-0">
            Advance rate for {kindMeta.label}: {Math.round(kindMeta.advance * 100)}%
            {stated ? ` · lendable ${usd(lendable)}` : ""}.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type" required>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description" required>
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 12 Main St warehouse" />
          </Field>
          <Field label="Stated value">
            <TextInput inputMode="decimal" value={value} onChange={(e) => setValue(formatMoneyInput(e.target.value))} />
          </Field>
          <Field label="Lien position">
            <Select value={lienPosition} onChange={(e) => setLienPosition(e.target.value)}>
              <option value="1">1st</option>
              <option value="2">2nd</option>
              <option value="3">3rd</option>
            </Select>
          </Field>
          <Field label="Location / VIN / serial">
            <TextInput value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Address, VIN, or serial" />
          </Field>
          <Field label="Notes">
            <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Insurance carrier">
            <TextInput value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </Field>
          <Field label="Policy number">
            <TextInput value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          </Field>
          <Field label="Policy expires">
            <TextInput type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="h-11 px-5 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
          >
            {busy ? "Saving…" : "Add and pledge"}
          </button>
        </div>
      </form>

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        <h2 className="text-lg mb-3">Package</h2>
        {items.length === 0 ? (
          <p className="text-sm text-ink-faint mb-0">No items yet. Add at least one pledged asset to leave this stage.</p>
        ) : (
          <ul className="grid gap-3 mb-0">
            {items.map((item) => {
              const pledged = pledges.find((p) => p.itemId === item.itemId);
              const pol = insurance.find((p) => p.itemId === item.itemId);
              const meta = KINDS.find((k) => k.id === item.kind);
              const v = moneyNum(item.value);
              return (
                <li key={item.itemId} className="rounded-md border border-line px-3 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium mb-0">{item.label}</p>
                    <p className="text-sm mb-0 font-medium tabular-nums">{v ? usd(v) : "—"}</p>
                  </div>
                  <p className="text-sm text-ink-soft mb-0 mt-1">
                    {meta?.label ?? item.kind}
                    {pledged ? ` · ${pledged.lienPosition === 1 ? "1st" : pledged.lienPosition === 2 ? "2nd" : `${pledged.lienPosition}th`} lien` : " · unpledged"}
                    {item.location ? ` · ${item.location}` : ""}
                    {meta ? ` · ${Math.round(meta.advance * 100)}% advance` : ""}
                  </p>
                  {pol ? (
                    <p className="text-xs text-ink-faint mb-0 mt-1">
                      {pol.carrier || "Insured"}
                      {pol.policyNumber ? ` · ${pol.policyNumber}` : ""}
                      {pol.expiresOn ? ` · exp ${pol.expiresOn}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-faint mb-0 mt-1">No insurance on file — worker will flag.</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </article>

      {ready ? (
        <div className="rounded-lg bg-white border border-line p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm mb-0">
            {totals.uninsured > 0
              ? `${totals.uninsured} item(s) without insurance. Run the worker (mock UCC), then send to Underwriter.`
              : "Package pledged. Run the collateral worker (mock UCC), then send to Underwriter."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await runStageAgents();
                  setReviewed(true);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Worker failed.");
                } finally {
                  setBusy(false);
                }
              }}
              className="h-11 px-4 rounded-md border border-line bg-white text-sm font-medium hover:border-accent disabled:opacity-40"
            >
              {busy ? "Running…" : reviewed ? "Worker ran" : "Run lien search / review"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await advanceStage();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not advance.");
                } finally {
                  setBusy(false);
                }
              }}
              className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium hover:bg-navy-2 disabled:opacity-40"
            >
              Move to Underwriter
            </button>
          </div>
        </div>
      ) : null}

      <SwarmLog />
    </div>
  );
}
