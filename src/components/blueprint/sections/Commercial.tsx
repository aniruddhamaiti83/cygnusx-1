import { Callout, DocTable, Grid, Card, Lede, List, P, Section } from "../Primitives";

export function CommercialSections() {
  return (
    <>
      <Section id="green" n="15" title="Green AI / Sustainability">
        <Lede>
          Token and tool cost is a control, not an afterthought. Prefer retrieval over
          re-generation; cache bureau artefacts; do not re-pull FICO on agent retry.
        </Lede>
        <List
          items={[
            "Report kWh / process monthly (model + OCR + vector).",
            "Cap max worker fan-out per process.",
            "Archive cold embeddings rather than re-embed nightly.",
          ]}
        />
      </Section>

      <Section id="sla" n="16" title="SLA Matrix">
        <DocTable
          headers={["Service", "Target", "Remedy"]}
          rows={[
            ["Intake → Pre-App package", "4 business hours", "Service credit; human queue"],
            ["Spread confidence ≥ threshold", "95% of statements", "Manual spread, no silent accept"],
            ["OFAC / FICO broker", "Bank vendor SLA", "Fail closed — do not invent a pass"],
            ["E-Tran submit (human-auth)", "Same day if complete", "Ops runbook, not agent retry storm"],
            ["Audit spine durability", "RPO 15 min", "Incident if gap"],
          ]}
        />
      </Section>

      <Section id="lockin" n="17" title="Vendor Lock-in Mitigation">
        <P>
          Prompts, eval sets, and the canonical schema (Process, Customer, Business, Loan)
          are bank IP. Model and OCR vendors are interchangeable behind adapters. Lake
          events stay resource-oriented HTTP, not a vendor RPC.
        </P>
      </Section>

      <Section id="tco" n="18" title="Budget & TCO">
        <Grid cols={3}>
          <Card title="Build">Platform, adapters, workbenches, eval harness.</Card>
          <Card title="Run">Tokens, OCR, bureau, vector, observability, dual-control ops.</Card>
          <Card title="Control">MRM, TPRM, training, incident drills.</Card>
        </Grid>
        <Callout>
          Do not justify TCO on “hours saved” alone. Include fail-closed gates, dual-control
          posting, and human of record — those are the product.
        </Callout>
      </Section>

      <Section id="ocm" n="19" title="Organizational Change Management">
        <P>
          RM, processor, underwriter, closer, and funding ops keep their seats. The swarm
          changes preparation time, not authority. Job aids map each workbench to a stage
          in Section 03.
        </P>
      </Section>

      <Section id="training" n="20" title="User Training & Adoption">
        <DocTable
          headers={["Audience", "Focus"]}
          rows={[
            ["RM / intake", "Customer + email verify + account, Business, Loan keepers"],
            ["Credit / fraud", "Consumer CRA, commercial bureau, OFAC — fail-closed"],
            ["Processor", "KYB, SBA profile, spreads, collateral, exception queues"],
            ["Underwriter", "Package navigation, reason codes, Decision of record"],
            ["Closer / funding", "Imaging ACK, E-Tran authorization, dual-control post"],
          ]}
        />
      </Section>

      <Section id="prompts" n="21" title="Business-Level Prompt Catalog">
        <P>
          Named prompts per worker, versioned, evaluated. No free-form production prompt
          from an analyst. Catalog lives with the agent allowlist — a pricing worker cannot
          load the E-Tran prompt.
        </P>
      </Section>
    </>
  );
}
