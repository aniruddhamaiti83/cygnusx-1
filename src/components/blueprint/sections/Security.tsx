import { Callout, DocTable, Lede, List, P, Section } from "../Primitives";

export function SecuritySections() {
  return (
    <>
      <Section id="network" n="07" title="Zero-Trust Network Topology">
        <Lede>
          No component is trusted by location. Every call is authenticated, authorized, and logged.
        </Lede>
        <DocTable
          headers={["Zone", "Contains", "Boundary"]}
          rows={[
            ["DMZ / edge", "API gateway, WAF, SSO/MFA", "Public ingress only"],
            ["Agent VPC", "Supervisor, workers, policy gateway, secrets", "mTLS, short-lived tokens"],
            ["Model VPC", "Private LLM endpoint, vector store", "PrivateLink — no public LLM egress"],
            ["Core banking", "Ledger, DMS, warehouse", "Brokered, never standing agent creds"],
          ]}
        />
        <List
          items={[
            "Per-agent service identity and least-privilege tool allowlist.",
            "Egress allowlist on the agent VPC — blocks exfiltration via prompt injection.",
            "VPC flow logs plus application audit retained per records policy.",
          ]}
        />
      </Section>

      <Section id="tprm" n="08" title="Third-Party / LLM Vendor Risk">
        <Lede>
          Foundation-model and platform vendors sit in the bank TPRM programme with AI-specific diligence.
        </Lede>
        <DocTable
          headers={["Control", "Requirement"]}
          rows={[
            ["Data use", "No training on bank prompts or credit files. Contractual and technical."],
            ["Residency", "Processing region named. Subprocessors listed."],
            ["Exit", "Weights/prompts/indexes exportable. 90-day cutover runbook."],
            ["SOC / ISO", "Current report on file before production traffic."],
          ]}
        />
      </Section>

      <Section id="dr" n="09" title="DR & Business Continuity">
        <Lede>Origination can degrade to human-only; the ledger cannot.</Lede>
        <DocTable
          headers={["Capability", "RTO", "RPO"]}
          rows={[
            ["Agent platform", "4 hours", "15 minutes (audit spine)"],
            ["RAG / vector", "8 hours (rebuild from DMS)", "Last successful index"],
            ["Core ledger / E-Tran", "Bank existing RTO", "Bank existing RPO"],
            ["Human fallback", "Immediate", "n/a — workbenches stay up"],
          ]}
        />
        <Callout>
          If the swarm is down, processors underwrite on the workbench. Funding and dual-control
          posting do not wait on an agent.
        </Callout>
      </Section>

      <Section id="cyber" n="10" title="Cyber Incident Response — Agent Breach">
        <Lede>Treat a compromised worker as a privileged service account, not a chatbot.</Lede>
        <List
          items={[
            "Kill switch: disable supervisor dispatch; freeze outbound tool calls.",
            "Rotate the worker’s identity and revoke in-flight tokens.",
            "Replay the audit spine for that processId; quarantine embeddings written after the event.",
            "Notify per bank CSIRT. Credit files touched are in-scope for the incident.",
          ]}
        />
      </Section>

      <Section id="hallucination" n="11" title="Hallucination or Model Degradation">
        <Lede>A wrong spread or invented guaranty number is an operational incident.</Lede>
        <List
          items={[
            "Evaluator rejects ungrounded claims (no artefact id).",
            <><code className="font-mono text-[0.86em]">guarantyNumber</code> is written only from E-Tran — never inferred.</>,
            "Drift monitors on extraction confidence and scorecard override rate.",
            "Rollback to last signed prompt/model pair; human queue absorbs volume.",
          ]}
        />
      </Section>

      <Section id="eol" n="12" title="Model Decommissioning">
        <P>
          Retire a model only after a dual-run against the successor, MRM sign-off, and archive of
          prompts, eval sets, and audit hashes. Indexes tagged to the old embedder are rebuilt, not mixed.
        </P>
      </Section>

      <Section id="rtbf" n="13" title="Right to be Forgotten">
        <Lede>
          Erasure walks Customer → ApplicantAccount → Address → pulls → embeddings tagged with that
          partyId. Sealed process rows remain as required audit if the bank must retain the file.
        </Lede>
        <P>
          Raw SSN is never in prompts, lake feeds, or indexes — only taxIdToken and last four. Lake
          copies are in the cascade.
        </P>
      </Section>

      <Section id="crossborder" n="14" title="Cross-Border Data Transfer">
        <P>
          Credit files and CIP stay in the named residency region. Offshore L2 support sees tokenized
          workbenches only, under existing vendor contracts. No bulk extract of origination files to a
          non-approved region.
        </P>
      </Section>
    </>
  );
}
