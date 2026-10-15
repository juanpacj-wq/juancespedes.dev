/*
 * Geometry for the wires of the architecture diagram (ArchitectureDiagram.astro). The browser
 * measures the nodes; these functions only turn boxes into SVG paths, so they are testable
 * without a layout engine.
 */

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type Side = 'left' | 'right';

export interface Ends {
  readonly from: Side;
  readonly to: Side;
}

/** How far a wire bends out of a node when both ends sit in the same column. */
const LOOP = 36;

const centerX = (box: Box) => box.x + box.width / 2;

/**
 * Which sides a wire leaves and enters by: the sides that face each other, or the right side of
 * both nodes when they share a column (the wire loops out and back in).
 */
export const wireEnds = (from: Box, to: Box): Ends => {
  const overlap = from.x < to.x + to.width && to.x < from.x + from.width;
  if (overlap) return { from: 'right', to: 'right' };
  return centerX(to) > centerX(from)
    ? { from: 'right', to: 'left' }
    : { from: 'left', to: 'right' };
};

/**
 * Spreads the wires that share one side of a node over the middle of that side, so they never
 * leave from the same point. Returns the vertical offset of wire `index` of `count`.
 */
export const portOffset = (index: number, count: number, height: number): number => {
  if (count <= 1) return 0;
  const step = Math.min(12, (height * 0.6) / (count - 1));
  return (index - (count - 1) / 2) * step;
};

const edge = (box: Box, side: Side, offset: number) => ({
  x: side === 'right' ? box.x + box.width : box.x,
  y: box.y + box.height / 2 + offset,
});

/** A cubic curve between two nodes, leaving and entering horizontally. */
export const wirePath = (
  from: Box,
  to: Box,
  ends: Ends = wireEnds(from, to),
  offsets: { readonly from: number; readonly to: number } = { from: 0, to: 0 },
): string => {
  const start = edge(from, ends.from, offsets.from);
  const end = edge(to, ends.to, offsets.to);
  const pull = (side: Side, distance: number) => (side === 'right' ? distance : -distance);
  const reach =
    ends.from === ends.to
      ? Math.max(Math.abs(end.x - start.x), 0) + LOOP
      : Math.max(Math.abs(end.x - start.x) / 2, LOOP);
  const round = (value: number) => Math.round(value * 10) / 10;
  const points = [
    start.x,
    start.y,
    start.x + pull(ends.from, reach),
    start.y,
    end.x + pull(ends.to, reach),
    end.y,
    end.x,
    end.y,
  ].map(round);
  const [sx, sy, c1x, c1y, c2x, c2y, ex, ey] = points;
  return `M${String(sx)} ${String(sy)}C${String(c1x)} ${String(c1y)} ${String(c2x)} ${String(c2y)} ${String(ex)} ${String(ey)}`;
};
