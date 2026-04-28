import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

const TMP_MATRIX = new THREE.Matrix4();
const TMP_ORIGIN = new THREE.Vector3();
const TMP_DIR    = new THREE.Vector3();
const RAYCASTER  = new THREE.Raycaster();
RAYCASTER.params.Points = { threshold: 6 };

const HOVER_RAYCASTER = new THREE.Raycaster();
HOVER_RAYCASTER.params.Points = { threshold: 6 };

// Riferimenti ai controller per hover polling
const _controllers = [];

// Geometria del raggio visivo del controller
const RAY_GEO = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -600)
]);
const RAY_MAT = new THREE.LineBasicMaterial({
    color: 0xaaccff, opacity: 0.25, transparent: true
});

export function setupControllers(renderer, scene, getStarfield, onSelect) {
    const factory = new XRControllerModelFactory();

    for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        _controllers[i] = controller;
        controller.add(new THREE.Line(RAY_GEO, RAY_MAT));
        scene.add(controller);

        const grip = renderer.xr.getControllerGrip(i);
        grip.add(factory.createControllerModel(grip));
        scene.add(grip);

        controller.addEventListener('selectstart', () => {
            const sf = getStarfield();
            if (!sf) return;

            TMP_MATRIX.identity().extractRotation(controller.matrixWorld);
            TMP_ORIGIN.setFromMatrixPosition(controller.matrixWorld);
            TMP_DIR.set(0, 0, -1).applyMatrix4(TMP_MATRIX);
            RAYCASTER.set(TMP_ORIGIN, TMP_DIR);

            const targets = [sf.normalPoints, sf.hostMesh];
            const hits = RAYCASTER.intersectObjects(targets, false);

            if (hits.length > 0) {
                const star = sf.getStarByHit(hits[0]);
                if (star) { onSelect(star); return; }
            }
            onSelect(null);
        });

        // Squeeze (grip button) → chiude pannello info
        controller.addEventListener('squeezestart', () => onSelect(null));
    }
}

/**
 * Polling hover in VR — usa il controller destro (indice 1).
 * Chiamato ogni frame nel loop di animazione.
 */
export function pollHover(xr, getStarfield, onHover) {
    if (!xr.isPresenting) return;
    const ctrl = _controllers[1]; // controller destro
    if (!ctrl?.matrixWorld) return;

    TMP_MATRIX.identity().extractRotation(ctrl.matrixWorld);
    TMP_ORIGIN.setFromMatrixPosition(ctrl.matrixWorld);
    TMP_DIR.set(0, 0, -1).applyMatrix4(TMP_MATRIX);
    HOVER_RAYCASTER.set(TMP_ORIGIN, TMP_DIR);

    const sf = getStarfield();
    if (!sf) return;

    const hits = HOVER_RAYCASTER.intersectObjects([sf.normalPoints, sf.hostMesh], false);
    onHover(hits.length > 0 ? hits[0] : null);
}

// Polling del gamepad per il joystick (chiamato nel loop di animazione)
export function pollGamepads(xr, starfieldGroup) {
    if (!xr.isPresenting) return;
    const session = xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
        if (!source.gamepad) continue;
        const axes = source.gamepad.axes;
        // axes[2] = joystick X, axes[3] = joystick Y (standard gamepad mapping)
        const jx = axes[2] ?? 0;
        const jy = axes[3] ?? 0;
        if (starfieldGroup && (Math.abs(jx) > 0.12 || Math.abs(jy) > 0.12)) {
            starfieldGroup.rotation.y -= jx * 0.025;
            starfieldGroup.rotation.x -= jy * 0.025;
        }
    }
}
