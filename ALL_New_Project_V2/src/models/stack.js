/* ---------------------------------------------------------------------------
   stack.js — 互连层与背面供电（PowerVia）
   造型参照 Intel 18A 官方影片 0:42–0:57 / 1:11–1:17：
     · 一根又高又窄的柱体，层与层之间横竖交替、密排，整整齐齐
     · 电源层和信号层一开始混在同一摞里（正面）；
       分离时，**电源层一路沉到器件下面**（背面供电），信号层向上收拢
     · 两者之间一排发光的 nano-TSV 细柱
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox } from './geo.js';
import { silicon, metal, gateGlass, energyFlow } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';
import { lerp } from '../core/util.js';

const SIGNAL = 0xe8a05a;
const POWER = 0xd8804f;
const LAYER_W = 5.0;
const LAYER_D = 5.0;

/* 层的排布：从下往上，s = 信号层，p = 电源层 */
const LAYOUT = [
  { kind: 's', dir: 'z', n: 10, w: 0.11 },
  { kind: 's', dir: 'x', n: 10, w: 0.11 },
  { kind: 'p', dir: 'x', n: 2, w: 0.42 },
  { kind: 's', dir: 'z', n: 9, w: 0.13 },
  { kind: 's', dir: 'x', n: 9, w: 0.13 },
  { kind: 'p', dir: 'z', n: 2, w: 0.50 },
  { kind: 's', dir: 'z', n: 8, w: 0.15 },
  { kind: 's', dir: 'x', n: 8, w: 0.15 },
  { kind: 'p', dir: 'x', n: 2, w: 0.58 },
  { kind: 's', dir: 'z', n: 7, w: 0.17 },
];

const FRONT_GAP = 0.56;
const BACK_GAP = 0.66;

