/* ---------------------------------------------------------------------------
   fab.js — RibbonFET / GAA 的制造流程
   八个步骤全部由**一个标量 step** 驱动（和全站一样，不用定时器）：
     0.00 超晶格外延   Si / SiGe 交替长上去
     0.12 刻成鳍       整摞沿 X 收窄
     0.24 假栅         一块半透明栅极落下来盖住
     0.36 源漏外延     两端长出 source / drain
     0.48 去掉假栅     腔体露出来
     0.60 沟道释放     SiGe 抽掉，四条 Si 带子悬空
     0.76 金属栅包覆   栅极填进去，四面裹住带子
     0.90 通电         带子里亮起电流
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox } from './geo.js';
import { silicon, channel, metal, gateGlass, rim, energyFlow } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';
import { clamp, lerp, srange } from '../core/util.js';

const PITCH = 0.34;      // 每层厚度
const PAIRS = 4;         // 4 对 Si/SiGe
const SLAB_W = 3.6;      // 初始宽度（X）
const FIN_W = 0.62;      // 刻完的鳍宽
const DEPTH = 2.4;       // Z 方向
const BASE_Y = 0;        // 硅片表面

export function buildFab() {
  const root = new THREE.Group();
  const parts = { sige: [], si: [], steps: {} };
  const anchors = {};

  /* ---- 硅片 ---------------------------------------------------------- */
  const sub = new THREE.Mesh(rbox(6.4, 0.55, 3.6, 0.05, 2), silicon({ color: 0x1b2a3a }));
  sub.position.y = BASE_Y - 0.28;
  root.add(sub);
  parts.substrate = sub;

  /* ---- 超晶格：Si / SiGe 交替 ---------------------------------------- */
  const siMat = channel({ color: 0xd6e2ee, metalness: 0.28, roughness: 0.38 });
  const geMat = channel({ color: 0x7f93a8, metalness: 0.35, roughness: 0.44 });

  const stack = new THREE.Group();
  stack.position.y = BASE_Y;
  root.add(stack);
  parts.stack = stack;

  for (let i = 0; i < PAIRS * 2; i++) {
    const isSi = i % 2 === 0;
    const m = new THREE.Mesh(
      rbox(SLAB_W, PITCH - 0.012, DEPTH, 0.03, 2),
      isSi ? siMat : geMat.clone()
    );
    m.position.y = PITCH / 2 + i * PITCH;
    stack.add(m);
    (isSi ? parts.si : parts.sige).push(m);
  }
  const stackH = PAIRS * 2 * PITCH;

  /* ---- 假栅（dummy gate） -------------------------------------------- */
  const dummy = new THREE.Group();
  const dBody = new THREE.Mesh(
    rbox(0.95, stackH + 0.55, DEPTH + 0.30, 0.05, 2),
    gateGlass({ color: 0xcfe6f2, opacity: 0.34 })
  );
  dummy.add(dBody);
  dummy.position.y = BASE_Y + stackH + 0.9;
  root.add(dummy);
  parts.dummy = dummy;

  /* ---- 源 / 漏外延 ---------------------------------------------------- */
  const sds = [];
  for (const dir of [-1, 1]) {
    const epi = new THREE.Mesh(
      rbox(FIN_W + 0.30, stackH * 0.95, 0.62, 0.05, 2),
      channel({ color: 0xd8c49c, metalness: 0.4, roughness: 0.3 })
    );
    epi.position.set(0, BASE_Y + stackH / 2 + 0.02, dir * (DEPTH / 2 + 0.31));
    epi.scale.set(1, 0.001, 0.001);
    root.add(epi);
    sds.push(epi);
  }
  parts.sd = sds;

  /* ---- 金属栅（沟道释放后才出现） ------------------------------------- */
  const gateGrp = new THREE.Group();
  const gateBody = new THREE.Mesh(
    rbox(1.15, stackH + 0.30, DEPTH + 0.34, 0.05, 2),
    gateGlass({ color: 0xbfefff, opacity: 0.17 })
  );
  gateGrp.add(gateBody);
  const gateRim = new THREE.Mesh(
    rbox(1.15, stackH + 0.30, DEPTH + 0.34, 0.05, 2),
    rim(0x8fe6ff, { power: 2.0, strength: 0.9 })
  );
  gateRim.scale.setScalar(1.012);
  gateGrp.add(gateRim);
  gateGrp.position.y = BASE_Y + stackH / 2 + 0.02;
  gateGrp.visible = false;
  root.add(gateGrp);
  parts.gate = gateGrp;
  parts.gateBody = gateBody;

  /* ---- 电流（最后一步点亮） ------------------------------------------- */
  const flowMats = [];
  for (const si of parts.si) {
    const f = new THREE.Mesh(
      rbox(FIN_W + 0.04, PITCH - 0.05, DEPTH + 0.02, 0.01, 1),
      energyFlow({ color: 0x63e6ff, density: 2.0, speed: 1.2, opacity: 0, axis: [0, 0, 1] })
    );
    f.position.y = 0; // 已经是 si 的子物体，别再叠一次偏移
    si.add(f);
    flowMats.push(f.material);
  }
  parts.flowMats = flowMats;

  anchors.gate = anchor(gateGrp, 0, 0.55, 0, 'gate');
  anchors.sheet = anchor(stack, SLAB_W / 2, stackH * 0.5, 0, 'sheet');

  const fade = makeFade(root);

  /* ---------------------------------------------------------------- API */
  function apply(step) {
    const s = clamp(step, 0, 1);

    /* 1. 超晶格外延：逐层长出来 */
    const grow = srange(s, 0.00, 0.12);
    const n = PAIRS * 2;
    [...parts.si, ...parts.sige]
      .sort((a, b) => a.position.y - b.position.y)
      .forEach((layer, i) => {
        const t = clamp((grow - (i / n) * 0.75) / 0.35, 0, 1);
        layer.scale.y = Math.max(t, 0.001);
        layer.visible = t > 0.01;
        layer.position.y = PITCH / 2 + i * PITCH;
      });

    /* 2. 刻成鳍：整体沿 X 收窄 */
    const fin = srange(s, 0.12, 0.26);
    stack.scale.x = lerp(1, FIN_W / SLAB_W, fin);
    parts.sd.forEach((e) => { e.position.x = 0; });

    /* 3. 假栅落下 */
    const dg = srange(s, 0.24, 0.34);
    dummy.visible = dg > 0.01 && s < 0.60;
    dummy.position.y = lerp(BASE_Y + stackH + 2.4, BASE_Y + stackH + 0.28, dg);
    dBody.material.opacity = 0.34 * srange(s, 0.24, 0.30) * (1 - srange(s, 0.52, 0.60));

    /* 4. 源漏外延 */
    const epi = srange(s, 0.36, 0.50);
    parts.sd.forEach((e, i) => {
      const t = clamp(epi - i * 0.06, 0, 1);
      e.scale.y = lerp(0.001, 1, t);
      e.scale.z = lerp(0.001, 1, t);
      e.visible = t > 0.01;
    });

    /* 5. 去掉假栅 */
    dummy.visible = dg > 0.01 && s < 0.60;

    /* 6. 沟道释放：SiGe 缩掉 */
    const rel = srange(s, 0.60, 0.76);
    parts.sige.forEach((layer, i) => {
      const t = clamp(rel - i * 0.05, 0, 1);
      layer.scale.x = lerp(1, 0.001, t);
      layer.scale.y = lerp(1, 0.001, t);
      layer.visible = t < 0.99;
    });

    /* 7. 金属栅包覆 */
    const g = srange(s, 0.76, 0.92);
    parts.gate.visible = g > 0.01;
    parts.gate.scale.setScalar(lerp(0.86, 1, g));
    gateBody.material.opacity = 0.17 * g;

    /* 8. 通电 */
    const on = srange(s, 0.90, 1.00);
    parts.flowMats.forEach((m) => { m.uniforms.uOpacity.value = on * 0.85; });
  }

  apply(0);

  return { root, parts, anchors, fade, apply, kind: 'fab' };
}
