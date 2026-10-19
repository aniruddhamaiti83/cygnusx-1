export type TocItem = { id: string; n: string; label: string };
export type TocGroup = { title: string; items: TocItem[] };

export const TOC: TocGroup[] = [
  {
    title: "Programme",
    items: [
      { id: "overview", n: "01", label: "Project Overview" },
      { id: "oem", n: "02", label: "Data Model (Schema)" },
      { id: "stageflow", n: "03", label: "Process Flow & Records" },
      { id: "swarm", n: "04", label: "Agent Orchestration" },
      { id: "api", n: "API", label: "Origination API" },
    ],
  },
  {
    title: "Data & quality",
    items: [
      { id: "data", n: "05", label: "Unstructured Data & RAG" },
      { id: "mdm", n: "06", label: "Master Data Management" },
    ],
  },
  {
    title: "Control",
    items: [
      { id: "network", n: "07", label: "Zero-Trust Network" },
      { id: "tprm", n: "08", label: "Third-Party / LLM Risk" },
      { id: "dr", n: "09", label: "DR & Continuity" },
      { id: "cyber", n: "10", label: "Cyber Incident Response" },
      { id: "hallucination", n: "11", label: "Hallucination / Drift" },
      { id: "eol", n: "12", label: "Model Decommissioning" },
      { id: "rtbf", n: "13", label: "Right to be Forgotten" },
      { id: "crossborder", n: "14", label: "Cross-Border Transfer" },
    ],
  },
  {
    title: "Commercial",
    items: [
      { id: "green", n: "15", label: "Green AI" },
      { id: "sla", n: "16", label: "SLA Matrix" },
      { id: "lockin", n: "17", label: "Vendor Lock-in" },
      { id: "tco", n: "18", label: "Budget & TCO" },
      { id: "ocm", n: "19", label: "Change Management" },
      { id: "training", n: "20", label: "Training & Adoption" },
      { id: "prompts", n: "21", label: "Prompt Catalog" },
    ],
  },
  {
    title: "Value",
    items: [
      { id: "kpi", n: "22", label: "Post-Deployment KPIs" },
      { id: "roi", n: "23", label: "ROI & Value" },
      { id: "glossary", n: "24", label: "Glossary" },
    ],
  },
];

export const ALL_SECTIONS = TOC.flatMap((g) => g.items);
