/* ---------------------------------------------------------------------------
   macro.js — 从一颗芯片到一台电脑
   PPT 第 13 页要一条"一路拉远"的镜头。为了不用天文数字的坐标，
   这里用了非等比例的做法：每一个尺度都是独立的物体，靠缩放与淡入淡出接起来。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { rbox, roundedRectShape, extrude } from './geo.js';
import { metal } from '../scene/materials.js';
import { makeFade } from './common.js';
import { rand } from '../core/util.js';

/* ---------------------------------------------------------------- textures */

let diePattern;
function dieTexture() {
  if (diePattern) return diePattern;
  const cv = document.createElement('canvas');
  cv.width = 1024; cv.height = 824;
  const c = cv.getContext('2d');
  c.fillStyle = '#31393f';
  c.fillRect(0, 0, cv.width, cv.height);

  // Dense memory mats, mixed-size logic islands and perimeter pad banks form
  // a representative die surface rather than a specific product floorplan.
  const colors = ['#a7a3b0','#77778e','#7b9398','#a99081','#698987','#a59d8c'];
  function memory(x,y,w,h,seed) {
    c.fillStyle = '#4d5864';
    c.fillRect(x,y,w,h);
    const cols = 4, rows = 4, cw = w/cols, rh = h/rows;
    for (let row=0; row<rows; row++) for (let col=0; col<cols; col++) {
      const dx=x+col*cw+1, dy=y+row*rh+1;
      c.fillStyle = colors[(seed+row+col)%colors.length];
      c.fillRect(dx,dy,cw-2,rh-3);
      c.fillStyle = 'rgba(28,38,45,.57)';
      for(let v=2;v<rh-3;v+=3.5) c.fillRect(dx+1,dy+v,cw-4,1.1);
    }
  }
  function logic(x,y,w,h,seed) {
    c.fillStyle = '#3e494f';
    c.fillRect(x,y,w,h);
    for(let row=0;row<Math.floor(h/5);row++) {
      let dx=x+1, i=0;
      while(dx<x+w-2) {
        const value=rand(++i*2.1+row*301+seed);
        const length=Math.min(2+value*14,x+w-2-dx);
        c.fillStyle=colors[Math.floor(value*colors.length)];
        c.fillRect(dx,y+row*5+1,length,3.1);
        dx+=length+1.6;
      }
    }
  }
  for (let row=0;row<3;row++) for(let col=0;col<4;col++) {
    const x=36+col*170,y=34+row*242,seed=17+col*13+row*61;
    c.fillStyle='#69727a';c.fillRect(x,y,162,231);
    c.fillStyle='#363f47';c.fillRect(x+2,y+2,158,227);
    memory(x+5,y+5,151,62,seed);
    logic(x+5,y+73,95,105,seed);
    memory(x+106,y+73,49,104,seed+1);
    logic(x+5,y+184,151,39,seed+74);
  }
  for(let row=0;row<6;row++) {
    const y=35+row*122;
    memory(727,y,133,113,41+row);
    logic(871,y,114,113,317+row);
  }
  memory(38,772,248,22,2);
  logic(297,772,380,22,11);
  memory(689,772,294,22,24);
  c.lineWidth=1;
  for (let i=0;i<5;i++) {
    c.strokeStyle=i%2 ? '#989d9c' : '#455b59';
    c.strokeRect(8+i*3,8+i*3,1008-i*6,808-i*6);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  diePattern = tex;
  return tex;
}

function solid(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function batch(parent, geometry, material, poses) {
  const group = new THREE.InstancedMesh(geometry, material, poses.length);
  const transform = new THREE.Object3D();
  poses.forEach(([x, y, z, sx = 1, sy = 1, sz = 1], i) => {
    transform.position.set(x, y, z);
    transform.scale.set(sx, sy, sz);
    transform.updateMatrix();
    group.setMatrixAt(i, transform.matrix);
  });
  group.instanceMatrix.needsUpdate = true;
  parent.add(group);
  return group;
}

// Apertures are part of the machined top surface. The key tray and
// trackpad sit at their own heights inside these openings.
function chassisPlate(parent, width, depth, height, radius, y, mat, holes = []) {
  const outline = roundedRectShape(width, depth, radius);
  for (const [w, d, x, z, r] of holes) {
    const points = roundedRectShape(w, d, r).getPoints(8).map(
      p => new THREE.Vector2(p.x + x, p.y - z)
    );
    outline.holes.push(new THREE.Path(points));
  }
  const part = solid(parent, extrude(outline, height, { bevel: 0.006 }), mat, 0, y, 0);
  part.rotation.x = -Math.PI / 2;
  return part;
}

/* ------------------------------------------------------------------ chips */

export function buildDie({ mounted = false } = {}) {
  const root = new THREE.Group();
  const slice = new THREE.Group();
  if (!mounted) slice.rotation.set(0.20, -0.16, 0);
  root.add(slice);
  const base = solid(slice, rbox(5.4, 0.14, 4.4, 0.025, 2),
    new THREE.MeshPhysicalMaterial({color: 0x59606b, metalness: 0.70, roughness: 0.29}));
  const top = solid(slice, new THREE.PlaneGeometry(5.35,4.35),
    new THREE.MeshPhysicalMaterial({
      map: dieTexture(), roughness: 0.42, metalness: 0.39, clearcoat: 0.23,
      emissiveMap: dieTexture(), emissive: 0xbdb5a7, emissiveIntensity: 0.28,
    }),0,0.071,0);
  top.rotation.x = -Math.PI/2;
  return {root,parts:{base,top}, fade:makeFade(root),kind:'die'};
}

export function buildPackage() {
  const root = new THREE.Group();
  const assembly = new THREE.Group();
  assembly.rotation.set(0.16,-0.15,0);
  root.add(assembly);
  const substr = solid(assembly,rbox(7.6,0.24,6.6,0.06,2),
    new THREE.MeshStandardMaterial({color:0x274c47,roughness:0.53,metalness:0.25}),0,-0.16,0);
  const die = buildDie({mounted:true});
  die.root.scale.setScalar(1.09);
  die.root.position.y = 0.045;
  assembly.add(die.root);
  const pads = [], caps = [], capEnds = [];
  // Capacitors are mounted in rows close to the die. Each ceramic body has
  // a solderable termination at either end.
  for (const side of [-1,1]) {
    for (let i=0;i<18;i++) {
      const x=(i-8.5)*0.326;
      pads.push([x,-0.034,side*3.10]);
      if(i%6 === 0) continue;
      const z=side*2.70;
      caps.push([x,0.021,z]);
      for(const end of [-1,1]) capEnds.push([x,0.021,z+end*0.081]);
    }
    for(let i=0;i<15;i++) pads.push([side*3.60,-0.034,(i-7)*0.376,0.52,1,0.72]);
  }
  const ceramic = new THREE.MeshStandardMaterial({color:0x9f805d,roughness:0.55,metalness:0.15});
  batch(assembly,rbox(0.20,0.014,0.095,0.006,1),metal(0xc3a477,{roughness:0.32}),pads);
  batch(assembly,rbox(0.115,0.11,0.13,0.012,1),ceramic,caps);
  batch(assembly,rbox(0.118,0.112,0.042,0.012,1),metal(0xa7a9a5,{roughness:0.34}),capEnds);
  return {root,parts:{substr,die:die.root},fade:makeFade(root),kind:'package'};
}

export function buildServer() {
  const root = new THREE.Group();
  const board = new THREE.Group();
  board.rotation.set(0.19, -0.12, 0);
  root.add(board);

  const mask = new THREE.MeshStandardMaterial({ color: 0x21463d, metalness: 0.25, roughness: 0.52 });
  const frame = metal(0xa0a9ae, { roughness: 0.36 });
  const polymer = new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.70 });
  const padMat = metal(0xc39257, { roughness: 0.35 });
  const boardShape = roundedRectShape(11, 7.6, 0.18);
  const screwLocations = [[-5.10, -3.40], [5.10, -3.40], [-5.10, 3.40], [5.10, 3.40]];
  for (const [x, z] of screwLocations) {
    const hole = new THREE.Path();
    hole.absarc(x, -z, 0.103, 0, Math.PI * 2, true);
    boardShape.holes.push(hole);
    const rim = solid(board, new THREE.RingGeometry(0.105, 0.185, 24), padMat, x, 0.066, z);
    rim.rotation.x = -Math.PI / 2;
  }
  const pcb = solid(board, extrude(boardShape, 0.12, { bevel: 0 }), mask);
  pcb.rotation.x = -Math.PI / 2;

  // Keep each fin in the coordinate frame of its own base. The whole
  // socket assembly receives the offset on the PCB exactly once.
  solid(board, rbox(4.4, 0.16, 4.35, 0.05, 2), polymer, -1.6, 0.14, 0.2);
  solid(board, rbox(4.15, 0.10, 4.10, 0.035, 2), frame, -1.6, 0.235, 0.2);
  const sink = new THREE.Group();
  sink.position.set(-1.6, 0.31, 0.2);
  board.add(sink);
  solid(sink, rbox(3.6, 0.14, 3.6, 0.04, 2), metal(0xbb8d63, { roughness: 0.31 }));
  const fins = Array.from({length: 22}, (_, i) => [(i / 21 - 0.5) * 3.32, 0.55, 0]);
  batch(sink, rbox(0.068, 0.98, 3.43, 0.017, 1), metal(0xbec4cc, { roughness: 0.30 }), fins);
  const screws = [];
  for (const x of [-1.92, 1.92]) for (const z of [-1.87, 1.87]) screws.push([x, 0.043, z]);
  batch(sink, new THREE.CylinderGeometry(0.115, 0.115, 0.075, 12), frame, screws);

  const slots = [], sticks = [], chips = [], latches = [], chokes = [], capacitors = [];
  for (let i = 0; i < 4; i++) {
    const x = 2.34 + i * 0.62;
    slots.push([x, 0.16, 0.16]);
    sticks.push([x, 0.53, 0.16]);
    for (const side of [-1, 1]) {
      latches.push([x, 0.28, 0.16 + side * 2.56]);
      for (let k = 0; k < 8; k++) chips.push([x + side * 0.115, 0.56, -1.88 + k * 0.58]);
    }
  }
  batch(board, rbox(0.34, 0.21, 5.35, 0.04, 1), polymer, slots);
  batch(board, rbox(0.14, 0.55, 4.92, 0.03, 1), mask, sticks);
  batch(board, rbox(0.085, 0.31, 0.42, 0.018, 1), polymer, chips);
  batch(board, rbox(0.36, 0.22, 0.19, 0.025, 1), frame, latches);
  for (let i = 0; i < 9; i++) {
    chokes.push([-3.84 + i * 0.47, 0.22, -2.52]);
    capacitors.push([-3.84 + i * 0.47, 0.21, -3.06]);
  }
  batch(board, rbox(0.37, 0.29, 0.43, 0.03, 1), polymer, chokes);
  batch(board, new THREE.CylinderGeometry(0.145, 0.15, 0.29, 16), frame, capacitors);

  // A fan-out on the unobstructed strip between the CPU and memory sockets.
  const traces = [];
  for (let i = 0; i < 30; i++) {
    const z = -1.76 + i * 0.12;
    const x = 0.90 + (i % 6) * 0.11;
    const lane = [[0.58, z], [x, z], [x + 0.29, z + 0.29], [2.2, z + 0.29]];
    for (let j = 0; j < lane.length - 1; j++) {
      traces.push(lane[j][0], 0.066, lane[j][1], lane[j+1][0], 0.066, lane[j+1][1]);
    }
  }
  const traceGeometry = new THREE.BufferGeometry();
  traceGeometry.setAttribute('position',new THREE.Float32BufferAttribute(traces, 3));
  board.add(new THREE.LineSegments(traceGeometry, new THREE.LineBasicMaterial({color: 0x45736a})));
  return { root, parts: { sink, board }, fade: makeFade(root), kind: 'server' };
}

