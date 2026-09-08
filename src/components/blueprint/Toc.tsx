import { ALL_SECTIONS, TOC } from "@/lib/blueprint/toc";
import { useEffect, useState } from "react";

export function Toc() {
  const [active, setActive] = useState(ALL_SECTIONS[0]?.id ?? "");

  useEffect(() => {
    const ids = ALL_SECTIONS.map((s) => s.id);
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (vis?.target.id) setActive(vis.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0.1, 0.4] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <nav className="hidden lg:block sticky top-0 h-screen overflow-y-auto border-r border-line py-12 px-5 no-print">
      <p className="font-mono text-[0.7rem] tracking-wide text-ink-faint mb-4">Contents</p>
      {TOC.map((g) => (
        <div key={g.title} className="mb-4">
          <p className="font-mono text-[0.66rem] text-accent tracking-wide mb-1.5">{g.title}</p>
          <ol className="list-none m-0 p-0">
            {g.items.map((s) => (
              <li key={s.id} className="mb-1.5">
                <a
                  href={`#${s.id}`}
                  className={`flex gap-2 no-underline text-[0.82rem] ${
                    active === s.id ? "text-navy font-medium" : "text-ink-soft"
                  }`}
                >
                  <span className="font-mono text-[0.72rem] text-accent shrink-0">{s.n}</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </nav>
  );
}
