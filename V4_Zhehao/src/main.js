/* ---------------------------------------------------------------------------
   main.js — 唯一的主循环
   滚动 → p → 世界。没有第二条数据通路，所以不可能"对不上"。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { createWorld } from './scene/setup.js';
import { createStage, sceneIndexAt } from './chapters/stage.js';
import { createFabricationTour } from './chapters/fabrication.js';
import { createFadeThrough } from './core/transition.js';
import { tickMaterials } from './scene/materials.js';
import { buildStory, renderStory, Rail, ScaleBar, Labels } from './ui/ui.js';
import { mountComparisons } from './ui/comparisons.js';
import { CHAPTERS, chapterAt } from './content.js';
import { clamp } from './core/util.js';

const canvas = document.getElementById('gl');
const world = createWorld(canvas);
const { scene, camera, composer } = world;

const storyModels = new THREE.Group();
scene.add(storyModels);
const stage = createStage(storyModels);
const sceneTransition = createFadeThrough(sceneIndexAt);
const chapterTransition = createFadeThrough(p => chapterAt(p).index);
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const story = document.getElementById('story');
const experiments = document.getElementById('experiments');
const beats = buildStory(story);
const gaa = story.querySelector('[data-chapter="gaa"]');
const gateControl = document.createElement('div');
gateControl.className = 'gate-control';
gateControl.innerHTML = '<button type="button">关上开关</button><output aria-live="polite">四层沟道已导通</output>';
gaa.append(gateControl);
const gateButton = gateControl.querySelector('button');
let channelOn = true;
gateButton.addEventListener('click', () => {
  channelOn = !channelOn;
  stage.setChannelOn(channelOn);
  gateButton.textContent = channelOn ? '关上开关' : '打开开关';
  gateControl.querySelector('output').textContent = channelOn ? '四层沟道已导通' : '四层沟道已关断';
});
const processButton = document.createElement('button');
processButton.type = 'button';
processButton.className = 'fab-entry';
processButton.textContent = '这四条硅带是怎么做出来的？ →';
gaa.append(processButton);
mountComparisons(beats, experiments);
const nextPanel = document.createElement('a');
nextPanel.className = 'story-next';
nextPanel.href = '#wafer-overview';
nextPanel.textContent = '继续看晶圆与器件实验 ↓';
story.querySelector('.outro-card').append(nextPanel);
const rail = new Rail(document.getElementById('rail'));
const scalebar = new ScaleBar(document.getElementById('scalebar'));
const labels = new Labels(document.getElementById('labels'), camera, stage.models);

/* --------------------------------------------------------------- 拖拽 */
const view = { yaw: 0, pitch: 0 };
let dragging = false, lastX = 0, lastY = 0;
let savedGaaProgress = 0;
const gaaChapter = CHAPTERS.find(ch => ch.id === 'gaa');
const frontChapter = CHAPTERS.find(ch => ch.id === 'front');
const tour = createFabricationTour({
  scene, camera, canvas, host: document.getElementById('app'),
  lockStory() {
    savedGaaProgress = clamp(p, gaaChapter.start, gaaChapter.end - 1e-5);
    document.documentElement.classList.add('fabrication-lock');
    story.inert = experiments.inert = true;
    document.querySelector('.topic-links').inert = true;
    dragging = false;
    canvas.classList.remove('is-dragging');
  },
  restoreStory(destination) {
    document.documentElement.classList.remove('fabrication-lock');
    story.inert = experiments.inert = false;
    document.querySelector('.topic-links').inert = false;
    const advance = destination === 'm6';
    const progress = advance ? frontChapter.start + frontChapter.weight * 0.12 : savedGaaProgress;
    if (advance) view.yaw = view.pitch = 0;
    seek(progress);
    sceneTransition(progress, 0, true);
    chapterTransition(progress, 0, true);
    applyFraming();
    requestAnimationFrame(() => {
      if (advance) {
        const heading = story.querySelector('[data-chapter="front"] h2');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      } else {
        processButton.focus({ preventScroll: true });
      }
    });
  },
});
processButton.addEventListener('click', () => tour.open(motionPreference.matches));

