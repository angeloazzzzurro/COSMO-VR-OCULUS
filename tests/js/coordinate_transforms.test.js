import { describe, it, expect } from 'vitest'
import { raDecToXYZ } from '../../webxr/js/demo_data.js'
import { galToEq } from '../../webxr/js/milkyway.js'
import { rd } from '../../webxr/js/constellations.js'

// ── raDecToXYZ ────────────────────────────────────────────────────────────────
// Pure math: converts RA/Dec spherical coords → Three.js cartesian unit vector
// Formula: x = cos(dec)*cos(ra), y = sin(dec), z = -cos(dec)*sin(ra)

describe('raDecToXYZ', () => {
  it('ra=0 dec=0 → positive X axis', () => {
    const { x, y, z } = raDecToXYZ(0, 0)
    expect(x).toBeCloseTo(1, 9)
    expect(y).toBeCloseTo(0, 9)
    expect(z).toBeCloseTo(0, 9)
  })

  it('dec=+90 (north pole) → positive Y axis', () => {
    const { x, y, z } = raDecToXYZ(0, 90)
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(1, 9)
    expect(z).toBeCloseTo(0, 5)
  })

  it('dec=-90 (south pole) → negative Y axis', () => {
    const { x, y, z } = raDecToXYZ(0, -90)
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(-1, 9)
    expect(z).toBeCloseTo(0, 5)
  })

  it('ra=180 dec=0 → negative X axis', () => {
    const { x, y, z } = raDecToXYZ(180, 0)
    expect(x).toBeCloseTo(-1, 9)
    expect(y).toBeCloseTo(0, 9)
    expect(z).toBeCloseTo(0, 5)
  })

  it('ra=90 dec=0 → negative Z axis (Three.js right-hand convention)', () => {
    // z = -cos(0)*sin(90°) = -1
    const { x, y, z } = raDecToXYZ(90, 0)
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(0, 9)
    expect(z).toBeCloseTo(-1, 9)
  })

  it('output is always a unit vector', () => {
    const cases = [[101.29, -16.72], [88.79, 7.41], [344.41, -29.62], [0, 45], [270, -60]]
    for (const [ra, dec] of cases) {
      const { x, y, z } = raDecToXYZ(ra, dec)
      const mag = Math.sqrt(x * x + y * y + z * z)
      expect(mag).toBeCloseTo(1, 9)
    }
  })

  it('matches explicit formula for Betelgeuse (RA=88.79°, Dec=7.41°)', () => {
    const ra = 88.79 * Math.PI / 180
    const dec = 7.41 * Math.PI / 180
    const { x, y, z } = raDecToXYZ(88.79, 7.41)
    expect(x).toBeCloseTo(Math.cos(dec) * Math.cos(ra), 9)
    expect(y).toBeCloseTo(Math.sin(dec), 9)
    expect(z).toBeCloseTo(-Math.cos(dec) * Math.sin(ra), 9)
  })
})

// ── galToEq ───────────────────────────────────────────────────────────────────
// Galactic → Equatorial J2000 coordinate transform using the IAU rotation matrix.
// Galactic center (l=0, b=0) ≈ RA 266.4°, Dec −28.9°

describe('galToEq', () => {
  it('galactic center (l=0, b=0) maps to ~RA 266.4°, Dec −28.9°', () => {
    const { ra, dec } = galToEq(0, 0)
    expect(ra).toBeCloseTo(266.4, 0)
    expect(dec).toBeCloseTo(-28.9, 0)
  })

  it('north galactic pole (b=+90) maps to ~RA 192.85°, Dec +27.13°', () => {
    const { ra, dec } = galToEq(0, 90)
    expect(ra).toBeCloseTo(192.85, 0)
    expect(dec).toBeCloseTo(27.13, 0)
  })

  it('south galactic pole (b=−90) maps to ~RA 12.85°, Dec −27.13°', () => {
    const { ra, dec } = galToEq(0, -90)
    expect(ra).toBeCloseTo(12.85, 0)
    expect(dec).toBeCloseTo(-27.13, 0)
  })

  it('output RA is always in [0, 360)', () => {
    const samples = [[0, 0], [90, 30], [180, 0], [270, -30], [359, 15], [0, -75]]
    for (const [l, b] of samples) {
      const { ra } = galToEq(l, b)
      expect(ra).toBeGreaterThanOrEqual(0)
      expect(ra).toBeLessThan(360)
    }
  })

  it('output Dec is always in [−90, +90]', () => {
    const samples = [[0, 0], [90, 45], [180, -45], [270, 80], [45, -80]]
    for (const [l, b] of samples) {
      const { dec } = galToEq(l, b)
      expect(dec).toBeGreaterThanOrEqual(-90)
      expect(dec).toBeLessThanOrEqual(90)
    }
  })

  it('is deterministic – same input always produces same output', () => {
    const a = galToEq(123.45, -32.1)
    const b = galToEq(123.45, -32.1)
    expect(a.ra).toBe(b.ra)
    expect(a.dec).toBe(b.dec)
  })
})

// ── rd (constellations.js) ────────────────────────────────────────────────────
// Same math as raDecToXYZ but returns a THREE.Vector3 scaled by radius r.

describe('rd', () => {
  it('ra=0 dec=0 r=500 → Vector3(500, 0, 0)', () => {
    const v = rd(0, 0, 500)
    expect(v.x).toBeCloseTo(500, 4)
    expect(v.y).toBeCloseTo(0, 4)
    expect(v.z).toBeCloseTo(0, 4)
  })

  it('north pole r=1 → Vector3(~0, 1, ~0)', () => {
    const v = rd(0, 90, 1)
    expect(v.x).toBeCloseTo(0, 4)
    expect(v.y).toBeCloseTo(1, 9)
    expect(v.z).toBeCloseTo(0, 4)
  })

  it('scales linearly with radius', () => {
    const v1 = rd(88.79, 7.41, 1)
    const v2 = rd(88.79, 7.41, 250)
    expect(v2.x).toBeCloseTo(v1.x * 250, 5)
    expect(v2.y).toBeCloseTo(v1.y * 250, 5)
    expect(v2.z).toBeCloseTo(v1.z * 250, 5)
  })

  it('output vector has magnitude equal to radius', () => {
    const r = 478
    const v = rd(134.5, -23.7, r)
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    expect(mag).toBeCloseTo(r, 6)
  })

  it('is consistent with raDecToXYZ for the same star', () => {
    const xyz = raDecToXYZ(88.79, 7.41)
    const v = rd(88.79, 7.41, 1)
    expect(v.x).toBeCloseTo(xyz.x, 9)
    expect(v.y).toBeCloseTo(xyz.y, 9)
    expect(v.z).toBeCloseTo(xyz.z, 9)
  })
})
