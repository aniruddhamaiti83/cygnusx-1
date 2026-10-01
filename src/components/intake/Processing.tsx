import { useState } from "react";
import { staffById } from "@/lib/intake/stages";
import { useOrigination, type ProcessingCheck } from "@/lib/intake/store";
import { Field, Select } from "./fields";

function money(n?: number) {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function checkTone(status: string) {
  if (status === "fail") return "bg-bad-wash text-bad";
  if (status === "review") return "bg-paper border border-line text-ink";
  return "bg-good-wash text-good";
}

function CheckRow({ check }: { check: ProcessingCheck }) {
  return (
    <li className={`rounded-md px-4 py-3 text-sm ${checkTone(check.status)}`}>
      <p className="font-medium mb-1">
        {check.vendor} · {check.status}
      </p>
      <p className="mb-0">{check.detail}</p>
    </li>
  );
}

export function Processing() {
  const customer = useOrigination((s) => s.customer);
  const business = useOrigination((s) => s.business);
  const kybReport = useOrigination((s) => s.kybReport);
  const sbaProfile = useOrigination((s) => s.sbaProfile);
  const runProcessingPack = useOrigination((s) => s.runProcessingPack);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const processor = staffById("pr-jordan");

  const [source, setSource] = useState(sbaProfile?.mockReport?.source ?? kybReport?.source ?? "sos");
  const [busy, setBusy] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState("");

  const report = sbaProfile?.mockReport;
  const ready = Boolean(kybReport && sbaProfile && kybReport.status !== "fail" && sbaProfile.sizeStandardMet !== false);

  async function runPack() {
    setError("");
    setBusy(true);
    try {
      await runProcessingPack(source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing pack failed.");
    } finally {
      setBusy(false);
    }
  }

  const name = customer ? `${customer.firstName} ${customer.lastName}` : "Customer";

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Processing — {processor.name}. Mock vendor calls (SOS / KYB, SBA size standard, SAM.gov,
        franchise directory, affiliation). The report is stored on the SBA profile until live APIs
        are wired. Underwriting RAG / MCP is a later stage.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div>
          <h2 className="text-lg mb-1">Processing pack</h2>
          <p className="text-sm text-ink-soft mb-0">
            {name} · {business?.legalName ?? "Business"} · mocked APIs, one artefact on SbaProfile.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="KYB source (mock vendor)">
            <Select value={source} onChange={(e) => setSource(e.target.value)} disabled={Boolean(report)}>
              <option value="sos">Secretary of State</option>
              <option value="middesk">Middesk</option>
              <option value="lexis">LexisNexis</option>
              <option value="dnb">D&B identity</option>
            </Select>
          </Field>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={runPack}
          className="justify-self-start h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
        >
          {busy ? "Calling mock APIs…" : report ? "Re-run processing pack" : "Run processing pack"}
        </button>
      </article>

      {report ? (
        <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg mb-1">Customer / eligibility report</h2>
              <p className="text-sm text-ink-soft mb-0">
                Saved on SBA profile · {sbaProfile?.provider ?? "mock"} · {sbaProfile?.actor}
                {sbaProfile?.ranAt ? ` · ${new Date(sbaProfile.ranAt).toLocaleString()}` : ""}
              </p>
            </div>
            <span
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                sbaProfile?.eligibilityStatus === "eligible" ? "bg-good-wash text-good" : "bg-bad-wash text-bad"
              }`}
            >
              {sbaProfile?.eligibilityStatus === "eligible" ? "Eligible" : sbaProfile?.eligibilityStatus || "Review"}
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-line px-3 py-3">
              <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">NAICS / size</p>
              <p className="mb-0 font-medium">
                {sbaProfile?.naicsCode || "—"} · {sbaProfile?.sizeStandard || "standard on file"}
              </p>
            </div>
            <div className="rounded-md border border-line px-3 py-3">
              <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">Employees / receipts</p>
              <p className="mb-0 font-medium">
                {sbaProfile?.employeeCount || "—"} · {money(report.inputs?.annualReceipts)}
              </p>
            </div>
            <div className="rounded-md border border-line px-3 py-3">
              <p className="font-mono text-[0.65rem] tracking-[0.12em] uppercase text-ink-faint mb-1">SAM / franchise</p>
              <p className="mb-0 font-medium">
                SAM {sbaProfile?.samStatus || "—"} · {sbaProfile?.isFranchise ? "franchise" : "not a franchise"}
              </p>
            </div>
          </div>
          <ul className="grid gap-2 mb-0">
            {(report.checks ?? []).map((c) => (
              <CheckRow key={c.api} check={c} />
            ))}
          </ul>
          {kybReport ? (
            <p className="text-xs text-ink-faint mb-0">
              KYB artefact {kybReport.artefactId?.slice(0, 12)}… · {kybReport.status}
              {sbaProfile?.artefactId ? ` · SBA artefact ${sbaProfile.artefactId.slice(0, 12)}…` : ""}
            </p>
          ) : null}
        </article>
      ) : (
        <p className="text-sm text-ink-faint rounded-md border border-line bg-white px-4 py-3 mb-0">
          Not run. The mock pack writes KybReport and SbaProfile together so the file can move to
          Collateral.
        </p>
      )}

      {ready ? (
        <div className="rounded-lg bg-white border border-line p-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-good mb-0">Mock processing report on the SBA profile. Open Collateral.</p>
          <button
            type="button"
            disabled={advancing}
            onClick={async () => {
              setAdvancing(true);
              setError("");
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
