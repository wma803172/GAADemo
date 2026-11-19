/* ---------------------------------------------------------------------------
   ui.js — DOM 层：文案、时间环、比例尺、3D 锚点标签
   全部由 render(p) 驱动，和 WebGL 同源，不会出现"文字和画面对不上"。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { CHAPTERS, chapterAt } from '../content.js';
import { clamp, lerp } from '../core/util.js';
import { placeCard } from './pin-placement.js';

const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ story */
export function buildStory(root, chapters = CHAPTERS, scrollCue = '向下滚动') {
  const frag = document.createDocumentFragment();
  chapters.forEach((ch, i) => {
    const sec = document.createElement('section');
    sec.className = 'beat' + (ch.outro ? ' beat-outro' : '');
    sec.dataset.chapter = ch.id;
    sec.dataset.index = String(i);

    if (ch.outro) {
      sec.innerHTML =
        '<div class="outro-card">' +
        '<div class="outro-logo"><img src="./assets/intel-wordmark.png" alt="intel"><span class="outro-reg">®</span></div>' +
        '<p class="outro-line">RibbonFET &nbsp;+&nbsp; PowerVia</p>' +
        '<p class="outro-note">MECH6045 · Nanotechnology and Fundamental</p>' +
        '</div>';
      frag.appendChild(sec);
      return;
    }

    const tag = i === 0 ? 'h1' : 'h2';
    const facts = ch.facts && ch.facts.length
      ? '<ul class="facts">' + ch.facts.map((f) => '<li>' + f + '</li>').join('') + '</ul>'
      : '';
    const body = (ch.body || []).map((p) => '<p data-rv>' + p + '</p>').join('');

    sec.innerHTML =
      '<p class="kicker"><b>' + ch.kicker + '</b><span class="rule"></span><span>' + ch.kickerCn + '</span></p>' +
      '<' + tag + ' data-rv>' + ch.title + '</' + tag + '>' +
      (ch.lead ? '<p class="lead"' + (i === 0 ? '' : ' data-rv') + '>' + ch.lead + '</p>' : '') +
      body + facts +
      (i === 0 ? '<div class="scroll-cue" data-rv><span class="cue-arrow"></span>' + scrollCue + '</div>' : '');

    frag.appendChild(sec);
  });
  root.replaceChildren(frag);

  const beats = Array.from(root.querySelectorAll('.beat'));
  beats.forEach((b) => {
    Array.from(b.querySelectorAll('[data-rv]')).forEach((el, i) => {
      el.style.transitionDelay = (0.05 + i * 0.07) + 's';
    });
  });
  return beats;
}


export function renderStory(beats, p) {
  const { index, u } = chapterAt(p);
  beats.forEach((b, i) => {
    const on = i === index;
    b.classList.toggle('is-live', on);
    if (on) {
      const last = i === beats.length - 1;
      const visible = (i === 0 || u > 0.012) && (last || u < 0.992);
      b.classList.toggle('is-in', visible);
    } else {
      b.classList.remove('is-in');
    }
  });
  return index;
}

/* ------------------------------------------------------------------- rail */
const YEARS = [
  { p: 0.050, label: '1960', tag: 'PLANAR' },
  { p: 0.205, label: '2011', tag: 'FINFET' },
  { p: 0.290, label: '2014', tag: 'MULTI' },
  { p: 0.375, label: '2022', tag: '3NM' },
  { p: 0.460, label: '2026', tag: 'GAA' },
];

const LAYERS = [
  { p: 0.548, label: 'M6', tag: 'METAL' },
  { p: 0.580, label: 'M4', tag: 'METAL' },
  { p: 0.612, label: 'M2', tag: 'METAL' },
  { p: 0.642, label: 'M1', tag: 'METAL' },
  { p: 0.672, label: 'DEV', tag: 'DEVICE' },
  { p: 0.735, label: 'TSV', tag: 'POWERVIA' },
  { p: 0.775, label: 'BM', tag: 'BACKSIDE' },
];

export class Rail {
  constructor(host) {
    this.host = host;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('preserveAspectRatio', 'none');
    host.appendChild(this.svg);

    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML =
      '<linearGradient id="railHot" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="rgba(79,210,240,0.0)"/>' +
      '<stop offset="100%" stop-color="rgba(157,244,255,0.9)"/>' +
      '</linearGradient>';
    this.svg.appendChild(defs);

    this.lines = document.createElementNS(NS, 'g');
    this.svg.appendChild(this.lines);

    this.nodes = [];
    this.buildSet(YEARS, 'years');
    this.buildSet(LAYERS, 'layers');

    this.cursor = document.createElement('div');
    this.cursor.className = 'rail-cursor';
    host.appendChild(this.cursor);
  }

