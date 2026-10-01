import type { ReactNode } from "react";

export function Section({
  id,
  n,
  title,
  children,
}: {
  id: string;
  n: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mb-16 scroll-mt-6">
      <h2 className="text-[1.55rem] flex items-baseline gap-2.5 border-b border-line pb-2.5 mb-5">
        <span className="font-mono text-[0.95rem] font-medium text-accent">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function Lede({ children }: { children: ReactNode }) {
  return <p className="text-[1.03rem] text-ink-soft max-w-[72ch] mb-5">{children}</p>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="max-w-[76ch] mb-4">{children}</p>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-[1.1rem] mt-7 mb-3">{children}</h3>;
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-[3px] border-accent bg-white px-4 py-3 my-5 text-[0.95rem] text-ink-soft max-w-[76ch]">
      {children}
    </blockquote>
  );
}

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-line p-4 sm:p-5">
      <h4 className="font-serif text-navy text-base mt-0 mb-2">{title}</h4>
      <div className="text-[0.9rem] text-ink-soft">{children}</div>
    </div>
  );
}

export function Grid({ cols, children }: { cols: 2 | 3; children: ReactNode }) {
  return (
    <div
      className={`grid gap-4 my-5 ${cols === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
    >
      {children}
    </div>
  );
}

export function DocTable({
  caption,
  headers,
  rows,
}: {
  caption?: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="max-w-full overflow-x-auto my-5">
      {caption ? (
        <p className="font-mono text-[0.7rem] text-ink-faint mb-2">{caption}</p>
      ) : null}
      <table className="w-full text-[0.89rem] border-collapse min-w-[520px]">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left font-semibold text-navy border-b-2 border-navy px-2.5 py-2"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-2.5 py-2.5 border-b border-line align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="pl-5 max-w-[74ch] mb-4">
      {items.map((item, i) => (
        <li key={i} className="mb-1.5">
          {item}
        </li>
      ))}
    </ul>
  );
}
