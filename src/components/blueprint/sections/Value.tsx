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
            ["Qualifying check at stage 02", "Any one of consumer credit, business credit, or fraud — no inferred pass"],
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
            ["Account", "Customer. Person Account is the individual. Business Account is the company."],
            ["Deal", "The Process. One origination file. Master-detail child of Account. Holds many loans."],
            ["LOS Product", "The loan. Many per Deal. Amount, rate, term, purpose, and guaranty live here."],
            ["Related Party", "Borrower, co-borrower, guarantor, authorized signor, or owner on one loan."],
            ["Deal Team Member", "Bank seat on the file (RM, processor, underwriter, closer)."],
            ["Related Party Metric", "Credit or fraud snapshot for a party on a loan. One passing score qualifies Pre-application."],
            ["Metric", "Loan-level ratio: DSCR, global cash flow, size standard, LTV."],
            ["Asset", "Something an Account owns. Not itself a lien."],
            ["Collateral Pledged", "Lien of an Asset onto one loan."],
            ["Deal Approval", "Human credit action for one loan. One row per LOS Product."],
            ["Requirements", "Conditions and documents for one loan, a party, or a pledge."],
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
