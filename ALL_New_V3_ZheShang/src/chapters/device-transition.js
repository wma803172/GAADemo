import * as THREE from 'three';
import { buildGAA } from '../models/gaa.js';
import { rbox } from '../models/geo.js';
import { anchor, makeFade } from '../models/common.js';
import { gateGlass } from '../scene/materials.js';
import { satinMetal } from '../models/specimen.js';
import { buildHeroInterconnect } from '../models/hero-interconnect.js';
import { lerp, srange } from '../core/util.js';

// Rows describe the same four persistent silicon meshes throughout the scroll:
// x, lower surface y, width, height. A zero width parks a spare lane below
// the isolation. The intermediate poses compare structures across generations.
const DORMANT = [0, 0.32, 0, 0];
const PLANAR = [[0, 0.30, 2.75, 0.12], DORMANT, DORMANT, DORMANT];
const ONE_FIN = [[0, 0.32, 0.41, 1.92], [0.72, 0.32, 0, 0], DORMANT, DORMANT];
const TWO_FINS = [[-0.65, 0.32, 0.34, 2.02], [0.65, 0.32, 0.34, 2.02],
  [-1.62, 0.32, 0, 0], [1.62, 0.32, 0, 0]];
const FOUR_FINS = [[-0.52, 0.32, 0.30, 2.02], [0.52, 0.32, 0.30, 2.02],
  [-1.56, 0.32, 0.30, 2.02], [1.56, 0.32, 0.30, 2.02]];
const THREE_FINS = [[-0.91, 0.32, 0.29, 2.18], [0.91, 0.32, 0.29, 2.18],
  [0, 0.32, 0.29, 2.18], [1.62, 0.32, 0, 0]];

function buildFinGate(root) {
  const group = new THREE.Group();
  root.add(group);
  const unit = rbox(1, 1, 1, 0.045, 1);
  const glass = gateGlass({ color: 0xb3d6dd, opacity: 0.26, extra: { side: THREE.FrontSide } });
  glass.userData.baseOpacity = glass.opacity;
  const oxide = new THREE.MeshStandardMaterial({
    color: 0x96cbc9, roughness: 0.6, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false,
  });
  oxide.userData.baseOpacity = oxide.opacity;
  const section = satinMetal(0xbbc6c4,0.28);
  const box = (material) => {
    const mesh = new THREE.Mesh(unit, material);
    group.add(mesh);
    return mesh;
  };
  const roof = box(glass);
  const roofEdge = box(section);
  const electrode = box(section);
  const pad = box(satinMetal(0xd1c8b0,0.32));
  const fingers = Array.from({ length: 4 }, () => ({
    topFilm: box(oxide),
    topGate: box(glass),
    bottomFilm: box(oxide),
    bottomGate: box(glass),
    sides: [-1, 1].map(sign => ({ sign, film: box(oxide), glass: box(glass), edge: box(section) })),
  }));
  const fade = makeFade(group);
  function place(mesh, x, y, z, w, h, d) {
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
  }
  function update(lanes, gateLen, fin, release, visibility) {
    fade(visibility);
    if (!group.visible) return;
    let left = Infinity, right = -Infinity, top = 0;
    for (let i = 0; i < lanes.length; i++) {
      const {x, bottom, width, height} = lanes[i];
      const f = fingers[i];
      const alive = height > 0.018 && width > 0.012;
      const upper = bottom + height;
      f.topFilm.visible = alive;
      f.topGate.visible = f.bottomFilm.visible = f.bottomGate.visible = alive && release > 0.01;
      if (alive) {
        left = Math.min(left, x - width / 2);
        right = Math.max(right, x + width / 2);
        top = Math.max(top, upper);
        place(f.topFilm, x, upper + 0.026, 0, width + 0.07, 0.052, gateLen + 0.016);
        if (f.bottomGate.visible) {
          place(f.topGate, x, upper + 0.095, 0, width + 0.23, 0.095 * release, gateLen);
          place(f.bottomFilm, x, bottom - 0.026, 0, width + 0.07, 0.052 * release, gateLen + 0.016);
          place(f.bottomGate, x, bottom - 0.095, 0, width + 0.23, 0.095 * release, gateLen);
        }
      }
      for (const side of f.sides) {
        const active = alive && fin > 0.004;
        side.glass.visible = side.film.visible = side.edge.visible = active;
        if (!active) continue;
        const h = Math.max(0.012, (upper - Math.max(bottom, 0.36)) * fin);
        const y = upper - h / 2;
        place(side.film, x + side.sign * (width / 2 + 0.024), y, 0, 0.048, h, gateLen + 0.016);
        const sx = x + side.sign * (width / 2 + 0.115);
        place(side.glass, sx, y + 0.015, 0, 0.14, h + 0.06, gateLen);
        place(side.edge, sx, y + 0.015, -gateLen * 0.42, 0.14, h + 0.06, gateLen * 0.17);
      }
    }
    const w = Math.max(right - left + 0.50, 1.10);
    place(roof, (left + right) / 2, top + 0.161, 0, w, 0.215, gateLen);
    place(roofEdge, (left + right) / 2, top + 0.161, -gateLen * 0.35, w, 0.215, gateLen * 0.30);
    place(electrode,(left + right) / 2,top + 0.269,0,w - 0.17,0.08,gateLen * 0.78);
    place(pad,(left + right) / 2,top + 0.343,0, Math.min(w * 0.55,1.06),0.075,gateLen * 0.56);
  }
  return { update };
}

