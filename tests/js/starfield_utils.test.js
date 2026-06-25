import { describe, it, expect } from 'vitest'
import { planetColor } from '../../webxr/js/starfield.js'

// ── planetColor ───────────────────────────────────────────────────────────────
// Maps exoplanet count to a THREE.Color:
//   1 planet  → gold   (0xFFD700)
//   2-3 planets → orange (0xFF8C00)
//   4+ planets → red    (0xFF3300)

describe('planetColor', () => {
  it('1 planet → gold (0xFFD700)', () => {
    expect(planetColor(1).getHex()).toBe(0xFFD700)
  })

  it('2 planets → orange (0xFF8C00)', () => {
    expect(planetColor(2).getHex()).toBe(0xFF8C00)
  })

  it('3 planets → orange (0xFF8C00)', () => {
    expect(planetColor(3).getHex()).toBe(0xFF8C00)
  })

  it('4 planets → red (0xFF3300)', () => {
    expect(planetColor(4).getHex()).toBe(0xFF3300)
  })

  it('6 planets (max generated) → red (0xFF3300)', () => {
    expect(planetColor(6).getHex()).toBe(0xFF3300)
  })

  it('returns a THREE.Color instance (has clone method)', () => {
    const col = planetColor(1)
    expect(typeof col.clone).toBe('function')
    expect(col.clone().getHex()).toBe(col.getHex())
  })

  it('color boundary: 3 planets (orange) vs 4 planets (red) differs', () => {
    expect(planetColor(3).getHex()).not.toBe(planetColor(4).getHex())
  })

  it('color boundary: 1 planet (gold) vs 2 planets (orange) differs', () => {
    expect(planetColor(1).getHex()).not.toBe(planetColor(2).getHex())
  })
})
