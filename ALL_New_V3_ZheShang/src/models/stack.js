/* A cutaway of two adjacent devices. The overview and microscope use the same
   meshes and coordinates, including the landing points of all three nets. */
import * as THREE from 'three';
import { anchor, makeFade } from './common.js';
import { rbox } from './geo.js';
import { lerp, srange } from '../core/util.js';
import { NETS, DEVICE_X, VIA_X, conductor, setAlpha, buildDeviceDetail } from '../chapters/power-detail.js';

const WIDTH = 5.9;
const DEPTH = 5.25;
const BOX = rbox(1, 1, 1, 0.065, 1);
const POST = new THREE.CylinderGeometry(1, 1, 1, 12);
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const scale = new THREE.Vector3();
const rotation = new THREE.Quaternion();

function instances(group, geometry, rows, mat) {
  if (!rows.length) return;
  const mesh = new THREE.InstancedMesh(geometry, mat, rows.length);
  for (let i = 0; i < rows.length; i++) {
    const [x, y, z, w, h, d] = rows[i];
    mesh.setMatrixAt(i, matrix.compose(position.set(x, y, z), rotation, scale.set(w, h, d)));
  }
  mesh.computeBoundingSphere();
  group.add(mesh);
}

function flatTrack(start, end, width, thick) {
  return [(start.x + end.x) / 2, 0, (start.z + end.z) / 2,
    Math.abs(end.x - start.x) + width, thick, Math.abs(end.z - start.z) + width];
}

function interlevel(root, contacts, radius, material) {
  const group = new THREE.Group();
  instances(group, POST, contacts.map(p => [p.x, 0, p.z, radius, 1, radius]), material);
  root.add(group);
  return (y1, y2) => {
    group.position.y = (y1 + y2) / 2;
    group.scale.y = Math.max(0.001, Math.abs(y2 - y1));
  };
}

// One signal net is highlighted from the frontside network all the way to a
// gate. Other signal nets have distinct landing points and independent routes.
function buildSignals(root) {
  const layers = [];
  const frontY = [1.24, 1.74, 2.19, 2.70, 3.18, 3.69];
  const compactY = [1.05, 1.30, 1.56, 1.84, 2.16, 2.50];
  const tracks = [[
    { x: DEVICE_X, z: 0 }, { x: 2.29, z: 0 }, { x: 2.29, z: -1.67 },
    { x: -1.71, z: -1.67 }, { x: -1.71, z: 1.31 }, { x: 1.94, z: 1.31 },
    { x: 1.94, z: -2.43 },
  ]];
  const lanes = [
    -2.52, -2.30, -2.04, -1.87, -1.30, -1.11, -0.88, -0.62, -0.38, -0.18,
    0.20, 0.43, 0.65, 1.09, 1.77, 2.11, 2.50,
  ];
  for (let k = 0; k < lanes.length; k++) {
    const route = [{ x: k % 2 ? -2.74 : 2.74, z: lanes[k] }];
    for (let level = 0; level < frontY.length; level++) {
      const xAxis = level % 2 === 0;
      const below = route[level];
      const lane = lanes[(k * 2 + 3 * level + 1) % lanes.length];
      route.push(xAxis ? { x: lane, z: below.z } : { x: below.x, z: level === 5 ? (k % 2 ? 2.48 : -2.48) : lane });
    }
    tracks.push(route);
  }

  for (let level = 0; level < frontY.length; level++) {
    const layer = new THREE.Group();
    const backMat = conductor(0x609a9d, 0.28);
    const mainMat = conductor(NETS.signal, 0.64);
    const width = 0.06 + level * 0.012, thick = 0.064 + level * 0.008;
    instances(layer, BOX,
      tracks.slice(1).map(route => flatTrack(route[level], route[level + 1], width, thick)), backMat);
    instances(layer, BOX, [flatTrack(tracks[0][level], tracks[0][level + 1], width + 0.045, thick + 0.025)], mainMat);
    const backgroundDrops = tracks.slice(1).map(route => route[level + 1]);
    const fgDrop = tracks[0][level + 1];
    const drops = level + 1 === frontY.length ? [] : [
      interlevel(root, backgroundDrops, width * 0.51, backMat),
      interlevel(root, [fgDrop], (width + 0.04) * 0.54, mainMat),
    ];
    root.add(layer);
    layers.push({ layer, drops, backMat, mainMat });
  }
  return {
    layers, tracks,
    update(split, assemble, detail, fade) {
      layers.forEach(({ layer, backMat, mainMat }, i) => {
        layer.position.y = lerp(frontY[i], 1.18 + i * 0.47, split);
        layer.position.y = lerp(layer.position.y, compactY[i], assemble);
        setAlpha(backMat, fade * (1 - 0.98 * detail));
        setAlpha(mainMat, fade * (1 - (i === 0 ? 0 : 0.97) * detail));
      });
      layers.forEach(({ layer, drops }, i) => {
        for (const place of drops) place(layer.position.y, layers[i + 1].layer.position.y);
      });
    },
  };
}

