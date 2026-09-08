import { useState, type FormEvent } from "react";
import { formatMoneyInput } from "@/lib/intake/model";
import { staffById } from "@/lib/intake/stages";
import { useOrigination } from "@/lib/intake/store";
import { Field, Select, TextInput } from "./fields";
import { SwarmLog } from "./SwarmLog";

const KINDS = [
  { id: "realEstate", label: "Real estate" },
  { id: "equipment", label: "Equipment" },
  { id: "accountsReceivable", label: "Accounts receivable" },
  { id: "vehicle", label: "Vehicle" },
  { id: "inventory", label: "Inventory" },
  { id: "other", label: "Other" },
];

export function Collateral() {
  const items = useOrigination((s) => s.collaterals);
  const pledges = useOrigination((s) => s.pledges);
  const insurance = useOrigination((s) => s.insurance);
  const addCollateral = useOrigination((s) => s.addCollateral);
  const runStageAgents = useOrigination((s) => s.runStageAgents);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const processor = staffById("pr-jordan");

  const [kind, setKind] = useState("realEstate");
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [carrier, setCarrier] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);

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
        value,
        pledge: true,
        carrier,
        policyNumber,
        coverageAmount: value,
      });
      setLabel("");
      setValue("");
      setCarrier("");
      setPolicyNumber("");
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
        Collateral — {processor.name}. Typed item, pledge to this Loan, insurance on pledged
        assets. The collateral worker reviews the package; it does not decide credit.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      <form onSubmit={onAdd} className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <h2 className="text-lg mb-0">Add item</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type" required>
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              {KINDS.map((k) => (
                <option key={k.id} value={k.id}>{k.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Description" required>
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field label="Stated value">
            <TextInput inputMode="decimal" value={value} onChange={(e) => setValue(formatMoneyInput(e.target.value))} />
          </Field>
          <Field label="Insurance carrier">
            <TextInput value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </Field>
          <Field label="Policy number">
            <TextInput value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="h-11 px-5 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2">
            {busy ? "Saving…" : "Add and pledge"}
          </button>
        </div>
      </form>

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        <h2 className="text-lg mb-3">Package</h2>
        {items.length === 0 ? (
          <p className="text-sm text-ink-faint mb-0">No items yet.</p>
        ) : (
          <ul className="grid gap-3 mb-0">
            {items.map((item) => {
              const pledged = pledges.some((p) => p.itemId === item.itemId);
              const pol = insurance.find((p) => p.itemId === item.itemId);
              return (
                <li key={item.itemId} className="rounded-md border border-line px-3 py-3">
                  <p className="font-medium mb-1">{item.label}</p>
                  <p className="text-sm text-ink-soft mb-0">
                    {KINDS.find((k) => k.id === item.kind)?.label ?? item.kind}
                    {item.value ? ` · $${item.value}` : ""}
                    {pledged ? " · pledged" : " · unpledged"}
                    {pol ? ` · ${pol.carrier || "insured"}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      {ready ? (
        <div className="rounded-lg bg-white border border-line p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm mb-0">Run the collateral worker, then send the file to Underwriter.</p>
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
              {busy ? "Running…" : reviewed ? "Worker ran" : "Run collateral worker"}
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
