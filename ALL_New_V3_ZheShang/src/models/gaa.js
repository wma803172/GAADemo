/* ---------------------------------------------------------------------------
   gaa.js — Intel RibbonFET（GAA，2026 主角）
   四条水平硅带，一条栅极把它们四个全部裹住。
   为了让观众"看见"那多出来的接触面积：
     · 栅极是半透明玻璃
     · 硅带外面套一层会发光的栅介质，只在栅极下面亮
     · 电子沿着硅带从源极跑到漏极
   坐标约定：硅带沿 Z 走（电流方向），栅极沿 Z 有 gateLen 的宽度，
             在 X-Y 平面上一刀切下去是"一个带圆角的长方框里挖四条缝"。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox, extrude, roundedRectShape, roundedRectPath } from './geo.js';
import { silicon, channel, oxide, rim, energyFlow } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';
import { cutBlock, cutawayGate, finishPlinth, gateSection, surfaceMetal } from './finishes.js';

const RIBBON_W = 1.9;      // X 方向：ribbon 宽度（设计可调，决定驱动电流）
const RIBBON_T = 0.16;     // Y 方向：ribbon 厚度
const RIBBON_GAP = 0.42;   // ribbon 间距
const RIBBON_N = 4;
const RIBBON_L = 6.6;      // Z 方向：长度
const STI_TOP = 0.36;

export function buildGAA(opts = {}) {
  const n = opts.ribbons ?? RIBBON_N;
  const gateLen = opts.gateLen ?? 1.15;
  const root = new THREE.Group();
  const parts = { ribbons: [], terminals: [], contactShells: [], particles: [] };
  const anchors = {};

  const pitchY = RIBBON_T + RIBBON_GAP;
  const stackBottom = STI_TOP + 0.62;
  const stackTop = stackBottom + (n - 1) * pitchY + RIBBON_T;
  const cy = (stackBottom + stackTop) / 2;

  /* ---- 衬底 -------------------------------------------------------- */
  const sub = new THREE.Mesh(cutBlock(7.6,1.0,7.4,0.17,0.065),silicon({color:0x354657}));
  sub.position.y = -0.5;
  root.add(sub);
  parts.substrate = sub;

  const plinth = new THREE.Mesh(
    cutBlock(8.6,0.4,8.2,0.22,0.07),
    silicon({color:0x1c2831,roughness:0.46,metalness:0.25})
  );
  plinth.position.y = -1.2;
  finishPlinth(plinth,8.6,0.4,8.2);
  root.add(plinth);

  const sti = new THREE.Mesh(cutBlock(6.2,STI_TOP,6.6,0.12,0.045),oxide({color:0x203542}));
  sti.position.y = STI_TOP / 2;
  root.add(sti);
  parts.sti = sti;

  /* ---- 四条硅带 ----------------------------------------------------- */
  const ribbonGeo = extrude(roundedRectShape(RIBBON_W,RIBBON_T,0.060),RIBBON_L,{bevel:0,curveSegments:8});
  for (let i = 0; i < n; i++) {
    const y = stackBottom + i * pitchY;
    const r = new THREE.Mesh(ribbonGeo,channel({color:0xe5c9a3,extra:{metalness:0.25,roughness:0.31,clearcoat:0.22}}));
    r.position.y = y;
    root.add(r);
    parts.ribbons.push(r);

    const sh = new THREE.Mesh(ribbonGeo, rim(0xa8ecff, { power: 3.6, strength: 0.35 }));
    sh.position.y = y;
    sh.scale.set(1.02, 1.10, 1.004);
    root.add(sh);

    // 端部垫块：让硅带"长"在源漏上
    for (const dir of [-1, 1]) {
      const b = new THREE.Mesh(rbox(RIBBON_W + 0.05, RIBBON_T + 0.06, 0.5, 0.04, 2), channel({ color: 0xdcc7a4, metalness: 0.4 }));
      b.position.set(0, y, dir * (RIBBON_L / 2 - 0.2));
      root.add(b);
    }
  }

  /* ---- 栅极：一个挖了四条缝的块，沿 Z 拉伸 --------------------------- */
  const gateOuterW = RIBBON_W + 0.66;
  const gateOuterH = stackTop - stackBottom + 0.66;
  const outer = roundedRectShape(gateOuterW, gateOuterH, 0.22);
  for (let i = 0; i < n; i++) {
    // 洞的位置以 shape 中心为原点
    const hy = (stackBottom + i * pitchY) - cy;
    const hole = roundedRectPath(RIBBON_W + 0.22, RIBBON_T + 0.22, (RIBBON_T + 0.22) * 0.5);
    // Path 不能直接平移：重建时把顶点挪过去
    const pts = hole.getPoints(12).map((p) => new THREE.Vector2(p.x, p.y + hy));
    const hole2 = new THREE.Path(pts);
    outer.holes.push(hole2);
  }
  const gateGeo = extrude(outer, gateLen, { bevel: 0.012, bevelSegments: 2, curveSegments: 6 });
  const gate = new THREE.Group();
  const gBody = new THREE.Mesh(gateGeo,cutawayGate(0xbadae7,0.16));
  gBody.position.y = cy;
  gate.add(gBody);

  const gShell = new THREE.Mesh(gateGeo, rim(0x8ce9ff, { power: 2.6, strength: 0.42 }));
  gShell.position.y = cy;
  gShell.scale.set(1.008, 1.008, 1.02);
  gate.add(gShell);
  const section = new THREE.Mesh(gateGeo,gateSection());
  section.scale.z=0.115;
  section.position.set(0,cy,-gateLen*0.421);
  gate.add(section);
  const crown=new THREE.Mesh(cutBlock(gateOuterW-0.20,0.055,gateLen*0.28,0.040,0.014),surfaceMetal(0xa8bebd,0.33));
  crown.position.set(0,cy+gateOuterH/2-0.024,-gateLen*0.331);
  gate.add(crown);

  root.add(gate);
  parts.gate = gate;
  parts.gateBody = gBody;

  /* ---- 栅介质：每条硅带外面一层发光的管 ----------------------------- */
  const contactGeo = extrude(
    (() => {
      const s = roundedRectShape(RIBBON_W + 0.20, RIBBON_T + 0.20, (RIBBON_T + 0.20) * 0.5);
      s.holes.push(roundedRectPath(RIBBON_W + 0.02, RIBBON_T + 0.02, (RIBBON_T + 0.02) * 0.5));
      return s;
    })(),
    gateLen + 0.02,
    { bevel: 0.004, bevelSegments: 1 }
  );

  for (let i = 0; i < n; i++) {
    const y = stackBottom + i * pitchY;
    const mat = energyFlow({ color: 0x9df4ff, density: 3.4, speed: 1.05, opacity: 0.0, rimOnly: 0.10, axis: [0, 0, 1] });
    const m = new THREE.Mesh(contactGeo, mat);
    m.position.y = y;
    m.renderOrder = 2;
    root.add(m);
    parts.contactShells.push(m);
    parts.particles.push(null);
  }

  /* ---- 源 / 漏：把四条带子收进两块外延 --------------------------------- */
  const sdZ = RIBBON_L / 2 - 0.5;
  for (const dir of [-1, 1]) {
    const epi = new THREE.Mesh(
      cutBlock(RIBBON_W+0.35,stackTop-stackBottom+0.45,0.95,0.14,0.075,0.14),
      channel({color:0xd4bc97,extra:{metalness:0.24,roughness:0.42,clearcoat:0.16}})
    );
    epi.position.set(0, cy, dir * sdZ);
    root.add(epi);

    const cap = new THREE.Mesh(
      cutBlock(RIBBON_W+0.6,0.12,0.95,0.11,0.029),
      surfaceMetal(0xd2b489,0.29)
    );
    cap.position.set(0, cy + (stackTop - stackBottom + 0.45) / 2 + 0.05, dir * sdZ);
    root.add(cap);
    parts.terminals.push(epi, cap);
  }

  /* ---- 标签锚点 ----------------------------------------------------- */
  anchors.gate = anchor(gate, 0, cy + gateOuterH / 2, -gateLen*0.421, 'gate');
  anchors.ribbon = anchor(root, RIBBON_W / 2, stackBottom+(n-1)*pitchY, 1.5, 'ribbon');
  anchors.sd = anchor(root, 0, cy, sdZ + 0.475, 'sd');

  const fade = makeFade(root);

  return {
    root, parts, anchors, fade, kind: 'gaa',
    metrics: { cy, stackBottom, stackTop, gateLen, gateOuterW, gateOuterH, sdZ, RIBBON_W, RIBBON_T, RIBBON_L },
  };
}
