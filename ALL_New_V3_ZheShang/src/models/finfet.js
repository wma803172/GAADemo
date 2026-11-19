/* ---------------------------------------------------------------------------
   finfet.js — 参数化 FinFET
   一套几何服务三个时代：
     · 2011 单鳍 / 2014 多鳍（密度库 2 鳍 · 性能库 4 鳍）
     · 2022-2025 3nm：更高更密的鳍 + 菱形（钻石剖面）外延源漏
   竖向约定（世界单位）：STI 顶面 y = 0.52，鳍从 y = 0.20 长到 y = 0.52 + finH
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox, extrude } from './geo.js';
import { silicon, channel, oxide, rim, energyFlow } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';
import { cutBlock, cutawayGate, finishPlinth, gateSection, surfaceMetal } from './finishes.js';

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
  const sub = new THREE.Mesh(cutBlock(subW,1.05,subD,0.17,0.065),silicon({ color: 0x354657 }));
  sub.position.y = -0.525;
  root.add(sub);
  parts.substrate = sub;

  const plinth = new THREE.Mesh(
    cutBlock(subW+0.7,0.40,subD+0.7,0.22,0.07),
    silicon({ color: 0x1c2831, roughness: 0.46, metalness: 0.25 })
  );
  plinth.position.y = -1.25;
  finishPlinth(plinth,subW+0.7,0.40,subD+0.7);
  root.add(plinth);

  /* ---- STI --------------------------------------------------------- */
  const sti = new THREE.Mesh(cutBlock(spanX+1.7,STI_TOP,finZ+0.5,0.12,0.045),oxide({ color: 0x203542 }));
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
    const profile = diamondProfile(1,1);
    finGeo = new THREE.ExtrudeGeometry(profile,{
      depth:finZ, steps:8, bevelEnabled:true, bevelSize:0.016, bevelThickness:0.016, bevelSegments:2,
    });
    finGeo.translate(0,0,-finZ/2);
    // Narrow only the exposed ends. The gated section keeps the original
    // diamond profile so its close-fitting current traces still coincide.
    const pos=finGeo.attributes.position;
    for (let i=0; i<pos.count; i++) {
      const amount=THREE.MathUtils.smoothstep(Math.abs(pos.getZ(i)),finZ*0.33,finZ*0.50);
      pos.setX(i,pos.getX(i)*(1-0.075*amount));
      pos.setY(i,pos.getY(i)*(1-0.032*amount));
    }
    finGeo.computeVertexNormals();
    finGeo.translate(0, FIN_BOTTOM, 0);
  } else {
    finGeo = rbox(finW,finTotal,finZ,0.045,3);
  }
  for (let i = 0; i < finCount; i++) {
    const g = new THREE.Group();
    const x = (i - (finCount - 1) / 2) * pitch;

    // 3nm 的鳍本质上仍是 FinFET，颜色沿用前面几代鳍的那一套 channel 材质，
    // 不再整条通电流（旧版那个绿色 energyFlow 已移除）。
    // 和前面几代 FinFET 完全一样的浅灰蓝，整条不带任何动画
    const finMat=channel({color:0xb9ccda,extra:{metalness:0.23,roughness:0.34,clearcoat:0.24,clearcoatRoughness:0.25}});
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

  const gBody = new THREE.Mesh(rbox(gateW,gateH,gateLen,0.048,3),cutawayGate(0xbadae7,0.17));
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

  // A thin metal slice remains at the far face of the cutaway. Cut the
  // actual fin profiles out of its lower edge, so the shared gate covers
  // the top and sides of every fin and never runs through the silicon.
  const face = new THREE.Shape();
  const half = finW/2+(diamond?0.012:0.038);
  face.moveTo(-gateW/2,gateBottom);
  for (const {x} of parts.fins) {
    face.lineTo(x-half,gateBottom);
    if (diamond) {
      face.lineTo(x-half,FIN_BOTTOM+stemTopL);
      face.lineTo(x-DIA_W/2-0.012,FIN_BOTTOM+diaCyL);
      face.lineTo(x,FIN_BOTTOM+diaCyL+DIA_H/2+0.035);
      face.lineTo(x+DIA_W/2+0.012,FIN_BOTTOM+diaCyL);
      face.lineTo(x+half,FIN_BOTTOM+stemTopL);
    } else {
      face.lineTo(x-half,finTop+0.045);
      face.lineTo(x+half,finTop+0.045);
    }
    face.lineTo(x+half,gateBottom);
  }
  face.lineTo(gateW/2,gateBottom);
  face.lineTo(gateW/2,gateTop);
  face.lineTo(-gateW/2,gateTop);
  face.closePath();
  const section = new THREE.Mesh(extrude(face,gateLen*0.115,{bevel:0.005,bevelSegments:2}),gateSection());
  section.position.z=-gateLen*0.421;
  gate.add(section);
  const crown = new THREE.Mesh(cutBlock(gateW-0.05,0.053,gateLen*0.28,0.034,0.010),surfaceMetal(0xa8bebd,0.33));
  crown.position.set(0,gateTop-0.022,-gateLen*0.331);
  gate.add(crown);

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
        cutBlock(spanX+0.95,finH*0.80,0.85,0.10,0.06,0.115),
        channel({color:0xb78958,extra:{metalness:0.24,roughness:0.42,clearcoat:0.16}})
      );
      box.position.set(0, STI_TOP + finH * 0.46, dir * sdZ);
      root.add(box);
      sd.push(box);

      const landingY = box.position.y + finH * 0.4;
      const capBottom = STI_TOP + finH * 0.92 - 0.06;
      const collarH = Math.max(capBottom - landingY + 0.025,0.035);
      const collar = new THREE.Mesh(cutBlock(spanX+0.91,collarH,0.74,0.10,0.014),surfaceMetal(0x8b8373,0.42));
      collar.position.set(0,capBottom-collarH/2+0.008,dir*sdZ);
      root.add(collar);
      const capM = new THREE.Mesh(cutBlock(spanX+1.1,0.12,0.85,0.11,0.029),surfaceMetal(0xd2b489,0.29));
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
  anchors.gate = anchor(gate, gateW * 0.18, gateTop, -gateLen * 0.42, 'gate');
  if (diamond) {
    anchors.fin = anchor(root, spanX / 2 + DIA_W * 0.35, FIN_BOTTOM + diaCyL + DIA_H * 0.15, finZ * 0.32, 'fin');
    anchors.sd = anchors.gate; // Original N3 caption maps the key "sd" to the gate.
  } else {
    const freeFinZ = (gateLen / 2 + sdZ - 0.85 / 2) / 2;
    anchors.fin = anchor(root, spanX / 2 + finW / 2, STI_TOP + finH * 0.86, freeFinZ, 'fin');
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