export function buildStack() {
  const root = new THREE.Group();
  const parts = { layers: [], powerLayers: [], signalLayers: [], tsvs: [] };
  const anchors = {};

  /* ---- 器件 ---------------------------------------------------------- */
  const dev = new THREE.Group();
  const sub = new THREE.Mesh(rbox(3.4, 0.38, 2.4, 0.03, 2), silicon({ color: 0x223142 }));
  sub.position.y = -0.19;
  dev.add(sub);
  parts.substrate = sub;

  const gate = new THREE.Mesh(rbox(1.7, 0.38, 0.78, 0.03, 2), gateGlass({ color: 0xbfefff, opacity: 0.26 }));
  gate.position.y = 0.19;
  dev.add(gate);
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(rbox(1.4, 0.075, 1.8, 0.015, 1), new THREE.MeshStandardMaterial({
      color: 0xd8e4ef, metalness: 0.35, roughness: 0.4,
    }));
    r.position.set(0, 0.055 + i * 0.11, 0);
    dev.add(r);
  }
  root.add(dev);
  parts.device = dev;

  /* ---- 每层 ---------------------------------------------------------- */
  const sigMat = metal(SIGNAL, { roughness: 0.34, extra: { emissive: new THREE.Color(0x3a1f0a), emissiveIntensity: 0.75 } });
  const powMat = metal(POWER, { roughness: 0.40, extra: { emissive: new THREE.Color(0x3a1408), emissiveIntensity: 0.6 } });

  LAYOUT.forEach((cfg, i) => {
    const g = new THREE.Group();
    const isPow = cfg.kind === 'p';
    const mat = isPow ? powMat : sigMat;
    const full = cfg.dir === 'z' ? LAYER_D : LAYER_W;
    const len = full - 0.45;

    for (let k = 0; k < cfg.n; k++) {
      const t = cfg.n === 1 ? 0 : (k / (cfg.n - 1) - 0.5);
      const bar = new THREE.Mesh(
        rbox(cfg.dir === 'z' ? cfg.w : len, isPow ? 0.22 : 0.09, cfg.dir === 'z' ? len : cfg.w, 0.012, 1),
        mat
      );
      if (cfg.dir === 'z') bar.position.x = t * (LAYER_W - 0.9);
      else bar.position.z = t * (LAYER_D - 0.9);
      g.add(bar);
    }

    // 层与层之间的小过孔，让整摞看起来是连着的
    for (let k = 0; k < 6; k++) {
      const via = new THREE.Mesh(rbox(0.10, 0.30, 0.10, 0.01, 1), sigMat);
      via.position.set(
        ((k % 3) / 2 - 0.5) * (LAYER_W - 1.6),
        (isPow ? 0.22 : 0.09) / 2 + 0.15,
        (Math.floor(k / 3) / 1 - 0.5) * (LAYER_D - 1.6)
      );
      g.add(via);
    }

    const powIdx = LAYOUT.slice(0, i).filter((c) => c.kind === 'p').length;
    const sigIdx = LAYOUT.slice(0, i).filter((c) => c.kind === 's').length;
    g.userData = {
      isPow,
      yFront: 0.72 + i * FRONT_GAP,
      yMid: 0.62 + sigIdx * 0.44,        // 分离后信号层收拢的位置
      yBack: -1.15 - powIdx * 0.72,      // 分离后电源层摊开在器件下面
      yFinal: isPow                       // 合体后：紧贴器件下方
        ? -0.58 - powIdx * 0.34
        : 0.50 + sigIdx * 0.29,           // 合体后：紧贴器件上方（层间几乎相碰）
    };
    g.position.y = g.userData.yFront;
    g.visible = false;
    root.add(g);
    parts.layers.push(g);
    if (isPow) parts.powerLayers.push(g);
    else parts.signalLayers.push(g);
  });

  parts.frontTop = 0.72 + (LAYOUT.length - 1) * FRONT_GAP;

  /* ---- nano-TSV：信号与电源之间那排细柱 ------------------------------ */
  const tsvGeo = new THREE.CylinderGeometry(0.075, 0.075, 1, 8, 1, false);
  parts.tsvMats = [];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.MeshStandardMaterial({
      color: 0xbfefff, emissive: 0x5fd8f0, emissiveIntensity: 2.2,
      metalness: 0.3, roughness: 0.3, transparent: true, opacity: 0.95,
    });
    const t = new THREE.Mesh(tsvGeo, m);
    t.position.set((i / 6 - 0.5) * (LAYER_W - 1.8), -0.5, 0);
    t.visible = false;
    root.add(t);
    parts.tsvs.push(t);
    parts.tsvMats.push(m);
  }

  /* ---- 玻璃外壳 ------------------------------------------------------ */
  const beolGlass = new THREE.Mesh(
    rbox(LAYER_W + 0.4, 1, LAYER_D + 0.4, 0.03, 1),
    new THREE.MeshPhysicalMaterial({
      color: 0x7fc6ee, metalness: 0.0, roughness: 0.08,
      transparent: true, opacity: 0.045, depthWrite: false,
      side: THREE.DoubleSide, envMapIntensity: 0.7,
    })
  );
  root.add(beolGlass);
  parts.beolGlass = beolGlass;

  anchors.tsv = anchor(root, 0, -0.45, 0, 'tsv');
  anchors.rail = anchor(root, LAYER_W / 2, 1.2, 0, 'rail');
  anchors.signals = anchor(root, 0, 3.4, 0, 'signals');
  anchors.device = anchor(root, 0, 0.25, 0, 'device');

  const fade = makeFade(root);

  /* ---------------------------------------------------------------- API */
  function apply(s) {
    const split = s.split ?? 0;
    const assemble = s.assemble ?? 0;
    const drill = s.drill ?? 0;
    const vis = s.showFront ?? 1;

    parts.layers.forEach((g) => {
      g.visible = vis > 0.01;
      const splitY = g.userData.isPow
        ? lerp(g.userData.yFront, g.userData.yBack, split)
        : lerp(g.userData.yFront, g.userData.yMid, split);
      // 合体：把摊开的层收回到器件上下，拼成一根完整的柱体
      g.position.y = lerp(splitY, g.userData.yFinal, assemble);

      g.traverse((o) => {
        if (!o.material) return;
        const arr = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of arr) {
          if (m.uniforms) continue;
          m.opacity = vis;
          m.transparent = m.userData.origTransparent || vis < 0.99;
          m.depthWrite = !(vis < 0.99);
        }
      });
    });

    // 玻璃壳跟着整摞的高度走
    const splitTop = 0.72 + (parts.signalLayers.length - 1) * 0.40 + 0.55;
    const splitBot = -1.15 - 2 * 0.72 - 0.45;
    const topY = lerp(lerp(parts.frontTop + 0.6, splitTop, split), 0.52 + (parts.signalLayers.length - 1) * 0.40 + 0.55, assemble);
    const botY = lerp(lerp(0.3, splitBot, split), -0.52 - 2 * 0.40 - 0.45, assemble);
    const h = Math.max(topY - botY, 0.6);
    beolGlass.scale.y = h;
    beolGlass.position.y = botY + h / 2;
    beolGlass.material.opacity = 0.045 * vis;

    // nano-TSV：分离之后才露出来，逐个亮起
    const topYt = -0.15;
    const botYt = -0.90;
    parts.tsvs.forEach((t, i) => {
      const local = Math.min(1, Math.max(0, (drill - i * 0.07) / 0.7));
      t.visible = assemble > 0.55 && local > 0.001;
      const hh = (topYt - botYt) * local;
      t.scale.y = Math.max(hh, 0.001);
      t.position.y = topYt - hh / 2;
    });
  }

  apply({ split: 0, drill: 0, land: 1, thick: 0 });

  return { root, parts, anchors, fade, apply, kind: 'stack' };
}
