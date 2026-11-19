/* ---------------------------------------------------------------------------
   main.js — 唯一的主循环
   滚动 → p → 世界。没有第二条数据通路，所以不可能"对不上"。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { createWorld } from './scene/setup.js';
import { createStage } from './chapters/stage.js';
import { tickMaterials } from './scene/materials.js';
import { buildStory, renderStory, Rail, ScaleBar, Labels } from './ui/ui.js';
import { CHAPTERS, chapterAt } from './content.js';
import { languages, readLanguage, saveLanguage } from './ui/language.js';
import { clamp } from './core/util.js';

const canvas = document.getElementById('gl');
const world = createWorld(canvas);
const { scene, camera, composer } = world;

const stage = createStage(scene);
let language = readLanguage();
let copy = languages[language];
const story = document.getElementById('story');
let beats = buildStory(story, copy.chapters, copy.scroll);
const rail = new Rail(document.getElementById('rail'));
const scalebar = new ScaleBar(document.getElementById('scalebar'));
const labels = new Labels(document.getElementById('labels'), camera, stage.models);

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
const params = new URLSearchParams(location.search);
const startT = params.has('t') ? clamp(parseFloat(params.get('t')), 0, 1) : 0;

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
  if (e.target.closest?.('button')) return;
  if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); jump(1); }
  else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); jump(-1); }
  else if (e.key === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  else if (e.key === 'End') { e.preventDefault(); window.scrollTo({ top: scrollRange(), behavior: 'smooth' }); }
});

/* ------------------------------------------------------------- resize */
function applyFraming() {
  const w = window.innerWidth, h = window.innerHeight;
  const shift = w > 900 ? 0.105 : 0.0;
  camera.setViewOffset(w, h, -w * shift, 0, w, h);
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
qBtn?.addEventListener('click', () => {
  qIndex = (qIndex + 1) % qList.length;
  world.setQuality(qList[qIndex]);
  updateControls();
});

const languageSwitch = document.querySelector('.language-switch');
function updateControls() {
  qBtn.textContent = copy.levels[qIndex];
  qBtn.title = copy.quality;
  qBtn.setAttribute('aria-label', copy.quality + ' · ' + copy.levels[qIndex]);
  fullBtn.title = document.fullscreenElement ? copy.exitFull : copy.full;
  fullBtn.setAttribute('aria-label', fullBtn.title);
}

function localizeControls() {
  document.documentElement.lang = copy.lang;
  document.title = copy.title;
  document.querySelector('meta[name="description"]').content = copy.description;
  document.querySelector('.brand-text i').textContent = copy.brand;
  document.querySelector('.hint-text').textContent = copy.scroll;
  document.getElementById('loader-text').textContent = copy.loading;
  scalebar.note = copy.scale;
  languageSwitch.setAttribute('aria-label', copy.switcher);
  for (const button of languageSwitch.querySelectorAll('[data-lang]')) {
    button.setAttribute('aria-pressed', String(button.dataset.lang === language));
  }
  updateControls();
}
localizeControls();
document.addEventListener('fullscreenchange', updateControls);

languageSwitch.addEventListener('click', event => {
  const next = event.target.closest('button')?.dataset.lang;
  if (!next || next === language) return;
  language = next;
  copy = languages[language];
  saveLanguage(language);
  localizeControls();
  beats = buildStory(story, copy.chapters, copy.scroll);
  lastChapter = renderStory(beats, p);
  labels.setChapter(copy.chapters[lastChapter]);
  scalebar.render(p);
});

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

  const out = stage.apply(p, time, view);

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

  // 光照跟着镜头走一点，让金属一直有"眼神光"
  world.key.position.set(camera.position.x + 6, camera.position.y + 9, camera.position.z + 5);
  world.head.position.copy(camera.position);
  world.headTarget.position.copy(out.cameraTarget);
  world.floor.position.x = camera.position.x;
  world.floor.position.z = camera.position.z;
  world.floor.material.uniforms.uCenter.value.set(camera.position.x, camera.position.z);
  world.sky.update(camera.aspect, p, time);

  tickMaterials(scene, time);

  const ci = chapterAt(p).index;
  if (ci !== lastChapter) {
    lastChapter = ci;
    labels.setChapter(copy.chapters[ci]);
    chapterCount.textContent = String(ci + 1).padStart(2, '0') + ' / ' + String(CHAPTERS.length).padStart(2, '0');
  }

  renderStory(beats, p);
  rail.render(p);
  scalebar.render(p);
  labels.render(0.92);
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
