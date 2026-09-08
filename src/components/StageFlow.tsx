import { useState } from "react";
import { STAGE_FLOWS, type RecordAction } from "@/lib/stage-records";

const verbStyle: Record<RecordAction["verb"], string> = {
  create: "bg-good-wash text-good",
  assign: "bg-accent-wash text-navy",
  update: "bg-warn-wash text-warn",
  gate: "bg-bad-wash text-bad",
};

export function StageFlow({ embedded = false }: { embedded?: boolean }) {
  const [active, setActive] = useState(STAGE_FLOWS[0].id);
  const stage = STAGE_FLOWS.find((s) => s.id === active) ?? STAGE_FLOWS[0];
  const idx = STAGE_FLOWS.findIndex((s) => s.id === active);

  const explorer = (
    <>
      <ol className="flex gap-1 overflow-x-auto pb-3 mb-8">
        {STAGE_FLOWS.map((s, i) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="flex items-center min-w-0">
              <button
                type="button"
                onClick={() => setActive(s.id)}
                className={`h-12 px-3 sm:px-3.5 rounded-md text-left shrink-0 border transition-colors duration-150 ${
                  on
                    ? "bg-navy text-paper border-navy"
                    : "bg-white text-ink border-line hover:border-accent"
                }`}
              >
                <span className="block font-mono text-[0.65rem] opacity-70">{s.n}</span>
                <span className="block text-sm font-medium leading-tight whitespace-nowrap">
                  {s.name}
                </span>
              </button>
              {i < STAGE_FLOWS.length - 1 ? (
                <span className="hidden sm:block w-3 h-px bg-line mx-0.5" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ol>

      <article className="min-w-0 rounded-lg bg-white border border-line p-5 sm:p-8">
        <p className="font-mono text-xs tracking-[0.12em] uppercase text-accent mb-2">
          Stage {stage.n} of 08
        </p>
        <h3 className="text-2xl mt-0 mb-2">{stage.name}</h3>
        <p className="text-ink-soft mb-6">{stage.purpose}</p>

        <div className="rounded-md bg-paper-2 border border-line px-4 py-3 mb-8 text-sm">
          <span className="font-medium text-navy">Gate — </span>
          {stage.gate}
        </div>

        <h4 className="font-serif text-navy text-lg mb-3">Records</h4>
        <ul className="grid gap-3">
          {stage.records.map((r) => (
            <li
              key={`${r.verb}-${r.record}-${r.detail.slice(0, 24)}`}
              className="rounded-md border border-line p-4"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span
                  className={`font-mono text-[0.68rem] uppercase tracking-wide px-2 py-0.5 rounded-sm ${verbStyle[r.verb]}`}
                >
                  {r.verb}
                </span>
                <span className="font-medium text-navy">{r.record}</span>
              </div>
              <p className="text-sm text-ink-soft mb-0">{r.detail}</p>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-3 mt-8">
          <button
            type="button"
            disabled={idx === 0}
            onClick={() => setActive(STAGE_FLOWS[idx - 1].id)}
            className="h-11 px-4 rounded-md border border-line bg-white font-medium disabled:opacity-40 hover:border-accent transition-colors duration-150"
          >
            Previous stage
          </button>
          <button
            type="button"
            disabled={idx === STAGE_FLOWS.length - 1}
            onClick={() => setActive(STAGE_FLOWS[idx + 1].id)}
            className="h-11 px-4 rounded-md bg-navy text-paper font-medium disabled:opacity-40 hover:bg-navy-2 transition-colors duration-150"
          >
            Next stage
          </button>
        </div>
      </article>

      <div className="mt-10">
        <h4 className="font-serif text-navy text-lg mb-3">Record map across the file</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px] border-collapse">
            <thead>
              <tr className="text-left text-ink-faint font-medium">
                <th className="py-2 pr-3 border-b border-line">Stage</th>
                <th className="py-2 pr-3 border-b border-line">Creates</th>
                <th className="py-2 border-b border-line">Assigns / updates</th>
              </tr>
            </thead>
            <tbody>
              {STAGE_FLOWS.map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="py-3 pr-3 border-b border-line whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setActive(s.id)}
                      className="font-medium text-navy hover:underline"
                    >
                      {s.n} {s.name}
                    </button>
                  </td>
                  <td className="py-3 pr-3 border-b border-line text-ink-soft">
                    {s.records
                      .filter((r) => r.verb === "create")
                      .map((r) => r.record)
                      .join(", ") || "—"}
                  </td>
                  <td className="py-3 border-b border-line text-ink-soft">
                    {s.records
                      .filter((r) => r.verb !== "create")
                      .map((r) => r.record)
                      .join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  if (embedded) return <div className="min-w-0">{explorer}</div>;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="bg-navy text-paper">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-10">
          <p className="font-mono text-[0.7rem] tracking-[0.16em] uppercase text-accent-soft mb-3">
            CygnusX-1 · Technical process flow
          </p>
          <h1 className="text-paper text-3xl sm:text-4xl mb-3">Records created by stage</h1>
          <p className="text-accent-soft max-w-2xl text-[1.02rem]">
            Quote-to-cash across eight sequential stages. Each stage lists the records
            it creates, assigns, or updates.
          </p>
        </div>
      </header>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 py-8 sm:py-10">{explorer}</div>
    </div>
  );
}