  buildSet(list, name) {
    const set = { name, items: [] };
    for (const it of list) {
      const el = document.createElement('div');
      el.className = 'rail-year';
      el.textContent = it.label;
      this.host.appendChild(el);
      const tick = document.createElementNS(NS, 'line');
      this.lines.appendChild(tick);
      set.items.push({ ...it, el, tick });
    }
    this.nodes.push(set);
  }

  render(p) {
    const H = window.innerHeight;
    const cursorY = H * 0.56;
    const K = H * 1.35;          // 每单位 progress 对应的像素
    const showYears = p < 0.575;
    const showLayers = p > 0.535 && p < 0.815;

    this.cursor.style.top = cursorY + 'px';
    this.cursor.style.opacity = (showYears || showLayers) ? '1' : '0';
    this.host.classList.toggle('is-on', showYears || showLayers);

    for (const set of this.nodes) {
      const on = set.name === 'years' ? showYears : showLayers;
      const fade = set.name === 'years'
        ? clamp((0.585 - p) / 0.03, 0, 1)
        : clamp((p - 0.535) / 0.03, 0, 1) * clamp((0.815 - p) / 0.03, 0, 1);
      let best = -1, bestD = 1e9;
      set.items.forEach((it, i) => {
        const y = cursorY + (it.p - p) * K;
        const d = Math.abs(it.p - p);
        if (d < bestD) { bestD = d; best = i; }
        const visible = on && y > -60 && y < H + 60;
        it.el.style.opacity = visible ? String(fade) : '0';
        it.el.style.top = y + 'px';
        it.el.classList.toggle('is-on', i === best && d < 0.035 && on);
        it.el.classList.toggle('is-past', it.p < p);
        it.tick.setAttribute('x1', '80%');
        it.tick.setAttribute('x2', '100%');
        it.tick.setAttribute('y1', String(y));
        it.tick.setAttribute('y2', String(y));
        it.tick.setAttribute('stroke', i === best && d < 0.035 ? 'url(#railHot)' : 'rgba(150,200,235,0.28)');
        it.tick.setAttribute('stroke-width', i === best ? '1.4' : '1');
        it.tick.style.opacity = visible ? String(fade) : '0';
      });
    }
  }
}

/* --------------------------------------------------------------- scalebar */
const SCALE_STOPS = [
  [0.030, -4.9], [0.090, -5.0], [0.150, -5.6], [0.220, -6.0],
  [0.300, -6.7], [0.380, -7.0], [0.470, -7.7], [0.545, -8.0],
  [0.640, -8.2], [0.730, -8.4], [0.800, -8.0], [0.815, -3.4],
  [0.835, -2.6], [0.860, -2.0], [0.885, -1.1], [0.905, -0.55],
  [1.000, -0.45],
];

function niceScale(expo) {
  // 把 log10(米) 拆成一个"1/2/5 × 10^k"的好看数字
  const v = Math.pow(10, expo);
  const k = Math.floor(expo);
  const f = v / Math.pow(10, k);
  let pick = 1;
  if (f >= 4.2) pick = 5; else if (f >= 1.8) pick = 2; else pick = 1;
  const value = pick * Math.pow(10, k);
  const frac = value / v;          // 0.4 ~ 1
  return { value, frac, unit: unitFor(value) };
}

function unitFor(v) {
  if (v >= 1000) return { s: v >= 1e6 ? (v / 1e6).toFixed(1) + ' km' : (v / 1000).toFixed(v >= 1e4 ? 1 : 2) + ' mm', mul: 1 };
  if (v >= 0.01) return { s: (v * 100).toFixed(v >= 1 ? 0 : 1) + ' cm', mul: 1 };
  if (v >= 1e-3) return { s: (v * 1000).toFixed(v >= 0.01 ? 0 : 1) + ' mm', mul: 1 };
  if (v >= 1e-6) return { s: (v * 1e6).toFixed(v >= 1e-5 ? 0 : 1) + ' µm', mul: 1 };
  return { s: (v * 1e9).toFixed(v >= 1e-7 ? 0 : 1) + ' nm', mul: 1 };
}

export class ScaleBar {
  constructor(host) {
    this.host = host;
    this.fill = host.querySelector('#scalebar-fill');
    this.label = host.querySelector('#scalebar-label');
    this.hint = host.querySelector('#scalebar-hint');
    this.note = this.hint.textContent;
    this.track = host.querySelector('.scalebar-track');
    this.lastLabel = '';
  }

