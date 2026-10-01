import { useState } from "react";
import { staffById } from "@/lib/intake/stages";
import { useOrigination } from "@/lib/intake/store";
import { Field, TextInput } from "./fields";
import { SwarmLog } from "./SwarmLog";

function pct(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

export function Underwriter() {
  const scorecard = useOrigination((s) => s.scorecard);
  const decision = useOrigination((s) => s.decision);
  const runStageAgents = useOrigination((s) => s.runStageAgents);
  const recordDecision = useOrigination((s) => s.recordDecision);
  const llm = useOrigination((s) => s.llm);
  const uw = staffById("uw-diana");
  const [reason, setReason] = useState(decision?.action === "reject" ? decision.rationale : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const releasable = Boolean(scorecard?.releasable);
  const decided = decision?.action === "approve" || decision?.action === "reject";

  async function runPack() {
    setError("");
    setBusy(true);
    try {
      await runStageAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Credit decision failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(action: "approve" | "reject") {
    setError("");
    if (action === "reject" && !reason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setBusy(true);
    try {
      await recordDecision(action, reason.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Credit decision — {uw.name}. Three agents read the credit scores, the collateral
        pledges, and the account statements. The proposal is releasable only at 97%
        confidence and under 3% hallucination. You approve, or reject with a reason.
        An approval lets the loan move on to Funding.
        {llm ? ` Model: ${llm.label}.` : ""}
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg mb-1">Credit decision</h2>
            <p className="text-sm text-ink-soft mb-0">
              Credit, Collateral, and Statements. They only cite what earlier stages stored.
            </p>
          </div>
          <button
            type="button"
            disabled={busy || decided}
            onClick={runPack}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
          >
            {busy ? "Running agents…" : scorecard ? "Re-run credit decision" : "Run credit decision"}
          </button>
        </div>

        {scorecard ? (
          <div className="grid gap-3">
            <div className="grid sm:grid-cols-3 gap-2">
              {(scorecard.agents ?? []).map((agent) => (
                <div key={agent.id} className="rounded-md border border-line bg-paper px-3 py-3">
                  <p className="text-xs font-mono uppercase tracking-wide text-accent mb-1">{agent.name}</p>
                  <p className="text-sm mb-0">{agent.summary}</p>
                </div>
              ))}
            </div>
            <div className="rounded-md border border-line px-4 py-3">
              <p className="font-medium mb-1">
                {releasable ? "Releasable proposal" : "Held — not releasable"}
                {scorecard.recommendedAction === "approve" || scorecard.recommendedAction === "reject"
                  ? ` · recommend ${scorecard.recommendedAction}`
                  : ""}
              </p>
              <p className="text-sm mb-2">{scorecard.narrative}</p>
              <p className="text-xs text-ink-faint mb-0 font-mono">
                confidence {pct(scorecard.confidence)} (need 97%) · hallucination {pct(scorecard.hallucination)} (max 3%)
                {scorecard.langsmith ? " · LangSmith" : " · local trace"}
                {scorecard.traceId ? ` · ${scorecard.traceId.slice(0, 8)}` : ""}
              </p>
            </div>
            {(scorecard.gaps ?? []).length > 0 ? (
              <ul className="text-sm text-bad mb-0 pl-4 list-disc">
                {scorecard.gaps!.map((gap) => (
                  <li key={gap}>{gap}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-faint mb-0">Not run. Approve stays locked until the three agents write a releasable proposal.</p>
        )}
      </article>

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <h2 className="text-lg mb-0">Underwriter decision</h2>
        <Field label="Rejection reason" hint="Required to reject. Leave blank only if you approve.">
          <TextInput value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        {decision ? (
          <p className={`rounded-md px-4 py-3 text-sm mb-0 ${decision.action === "approve" ? "bg-good-wash text-good" : "bg-bad/10 text-bad"}`}>
            {decision.action === "approve"
              ? `Approved by ${decision.decidedBy}. The loan can move to Funding.`
              : `Rejected by ${decision.decidedBy}${decision.rationale ? ` — ${decision.rationale}` : ""}`}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !releasable || decision?.action === "approve"}
            onClick={() => decide("approve")}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy || !scorecard || decision?.action === "approve"}
            onClick={() => decide("reject")}
            className="h-11 px-4 rounded-md border border-line bg-white text-sm font-medium disabled:opacity-40 hover:border-accent"
          >
            Reject
          </button>
        </div>
      </article>

      <SwarmLog />
    </div>
  );
}
