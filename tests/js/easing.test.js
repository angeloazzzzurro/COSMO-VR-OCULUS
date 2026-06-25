import { describe, it, expect } from 'vitest'

// The fly-to easing from main.js updateFly():
//   e = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t
// This is a symmetric ease-in-out (quadratic). These tests verify
// the mathematical invariants that guarantee smooth camera flight.

function ease(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

describe('fly-to easing formula', () => {
  it('ease(0) === 0 (starts at origin)', () => {
    expect(ease(0)).toBe(0)
  })

  it('ease(1) === 1 (ends at destination)', () => {
    expect(ease(1)).toBeCloseTo(1, 10)
  })

  it('ease(0.5) === 0.5 (symmetric midpoint)', () => {
    expect(ease(0.5)).toBeCloseTo(0.5, 10)
  })

  it('is continuous at t=0.5 (no jump at the branch boundary)', () => {
    const eps = 1e-9
    expect(ease(0.5 - eps)).toBeCloseTo(ease(0.5 + eps), 5)
  })

  it('is monotonically non-decreasing on [0, 1]', () => {
    let prev = ease(0)
    for (let i = 1; i <= 200; i++) {
      const curr = ease(i / 200)
      expect(curr).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = curr
    }
  })

  it('stays within [0, 1] for all t in [0, 1]', () => {
    for (let i = 0; i <= 200; i++) {
      const e = ease(i / 200)
      expect(e).toBeGreaterThanOrEqual(-1e-12)
      expect(e).toBeLessThanOrEqual(1 + 1e-12)
    }
  })

  it('first half (t < 0.5) accelerates (convex: ease(t) < t)', () => {
    for (let i = 1; i < 10; i++) {
      const t = i / 20  // 0.05 … 0.45
      expect(ease(t)).toBeLessThan(t)
    }
  })

  it('second half (t > 0.5) decelerates (concave: ease(t) > t)', () => {
    for (let i = 11; i < 20; i++) {
      const t = i / 20  // 0.55 … 0.95
      expect(ease(t)).toBeGreaterThan(t)
    }
  })

  it('is symmetric: ease(1-t) === 1 - ease(t)', () => {
    for (let i = 0; i <= 10; i++) {
      const t = i / 10
      expect(ease(1 - t)).toBeCloseTo(1 - ease(t), 10)
    }
  })
})
