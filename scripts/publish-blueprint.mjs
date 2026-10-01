#!/usr/bin/env node
/**
 * Publishes the standalone review HTML from the same design sources
 * the React blueprint uses. Writes public/ + artifacts/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OEM_TABLES } from "../src/lib/blueprint/oem-model.ts";
import {
  ORCHESTRATION_RULES,
  ORCHESTRATION_SEQUENCE,
  STAGE_ORCHESTRATION,
  SWARM_AGENTS,
} from "../src/lib/blueprint/orchestration.ts";
import { MATRIX_STAGES, TABLE_MATRIX } from "../src/lib/blueprint/table-matrix.ts";
import { STAGE_FLOWS } from "../src/lib/stage-records.ts";
import { TOC } from "../src/lib/blueprint/toc.ts";
import {
  CARD_W,
  COLLAPSED_ROWS,
  FOOTER_H,
  HEADER_H,
  SCHEMA_CANVAS,
  SCHEMA_CORE,
  SCHEMA_FIELDS,
  SCHEMA_LAYOUT,
  SCHEMA_OBJECTS,
  SCHEMA_RELS,
  cardHeight,
  fieldAnchorY,
  headerTone,
  typeLabel,
} from "../src/lib/blueprint/schema.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "public/cygnusx-1-blueprint.html");
const existing = readFileSync(SRC, "utf8");

function extract(id) {
  const re = new RegExp(`<section id="${id}">[\\s\\S]*?<\\/section>`);
  const m = existing.match(re);
  if (!m) throw new Error(`section missing: ${id}`);
  return m[0];
}

function setNum(html, n) {
  return html.replace(/<span class="num">\d+<\/span>/, `<span class="num">${n}</span>`);
}

function esc(s) {
  return String(s)
    .replaceAll("&", "&" + "amp;")
    .replaceAll("<", "&" + "lt;")
    .replaceAll(">", "&" + "gt;")
    .replaceAll('"', "&" + "quot;");
}

function table(headers, rows, cls = "") {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r.map((c) => `<td>${typeof c === "string" ? esc(c) : c}</td>`).join("")}</tr>`,
    )
    .join("\n");
  return `<table${cls ? ` class="${cls}"` : ""}><thead><tr>${head}</tr></thead><tbody>\n${body}\n</tbody></table>`;
}

function verbCell(v) {
  if (!v) return `<td class="ctr muted">·</td>`;
  const kind = v.includes("G") ? "gate" : v.includes("U") ? "update" : v.includes("A") ? "assign" : "create";
  return `<td class="ctr"><span class="verb ${kind}">${esc(v)}</span></td>`;
}

function elbow(a, b) {
  const mid = a.x + (b.x - a.x) * 0.5;
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
}

function typeClass(type) {
  if (type === "Lookup") return "t-lookup";
  if (type === "Master-Detail") return "t-md";
  if (type === "Id") return "t-id";
  return "t-plain";
}

const CORE_SET = new Set(SCHEMA_CORE);

function schemaLines() {
  return SCHEMA_RELS.flatMap((rel) => {
    const from = SCHEMA_LAYOUT[rel.from];
    const to = SCHEMA_LAYOUT[rel.to];
    if (!from || !to) return [];
    const fields = SCHEMA_FIELDS[rel.from] ?? [];
    const idx = fields.findIndex((f) => f.api === rel.field);
    const shown = Math.min(COLLAPSED_ROWS, fields.length);
    const yFrom =
      idx >= 0 && idx < shown
        ? from.y + fieldAnchorY(idx)
        : from.y + cardHeight(fields.length, false) - FOOTER_H / 2;
    const yTo = to.y + HEADER_H / 2;
    const fromRight = from.x + CARD_W / 2 <= to.x + CARD_W / 2;
    const a = { x: fromRight ? from.x + CARD_W : from.x, y: yFrom };
    const b = { x: fromRight ? to.x : to.x + CARD_W, y: yTo };
    const core = CORE_SET.has(rel.from) && CORE_SET.has(rel.to);
    return [{ ...rel, d: elbow(a, b), core }];
  });
}

function fieldRows(name) {
  const fields = SCHEMA_FIELDS[name] ?? [];
  return fields
    .map((f, i) => {
      const label = typeLabel(f.type);
      const extra = i >= COLLAPSED_ROWS ? " sb-more" : "";
      return `<li class="sb-field${extra}${f.required ? " req" : ""}"><span class="tick"></span><span class="api">${esc(f.api)}</span><span class="typ ${typeClass(label)}">${esc(label)}</span></li>`;
    })
    .join("");
}

function schemaCards() {
  return SCHEMA_OBJECTS.map((name) => {
    const p = SCHEMA_LAYOUT[name];
    const fields = SCHEMA_FIELDS[name] ?? [];
    const extra = Math.max(0, fields.length - COLLAPSED_ROWS);
    const tone = headerTone(name);
    const core = CORE_SET.has(name);
    const footer = extra
      ? `<button type="button" class="sb-more-btn" data-expand="${esc(name)}">+ ${extra} more fields</button>`
      : "";
    return `<article class="sb-card tone-${tone}${core ? "" : " off"}" data-obj="${esc(name)}" style="left:${p.x}px;top:${p.y}px;width:${CARD_W}px">
      <header class="sb-head">${esc(name)}</header>
      <ul>${fieldRows(name)}</ul>
      ${footer}
    </article>`;
  }).join("\n");
}

function schemaSvg() {
  const paths = schemaLines()
    .map((ln) => {
      const color = ln.kind === "masterDetail" ? "var(--bad)" : "var(--accent)";
      const end = ln.kind === "masterDetail" ? "url(#sb-master)" : "url(#sb-lookup)";
      const start = ln.cardinality === "1:1" ? "url(#sb-one)" : "url(#sb-many)";
      const off = ln.core ? "" : " off";
      return `<path class="sb-line${off}" data-from="${esc(ln.from)}" data-to="${esc(ln.to)}" d="${esc(ln.d)}" fill="none" stroke="${color}" stroke-width="2.1" marker-end="${end}" marker-start="${start}"/>`;
    })
    .join("\n");
  return `<svg class="sb-svg" width="${SCHEMA_CANVAS.w}" height="${SCHEMA_CANVAS.h}" aria-label="Schema builder — table relationships">
    <defs>
      <marker id="sb-lookup" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
        <circle cx="5" cy="5" r="3.2" fill="#fff" stroke="#3d6f86" stroke-width="1.4"/>
      </marker>
      <marker id="sb-master" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <polygon points="2,6 6,1.5 11,6 6,10.5" fill="#8C2F2F"/>
      </marker>
      <marker id="sb-many" markerWidth="12" markerHeight="12" refX="1" refY="6" orient="auto">
        <path d="M11,1 L1,6 L11,11 M11,6 L1,6" fill="none" stroke="#6b7580" stroke-width="1.3"/>
      </marker>
      <marker id="sb-one" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto">
        <path d="M2,1 L2,9 M6,1 L6,9" fill="none" stroke="#6b7580" stroke-width="1.3"/>
      </marker>
    </defs>
    ${paths}
  </svg>`;
}

function schemaBuilderHtml() {
  const palette = SCHEMA_OBJECTS.map((name) => {
    const on = CORE_SET.has(name);
    return `<label class="sb-pal-item"><input type="checkbox" data-obj="${esc(name)}"${on ? " checked" : ""}> ${esc(name)}</label>`;
  }).join("");
  const coreCount = SCHEMA_CORE.length;
  const coreRels = SCHEMA_RELS.filter((r) => CORE_SET.has(r.from) && CORE_SET.has(r.to)).length;
  return `<div class="schema-builder" id="schema-builder">
  <div class="sb-toolbar">
    <div>
      <p class="sb-kicker">Schema builder</p>
      <p class="sb-meta" id="sb-meta">${coreCount} objects · ${coreRels} relationships</p>
    </div>
    <div class="sb-zoom">
      <button type="button" id="sb-zoom-out" aria-label="Zoom out">−</button>
      <button type="button" id="sb-zoom-in" aria-label="Zoom in">+</button>
      <button type="button" id="sb-fit">Fit</button>
    </div>
  </div>
  <div class="sb-body">
    <aside class="sb-palette">
      <div class="sb-pal-top">
        <input type="search" id="sb-find" placeholder="Find object" autocomplete="off">
        <div class="sb-pal-btns">
          <button type="button" id="sb-core">Core</button>
          <button type="button" id="sb-all">All</button>
          <button type="button" id="sb-related" disabled>Related</button>
        </div>
      </div>
      <div class="sb-pal-list" id="sb-pal-list">${palette}</div>
      <div class="sb-pal-foot" id="sb-pal-foot">Click an object to highlight its lookups and master-details.</div>
    </aside>
    <div class="sb-viewport" id="sb-viewport">
      <div class="sb-sizer" id="sb-sizer">
        <div class="sb-canvas" id="sb-canvas" style="width:${SCHEMA_CANVAS.w}px;height:${SCHEMA_CANVAS.h}px">
          ${schemaSvg()}
          ${schemaCards()}
        </div>
      </div>
    </div>
  </div>
  <div class="sb-legend">
    <span><i class="lg-lookup"></i> Lookup</span>
    <span><i class="lg-md"></i> Master-detail</span>
    <span><i class="lg-req"></i> Required field</span>
    <span class="muted">Core is the origination file. All adds stage children.</span>
  </div>
</div>`;
}

const css = existing.slice(existing.indexOf("<style>"), existing.indexOf("</style>") + 8);
const diagrams = [...existing.matchAll(/<div class="diagram-wrap">[\s\S]*?<\/div>/g)].map((m) => m[0]);
const swarmDiagram =
  diagrams.find((d) => d.includes('aria-label="Agent orchestration"') || d.includes('viewBox="0 0 1040 560"')) ??
  diagrams[0] ??
  "";

const matrixRows = TABLE_MATRIX.map((row) => {
  const cells = row.cells.map(verbCell).join("");
  return `<tr><td>${esc(row.table)}</td>${cells}</tr>`;
}).join("\n");

const matrixHead = MATRIX_STAGES.map(
  (s) => `<th class="ctr"><span class="n">${esc(s.id)}</span><br>${esc(s.label)}</th>`,
).join("");

const oemCards = OEM_TABLES.map(
  (t) => `<article class="card" style="padding:1rem 1.1rem">
  <div style="display:flex;justify-content:space-between;gap:.6rem;align-items:baseline">
    <h4 style="margin:0">${esc(t.name)}</h4>
    <span style="font-family:'IBM Plex Mono',monospace;font-size:.68rem;color:var(--gold)">stage ${esc(t.stage)}</span>
  </div>
  <p style="font-size:.82rem;color:var(--ink-soft);margin:.35rem 0 .7rem">${esc(t.purpose)}</p>
  <table style="margin:0"><tbody>
    ${t.columns.map(([c, n]) => `<tr><td style="font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--navy);white-space:nowrap">${esc(c)}</td><td class="muted">${esc(n)}</td></tr>`).join("")}
  </tbody></table>
</article>`,
).join("\n");

const tocHtml = TOC.map((g) => {
  const items = g.items
    .map((s) => `<li><a href="#${s.id}"><span class="n">${s.n}</span> ${esc(s.label)}</a></li>`)
    .join("\n    ");
  return `    <div class="grp">${esc(g.title).toUpperCase()}</div>\n    ${items}`;
}).join("\n");

const overview = setNum(extract("overview"), "01");
const data = setNum(extract("data"), "05");
const mdm = setNum(extract("mdm"), "06");
const rest = [
  ["network", "07"],
  ["tprm", "08"],
  ["dr", "09"],
  ["cyber", "10"],
  ["hallucination", "11"],
  ["eol", "12"],
  ["rtbf", "13"],
  ["crossborder", "14"],
  ["green", "15"],
  ["sla", "16"],
  ["lockin", "17"],
  ["tco", "18"],
  ["ocm", "19"],
  ["training", "20"],
  ["prompts", "21"],
  ["kpi", "22"],
  ["roi", "23"],
  ["glossary", "24"],
]
  .map(([id, n]) => setNum(extract(id), n))
  .join("\n\n");

const oemSection = `<section id="oem">
  <h2><span class="num">02</span> Data Model (Schema)</h2>
  <p class="lede">Account is the customer: a Person Account for an individual, a Business Account for the company. Deal is the file, and the red line is its master-detail to that Account. LOS Product is the loan — a Deal can hold more than one. Related parties, collateral, metrics, the credit decision, and requirements all hang off the loan.</p>
  <blockquote class="callout"><strong>How to read it —</strong> required fields have a red tick on the left. Blue lines are lookups. The red line is Deal to Account. A guarantor, co-borrower, or authorized signor is a Related Party on that LOS Product, pointing at an Account.</blockquote>
  ${schemaBuilderHtml()}
  <h3>Relationships</h3>
  <p>Child → parent. Drawn only when both objects are on the canvas. Master-detail hangs the child off the file; lookup is a typed pointer.</p>
  ${table(
    ["Child", "Parent", "Field", "Kind", "Card."],
    SCHEMA_RELS.map((r) => [
      r.from,
      r.to,
      r.field,
      r.kind === "masterDetail"
        ? `<span class="verb gate">Master-Detail</span>`
        : `<span class="verb assign">Lookup</span>`,
      r.cardinality,
    ]),
  )}
  <h3>Table catalog</h3>
  ${table(
    ["Table", "PK", "Stage", "Purpose"],
    OEM_TABLES.map((t) => [t.name, t.pk, t.stage, t.purpose]),
  )}
  <h3>Columns by table</h3>
  <div class="grid-2">${oemCards}</div>
</section>`;

const stageSection = `<section id="stageflow">
  <h2><span class="num">03</span> Process Flow & Table Updates</h2>
  <p class="lede">Quote-to-Cash is eight sequential stages. Incomplete work loops inside the stage. A failed gate (consumer credit, commercial credit, OFAC, underwriter reject) closes the process. The matrix shows which canonical table each stage creates, updates, assigns, or gates.</p>
  <blockquote class="callout"><strong>01 Intake —</strong> Customer, email verification + ApplicantAccount, Business, then Loan. <strong>02 Pre-application —</strong> consumer CreditPull, commercial CreditPull, OFAC. RM Elena Voss starts the file; credit and fraud join at 02.</blockquote>
  <h3>What each stage writes</h3>
  ${table(
    ["Stage", "Creates", "Updates / assigns", "Gate"],
    STAGE_ORCHESTRATION.map((s) => [`${s.stage} ${s.name}`, s.creates.join(", "), s.updates.join(", "), s.gate]),
  )}
  <h3>Table update matrix</h3>
  <p>Read across a table to see its lifecycle. Account and Deal open the file. Each LOS Product is a loan on that Deal. Related parties, collateral, metrics, Deal Approval, and Requirements are per loan. Related Party Metric is the credit check.</p>
  <div class="legend">
    <span class="verb create">C Create row</span>
    <span class="verb update">U Update columns</span>
    <span class="verb assign">A Assign FK / staff / roles</span>
    <span class="verb gate">G Gate on this table</span>
  </div>
  <div class="overflow"><table class="matrix"><thead><tr><th>Table</th>${matrixHead}</tr></thead><tbody>
${matrixRows}
  </tbody></table></div>
  <h3>Records created, assigned, updated</h3>
  <div id="chips" class="chips"></div>
  <div id="stage-panel" class="stage-card"></div>
  <h3>Record map across the file</h3>
  <div class="overflow"><table id="stage-map"></table></div>
</section>`;

const swarmSection = `<section id="swarm">
  <h2><span class="num">04</span> Agent Orchestration Model</h2>
  <p class="lede">A supervisor reads <code>Process.currentStage</code> and dispatches only the workers allowed for that stage. An evaluator reconciles outputs into a package. The stage owner is the human gate. Workers write the canonical tables in Section 03 — they do not keep private copies.</p>
  ${swarmDiagram}
  <h3>Stage → agents → tables</h3>
  ${table(
    ["Stage", "Agents", "Creates", "Updates", "Human", "Gate"],
    STAGE_ORCHESTRATION.map((s) => [
      `${s.stage} ${s.name}`,
      s.agents.join(", "),
      s.creates.join(", "),
      s.updates.join(", "),
      s.human,
      s.gate,
    ]),
  )}
  <h3>Dispatch sequence</h3>
  ${table(
    ["Step", "Actor", "Action"],
    ORCHESTRATION_SEQUENCE.map((s) => [s.step, s.actor, s.action]),
  )}
  <h3>Agent catalog</h3>
  ${table(
    ["Agent", "Kind", "Stage", "Writes", "Human seat"],
    SWARM_AGENTS.map((a) => [a.name, a.kind, a.stage, a.writes.join(", "), a.humanSeat]),
  )}
  <h3>Tool allowlists</h3>
  ${table(
    ["Agent", "Tools"],
    SWARM_AGENTS.map((a) => [a.name, a.tools.join(", ")]),
  )}
  <h3>Orchestration rules</h3>
  <ul>${ORCHESTRATION_RULES.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
  <blockquote class="callout"><strong>Fail-closed —</strong> consumer credit, commercial credit, and OFAC must pass to leave Pre-application. The swarm cannot infer a pass, invent a guarantyNumber, or post the ledger. Dual-control posting is human.</blockquote>
</section>`;

const stageJson = JSON.stringify(STAGE_FLOWS);
const schemaCoreJson = JSON.stringify([...SCHEMA_CORE]);
const schemaRelsJson = JSON.stringify(SCHEMA_RELS.map((r) => ({ from: r.from, to: r.to, field: r.field, kind: r.kind, cardinality: r.cardinality })));
const schemaLayoutJson = JSON.stringify(SCHEMA_LAYOUT);
const schemaCanvasJson = JSON.stringify(SCHEMA_CANVAS);
const schemaFieldsCountJson = JSON.stringify(
  Object.fromEntries(SCHEMA_OBJECTS.map((n) => [n, (SCHEMA_FIELDS[n] ?? []).length])),
);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CygnusX-1 — SBA Loan Origination Swarm Blueprint</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
${css}
<style>
  :root{ --accent:#3d6f86; }
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1.3rem 0;}
  .schema-builder{background:#fff;border:1px solid var(--line);margin:1.2rem 0;overflow:hidden;}
  .sb-toolbar{display:flex;justify-content:space-between;align-items:center;gap:.75rem;padding:.7rem .9rem;border-bottom:1px solid var(--line);background:var(--paper-2);}
  .sb-kicker{font-family:'IBM Plex Mono',monospace;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:0 0 .15rem;}
  .sb-meta{font-size:.78rem;color:var(--ink-soft);margin:0;}
  .sb-zoom{display:flex;gap:.35rem;}
  .sb-zoom button,.sb-pal-btns button{height:32px;padding:0 .7rem;border:1px solid var(--line);background:#fff;color:var(--navy);font-size:.82rem;cursor:pointer;}
  .sb-zoom button:hover,.sb-pal-btns button:hover{border-color:var(--accent);}
  .sb-body{display:flex;min-height:36rem;max-height:44rem;}
  .sb-palette{width:13.5rem;flex:none;border-right:1px solid var(--line);display:flex;flex-direction:column;min-height:0;background:#fff;}
  .sb-pal-top{padding:.75rem;border-bottom:1px solid var(--line);}
  .sb-pal-top input{width:100%;height:34px;border:1px solid var(--line);padding:0 .6rem;font-size:.85rem;background:var(--paper);}
  .sb-pal-btns{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.5rem;}
  .sb-pal-btns button:disabled{opacity:.4;cursor:not-allowed;}
  .sb-pal-list{flex:1;overflow:auto;padding:.4rem .5rem;}
  .sb-pal-item{display:flex;align-items:center;gap:.45rem;padding:.35rem .4rem;font-size:.84rem;cursor:pointer;}
  .sb-pal-item:hover,.sb-pal-item.sel{background:var(--accent-wash);color:var(--navy);}
  .sb-pal-item.off-label{opacity:.55;}
  .sb-pal-foot{border-top:1px solid var(--line);padding:.75rem;font-size:.75rem;color:var(--ink-soft);background:var(--paper);line-height:1.4;}
  .sb-viewport{flex:1;min-width:0;overflow:auto;--sb-z:.88;background:#fff;
    background-image:linear-gradient(rgba(216,211,198,.7) 1px, transparent 1px),linear-gradient(90deg, rgba(216,211,198,.7) 1px, transparent 1px);
    background-size:24px 24px;}
  .sb-sizer{width:calc(${SCHEMA_CANVAS.w}px * var(--sb-z));height:calc(${SCHEMA_CANVAS.h}px * var(--sb-z));}
  .sb-canvas{position:relative;transform:scale(var(--sb-z));transform-origin:0 0;}
  .sb-svg{position:absolute;inset:0;pointer-events:none;}
  .sb-line.off{display:none;}
  .sb-line.dim{opacity:.18;}
  .sb-card{position:absolute;background:#fff;box-shadow:0 0 0 1px var(--line), 0 1px 2px rgba(16,37,54,.06);overflow:hidden;z-index:1;cursor:pointer;}
  .sb-card.off{display:none;}
  .sb-card.dim{opacity:.28;}
  .sb-card.on{z-index:3;box-shadow:0 0 0 2px var(--accent), 0 8px 18px rgba(16,37,54,.12);}
  .sb-head{height:34px;display:flex;align-items:center;padding:0 .7rem;color:#fff;font-size:.86rem;font-weight:500;}
  .sb-card.tone-master .sb-head{background:var(--navy);}
  .sb-card.tone-party .sb-head{background:var(--navy-2);}
  .sb-card.tone-child .sb-head{background:#1B2430;}
  .sb-card ul{list-style:none;margin:0;padding:0;}
  .sb-field{display:flex;align-items:center;gap:.35rem;height:22px;padding:0 .45rem 0 0;border-bottom:1px solid rgba(216,211,198,.85);background:#fff;}
  .sb-field .tick{width:2px;align-self:stretch;background:transparent;flex:none;}
  .sb-field.req .tick{background:var(--bad);}
  .sb-field .api{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:'IBM Plex Mono',monospace;font-size:.68rem;color:var(--ink);}
  .sb-field .typ{flex:none;font-family:'IBM Plex Mono',monospace;font-size:.62rem;}
  .t-lookup{color:var(--accent);}
  .t-md{color:var(--bad);}
  .t-id{color:var(--navy);}
  .t-plain{color:#6b7580;}
  .sb-field.sb-more{display:none;}
  .sb-card.open .sb-field.sb-more{display:flex;}
  .sb-more-btn{display:block;width:100%;height:26px;border:0;background:#fff;color:var(--accent);font-size:.68rem;text-align:left;padding:0 .7rem;cursor:pointer;}
  .sb-more-btn:hover{background:var(--accent-wash);}
  .sb-legend{display:flex;flex-wrap:wrap;gap:1rem;align-items:center;padding:.55rem .9rem;border-top:1px solid var(--line);background:var(--paper);font-size:.72rem;color:var(--ink-soft);}
  .sb-legend i{display:inline-block;vertical-align:middle;margin-right:.35rem;}
  .lg-lookup{width:8px;height:8px;border-radius:50%;border:2px solid var(--accent);background:#fff;}
  .lg-md{width:8px;height:8px;background:var(--bad);transform:rotate(45deg);}
  .lg-req{width:2px;height:12px;background:var(--bad);}
  @media (max-width: 900px){
    .grid-2{grid-template-columns:1fr;}
    .sb-body{flex-direction:column;max-height:none;}
    .sb-palette{width:100%;border-right:none;border-bottom:1px solid var(--line);max-height:9.5rem;}
    .sb-viewport{min-height:24rem;height:28rem;}
  }
  @media print{
    .sb-palette,.sb-zoom{display:none;}
    .sb-body{max-height:none;}
    .sb-viewport{overflow:visible;height:auto;}
  }
</style>
</head>
<body>

<div class="cover">
  <div class="eyebrow-row">
    <span>SBA LENDING · PROJECT BLUEPRINT · CONFIDENTIAL</span>
    <span>CYGNUSX-1 · V1.4 · DOWNLOADABLE HTML</span>
  </div>
  <h1>CygnusX-1 SBA Loan Origination Swarm</h1>
  <p class="subtitle">Data model, process flow with table updates, and agent orchestration for 7(a), Express, and 504. Process is the parent of the file. A human underwriter of record approves every credit decision.</p>
  <div class="btns">
    <a class="btn btn-light" href="#oem">Data model</a>
    <a class="btn btn-ghost" href="#stageflow">Process flow & tables</a>
    <a class="btn btn-ghost" href="#swarm">Agent orchestration</a>
    <a class="btn btn-ghost" href="cygnusx-1-blueprint.html" download="CygnusX-1-Blueprint.html">Download HTML</a>
  </div>
  <div class="meta-grid">
    <div><span class="meta-label">PROGRAMME</span><span class="meta-value">CygnusX-1</span></div>
    <div><span class="meta-label">DOMAIN</span><span class="meta-value">SBA origination</span></div>
    <div><span class="meta-label">AUTONOMY</span><span class="meta-value">L2 at launch → L3 gated</span></div>
    <div><span class="meta-label">SPINE</span><span class="meta-value">processId</span></div>
  </div>
</div>

<div class="layout">
<nav class="toc">
  <div class="toc-title">CONTENTS</div>
  <ol>
${tocHtml}
  </ol>
</nav>

<main>
${overview}

${oemSection}

${stageSection}

${swarmSection}

${data}

${mdm}

${rest}

</main>
</div>

<footer>
  <div class="foot-grid">
    <span>CygnusX-1 — SBA Loan Origination Multi-Agent Swarm Blueprint · V1.4 · HTML review copy</span>
    <span>Confidential — internal review · not legal or regulatory advice</span>
  </div>
</footer>

<script>
const STAGES = ${stageJson};
const verbClass = {create:"create", assign:"assign", update:"update", gate:"gate"};
function render(i){
  const s = STAGES[i];
  document.querySelectorAll(".chip").forEach((c,n)=>c.classList.toggle("on", n===i));
  const recs = s.records.map(r =>
    \`<div class="rec"><div class="rec-h"><span class="verb \${verbClass[r.verb]}">\${r.verb}</span><strong>\${r.record}</strong></div><p style="margin:0;color:var(--ink-soft);font-size:.9rem;">\${r.detail}</p></div>\`
  ).join("");
  document.getElementById("stage-panel").innerHTML =
    \`<p style="font-family:'IBM Plex Mono',monospace;font-size:.72rem;color:var(--gold);letter-spacing:.12em;text-transform:uppercase;margin:0 0 .4rem;">Stage \${s.n} of 08</p>
     <h3 style="margin-top:0;">\${s.name}</h3>
     <p class="lede">\${s.purpose}</p>
     <div class="gatebox"><strong>Gate — </strong>\${s.gate}</div>
     <h4 style="margin-top:0;">Records</h4>\${recs}\`;
}
function map(){
  const rows = STAGES.map((s,i)=>{
    const creates = s.records.filter(r=>r.verb==="create").map(r=>r.record).join(", ") || "—";
    const rest = s.records.filter(r=>r.verb!=="create").map(r=>r.record).join(", ") || "—";
    return \`<tr><td><a href="#stageflow" data-i="\${i}">\${s.n} \${s.name}</a></td><td>\${creates}</td><td>\${rest}</td></tr>\`;
  }).join("");
  document.getElementById("stage-map").innerHTML =
    \`<thead><tr><th>Stage</th><th>Creates</th><th>Assigns / updates</th></tr></thead><tbody>\${rows}</tbody>\`;
  document.getElementById("stage-map").addEventListener("click", e=>{
    const a = e.target.closest("a[data-i]");
    if(a){ e.preventDefault(); render(+a.dataset.i); }
  });
}
document.getElementById("chips").innerHTML = STAGES.map((s,i)=>
  \`<button type="button" class="chip\${i===0?" on":""}" data-i="\${i}"><span class="n">\${s.n}</span>\${s.name}</button>\`
).join("");
document.getElementById("chips").addEventListener("click", e=>{
  const b = e.target.closest("button[data-i]");
  if(b) render(+b.dataset.i);
});
map();
render(0);

const SB_CORE = ${schemaCoreJson};
const SB_RELS = ${schemaRelsJson};
const SB_LAYOUT = ${schemaLayoutJson};
const SB_CANVAS = ${schemaCanvasJson};
const SB_FIELDS = ${schemaFieldsCountJson};
const sbVisible = new Set(SB_CORE);
let sbSelected = null;
let sbZoom = 0.88;
function sbRelated(name){
  const next = new Set([name]);
  SB_RELS.forEach(r => { if(r.from===name || r.to===name){ next.add(r.from); next.add(r.to); } });
  return next;
}
function sbApply(){
  const rel = sbSelected ? sbRelated(sbSelected) : null;
  document.querySelectorAll(".sb-card").forEach(el => {
    const name = el.dataset.obj;
    const on = sbVisible.has(name);
    el.classList.toggle("off", !on);
    el.classList.toggle("on", sbSelected === name);
    el.classList.toggle("dim", Boolean(rel) && on && !rel.has(name));
  });
  document.querySelectorAll(".sb-line").forEach(el => {
    const show = sbVisible.has(el.dataset.from) && sbVisible.has(el.dataset.to);
    el.classList.toggle("off", !show);
    el.classList.toggle("dim", show && Boolean(rel) && !(rel.has(el.dataset.from) && rel.has(el.dataset.to)));
  });
  document.querySelectorAll(".sb-pal-item input").forEach(inp => {
    inp.checked = sbVisible.has(inp.dataset.obj);
    inp.closest(".sb-pal-item").classList.toggle("sel", sbSelected === inp.dataset.obj);
  });
  const lineN = [...document.querySelectorAll(".sb-line")].filter(el => !el.classList.contains("off")).length;
  document.getElementById("sb-meta").textContent = sbVisible.size + " objects · " + lineN + " relationships";
  document.getElementById("sb-related").disabled = !sbSelected;
  const foot = document.getElementById("sb-pal-foot");
  if(!sbSelected){
    foot.textContent = "Click an object to highlight its lookups and master-details.";
  } else {
    const rs = SB_RELS.filter(r => r.from===sbSelected || r.to===sbSelected);
    foot.innerHTML = "<strong>"+sbSelected+"</strong><br>"+(SB_FIELDS[sbSelected]||0)+" fields · "+rs.length+" relationships<br>"+
      rs.slice(0,6).map(r => r.field+" · "+r.from+" → "+r.to+" · "+(r.kind==="masterDetail"?"MD":"Lookup")+" "+r.cardinality).join("<br>");
  }
  sbFitSizer();
}
function sbFitSizer(){
  const vp = document.getElementById("sb-viewport");
  const sizer = document.getElementById("sb-sizer");
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  document.querySelectorAll(".sb-card:not(.off)").forEach(el => {
    const p = SB_LAYOUT[el.dataset.obj];
    if(!p) return;
    minX=Math.min(minX,p.x); minY=Math.min(minY,p.y);
    maxX=Math.max(maxX,p.x+${CARD_W}); maxY=Math.max(maxY,p.y+260);
  });
  if(!isFinite(minX)){ minX=0; minY=0; maxX=SB_CANVAS.w; maxY=SB_CANVAS.h; }
  const pad = 48;
  sizer.style.width = Math.max(vp.clientWidth, (SB_CANVAS.w) * sbZoom) + "px";
  sizer.style.height = Math.max(vp.clientHeight, (maxY + pad) * sbZoom) + "px";
  vp.style.setProperty("--sb-z", sbZoom);
}
function sbSetVisible(names){
  sbVisible.clear();
  names.forEach(n => sbVisible.add(n));
  sbApply();
}
document.getElementById("sb-core").addEventListener("click", () => { sbSelected=null; sbSetVisible(SB_CORE); sbFit(); });
document.getElementById("sb-all").addEventListener("click", () => { sbSelected=null; sbSetVisible(Object.keys(SB_LAYOUT)); sbFit(); });
document.getElementById("sb-related").addEventListener("click", () => { if(sbSelected) { sbSetVisible([...sbRelated(sbSelected)]); sbFit(); } });
document.getElementById("sb-pal-list").addEventListener("change", e => {
  const inp = e.target.closest("input[data-obj]");
  if(!inp) return;
  if(inp.checked) sbVisible.add(inp.dataset.obj); else { sbVisible.delete(inp.dataset.obj); if(sbSelected===inp.dataset.obj) sbSelected=null; }
  sbApply();
});
document.getElementById("sb-canvas").addEventListener("click", e => {
  const card = e.target.closest(".sb-card");
  const btn = e.target.closest("[data-expand]");
  if(btn){
    e.stopPropagation();
    const cardEl = btn.closest(".sb-card");
    const open = cardEl.classList.toggle("open");
    const extra = (SB_FIELDS[btn.dataset.expand]||0) - ${COLLAPSED_ROWS};
    btn.textContent = open ? "Show fewer fields" : "+ " + extra + " more fields";
    return;
  }
  sbSelected = card ? card.dataset.obj : null;
  sbApply();
});
document.getElementById("sb-find").addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll(".sb-pal-item").forEach(lab => {
    const name = lab.querySelector("input").dataset.obj.toLowerCase();
    lab.style.display = !q || name.includes(q) ? "" : "none";
  });
});
document.getElementById("sb-zoom-in").addEventListener("click", () => { sbZoom = Math.min(1.5, sbZoom + 0.1); sbFitSizer(); });
document.getElementById("sb-zoom-out").addEventListener("click", () => { sbZoom = Math.max(0.35, sbZoom - 0.1); sbFitSizer(); });
function sbFit(){
  const vp = document.getElementById("sb-viewport");
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  document.querySelectorAll(".sb-card:not(.off)").forEach(el => {
    const p = SB_LAYOUT[el.dataset.obj];
    if(!p) return;
    minX=Math.min(minX,p.x); minY=Math.min(minY,p.y);
    maxX=Math.max(maxX,p.x+${CARD_W}); maxY=Math.max(maxY,p.y+260);
  });
  if(!isFinite(minX)) return;
  const pad=48, bw=maxX-minX+pad*2, bh=maxY-minY+pad*2;
  const byW = vp.clientWidth / bw;
  const byH = vp.clientHeight / bh;
  const mobile = vp.clientWidth < 640;
  const many = sbVisible.size > 10;
  if (mobile) sbZoom = Math.min(1, Math.max(0.32, Math.min(byW, byH)));
  else if (many) sbZoom = Math.min(0.72, Math.max(0.4, Math.min(byW, byH)));
  else sbZoom = Math.min(0.92, Math.max(0.82, byW));
  sbFitSizer();
  vp.scrollLeft = Math.max(0, (minX-pad)*sbZoom);
  vp.scrollTop = Math.max(0, (minY-pad)*sbZoom);
}
document.getElementById("sb-fit").addEventListener("click", sbFit);
sbApply();
requestAnimationFrame(sbFit);
</script>
</body>
</html>
`;

const outPublic = join(ROOT, "public/cygnusx-1-blueprint.html");
const outArt = join(ROOT, "artifacts/CygnusX-1-Blueprint.html");
mkdirSync(join(ROOT, "artifacts"), { recursive: true });
const published = html.replace("a stage in Section 23.", "a stage in Section 03.");
writeFileSync(outPublic, published);
writeFileSync(outArt, published);
console.log("published", outPublic, published.length, "bytes");
console.log("published", outArt);
