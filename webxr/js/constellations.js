import * as THREE from 'three';

// Converte RA/Dec in vettore Three.js sulla sfera di raggio r
function rd(ra_deg, dec_deg, r) {
    const ra  = ra_deg  * Math.PI / 180;
    const dec = dec_deg * Math.PI / 180;
    return new THREE.Vector3(
         Math.cos(dec) * Math.cos(ra),
         Math.sin(dec),
        -Math.cos(dec) * Math.sin(ra)
    ).multiplyScalar(r);
}

/**
 * Segmenti di costellazione: coppie [ra, dec] per ogni lato della figura.
 * Coordinate reali dal catalogo HYG.
 */
const CONSTELLATIONS = {

    Orion: [
        // Cintura
        [[83.00, -0.30], [84.05, -1.20]],   // Mintaka → Alnilam
        [[84.05, -1.20], [85.19, -1.94]],   // Alnilam → Alnitak
        // Spalle
        [[88.79,  7.41], [81.28,  6.35]],   // Betelgeuse → Bellatrix
        // Spalle → cintura
        [[88.79,  7.41], [85.19, -1.94]],   // Betelgeuse → Alnitak
        [[81.28,  6.35], [83.00, -0.30]],   // Bellatrix  → Mintaka
        // Gambe
        [[85.19, -1.94], [86.94, -9.67]],   // Alnitak → Saiph
        [[83.00, -0.30], [78.63, -8.20]],   // Mintaka → Rigel
        // Testa
        [[83.78,  9.93], [88.79,  7.41]],   // Meissa → Betelgeuse
        [[83.78,  9.93], [81.28,  6.35]],   // Meissa → Bellatrix
    ],

    Cassiopeia: [
        // Forma a W
        [[ 2.29, 59.15], [10.13, 56.54]],   // Caph    → Schedar
        [[10.13, 56.54], [14.18, 60.72]],   // Schedar → Gamma
        [[14.18, 60.72], [21.45, 60.24]],   // Gamma   → Ruchbah
        [[21.45, 60.24], [28.60, 63.67]],   // Ruchbah → Segin
    ],

    'Ursa Major': [
        // Grande Carro
        [[165.93, 61.75], [165.46, 56.38]], // Dubhe  → Merak
        [[165.46, 56.38], [178.46, 53.69]], // Merak  → Phecda
        [[178.46, 53.69], [183.86, 57.03]], // Phecda → Megrez
        [[183.86, 57.03], [165.93, 61.75]], // Megrez → Dubhe  (chiude il quadrato)
        [[183.86, 57.03], [193.51, 55.96]], // Megrez → Alioth
        [[193.51, 55.96], [200.98, 54.93]], // Alioth → Mizar
        [[200.98, 54.93], [206.89, 49.31]], // Mizar  → Alkaid
    ],

    Scorpius: [
        // Corpo
        [[247.35, -26.43], [244.58, -19.81]], // Antares → Graffias area
        [[244.58, -19.81], [241.36, -15.40]], // → σ
        [[241.36, -15.40], [239.22, -12.54]], // → δ (testa)
        // Coda
        [[247.35, -26.43], [252.54, -34.29]], // Antares → ζ
        [[252.54, -34.29], [255.59, -37.10]], // ζ → μ
        [[255.59, -37.10], [258.04, -39.03]], // μ → ε (punta coda)
    ],

    'Crux': [
        // Croce del Sud
        [[187.79, -57.11], [183.79, -63.10]], // Gacrux → Acrux (verticale)
        [[186.65, -60.37], [191.93, -59.69]], // Mimosa → Delta (orizzontale)
    ],
};

// Colori per costellazione
const COLORS = {
    Orion:       0x2244aa,
    Cassiopeia:  0x224488,
    'Ursa Major': 0x1a3366,
    Scorpius:    0x332244,
    'Crux':      0x1a2255,
};

/**
 * Crea il gruppo Three.js con tutte le linee delle costellazioni.
 * @param {number} radius  Raggio della sfera (leggermente interno alle stelle)
 */
export function createConstellations(radius) {
    const group = new THREE.Group();
    const r = radius * 0.972; // appena dentro le stelle

    for (const [name, segments] of Object.entries(CONSTELLATIONS)) {
        const positions = [];
        for (const [a, b] of segments) {
            const va = rd(a[0], a[1], r);
            const vb = rd(b[0], b[1], r);
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const mat = new THREE.LineBasicMaterial({
            color:       COLORS[name] ?? 0x223366,
            opacity:     0.40,
            transparent: true,
            depthWrite:  false,
        });

        group.add(new THREE.LineSegments(geo, mat));
    }

    return group;
}
