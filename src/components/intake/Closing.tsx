import { useState } from "react";
import { useOrigination } from "@/lib/intake/store";

export function DocumentsStage() {
  const documents = useOrigination((s) => s.documents);
  const updateDocument = useOrigination((s) => s.updateDocument);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = documents.length > 0 && documents.every((d) => d.imagedAck && d.reviewed);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Documents — Sam Ruiz. A document is not filed without imaging ACK and review.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}
      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        <ul className="grid gap-3 mb-0">
          {documents.map((doc) => (
            <li key={doc.documentId} className="flex flex-wrap items-center justify-between gap-3 border border-line rounded-md px-3 py-3">
              <div>
                <p className="font-medium mb-0">{doc.name}</p>
                <p className="text-xs text-ink-faint mb-0">{doc.status}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`h-10 px-3 rounded-md text-sm border ${doc.imagedAck ? "bg-good-wash text-good border-line" : "bg-white border-line"}`}
                  onClick={() =>
                    updateDocument({ documentId: doc.documentId, imagedAck: !doc.imagedAck, reviewed: doc.reviewed }).catch(
                      (err) => setError(err instanceof Error ? err.message : "Update failed."),
                    )
                  }
                >
                  ACK
                </button>
                <button
                  type="button"
                  className={`h-10 px-3 rounded-md text-sm border ${doc.reviewed ? "bg-good-wash text-good border-line" : "bg-white border-line"}`}
                  onClick={() =>
                    updateDocument({ documentId: doc.documentId, imagedAck: doc.imagedAck, reviewed: !doc.reviewed }).catch(
                      (err) => setError(err instanceof Error ? err.message : "Update failed."),
                    )
                  }
                >
                  Reviewed
                </button>
              </div>
            </li>
          ))}
        </ul>
      </article>
      {ready ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await advanceStage();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not advance.");
            } finally {
              setBusy(false);
            }
          }}
          className="justify-self-start h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40"
        >
          Move to Financing
        </button>
      ) : null}
    </div>
  );
}

export function FinancingStage() {
  const guaranty = useOrigination((s) => s.guaranty);
  const authorizeGuaranty = useOrigination((s) => s.authorizeGuaranty);
  const advanceStage = useOrigination((s) => s.advanceStage);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Financing — human-authorized E-Tran. Workers never invent a guaranty number.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}
      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        {guaranty?.status === "accepted" ? (
          <p className="text-sm text-good mb-0">
            Accepted · {guaranty.guarantyNumber}. {guaranty.summary}
          </p>
        ) : (
          <p className="text-sm text-ink-soft mb-0">No guaranty number until you authorize.</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            disabled={busy || guaranty?.status === "accepted"}
            onClick={async () => {
              setBusy(true);
              try {
                await authorizeGuaranty();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Authorization failed.");
              } finally {
                setBusy(false);
              }
            }}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40"
          >
            Authorize E-Tran
          </button>
          {guaranty?.status === "accepted" ? (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await advanceStage();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not advance.");
                } finally {
                  setBusy(false);
                }
              }}
              className="h-11 px-4 rounded-md border border-line bg-white text-sm font-medium"
            >
              Move to Closure
            </button>
          ) : null}
        </div>
      </article>
    </div>
  );
}

export function ClosureStage() {
  const ledger = useOrigination((s) => s.ledger);
  const postLedger = useOrigination((s) => s.postLedger);
  const stageStatus = useOrigination((s) => s.stageStatus);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-soft rounded-md border border-line bg-white px-4 py-3">
        Closure — dual-control ledger post seals the process. A draft is not a post.
      </p>
      {error ? <p className="text-sm text-bad mb-0">{error}</p> : null}
      <article className="rounded-lg bg-white border border-line p-5 sm:p-6">
        {stageStatus === "sealed" ? (
          <p className="text-sm text-good mb-0">Sealed. {ledger?.summary}</p>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await postLedger();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Post failed.");
              } finally {
                setBusy(false);
              }
            }}
            className="h-11 px-4 rounded-md bg-navy text-paper text-sm font-medium disabled:opacity-40"
          >
            Dual-control post and seal
          </button>
        )}
      </article>
    </div>
  );
}
