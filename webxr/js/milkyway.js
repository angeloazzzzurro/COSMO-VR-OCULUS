import * as THREE from 'three';

/**
 * Banda della Via Lattea — toro procedurale allineato al piano galattico.
 * Il polo nord galattico in coordinate equatoriali è: RA=192.85°, Dec=27.13°
 */
export function createMilkyWay(radius) {
    // ── Texture procedurale ──────────────────────────────────────────────────
    const W = 1024, H = 128;
    const cvs = document.createElement('canvas');
    cvs.width = W; cvs.height = H;
    const ctx = cvs.getContext('2d');

    // Gradiente verticale: trasparente ai bordi, luminoso al centro
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0,    'rgba(60, 40, 100, 0)');
    grad.addColorStop(0.18, 'rgba(90, 70, 160, 0.10)');
    grad.addColorStop(0.38, 'rgba(140, 110, 200, 0.22)');
    grad.addColorStop(0.50, 'rgba(170, 140, 230, 0.32)');
    grad.addColorStop(0.62, 'rgba(140, 110, 200, 0.22)');
    grad.addColorStop(0.82, 'rgba(90, 70, 160, 0.10)');
    grad.addColorStop(1,    'rgba(60, 40, 100, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Zona del centro galattico più luminosa (primo quarto della texture)
    const gcGrad = ctx.createLinearGradient(0, 0, W * 0.45, 0);
    gcGrad.addColorStop(0,   'rgba(200, 160, 255, 0.18)');
    gcGrad.addColorStop(0.5, 'rgba(150, 110, 220, 0.10)');
    gcGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gcGrad;
    ctx.fillRect(0, H * 0.25, W * 0.45, H * 0.5);

    // Puntini stellari nella banda
    for (let i = 0; i < 350; i++) {
        const x = Math.random() * W;
        const y = H * 0.2 + Math.random() * H * 0.6;
        const r = Math.random() * 1.4;
        const a = Math.random() * 0.45;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(220, 200, 255, ${a})`;
        ctx.fill();
    }

    // Qualche piccola nebulosa sfocata
    for (let i = 0; i < 8; i++) {
        const nx = Math.random() * W;
        const ny = H * 0.3 + Math.random() * H * 0.4;
        const gr = ctx.createRadialGradient(nx, ny, 0, nx, ny, 20 + Math.random() * 30);
        gr.addColorStop(0,   `rgba(180, 140, 255, ${0.08 + Math.random() * 0.08})`);
        gr.addColorStop(1,   'rgba(0,0,0,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(nx - 50, ny - 50, 100, 100);
    }

    const texture = new THREE.CanvasTexture(cvs);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.set(2, 1);  // ripeti 2 volte per coprire il toro

    // ── Geometria: toro largo lungo il piano galattico ───────────────────────
    // radius * 0.99 = raggio principale (appena dentro la sfera stelle)
    // radius * 0.09 = spessore della banda
    const geo = new THREE.TorusGeometry(radius * 0.99, radius * 0.09, 8, 128);
    const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);

    // ── Rotazione verso il piano galattico reale ──────────────────────────────
    // Polo nord galattico in eq: RA=192.85°, Dec=27.13°
    // Conversione a Three.js (Y-up, -Z forward)
    const ra  = 192.85 * Math.PI / 180;
    const dec = 27.13  * Math.PI / 180;
    const gnp = new THREE.Vector3(
         Math.cos(dec) * Math.cos(ra),   //  x
         Math.sin(dec),                   //  y (up)
        -Math.cos(dec) * Math.sin(ra)     // -z (forward)
    ).normalize();

    // Il toro di default ha normale Y → ruota verso gnp
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), gnp);

    return mesh;
}
