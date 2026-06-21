// Controllo gestuale via webcam — MediaPipe HandLandmarker
// Gesti: indice punta (hover), pinch (seleziona), pugno (ruota), due mani (zoom)

const MEDIAPIPE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';
const WASM_URL      = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL     = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const PINCH_ON   = 0.38;
const PINCH_OFF  = 0.58;
const SMOOTH     = 0.18;   // cursore: peso del nuovo campione — più basso = più morbido
const ROT_SMOOTH = 0.22;   // inerzia rotazione
const ZOOM_SMOOTH= 0.20;   // inerzia zoom
const ROT_DEAD   = 0.004;  // soglia movimento minimo pugno per ignorare microtremori

const lerp = (a, b, t) => a + (b - a) * t;
const dist       = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const handSize   = lm    => dist(lm[0], lm[9]);
const pinchRatio = lm    => dist(lm[4], lm[8]) / (handSize(lm) || 0.001);

function extendedFingers(lm) {
    return [[8,6],[12,10],[16,14],[20,18]]
        .filter(([tip, pip]) => dist(lm[tip], lm[0]) > dist(lm[pip], lm[0]))
        .length;
}

export function setupHandTracking(cb) {
    let landmarker = null, video = null, stream = null;
    let running = false;
    let pinching = false, fistPrev = null, zoomPrev = null;
    let sx = null, sy = null;
    // velocità smorzata per cursore, rotazione e zoom
    let vx = 0, vy = 0;
    let rdx = 0, rdy = 0;   // rotation velocity
    let zdv = 0;             // zoom velocity
    let lastTs = 0;

    const preview = cb.preview ?? null;
    const pctx    = preview?.getContext('2d') ?? null;

    async function ensureLandmarker() {
        if (landmarker) return;
        cb.onStatus?.('CARICO…');
        let FilesetResolver, HandLandmarker;
        try {
            ({ FilesetResolver, HandLandmarker } = await import(MEDIAPIPE_URL));
        } catch (e) {
            throw new Error('CDN non raggiungibile: ' + e.message);
        }
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        // tenta GPU, poi CPU come fallback
        try {
            landmarker = await HandLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO', numHands: 2,
            });
        } catch {
            landmarker = await HandLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                runningMode: 'VIDEO', numHands: 2,
            });
        }
    }

    async function start() {
        if (running) return;
        try {
            await ensureLandmarker();
        } catch (e) {
            console.error('[COSMO hands]', e);
            cb.onStatus?.('ERR: ' + e.message.slice(0, 30));
            return;
        }
        cb.onStatus?.('WEBCAM…');
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            });
        } catch (err) {
            console.error('[COSMO hands]', err);
            cb.onStatus?.(err.name === 'NotAllowedError' ? 'PERMESSO NEGATO' : 'WEBCAM ERRORE');
            return;
        }
        video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        await video.play();
        running = true;
        if (preview) preview.style.display = 'block';
        cb.onStatus?.('ON — 🖐 usa le mani');
        loop();
    }

    function stop() {
        running = false;
        stream?.getTracks().forEach(t => t.stop());
        stream = null; video = null;
        pinching = false; fistPrev = null; zoomPrev = null;
        sx = sy = vx = vy = rdx = rdy = zdv = null;
        if (preview) preview.style.display = 'none';
        cb.onCursor?.(null);
        cb.onStatus?.('OFF');
    }

    function toggle() { running ? stop() : start(); }

    function loop() {
        if (!running) return;
        requestAnimationFrame(loop);
        if (!video || video.readyState < 2) return;
        // applica inerzia rotazione e zoom ad ogni frame di display
        if (rdx || rdy) {
            cb.onRotate?.(rdx, rdy);
            rdx = lerp(rdx, 0, 0.18);
            rdy = lerp(rdy, 0, 0.18);
            if (Math.abs(rdx) < 0.0001) rdx = 0;
            if (Math.abs(rdy) < 0.0001) rdy = 0;
        }
        if (zdv) {
            cb.onZoom?.(zdv);
            zdv = lerp(zdv, 0, 0.22);
            if (Math.abs(zdv) < 0.01) zdv = 0;
        }
        // MediaPipe: usa performance.now(), salta se il frame video non è cambiato
        const now = performance.now();
        if (now - lastTs < 16) return;   // max ~60fps per il rilevamento
        lastTs = now;
        let res;
        try { res = landmarker.detectForVideo(video, now); }
        catch (e) { console.error('[COSMO hands loop]', e); return; }
        const hands = res.landmarks ?? [];
        drawPreview(hands);
        processHands(hands);
    }

    function drawPreview(hands) {
        if (!pctx) return;
        const w = preview.width, h = preview.height;
        pctx.save();
        pctx.translate(w, 0); pctx.scale(-1, 1);
        pctx.drawImage(video, 0, 0, w, h);
        pctx.restore();
        pctx.fillStyle = '#FFD700';
        for (const lm of hands)
            for (const p of lm) {
                pctx.beginPath();
                pctx.arc((1 - p.x) * w, p.y * h, 2, 0, Math.PI * 2);
                pctx.fill();
            }
    }

    function processHands(hands) {
        if (!hands.length) {
            pinching = false; fistPrev = null; zoomPrev = null; sx = sy = null;
            cb.onCursor?.(null);
            return;
        }
        // due mani in pinch → zoom con inerzia
        if (hands.length === 2 && pinchRatio(hands[0]) < 0.45 && pinchRatio(hands[1]) < 0.45) {
            const d = dist(hands[0][8], hands[1][8]);
            if (zoomPrev != null) {
                const raw = d - zoomPrev;
                zdv = lerp(zdv ?? 0, raw, ZOOM_SMOOTH);
            }
            zoomPrev = d;
            fistPrev = null; pinching = false; sx = sy = null;
            cb.onCursor?.(null);
            return;
        }
        zoomPrev = null;

        const lm = hands[0];
        // pugno → ruota con inerzia e dead-zone
        if (extendedFingers(lm) === 0) {
            const cx = 1 - lm[9].x, cy = lm[9].y;
            if (fistPrev) {
                const dx = cx - fistPrev.x, dy = cy - fistPrev.y;
                if (Math.abs(dx) > ROT_DEAD || Math.abs(dy) > ROT_DEAD) {
                    rdx = lerp(rdx, dx, ROT_SMOOTH);
                    rdy = lerp(rdy, dy, ROT_SMOOTH);
                }
            }
            fistPrev = { x: cx, y: cy };
            pinching = false; sx = sy = null;
            cb.onCursor?.(null);
            return;
        }
        fistPrev = null;
        rdx = rdy = 0;

        // cursore su punta indice — filtro doppio passaggio per eliminare tremolio
        const rx = (1 - lm[8].x) * innerWidth;
        const ry = lm[8].y * innerHeight;
        if (sx == null) { sx = rx; sy = ry; vx = 0; vy = 0; }
        vx = lerp(vx, rx - sx, SMOOTH);
        vy = lerp(vy, ry - sy, SMOOTH);
        sx += vx;
        sy += vy;

        const ratio = pinchRatio(lm);
        const was   = pinching;
        if (!pinching && ratio < PINCH_ON)      pinching = true;
        else if (pinching && ratio > PINCH_OFF) pinching = false;

        cb.onCursor?.({ x: sx, y: sy, pinching });
        if (pinching && !was) cb.onPinchStart?.(sx, sy);
    }

    return { start, stop, toggle, get running() { return running; } };
}