  render(p) {
    let expo = SCALE_STOPS[0][1];
    for (let i = 0; i < SCALE_STOPS.length - 1; i++) {
      const [p0, v0] = SCALE_STOPS[i];
      const [p1, v1] = SCALE_STOPS[i + 1];
      if (p >= p0 && p <= p1) {
        const t = (p - p0) / (p1 - p0);
        expo = lerp(v0, v1, t);
        break;
      }
    }
    const { value, frac } = niceScale(expo);
    const u = unitFor(value);
    const w = 96;
    this.track.style.width = Math.round(w * Math.max(0.42, frac)) + 'px';
    if (u.s !== this.lastLabel) {
      this.label.textContent = u.s;
      this.lastLabel = u.s;
    }
    const on = p > 0.028 && p < 0.985;
    this.host.classList.toggle('is-on', on);
    this.hint.style.opacity = p > 0.815 ? '0.55' : '0';
    const hint = p > 0.815 ? this.note : '';
    if (this.hint.textContent !== hint) this.hint.textContent = hint;
  }
}

/* ------------------------------------------------------------------ labels */
export class Labels {
  constructor(host, camera, models) {
    this.host = host;
    this.camera = camera;
    this.models = models;
    this.pool = new Map();
    this.v3 = new THREE.Vector3();
    this.active = [];
  }

  setChapter(ch) {
    this.chapterId = ch.id;
    this.measuredAt = '';
    this.active = (ch.labels || []).map((L) => {
      const key = L.model + ':' + L.anchor + ':' + L.text + ':' + L.sub;
      let el = this.pool.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'pin';
        el.innerHTML = '<span class="pin-dot"></span><span class="pin-line"></span>' +
          '<span class="pin-card"><b>' + L.text + '</b>' + (L.sub ? '<i>' + L.sub + '</i>' : '') + '</span>';
        this.host.appendChild(el);
        this.pool.set(key, el);
      }
      el.classList.remove('is-off');
      return { el, L, card: el.querySelector('.pin-card'), line: el.querySelector('.pin-line') };
    });
    // 隐藏不在本章的
    for (const [key, el] of this.pool) {
      if (!this.active.some((a) => a.el === el)) el.classList.add('is-off');
    }
  }

  render(opacity) {
    if (!this.active.length) return;
    const w = window.innerWidth, h = window.innerHeight;
    const viewport = w + '/' + h;
    if (this.measuredAt !== viewport) {
      const beat = document.querySelector('.beat[data-chapter="' + this.chapterId + '"]');
      this.copyBounds = beat?.getBoundingClientRect();
      for (const pin of this.active) {
        pin.width = pin.card.offsetWidth;
        pin.height = pin.card.offsetHeight;
      }
      this.measuredAt = viewport;
    }
    this.camera.updateMatrixWorld();
    const visible = [];
    for (const pin of this.active) {
      const { el, L } = pin;
      const closeVia = L.model === 'stack' && L.anchor === 'tsv' && this.models.viaDev.root.visible;
      const model = closeVia ? this.models.viaDev : this.models[L.model];
      const a = model?.anchors[L.anchor];
      if (!a || !model.root.visible || !a.parent.visible) { el.style.opacity = '0'; continue; }
      a.updateWorldMatrix(true, false);
      this.v3.setFromMatrixPosition(a.matrixWorld);
      this.v3.project(this.camera);
      const x = (this.v3.x * 0.5 + 0.5) * w;
      const y = (-this.v3.y * 0.5 + 0.5) * h;
      if (Math.abs(this.v3.z) > 1 || x < 5 || x > w - 5 || y < 40 || y > h - 12) {
        el.style.opacity = '0';
        continue;
      }
      pin.x = x;
      pin.y = y;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.opacity = String(opacity);
      visible.push(pin);
    }
    const bounds = { left: 10, right: w - (w > 760 ? 98 : 45), top: 63, bottom: h - 24 };
    const occupied = this.copyBounds ? [this.copyBounds] : [];
    const dots = visible.map(({ x, y }) => ({ left: x-3, right: x+3, top: y-3, bottom: y+3 }));
    for (const pin of visible) {
      const { rect, length, dx, dy, side, offset } = placeCard(pin, bounds, occupied, dots);
      occupied.push(rect);
      pin.side = side;
      pin.offset = offset;
      pin.el.classList.toggle('flip', side < 0);
      pin.card.style.transform = 'translate(' + (rect.left-pin.x).toFixed(1) + 'px,' + (rect.top-pin.y).toFixed(1) + 'px)';
      pin.line.style.transform = 'rotate(' + Math.atan2(dy,dx) + 'rad) scaleX(' + length.toFixed(1) + ')';
    }
  }
}
