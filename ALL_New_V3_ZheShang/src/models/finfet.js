/* ---------------------------------------------------------------------------
   finfet.js — 参数化 FinFET
   一套几何服务三个时代：
     · 2011 单鳍 / 2014 多鳍（密度库 2 鳍 · 性能库 4 鳍）
     · 2022-2025 3nm：更高更密的鳍 + 菱形（钻石剖面）外延源漏
   竖向约定（世界单位）：STI 顶面 y = 0.52，鳍从 y = 0.20 长到 y = 0.52 + finH
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox, extrude } from './geo.js';
import { silicon, channel, oxide, metal, gateGlass, rim, energyFlow } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';

const FIN_PITCH = 1.20;
const STI_TOP = 0.50;
const FIN_BOTTOM = 0.16;

export function buildFinFET(opts = {}) {
  const finCount = opts.fins ?? 1;
  const finH = opts.finHeight ?? 2.00;
  const finW = opts.finWidth ?? 0.38;
  const gateLen = opts.gateLen ?? 0.80;
  const diamond = opts.diamond ?? false;
  const pitch = opts.pitch ?? FIN_PITCH;

  const root = new THREE.Group();
  const parts = { fins: [], gate: null };
  const anchors = {};

  const spanX = Math.max(finCount - 1, 0) * pitch;
  const subW = Math.max(spanX + 3.8, 5.6);
  const subD = 5.8;
  const finTop = STI_TOP + finH;
  const finTotal = finTop - FIN_BOTTOM;
  const finLen = subD - 1.2;
  // 菱形那一代：鳍片不需要伸得太远，菱形自己就是鳍片的"端头"
  const sdZ = diamond ? gateLen / 2 + 0.34 : gateLen / 2 + 1.55;
  const finZ = diamond ? gateLen + 1.30 : finLen;

  /* ---- 衬底 -------------------------------------------------------- */
  const sub = new THREE.Mesh(rbox(subW, 1.05, subD, 0.06, 3), silicon({ color: 0x1d2b3a }));
  sub.position.y = -0.525;
  root.add(sub);
  parts.substrate = sub;

  const plinth = new THREE.Mesh(
    rbox(subW + 0.7, 0.40, subD + 0.7, 0.08, 2),
    silicon({ color: 0x080f16, roughness: 0.7, metalness: 0.25 })
  );
  plinth.position.y = -1.25;
  root.add(plinth);

  /* ---- STI --------------------------------------------------------- */
  const sti = new THREE.Mesh(rbox(spanX + 1.7, STI_TOP, finZ + 0.5, 0.04, 2), oxide({ color: 0x0e1a26 }));
  sti.position.y = STI_TOP / 2;
  root.add(sti);
  parts.sti = sti;

  /* ---- 鳍 ----------------------------------------------------------
     菱形那一代（3nm）的横截面就是用户画的那张图：
     一根窄鳍片，顶端炸开一个大菱形，两者是同一块料，沿 Z 拉出整条鳍。 */
  const DIA_W = 1.24;   // 菱形横向宽度（远大于鳍宽）
  const DIA_H = 1.04;   // 菱形竖向高度
  const diaCyL = finTotal - DIA_H * 0.42;      // 菱形中心（局部坐标，0 = 鳍片底）
  const stemTopL = diaCyL - DIA_H * 0.30;      // 鳍片直段到哪儿结束

  // 鳍 + 菱形外延共用同一份剖面。sx / sy 用来生成"放大一点点"的贴身套壳，
  // 让接触面的电流带能严丝合缝地贴在菱形表面上（不能用圆角盒，套不上）。
  const diamondProfile = (sx = 1, sy = 1) => {
    const s = new THREE.Shape();
    s.moveTo(-finW / 2 * sx, 0);
    s.lineTo(-finW / 2 * sx, stemTopL * sy);
    s.lineTo(-DIA_W / 2 * sx, diaCyL * sy);
    s.lineTo(0, (diaCyL + DIA_H / 2) * sy);
    s.lineTo(DIA_W / 2 * sx, diaCyL * sy);
    s.lineTo(finW / 2 * sx, stemTopL * sy);
    s.lineTo(finW / 2 * sx, 0);
    s.closePath();
    return s;
  };

  let finGeo;
  if (diamond) {
    finGeo = extrude(diamondProfile(1, 1), finZ, { bevel: 0.018, bevelSegments: 1 });
    finGeo.translate(0, FIN_BOTTOM, 0);
  } else {
    finGeo = rbox(finW, finTotal, finZ, 0.025, 2);
  }
  for (let i = 0; i < finCount; i++) {
    const g = new THREE.Group();
    const x = (i - (finCount - 1) / 2) * pitch;

    // 3nm 的鳍本质上仍是 FinFET，颜色沿用前面几代鳍的那一套 channel 材质，
    // 不再整条通电流（旧版那个绿色 energyFlow 已移除）。
    // 和前面几代 FinFET 完全一样的浅灰蓝，整条不带任何动画
    const finMat = channel({ color: 0xc8dcec, metalness: 0.34, roughness: 0.26 });
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.y = diamond ? 0 : (FIN_BOTTOM + finTop) / 2;
    g.add(fin);



    // 棱线辉光：菱形那一代的轮廓也需要一条亮边，否则会显得比前面几代"闷"
    const shell = new THREE.Mesh(
      finGeo,
      rim(0x9fe4ff, { power: 3.6, strength: diamond ? 0.30 : 0.38 })
    );
    shell.position.copy(fin.position);
    shell.scale.set(1.05, 1.004, 1.004);
    g.add(shell);

    g.position.x = x;
    root.add(g);
    parts.fins.push({ group: g, fin, shell, x });
  }

  /* ---- 栅极（半透明，跨过所有鳍） ----------------------------------- */
  const gateW = spanX + (diamond ? DIA_W + 0.55 : 2.5);
  const gateBottom = STI_TOP - 0.02;
  const gateTop = finTop + (diamond ? 0.55 : 0.30);
  const gateH = gateTop - gateBottom;
  const gate = new THREE.Group();

  const gBody = new THREE.Mesh(rbox(gateW, gateH, gateLen, 0.04, 3), gateGlass({ color: 0xbef0ff, opacity: 0.11 }));
  gBody.position.y = (gateBottom + gateTop) / 2;
  gate.add(gBody);

  const gShell = new THREE.Mesh(rbox(gateW, gateH, gateLen, 0.04, 3), rim(0x86e8ff, { power: 3.0, strength: 0.40 }));
  gShell.position.copy(gBody.position);
  gShell.scale.set(1.005, 1.005, 1.02);
  gate.add(gShell);

  // 栅极顶端一条很淡的亮边（不要太亮，否则会 bloom 成一团光）
  const cap = new THREE.Mesh(rbox(gateW + 0.02, 0.05, gateLen + 0.02, 0.02, 1), rim(0xcaf7ff, { power: 2.2, strength: 0.18, base: 0.02 }));
  cap.position.y = gateTop + 0.025;
  gate.add(cap);

  root.add(gate);
  parts.gate = gate;
  parts.gateBody = gBody;

  /* ---- 接触面电流：只出现在鳍与半透明栅极相接的那一段 -----------------
     前面几代是给鳍套一个略大的圆角盒；3nm 的鳍是菱形剖面，盒子套不上，
     所以直接用同一份剖面放大一丝、只截取栅极长度，做成一层"贴身电流带"。 */
  const shells = [];
  const flowMats = [];

  let sheathGeo = null;
  if (diamond) {
    sheathGeo = extrude(diamondProfile(1.035, 1.015), gateLen * 0.99, {
      bevel: 0.012, bevelSegments: 1,
    });
    sheathGeo.translate(0, FIN_BOTTOM, 0);
  }

  for (let i = 0; i < finCount; i++) {
    const x = (i - (finCount - 1) / 2) * pitch;
    const dGeo = diamond
      ? sheathGeo
      : rbox(finW + 0.09, finTotal + 0.08, gateLen + 0.02, 0.02, 2);
    const dMat = energyFlow({
      color: diamond ? 0xd8fbff : 0x9df4ff,
      density: diamond ? 5.6 : 4.6,
      speed: diamond ? 1.1 : 1.05,
      opacity: 0.0,
      rimOnly: diamond ? 0.62 : 0.18,
      axis: [0, 0, 1],
    });
    const die = new THREE.Mesh(dGeo, dMat);
    die.position.set(x, diamond ? 0 : (FIN_BOTTOM + finTop) / 2, 0);
    die.renderOrder = 2;
    root.add(die);
    shells.push(die);
    flowMats.push(dMat);
  }
  parts.dielectric = shells;
  parts.flowMats = flowMats;
  parts.contactGlows = [];

  /* ---- 源 / 漏 ------------------------------------------------------ */
  const sd = [];
  const contactGlows = [];
  if (diamond) {
    // 菱形已经在鳍片本体的剖面里做出来了（见上面的 finGeo），这里不需要任何额外零件。
    // 保持数组存在，方便上一层的遍历逻辑。
  } else {
    for (const dir of [-1, 1]) {
      const box = new THREE.Mesh(
        rbox(spanX + 0.95, finH * 0.80, 0.85, 0.04, 2),
        channel({ color: 0xc08d58, metalness: 0.5, roughness: 0.28 })
      );
      box.position.set(0, STI_TOP + finH * 0.46, dir * sdZ);
      root.add(box);
      sd.push(box);

      const capM = new THREE.Mesh(rbox(spanX + 1.1, 0.12, 0.85, 0.03, 2), metal(0xb87f43, { roughness: 0.30 }));
      capM.position.set(0, STI_TOP + finH * 0.92, dir * sdZ);
      root.add(capM);
    }
  }
  /* ---- 电流特效：只在鳍片与栅极的两个接触面上 ------------------------ */
  if (diamond) {
    const sliceGeo = extrude(diamondProfile(1.012, 1.008), 0.26, { bevel: 0.003, bevelSegments: 1 });
    sliceGeo.translate(0, FIN_BOTTOM, 0);
    for (let i = 0; i < finCount; i++) {
      const x = (i - (finCount - 1) / 2) * pitch;
      for (const dir of [-1, 1]) {
        const gmat = energyFlow({
          color: 0x6fe8ff, density: 1.0, speed: 1.2,
          opacity: 0.62, rimOnly: 0.0, axis: [0, 0, 1],
        });
        const slice = new THREE.Mesh(sliceGeo, gmat);
        slice.position.set(x, 0, dir * (gateLen / 2));
        slice.renderOrder = 2;
        root.add(slice);
        contactGlows.push(gmat);
      }
    }
  }

  parts.sd = sd;
  parts.contactGlows = contactGlows;

  /* ---- 标签锚点 ----------------------------------------------------- */
  anchors.gate = anchor(gate, 0, gateH / 2 + 0.12, 0, 'gate');
  if (diamond) {
    anchors.fin = anchor(root, spanX / 2 + DIA_W * 0.5, FIN_BOTTOM + diaCyL, 0, 'fin');
    anchors.sd = anchor(root, 0, gateTop - 0.1, 0, 'sd');
  } else {
    anchors.fin = anchor(root, spanX / 2 + 0.12, STI_TOP + finH * 0.86, finZ / 2 - 0.35, 'fin');
    anchors.sd = anchor(root, spanX / 2, STI_TOP + finH * 0.62, sdZ, 'sd');
  }
  anchors.channel = anchor(root, 0, STI_TOP + finH * 0.5, -finZ / 2 + 0.2, 'channel');

  const fade = makeFade(root);

  return {
    root, parts, anchors, fade, kind: 'finfet',
    finCount, finH, gateLen, pitch, spanX, finLen, finZ,
    metrics: { gateBottom, gateTop, gateW, sdZ, finTop, STI_TOP },
  };
}