// Six illustrated backside levels, paired VDD/VSS tracks on every level. The
// sparse outer levels are wider. Vias only connect crossings of the same net.
const POWER_LEVELS = [
  { pick: VIA_X, other: [0.35, 0.87, 2.31], width: 0.115 },
  { pick: 1.32, other: [0.28, 0.77, 2.21], width: 0.135 },
  { pick: -0.72, other: [1.49, 2.37], width: 0.17 },
  { pick: -0.78, other: [1.43, 2.16], width: 0.20 },
  { pick: 1.76, other: [0.53], width: 0.26 },
  { pick: 1.70, other: [0.43], width: 0.31 },
];

function buildPower(root, locals) {
  const layers = POWER_LEVELS.map((config, level) => {
    const alongZ = level % 2 === 0;
    const layer = new THREE.Group();
    const lines = [config.pick, ...config.other].flatMap((p, i) => {
      const vdd = i % 2 ? -p : p;
      return [{ at: vdd, net: 'vdd', featured: i === 0 }, { at: -vdd, net: 'vss', featured: i === 0 }];
    });
    const mats = {};
    for (const net of ['vdd', 'vss']) {
      for (const featured of [true, false]) {
        const key = net + (featured ? 'Focus' : '');
        const color = featured ? NETS[net] : net === 'vdd' ? 0xaa7554 : 0x516b96;
        mats[key] = conductor(color, featured ? 0.49 : 0.32);
        const h = 0.075 + level * 0.015;
        const rows = lines.filter(l => l.net === net && l.featured === featured).map(l =>
          alongZ ? [l.at, 0, 0, config.width, h, DEPTH] : [0, 0, l.at, WIDTH, h, config.width]);
        instances(layer, BOX, rows, mats[key]);
      }
    }
    const contactRails = [];
    if (level === 0) {
      ['vss', 'vdd'].forEach((net, index) => {
        const { landing } = locals[index];
        const side = net === 'vdd' ? 1 : -1;
        const mat = conductor(NETS[net], 0.46);
        const crossing = { x: landing.x, z: side * POWER_LEVELS[1].pick };
        // In the cutaway, keep the actual segment between the next metal
        // junction and its nano-via; the full-width bus recedes behind it.
        const row = flatTrack(crossing, landing, config.width + 0.006, 0.083);
        instances(layer, BOX, [row], mat);
        contactRails.push(mat);
      });
    }
    root.add(layer);
    return { layer, alongZ, lines, mats, contactRails, drops: [] };
  });

  for (let i = 0; i + 1 < layers.length; i++) {
    const below = layers[i], above = layers[i + 1];
    for (const net of ['vdd', 'vss']) {
      const focused = [], secondary = [];
      const current = below.lines.filter(l => l.net === net);
      const next = above.lines.filter(l => l.net === net);
      current.forEach((line, j) => {
        next.forEach((other, k) => {
          const point = below.alongZ ? { x: line.at, z: other.at } : { x: other.at, z: line.at };
          if (line.featured && other.featured) focused.push(point);
          else if ((j + k + i) % 2 === 0 || j === k) secondary.push(point);
        });
      });
      below.drops.push(interlevel(root, secondary, 0.054 + 0.005 * i, below.mats[net]));
      below.drops.push(interlevel(root, focused, 0.075 + 0.007 * i, below.mats[net + 'Focus']));
    }
  }

  return {
    layers,
    update(split, assemble, detail, fade) {
      // Cross-dissolve the two wiring layouts. No conductor travels through
      // the active silicon during the comparison.
      const front = 1 - srange(split, 0.05, 0.48);
      const back = srange(split, 0.48, 0.96);
      const opacity = front + back;
      layers.forEach(({ layer, mats, contactRails }, i) => {
        const frontY = 4.11 + i * 0.385 + split * 0.16;
        const backY = lerp(-0.75 - i * 0.48, -0.57 - i * 0.265, assemble);
        layer.position.y = split < 0.48 ? frontY : backY;
        for (const net of ['vdd', 'vss']) {
          setAlpha(mats[net], fade * opacity * (1 - 0.98 * detail));
          setAlpha(mats[net + 'Focus'], fade * opacity * (1 - (i === 0 ? 0.85 : 0.96) * detail));
        }
        contactRails.forEach(mat => setAlpha(mat, fade * opacity * detail));
      });
      layers.forEach(({ layer, drops }, i) => {
        for (const place of drops) place(layer.position.y, layers[i + 1].layer.position.y);
      });
      return { front, back, frontY: 4.11 + split * 0.16, backY: lerp(-0.75, -0.57, assemble) };
    },
  };
}

