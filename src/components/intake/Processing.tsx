import { useState, type FormEvent } from "react";
import { digitsOnly, formatMoneyInput } from "@/lib/intake/model";
import { staffById } from "@/lib/intake/stages";
import { useOrigination } from "@/lib/intake/store";
import { Field, Select, TextInput } from "./fields";

export function Processing() {
  const business = useOrigination((s) => s.business);
  const kybReport = useOrigination((s) => s.kybReport);
  const sbaProfile = useOrigination((s) => s.sbaProfile);
  const runKyb = useOrigination((s) => s.runKyb);
  const saveSbaProfile = useOrigination((s) => s.saveSbaProfile);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const processor = staffById("pr-jordan");

  const [kybSource, setKybSource] = useState(kybReport?.source ?? "sos");
  const [kybBusy, setKybBusy] = useState(false);
  const [naicsCode, setNaicsCode] = useState(sbaProfile?.naicsCode ?? business?.naicsCode ?? "");
  const [employeeCount, setEmployeeCount] = useState(sbaProfile?.employeeCount ?? "");
  const [annualReceipts, setAnnualReceipts] = useState(sbaProfile?.annualReceipts ?? "");
  const [isFranchise, setIsFranchise] = useState(sbaProfile?.isFranchise ?? false);
  const [sizeStandardMet, setSizeStandardMet] = useState(sbaProfile?.sizeStandardMet ?? true);
  const [notes, setNotes] = useState(sbaProfile?.notes ?? "");
  const [saved, setSaved] = useState(Boolean(sbaProfile));
  const [error, setError] = useState("");
  const [advancing, setAdvancing] = useState(false);

  async function onKyb() {
    setError("");
    setKybBusy(true);
    try {
      await runKyb(kybSource);
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYB failed.");
    } finally {
      setKybBusy(false);
    }
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await saveSbaProfile({
        naicsCode: digitsOnly(naicsCode).slice(0, 6),
        employeeCount,
        annualReceipts,
        isFranchise,
        sizeStandardMet,
        notes,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save SBA profile.");
    }
  }

  const ready = Boolean(kybReport && sbaProfile && kybReport.status !== "fail");

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Processing — {processor.name}. KYB worker and SBA size/eligibility on the Business.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        <h2 className="text-lg mb-1">KYB</h2>
        <p className="text-sm text-ink-soft mb-4">
          {business?.legalName} · vendor-agnostic. Source lives on the report row.
        </p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <Field label="KYB source">
            <Select value={kybSource} onChange={(e) => setKybSource(e.target.value)} disabled={Boolean(kybReport)}>
              <option value="sos">Secretary of State</option>
              <option value="middesk">Middesk</option>
              <option value="lexis">LexisNexis</option>
              <option value="dnb">D&B identity</option>
            </Select>
          </Field>
        </div>
        {kybReport ? (
          <div className="rounded-md bg-good-wash text-good px-4 py-3 text-sm mb-4">
            <p className="font-medium mb-1">{kybReport.status === "clear" ? "Clear" : kybReport.status}</p>
            <p className="mb-0">{kybReport.summary}</p>
            <p className="mt-2 mb-0 text-xs opacity-80">
              {kybReport.actor} · {new Date(kybReport.ranAt).toLocaleString()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-faint mb-4">Not run.</p>
        )}
        <button
          type="button"
          disabled={kybBusy}
          onClick={onKyb}
          className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
        >
          {kybBusy ? "Running…" : kybReport ? "Show stored KYB" : "Run KYB"}
        </button>
      </article>

      <form onSubmit={saveProfile} className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div>
          <h2 className="text-lg mb-1">SBA profile</h2>
          <p className="text-sm text-ink-soft mb-0">Size standard, NAICS eligibility, franchise flag on the org.</p>
        </div>
        {saved ? (
          <p className="rounded-md bg-good-wash text-good px-4 py-3 text-sm mb-0">SBA profile saved.</p>
        ) : null}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="NAICS code">
            <TextInput
              inputMode="numeric"
              maxLength={6}
              value={naicsCode}
              onChange={(e) => setNaicsCode(digitsOnly(e.target.value).slice(0, 6))}
            />
          </Field>
          <Field label="Employees">
            <TextInput
              inputMode="numeric"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(digitsOnly(e.target.value))}
            />
          </Field>
          <Field label="Annual receipts">
            <TextInput
              inputMode="decimal"
              value={annualReceipts}
              onChange={(e) => setAnnualReceipts(formatMoneyInput(e.target.value))}
            />
          </Field>
          <Field label="Franchise">
            <Select value={isFranchise ? "yes" : "no"} onChange={(e) => setIsFranchise(e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </Field>
          <Field label="Meets size standard">
            <Select
              value={sizeStandardMet ? "yes" : "no"}
              onChange={(e) => setSizeStandardMet(e.target.value === "yes")}
            >
              <option value="yes">Yes</option>
              <option value="no">No — ineligible</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <TextInput value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <button type="submit" className="h-11 px-5 rounded-md bg-navy text-paper text-sm font-medium hover:bg-navy-2">
            Save SBA profile
          </button>
        </div>
      </form>

      {ready ? (
        <div className="rounded-lg bg-white border border-line p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-good mb-0">KYB and SBA profile on file. Open Collateral.</p>
          <button
            type="button"
            disabled={advancing}
            onClick={async () => {
              setAdvancing(true);
              try {
                await advanceStage();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not advance.");
              } finally {
                setAdvancing(false);
              }
            }}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium hover:bg-navy-2 disabled:opacity-40"
          >
            {advancing ? "Moving…" : "Move to Collateral"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
