import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Box, Maximize2, Minus, Plus, Search } from "lucide-react";
import {
  CARD_W,
  COLLAPSED_ROWS,
  FOOTER_H,
  HEADER_H,
  ROW_H,
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
  type SchemaRel,
} from "@/lib/blueprint/schema";

type Pt = { x: number; y: number };

const CORE_SET = new Set<string>(SCHEMA_CORE);

function elbow(a: Pt, b: Pt): string {
  const dx = b.x - a.x;
  const mid = a.x + dx * 0.5;
  return `M ${a.x} ${a.y} C ${mid} ${a.y}, ${mid} ${b.y}, ${b.x} ${b.y}`;
}

function typeChip(type: string): string {
  if (type === "Lookup") return "text-accent";
  if (type === "Master-Detail") return "text-bad";
  if (type === "Id") return "text-navy";
  return "text-ink-faint";
}

export function OemDiagram() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState<Set<string>>(() => new Set(SCHEMA_CORE));
  const [pos, setPos] = useState<Record<string, Pt>>(() => ({ ...SCHEMA_LAYOUT }));
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [zoom, setZoom] = useState(0.92);
  const [pan, setPan] = useState<Pt>({ x: 16, y: 16 });
  const drag = useRef<
    | { kind: "card"; name: string; ox: number; oy: number; px: number; py: number }
    | { kind: "pan"; sx: number; sy: number; panX: number; panY: number }
    | null
  >(null);

  const related = useMemo(() => {
    if (!selected) return new Set<string>();
    const next = new Set<string>([selected]);
    for (const r of SCHEMA_RELS) {
      if (r.from === selected || r.to === selected) {
        next.add(r.from);
        next.add(r.to);
      }
    }
    return next;
  }, [selected]);

  const lines = useMemo(() => {
    const out: (SchemaRel & { d: string })[] = [];
    for (const rel of SCHEMA_RELS) {
      if (!visible.has(rel.from) || !visible.has(rel.to)) continue;
      const from = pos[rel.from];
      const to = pos[rel.to];
      if (!from || !to) continue;
      const fields = SCHEMA_FIELDS[rel.from] ?? [];
      const idx = fields.findIndex((f) => f.api === rel.field);
      const open = expanded.has(rel.from);
      const shown = open ? fields.length : Math.min(COLLAPSED_ROWS, fields.length);
      const yFrom =
        idx >= 0 && idx < shown
          ? from.y + fieldAnchorY(idx)
          : from.y + cardHeight(fields.length, open) - FOOTER_H / 2;
      const yTo = to.y + HEADER_H / 2;
      const fromRight = from.x + CARD_W / 2 <= to.x + CARD_W / 2;
      const a: Pt = { x: fromRight ? from.x + CARD_W : from.x, y: yFrom };
      const b: Pt = { x: fromRight ? to.x : to.x + CARD_W, y: yTo };
      out.push({ ...rel, d: elbow(a, b) });
    }
    return out;
  }, [visible, pos, expanded]);

  const filteredPalette = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCHEMA_OBJECTS.filter((n) => !q || n.toLowerCase().includes(q));
  }, [query]);

  const selectedRels = useMemo(
    () => (selected ? SCHEMA_RELS.filter((r) => r.from === selected || r.to === selected) : []),
    [selected],
  );

  const fit = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const names = [...visible];
    if (!names.length) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const name of names) {
      const p = pos[name] ?? SCHEMA_LAYOUT[name];
      const h = cardHeight(SCHEMA_FIELDS[name]?.length ?? 0, expanded.has(name));
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + CARD_W);
      maxY = Math.max(maxY, p.y + h);
    }
    const pad = 48;
    const bw = maxX - minX + pad * 2;
    const bh = maxY - minY + pad * 2;
    const z = Math.min(1.15, vp.clientWidth / bw, vp.clientHeight / bh);
    setZoom(z);
    setPan({
      x: (vp.clientWidth - bw * z) / 2 - (minX - pad) * z,
      y: (vp.clientHeight - bh * z) / 2 - (minY - pad) * z,
    });
  }, [visible, pos, expanded]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      const names = [...CORE_SET];
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const name of names) {
        const p = SCHEMA_LAYOUT[name];
        const h = cardHeight(SCHEMA_FIELDS[name]?.length ?? 0, false);
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + CARD_W);
        maxY = Math.max(maxY, p.y + h);
      }
      const pad = 48;
      const bw = maxX - minX + pad * 2;
      const bh = maxY - minY + pad * 2;
      const z = Math.min(1.15, vp.clientWidth / bw, vp.clientHeight / bh);
      setZoom(z);
      setPan({
        x: (vp.clientWidth - bw * z) / 2 - (minX - pad) * z,
        y: (vp.clientHeight - bh * z) / 2 - (minY - pad) * z,
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function toggle(name: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
        if (selected === name) setSelected(null);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  function showCore() {
    setVisible(new Set(SCHEMA_CORE));
    setSelected(null);
  }

  function showAll() {
    setVisible(new Set(SCHEMA_OBJECTS));
    setSelected(null);
  }

  function showRelated() {
    if (!selected) return;
    const next = new Set<string>([selected]);
    for (const r of SCHEMA_RELS) {
      if (r.from === selected || r.to === selected) {
        next.add(r.from);
        next.add(r.to);
      }
    }
    setVisible(next);
  }

  function onCanvasPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-card]")) return;
    drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onCardPointerDown(e: ReactPointerEvent<HTMLElement>, name: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    const p = pos[name];
    drag.current = { kind: "card", name, ox: p.x, oy: p.y, px: e.clientX, py: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(name);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      setPan({ x: d.panX + (e.clientX - d.sx), y: d.panY + (e.clientY - d.sy) });
      return;
    }
    const dx = (e.clientX - d.px) / zoom;
    const dy = (e.clientY - d.py) / zoom;
    setPos((prev) => ({ ...prev, [d.name]: { x: d.ox + dx, y: d.oy + dy } }));
  }

  function onPointerUp() {
    drag.current = null;
  }

  function onWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const next = Math.min(1.6, Math.max(0.45, zoom + (e.deltaY < 0 ? 0.08 : -0.08)));
    setZoom(next);
  }

  return (
    <div className="my-6 border border-line bg-white overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-line bg-paper-2">
        <div>
          <p className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-accent mb-0">Schema builder</p>
          <p className="text-xs text-ink-faint mb-0">
            {visible.size} objects · {lines.length} relationships
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, z - 0.1))}
            className="size-9 grid place-items-center rounded-md border border-line bg-white text-navy hover:border-accent"
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
            className="size-9 grid place-items-center rounded-md border border-line bg-white text-navy hover:border-accent"
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={fit}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-line bg-white text-sm text-navy hover:border-accent"
          >
            <Maximize2 className="size-3.5" />
            Fit
          </button>
        </div>
      </div>

      <div className="flex min-h-[36rem] max-h-[44rem] flex-col md:flex-row">
        <aside className="w-full md:w-[13.5rem] shrink-0 border-b md:border-b-0 md:border-r border-line bg-white flex flex-col min-h-0 max-h-48 md:max-h-none">
          <div className="p-3 border-b border-line">
            <label className="relative block">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-ink-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find object"
                className="w-full h-9 pl-7 pr-2 rounded-md border border-line bg-paper text-sm text-ink placeholder:text-ink-faint"
              />
            </label>
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                type="button"
                onClick={showCore}
                className="h-8 px-2 rounded-md border border-line text-xs text-navy hover:border-accent"
              >
                Core
              </button>
              <button
                type="button"
                onClick={showAll}
                className="h-8 px-2 rounded-md border border-line text-xs text-navy hover:border-accent"
              >
                All
              </button>
              <button
                type="button"
                disabled={!selected}
                onClick={showRelated}
                className="h-8 px-2 rounded-md border border-line text-xs text-navy hover:border-accent disabled:opacity-40"
              >
                Related
              </button>
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-2 m-0 list-none">
            {filteredPalette.map((name) => {
              const on = visible.has(name);
              return (
                <li key={name}>
                  <label
                    className={`flex items-center gap-2 px-1.5 py-1.5 rounded-sm text-sm cursor-pointer ${
                      selected === name ? "bg-accent-wash text-navy" : "text-ink hover:bg-paper"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(name)}
                      className="size-3.5 accent-navy"
                    />
                    <button
                      type="button"
                      className="flex-1 text-left truncate bg-transparent border-0 p-0 text-inherit"
                      onClick={() => {
                        if (!on) toggle(name);
                        setSelected(name);
                      }}
                    >
                      {name}
                    </button>
                  </label>
                </li>
              );
            })}
          </ul>
          {selected ? (
            <div className="border-t border-line p-3 bg-paper">
              <p className="font-medium text-navy text-sm mb-1">{selected}</p>
              <p className="text-xs text-ink-faint mb-2">
                {SCHEMA_FIELDS[selected]?.length ?? 0} fields · {selectedRels.length} relationships
              </p>
              <ul className="m-0 p-0 list-none grid gap-1.5">
                {selectedRels.slice(0, 6).map((r) => (
                  <li key={`${r.from}-${r.field}-${r.to}`} className="text-xs text-ink-soft leading-snug">
                    <span className="font-mono text-[0.65rem] text-ink-faint">{r.field}</span>
                    <span className="block">
                      {r.from} → {r.to}
                      <span className={r.kind === "masterDetail" ? " text-bad" : " text-accent"}>
                        {" "}
                        · {r.kind === "masterDetail" ? "MD" : "Lookup"} {r.cardinality}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="border-t border-line p-3 text-xs text-ink-faint">
              Click an object to highlight its lookups and master-details.
            </div>
          )}
        </aside>

        <div
          ref={viewportRef}
          className="relative flex-1 min-w-0 min-h-[22rem] md:min-h-0 overflow-hidden schema-grid cursor-grab active:cursor-grabbing"
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            className="absolute origin-top-left"
            style={{
              width: SCHEMA_CANVAS.w,
              height: SCHEMA_CANVAS.h,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg
              className="absolute inset-0 pointer-events-none"
              width={SCHEMA_CANVAS.w}
              height={SCHEMA_CANVAS.h}
              aria-hidden
            >
              <defs>
                <marker id="sb-lookup" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                  <circle cx="5" cy="5" r="3.2" fill="var(--color-white)" stroke="var(--color-accent)" strokeWidth="1.4" />
                </marker>
                <marker id="sb-master" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                  <polygon points="2,6 6,1.5 11,6 6,10.5" fill="var(--color-bad)" />
                </marker>
                <marker id="sb-many" markerWidth="12" markerHeight="12" refX="1" refY="6" orient="auto">
                  <path d="M11,1 L1,6 L11,11 M11,6 L1,6" fill="none" stroke="var(--color-ink-faint)" strokeWidth="1.3" />
                </marker>
                <marker id="sb-one" markerWidth="10" markerHeight="10" refX="1" refY="5" orient="auto">
                  <path d="M2,1 L2,9 M6,1 L6,9" fill="none" stroke="var(--color-ink-faint)" strokeWidth="1.3" />
                </marker>
              </defs>
              {lines.map((ln) => {
                const hot = !selected || (related.has(ln.from) && related.has(ln.to));
                const color = ln.kind === "masterDetail" ? "var(--color-bad)" : "var(--color-accent)";
                return (
                  <path
                    key={`${ln.from}-${ln.to}-${ln.field}`}
                    d={ln.d}
                    fill="none"
                    stroke={color}
                    strokeWidth={hot ? 2.2 : 1.2}
                    opacity={hot ? 1 : 0.18}
                    markerEnd={ln.kind === "masterDetail" ? "url(#sb-master)" : "url(#sb-lookup)"}
                    markerStart={ln.cardinality === "1:1" ? "url(#sb-one)" : "url(#sb-many)"}
                  />
                );
              })}
            </svg>

            {SCHEMA_OBJECTS.filter((name) => visible.has(name)).map((name) => {
              const p = pos[name] ?? SCHEMA_LAYOUT[name];
              const fields = SCHEMA_FIELDS[name] ?? [];
              const open = expanded.has(name);
              const shown = open ? fields : fields.slice(0, COLLAPSED_ROWS);
              const extra = fields.length - shown.length;
              const tone = headerTone(name);
              const dim = Boolean(selected) && !related.has(name);
              const on = selected === name;
              const header =
                tone === "master"
                  ? "bg-navy text-paper"
                  : tone === "party"
                    ? "bg-navy-2 text-paper"
                    : "bg-ink text-paper";
              return (
                <article
                  key={name}
                  data-card={name}
                  className={`absolute bg-white overflow-hidden select-none ${
                    on ? "z-20 ring-2 ring-accent" : "z-10"
                  }`}
                  style={{
                    left: p.x,
                    top: p.y,
                    width: CARD_W,
                    opacity: dim ? 0.28 : 1,
                    boxShadow: on
                      ? "0 0 0 1px var(--color-accent), 0 8px 18px rgba(16,37,54,0.12)"
                      : "0 0 0 1px var(--color-line), 0 1px 2px rgba(16,37,54,0.06)",
                  }}
                >
                  <header
                    className={`flex items-center gap-2 px-2.5 cursor-grab active:cursor-grabbing ${header}`}
                    style={{ height: HEADER_H }}
                    onPointerDown={(e) => onCardPointerDown(e, name)}
                  >
                    <Box className="size-3.5 shrink-0 opacity-80" />
                    <span className="text-sm font-medium truncate">{name}</span>
                  </header>
                  <ul className="m-0 p-0 list-none">
                    {shown.map((field) => {
                      const label = typeLabel(field.type);
                      return (
                        <li
                          key={field.api}
                          className="flex items-center gap-1.5 px-2 border-b border-line/80 bg-white"
                          style={{ height: ROW_H }}
                        >
                          <span
                            className={`w-0.5 self-stretch shrink-0 ${field.required ? "bg-bad" : "bg-transparent"}`}
                            title={field.required ? "Required" : undefined}
                          />
                          <span className="flex-1 truncate font-mono text-[0.68rem] text-ink">{field.api}</span>
                          <span className={`shrink-0 text-[0.62rem] font-mono ${typeChip(label)}`}>{label}</span>
                        </li>
                      );
                    })}
                  </ul>
                  {extra > 0 || (open && fields.length > COLLAPSED_ROWS) ? (
                    <button
                      type="button"
                      className="w-full text-left px-2.5 text-[0.68rem] text-accent hover:bg-accent-wash border-0 bg-white"
                      style={{ height: FOOTER_H }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(name)) next.delete(name);
                          else next.add(name);
                          return next;
                        });
                      }}
                    >
                      {open ? "Show fewer fields" : `+ ${extra} more fields`}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 px-3 py-2 border-t border-line bg-paper text-[0.72rem] text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full border-2 border-accent bg-white" />
          Lookup
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rotate-45 bg-bad" />
          Master-detail
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-0.5 h-3 bg-bad" />
          Required field
        </span>
        <span className="text-ink-faint">Drag objects · pan the canvas · red line is Deal → Account</span>
      </div>
    </div>
  );
}
