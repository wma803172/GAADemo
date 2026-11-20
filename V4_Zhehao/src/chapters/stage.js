/* ---------------------------------------------------------------------------
   stage.js — 把模型装进场景，并定义"progress p → 世界状态"这一唯一的映射
   整个站的画面只由 p 决定：没有计时器、没有事件、没有状态残留。
   想调某一帧？把 p 设成那个值就行。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { buildPlanar } from '../models/planar.js';
import { buildFinFET } from '../models/finfet.js';
import { buildGAA } from '../models/gaa.js';
import { buildStack } from '../models/stack.js';
import { buildDie, buildPackage, buildServer, buildLaptop } from '../models/macro.js';
import { particlePoints } from '../scene/materials.js';
import { clamp, lerp, srange } from '../core/util.js';
import { CHAPTERS, chapterAt } from '../content.js';

/* ------------------------------------------------------------- camera rig */
const SHOTS = [
  { pos: [14.2, 9.4, 18.4], tgt: [-2.4, 0.9, 0], fov: 31 },   // hero
  { pos: [12.6, 7.4, 16.2], tgt: [-2.2, 0.55, 0], fov: 31 },  // planar
  { pos: [ 9.6, 5.0, 12.4], tgt: [-1.6, 0.70, 0], fov: 31 },  // sce
  { pos: [12.6, 6.4,  6.2], tgt: [-2.6, 1.35, 0], fov: 31 },  // finfet
  { pos: [18.6, 10.2, 10.4], tgt: [-2.0, 1.3, 0], fov: 31 },  // multifin
  { pos: [11.5, 7.0,  6.6], tgt: [-1.5, 1.35, 0], fov: 31 },  // n3
  { pos: [13.4, 6.0,  6.4], tgt: [-2.6, 2.20, 0], fov: 31 },  // gaa
  { pos: [10.4, 5.3, 11.0], tgt: [-1.7, 1.65, 0], fov: 32 }, // front
  { pos: [10.2, 4.7, 10.8], tgt: [-1.8, 0.75, 0], fov: 33 }, // split + wafer flip
  { pos: [8.6, 3.6, 10.5], tgt: [-1.6, -0.45, 0], fov: 32 }, // backside networks
  { pos: [1.65, 0.85, 5.5], tgt: [-2.06, -0.03, 0.60], fov: 32 }, // side-contact cutaway
  { pos: [9.2, 3.5, 10.3], tgt: [-1.6, -0.55, 0], fov: 32 }, // return
  { pos: [ 0.0, 3.6, 18.6], tgt: [ 0.0, 0.1, 0], fov: 31 },   // macro
  { pos: [ 1.2, 3.0, 16.0], tgt: [ 0.0, 1.2, 0], fov: 31 },   // products
  { pos: [ 0.0, 0.35, 16.5], tgt: [ 0.0, 0.00, 0], fov: 31 }, // outro（铭牌）
];

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

function atChapter(id, fraction = 0) {
  const { start, end } = CHAPTERS.find(chapter => chapter.id === id);
  return lerp(start, end, fraction);
}

// Each interval owns the stage until the next cut. The paired fin libraries
// occupy separate positions within a single comparison shot.
const CUTS = [
  { start: atChapter('hero'), models: ['planar'] },
  { start: atChapter('finfet'), models: ['finfet'] },
  { start: atChapter('multifin'), models: ['multiDense', 'multiPerf'] },
  { start: atChapter('n3'), models: ['n3'] },
  { start: atChapter('gaa'), models: ['gaa'] },
  { start: atChapter('front'), models: ['stack'] },
  { start: atChapter('macro', 0.24), models: ['die'], scale: 1.45 },
  { start: atChapter('macro', 0.55), models: ['package'], scale: 1.10 },
  { start: atChapter('products'), models: ['server'], scale: 0.86 },
  { start: atChapter('products', 0.37), models: ['laptop'], scale: 0.88 },
  { start: atChapter('outro'), models: [] },
];