// Each marker follows the selected metal and its junctions by arc length. The
// marker denotes a route; no signal current is animated through the insulated gate.
function powerMarkers(root, net, local) {
  const side = net === 'vdd' ? 1 : -1;
  const path = [];
  for (let level = POWER_LEVELS.length - 1; level >= 0; level--) {
    const end = side * POWER_LEVELS[level].pick;
    const prev = level > 0 ? side * POWER_LEVELS[level - 1].pick : local.landing.z;
    const next = level < POWER_LEVELS.length - 1 ? side * POWER_LEVELS[level + 1].pick : -side * WIDTH * 0.5;
    for (const cross of [next, prev]) {
      const point = level % 2 === 0 ? new THREE.Vector3(end, 0, cross) : new THREE.Vector3(cross, 0, end);
      path.push({ point, level });
    }
  }
  path.push({ point: local.landing }, { point: local.cap });
  const lengths = new Array(path.length - 1);
  const markerMat = new THREE.MeshBasicMaterial({ color: net === 'vdd' ? 0xffdea0 : 0xaabeff });
  markerMat.toneMapped = false;
  const sphere = new THREE.SphereGeometry(0.073, 12, 8);
  const markers = [0, 1, 2].map(() => {
    const mesh = new THREE.Mesh(sphere, markerMat);
    root.add(mesh);
    return mesh;
  });
  return (layers, time, detail, opacity) => {
    for (const pt of path) if (pt.level !== undefined) pt.point.y = layers[pt.level].layer.position.y;
    let total = 0, hiddenLength = 0;
    for (let i = 0; i < path.length - 1; i++) {
      lengths[i] = path[i].point.distanceTo(path[i + 1].point);
      total += lengths[i];
      if (i < path.length - 3) hiddenLength += lengths[i];
    }
    const head = hiddenLength * detail;
    markers.forEach((dot, k) => {
      dot.visible = opacity > 0.12;
      if (!dot.visible) return;
      const phase = (time * 0.115 + k / markers.length) % 1;
      let distance = lerp(head, total, net === 'vss' ? 1 - phase : phase);
      let i = 0;
      while (i < path.length - 2 && distance > lengths[i]) distance -= lengths[i++];
      dot.position.lerpVectors(path[i].point, path[i + 1].point, distance / (lengths[i] || 1));
      // Place the glint at the visible skin of the conductor.
      dot.position.x += 0.045;
      dot.position.y += 0.054;
      dot.scale.setScalar(1 - detail * 0.27);
    });
    setAlpha(markerMat, opacity);
  };
}

export function buildStack() {
  const root = new THREE.Group();
  const detailDevice = buildDeviceDetail(root);
  const signals = buildSignals(root);
  const power = buildPower(root, detailDevice.locals);
  const markers = [
    powerMarkers(root, 'vss', detailDevice.locals[0]),
    powerMarkers(root, 'vdd', detailDevice.locals[1]),
  ];
  const substrateMat = new THREE.MeshStandardMaterial({
    color: 0x426b7a, emissive: 0x142d34, emissiveIntensity: 0.65, opacity: 0.32,
    transparent: true, depthWrite: false, roughness: 0.46, metalness: 0.18,
  });
  const substrate = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.08, 0.20, DEPTH + 0.08), substrateMat);
  substrate.position.y = -0.18;
  root.add(substrate);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xa3d8dc, transparent: true, opacity: 0.46 });
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(substrate.geometry), edgeMat);
  substrate.add(frame);

  const anchors = { ...detailDevice.anchors,
    rail: anchor(power.layers[4].layer, POWER_LEVELS[4].pick, 0, 1.2, 'rail'),
    returnRail: anchor(power.layers[0].layer, -VIA_X, 0, 1.8, 'returnRail'),
    signals: anchor(signals.layers[4].layer, 1.36, 0, 1.31, 'signals'),
  };
  let visibility = 1;
  root.traverse(obj => {
    const m = obj.material;
    if (m && m.userData.baseOpacity === undefined) {
      m.userData.baseOpacity = m.uniforms?.uOpacity?.value ?? m.opacity;
    }
  });
  const globalFade = makeFade(root);
  function fade(value) {
    if (value !== visibility || !root.visible) globalFade(value);
    visibility = value;
  }
  function apply({ split = 0, assemble = 0, detail = 0, time = 0 } = {}) {
    signals.update(split, assemble, detail, visibility);
    const { front, back, frontY, backY } = power.update(split, assemble, detail, visibility);
    detailDevice.update(frontY, backY, signals.layers[0].layer.position.y, front, back, visibility);
    markers.forEach(update => update(power.layers, time, detail, back * visibility));
    substrateMat.opacity = visibility * (0.32 - detail * 0.24);
    edgeMat.opacity = visibility * (0.46 - detail * 0.42);
  }
  apply();
  return { root, parts: { substrate }, anchors, fade, apply, kind: 'stack' };
}