function fitKeyboard(deck, keyMat, grilleMat) {
  const single = count => Array(count).fill(1);
  const rows = [
    [1.3, ...single(12), 1.25],
    [...single(13), 1.8],
    [1.55, ...single(12), 1.25],
    [1.8, ...single(11), 2.15],
    [2.35, ...single(10), 2.6],
    [1.15, 1.1, 1.2, 1.5, 5.4, 1.5, 1.1, 1, 1, 1],
  ];
  const keys = [], homingBars = [], perforations = [];
  rows.forEach((row, r) => {
    const step = 6.36 / row.reduce((a,b) => a + b, 0);
    let x = -3.18;
    const z = -1.57 + r * 0.355;
    row.forEach((units, c) => {
      const w = units * step;
      keys.push([x+w/2, 0.234, z, w-0.045, 1, r === 0 ? 0.27 : 0.30]);
      if (r === 3 && (c === 4 || c === 7)) homingBars.push([x+w/2, 0.271, z+0.085]);
      x += w;
    });
  });
  const keyGeometry = rbox(1, 0.072, 1, 0.032, 2);
  const keycaps = batch(deck, keyGeometry, keyMat, keys);
  batch(deck, rbox(0.14, 0.011, 0.029, 0.004, 1), grilleMat, homingBars);
  for (const side of [-1,1]) {
    for (let r = 0; r < 27; r++) {
      for (let c = 0; c < 4; c++) perforations.push([side*(3.47+c*0.062),0.223,-1.61+r*0.074]);
    }
  }
  batch(deck, new THREE.CylinderGeometry(0.017, 0.017, 0.002, 6), grilleMat, perforations);
  return keycaps;
}

