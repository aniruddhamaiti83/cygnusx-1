import { Callout, Card, DocTable, Grid, Lede, List, P, Section } from "../Primitives";

export function OverviewSection() {
  return (
    <Section id="overview" n="01" title="Project Overview">
      <Lede>
        <strong>CygnusX-1</strong> automates SBA Quote-to-Cash — CIP intake through
        spreading, collateral, underwriting, documentation, E-Tran, and closure —
        with a supervisor-coordinated swarm. A human underwriter of record approves
        every credit decision. The swarm compresses preparation, not the decision.
      </Lede>
      <Grid cols={3}>
        <Card title="Scope in">
          7(a), Express, and 504 origination. Customer login, Business capture, consumer
          and commercial credit, OFAC, spreading, collateral, credit memo, E-Tran,
          dual-control ledger post.
        </Card>
        <Card title="Scope out (phase 1)">
          Servicing after seal, fully autonomous approval, syndications, and any product
          outside SBA 7(a)/504.
        </Card>
        <Card title="Autonomy">
          Launches at L2 (agent prepares, human approves). L3 only for named low-risk
          sub-tasks after MRM sign-off.
        </Card>
      </Grid>
      <Callout>
        <strong>Accountability —</strong> the swarm is never the credit decision-maker.
        Every output is a recommendation with evidence. The underwriter’s approval is
        the action of record.
      </Callout>
    </Section>
  );
}

export function PipelineSections() {
  return (
    <>
      <Section id="data" n="05" title="Unstructured Data Cleansing & RAG">
        <Lede>
          Inputs are PDFs, tax returns, appraisals, and scans. Retrieval quality is bounded
          by cleansing before index.
        </Lede>
        <List
          items={[
            <><strong>Classify</strong> — tax return, statement, appraisal, insurance. Unreadable files quarantine.</>,
            <><strong>OCR</strong> — layout-aware tables; per-field confidence. Low confidence is flagged, not accepted.</>,
            <><strong>Normalize</strong> — common chart of accounts; reconcile units and conflicting figures.</>,
            <><strong>Chunk</strong> — by logical section, not character count. Metadata: processId, partyId, date, source.</>,
            <><strong>Index</strong> — entitlement tags from the source system. Re-index on amendment; versions retained.</>,
          ]}
        />
        <Callout>
          <strong>Quality gate —</strong> nothing enters the RAG index below the extraction
          confidence threshold. Garbage grounding produces confidently wrong credit output.
        </Callout>
      </Section>

      <Section id="mdm" n="06" title="Data Quality & Master Data Management">
        <Lede>
          Process is the parent of the origination file. Customer is the golden person.
          ApplicantAccount is the portal login bound to that email. Business is the golden
          org. Loan is facility terms on that process — 1:1, not the parent.
        </Lede>
        <DocTable
          headers={["Domain", "Golden record", "Control"]}
          rows={[
            ["Customer (person)", "Customer.customerId, taxIdToken, email", "Merge on tax token. CIP plus email/phone required to open the file."],
            ["Applicant login", "ApplicantAccount.authUserId", "Email confirmed, then password account. Business locked until emailVerified."],
            ["Business (org)", "Business.businessId, EIN token", "SOS / KYB; sole prop is a person with optional org overlay."],
            ["Process / file", "Process.processId", "Stage machine 01–08. Never a chat session key."],
            ["Loan (facility)", "Loan.loanId → processId", "Keepers only: amount, rate, lookups, guaranty, dates."],
            ["Credit artefacts", "CreditPull.artefactId", "One or both bureaus. Snapshot: type, score, last checked, years on file, outstanding. No re-pull on retry."],
            ["Spreads", "SpreadPeriod", "Confidence-scored; override logged."],
            ["Collateral", "CollateralItem + Pledge", "Typed items pledged to this loan."],
          ]}
        />
        <P>
          The swarm surfaces discrepancies between sources. It does not silently pick a winner.
        </P>
      </Section>
    </>
  );
}