canvas.addEventListener('pointerdown', (e) => {
  if (tour.active) { tour.pointerDown(e); return; }
  if (!e.isPrimary || e.button !== 0) return;
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (tour.active) { tour.pointerMove(e); return; }
  if (!dragging || !e.isPrimary) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  view.yaw += dx * 0.006;
  view.pitch = Math.max(-0.6, Math.min(0.6, view.pitch + dy * 0.0035));
});
const endDrag = (e) => {
  if (tour.active) tour.pointerEnd(e);
  dragging = false;
  canvas.classList.remove('is-dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

const progressFill = document.getElementById('progress-fill');
const chapterCount = document.getElementById('chapter-count');
const hint = document.getElementById('hint');
const loader = document.getElementById('loader');

/* ------------------------------------------------------------- progress */
const params = new URLSearchParams(location.search);
const startT = clamp(Number(params.get('t')) || 0, 0, 1);

let targetP = startT;
let p = startT;
let time = 0;
let lastChapter = -1;

function scrollRange() {
  return Math.max(1, story.offsetHeight - window.innerHeight);
}
function scrollToP() {
  return clamp(window.scrollY / scrollRange(), 0, 1);
}

function seek(progress) {
  targetP = p = clamp(progress, 0, 1);
  window.scrollTo(0, p * scrollRange());
}
function restoreEntry() {
  const fragment = document.getElementById(location.hash.slice(1));
  if (fragment && experiments.contains(fragment)) fragment.scrollIntoView();
  else if (params.has('t')) seek(startT);
}
if (location.hash || params.has('t')) {
  history.scrollRestoration = 'manual';
  requestAnimationFrame(restoreEntry);
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) requestAnimationFrame(restoreEntry);
  }, { once: true });
}

let belowStory = false;
window.addEventListener('scroll', () => {
  if (tour.active) return;
  targetP = scrollToP();
  belowStory = window.scrollY >= story.offsetHeight - 65;
  story.inert = belowStory;
  document.body.classList.toggle('reading-experiments', belowStory);
  if (targetP > 0.004 && hint) hint.classList.add('is-off');
}, { passive: true });

/* --------------------------------------------------------------- keys */
document.querySelectorAll('[data-jump]').forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const dest = new URL(link.href);
    if (location.protocol !== 'file:' && location.href !== dest.href) history.pushState(null, '', dest.href);
    seek(Number(dest.searchParams.get('t')));
  });
});
window.addEventListener('popstate', () => {
  if (location.hash) return;
  const t = new URLSearchParams(location.search).get('t');
  if (t !== null) seek(Number(t) || 0);
});
const jump = (dir) => {
  const cur = chapterAt(targetP).index;
  if (cur === CHAPTERS.length - 1 && dir > 0) {
    experiments.scrollIntoView();
    return;
  }
  const next = clamp(cur + dir, 0, CHAPTERS.length - 1);
  const pNew = CHAPTERS[next].start + (CHAPTERS[next].end - CHAPTERS[next].start) * 0.42;
  window.scrollTo({ top: pNew * scrollRange(), behavior: 'smooth' });
};
window.addEventListener('keydown', (e) => {
  if (belowStory || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (tour.active) { tour.keydown(e); return; }
  if (e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (e.key === ' ' && e.target.closest('button, a')) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); jump(1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); jump(-1); }
  else if (e.key === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (e.key === 'End') { e.preventDefault(); window.scrollTo({ top: scrollRange(), behavior: 'smooth' }); }
});

/* ------------------------------------------------------------- resize */
function applyFraming() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  const shift = w > 900 ? 0.105 : 0.0;
  const captionSpace = w <= 760 && h > w ? h * 0.19 : 0;
  camera.setViewOffset(w, h, -w * shift, captionSpace, w, h);
}
applyFraming();
window.addEventListener('resize', () => { world.resize(); applyFraming(); });
const fullBtn = document.getElementById('btn-full');
fullBtn?.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});

const qBtn = document.getElementById('btn-quality');
let qIndex = 0;
const qList = [['high', '高'], ['mid', '中'], ['low', '低']];
qBtn?.addEventListener('click', () => {
  qIndex = (qIndex + 1) % qList.length;
  world.setQuality(qList[qIndex][0]);
  qBtn.textContent = qList[qIndex][1];
});

/* --------------------------------------------------------------- loop */
let last = performance.now();
const _v = new THREE.Vector3();
let fpsFrames = 0;
let fpsLast = performance.now();

