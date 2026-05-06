import * as THREE from 'three';

// Galactic → Equatorial J2000 rotation matrix
const M = [
    [-0.0548755604,  0.4941094279, -0.8676661490],
    [-0.8734370902, -0.4448296300, -0.1980763734],
    [-0.4838350155,  0.7469822445,  0.4559837762]
];

function galToEq(l_deg, b_deg) {
    const l  = l_deg * Math.PI / 180;
    const b  = b_deg * Math.PI / 180;
    const gx = Math.cos(b) * Math.cos(l);
    const gy = Math.cos(b) * Math.sin(l);
    const gz = Math.sin(b);
    const ex = M[0][0]*gx + M[0][1]*gy + M[0][2]*gz;
    const ey = M[1][0]*gx + M[1][1]*gy + M[1][2]*gz;
    const ez = M[2][0]*gx + M[2][1]*gy + M[2][2]*gz;
    return {
        ra:  (Math.atan2(ey, ex) * 180 / Math.PI + 360) % 360,
        dec: Math.asin(Math.max(-1, Math.min(1, ez))) * 180 / Math.PI
    };
}

function blob(ctx, cx, cy, rw, rh, alpha, W) {
    // Disegna blob con wrapping orizzontale per evitare seam a RA=0/360
    for (const ox of [0, W, -W]) {
        const x = cx + ox;
        if (x + rw < 0 || x - rw > W * 2) continue;
        const g = ctx.createRadialGradient(x, cy, 0, x, cy, rw);
        g.addColorStop(0,   `rgba(190,165,240,${alpha})`);
        g.addColorStop(0.5, `rgba(140,110,210,${alpha * 0.45})`);
        g.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.save();
        ctx.scale(1, rh / rw);
        ctx.fillStyle = g;
        ctx.fillRect(x - rw, cy * (rw / rh) - rw, rw * 2, rw * 2);
        ctx.restore();
    }
}

export function createMilkyWay(radius) {
    const W = 2048, H = 1024;
    const cvs = document.createElement('canvas');
    cvs.width = W; cvs.height = H;
    const ctx = cvs.getContext('2d');

    // Striscia galattica: campiona lungo l'equatore galattico
    const STEPS = 720;
    for (let i = 0; i < STEPS; i++) {
        const l = (i / STEPS) * 360;
        const { ra, dec } = galToEq(l, 0);

        // x in texture: RA=0° → u=0, RA=360° → u=1
        // Textura sarà flipdata con repeat.x=-1 quindi usiamo RA diretto
        const px = (ra / 360) * W;
        const py = ((90 - dec) / 180) * H;

        // Galactic center (l≈0 e l≈360) è più luminoso
        const lc  = Math.min(l, 360 - l);
        const boost = 1 + 2.8 * Math.exp(-(lc * lc) / (40 * 40));

        const rw = W * 0.040 * (1 + 0.4 * boost);
        const rh = H * 0.075 * (1 + 0.3 * boost);

        blob(ctx, px, py, rw, rh, 0.018 * boost, W);
    }

    // Stelle nella banda
    for (let i = 0; i < 700; i++) {
        const l  = Math.random() * 360;
        const b  = (Math.random() - 0.5) * 36;
        const { ra, dec } = galToEq(l, b);
        const px = (ra / 360) * W;
        const py = ((90 - dec) / 180) * H;
        const a  = Math.random() * 0.55 * Math.exp(-Math.abs(b) / 9);
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 1.6 + 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(225,210,255,${a})`;
        ctx.fill();
    }

    // Nebulosa centro galattico
    const { ra: gcRa, dec: gcDec } = galToEq(0, 0);
    const gcx = (gcRa / 360) * W;
    const gcy = ((90 - gcDec) / 180) * H;
    const gcg = ctx.createRadialGradient(gcx, gcy, 0, gcx, gcy, W * 0.08);
    gcg.addColorStop(0,   'rgba(255,200,180,0.12)');
    gcg.addColorStop(0.4, 'rgba(200,150,255,0.06)');
    gcg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = gcg;
    ctx.fillRect(gcx - W * 0.08, gcy - W * 0.08, W * 0.16, W * 0.16);

    const tex = new THREE.CanvasTexture(cvs);
    // BackSide mappa la texture specchiata → compensiamo con repeat negativo
    tex.wrapS  = THREE.RepeatWrapping;
    tex.repeat.set(-1, 1);
    tex.offset.set(1, 0);

    // Sfera interna: il camera al centro vede l'interno (BackSide)
    const geo = new THREE.SphereGeometry(radius * 0.984, 64, 32);
    const mat = new THREE.MeshBasicMaterial({
        map:         tex,
        side:        THREE.BackSide,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        opacity:     0.80,
    });

    return new THREE.Mesh(geo, mat);
}
