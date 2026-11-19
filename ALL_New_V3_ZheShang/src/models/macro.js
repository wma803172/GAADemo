/* ---------------------------------------------------------------------------
   macro.js — 从一颗芯片到一台电脑
   PPT 第 13 页要一条"一路拉远"的镜头。为了不用天文数字的坐标，
   这里用了非等比例的做法：每一个尺度都是独立的物体，靠缩放与淡入淡出接起来。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox, roundedRectShape, extrude } from './geo.js';
import { silicon, oxide, metal, rim, gateGlass } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';
import { rand } from '../core/util.js';

/* ---------------------------------------------------------------- textures */

function dieTexture() {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#0b1a2a';
  ctx.fillRect(0, 0, S, S);

  // 大块功能区
  const blocks = [
    [0.06, 0.08, 0.48, 0.44, '#12314b'],
    [0.56, 0.08, 0.36, 0.44, '#102a41'],
    [0.06, 0.56, 0.30, 0.36, '#0f2637'],
    [0.38, 0.56, 0.26, 0.36, '#11293c'],
    [0.66, 0.56, 0.26, 0.36, '#0f2637'],
  ];
  for (const [x, y, w, h, c] of blocks) {
    ctx.fillStyle = c;
    ctx.fillRect(x * S, y * S, w * S, h * S);
    ctx.strokeStyle = 'rgba(120,200,240,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x * S + 2, y * S + 2, w * S - 4, h * S - 4);
  }

  // SRAM 阵列的细密纹理
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 4200; i++) {
    const bx = Math.floor(rand(i * 3.1) * 18) / 18;
    const by = Math.floor(rand(i * 7.7) * 18) / 18;
    ctx.fillStyle = rand(i) > 0.5 ? 'rgba(90,180,230,0.30)' : 'rgba(60,120,180,0.22)';
    ctx.fillRect(0.06 * S + bx * 0.48 * S, 0.08 * S + by * 0.44 * S, 2, 2);
  }
  ctx.globalAlpha = 1;

  // 光亮的"活着"的区块
  const glow = ctx.createRadialGradient(0.3 * S, 0.3 * S, 10, 0.3 * S, 0.3 * S, 0.22 * S);
  glow.addColorStop(0, 'rgba(90,220,255,0.42)');
  glow.addColorStop(1, 'rgba(90,220,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function deckTexture() {
  const W = 512, H = 340;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1a2029';
  ctx.fillRect(0, 0, W, H);

  // 键盘
  const kx = 62, ky = 40, kw = 388, kh = 168;
  ctx.fillStyle = '#0e1319';
  ctx.fillRect(kx - 8, ky - 8, kw + 16, kh + 16);
  const cols = 14, rows = 5;
  const cw = kw / cols, ch = kh / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === 0 && r === 4) continue;
      ctx.fillStyle = '#242c37';
      ctx.fillRect(kx + c * cw + 2, ky + r * ch + 2, cw - 4, ch - 4);
      ctx.fillStyle = 'rgba(140,180,215,0.16)';
      ctx.fillRect(kx + c * cw + 2, ky + r * ch + 2, cw - 4, 2);
    }
  }
  // 空格
  ctx.fillStyle = '#242c37';
  ctx.fillRect(kx + cw * 3 + 2, ky + ch * 4 + 2, cw * 7 - 4, ch - 4);

  // 触控板
  ctx.fillStyle = '#2b3340';
  ctx.fillRect(W / 2 - 78, 236, 156, 86);
  ctx.strokeStyle = 'rgba(150,200,235,0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(W / 2 - 78, 236, 156, 86);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function screenTexture() {
  const W = 512, H = 320;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#061422');
  g.addColorStop(0.45, '#0c2f4d');
  g.addColorStop(1, '#123a5c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // 抽象的窗口
  ctx.fillStyle = 'rgba(120,220,255,0.14)';
  ctx.fillRect(34, 30, 180, 118);
  ctx.fillStyle = 'rgba(120,220,255,0.10)';
  ctx.fillRect(240, 30, 238, 60);
  ctx.fillRect(240, 108, 238, 40);
  ctx.fillStyle = 'rgba(220,245,255,0.55)';
  ctx.fillRect(34, 176, 300, 3);
  ctx.fillStyle = 'rgba(160,225,255,0.30)';
  ctx.fillRect(34, 192, 220, 3);
  ctx.fillRect(34, 206, 260, 3);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ chips */

export function buildDie() {
  const root = new THREE.Group();
  const parts = {};

  const base = new THREE.Mesh(rbox(5.4, 0.18, 4.4, 0.03, 2), new THREE.MeshPhysicalMaterial({
    color: 0x33587c, metalness: 0.45, roughness: 0.40, clearcoat: 0.25,
  }));
  root.add(base);
  parts.base = base;

  const tex = dieTexture();
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(5.3, 4.3),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.30, metalness: 0.45,
      emissive: new THREE.Color(0x4aa8e0), emissiveIntensity: 2.4,
      emissiveMap: tex,
    })
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = 0.092;
  root.add(top);
  parts.top = top;

  // 芯粒边缘的一圈冷光，勾出"这是一颗被切下来的芯片"
  const rimLine = new THREE.LineSegments(
    new THREE.EdgesGeometry(base.geometry),
    new THREE.LineBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  root.add(rimLine);

  parts.anchors = {};
  return { root, parts, fade: makeFade(root), kind: 'die' };
}

