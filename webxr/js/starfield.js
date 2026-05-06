import * as THREE from 'three';

const SPECTRAL_COLORS = {
    O: 0x9bb0ff, B: 0xaabfff, A: 0xcad7ff,
    F: 0xf8f7ff, G: 0xfff4ea, K: 0xffd2a1, M: 0xffcc6f,
    '?': 0xffffff
};

const VERT_SHADER = `
    attribute float size;
    attribute vec3  aColor;
    attribute float aMag;
    varying vec3    vColor;
    varying float   vMag;
    void main() {
        vColor = aColor;
        vMag   = aMag;
        vec4 mvPos   = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (900.0 / -mvPos.z);
        gl_Position  = projectionMatrix * mvPos;
    }
`;

const FRAG_SHADER = `
    varying vec3  vColor;
    varying float vMag;
    void main() {
        vec2  uv = gl_PointCoord - 0.5;
        float r  = length(uv);
        if (r > 0.5) discard;

        // Glow multi-strato (Stellarium-style PSF)
        float core  = smoothstep(0.10, 0.0,  r);
        float glow1 = smoothstep(0.28, 0.04, r) * 0.55;
        float glow2 = smoothstep(0.50, 0.18, r) * 0.25;

        // Raggi di diffrazione per stelle brillanti (mag < 3)
        float spkStr = clamp((3.0 - vMag) / 4.5, 0.0, 0.85);
        float spH = smoothstep(0.032, 0.0, abs(uv.y)) * smoothstep(0.5, 0.07, abs(uv.x));
        float spV = smoothstep(0.032, 0.0, abs(uv.x)) * smoothstep(0.5, 0.07, abs(uv.y));
        float spike = (spH + spV) * spkStr;

        float alpha = clamp(core + glow1 + glow2 + spike, 0.0, 1.0);
        gl_FragColor = vec4(vColor * (1.0 + core * 1.6 + spike * 0.9), alpha);
    }
`;

function planetColor(n) {
    if (n === 1) return new THREE.Color(0xFFD700);
    if (n <= 3)  return new THREE.Color(0xFF8C00);
    return           new THREE.Color(0xFF3300);
}

