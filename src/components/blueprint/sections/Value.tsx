import { DocTable, Lede, P, Section } from "../Primitives";

export function ValueSections() {
  return (
    <>
      <Section id="kpi" n="22" title="Post-Deployment KPIs">
        <DocTable
          headers={["KPI", "Intent"]}
          rows={[
            ["Cycle time 01→08", "Compress preparation, not skip gates"],
            ["Email-verified files at Business", "No Business row without ApplicantAccount"],
            ["Consumer + commercial pull coverage", "100% of files that leave stage 02"],
            ["OFAC fail-closed rate", "Must be 100% — no inferred pass"],
            ["Spread override rate", "High = extraction problem, not hero processors"],
            ["Human Decision time", "Package quality"],
            ["E-Tran accept on first submit", "Data completeness"],
            ["Sealed files with dual-control", "100% of funded"],
          ]}
        />
      </Section>

      <Section id="roi" n="23" title="ROI & Value Realization">
        <Lede>
          Value is shorter cycle time and cleaner files, with the same (or tighter) credit
          and BSA posture. Do not count hours the underwriter still owes as “automated.”
        </Lede>
        <P>
          Track benefits against a pre-swarm baseline per product (7(a) vs Express vs 504)
          after a monitored parallel-run, not at go-live day one.
        </P>
      </Section>

      <Section id="glossary" n="24" title="Glossary">
        <DocTable
          headers={["Term", "Meaning"]}
          rows={[
            ["CygnusX-1", "This SBA origination programme."],
            ["Process", "Parent of one origination file (processId). Stage machine 01–08."],
            ["Customer", "Golden person. CIP, email, phone live here. Roles are not this record."],
            ["ApplicantAccount", "Borrower portal login bound to Customer.email. Required before Business."],
            ["Business", "Operating company. May be the primary borrower."],
            ["Loan", "Facility keepers on the process — 1:1. Not the parent."],
            ["ProcessParticipant", "Customer or Business hung on a process with roles[] (set)."],
            ["ProcessTeam", "Bank seats on the file (RM, credit, fraud, processor, UW, closer)."],
            ["CreditPull", "Consumer (FCRA) or commercial bureau artefact. No re-pull on retry."],
            ["Supervisor", "Orchestrator that dispatches stage workers. Does not write credit terms."],
            ["Evaluator", "Critic that checks grounding and confidence before the human package."],
            ["Stage gate", "Predicate to leave a stage. Incomplete work loops; fail can reject."],
            ["Human of record", "Underwriter whose Decision is the credit action."],
            ["AuditEvent", "Immutable spine row for every agent message and tool call."],
          ]}
        />
      </Section>
    </>
  );
}