export function sceneIndexAt(p) {
  let i = 0;
  while (i + 1 < CUTS.length && p >= CUTS[i + 1].start) i++;
  return i;
}

export function createStage(scene) {
  const models = {};

  /* ---------------------------------------------------------- 建模型 */
  models.planar = buildPlanar();
  models.finfet = buildFinFET({ fins: 1 });
  models.multiDense = buildFinFET({ fins: 2 });
  models.multiPerf = buildFinFET({ fins: 4 });
  models.n3 = buildFinFET({ fins: 3, finHeight: 1.35, finWidth: 0.42, diamond: true, pitch: 1.30, gateLen: 0.72 });
  models.gaa = buildGAA({});

  let channelOn = true;
  function setChannelOn(value) {
    channelOn = Boolean(value);
  }

  models.stack = buildStack({});
  models.die = buildDie();
  models.package = buildPackage();
  models.server = buildServer();
  models.laptop = buildLaptop();

  for (const key of Object.keys(models)) {
    const m = models[key];
    scene.add(m.root);
    m.root.visible = false;
    m.root.userData.home = new THREE.Vector3();
  }

  // 密度库 / 性能库的站位
  models.multiDense.root.position.set(-3.9, 0, 0);
  models.multiPerf.root.position.set(3.9, 0, 0);
  models.die.root.position.set(0, 0, 0);
  models.package.root.position.set(0, 0, 0);
  models.server.root.position.set(0, 0.4, 0);
  models.laptop.root.position.set(0, 0.6, 0);
  models.stack.root.position.set(0, 0, 0);

  /* ------------------------------------------------- 接触面上的电子流 */
  function makeFlow(n, color, model) {
    const pts = particlePoints(n, color);
    model.root.add(pts);
    const set = {
      points: pts,
      data: [],
      visible: 0,
      // 每个粒子的参数
    };
    for (let i = 0; i < n; i++) {
      set.data.push({
        lane: i % 4,
        u: Math.random(),
        v: Math.random(),
        speed: 0.18 + Math.random() * 0.35,
        surf: Math.random() > 0.5 ? 1 : -1,
      });
    }
    return set;
  }

  // GAA：四条硅带的上下表面
  const gaaFlow = makeFlow(520, 0x9ff2ff, models.gaa);
  // FinFET：鳍的两个侧面
  const finFlow = makeFlow(300, 0x9ff2ff, models.finfet);

  function updateParticles(time) {
    // GAA
    const gm = models.gaa.metrics;
    const gv = models.gaa.parts.flowVisible ?? 0;
    const gpos = gaaFlow.points.geometry.attributes.position;
    const gLen = 2 * gm.sdZ;
    for (let i = 0; i < gaaFlow.data.length; i++) {
      const d = gaaFlow.data[i];
      const laneY = models.gaa.parts.ribbons[d.lane].position.y;
      const u = (d.u + time * d.speed * 0.25) % 1;
      const z = (u - 0.5) * gLen;
      const x = (d.v - 0.5) * (gm.RIBBON_W * 0.92);
      const y = laneY + d.surf * 0.115;
      gpos.setXYZ(i, x, y, z);
    }
    gpos.needsUpdate = true;
    gaaFlow.points.material.uniforms.uOpacity.value = gv;
    gaaFlow.points.visible = gv > 0.01;

    // FinFET（单鳍那台）
    const fv = models.finfet.parts.flowVisible ?? 0;
    const fpos = finFlow.points.geometry.attributes.position;
    for (let i = 0; i < finFlow.data.length; i++) {
      const d = finFlow.data[i];
      const u = (d.u + time * d.speed * 0.25) % 1;
      const z = (u - 0.5) * models.finfet.gateLen * 1.1;
      const side = d.lane % 2 === 0 ? 1 : -1;
      const x = side * (0.34 / 2 + 0.06);
      const y = 0.20 + (d.v * 0.9 + 0.1) * (models.finfet.finH + 0.1);
      fpos.setXYZ(i, x, y, z);
    }
    fpos.needsUpdate = true;
    finFlow.points.material.uniforms.uOpacity.value = fv;
    finFlow.points.visible = fv > 0.01;
  }

  /* ------------------------------------------------------------ apply */
  function apply(p, time, view) {

    const cutIndex = sceneIndexAt(p);
    const cut = CUTS[cutIndex];
    const nextCut = CUTS[cutIndex + 1];
    for (const key in models) {
      const { root } = models[key];
      root.visible = cut.models.includes(key);
      root.rotation.set(0, 0, 0);
    }

    /* ---------------- 平面晶体管 ---------------- */
    if (models.planar.root.visible) {
      const sce = srange(p, 0.128, 0.196);
      const g = models.planar.parts.gate;
      g.scale.x = lerp(1, 0.42, sce);
      // 栅极压下去一点点，强调"更薄的板子"
      g.position.y = lerp(0, -0.06, sce);
      // 栅极覆盖的那一段 = 受控区；栅极到漏极之间 = 失控区（漏极电场接管）
      const gateHalf = (2.35 / 2) * g.scale.x;
      const chHalf = 1.5;
      const ctrl = models.planar.parts.ctrlZone;
      const leak = models.planar.parts.leakZone;
      ctrl.visible = sce > 0.02;
      leak.visible = sce > 0.02;
      ctrl.scale.x = gateHalf * 2;
      ctrl.position.x = 0;
      ctrl.material.opacity = sce * 0.26;
      const leakW = Math.max(chHalf - gateHalf, 0.05);
      leak.scale.x = leakW;
      leak.position.x = gateHalf + leakW / 2;
      leak.material.opacity = sce * 0.36;
      const flow = models.planar.parts.channelFlow;
      flow.visible = sce > 0.4;
      if (flow.visible) {
        flow.material.uniforms.uOpacity.value = 0.5;
        flow.scale.x = g.scale.x;
      }
      // 入场：整体轻微旋转 + 位置
      models.planar.root.rotation.y = lerp(-0.06, 0.02, srange(p, 0.05, 0.22));
    }

    /* ---------------- FinFET 单鳍 ---------------- */
    if (models.finfet.root.visible) {
      const m = models.finfet;
      const on = srange(p, 0.205, 0.245);
      m.parts.flowMats.forEach((mat) => { mat.uniforms.uOpacity.value = on * 0.50; });
      m.parts.flowVisible = on;
      // 栅极包裹区高亮：把栅极玻璃稍微提亮
      m.parts.gateBody.material.opacity = lerp(0.18, 0.30, on);
    } else {
      models.finfet.parts.flowVisible = 0;
    }

    /* ---------------- 多鳍 ---------------- */
    if (models.multiDense.root.visible) {
      const on = srange(p, 0.292, 0.330);
      for (const key of ['multiDense', 'multiPerf']) {
        const m = models[key];
        m.parts.flowMats.forEach((mat) => { mat.uniforms.uOpacity.value = on * 0.46; });
        m.root.position.y = lerp(-0.3, 0, on);
      }
    }

    /* ---------------- 3nm ---------------- */
    if (models.n3.root.visible) {
      const on = srange(p, 0.378, 0.415);
      models.n3.parts.flowMats.forEach((mat) => { mat.uniforms.uOpacity.value = on * 0.85; });
      // 菱形不缩放；只在它和栅极的接触面上跑电流
      (models.n3.parts.contactGlows || []).forEach((mat, i) => {
        const k = srange(p, 0.386 + i * 0.006, 0.412 + i * 0.006);
        mat.uniforms.uOpacity.value = k * on * 0.55;
      });
      models.n3.root.rotation.y = lerp(0.55, 0.15, srange(p, 0.375, 0.462));
      // 退场：缩一点、往下沉一点，交接给 GAA 时才不会两坨模型叠在一起
      const outro = srange(p, 0.452, 0.468);
      models.n3.root.scale.setScalar(lerp(1, 0.62, outro));
      models.n3.root.position.y = lerp(0, -1.2, outro);
    }

    /* ---------------- GAA ---------------- */
    if (models.gaa.root.visible) {
      const m = models.gaa;
      // The one gate switches all four channels together. The current path is
      // anchored to their fixed silicon geometry even if the observer rotates it.
      const on = channelOn ? 1 : 0;
      m.parts.contactShells.forEach(shell => {
        shell.material.uniforms.uOpacity.value = 0.48 * on;
        shell.visible = channelOn;
      });
      m.parts.flowVisible = on;
      m.root.rotation.y = lerp(-0.10, 0.06, srange(p, 0.46, 0.575));
    } else {
      models.gaa.parts.flowVisible = 0;
    }

    /* ---------------- 互连 / PowerVia ---------------- */
    if (models.stack.root.visible) {
      const stack = models.stack;
      const turn = srange(p, 0.631, 0.686);
      const split = srange(p, 0.623, 0.708);
      const detail = srange(p, 0.738, 0.768) * (1 - srange(p, 0.791, 0.806));
      stack.apply({
        split, time, detail,
        preformed: srange(p, 0.620, 0.631),
        bond: srange(p, 0.626, 0.638),
        backReady: srange(p, 0.690, 0.708),
        thin: srange(p, 0.680, 0.697),
        assemble: srange(p, 0.691, 0.730),
      });
      // Rotate the carrier, silicon, contacts and both wiring planes together.
      // About Z, the exposed cutaway continues to face the observer.
      stack.root.rotation.z = Math.PI * turn;
      stack.root.rotation.y = lerp(0.20, 0, turn);
      stack.root.scale.setScalar(lerp(1, 0.65, srange(p, 0.822, nextCut.start)));
    }

    // 尺度阶梯：在每个独立镜头内拉远，停在交界两侧都能看清主体。
    if (cut.scale !== undefined) {
      const key = cut.models[0];
      const u = (p - cut.start) / (nextCut.start - cut.start);
      const incoming = lerp(1.12, 1, srange(u, 0, 0.35));
      const outgoing = key === 'laptop' ? 1 : lerp(1, 0.75, srange(u, 0.62, 1));
      models[key].root.scale.setScalar(cut.scale * incoming * outgoing);
      if (key === 'laptop') models[key].root.rotation.y = lerp(-0.6, -0.14, srange(u, 0, 1));
    }

    /* ---------------- 相机 ----------------
       前 84% 在本章机位轻轻推进再回正，后 16% 移到下一章机位。 */
    const cur = chapterAt(p);
    const idx = Math.min(cur.index, SHOTS.length - 1);
    const u = cur.u;
    const from = SHOTS[idx];
    const to = SHOTS[Math.min(idx + 1, SHOTS.length - 1)];
    const k = srange(u, 0.84, 1);
    const dolly = 1 - 0.018 * Math.sin(Math.PI * clamp(u / 0.84)) ** 2;
    _p.set(
      lerp(from.pos[0], to.pos[0], k) * dolly,
      lerp(from.pos[1], to.pos[1], k) * dolly,
      lerp(from.pos[2], to.pos[2], k) * dolly
    );
    _t.set(
      lerp(from.tgt[0], to.tgt[0], k),
      lerp(from.tgt[1], to.tgt[1], k),
      lerp(from.tgt[2], to.tgt[2], k)
    );

    _p.x += Math.sin(time * 0.21) * 0.09;
    _p.y += Math.sin(time * 0.17 + 1.3) * 0.06;

    // 鼠标拖拽：观众可以自己转着看（PPT 最后要求的"可自由拖动"）
    if (view && (Math.abs(view.yaw) > 1e-4 || Math.abs(view.pitch) > 1e-4)) {
      for (const k in models) {
        const m = models[k];
        if (!m.root.visible) continue;
        m.root.rotation.y += view.yaw;
        m.root.rotation.x += view.pitch;
      }
    }

    updateParticles(time);
    return { cameraPos: _p, cameraTarget: _t, fov: lerp(from.fov, to.fov, k) };
  }

  return { models, apply, setChannelOn };
}
