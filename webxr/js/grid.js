import * as THREE from 'three';

const COLOR      = 0x334466;
const OPACITY    = 0.28;
const SEGMENTS   = 128;

function makeLabel(text, pos, radius) {
    const W = 160, H = 36;
    const cv  = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = 'rgba(80,130,200,0.75)';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);
    const tex = new THREE.CanvasTexture(cv);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0.7
    }));
    const scale = radius * 0.032;
    spr.scale.set(scale * (W / H), scale, 1);
    spr.position.copy(pos);
    return spr;
}

export function createEquatorialGrid(radius) {
    const group = new THREE.Group();
    const r = radius * 0.965;
    const mat = new THREE.LineBasicMaterial({
        color: COLOR, opacity: OPACITY, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending
    });

    // ── Cerchi di declinazione (−60°, −30°, 0°, +30°, +60°) ────────────────
    const decs = [-60, -30, 0, 30, 60];
    decs.forEach(dec_deg => {
        const dec  = dec_deg * Math.PI / 180;
        const y    = r * Math.sin(dec);
        const cr   = r * Math.cos(dec);
        const pts  = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const a = (i / SEGMENTS) * Math.PI * 2;
            pts.push(new THREE.Vector3(cr * Math.cos(a), y, -cr * Math.sin(a)));
        }
        group.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts), mat
        ));

        // Label declinazione a RA=0
        if (dec_deg !== 0) {
            const pos = new THREE.Vector3(cr, y, 0).multiplyScalar(1.015);
            group.add(makeLabel(`${dec_deg > 0 ? '+' : ''}${dec_deg}°`, pos, radius));
        }
    });

    // Equatore celeste con label
    const eqPts = [];
    for (let i = 0; i <= SEGMENTS; i++) {
        const a = (i / SEGMENTS) * Math.PI * 2;
        eqPts.push(new THREE.Vector3(r * Math.cos(a), 0, -r * Math.sin(a)));
    }
    group.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(eqPts),
        new THREE.LineBasicMaterial({
            color: 0x4466aa, opacity: OPACITY * 1.6,
            transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
        })
    ));

    // ── Cerchi di ascensione retta (ogni 30° = 2h) ────────────────────────
    for (let h = 0; h < 12; h++) {
        const ra = (h / 12) * Math.PI * 2;
        const pts = [];
        for (let i = 0; i <= SEGMENTS; i++) {
            const dec = ((i / SEGMENTS) - 0.5) * Math.PI;
            pts.push(new THREE.Vector3(
                r * Math.cos(dec) * Math.cos(ra),
                r * Math.sin(dec),
               -r * Math.cos(dec) * Math.sin(ra)
            ));
        }
        group.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts), mat
        ));

        // Label RA in ore sull'equatore
        const raLabel = `${h * 2}h`;
        const lx = r * 1.018 * Math.cos(ra);
        const lz = -r * 1.018 * Math.sin(ra);
        group.add(makeLabel(raLabel, new THREE.Vector3(lx, 0, lz), radius));
    }

    return group;
}
