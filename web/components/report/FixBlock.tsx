import { FIX_LABEL } from "@/lib/labels";
import type { Fix } from "@/lib/types";

/** The concrete fix: copy edit, CSS patch or flow change, each shown as before/after. */
export function FixBlock({ fix }: { fix: Fix }) {
  const before = fix.before.trim();
  const after = fix.after.trim();

  return (
    <div className="mt-6 border-t border-line pt-4">
      <p className="text-13 font-semibold text-ink">{FIX_LABEL[fix.type]}</p>
      <p className="mt-1 text-15 text-ink">{fix.summary}</p>

      {fix.type === "css" ? (
        <div className="mt-3 flex flex-col gap-3">
          {before ? <CodeSample label="Before" code={before} muted /> : null}
          {after ? <CodeSample label="After" code={after} /> : null}
        </div>
      ) : before || after ? (
        <dl className="mt-3 grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-3 gap-y-2">
          {before ? (
            <>
              <dt className="pt-px text-13 text-ink-2">{fix.type === "flow" ? "Now" : "Before"}</dt>
              <dd className="text-15 text-ink-2">
                {fix.type === "copy" ? (
                  <del className="decoration-signal decoration-1">{before}</del>
                ) : (
                  <FlowPath text={before} />
                )}
              </dd>
            </>
          ) : null}
          {after ? (
            <>
              <dt className="pt-px text-13 text-ink-2">{fix.type === "flow" ? "Proposed" : "After"}</dt>
              <dd className="text-15 text-ink">{fix.type === "copy" ? <ins className="no-underline">{after}</ins> : <FlowPath text={after} />}</dd>
            </>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

function CodeSample({ label, code, muted = false }: { label: string; code: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-13 text-ink-2">{label}</p>
      <pre
        className={`mt-1 rounded-control border border-line p-3 font-mono text-13 leading-[1.55] break-words whitespace-pre-wrap ${
          muted ? "bg-transparent text-ink-2" : "bg-card text-ink"
        }`}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** "Home → Sign up → Project" with quiet separators. */
function FlowPath({ text }: { text: string }) {
  const parts = text
    .split(/\s*(?:→|->)\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return <>{text}</>;
  return (
    <span>
      {parts.map((part, i) => (
        <span key={`${part}-${i}`}>
          {i > 0 ? (
            <>
              {/* Non-breaking before the arrow keeps it on the line of the step it follows. */}
              {" "}
              <span aria-hidden="true" className="text-ink-2">
                →
              </span>
              <span className="sr-only">then</span>{" "}
            </>
          ) : null}
          {/* Break between steps, not inside them (unless a step is long). */}
          <span className={part.length <= 28 ? "whitespace-nowrap" : undefined}>{part}</span>
        </span>
      ))}
    </span>
  );
}
