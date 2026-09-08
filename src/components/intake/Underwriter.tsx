import { useState } from "react";
import { staffById } from "@/lib/intake/stages";
import { useOrigination } from "@/lib/intake/store";
import { Field, TextInput } from "./fields";
import { SwarmLog } from "./SwarmLog";

export function Underwriter() {
  const scorecard = useOrigination((s) => s.scorecard);
  const decision = useOrigination((s) => s.decision);
  const runStageAgents = useOrigination((s) => s.runStageAgents);
  const recordDecision = useOrigination((s) => s.recordDecision);
  const llm = useOrigination((s) => s.llm);
  const uw = staffById("uw-diana");
  const [rationale, setRationale] = useState(decision?.rationale ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function runPack() {
    setError("");
    setBusy(true);
    try {
      await runStageAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy pack failed.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(action: "approve" | "pend" | "reject") {
    setError("");
    setBusy(true);
    try {
      await recordDecision(action, rationale);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Underwriter — {uw.name}. Multi-agent stage: supervisor dispatches the credit policy pack
        and the evaluator. The scorecard recommends. The human of record decides.
        {llm ? ` Model: ${llm.label}.` : ""}
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg mb-1">Credit policy pack</h2>
            <p className="text-sm text-ink-soft mb-0">
              Advisory only. SBSS is not the gate. Workers never write a Decision row.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={runPack}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40 hover:bg-navy-2"
          >
            {busy ? "Running swarm…" : scorecard ? "Re-run policy pack" : "Run policy pack"}
          </button>
        </div>

        {scorecard ? (
          <div className="rounded-md border border-line bg-paper px-4 py-3">
            <p className="font-medium mb-1 capitalize">Recommend {scorecard.recommendedAction}</p>
            <p className="text-sm mb-2">{scorecard.narrative}</p>
            <ul className="text-sm mb-2 pl-4 list-disc">
              {scorecard.factors.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <p className="text-xs text-ink-faint mb-0 font-mono">
              confidence {scorecard.confidence.toFixed(2)} · {scorecard.provider || scorecard.modelName} · artefact{" "}
              {scorecard.artefactId.slice(0, 8)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-faint mb-0">Not run. Decision is locked until the pack writes a ScorecardResult.</p>
        )}
      </article>

      <article className="rounded-lg bg-white border border-line p-5 sm:p-6 grid gap-4">
        <h2 className="text-lg mb-0">Human decision</h2>
        <Field label="Rationale" hint="Required for the audit trail. The swarm cannot fill this.">
          <TextInput value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </Field>
        {decision ? (
          <p className="rounded-md bg-good-wash text-good px-4 py-3 text-sm mb-0">
            {decision.action.toUpperCase()} by {decision.decidedBy}
            {decision.rationale ? ` — ${decision.rationale}` : ""}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {(["approve", "pend", "reject"] as const).map((action) => (
            <button
              key={action}
              type="button"
              disabled={busy || !scorecard || Boolean(decision && decision.action === "approve")}
              onClick={() => decide(action)}
              className={`h-11 px-4 rounded-md text-sm font-medium disabled:opacity-40 ${
                action === "approve"
                  ? "bg-navy text-paper hover:bg-navy-2"
                  : "border border-line bg-white hover:border-accent"
              }`}
            >
              {action === "approve" ? "Approve" : action === "pend" ? "Pend" : "Reject"}
            </button>
          ))}
        </div>
      </article>

      <SwarmLog />
    </div>
  );
}
