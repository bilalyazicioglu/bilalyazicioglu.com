import { Fragment } from "react";

/**
 * Text drawn on a character grid. Plain ASCII is left as it is — every
 * monospace face has it at one cell's width — but each other character gets
 * a cell of its own, exactly 1ch wide with the glyph centred in it. A phone's
 * monospace face often lacks the box-drawing and block characters, and the
 * face it borrows them from is wider: left loose, ┌─────┐ would end past the
 * │ below it. Pinned, a wide ─ overlaps its neighbours and still reads as one
 * line, and corners stay over the sides they join.
 */
export function Cells({ text }: { text: string }) {
  return text.split(/([^\x00-\x7e])/u).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="tc-cell">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}
