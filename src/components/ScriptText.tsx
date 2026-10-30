import type { ReactNode } from "react";
import { splitByScript } from "../lib/script";

/**
 * Render a mixed-script string with each run in its own face and language.
 *
 * The studio writes captions that mix an English sentence with a Tamil and a
 * Hindi greeting. Left as one run they are painted by the Latin stack, which
 * has no Tamil or Devanagari glyphs at all, so the browser silently substitutes
 * a system face — and any tracking on the container applies to the substitution.
 * Marking each run fixes both: `lang` selects a hosted face and the stylesheet
 * drops letter-spacing for it.
 */
export function ScriptText({ text, className }: { text: string; className?: string }) {
  const runs = splitByScript(text);
  if (runs.length === 1 && runs[0].script === "latin") return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {runs.map((run, index): ReactNode => {
        if (run.script === "tamil") {
          return (
            <span key={index} lang="ta" className="font-tamil">
              {run.text}
            </span>
          );
        }
        if (run.script === "devanagari") {
          return (
            <span key={index} lang="hi" className="font-hindi">
              {run.text}
            </span>
          );
        }
        return <span key={index}>{run.text}</span>;
      })}
    </span>
  );
}
