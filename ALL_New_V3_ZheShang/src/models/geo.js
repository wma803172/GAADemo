/* ---------------------------------------------------------------------------
   geo.js — 几何小工具
   目标是"看起来像被做出来过"，不是"看起来像方块"。所以处处带倒角。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function rbox(w, h, d, r = 0.06, seg = 2) {
  const rr = Math.min(r, Math.min(w, h, d) / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(rr, 1e-4));
}

export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.quadraticCurveTo(x + w, y, x + w, y + rr);
  s.lineTo(x + w, y + h - rr);
  s.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  s.lineTo(x + rr, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - rr);
  s.lineTo(x, y + rr);
  s.quadraticCurveTo(x, y, x + rr, y);
  return s;
}

export function roundedRectPath(w, h, r) {
  const p = new THREE.Path();
  const x = -w / 2, y = -h / 2;
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.quadraticCurveTo(x + w, y, x + w, y + rr);
  p.lineTo(x + w, y + h - rr);
  p.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  p.lineTo(x + rr, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - rr);
  p.lineTo(x, y + rr);
  p.quadraticCurveTo(x, y, x + rr, y);
  return p;
}

/** 沿 +Z 拉伸，并居中 */
export function extrude(shape, depth, opts = {}) {
  const bevel = opts.bevel ?? 0.015;
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: opts.bevelSegments ?? 2,
    curveSegments: opts.curveSegments ?? 8,
    steps: 1,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/** 一个"拾起"的拱形轮廓（栅极跨过 fin 的截面）：外框 - 内腔 */
export function archShape(spanZ, height, thickness, legDepth) {
  const s = new THREE.Shape();
  const hz = spanZ / 2 + thickness;
  const yb = -legDepth;
  const yt = height + thickness;
  s.moveTo(-hz, yb);
  s.lineTo(hz, yb);
  s.lineTo(hz, yt);
  s.lineTo(hz - thickness, yt);
  s.lineTo(hz - thickness, yb + thickness);
  s.lineTo(-hz + thickness, yb + thickness);
  s.lineTo(-hz + thickness, yt);
  s.lineTo(-hz, yt);
  s.closePath();
  return s;
}

/** 菱形（正八面体切面）外延 —— TSMC 3nm 源漏的招牌形状 */
export function diamondGeometry(w, h, d, bevel = 0.0) {
  // 沿 Z 拉伸的菱形棱柱：截面是 |x|/w + |y|/h <= 1
  const s = new THREE.Shape();
  s.moveTo(0, h / 2);
  s.lineTo(w / 2, 0);
  s.lineTo(0, -h / 2);
  s.lineTo(-w / 2, 0);
  s.closePath();
  const g = extrude(s, d, { bevel, bevelSegments: 2, curveSegments: 4 });
  g.computeVertexNormals();
  return g;
}

/** 两端收尖的菱形棱柱（更像外延长出来的样子） */
export function diamondLensGeometry(w, h, d) {
  const shape = new THREE.Shape();
  shape.moveTo(0, h / 2);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, -h / 2);
  shape.lineTo(-w / 2, 0);
  shape.closePath();

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 4,
    steps: 1,
  });
  g.translate(0, 0, -d / 2);
  g.computeVertexNormals();
  return g;
}

/** 菱形柱体的"侧面套筒"（只有四个侧面，没有端盖），沿 Z 从 z0 到 z1 */
export function diamondTube(hx, hy, z0, z1) {
  const pts = [[hx, 0], [0, hy], [-hx, 0], [0, -hy]];
  const v = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4];
    v.push(a[0], a[1], z0, b[0], b[1], z0, b[0], b[1], z1);
    v.push(a[0], a[1], z0, b[0], b[1], z1, a[0], a[1], z1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/** 薄壁筒（沿 Z），用于栅介质层 */
export function shellZ(w, h, d, wall) {
  const outer = roundedRectShape(w + wall * 2, h + wall * 2, (h + wall * 2) * 0.3);
  outer.holes.push(roundedRectPath(w, h, h * 0.3));
  return extrude(outer, d, { bevel: 0.004, bevelSegments: 1 });
}

/** 线性渐变色带（CanvasTexture），给背板 / 晶圆用 */
export function gradientTexture(stops, size = 256) {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, size);
  for (const [pos, col] of stops) g.addColorStop(pos, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 带一点随机感的金属拉丝纹理 */
export function brushedTexture(base = '#1b2530', size = 512) {
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2400; i++) {
    const y = Math.random() * size;
    const a = Math.random() * 0.05;
    ctx.strokeStyle = 'rgba(200,225,255,' + a.toFixed(3) + ')';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