export function buildDeviceEvolution() {
  const device = buildGAA();
  const { root, parts, anchors, metrics: m } = device;
  const revealWiring = buildHeroInterconnect(device);
  const terminalHeight = m.stackTop - m.stackBottom + 0.45;
  const ribbons = Array.from({ length: 4 }, (_, i) =>
    [0, m.stackBottom + i * m.pitch - m.RIBBON_T / 2, m.RIBBON_W, m.RIBBON_T]);
  const finGate = buildFinGate(root);
  const fadeGate = makeFade(parts.gate);
  const lanes = parts.ribbons.map(() => ({ x: 0, bottom: 0, width: 0, height: 0 }));
  anchors.channel = anchor(root, 0, 0, 0, 'channel');
  anchors.fin = anchor(root, 0, 0, 0, 'fin');
  anchors.flow = anchor(root, 0, 0, 0, 'flow');
  anchors.oxide = anchor(root, 0, 0, 0, 'oxide');
  // Pose times are tied to V3's chapter boundaries. A stable endpoint pad at
  // each end of the z axis makes even the FinFET-to-GAA hand-off traceable.
  const poses = [
    [0, ribbons], [0.026, ribbons], [0.061, PLANAR], [0.181, PLANAR], [0.231, ONE_FIN], [0.276, ONE_FIN],
    [0.304, TWO_FINS], [0.321, TWO_FINS], [0.350, FOUR_FINS], [0.365, FOUR_FINS],
    [0.401, THREE_FINS], [0.432, THREE_FINS], [0.475, ribbons],
  ];
  let lastBaseFade = -1;

  function apply(p, time, gateOn = true) {
    const visibility = 1 - srange(p, 0.545, 0.559);
    root.visible = visibility > 0.003;
    if (!root.visible) return;
    if (lastBaseFade !== visibility) {
      device.fade(visibility);
      lastBaseFade = visibility;
    }
    let j = 1;
    while (j < poses.length - 1 && p > poses[j][0]) j++;
    const [start, a] = poses[j - 1];
    const [end, b] = poses[j];
    const t = srange(p, start, end);
    let highest = 0, span = 0;
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      lane.x = lerp(a[i][0], b[i][0], t);
      lane.bottom = lerp(a[i][1], b[i][1], t);
      lane.width = lerp(a[i][2], b[i][2], t);
      lane.height = lerp(a[i][3], b[i][3], t);
      const mesh = parts.ribbons[i];
      mesh.visible = lane.width > 0.012 && lane.height > 0.018;
      if (!mesh.visible) continue;
      mesh.scale.set(lane.width / m.RIBBON_W, lane.height / m.RIBBON_T, 1);
      mesh.position.set(lane.x, lane.bottom + lane.height / 2, 0);
      highest = Math.max(highest, lane.bottom + lane.height);
      span = Math.max(span, Math.abs(lane.x) * 2 + lane.width);
    }
    // Show the finished 18A switch first, then dissolve directly to a planar
    // section. The historical single-fin and multi-fin poses come later.
    const intro = 1 - srange(p, 0.026, 0.061);
    const portrait = 1 - srange(p,0.016,0.026);
    revealWiring(portrait);
    device.setGateCoverage(portrait);
    const wrap = Math.max(1 - srange(p,0.024,0.040), srange(p, 0.461, 0.477));
    const fin = srange(p, 0.181, 0.231);
    const shorten = srange(p, 0.132, 0.181) * (1 - fin);
    const gateLen = lerp(1.72 - 0.88 * shorten, m.gateLen, fin);
    finGate.update(lanes, gateLen, fin, srange(p, 0.438, 0.468), (1 - wrap) * visibility);
    fadeGate(wrap * visibility);

    // Only thickness and width change. Source and drain retain the same
    // centreline and longitudinal position from the first to the last frame.
    const terminalPose = Math.max(intro,wrap);
    const h = lerp(Math.max(highest - m.stiTop + 0.23, 0.27), terminalHeight, terminalPose);
    const centreY = lerp(m.stiTop + h / 2 - 0.09, m.cy, terminalPose);
    const widthScale = lerp((span + 0.62) / (m.RIBBON_W + 0.35), 1, terminalPose);
    for (const end of parts.terminals) {
      end.position.y = centreY;
      end.scale.set(widthScale, h / terminalHeight, 1);
    }
    const guide = lanes[0];
    const upper = guide.bottom + guide.height;
    anchors.gate.position.set(0, lerp(highest + 0.28, m.cy + m.gateOuterH / 2, wrap), 0);
    anchors.fin.position.set(guide.x, upper, 1.05);
    anchors.channel.position.set(guide.x + guide.width * 0.38, upper, 1.25);
    anchors.ribbon.position.set(m.RIBBON_W / 2, m.stackBottom + 3 * m.pitch, 1.02);
    anchors.flow.position.set(guide.x + guide.width * 0.27, upper, 0.18);
    anchors.oxide.position.set(guide.x + guide.width * 0.48, upper + 0.045, gateLen * 0.50);
    const field = shorten * (1 - srange(p, 0.178, 0.212));
    device.setDrainField(field);
    device.setConduction(Math.max(1 - srange(p,0.022,0.035),gateOn ? srange(p, 0.465, 0.479) : 0), time);
  }
  return { ...device, kind: 'device', apply };
}
