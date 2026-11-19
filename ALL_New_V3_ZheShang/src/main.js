/* ---------------------------------------------------------------------------
   main.js — 唯一的主循环
   滚动 → p → 世界。没有第二条数据通路，所以不可能"对不上"。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { createWorld } from './scene/setup.js';
import { createStage } from './chapters/stage.js';
import { tickMaterials } from './scene/materials.js';
import { buildStory, renderStory, Labels } from './ui/ui.js';
import { CHAPTERS, chapterAt } from './content.js';
import { clamp, srange, win } from './core/util.js';
import { COPY, chaptersFor, initialLanguage, rememberLanguage, localizeChrome } from './locale.js';

let language = initialLanguage();
let copy = COPY[language];
let chapters = chaptersFor(language);
localizeChrome(language);
const canvas = document.getElementById('gl');
const world = createWorld(canvas);
const { scene, camera, composer } = world;

const stage = createStage(scene);
const story = document.getElementById('story');
let gateOn = true;
let beats = buildStory(story, chapters, copy, gateOn);
const labels = new Labels(document.getElementById('labels'), camera, stage.models);
const nav = Array.from(document.querySelectorAll('.chapter-nav a'));
story.addEventListener('click', e => {
  const gateSwitch = e.target.closest('#gate-switch');
  if (!gateSwitch) return;
  gateOn = !gateOn;
  gateSwitch.setAttribute('aria-pressed', String(gateOn));
  gateSwitch.querySelector('.gate-action').textContent = gateOn ? copy.turnOff : copy.turnOn;
  document.getElementById('gate-state').textContent = gateOn ? copy.gateOn : copy.gateOff;
});

/* --------------------------------------------------------------- 拖拽 */
const view = { yaw: 0, pitch: 0 };
let dragging = false, lastX = 0, lastY = 0, dragMoved = 0;

canvas.addEventListener('pointerdown', (e) => {
  dragging = true; dragMoved = 0;
  lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add('is-dragging');
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  view.yaw += dx * 0.006;
  view.pitch = Math.max(-0.6, Math.min(0.6, view.pitch + dy * 0.0035));
});
const endDrag = () => { dragging = false; canvas.classList.remove('is-dragging'); };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

const progressFill = document.getElementById('progress-fill');
const chapterCount = document.getElementById('chapter-count');
const hint = document.getElementById('hint');
const loader = document.getElementById('loader');

/* ------------------------------------------------------------- progress */
function urlProgress() {
  const t = Number(new URLSearchParams(location.search).get('t'));
  return Number.isFinite(t) ? clamp(t, 0, 1) : 0;
}
const startT = urlProgress();

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

if (startT > 0) {
  // 深链接：直接把页面滚到对应位置
  requestAnimationFrame(() => {
    window.scrollTo(0, startT * scrollRange());
    targetP = startT;
  });
}

function seek(t) {
  p = targetP = t;
  window.scrollTo(0, t * scrollRange());
}
for (const link of nav) {
  link.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    history.pushState(null, '', link.href);
    seek(Number(link.dataset.t));
  });
}
window.addEventListener('popstate', () => seek(urlProgress()));

window.addEventListener('scroll', () => {
  targetP = scrollToP();
  if (targetP > 0.004 && hint) hint.classList.add('is-off');
}, { passive: true });

/* --------------------------------------------------------------- keys */
const jump = (dir) => {
  const cur = chapterAt(targetP).index;
  const next = clamp(cur + dir, 0, CHAPTERS.length - 1);
  const pNew = CHAPTERS[next].start + (CHAPTERS[next].end - CHAPTERS[next].start) * 0.42;
  window.scrollTo({ top: pNew * scrollRange(), behavior: 'smooth' });
};
window.addEventListener('keydown', (e) => {
  if (e.key === ' ' && e.target.closest?.('button, a, input')) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); jump(1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); jump(-1); }
  else if (e.key === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (e.key === 'End') { e.preventDefault(); window.scrollTo({ top: scrollRange(), behavior: 'smooth' }); }
});

