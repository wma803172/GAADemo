import * as THREE from 'three';
import { clamp, lerp, srange } from '../core/util.js';
import { createFadeThrough } from '../core/transition.js';
import { buildFabrication } from '../models/fabrication.js';
import { buildFabricationPanel } from '../ui/fabrication-panel.js';
import { createFabricationCamera, recommendedViews } from './fabrication-camera.js';

// The model can reconstruct any point in an operation. Only the clock and
// camera live here; going backwards never mutates the next operation's mesh.
const DURATIONS = [3.2, 3.5, 3.0, 4.4, 4.0, 4.4, 4.8, 3.4];
const LAST = DURATIONS.length - 1;
const TERMINALS = { source: '源极', gate: '栅极', drain: '漏极' };
const FEATURES = [
  ['fourthSheet', '第四层硅', 0.95],
  ['sti', '浅沟槽隔离', 0.84],
  ['dummy', '假栅', 0.60],
  ['spacer', '内侧间隔层', 0.84],
  ['epitaxy', '源区外延', 0.60],
  ['releaseGap', '释放出的间隙', 0.80],
  ['gateLiner', '环绕栅介质', 0.31],
];

export function createFabricationTour({ scene, camera, canvas, host, lockStory, restoreStory }) {
  const swap = createFadeThrough(owner => owner);
  const pointer = new THREE.Vector2();
  const projected = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  let model, rig, panel, pin, pinLine, pinText, pinWidth, state;
  let engaged = false, showing = false, wanted = false, restored = false;
  let destination = 'return';
  let entry = 0, exit = 0, move = null, drag = null;
  let yaw = 0, pitch = 0, reduced = false;

  function resetView() {
    state.view = recommendedViews[state.step];
    yaw = pitch = 0;
  }

  function arrive(step, atEnd) {
    state.step = step;
    state.fraction = atEnd || reduced ? 1 : 0;
    state.playing = !atEnd && !reduced;
    state.terminal = step === LAST ? 'gate' : null;
    resetView();
    move = null;
  }

  function changeStep(direction) {
    if (!showing || state.leaving || move) return;
    const next = state.step + direction;
    if (next < 0 || next > LAST) return;
    entry = 1;
    const edge = direction > 0 ? 1 : 0;
    if (reduced || Math.abs(state.fraction - edge) < 0.001) {
      arrive(next, direction < 0);
    } else {
      move = { next, from: state.fraction, to: edge, elapsed: 0 };
      state.playing = false;
    }
  }

  function replay() {
    if (state.leaving) return;
    move = null;
    entry = state.step === 0 && !reduced ? 0 : 1;
    state.fraction = 0;
    state.playing = true;
    if (state.step === LAST) state.terminal = 'gate';
    resetView();
  }

  function selectTerminal(key) {
    if (state.step === LAST && !state.leaving && Object.hasOwn(TERMINALS, key)) state.terminal = key;
  }

  function close(where = 'return') {
    if (!engaged || restored) return;
    destination = where;
    wanted = false;
    drag = move = null;
    state.leaving = true;
  }

  function continueToM6() {
    if (state.step !== LAST || state.leaving) return;
    move = drag = null;
    state.playing = false;
    state.fraction = 1;
    state.terminal = 'gate';
    state.view = 'overview';
    state.leaving = true;
    state.phase = 'bridge';
    yaw = pitch = 0;
    destination = 'm6';
  }

  function prepare() {
    if (model) return;
    model = buildFabrication();
    model.root.visible = false;
    scene.add(model.root);
    rig = createFabricationCamera(scene);
    rig.hide();
    panel = buildFabricationPanel(host, {
      next: () => changeStep(1), previous: () => changeStep(-1), replay,
      togglePlayback() {
        if (state.leaving) return;
        move = null;
        if (state.fraction === 1) replay();
        else state.playing = !state.playing;
      },
      scrub(fraction) {
        if (state.leaving) return;
        move = null;
        state.fraction = clamp(fraction);
        state.playing = false;
      },
      setView(view) {
        if (state.leaving) return;
        state.view = view;
        yaw = pitch = 0;
      },
      resetView, selectTerminal, close: () => close(), continueToM6,
    });
    pin = document.createElement('span');
    pin.className = 'fab-anchor';
    pin.setAttribute('aria-hidden', 'true');
    pin.innerHTML = '<i></i><b></b>';
    pinLine = pin.firstElementChild;
    pinText = pin.lastElementChild;
    panel.element.querySelector('.fab-viewport').append(pin);
  }

  function open(prefersReduced) {
    if (engaged && !restored) return;
    prepare();
    reduced = prefersReduced;
    state = { step: 0, fraction: 0, view: 'overview', terminal: null, leaving: false, playing: true, phase: 'entry' };
    arrive(0, false);
    entry = reduced ? 1 : 0;
    exit = 0;
    drag = null;
    engaged = wanted = true;
    restored = false;
    destination = 'return';
    swap('story', 0, true);
    lockStory();
  }

  function tick(dt) {
    if (wanted && state.phase === 'bridge') {
      exit = reduced ? 1 : clamp(exit + dt / 2.25);
      if (exit === 1) close('m6');
    } else if (!state.leaving) {
      if (entry < 1) {
        if (state.playing || reduced) entry = reduced ? 1 : clamp(entry + dt / 2.25);
      } else if (move) {
        move.elapsed += dt;
        state.fraction = lerp(move.from, move.to, srange(move.elapsed, 0, 0.22));
        if (move.elapsed >= 0.22 || reduced) arrive(move.next, move.next < state.step);
      } else if (state.playing) {
        state.fraction = clamp(state.fraction + dt / DURATIONS[state.step]);
        if (state.fraction === 1) state.playing = false;
      }
      state.phase = entry < 1 ? 'entry' : 'step';
    }
  }

  function updatePin(rect, show, modelView) {
    let feature = FEATURES[state.step];
    if (state.step === LAST) feature = [state.terminal, TERMINALS[state.terminal], 0.86];
    if (state.step === 6 && state.fraction > 0.90) feature = ['gateFill', '共用金属栅', 0.90];
    const [key, label, threshold] = feature;
    const anchor = model.anchors[key];
    pin.hidden = !show || !anchor || state.leaving || state.fraction < threshold ||
      (modelView === 'cross' && anchor.position.z > 0.015) ||
      (modelView === 'longitudinal' && anchor.position.x > 0.015);
    if (pin.hidden) return;
    anchor.getWorldPosition(projected).project(camera);
    const x = (projected.x + 1) * window.innerWidth / 2 - rect.left;
    const y = (1 - projected.y) * window.innerHeight / 2 - rect.top;
    pin.hidden = projected.z < -1 || projected.z > 1 || x < 3 || x > rect.width - 3 || y < 3 || y > rect.height - 3;
    if (pin.hidden) return;
    if (pinText.textContent !== label || !pinWidth) {
      pinText.textContent = label;
      pinWidth = pinText.offsetWidth;
    }
    const lead = Math.min(55, rect.width * 0.11);
    const toRight = x + lead + pinWidth + 4 < rect.width;
    const dx = toRight ? lead : -lead;
    const dy = y < 35 ? 22 : -22;
    pinText.style.transform = 'translate(' + (dx - (toRight ? 0 : pinWidth)) + 'px,' + (dy - 10) + 'px)';
    pinLine.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad) scaleX(' + Math.hypot(dx, dy) + ')';
    pin.style.left = x.toFixed(1) + 'px';
    pin.style.top = y.toFixed(1) + 'px';
  }

  function update(elapsed, prefersReduced) {
    if (!engaged) return { drawing: false, opacity: 1 };
    reduced = prefersReduced;
    const frame = swap(wanted ? 'process' : 'story', elapsed, reduced);
    if (frame.progress === 'story') {
      if (!wanted && !restored) {
        restored = true;
        showing = false;
        model.root.visible = false;
        rig.hide();
        panel.hide();
        document.body.classList.remove('fabrication-mode');
        restoreStory(destination);
      }
      if (restored && frame.opacity === 1) engaged = false;
      return { drawing: false, opacity: frame.opacity };
    }
    if (!showing) {
      showing = true;
      document.body.classList.add('fabrication-mode');
      panel.show();
      panel.render(state);
      panel.focusStep();
    }
    // Ignore time spent in a background tab, so returning to it preserves
    // the operation the visitor was watching.
    const dt = Math.min(elapsed, 0.10);
    tick(dt);
    panel.render(state);
    panel.element.style.opacity = String(frame.opacity * (1 - srange(exit, 0.12, 0.55)));
    const rect = panel.viewportRect();
    const pose = rig.update({
      step: state.step, fraction: state.fraction, view: state.view, yaw, pitch, dt,
      entry, exit, reduced, rect, screenWidth: window.innerWidth, screenHeight: window.innerHeight,
      camera, anchors: model.anchors,
    });
    model.root.visible = pose.deviceVisible;
    const modelView = pose.modelView ?? state.view;
    model.apply(state.step, state.fraction, modelView, state.terminal);
    camera.updateMatrixWorld();
    updatePin(rect, pose.deviceVisible, modelView);
    return { drawing: true, target: pose.target, opacity: frame.opacity };
  }

  function pointerDown(event) {
    if (!showing || state.leaving || !event.isPrimary || event.button !== 0) return;
    const r = panel.viewportRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, moved: false };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('is-dragging');
  }

  function pointerMove(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.moved) {
      yaw = drag.yaw - dx * 0.008;
      pitch = clamp(drag.pitch + dy * 0.006, -1.1, 1.1);
    }
  }

  function pointerEnd(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (event.type === 'pointerup' && !drag.moved && state.step === LAST && state.fraction > 0.85) {
      pointer.set(2 * event.clientX / window.innerWidth - 1, 1 - 2 * event.clientY / window.innerHeight);
      ray.setFromCamera(pointer, camera);
      const candidates = model.pickables.filter(mesh => {
        for (let node = mesh; node; node = node.parent) if (!node.visible) return false;
        return true;
      });
      const hit = ray.intersectObjects(candidates, false)[0];
      if (hit) selectTerminal(hit.object.userData.terminal);
    }
    drag = null;
    canvas.classList.remove('is-dragging');
  }

  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (!showing || state.leaving || event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      changeStep(event.key === 'ArrowRight' ? 1 : -1);
    }
  }

  return { open, close, update, keydown, pointerDown, pointerMove, pointerEnd,
    get active() { return engaged && !restored; } };
}
