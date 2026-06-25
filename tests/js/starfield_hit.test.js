import { describe, it, expect, beforeAll } from 'vitest'
import { createStarfield } from '../../webxr/js/starfield.js'

const RADIUS = 500

function normal(label, ra, dec, mag, spect = 'G') {
  const r = ra * Math.PI / 180
  const d = dec * Math.PI / 180
  return { label, ra, dec, mag, spect,
    x:  Math.cos(d) * Math.cos(r),
    y:  Math.sin(d),
    z: -Math.cos(d) * Math.sin(r),
    has_planet: false, n_planets: 0 }
}

function host(label, ra, dec, mag, n_planets, koi_score = 0.9) {
  const r = ra * Math.PI / 180
  const d = dec * Math.PI / 180
  return { label, ra, dec, mag, spect: 'G',
    x:  Math.cos(d) * Math.cos(r),
    y:  Math.sin(d),
    z: -Math.cos(d) * Math.sin(r),
    has_planet: true, n_planets, koi_score }
}

const INPUT_STARS = [
  normal('Sirius',      101.29, -16.72, -1.46, 'A'),
  normal('Betelgeuse',   88.79,   7.41,  0.42, 'M'),
  normal('Vega',        279.23,  38.78,  0.03, 'A'),
  host('TRAPPIST-1',   346.62,  -5.04, 18.8,  7, 1.00),
  host('55 Cancri',    133.15,  28.33,  5.95, 5, 0.95),
  host('tau Ceti',      26.02, -15.94,  3.49, 4, 0.88),
]

// ── getStarByHit ──────────────────────────────────────────────────────────────
// This function is a closure inside createStarfield. It resolves a raycaster
// intersection (hit.object + hit.index / hit.instanceId) to the star object.
// The critical invariant: the hit.object reference must match the exact
// Three.js object created inside createStarfield, not a copy.

describe('getStarByHit', () => {
  let sf
  beforeAll(() => { sf = createStarfield(INPUT_STARS, RADIUS) })

  // ── normal stars (Points geometry, resolved by hit.index) ─────────────────

  it('normalPoints hit index 0 → Sirius', () => {
    expect(sf.getStarByHit({ object: sf.normalPoints, index: 0 })?.label).toBe('Sirius')
  })

  it('normalPoints hit index 1 → Betelgeuse', () => {
    expect(sf.getStarByHit({ object: sf.normalPoints, index: 1 })?.label).toBe('Betelgeuse')
  })

  it('normalPoints hit index 2 → Vega', () => {
    expect(sf.getStarByHit({ object: sf.normalPoints, index: 2 })?.label).toBe('Vega')
  })

  it('returns the exact same object reference (no copy)', () => {
    const returned = sf.getStarByHit({ object: sf.normalPoints, index: 0 })
    expect(returned).toBe(sf.normalStars[0])
  })

  // ── host stars (InstancedMesh, resolved by hit.instanceId) ────────────────

  it('hostMesh hit instanceId 0 → TRAPPIST-1', () => {
    expect(sf.getStarByHit({ object: sf.hostMesh, instanceId: 0 })?.label).toBe('TRAPPIST-1')
  })

  it('hostMesh hit instanceId 1 → 55 Cancri', () => {
    expect(sf.getStarByHit({ object: sf.hostMesh, instanceId: 1 })?.label).toBe('55 Cancri')
  })

  it('hostMesh hit instanceId 2 → tau Ceti', () => {
    expect(sf.getStarByHit({ object: sf.hostMesh, instanceId: 2 })?.label).toBe('tau Ceti')
  })

  it('host hit returns the exact same object reference (no copy)', () => {
    const returned = sf.getStarByHit({ object: sf.hostMesh, instanceId: 0 })
    expect(returned).toBe(sf.hostStars[0])
  })

  // ── unknown / invalid hit objects ─────────────────────────────────────────

  it('hit on unknown object → null', () => {
    expect(sf.getStarByHit({ object: {}, index: 0 })).toBeNull()
  })

  it('hit on haloMesh (not a selectable target) → null', () => {
    expect(sf.getStarByHit({ object: sf.haloMesh, instanceId: 0 })).toBeNull()
  })

  // ── partition invariants ──────────────────────────────────────────────────

  it('normalStars contains no planet hosts', () => {
    expect(sf.normalStars.every(s => !s.has_planet)).toBe(true)
  })

  it('hostStars contains only planet hosts', () => {
    expect(sf.hostStars.every(s => s.has_planet)).toBe(true)
  })

  it('normalStars + hostStars = all input stars', () => {
    expect(sf.normalStars.length + sf.hostStars.length).toBe(INPUT_STARS.length)
  })

  it('normalStars length matches non-host inputs', () => {
    expect(sf.normalStars.length).toBe(INPUT_STARS.filter(s => !s.has_planet).length)
  })

  it('hostStars length matches host inputs', () => {
    expect(sf.hostStars.length).toBe(INPUT_STARS.filter(s => s.has_planet).length)
  })
})

// ── setHover ──────────────────────────────────────────────────────────────────
// setHover is the public entry point for hover state. It calls getStarByHit
// internally and positions the hover ring. These tests verify the return
// contract and the hover ring visibility toggle.

describe('setHover', () => {
  let sf
  beforeAll(() => { sf = createStarfield(INPUT_STARS, RADIUS) })

  it('null hit → returns null', () => {
    expect(sf.setHover(null)).toBeNull()
  })

  it('null hit → hoverRing is hidden', () => {
    sf.setHover(null)
    const ring = sf.group.children.find(c => c.geometry?.type === 'RingGeometry')
    expect(ring?.visible).toBe(false)
  })

  it('valid normalPoints hit → returns the star', () => {
    const star = sf.setHover({ object: sf.normalPoints, index: 0 })
    expect(star?.label).toBe('Sirius')
  })

  it('valid normalPoints hit → hoverRing becomes visible', () => {
    sf.setHover({ object: sf.normalPoints, index: 0 })
    const ring = sf.group.children.find(c => c.geometry?.type === 'RingGeometry')
    expect(ring?.visible).toBe(true)
  })

  it('valid hostMesh hit → returns the host star', () => {
    const star = sf.setHover({ object: sf.hostMesh, instanceId: 0 })
    expect(star?.label).toBe('TRAPPIST-1')
  })

  it('hit on unknown object → returns null and hides ring', () => {
    sf.setHover({ object: sf.normalPoints, index: 0 })  // first make it visible
    const star = sf.setHover({ object: {}, index: 0 })
    expect(star).toBeNull()
    const ring = sf.group.children.find(c => c.geometry?.type === 'RingGeometry')
    expect(ring?.visible).toBe(false)
  })
})

// ── update (animation pulse) ──────────────────────────────────────────────────
// Verifies the animation loop callback doesn't throw and produces valid state.

describe('update', () => {
  let sf
  beforeAll(() => { sf = createStarfield(INPUT_STARS, RADIUS) })

  it('does not throw at t=0', () => {
    expect(() => sf.update(0)).not.toThrow()
  })

  it('does not throw at t=10.5 (mid-session timestamp)', () => {
    expect(() => sf.update(10.5)).not.toThrow()
  })

  it('halo scale is always positive after update', () => {
    sf.update(3.14)
    expect(sf.haloMesh.scale.x).toBeGreaterThan(0)
  })
})
