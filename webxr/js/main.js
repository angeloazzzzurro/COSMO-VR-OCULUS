import * as THREE from 'three';
import { OrbitControls }            from 'three/addons/controls/OrbitControls.js';
import { createStarfield }          from './starfield.js';
import { setupControllers, pollGamepads } from './controllers.js';
import { generateDemoStars }        from './demo_data.js';

const SPHERE_RADIUS = 500;
const DATA_URL      = './data/stars.json';

let scene, camera, renderer, controls, clock;
let starfield = null;
let infoPanel = null;   // pannello 3D in VR

// ─── Init ────────────────────────────────────────────────────────────────────
async function init() {
    // Scena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000008);

    // Nebulosa di sfondo (sprite texture procedurale)
    addNebulaBackground();

    // Camera inizia al centro della sfera
    camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 0.001);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // OrbitControls (desktop/mobile) — ruota la sfera, non la camera
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping  = true;
    controls.dampingFactor  = 0.04;
    controls.rotateSpeed    = -0.25;   // invertito: "trascini il cielo"
    controls.zoomSpeed      = 0.6;
    controls.minDistance    = 0.1;
    controls.maxDistance    = 450;
    controls.target.set(0, 0, -1);    // guarda avanti

    clock = new THREE.Clock();

    // Dati stelle
    const stars = await loadStars();
    document.getElementById('loading').style.display = 'none';

    // Starfield
    starfield = createStarfield(stars, SPHERE_RADIUS);
    scene.add(starfield.group);

    // Pannello info 3D (VR)
    infoPanel = createInfoPanel();
    scene.add(infoPanel.group);
    infoPanel.group.visible = false;

    // Controller Quest 2
    setupControllers(renderer, scene, () => starfield, onStarSelected);

    // VR button
    initVRButton();

    // Raycasting desktop
    renderer.domElement.addEventListener('click', onMouseClick);
    document.getElementById('close-info').addEventListener('click', () => onStarSelected(null));

    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
}

// ─── Caricamento dati ────────────────────────────────────────────────────────
async function loadStars() {
    try {
        const res = await fetch(DATA_URL);
        if (!res.ok) throw new Error('no file');
        const data = await res.json();
        console.log(`[COSMO] ${data.length} stelle caricate da stars.json`);
        return data;
    } catch {
        console.warn('[COSMO] stars.json non trovato, usando dati demo');
        const demo = generateDemoStars();
        console.log(`[COSMO] ${demo.length} stelle demo generate`);
        return demo;
    }
}

// ─── Sfondo nebulosa procedurale ─────────────────────────────────────────────
function addNebulaBackground() {
    const cvs = document.createElement('canvas');
    cvs.width = cvs.height = 512;
    const ctx = cvs.getContext('2d');
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0,   'rgba(30, 20, 60, 0.6)');
    grad.addColorStop(0.5, 'rgba(10, 5, 30, 0.3)');
    grad.addColorStop(1,   'rgba(0, 0, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(cvs);
    scene.background = tex;
}

// ─── Info panel 3D per VR ────────────────────────────────────────────────────
function createInfoPanel() {
    const group  = new THREE.Group();
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 280;
    const texture = new THREE.CanvasTexture(canvas);
    const mesh    = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.77),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    group.add(mesh);
    return { group, canvas, texture };
}

function updateInfoPanel(star) {
    const { canvas, texture, group } = infoPanel;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 280);

    if (!star) { group.visible = false; return; }

    // Sfondo pannello
    ctx.fillStyle = 'rgba(0, 0, 12, 0.88)';
    ctx.beginPath(); ctx.roundRect(6, 6, 500, 268, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255, 190, 40, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(6, 6, 500, 268, 12); ctx.stroke();

    // Nome stella
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(star.label, 24, 52);

    // Dati
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '19px monospace';
    ctx.fillText(`RA: ${star.ra?.toFixed(2)}°   Dec: ${star.dec?.toFixed(2)}°`, 24, 88);
    ctx.fillText(`Mag: ${star.mag?.toFixed(2)}   Tipo: ${star.spect ?? '?'}`, 24, 116);

    if (star.has_planet) {
        ctx.strokeStyle = 'rgba(255,180,0,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(24, 136); ctx.lineTo(488, 136); ctx.stroke();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`Esopianeti: ${star.n_planets}`, 24, 168);

        if (star.koi_score != null) {
            ctx.fillStyle = '#888';
            ctx.font = '18px monospace';
            ctx.fillText(`Confidence: ${(star.koi_score * 100).toFixed(1)}%`, 24, 196);
        }

        // Barra confidence
        const barX = 24, barY = 214, barW = 440, barH = 12;
        ctx.fillStyle = 'rgba(255,180,0,0.15)';
        ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW * (star.koi_score ?? 0), barH, 4);
        ctx.fill();
    }

    texture.needsUpdate = true;
    group.visible = true;
}