export function buildPackage() {
  const root = new THREE.Group();
  const parts = {};

  // 基板
  const substr = new THREE.Mesh(rbox(7.6, 0.34, 6.6, 0.03, 2), new THREE.MeshPhysicalMaterial({
    color: 0x27414f, metalness: 0.40, roughness: 0.44, clearcoat: 0.2,
  }));
  substr.position.y = -0.2;
  root.add(substr);
  parts.substr = substr;

  // 边缘金色焊盘
  const padMat = metal(0xd9a35a, { roughness: 0.3 });
  for (let i = 0; i < 26; i++) {
    const t = (i / 25 - 0.5);
    for (const z of [-3.25, 3.25]) {
      const p = new THREE.Mesh(rbox(0.16, 0.03, 0.2, 0.01, 1), padMat);
      p.position.set(t * 6.6, -0.02, z);
      root.add(p);
    }
  }

  // 芯粒
  const die = buildDie();
  die.root.position.y = 0.01;
  die.root.scale.setScalar(1.12);
  root.add(die.root);
  parts.die = die.root;

  // 去耦电容
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const c = new THREE.Mesh(rbox(0.16, 0.10, 0.1, 0.02, 1), new THREE.MeshStandardMaterial({
      color: 0x8a6a45, metalness: 0.8, roughness: 0.4,
    }));
    c.position.set(Math.cos(a) * 3.45, 0.06, Math.sin(a) * 2.85);
    root.add(c);
  }

  return { root, parts, fade: makeFade(root), kind: 'package' };
}

export function buildServer() {
  const root = new THREE.Group();
  const parts = {};

  // 主板
  const board = new THREE.Mesh(rbox(11, 0.12, 7.6, 0.03, 1), new THREE.MeshPhysicalMaterial({
    color: 0x1d4a41, metalness: 0.30, roughness: 0.52, clearcoat: 0.25,
  }));
  root.add(board);

  // CPU 插槽 + 散热器
  const socket = new THREE.Mesh(rbox(4.4, 0.16, 4.4, 0.02, 1), new THREE.MeshPhysicalMaterial({
    color: 0x152430, metalness: 0.5, roughness: 0.35,
  }));
  socket.position.set(-1.6, 0.13, 0.2);
  root.add(socket);

  const sink = new THREE.Group();
  const base = new THREE.Mesh(rbox(3.6, 0.14, 3.6, 0.02, 1), metal(0x8fa6b8, { roughness: 0.32 }));
  sink.add(base);
  const finMat = metal(0x9db4c6, { roughness: 0.28 });
  for (let i = 0; i < 16; i++) {
    const f = new THREE.Mesh(rbox(0.06, 1.0, 3.4, 0.01, 1), finMat);
    f.position.set(-1.65 + (i / 15 - 0.5) * 3.2, 0.55, 0);
    sink.add(f);
  }
  sink.position.set(-1.6, 0.24, 0.2);
  root.add(sink);
  parts.sink = sink;

  // 内存插槽
  const dimmMat = new THREE.MeshPhysicalMaterial({ color: 0x101a22, metalness: 0.3, roughness: 0.5 });
  for (let i = 0; i < 4; i++) {
    const d = new THREE.Mesh(rbox(0.34, 0.20, 5.2, 0.02, 1), dimmMat);
    d.position.set(2.6 + i * 0.55, 0.16, 0.2);
    root.add(d);
    const m = new THREE.Mesh(rbox(0.22, 0.5, 4.9, 0.02, 1), new THREE.MeshStandardMaterial({
      color: 0x1d3a2e, metalness: 0.4, roughness: 0.5,
    }));
    m.position.set(2.6 + i * 0.55, 0.42, 0.2);
    root.add(m);
  }

  // VRM 元件
  for (let i = 0; i < 30; i++) {
    const c = new THREE.Mesh(rbox(0.16, 0.12, 0.16, 0.02, 1), new THREE.MeshStandardMaterial({
      color: 0x2a3340, metalness: 0.75, roughness: 0.35,
    }));
    c.position.set(-4.4 + (i % 10) * 0.28, 0.1, -2.9 + Math.floor(i / 10) * 0.3);
    root.add(c);
  }

  return { root, parts, fade: makeFade(root), kind: 'server' };
}

export function buildLaptop() {
  const root = new THREE.Group();
  const parts = {};

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x47545f, metalness: 0.80, roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.22,
  });

  // 底壳
  const base = new THREE.Mesh(rbox(7.8, 0.22, 5.2, 0.08, 2), shellMat);
  base.position.y = 0.11;
  root.add(base);

  // 键盘面
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(7.4, 4.9),
    new THREE.MeshStandardMaterial({ map: deckTexture(), roughness: 0.55, metalness: 0.35 })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = 0.223;
  root.add(deck);

  // 屏幕：铰链在 -Z 边
  const lid = new THREE.Group();
  const lidShell = new THREE.Mesh(rbox(7.8, 4.8, 0.14, 0.06, 2), shellMat);
  lidShell.position.set(0, 2.4, 0);
  lid.add(lidShell);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(7.1, 4.2),
    new THREE.MeshStandardMaterial({
      map: screenTexture(), emissive: new THREE.Color(0x2b6f9c), emissiveMap: screenTexture(),
      emissiveIntensity: 1.15, roughness: 0.25, metalness: 0.1,
    })
  );
  screen.position.set(0, 2.4, 0.075);
  lid.add(screen);
  parts.screen = screen;

  lid.position.set(0, 0.22, -2.55);
  lid.rotation.x = -0.18;
  root.add(lid);
  parts.lid = lid;

  // 合上的时候用
  parts.base = base;
  parts.deck = deck;

  return { root, parts, fade: makeFade(root), kind: 'laptop' };
}