export function createStarfield(stars, radius) {
    const group       = new THREE.Group();
    const normalStars = stars.filter(s => !s.has_planet);
    const hostStars   = stars.filter(s =>  s.has_planet);

    // ── 1. Stelle normali (Points, shader custom) ────────────────────────────
    const nCount  = normalStars.length;
    const nPos    = new Float32Array(nCount * 3);
    const nColors = new Float32Array(nCount * 3);
    const nSizes  = new Float32Array(nCount);
    const nMags   = new Float32Array(nCount);

    normalStars.forEach((s, i) => {
        const v = new THREE.Vector3(s.x, s.y, s.z).multiplyScalar(radius);
        nPos[i*3]   = v.x; nPos[i*3+1] = v.y; nPos[i*3+2] = v.z;
        const c = new THREE.Color(SPECTRAL_COLORS[s.spect] ?? 0xffffff);
        nColors[i*3] = c.r; nColors[i*3+1] = c.g; nColors[i*3+2] = c.b;
        nSizes[i] = Math.max(1.0, Math.min(9.0, 7.5 - s.mag)) * 3.2;
        nMags[i]  = s.mag ?? 5.0;
    });

    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.BufferAttribute(nPos,    3));
    nGeo.setAttribute('aColor',   new THREE.BufferAttribute(nColors, 3));
    nGeo.setAttribute('size',     new THREE.BufferAttribute(nSizes,  1));
    nGeo.setAttribute('aMag',     new THREE.BufferAttribute(nMags,   1));

    const normalPoints = new THREE.Points(nGeo, new THREE.ShaderMaterial({
        vertexShader: VERT_SHADER, fragmentShader: FRAG_SHADER,
        transparent: true, depthWrite: false
    }));
    group.add(normalPoints);

    // ── 2. Host stars (InstancedMesh — sfere colorate) ───────────────────────
    const hCount     = hostStars.length;
    const dummy      = new THREE.Object3D();
    const hostPositions = [];
    const hostSizes     = [];
    const origColors    = hostStars.map(s => planetColor(s.n_planets).clone());

    const hostMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false }),
        hCount
    );

    const haloMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 6, 6),
        new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.14,
            depthWrite: false, blending: THREE.AdditiveBlending,
        }),
        hCount
    );

    hostStars.forEach((s, i) => {
        const pos  = new THREE.Vector3(s.x, s.y, s.z).multiplyScalar(radius);
        const size = Math.max(1.2, Math.min(4.0, 7.5 - s.mag));
        hostPositions.push(pos.clone());
        hostSizes.push(size);

        dummy.position.copy(pos); dummy.scale.setScalar(size); dummy.updateMatrix();
        hostMesh.setMatrixAt(i, dummy.matrix);
        hostMesh.setColorAt(i, origColors[i]);

        dummy.scale.setScalar(size * 2.2); dummy.updateMatrix();
        haloMesh.setMatrixAt(i, dummy.matrix);
        haloMesh.setColorAt(i, origColors[i]);
    });

    for (const m of [hostMesh, haloMesh]) {
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    group.add(haloMesh);
    group.add(hostMesh);

    // ── 3. Hover ring ────────────────────────────────────────────────────────
    const hoverRing = new THREE.Mesh(
        new THREE.RingGeometry(1.0, 1.55, 40),
        new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.55,
            side: THREE.DoubleSide, depthWrite: false,
            blending: THREE.AdditiveBlending
        })
    );
    hoverRing.visible = false;
    group.add(hoverRing);

    // ── API ──────────────────────────────────────────────────────────────────
    function getStarByHit(hit) {
        if (hit.object === normalPoints) return normalStars[hit.index];
        if (hit.object === hostMesh)     return hostStars[hit.instanceId];
        return null;
    }

    function update(time) {
        const pulse = 1 + 0.18 * Math.sin(time * 1.7);
        haloMesh.scale.setScalar(pulse);
        if (hoverRing.visible) {
            hoverRing.material.opacity = 0.4 + 0.25 * Math.sin(time * 3.5);
        }
    }

    function setHover(hit) {
        if (!hit) { hoverRing.visible = false; return null; }
        const star = getStarByHit(hit);
        if (!star) { hoverRing.visible = false; return null; }
        const pos = new THREE.Vector3(star.x, star.y, star.z).multiplyScalar(radius);
        hoverRing.position.copy(pos);
        hoverRing.lookAt(0, 0, 0);
        const s = star.has_planet
            ? Math.max(1.2, Math.min(4.0, 7.5 - star.mag)) * 2.5
            : Math.max(0.5, Math.min(2.0, 6.5 - star.mag)) * 1.5;
        hoverRing.scale.setScalar(Math.max(1.5, s));
        hoverRing.visible = true;
        return star;
    }

    function setFilter(type) {
        hostStars.forEach((s, i) => {
            const match = type == null
                || (type === 1 && s.n_planets === 1)
                || (type === 2 && s.n_planets >= 2 && s.n_planets <= 3)
                || (type === 3 && s.n_planets >= 4);
            const col = origColors[i].clone();
            if (!match) col.multiplyScalar(0.06);
            hostMesh.setColorAt(i, col);
            haloMesh.setColorAt(i, col);
        });
        hostMesh.instanceColor.needsUpdate = true;
        haloMesh.instanceColor.needsUpdate = true;
        // Dimma le stelle di sfondo quando il filtro è attivo
        normalPoints.material.uniforms && (normalPoints.material.uniforms.uDim
            ? normalPoints.material.uniforms.uDim.value = type != null ? 0.3 : 1.0
            : null);
    }

    return {
        group, normalPoints, hostMesh, haloMesh,
        normalStars, hostStars, hostPositions, hostSizes,
        getStarByHit, update, setHover, setFilter
    };
}