/* ------------------------------------------------------------- resize */
function applyFraming() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.setViewOffset(w, h, w > 760 ? -w * 0.16 : 0, w > 760 ? 0 : h * 0.16, w, h);
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
const qList = ['high', 'mid', 'low'];
function updateControls() {
  qBtn.textContent = copy.qualities[qIndex];
  qBtn.title = copy.quality + ' · ' + copy.qualities[qIndex];
  qBtn.setAttribute('aria-label', qBtn.title);
  fullBtn.title = document.fullscreenElement ? copy.exitFull : copy.enterFull;
  fullBtn.setAttribute('aria-label', fullBtn.title);
}
updateControls();
document.addEventListener('fullscreenchange', updateControls);
qBtn?.addEventListener('click', () => {
  qIndex = (qIndex + 1) % qList.length;
  world.setQuality(qList[qIndex]);
  applyFraming();
  updateControls();
});

function showChapter(ci) {
  lastChapter = ci;
  labels.setChapter(chapters[ci]);
  chapterCount.textContent = String(ci + 1).padStart(2, '0') + ' / ' + String(chapters.length).padStart(2, '0');
  chapterCount.setAttribute('aria-label', copy.chapter + ' ' + chapterCount.textContent);
  const active = ci <= 5 ? 0 : ci === 6 ? 1 : ci <= 11 ? 2 : -1;
  nav.forEach((link, i) => {
    if (i === active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  renderStory(beats, p);
}

for (const button of document.querySelectorAll('.language-switch button[data-lang]')) {
  button.addEventListener('click', () => {
    const next = button.dataset.lang;
    if (next === language) return;
    language = next;
    copy = COPY[language];
    chapters = chaptersFor(language);
    rememberLanguage(language);
    localizeChrome(language);
    updateControls();
    beats = buildStory(story, chapters, copy, gateOn);
    showChapter(chapterAt(p).index);
  });
}

/* --------------------------------------------------------------- loop */
let last = performance.now();
const _v = new THREE.Vector3();
let fpsFrames = 0;
let fpsLast = performance.now();

function render(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  time += dt;

  // 惰性跟随：滚轮停下来以后画面还在慢慢靠过去
  const k = 1 - Math.exp(-dt * 6.5);
  p += (targetP - p) * k;
  if (Math.abs(targetP - p) < 1e-5) p = targetP;

  const out = stage.apply(p, time, view, gateOn);

  // 竖屏 / 窄屏：把相机整体往后退，保证主体不被裁掉
  const aspectFit = camera.aspect < 1.62
    ? Math.min(1.62 / camera.aspect, 2.5)
    : 1;
  const margin = 0.17 * (1 - srange(p, 0.535, 0.560)) +
    0.15 * win(p, 0.739, 0.766, 0.791, 0.808);
  const fit = aspectFit * (1 + margin);
  if (fit === 1) {
    camera.position.copy(out.cameraPos);
  } else {
    camera.position.copy(out.cameraTarget).addScaledVector(
      _v.subVectors(out.cameraPos, out.cameraTarget), fit
    );
  }
  camera.lookAt(out.cameraTarget);
  camera.updateMatrixWorld();
  if (Math.abs(camera.fov - out.fov) > 0.01) {
    camera.fov = out.fov;
    camera.updateProjectionMatrix();
  }

  // 光照跟着镜头走一点，让金属一直有"眼神光"
  world.head.position.copy(camera.position);
  world.headTarget.position.copy(out.cameraTarget);
  world.updateBackdrop?.(p, time);

  tickMaterials(scene, time);

  const ci = chapterAt(p).index;
  if (ci !== lastChapter) showChapter(ci);

  labels.render();
  progressFill.style.width = (p * 100).toFixed(2) + '%';

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

window.__setT = (v) => {
  targetP = clamp(v, 0, 1);
  p = targetP;
  window.scrollTo(0, targetP * scrollRange());
};
window.__dbg = { scene, camera, world, stage, THREE };
