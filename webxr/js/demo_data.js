// Dati demo: stelle famose reali + stelle casuali
// Usato come fallback se stars.json non e' disponibile

function raDecToXYZ(ra_deg, dec_deg) {
    const ra  = ra_deg  * Math.PI / 180;
    const dec = dec_deg * Math.PI / 180;
    return {
        x:  Math.cos(dec) * Math.cos(ra),
        y:  Math.sin(dec),                   // Y-up (Three.js)
        z: -Math.cos(dec) * Math.sin(ra)     // -Z forward (Three.js)
    };
}

const FAMOUS = [
    { label: 'Sirius',     ra: 101.29, dec: -16.72, mag: -1.46, spect: 'A', has_planet: false, n_planets: 0 },
    { label: 'Betelgeuse', ra:  88.79, dec:   7.41, mag:  0.42, spect: 'M', has_planet: false, n_planets: 0 },
    { label: 'Rigel',      ra:  78.63, dec:  -8.20, mag:  0.13, spect: 'B', has_planet: false, n_planets: 0 },
    { label: 'Vega',       ra: 279.23, dec:  38.78, mag:  0.03, spect: 'A', has_planet: false, n_planets: 0 },
    { label: 'Arcturus',   ra: 213.92, dec:  19.18, mag: -0.05, spect: 'K', has_planet: false, n_planets: 0 },
    { label: 'Aldebaran',  ra:  68.98, dec:  16.51, mag:  0.85, spect: 'K', has_planet: false, n_planets: 0 },
    { label: 'Antares',    ra: 247.35, dec: -26.43, mag:  1.09, spect: 'M', has_planet: false, n_planets: 0 },
    { label: 'Spica',      ra: 201.30, dec: -11.16, mag:  1.04, spect: 'B', has_planet: false, n_planets: 0 },
    { label: 'Deneb',      ra: 310.36, dec:  45.28, mag:  1.25, spect: 'A', has_planet: false, n_planets: 0 },
    { label: 'Fomalhaut',  ra: 344.41, dec: -29.62, mag:  1.16, spect: 'A', has_planet: true,  n_planets: 1, koi_score: 0.85 },
    // Sistemi con esopianeti noti
    { label: 'Kepler-22',  ra: 291.41, dec:  47.89, mag: 11.7,  spect: 'G', has_planet: true,  n_planets: 1, koi_score: 0.98 },
    { label: 'Kepler-442', ra: 294.17, dec:  49.30, mag: 14.0,  spect: 'K', has_planet: true,  n_planets: 1, koi_score: 0.97 },
    { label: 'Kepler-452', ra: 295.47, dec:  44.32, mag: 13.7,  spect: 'G', has_planet: true,  n_planets: 1, koi_score: 0.99 },
    { label: 'TRAPPIST-1', ra: 346.62, dec:  -5.04, mag: 18.8,  spect: 'M', has_planet: true,  n_planets: 7, koi_score: 1.00 },
    { label: '55 Cancri',  ra: 133.15, dec:  28.33, mag:  5.95, spect: 'G', has_planet: true,  n_planets: 5, koi_score: 0.95 },
    { label: 'HD 209458',  ra: 330.79, dec:  18.88, mag:  7.65, spect: 'G', has_planet: true,  n_planets: 1, koi_score: 0.99 },
    { label: 'Kepler-186', ra: 286.49, dec:  43.57, mag: 14.8,  spect: 'M', has_planet: true,  n_planets: 5, koi_score: 0.96 },
    { label: 'tau Ceti',   ra:  26.02, dec: -15.94, mag:  3.49, spect: 'G', has_planet: true,  n_planets: 4, koi_score: 0.88 },
];

export function generateDemoStars() {
    const stars = FAMOUS.map(s => ({ ...s, ...raDecToXYZ(s.ra, s.dec) }));

    const SPECTS = ['O','B','A','F','G','K','M'];

    // ~500 stelle di sfondo casuali
    for (let i = 0; i < 500; i++) {
        const ra  = Math.random() * 360;
        const dec = (Math.random() - 0.5) * 180;
        const mag = 1.8 + Math.random() * 4.7;
        const spect = SPECTS[Math.floor(Math.random() * SPECTS.length)];
        stars.push({
            label: `HIP ${10000 + i}`,
            ra, dec, mag, spect,
            has_planet: false, n_planets: 0,
            ...raDecToXYZ(ra, dec)
        });
    }

    // ~35 sistemi KOI casuali
    for (let i = 0; i < 35; i++) {
        const ra  = Math.random() * 360;
        const dec = (Math.random() - 0.5) * 180;
        const mag = 8 + Math.random() * 6;
        const n_planets = Math.floor(Math.random() * 6) + 1;
        stars.push({
            label: `KOI-${2000 + i}`,
            ra, dec, mag,
            spect: SPECTS[Math.floor(Math.random() * SPECTS.length)],
            has_planet: true, n_planets,
            koi_score: 0.65 + Math.random() * 0.35,
            ...raDecToXYZ(ra, dec)
        });
    }

    return stars;
}
