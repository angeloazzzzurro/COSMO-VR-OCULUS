import * as THREE from 'three';
import { OrbitControls }                            from 'three/addons/controls/OrbitControls.js';
import { createStarfield }                          from './starfield.js';
import { setupControllers, pollGamepads, pollHover } from './controllers.js';
import { generateDemoStars }                        from './demo_data.js';
import { createMilkyWay }                           from './milkyway.js';
import { createConstellations }                     from './constellations.js';

const SPHERE_RADIUS = 500;
const DATA_URL      = './data/stars.json';
const MOVE_SPEED    = 80;

// ── Globals ───────────────────────────────────────────────────────────────────
let scene, camera, renderer, controls, clock;
let starfield = null;
let infoPanel = null;
let constGroup = null;

// ── WASD ──────────────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup',   e => keys[e.code] = false);

function updateWASD(dt) {
    if (!controls.enabled) return;
    const move = new THREE.Vector3();
    const fwd  = new THREE.Vector3(); camera.getWorldDirection(fwd);
    const rgt  = new THREE.Vector3().crossVectors(camera.up, fwd).normalize().negate();
    const spd  = MOVE_SPEED * dt;
    if (keys['KeyW'] || keys['ArrowUp'])    move.addScaledVector(fwd,  spd);
    if (keys['KeyS'] || keys['ArrowDown'])  move.addScaledVector(fwd, -spd);
    if (keys['KeyA'] || keys['ArrowLeft'])  move.addScaledVector(rgt, -spd);
    if (keys['KeyD'] || keys['ArrowRight']) move.addScaledVector(rgt,  spd);
    if (move.lengthSq() === 0) return;
    camera.position.add(move);
    controls.target.add(move);
}

// ── Fly-to ────────────────────────────────────────────────────────────────────
let fly = null;

function flyToStar(star, size) {
    const worldPos = new THREE.Vector3(star.x, star.y, star.z).multiplyScalar(SPHERE_RADIUS);
    const stopDist = size + 20;
    const dest     = worldPos.clone().normalize().multiplyScalar(SPHERE_RADIUS - stopDist);
    fly = {
        p0: camera.position.clone(), p1: dest,
        t0: controls.target.clone(), t1: worldPos.clone(),
        t: 0
    };
    controls.enabled = false;
}

function updateFly(dt) {
    if (!fly) return;
    fly.t = Math.min(fly.t + dt / 2.2, 1.0);
    const e = fly.t < 0.5 ? 2*fly.t*fly.t : -1+(4-2*fly.t)*fly.t;
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (fly.t >= 1.0) { fly = null; controls.enabled = true; }
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    scene = new THREE.Scene();
    addNebulaBackground();

    camera = new THREE.PerspectiveCamera(85, innerWidth / innerHeight, 0.1, 2000);
    camera.position.set(0, 0, 0.001);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    const camLight = new THREE.PointLight(0xfff6e0, 1.4, 0, 0);
    camera.add(camLight);
    scene.add(camera);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.rotateSpeed   = -0.25;
    controls.zoomSpeed     = 0.6;
    controls.minDistance   = 0.1;
    controls.maxDistance   = 450;
    controls.target.set(0, 0, -1);

    clock = new THREE.Clock();

    const stars = await loadStars();
    document.getElementById('loading').style.display = 'none';

    starfield = createStarfield(stars, SPHERE_RADIUS);
    scene.add(starfield.group);

    scene.add(createMilkyWay(SPHERE_RADIUS));

    constGroup = createConstellations(SPHERE_RADIUS);
    constGroup.visible = true;
    scene.add(constGroup);

    infoPanel = createInfoPanel();
    scene.add(infoPanel.group);
    infoPanel.group.visible = false;

    setupControllers(renderer, scene, () => starfield, onStarSelected);
    initVRButton();

    renderer.domElement.addEventListener('click',     onMouseClick);
    renderer.domElement.addEventListener('dblclick',  onMouseDblClick);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    document.getElementById('close-info').addEventListener('click', () => onStarSelected(null));

    // ── Filtri ────────────────────────────────────────────────────────────────
    let activeFilter = null;
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = parseInt(btn.dataset.filter);
            if (activeFilter === type) {
                activeFilter = null;
                btn.classList.remove('active');
                starfield.setFilter(null);
            } else {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                activeFilter = type;
                starfield.setFilter(type);
            }
        });
    });

    document.getElementById('filter-reset')?.addEventListener('click', () => {
        activeFilter = null;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        starfield.setFilter(null);
    });

    const toggleConstBtn = document.getElementById('toggle-const');
    if (toggleConstBtn) {
        toggleConstBtn.classList.add('active');
        toggleConstBtn.addEventListener('click', e => {
            constGroup.visible = !constGroup.visible;
            e.currentTarget.classList.toggle('active', constGroup.visible);
        });
    }

    document.getElementById('controls-hint').innerHTML =
        'drag ruota &nbsp;·&nbsp; scroll zoom &nbsp;·&nbsp; WASD vola &nbsp;·&nbsp; doppio-click avvicinati';

    window.addEventListener('resize', onResize);
    renderer.setAnimationLoop(animate);
}

// ── Load stars ────────────────────────────────────────────────────────────────
async function loadStars() {
    try {
        const r = await fetch(DATA_URL);
        if (!r.ok) throw 0;
        const d = await r.json();
        console.log(`[COSMO] ${d.length} stelle da stars.json`);
        return d;
    } catch {
        console.warn('[COSMO] uso dati demo');
        return generateDemoStars();
    }
}

