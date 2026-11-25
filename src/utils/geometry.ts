import { ScreenPoint } from '../types';

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance2D(p1: ScreenPoint, p2: ScreenPoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Minimum distance between a point P and line segment AB.
 * Returns the distance and closest point on segment.
 */
export function pointToSegmentDistance(
  p: ScreenPoint,
  a: ScreenPoint,
  b: ScreenPoint
): { distance: number; projection: ScreenPoint; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return {
      distance: distance2D(p, a),
      projection: a,
      t: 0,
    };
  }

  // Projection scalar t clamped to [0, 1]
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  const proj: ScreenPoint = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };

  return {
    distance: distance2D(p, proj),
    projection: proj,
    t,
  };
}

/**
 * Checks if segment P1-P2 intersects segment A-B (finger trajectory crossing the string).
 */
export function segmentsIntersect(
  p1: ScreenPoint,
  p2: ScreenPoint,
  a: ScreenPoint,
  b: ScreenPoint
): { intersects: boolean; intersection?: ScreenPoint } {
  const det = (p2.x - p1.x) * (b.y - a.y) - (p2.y - p1.y) * (b.x - a.x);
  if (Math.abs(det) < 0.0001) return { intersects: false };

  const lambda = ((b.y - a.y) * (b.x - p1.x) + (a.x - b.x) * (b.y - p1.y)) / det;
  const gamma = ((p1.y - p2.y) * (b.x - p1.x) + (p2.x - p1.x) * (b.y - p1.y)) / det;

  const intersects = lambda > 0 && lambda < 1 && gamma > 0 && gamma < 1;
  if (!intersects) return { intersects: false };

  return {
    intersects: true,
    intersection: {
      x: p1.x + lambda * (p2.x - p1.x),
      y: p1.y + lambda * (p2.y - p1.y),
    },
  };
}