export function buildLaptop() {
  const root = new THREE.Group();
  const assembly = new THREE.Group();
  assembly.rotation.set(0.16, -0.18, 0);
  root.add(assembly);
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0xa2a6aa, metalness: 0.78, roughness: 0.33, clearcoat: 0.18, clearcoatRoughness: 0.35,
  });
  const seam = new THREE.MeshStandardMaterial({color: 0x151b20, metalness: 0.2, roughness: 0.62});
  const keyMat = new THREE.MeshStandardMaterial({color: 0x30343a, metalness: 0.18, roughness: 0.48});
  const inner = new THREE.MeshStandardMaterial({color: 0x191b20, roughness: 0.46, metalness: 0.2});

  const base = chassisPlate(assembly, 7.80, 5.16, 0.135, 0.22, 0.08, shellMat);
  chassisPlate(assembly, 7.76, 5.12, 0.018, 0.21, 0.152, seam);
  const deck = chassisPlate(assembly, 7.80, 5.16, 0.051, 0.22, 0.188, shellMat, [
    [6.63, 2.22, 0, -0.68, 0.12], [2.70, 1.45, 0, 1.44, 0.095],
  ]);
  const keybed = chassisPlate(assembly, 6.62, 2.21, 0.026, 0.12, 0.171, seam);
  keybed.position.z = -0.68;
  const trackpad = chassisPlate(assembly, 2.65, 1.4, 0.042, 0.084, 0.187,
    new THREE.MeshStandardMaterial({color: 0x93989e, metalness: 0.52, roughness: 0.44}));
  trackpad.position.z = 1.44;
  const keycaps = fitKeyboard(assembly, keyMat, seam);

  const hingeMat = metal(0x82898d, {roughness: 0.30});
  const barrel = new THREE.CylinderGeometry(0.105, 0.105, 1.24, 24);
  const bearing = new THREE.CylinderGeometry(0.11, 0.11, 0.10, 24);
  for (const x of [-2.54,2.54]) {
    solid(assembly, barrel, hingeMat, x, 0.256, -2.32).rotation.z = Math.PI / 2;
    for (const dx of [-0.68,0.68]) solid(assembly, bearing, inner, x+dx, 0.256, -2.32).rotation.z = Math.PI / 2;
  }
  const lid = new THREE.Group();
  lid.position.set(0, 0.256, -2.32);
  lid.rotation.x = -0.23;
  assembly.add(lid);
  solid(lid, extrude(roundedRectShape(7.80,4.65,0.18), 0.095, {bevel:0.014}), shellMat, 0, 2.35, 0);
  solid(lid, extrude(roundedRectShape(7.73,4.58,0.15), 0.034, {bevel:0.006}), inner, 0, 2.35, 0.061);
  const wallpaper = new THREE.TextureLoader().load(new URL('../../assets/deep-field.webp', import.meta.url).href);
  wallpaper.colorSpace = THREE.SRGBColorSpace;
  const displayMat = new THREE.MeshBasicMaterial({map: wallpaper});
  displayMat.color.setScalar(2.8);
  const screen = solid(lid, new THREE.PlaneGeometry(7.39,4.16), displayMat, 0, 2.36, 0.086);
  solid(lid, new THREE.CircleGeometry(0.044, 16), seam, 0,4.531,0.088);
  solid(lid, new THREE.CircleGeometry(0.019, 12), metal(0x283f59, {roughness:0.21}), 0,4.531,0.090);

  return {root, parts: {base, deck, keycaps, trackpad, lid, screen}, fade: makeFade(root), kind: 'laptop'};
}
