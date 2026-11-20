/* ---------------------------------------------------------------------------
   planar.js — 1960 平面晶体管
   参考 PPT 第 4 页：方正的硅块，上面两块 Source/Drain，一条半透明 Gate 横跨沟道。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox } from './geo.js';
import { silicon, channel, oxide, metal, gateGlass, rim, energyFlow } from '../scene/materials.js';
import { edgeGlow, anchor, makeFade } from './common.js';

export function buildPlanar() {
  const root = new THREE.Group();
  const parts = {};
  const anchors = {};

  /* ---- 底座 + 衬底 -------------------------------------------------- */
  const plinth = new THREE.Mesh(rbox(12.2, 0.55, 8.2, 0.10, 3), silicon({ color: 0x0b111a, roughness: 0.55 }));
  plinth.position.y = -1.42;
  root.add(plinth);

  const sub = new THREE.Mesh(rbox(11, 1.35, 7, 0.07, 3), silicon({ color: 0x223142 }));
  sub.position.y = -0.695;
  root.add(sub);
  parts.substrate = sub;

  // 场氧（SiO₂）：铺在硅表面的一层，只在硅块边缘露出一圈
  const fieldOx = new THREE.Mesh(
    rbox(11.04, 0.04, 7.04, 0.02, 2),
    oxide({ color: 0x0b1420, extra: { metalness: 0.04, roughness: 0.92, clearcoat: 0.0, envMapIntensity: 0.35 } })
  );
  fieldOx.position.y = -0.006;
  root.add(fieldOx);
  parts.fieldOxide = fieldOx;

  // 硅表面：只在边缘留一条极细的亮线
  const top = sub;

  /* ---- 源 / 漏 ------------------------------------------------------ */
  const sdGeo = rbox(3.6, 0.30, 3.9, 0.05, 2);
  // 源漏用"暖金"而不是纯金属：纯金属在蓝色环境里会反射成橄榄色，读起来很脏
  const sdMat = channel({
    color: 0xd8a049,
    extra: {
      metalness: 0.38, roughness: 0.62, clearcoat: 0.0, envMapIntensity: 0.40,
      emissive: new THREE.Color(0x5a3608), emissiveIntensity: 0.85,
    },
  });
  const sL = new THREE.Mesh(sdGeo, sdMat.clone());
  sL.position.set(-3.25, 0.16, 0);
  const sR = new THREE.Mesh(sdGeo, sdMat.clone());
  sR.position.set(3.25, 0.16, 0);
  root.add(sL, sR);
  parts.source = sL;
  parts.drain = sR;

  // 源漏上的接触条：三条细金属，暗示上面还要接线
  const barMat = metal(0x8d5f2c, { roughness: 0.5 });
  for (const m of [sL, sR]) {
    for (let k = -1; k <= 1; k++) {
      const bar = new THREE.Mesh(rbox(0.16, 0.07, 3.5, 0.02, 1), barMat);
      bar.position.set(k * 0.85, 0.17, 0);
      m.add(bar);
    }
  }


  /* ---- 沟道 -------------------------------------------------------- */
  const ch = new THREE.Mesh(rbox(3.0, 0.20, 3.9, 0.04, 2), channel({ color: 0x2a3c50 }));
  ch.position.y = 0.14;
  root.add(ch);
  parts.channel = ch;

  // 沟道里流动的载流子
  const flow = new THREE.Mesh(rbox(3.0, 0.21, 3.9, 0.03, 1), energyFlow({ color: 0x63e6ff, density: 2.2, speed: 0.9, opacity: 0.55 }));
  flow.position.y = 0.145;
  flow.visible = false;
  root.add(flow);
  parts.channelFlow = flow;

  /* ---- 栅氧化层 ---------------------------------------------------- */
  const gox = new THREE.Mesh(rbox(3.15, 0.045, 4.5, 0.02, 2), oxide({ color: 0x2a5d78 }));
  gox.position.y = 0.245;
  root.add(gox);
  parts.gateOxide = gox;

  /* ---- 栅极（半透明） ------------------------------------------------ */
  const gate = new THREE.Group();
  const gateBody = new THREE.Mesh(rbox(2.35, 0.62, 4.3, 0.05, 3), gateGlass({ color: 0xb2efff, opacity: 0.30 }));
  gateBody.position.y = 0.60;
  gate.add(gateBody);

  const gateShell = new THREE.Mesh(rbox(2.35, 0.62, 4.3, 0.05, 3), rim(0x7fe9ff, { power: 2.2, strength: 1.05 }));
  gateShell.position.y = 0.60;
  gateShell.scale.setScalar(1.012);
  gate.add(gateShell);

  // 栅极顶面的一道亮边，强调"它是一块金属"
  const cap = new THREE.Mesh(rbox(2.36, 0.03, 4.31, 0.02, 1), rim(0xbdf6ff, { power: 1.4, strength: 0.5, base: 0.06 }));
  cap.position.y = 0.915;
  gate.add(cap);

  // 栅极两侧的侧墙（spacer）：一层薄氧化物，把栅极和源漏隔开
  for (const sx of [-1, 1]) {
    const sp = new THREE.Mesh(
      rbox(0.16, 0.66, 4.34, 0.02, 1),
      oxide({ color: 0x1c3448, extra: { metalness: 0.12, roughness: 0.7, clearcoat: 0.0, envMapIntensity: 0.5 } })
    );
    sp.position.set(sx * (2.35 / 2 + 0.08), 0.60, 0);
    gate.add(sp);
  }

  root.add(gate);
  parts.gate = gate;
  parts.gateBody = gateBody;

  /* ---- 短沟道效应：受控区 与 失控区 --------------------------------------
     栅极正下方是栅极还管得住的范围（青）；栅极到漏极之间那一截，
     漏极的电场自己伸手进来控制（红）。栅长越短，红的那段越长。 */
  const gradTex = (inner, outer) => {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 4;
    const cx = cv.getContext('2d');
    const g = cx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, outer);
    g.addColorStop(0.5, inner);
    g.addColorStop(1, outer);
    cx.fillStyle = g;
    cx.fillRect(0, 0, 128, 4);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const mkZone = (tex) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 2.6),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.246;
    root.add(m);
    return m;
  };

  const ctrlZone = mkZone(gradTex('rgba(110,235,255,0.55)', 'rgba(110,235,255,0.06)'));
  const leakZone = mkZone(gradTex('rgba(255,120,90,0.75)', 'rgba(255,90,60,0.05)'));
  parts.ctrlZone = ctrlZone;
  parts.leakZone = leakZone;

  /* ---- 标签锚点 ----------------------------------------------------- */
  anchors.gate = anchor(gate, 0, 0.96, 0, 'gate');
  anchors.source = anchor(sL, 0, 0.42, 0, 'source');
  anchors.drain = anchor(sR, 0, 0.42, 0, 'drain');
  anchors.channel = anchor(ch, 0, 0.26, -1.6, 'channel');
  anchors.silicon = anchor(sub, -4.6, 0.2, 3.1, 'silicon');
  anchors.oxide = anchor(top, 3.6, 0.1, 3.1, 'oxide');

  const fade = makeFade(root);

  return {
    root, parts, anchors, fade,
    kind: 'planar',
  };
}
