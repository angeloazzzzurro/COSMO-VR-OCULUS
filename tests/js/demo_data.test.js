import { describe, it, expect, beforeAll } from 'vitest'
import { generateDemoStars, CONSTELLATIONS } from '../../webxr/js/demo_data.js'

const VALID_SPECTRAL_TYPES = new Set(['O', 'B', 'A', 'F', 'G', 'K', 'M'])
const REQUIRED_STAR_FIELDS = ['x', 'y', 'z', 'mag', 'spect', 'has_planet', 'n_planets', 'label']

describe('generateDemoStars', () => {
  let stars
  beforeAll(() => { stars = generateDemoStars() })

  it('returns a non-empty array', () => {
    expect(Array.isArray(stars)).toBe(true)
    expect(stars.length).toBeGreaterThan(0)
  })

  it('contains at least the 9 famous exoplanet hosts', () => {
    const hosts = stars.filter(s => s.has_planet)
    expect(hosts.length).toBeGreaterThanOrEqual(9)
  })

  it('all stars have every required field', () => {
    for (const star of stars) {
      for (const field of REQUIRED_STAR_FIELDS) {
        expect(star, `Star "${star.label}" missing field "${field}"`).toHaveProperty(field)
      }
    }
  })

  it('all xyz coordinates form a unit vector', () => {
    for (const star of stars) {
      const mag = Math.sqrt(star.x ** 2 + star.y ** 2 + star.z ** 2)
      expect(mag, `Star "${star.label}" xyz not unit: mag=${mag}`).toBeCloseTo(1, 5)
    }
  })

  it('all spectral types are valid OBAFGKM codes', () => {
    for (const star of stars) {
      expect(
        VALID_SPECTRAL_TYPES.has(star.spect),
        `Invalid spectral type "${star.spect}" for "${star.label}"`
      ).toBe(true)
    }
  })

  it('planet-host stars always have n_planets >= 1', () => {
    for (const star of stars.filter(s => s.has_planet)) {
      expect(star.n_planets, `Host "${star.label}" has n_planets=${star.n_planets}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('non-planet stars always have n_planets === 0', () => {
    for (const star of stars.filter(s => !s.has_planet)) {
      expect(star.n_planets, `Normal star "${star.label}" has n_planets=${star.n_planets}`).toBe(0)
    }
  })

  it('all magnitudes are finite numbers', () => {
    for (const star of stars) {
      expect(Number.isFinite(star.mag), `Non-finite mag for "${star.label}"`).toBe(true)
    }
  })

  it('includes the expected famous stars', () => {
    const labels = new Set(stars.map(s => s.label))
    for (const name of ['Sirius', 'Betelgeuse', 'Rigel', 'Vega', 'Arcturus', 'TRAPPIST-1', '55 Cancri', 'tau Ceti']) {
      expect(labels.has(name), `Missing famous star: "${name}"`).toBe(true)
    }
  })

  it('TRAPPIST-1 has 7 planets', () => {
    const trappist = stars.find(s => s.label === 'TRAPPIST-1')
    expect(trappist).toBeDefined()
    expect(trappist.n_planets).toBe(7)
  })

  it('procedurally generated stars have labels starting with HIP or KOI', () => {
    const generated = stars.filter(s => s.label.startsWith('HIP ') || s.label.startsWith('KOI-'))
    expect(generated.length).toBeGreaterThan(0)
  })

  it('koi_score for planet hosts is in (0, 1]', () => {
    for (const star of stars.filter(s => s.has_planet && s.koi_score != null)) {
      expect(star.koi_score).toBeGreaterThan(0)
      expect(star.koi_score).toBeLessThanOrEqual(1)
    }
  })
})

describe('CONSTELLATIONS constant', () => {
  it('exports exactly 5 constellation definitions', () => {
    expect(CONSTELLATIONS).toHaveLength(5)
  })

  it('each constellation has name, color, and lines array', () => {
    for (const c of CONSTELLATIONS) {
      expect(typeof c.name).toBe('string')
      expect(typeof c.color).toBe('number')
      expect(Array.isArray(c.lines)).toBe(true)
      expect(c.lines.length).toBeGreaterThan(0)
    }
  })

  it('each constellation line connects two named stars', () => {
    for (const c of CONSTELLATIONS) {
      for (const [a, b] of c.lines) {
        expect(typeof a).toBe('string')
        expect(typeof b).toBe('string')
        expect(a).not.toBe(b)
      }
    }
  })

  it('constellation line endpoints exist in the FAMOUS star list', () => {
    const stars = generateDemoStars()
    const labels = new Set(stars.map(s => s.label))
    for (const c of CONSTELLATIONS) {
      for (const [a, b] of c.lines) {
        expect(labels.has(a), `Constellation "${c.name}" references unknown star "${a}"`).toBe(true)
        expect(labels.has(b), `Constellation "${c.name}" references unknown star "${b}"`).toBe(true)
      }
    }
  })
})