function drawStory(elapsed, dt, modeOpacity) {
  // 惰性跟随：滚轮停下来以后画面还在慢慢靠过去
  const k = 1 - Math.exp(-dt * 6.5);
  if (!tour.active) {
    p += (targetP - p) * k;
    if (Math.abs(targetP - p) < 1e-5) p = targetP;
  }

  const sceneFrame = sceneTransition(p, elapsed, motionPreference.matches);
  const chapterFrame = chapterTransition(p, elapsed, motionPreference.matches);
  const out = stage.apply(sceneFrame.progress, time, view);
  const opacity = (sceneFrame.opacity * modeOpacity).toFixed(3);
  canvas.style.opacity = opacity;

  // 竖屏 / 窄屏：把相机整体往后退，保证主体不被裁掉
  const fit = camera.aspect < 1.62
    ? Math.min(1.62 / camera.aspect, 2.15) * (window.innerWidth < 760 ? 1.05 : 1)
    : 1;
  if (fit === 1) {
    camera.position.copy(out.cameraPos);
  } else {
    camera.position.copy(out.cameraTarget).addScaledVector(
      _v.subVectors(out.cameraPos, out.cameraTarget), fit
    );
  }
  camera.lookAt(out.cameraTarget);
  if (Math.abs(camera.fov - out.fov) > 0.01) {
    camera.fov = out.fov;
    camera.updateProjectionMatrix();
  }

  const ci = chapterAt(chapterFrame.progress).index;
  if (ci !== lastChapter) {
    lastChapter = ci;
    labels.setChapter(CHAPTERS[ci]);
    chapterCount.textContent = String(ci + 1).padStart(2, '0') + ' / ' + String(CHAPTERS.length).padStart(2, '0');
  }

  // A fast reversal can send the caption and model to different chapters.
  // Keep the caption paired with a shot or a chapter it actually describes.
  const sameShot = sceneIndexAt(sceneFrame.progress) === sceneIndexAt(chapterFrame.progress);
  const sameChapter = chapterAt(sceneFrame.progress).index === ci;
  const pinOpacity = Math.min(chapterFrame.opacity, sceneFrame.opacity);
  let copyOpacity = chapterFrame.opacity;
  if (!sameShot && !sameChapter) copyOpacity = 0;
  else if (CHAPTERS[ci].labels.length) copyOpacity = pinOpacity;
  renderStory(beats, chapterFrame.progress, copyOpacity * modeOpacity);
  rail.render(chapterFrame.progress, copyOpacity * modeOpacity);
  scalebar.render(p);
  labels.render(0.92 * pinOpacity * modeOpacity);
  progressFill.style.width = (p * 100).toFixed(2) + '%';
  tickMaterials(storyModels, time);
  return out.cameraTarget;
}

function render(now) {
  const elapsed = (now - last) / 1000;
  const dt = Math.min(elapsed, 0.05);
  last = now;
  if (belowStory && !tour.active) {
    requestAnimationFrame(render);
    return;
  }
  time += dt;
  const frame = tour.update(elapsed, motionPreference.matches);
  storyModels.visible = !frame.drawing;
  const target = frame.drawing ? frame.target : drawStory(elapsed, dt, frame.opacity);
  if (frame.drawing) canvas.style.opacity = frame.opacity.toFixed(3);
  world.key.position.set(camera.position.x + 6, camera.position.y + 9, camera.position.z + 5);
  world.head.position.copy(camera.position);
  world.headTarget.position.copy(target);
  world.floor.position.x = camera.position.x;
  world.floor.position.z = camera.position.z;
  world.floor.material.uniforms.uCenter.value.set(camera.position.x, camera.position.z);
  composer.render();

  // 帧率统计（便于验收 / 自适应降档）
  fpsFrames++;
  if (now - fpsLast > 1000) {
    window.__fps = Math.round((fpsFrames * 1000) / (now - fpsLast));
    fpsFrames = 0;
    fpsLast = now;
  }
  requestAnimationFrame(render);
}

/* --------------------------------------------------------------- boot */
requestAnimationFrame((t) => {
  last = t;
  requestAnimationFrame(render);
  setTimeout(() => loader?.classList.add('is-done'), 260);
  window.__ready = true;
});

window.__setT = seek;
window.__dbg = { scene, camera, world, stage, THREE };