// ── Sfondo nebulosa ───────────────────────────────────────────────────────────
function addNebulaBackground() {
    const cvs = document.createElement('canvas'); cvs.width = cvs.height = 512;
    const ctx = cvs.getContext('2d');
    const g   = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0,   'rgba(22,14,48,1)');
    g.addColorStop(0.4, 'rgba(8,5,22,1)');
    g.addColorStop(1,   'rgba(2,2,8,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);
    scene.background = new THREE.CanvasTexture(cvs);
}

// ── Info panel VR ─────────────────────────────────────────────────────────────
function createInfoPanel() {
    const group = new THREE.Group();
    const cv    = document.createElement('canvas'); cv.width = 512; cv.height = 280;
    const tex   = new THREE.CanvasTexture(cv);
    const mesh  = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.77),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
    );
    group.add(mesh);
    return { group, cv, tex };
}

function updateInfoPanel(star) {
    const { cv, tex, group } = infoPanel;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, 512, 280);
    if (!star) { group.visible = false; return; }

    ctx.fillStyle = 'rgba(0,2,14,0.90)';
    ctx.beginPath(); ctx.roundRect(6, 6, 500, 268, 12); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,40,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(6, 6, 500, 268, 12); ctx.stroke();

    ctx.fillStyle = '#FFD700'; ctx.font = 'bold 28px monospace';
    ctx.fillText(star.label, 24, 50);
    ctx.fillStyle = '#999'; ctx.font = '17px monospace';
    ctx.fillText(`RA ${star.ra?.toFixed(1)}°  Dec ${star.dec?.toFixed(1)}°  Mag ${star.mag?.toFixed(1)}`, 24, 84);
    ctx.fillText(`Tipo spettrale: ${star.spect ?? '?'}`, 24, 110);

    if (star.has_planet) {
        ctx.strokeStyle = 'rgba(255,170,0,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(24, 130); ctx.lineTo(488, 130); ctx.stroke();
        ctx.fillStyle = '#FFD700'; ctx.font = 'bold 22px monospace';
        ctx.fillText(`${star.n_planets} esopianeta${star.n_planets > 1 ? 'i' : ''}`, 24, 162);
        if (star.koi_score != null) {
            ctx.fillStyle = '#777'; ctx.font = '16px monospace';
            ctx.fillText(`Confidence: ${(star.koi_score * 100).toFixed(1)}%`, 24, 188);
            ctx.fillStyle = 'rgba(255,180,0,0.12)';
            ctx.beginPath(); ctx.roundRect(24, 206, 440, 10, 4); ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.roundRect(24, 206, 440 * (star.koi_score ?? 0), 10, 4); ctx.fill();
        }
    }
    tex.needsUpdate = true;
    group.visible = true;
}

// ── Selezione ─────────────────────────────────────────────────────────────────
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

// ── Raycast ───────────────────────────────────────────────────────────────────
const _m  = new THREE.Vector2();
const _rc = new THREE.Raycaster();
_rc.params.Points = { threshold: 5 };

let _hoverThrottle = 0;

function doRaycast(e) {
    if (!starfield) return null;
    _m.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    _rc.setFromCamera(_m, camera);
    const hits = _rc.intersectObjects([starfield.normalPoints, starfield.hostMesh], false);
    return hits.length ? hits[0] : null;
}

function onMouseClick(e) {
    const hit = doRaycast(e);
    if (hit) { const s = starfield.getStarByHit(hit); if (s) onStarSelected(s); }
}

function onMouseDblClick(e) {
    const hit = doRaycast(e);
    if (!hit) return;
    const s = starfield.getStarByHit(hit);
    if (!s?.has_planet) return;
    const idx  = starfield.hostStars.indexOf(s);
    const size = starfield.hostSizes[idx] ?? 10;
    flyToStar(s, size);
}

function onMouseMove(e) {
    if (!starfield) return;
    if (++_hoverThrottle % 3 !== 0) return;
    const hit = doRaycast(e);
    const s   = starfield.setHover(hit);
    renderer.domElement.style.cursor = s ? 'pointer' : 'default';
}

// ── VR Button ─────────────────────────────────────────────────────────────────
function initVRButton() {
    const btn = document.getElementById('vr-btn');
    if (!navigator.xr) { btn.textContent = 'WebXR non supportato'; btn.disabled = true; return; }
    navigator.xr.isSessionSupported('immersive-vr').then(ok => {
        if (!ok) { btn.textContent = 'VR non disponibile'; btn.disabled = true; return; }
        btn.addEventListener('click', async () => {
            if (renderer.xr.isPresenting) { renderer.xr.getSession()?.end(); return; }
            const s = await navigator.xr.requestSession('immersive-vr',
                { optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'] });
            await renderer.xr.setSession(s);
            btn.textContent = 'ESCI DA VR';
            controls.enabled = false;
            s.addEventListener('end', () => { btn.textContent = 'ENTRA IN VR'; controls.enabled = true; });
        });
    });
}

// ── Loop ──────────────────────────────────────────────────────────────────────
function animate() {
    const dt      = clock.getDelta();
    const elapsed = clock.getElapsedTime();

    updateWASD(dt);
    updateFly(dt);
    controls.update();

    if (starfield) {
        starfield.update(elapsed);
        pollHover(renderer.xr, () => starfield, hit => starfield.setHover(hit));
        pollGamepads(renderer.xr, starfield.group);
    }

    if (renderer.xr.isPresenting && infoPanel?.group.visible) {
        const xc  = renderer.xr.getCamera();
        const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(xc.quaternion);
        infoPanel.group.position.copy(xc.position).addScaledVector(fwd, 2.2);
        infoPanel.group.position.y -= 0.35;
        infoPanel.group.lookAt(xc.position);
    }

    renderer.render(scene, camera);
}

function onResize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
}

init();
