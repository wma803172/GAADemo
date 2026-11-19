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
import { anchor } from '../models/common.js';
import { buildDie, buildPackage, buildServer, buildLaptop } from '../models/macro.js';
import { channelCurrent } from './channel-current.js';
import { lerp, srange, win, ease } from '../core/util.js';
import { chapterAt } from '../content.js';

/* ------------------------------------------------------------- camera rig */
const SHOTS = [
  { pos: [14.2, 9.4, 18.4], tgt: [-2.4, 0.9, 0], fov: 31 },   // hero
  { pos: [12.6, 7.4, 16.2], tgt: [-2.2, 0.55, 0], fov: 31 },  // planar
  { pos: [ 9.6, 5.0, 12.4], tgt: [-1.6, 0.70, 0], fov: 31 },  // sce
  { pos: [12.6, 6.4,  6.2], tgt: [-2.6, 1.35, 0], fov: 31 },  // finfet
  { pos: [18.6, 10.2, 10.4], tgt: [-2.0, 1.3, 0], fov: 31 },  // multifin
  { pos: [11.5, 7.0,  6.6], tgt: [-1.5, 1.35, 0], fov: 31 },  // n3
  { pos: [13.4, 6.0,  6.4], tgt: [-2.6, 2.20, 0], fov: 31 },  // gaa
  { pos: [17.5, 7.6, 13.0], tgt: [-3.0, 2.60, 0], fov: 31 },  // front
  { pos: [18.0, 6.4, 13.5], tgt: [-3.0, 1.90, 0], fov: 31 },  // split
  { pos: [17.0, 5.2, 13.0], tgt: [-3.0, 2.20, 0], fov: 32 }, // powervia
  { pos: [12.4, 4.2,  8.8], tgt: [-2.4, 1.70, 0], fov: 31 }, // via（同轴推进到器件）
  { pos: [17.5, 5.6, 13.5], tgt: [-2.9, 2.20, 0], fov: 32 }, // return（退回全景）
  { pos: [ 0.0, 3.6, 18.6], tgt: [ 0.0, 0.1, 0], fov: 31 },   // macro
  { pos: [ 1.2, 3.0, 16.0], tgt: [ 0.0, 1.2, 0], fov: 31 },   // products
  { pos: [ 0.0, 0.35, 16.5], tgt: [ 0.0, 0.00, 0], fov: 31 }, // outro（铭牌）
];

const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

