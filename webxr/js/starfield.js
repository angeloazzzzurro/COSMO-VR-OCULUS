import * as THREE from 'three';

// Colori per tipo spettrale (standard astronomico)
const SPECTRAL_COLORS = {
    'O': 0x9bb0ff, 'B': 0xaabfff, 'A': 0xcad7ff,
    'F': 0xf8f7ff, 'G': 0xfff4ea, 'K': 0xffd2a1, 'M': 0xffcc6f,
    '?': 0xffffff
};

const VERT_SHADER = `
    attribute float size;
    attribute vec3 aColor;
    varying vec3 vColor;
    void main() {
        vColor = aColor;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (400.0 / -mvPos.z);
        gl_Position = projectionMatrix * mvPos;
    }
`;

const FRAG_SHADER = `
    varying vec3 vColor;
    void main() {
        float d = distance(gl_PointCoord, vec2(0.5));
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.05, d) * 0.9;
        gl_FragColor = vec4(vColor, alpha);
    }
`;

export function createStarfield(stars, radius) {
    const group = new THREE.Group();

    const normalStars = stars.filter(s => !s.has_planet);
    const hostStars   = stars.filter(s =>  s.has_planet);

    // ---- Stelle normali come Points (shader custom, glow rotondo) ----
    const nCount = normalStars.length;
    const nPos    = new Float32Array(nCount * 3);
    const nColors = new Float32Array(nCount * 3);
    const nSizes  = new Float32Array(nCount);

    normalStars.forEach((star, i) => {
        const v = new THREE.Vector3(star.x, star.y, star.z).multiplyScalar(radius);
        nPos[i*3]   = v.x; nPos[i*3+1] = v.y; nPos[i*3+2] = v.z;
        const c = new THREE.Color(SPECTRAL_COLORS[star.spect] ?? 0xffffff);
        nColors[i*3] = c.r; nColors[i*3+1] = c.g; nColors[i*3+2] = c.b;
        nSizes[i] = Math.max(0.4, Math.min(5.0, 6.5 - star.mag)) * 1.8;
    });

    const nGeo = new THREE.BufferGeometry();
    nGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    nGeo.setAttribute('aColor',   new THREE.BufferAttribute(nColors, 3));
    nGeo.setAttribute('size',     new THREE.BufferAttribute(nSizes, 1));

    const normalPoints = new THREE.Points(nGeo, new THREE.ShaderMaterial({
        vertexShader: VERT_SHADER,
        fragmentShader: FRAG_SHADER,
        transparent: true,
        depthWrite: false
    }));
    group.add(normalPoints);

    // ---- Stelle con esopianeti come InstancedMesh (sfere, più grandi) ----
    const hCount = hostStars.length;
    const dummy  = new THREE.Object3D();

    const hostGeo  = new THREE.SphereGeometry(1, 7, 7);
    const hostMesh = new THREE.InstancedMesh(
        hostGeo,
        new THREE.MeshBasicMaterial({ vertexColors: true }),
        hCount
    );

    // Halo trasparente attorno agli host
    const haloMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(1, 6, 6),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.10, vertexColors: true }),
        hCount
    );

    hostStars.forEach((star, i) => {
        const pos  = new THREE.Vector3(star.x, star.y, star.z).multiplyScalar(radius);
        const size = Math.max(0.6, Math.min(5.0, 6.5 - star.mag)) * 4.0;

        dummy.position.copy(pos);
        dummy.scale.setScalar(size);
        dummy.updateMatrix();
        hostMesh.setMatrixAt(i, dummy.matrix);

        let color;
        if      (star.n_planets === 1) color = new THREE.Color(0xFFD700);
        else if (star.n_planets <= 3)  color = new THREE.Color(0xFF8C00);
        else                           color = new THREE.Color(0xFF3300);

        hostMesh.setColorAt(i, color);

        dummy.scale.setScalar(size * 2.8);
        dummy.updateMatrix();
        haloMesh.setMatrixAt(i, dummy.matrix);
        haloMesh.setColorAt(i, color);
    });

    hostMesh.instanceMatrix.needsUpdate = true;
    if (hostMesh.instanceColor) hostMesh.instanceColor.needsUpdate = true;
    haloMesh.instanceMatrix.needsUpdate = true;
    if (haloMesh.instanceColor) haloMesh.instanceColor.needsUpdate = true;

    group.add(haloMesh);
    group.add(hostMesh);

    // Helper: risolve stella da un hit del raycaster
    function getStarByHit(hit) {
        if (hit.object === normalPoints) return normalStars[hit.index];
        if (hit.object === hostMesh)     return hostStars[hit.instanceId];
        return null;
    }

    return { group, normalPoints, hostMesh, haloMesh, normalStars, hostStars, getStarByHit };
}