// ─── Selezione stella ────────────────────────────────────────────────────────
function onStarSelected(star) {
    updateInfoPanel(star);

    const panel = document.getElementById('star-info');
    if (!star) { panel.style.display = 'none'; return; }

    document.getElementById('info-name').textContent  = star.label;
    document.getElementById('info-ra').textContent    = star.ra?.toFixed(2) + '°';
    document.getElementById('info-dec').textContent   = star.dec?.toFixed(2) + '°';
    document.getElementById('info-mag').textContent   = star.mag?.toFixed(2);
    document.getElementById('info-spect').textContent = star.spect ?? '?';

    const badge = document.getElementById('info-planet');
    if (star.has_planet) {
        document.getElementById('info-planet-count').textContent =
            `${star.n_planets} esopianeta${star.n_planets > 1 ? 'i' : ''}`;
        document.getElementById('info-planet-score').textContent =
            star.koi_score != null ? `Confidence: ${(star.koi_score * 100).toFixed(1)}%` : '';
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
    panel.style.display = 'block';
}

// ─── Raycasting desktop ───────────────────────────────────────────────────────
const _mouse    = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();
_raycaster.params.Points = { threshold: 3 };

function onMouseClick(e) {
    if (!starfield) return;
    _mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
    _mouse.y = -(e.clientY / innerHeight) * 2 + 1;
    _raycaster.setFromCamera(_mouse, camera);

    const hits = _raycaster.intersectObjects([starfield.normalPoints, starfield.hostMesh], false);
    if (hits.length > 0) {
        const star = starfield.getStarByHit(hits[0]);
        if (star) onStarSelected(star);
    }
}

// ─── VR Button ───────────────────────────────────────────────────────────────
function initVRButton() {
    const btn = document.getElementById('vr-btn');
    if (!navigator.xr) {
        btn.textContent = 'WebXR non supportato'; btn.disabled = true; return;
    }
    navigator.xr.isSessionSupported('immersive-vr').then(ok => {
        if (!ok) { btn.textContent = 'VR non disponibile'; btn.disabled = true; return; }

        btn.addEventListener('click', async () => {
            if (renderer.xr.isPresenting) {
                renderer.xr.getSession()?.end();
                return;
            }
            const session = await navigator.xr.requestSession('immersive-vr', {
                optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking']
            });
            await renderer.xr.setSession(session);
            btn.textContent = 'ESCI DA VR';
            controls.enabled = false;
            session.addEventListener('end', () => {
                btn.textContent = 'ENTRA IN VR';
                controls.enabled = true;
            });
        });
    });
}

// ─── Loop di animazione ──────────────────────────────────────────────────────
function animate(t, frame) {
    controls.update();

    // Joystick Quest 2 → ruota la sfera
    if (starfield) pollGamepads(renderer.xr, starfield.group);

    // Pannello info 3D: si posiziona davanti alla camera in VR
    if (renderer.xr.isPresenting && infoPanel?.group.visible) {
        const xrCam = renderer.xr.getCamera();
        const fwd   = new THREE.Vector3(0, 0, -1).applyQuaternion(xrCam.quaternion);
        infoPanel.group.position
            .copy(xrCam.position)
            .addScaledVector(fwd, 2.2);
        infoPanel.group.position.y -= 0.35;
        infoPanel.group.lookAt(xrCam.position);
    }

    renderer.render(scene, camera);
}

// ─── Resize ──────────────────────────────────────────────────────────────────
function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
}

init();
