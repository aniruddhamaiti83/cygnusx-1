import { STAGE_ORCHESTRATION } from "@/lib/blueprint/orchestration";
import { StageFlow } from "@/components/StageFlow";
import { Callout, DocTable, H3, Lede, P, Section } from "../Primitives";
import { TableMatrix } from "../TableMatrix";

export function StageRecordsSection() {
  return (
    <Section id="stageflow" n="03" title="Process Flow & Table Updates">
      <Lede>
        Quote-to-Cash is eight sequential stages. Incomplete work loops inside the stage.
        A failed gate (consumer credit, commercial credit, OFAC, underwriter reject) closes
        the process. The matrix shows which canonical table each stage creates, updates,
        assigns, or gates.
      </Lede>
      <Callout>
        <strong>01 Intake —</strong> Customer, email verification + ApplicantAccount, Business,
        then Loan. <strong>02 Pre-application —</strong> consumer CreditPull, commercial
        CreditPull, OFAC. RM Elena Voss starts the file; credit and fraud join at 02.
      </Callout>
      <H3>What each stage writes</H3>
      <DocTable
        caption="Creates vs updates — the operational flow"
        headers={["Stage", "Creates", "Updates / assigns", "Gate"]}
        rows={STAGE_ORCHESTRATION.map((s) => [
          `${s.stage} ${s.name}`,
          s.creates.join(", "),
          s.updates.join(", "),
          s.gate,
        ])}
      />
      <H3>Table update matrix</H3>
      <P>
        Read across a table to see its lifecycle. Process is created at 01, gated at 02 and
        05, and sealed at 08. Loan is created at intake and refined through closure.
        CreditPull and SanctionsScreen exist only at Pre-application — they are not
        rewritten later.
      </P>
      <TableMatrix />
      <H3>Records created, assigned, updated</H3>
      <StageFlow embedded />
    </Section>
  );
}