export function createStage(scene) {
  const models = {};

  /* ---------------------------------------------------------- 建模型 */
  models.planar = buildPlanar();
  models.finfet = buildFinFET({ fins: 1 });
  models.multiDense = buildFinFET({ fins: 2 });
  models.multiPerf = buildFinFET({ fins: 4 });
  models.n3 = buildFinFET({ fins: 3, finHeight: 1.35, finWidth: 0.42, diamond: true, pitch: 1.30, gateLen: 0.72 });
  models.gaa = buildGAA({});

  /* ---- PowerVia 特写：器件 + 左右两端打孔 ---------------------------- */
  models.viaDev = buildGAA({});
  {
    const dev = models.viaDev;
    const m = dev.metrics;
    const bores = [];
    const boreGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 14, 1, false);
    for (const dir of [-1, 1]) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xbfefff, emissive: 0x6fe6ff, emissiveIntensity: 2.6,
        metalness: 0.2, roughness: 0.25, transparent: true, opacity: 0.95,
        depthTest: false,
      });
      const b = new THREE.Mesh(boreGeo, mat);
      b.position.set(0, 0, dir * (m.sdZ + 0.95));
      b.renderOrder = 6;
      b.visible = false;
      dev.root.add(b);
      bores.push(b);

      // Light the completed metallic link. This view specifies connectivity,
      // not a biased circuit with current flowing into both terminals.
      const fMat = new THREE.MeshBasicMaterial({
        color: 0x94dce7, transparent: true, depthWrite: false, depthTest: false,
      });
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.9, 12, 1, true), fMat);
      f.rotation.x = -dir * Math.PI / 2;
      f.position.set(0, m.cy, dir * (m.sdZ + 0.55));
      f.visible = false;
      dev.root.add(f);
      bores.push(f);
    }
    dev.parts.bores = bores;
    dev.anchors.tsv = anchor(bores[2], 0.12, 0.16, 0.085, 'tsv');

    /* 上下连接线：器件顶上接着信号层、底下接着电源层的那些细金属 */
    const linkMat = new THREE.MeshStandardMaterial({
      color: 0xe8a05a, metalness: 0.9, roughness: 0.35,
      emissive: new THREE.Color(0x2a1206), emissiveIntensity: 0.7,
    });
    const links = new THREE.Group();
    const topY = m.stackTop + 0.05;
    const botY = m.stackBottom - 0.25;
    const linkGeo = new THREE.BoxGeometry(0.12, 1, 0.12);
    for (const dir of [-1, 1]) {
      for (let k = -1; k <= 1; k++) {
        for (const sign of [1, -1]) {
          const h = sign > 0 ? 2.6 : 2.4;
          const link = new THREE.Mesh(linkGeo, linkMat);
          link.scale.y = h;
          link.position.set(k * 0.5, (sign > 0 ? topY + h / 2 : botY - h / 2), dir * (m.sdZ + k * 0.28));
          links.add(link);
        }
      }
    }
    // 上下各一小片金属板，暗示连到整摞互连
    for (const sign of [1, -1]) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.08, 2.6),
        new THREE.MeshStandardMaterial({ color: 0xe8a05a, metalness: 0.85, roughness: 0.4 })
      );
      plate.position.set(0, sign > 0 ? topY + 2.6 : botY - 2.4, 0);
      links.add(plate);
    }
    links.visible = false;
    dev.root.add(links);
    dev.parts.links = links;
  }

  models.stack = buildStack({ device: models.gaa });
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

  const current = channelCurrent(models);

  /* ------------------------------------------------------------ apply */
  function apply(p, time, view) {
    current.clock.value = time;
    const cur = chapterAt(p);

    // 每帧清零：所有旋转都从这里"重新算"，不累积
    for (const k in models) models[k].root.rotation.set(0, 0, 0);

    /* ---------------- 可见性窗口 ---------------- */
    const vPlanar = win(p, -0.2, 0.0, 0.192, 0.206);
    const vFin = win(p, 0.196, 0.212, 0.284, 0.296);
    const vMulti = win(p, 0.282, 0.300, 0.372, 0.384);
    const vN3 = win(p, 0.370, 0.386, 0.450, 0.464);
    const vGaa = win(p, 0.458, 0.472, 0.548, 0.560);
    const vStack = Math.max(
      win(p, 0.546, 0.560, 0.750, 0.762),
      win(p, 0.790, 0.800, 0.826, 0.840)
    );
    const vVia = win(p, 0.754, 0.770, 0.792, 0.800);
    const vDie = win(p, 0.830, 0.843, 0.856, 0.868);
    const vPkg = win(p, 0.847, 0.861, 0.881, 0.894);
    const vSrv = win(p, 0.875, 0.890, 0.907, 0.917);
    const vLap = win(p, 0.905, 0.922, 0.960, 0.970);


    models.planar.fade(vPlanar);
    models.finfet.fade(vFin);
    models.multiDense.fade(vMulti);
    models.multiPerf.fade(vMulti);
    models.n3.fade(vN3);
    models.gaa.fade(vGaa);
    models.stack.fade(vStack);
    models.viaDev.fade(vVia);
    models.die.fade(vDie);
    models.package.fade(vPkg);
    models.server.fade(vSrv);
    models.laptop.fade(vLap);

    /* ---------------- 平面晶体管 ---------------- */
    if (vPlanar > 0.001) {
      const sce = srange(p, 0.128, 0.196);
      const planar = models.planar;
      const scale = lerp(1, 0.42, sce);
      planar.setGateScale(scale);
      const channelWidth = planar.metrics.channelLength * scale;
      const ctrl = planar.parts.ctrlZone;
      const leak = planar.parts.leakZone;
      ctrl.visible = sce > 0.02;
      leak.visible = sce > 0.02;
      ctrl.scale.x = channelWidth;
      ctrl.material.opacity = sce * 0.26 * vPlanar;
      // In shorter devices the drain influences a larger fraction of the
      // channel. The warm gradient fades toward the source, under the gate.
      const leakW = channelWidth * lerp(0.18, 0.80, sce);
      leak.scale.x = leakW;
      leak.position.x = (channelWidth - leakW) / 2;
      leak.material.opacity = sce * 0.36 * vPlanar;
      // Strong-on conduction transitions to a much fainter short-channel
      // leakage cue. The warm drain-field overlay remains independent.
      const demonstration = srange(p, 0.050, 0.076);
      current.strength.planar.value = demonstration * lerp(1, 0.18, sce) * vPlanar;
      // The preceding planar chapter already labels both terminals in full.
      for (const marker of planar.parts.flowEnds) marker.visible = cur.chapter.id === 'sce';
      // 入场：整体轻微旋转 + 位置
      models.planar.root.rotation.y = lerp(-0.06, 0.02, srange(p, 0.05, 0.22));
    }

    /* ---------------- FinFET 单鳍 ---------------- */
    if (vFin > 0.001) {
      const m = models.finfet;
      const on = srange(p, 0.205, 0.245);
      current.strength.finfet.value = on * vFin;
      // 栅极包裹区高亮：把栅极玻璃稍微提亮
      m.parts.gateBody.material.opacity = lerp(0.18, 0.30, on);
    }

    /* ---------------- 多鳍 ---------------- */
    if (vMulti > 0.001) {
      const on = srange(p, 0.292, 0.330);
      for (const key of ['multiDense', 'multiPerf']) {
        const m = models[key];
        current.strength[key].value = on * vMulti;
        m.root.position.y = lerp(-0.3, 0, on);
      }
    }

    /* ---------------- 3nm ---------------- */
    if (vN3 > 0.001) {
      const on = srange(p, 0.378, 0.415);
      current.strength.n3.value = on * vN3;
      models.n3.root.rotation.y = lerp(0.55, 0.15, srange(p, 0.375, 0.462));
      // 退场：缩一点、往下沉一点，交接给 GAA 时才不会两坨模型叠在一起
      const outro = srange(p, 0.452, 0.468);
      models.n3.root.scale.setScalar(lerp(1, 0.62, outro));
      models.n3.root.position.y = lerp(0, -1.2, outro);
    }

    /* ---------------- GAA ---------------- */
    if (vGaa > 0.001) {
      const m = models.gaa;
      const on = srange(p, 0.462, 0.500);
      current.strength.gaa.value = on * vGaa;
      // 四条带子依次亮起
      m.parts.ribbons.forEach((r, i) => {
        const k = srange(p, 0.462 + i * 0.010, 0.500 + i * 0.010);
        r.scale.x = lerp(0.55, 1, k);
      });
      m.root.rotation.y = lerp(-0.10, 0.06, srange(p, 0.46, 0.575));
    }

    /* ---------------- 互连 / PowerVia ---------------- */
    if (vStack > 0.001) {
      const s = models.stack;
      // 节奏：先分离（电源沉到背面）→ 摊开看清楚 → **再合体成一根完整的柱体** → 最后钻进器件看 TSV
      const split = srange(p, 0.624, 0.686);
      const warp = srange(p, 0.700, 0.730);
      const assemble = srange(p, 0.718, 0.772);
      const flip = srange(p, 0.700, 0.736);
      const thin = srange(p, 0.712, 0.746);
      const drill = srange(p, 0.758, 0.780);
      const land = srange(p, 0.786, 0.802);
      const thick = srange(p, 0.655, 0.795);

      s.apply({ split: lerp(split, 1, warp * 0.35), assemble, drill, land, thick, showFront: 1 });

      // 翻面：这里不真把模型转 180°（那样观众会瞬间失去方向感），
      // 而是轻轻倾斜，把背面露出来；真正的"翻过来"由文案交代。
      s.root.rotation.x = flip * 0.10;
      // 减薄：器件衬底变薄
      const sub = s.parts.substrate;
      sub.scale.y = lerp(1, 0.42, thin);
      sub.position.y = lerp(-0.28, -0.13, thin);

      s.root.rotation.y = lerp(0.30, 0.06, srange(p, 0.545, 0.62));
      // 最后"拉远"：整座塔缩回一个小点
      const zoomOut = srange(p, 0.822, 0.838);
      s.root.scale.setScalar(lerp(1, 0.22, zoomOut));
    }

    /* ---------------- PowerVia 特写：两端打孔送电 ---------------- */
    if (vVia > 0.001) {
      const drillV = srange(p, 0.758, 0.784);
      const onV = srange(p, 0.770, 0.792);
      const m = models.viaDev.metrics;
      models.viaDev.parts.links.visible = true;
      models.viaDev.parts.bores.forEach((b, i) => {
        const dirIdx = i < 2 ? 0 : 1;
        const local = Math.max(0, Math.min(1, (drillV - dirIdx * 0.12) / 0.78));
        if (i % 2 === 0) {
          // 孔：从底下往上钻，钻到源漏里
          const h = 3.4 * local;
          b.visible = local > 0.001;
          b.scale.y = Math.max(h, 0.001);
          b.position.y = -1.35 + h / 2;
        } else {
          // 接通后整段横接头亮起。
          const reachedContact = -1.35 + 3.4 * local >= m.cy - 0.15;
          b.visible = onV > 0.02 && reachedContact;
          b.material.opacity = onV * vVia * 0.84;
        }
      });
    }

    /* ---------------- 尺度阶梯 ----------------
       每一次换挡：旧的东西缩成一个点，新的东西从画面外落进来。
       两个动作重叠 0.01，读起来就是一次连续的"拉远"。 */
    const LADDER = [
      { key: 'die', inA: 0.798, inB: 0.816, outA: 0.832, outB: 0.846, base: 1.45 },
      { key: 'package', inA: 0.831, inB: 0.847, outA: 0.861, outB: 0.874, base: 1.10 },
      { key: 'server', inA: 0.859, inB: 0.876, outA: 0.887, outB: 0.898, base: 0.86 },
      { key: 'laptop', inA: 0.889, inB: 0.912, outA: 2.0, outB: 2.1, base: 0.88 },
    ];
    for (const L of LADDER) {
      const m = models[L.key];
      if (!m.root.visible) continue;
      const incoming = lerp(2.3, 1, srange(p, L.inA, L.inB));
      const outgoing = lerp(1, 0.10, srange(p, L.outA, L.outB));
      const spin = L.key === 'laptop' ? lerp(-0.6, -0.14, srange(p, 0.88, 0.96)) : 0;
      m.root.scale.setScalar(L.base * incoming * outgoing);
      m.root.rotation.y = spin;
    }

    /* ---------------- 相机 ----------------
       每一章前 74% 停在自己的机位上（只做极慢的推进），
       后 26% 平滑地移到下一章机位。这样"停住看"和"转场"是同一套代码。 */
    const idx = Math.min(cur.index, SHOTS.length - 1);
    const u = cur.u;
    let from = SHOTS[idx];
    let to = SHOTS[Math.min(idx + 1, SHOTS.length - 1)];
    let k = 0;
    if (u > 0.84 && idx + 1 < SHOTS.length) {
      const tt = (u - 0.84) / 0.16;
      k = tt * tt * (3 - 2 * tt);
    }
    // 极慢的推近，让"停住"的那段也有呼吸
    const dolly = 1 - 0.035 * (1 - ease.inOut(Math.min(u / 0.74, 1)));
    _p.set(
      lerp(from.pos[0], to.pos[0], k) * (k > 0.001 ? 1 : dolly),
      lerp(from.pos[1], to.pos[1], k) * (k > 0.001 ? 1 : dolly),
      lerp(from.pos[2], to.pos[2], k) * (k > 0.001 ? 1 : dolly)
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

    return { cameraPos: _p, cameraTarget: _t, fov: lerp(from.fov, to.fov, k) };
  }

  return { models, apply, setFlowMode: current.setFlowMode };
}
