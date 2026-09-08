import {
  ORCHESTRATION_RULES,
  ORCHESTRATION_SEQUENCE,
  STAGE_ORCHESTRATION,
  SWARM_AGENTS,
} from "@/lib/blueprint/orchestration";
import { Callout, DocTable, H3, Lede, List, Section } from "../Primitives";
import { SwarmDiagram } from "../SwarmDiagram";

export function OrchestrationSection() {
  return (
    <Section id="swarm" n="04" title="Agent Orchestration Model">
      <Lede>
        A supervisor reads <code className="font-mono text-[0.86em]">Process.currentStage</code> and
        dispatches only the workers allowed for that stage. An evaluator reconciles
        outputs into a package. The stage owner is the human gate. Workers write the
        canonical tables in Section 03 — they do not keep private copies.
      </Lede>
      <SwarmDiagram />
      <H3>Stage → agents → tables</H3>
      <DocTable
        caption="Who is dispatched, what they create, what they update"
        headers={["Stage", "Agents", "Creates", "Updates", "Human", "Gate"]}
        rows={STAGE_ORCHESTRATION.map((s) => [
          `${s.stage} ${s.name}`,
          s.agents.join(", "),
          s.creates.join(", "),
          s.updates.join(", "),
          s.human,
          s.gate,
        ])}
      />
      <H3>Why a swarm here</H3>
      <List
        items={[
          "Consumer CRA, commercial bureau, and OFAC are independent pulls that can run in parallel at stage 02.",
          "Each worker has a narrow allowlist — the CIP worker cannot call E-Tran; the funding worker cannot rewrite CIP.",
          "The evaluator is a second pass before anything reaches the desk. A single-agent design would skip that control.",
        ]}
      />
      <H3>Dispatch sequence</H3>
      <DocTable headers={["Step", "Actor", "Action"]} rows={ORCHESTRATION_SEQUENCE.map((s) => [s.step, s.actor, s.action])} />
      <H3>Agent catalog</H3>
      <DocTable headers={["Agent", "Kind", "Stage", "Writes", "Human seat"]} rows={SWARM_AGENTS.map((a) => [a.name, a.kind, a.stage, a.writes.join(", "), a.humanSeat])} />
      <H3>Tool allowlists</H3>
      <DocTable headers={["Agent", "Tools"]} rows={SWARM_AGENTS.filter((a) => a.kind !== "human").map((a) => [a.name, a.tools.join(", ")])} />
      <H3>Orchestration rules</H3>
      <List items={ORCHESTRATION_RULES} />
      <Callout>
        <strong>Fail-closed —</strong> consumer credit, commercial credit, and OFAC must
        pass to leave Pre-application. The swarm cannot infer a pass, invent a
        guarantyNumber, or post the ledger. Dual-control posting is human.
      </Callout>
    </Section>
  );
}
