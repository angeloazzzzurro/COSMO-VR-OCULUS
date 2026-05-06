import * as THREE from 'three';

function rd(ra_deg, dec_deg, r) {
    const ra  = ra_deg  * Math.PI / 180;
    const dec = dec_deg * Math.PI / 180;
    return new THREE.Vector3(
         Math.cos(dec) * Math.cos(ra),
         Math.sin(dec),
        -Math.cos(dec) * Math.sin(ra)
    ).multiplyScalar(r);
}

const CONSTELLATIONS = {
    Orione: {
        color: 0x5599ff,
        segments: [
            // Cintura
            [[83.00, -0.30], [84.05, -1.20]],
            [[84.05, -1.20], [85.19, -1.94]],
            // Spalle
            [[88.79,  7.41], [81.28,  6.35]],
            // Spalle → cintura
            [[88.79,  7.41], [85.19, -1.94]],
            [[81.28,  6.35], [83.00, -0.30]],
            // Gambe
            [[85.19, -1.94], [86.94, -9.67]],
            [[83.00, -0.30], [78.63, -8.20]],
            // Testa
            [[83.78,  9.93], [88.79,  7.41]],
            [[83.78,  9.93], [81.28,  6.35]],
        ],
        label: [84.0, -0.5],
    },
    Cassiopea: {
        color: 0x88bbff,
        segments: [
            [[ 2.29, 59.15], [10.13, 56.54]],
            [[10.13, 56.54], [14.18, 60.72]],
            [[14.18, 60.72], [21.45, 60.24]],
            [[21.45, 60.24], [28.60, 63.67]],
        ],
        label: [14.0, 63.0],
    },
    'Orsa Maggiore': {
        color: 0x66aaff,
        segments: [
            [[165.93, 61.75], [165.46, 56.38]],
            [[165.46, 56.38], [178.46, 53.69]],
            [[178.46, 53.69], [183.86, 57.03]],
            [[183.86, 57.03], [165.93, 61.75]],
            [[183.86, 57.03], [193.51, 55.96]],
            [[193.51, 55.96], [200.98, 54.93]],
            [[200.98, 54.93], [206.89, 49.31]],
        ],
        label: [185.0, 64.0],
    },
    Scorpione: {
        color: 0xff6655,
        segments: [
            [[247.35, -26.43], [244.58, -19.81]],
            [[244.58, -19.81], [241.36, -15.40]],
            [[241.36, -15.40], [239.22, -12.54]],
            [[247.35, -26.43], [252.54, -34.29]],
            [[252.54, -34.29], [255.59, -37.10]],
            [[255.59, -37.10], [258.04, -39.03]],
        ],
        label: [247.0, -14.0],
    },
    'Croce del Sud': {
        color: 0xaaddff,
        segments: [
            [[187.79, -57.11], [183.79, -63.10]],
            [[186.65, -60.37], [191.93, -59.69]],
        ],
        label: [188.0, -56.0],
    },
};

function makeLabel(text, hexColor, radius, ra_deg, dec_deg) {
    const W = 320, H = 52;
    const cv  = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    const col = new THREE.Color(hexColor);
    const [cr, cg, cb] = [col.r, col.g, col.b].map(v => Math.round(v * 255));

    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.15)`;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, 10); ctx.fill();

    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.55)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(1, 1, W-2, H-2, 9); ctx.stroke();

    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.95)`;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), W / 2, H / 2);

    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending
    }));

    const pos = rd(ra_deg, dec_deg, radius * 0.95);
    spr.position.copy(pos);
    const scale = radius * 0.055;
    spr.scale.set(scale * (W / H), scale, 1);
    return spr;
}

export function createConstellations(radius) {
    const group = new THREE.Group();
    const r = radius * 0.978;

    for (const [name, def] of Object.entries(CONSTELLATIONS)) {
        const positions = [];
        for (const [a, b] of def.segments) {
            const va = rd(a[0], a[1], r);
            const vb = rd(b[0], b[1], r);
            positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        // Strato core: linea luminosa
        group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
            color:       def.color,
            opacity:     0.80,
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
        })));

        // Strato glow: stessa geometria, colore schiarito
        group.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
            color:       new THREE.Color(def.color).multiplyScalar(0.5).getHex(),
            opacity:     0.35,
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
        })));

        // Label nome costellazione
        if (def.label) {
            group.add(makeLabel(name, def.color, radius, def.label[0], def.label[1]));
        }
    }

    return group;
}
