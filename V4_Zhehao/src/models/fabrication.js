import * as THREE from 'three';
import { anchor } from './common.js';
import { channel, metal, oxide, silicon } from '../scene/materials.js';
import { clamp, lerp, srange } from '../core/util.js';

// Dimensions are enlarged for teaching. +Z is the source, +Y is up.
const X = 3.40, Z = 3.10;
const FIN = 0.94, GATE = 0.88, ENDS = 1.24;
const SI_T = 0.18, PITCH = 0.49;
const LEVELS = [0.43, 0.92, 1.41, 1.90];
const STACK_TOP = LEVELS[3] + SI_T / 2;
const ROOF = 2.48;
const CELL_FLOOR = LEVELS[0] - SI_T / 2 - (PITCH - SI_T);

// A left half-profile, traversed from bottom centre around its rim to top
// centre. Mirror for a whole profile; retain the half for a capped X section.
function roundedHalf(w, h, r, y = 0, topRadius = r) {
  const x = -w / 2, b = y - h / 2, t = y + h / 2;
  const points = [new THREE.Vector2(0, b)];
  const arc = (cx, cy, radius, a, z) => {
    for (let i = 0; i <= 5; i++) {
      const angle = lerp(a, z, i / 5);
      points.push(new THREE.Vector2(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)));
    }
  };
  arc(x + r, b + r, r, -Math.PI / 2, -Math.PI);
  arc(x + topRadius, t - topRadius, topRadius, Math.PI, Math.PI / 2);
  points.push(new THREE.Vector2(0, t));
  return points;
}

function mirror(left) {
  return left.concat(left.slice(1, -1).reverse().map(v => new THREE.Vector2(-v.x, v.y)));
}

// Build a pair of solids, both with physical end faces. The left half includes
// the exposed cross-section through the gate and its four dielectric liners.
function profiles(outline, holes = []) {
  const whole = new THREE.Shape(mirror(outline));
  whole.holes = holes.map(path => new THREE.Path(mirror(path).reverse()));
  const left = outline.slice();
  for (const hole of holes.slice().reverse()) left.push(...hole.slice().reverse());
  const solid = shape => {
    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 1, steps: 1, bevelEnabled: false, curveSegments: 3,
    });
    geom.translate(0, 0, -0.5);
    return geom;
  };
  return [solid(whole), solid(new THREE.Shape(left))];
}

// The inner contour stays bonded to its underlying material. Morph only the
// outer wall, preserving its four-sided coverage and producing real cut faces.
function growingSleeve(outerLeft, innerLeft) {
  function geometry(outer, inner, half) {
    const position = [], collapseX = [], collapseY = [];
    function vertex(index, exterior, z) {
      const p = exterior ? outer[index] : inner[index];
      return [p.x, p.y, z, inner[index].x - p.x, inner[index].y - p.y];
    }
    function face(a,b,c,d) {
      for (const v of [a,b,c,a,c,d]) {
        position.push(v[0],v[1],v[2]);
        collapseX.push(v[3],0,0);
        collapseY.push(0,v[4],0);
      }
    }
    const n = outer.length;
    for (let i = 0; i < (half ? n-1 : n); i++) {
      const j = (i+1)%n;
      const a = vertex(i,true,0.5), b = vertex(j,true,0.5);
      const c = vertex(i,false,0.5), d = vertex(j,false,0.5);
      const e = vertex(i,true,-0.5), f = vertex(j,true,-0.5);
      const g = vertex(i,false,-0.5), h = vertex(j,false,-0.5);
      face(a,c,d,b); face(f,h,g,e);
      face(e,a,b,f); face(h,d,c,g);
    }
    if (half) {
      face(vertex(0,true,-0.5),vertex(0,false,-0.5),vertex(0,false,0.5),vertex(0,true,0.5));
      face(vertex(n-1,false,-0.5),vertex(n-1,true,-0.5),vertex(n-1,true,0.5),vertex(n-1,false,0.5));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(position,3));
    g.morphTargetsRelative = true;
    g.morphAttributes.position = [collapseX,collapseY].map(delta => new THREE.Float32BufferAttribute(delta,3));
    g.computeVertexNormals();
    return g;
  }
  return [geometry(mirror(outerLeft),mirror(innerLeft),false),geometry(outerLeft,innerLeft,true)];
}

function etchedTexture() {
  const size = 64, bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const tone = (x + 2 * y) % 16 < 3 ? 174 : 240;
      bytes.set([tone, tone, tone, 255], i);
    }
  }
  const texture = new THREE.DataTexture(bytes, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function buildFabrication() {
  const root = new THREE.Group();
  root.name = 'RibbonFET fabrication';
  const pickables = [];
  const block = new THREE.BoxGeometry(1, 1, 1);
  const body = silicon({ color: 0x24384c, roughness: 0.46 });
  const ribbon = channel({ color: 0xf0dcbb, extra: { roughness: 0.43, clearcoat: 0.14, metalness: 0.18 } });
  const sige = silicon({ color: 0xb39cb5, metalness: 0.16, roughness: 0.44,
    extra: { map: etchedTexture() } });
  const field = oxide({ color: 0x47677c, roughness: 0.51 });
  const poly = silicon({ color: 0x788593, metalness: 0.24 });
  const mask = oxide({ color: 0x58aaa9 });
  const outerSpacer = oxide({ color: 0x7c99ad, roughness: 0.40 });
  const innerSpacer = oxide({ color: 0xe1a16a, roughness: 0.34 });
  const interfaceMat = oxide({ color: 0xeeeee5 });
  const highK = oxide({ color: 0x64d9dc, extra: { emissive: 0x17383f } });
  const workFunction = metal(0x91acc5, { roughness: 0.37, extra: { metalness: 0.58 } });
  const gateMetal = metal(0x6b99ae, { roughness: 0.52, extra: { metalness: 0.46, clearcoat: 0.04 } });
  const ild = oxide({ color: 0x668597, metalness: 0.08, roughness: 0.65,
    extra: { transparent: true, opacity: 0.125, depthWrite: false } });
  const terminalSurfaces = {
    gate: [gateMetal, workFunction],
    source: [channel({ color: 0xd9c39b })],
    drain: [channel({ color: 0xd9c39b })],
  };
  const contacts = {};
  for (const id of Object.keys(terminalSurfaces)) {
    contacts[id] = metal(0xd69e69, { roughness: 0.29, extra: { metalness: 0.63 } });
    terminalSurfaces[id].push(contacts[id]);
  }

  function part(name, material, geometry = block, terminal) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    if (terminal) {
      mesh.userData.terminal = terminal;
      pickables.push(mesh);
    }
    // The ILD is displayed in cutaway glass so that embedded surfaces can be followed.
    if (material === ild) mesh.renderOrder = 2;
    root.add(mesh);
    return mesh;
  }

  // Trim bounds before building the transform. Real cut faces remain visible at
  // x=0 / z=0, including the cross-sections of nanometre-thin inset spacers.
  let cutX = Infinity, cutZ = Infinity;
  function box(mesh, x0, x1, y0, y1, z0, z1) {
    x1 = Math.min(cutX, x1);
    z1 = Math.min(cutZ, z1);
    mesh.visible = x1 - x0 > 0.0001 && y1 - y0 > 0.0001 && z1 - z0 > 0.0001;
    if (!mesh.visible) return;
    mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    mesh.scale.set(x1 - x0, y1 - y0, z1 - z0);
  }
  function solid(name, material, pair, terminal) {
    const mesh = part(name, material, pair[0], terminal);
    mesh.userData.profiles = pair;
    return mesh;
  }
  function place(mesh, xScale, yScale, y, z0, z1) {
    z1 = Math.min(cutZ, z1);
    mesh.visible = xScale > 0.0001 && yScale > 0.0001 && z1 - z0 > 0.0001;
    if (!mesh.visible) return;
    mesh.geometry = mesh.userData.profiles[cutX === 0 ? 1 : 0];
    mesh.position.set(0, y, (z0 + z1) / 2);
    mesh.scale.set(xScale, yScale, z1 - z0);
  }
  function sided(sign, near, far) {
    return sign === 1 ? [near, far] : [-far, -near];
  }

  const substrate = part('bulk silicon', body);
  const mesa = part('active silicon pedestal', body);
  const trenches = [-1, 1].map(sign => ({
    sign, original: part('silicon trench field', body), isolation: part('shallow trench isolation', field),
  }));
  const resist = part('lithographic hard mask', mask);
  const epiParts = [];
  for (const [i, y] of LEVELS.entries()) {
    const bottom = y - SI_T / 2;
    for (const isSi of [false, true]) {
      const material = isSi ? ribbon : sige;
      const low = isSi ? bottom : bottom - (PITCH - SI_T);
      const high = isSi ? y + SI_T / 2 : bottom;
      const kind = isSi ? 'Si' : 'SiGe';
      epiParts.push({
        isSi, low, high, i,
        central: part(kind + ' gate span ' + (i + 1), material),
        ends: [-1, 1].map(sign => ({
          sign,
          extension: part(kind + ' spacer span', material),
          recess: part(kind + ' source/drain recess', material),
          field: part(kind + ' unmasked epitaxy', material),
          plug: isSi ? null : part('inner spacer ' + (i + 1), innerSpacer),
        })),
      });
    }
  }

  function arch(name, mat) {
    return { left: part(name + ' left', mat), right: part(name + ' right', mat),
      roof: part(name + ' roof', mat) };
  }
  function placeArch(group, width, baseHeight, height, z0, z1, fraction) {
    const top = lerp(0.10, height, fraction);
    for (const [mesh, a, b] of [[group.left, -width, -FIN], [group.right, FIN, width]]) {
      box(mesh, a, b, 0.10, top, z0, z1);
    }
    box(group.roof, -FIN, FIN, baseHeight, top, z0, z1);
  }
  const dummy = arch('dummy polysilicon', poly);
  const spacerArches = [-1, 1].map(sign => ({ sign, arch: arch('outer spacer', outerSpacer) }));

  // Faceted source and drain epi. These solids nucleate on the four sheet ends,
  // merge, then form a single terminal on each side of the gate.
  const faceted = profiles([[0,0],[-0.80,0],[-1.22,0.40],[-1.22,1.69],
    [-0.83,2.13],[0,2.13]].map(([x,y]) => new THREE.Vector2(x,y)));
  const endRegions = [-1, 1].map(sign => {
    const id = sign > 0 ? 'source' : 'drain';
    const material = terminalSurfaces[id][0];
    return { sign, id,
      body: solid(id + ' epitaxy', material, faceted, id),
      seeds: LEVELS.map(() => part(id + ' epi seed', material, block, id)),
    };
  });

  // The four separate dielectric sleeves and work-function liners meet one
  // continuous gate electrode. Cut the actual four holes out of that electrode.
  const sheetProfile = (extra, cy = 0) => roundedHalf(2 * (FIN + extra),
    SI_T + 2 * extra, Math.min(0.018 + extra, 0.13), cy);
  const liners = [
    { inner: 0, outer: 0.028, mat: interfaceMat, name: 'interface layer' },
    { inner: 0.028, outer: 0.082, mat: highK, name: 'high-k dielectric' },
    { inner: 0.082, outer: 0.11, mat: workFunction, name: 'work-function metal' },
  ].map(({ inner, outer, mat, name }) => {
    const shapes = growingSleeve(sheetProfile(outer), sheetProfile(inner));
    return LEVELS.map(() => solid(name, mat, shapes, mat === workFunction ? 'gate' : null));
  });
  const metalProfile = profiles(roundedHalf(3.06, ROOF, 0.12, ROOF / 2),
    LEVELS.map(y => sheetProfile(0.11, y)));
  const gate = solid('common replacement gate', gateMetal, metalProfile, 'gate');
  // Four metal growth fronts meet halfway between adjacent ribbons. At full
  // fill their combined boundary exactly equals the final common conductor.
  const fillFronts = LEVELS.map((y,i) => {
    const bottom = i === 0 ? 0 : (LEVELS[i-1]+y)/2;
    const top = i === LEVELS.length-1 ? ROOF : (y+LEVELS[i+1])/2;
    const outside = roundedHalf(3.06, top-bottom, i === 0 ? 0.12 : 0, (top+bottom)/2,
      i === LEVELS.length-1 ? 0.12 : 0);
    return solid('gate fill front ' + (i+1), gateMetal, growingSleeve(outside,sheetProfile(0.11,y)), 'gate');
  });
  function deposit(film, y, xThickness, yThickness = xThickness) {
    place(film, xThickness > 0 ? 1 : 0, 1, y, -GATE, GATE);
    film.morphTargetInfluences[0] = 1 - xThickness;
    film.morphTargetInfluences[1] = 1 - yThickness;
  }

  const fields = [-1, 1].map(sign => ({
    sign,
    flank: part('ILD beside device', ild),
    end: part('ILD beyond epitaxy', ild),
  }));
  // Cap the implanted contacts with dielectric; later a contact-sized opening
  // is etched and filled. These slabs leave the gate trench accessible.
  const terminalData = [
    { id:'gate', z:0, halfSpan:GATE, bottom:ROOF, top:3.10, halfX:1.53 },
    { id:'source', z:1.89, halfSpan:0.65, bottom:2.16, top:2.70, halfX:1.23 },
    { id:'drain', z:-1.89, halfSpan:0.65, bottom:2.16, top:2.70, halfX:1.23 },
  ].map(t => ({
    ...t,
    surround: Array.from({ length: 4 }, () => part('contact dielectric', ild)),
    viaMask: part('contact opening', ild),
    stud: part(t.id + ' contact plug', contacts[t.id], block, t.id),
    land: part(t.id + ' local contact', contacts[t.id], block, t.id),
  }));

  const anchors = {
    gate: anchor(root, 0, 3.26, 0, 'gate'), source: anchor(root, 0, 2.85, 1.89, 'source'),
    drain: anchor(root, 0, 2.85, -1.89, 'drain'),
    channel: anchor(root, 0, LEVELS[2], 0, 'channel'),
    spacer: anchor(root, 0, LEVELS[2] - 0.24, 1.07, 'spacer'),
    fourthSheet: anchor(root, 0, LEVELS[3], 0, 'fourthSheet'),
    sti: anchor(root, -1.47, 0.16, 0, 'sti'),
    dummy: anchor(root, 0, ROOF, 0, 'dummy'),
    epitaxy: anchor(root, 0, 1.49, 1.55, 'epitaxy'),
    releaseGap: anchor(root, 0, (LEVELS[1]+LEVELS[2])/2, 0, 'releaseGap'),
    gateLiner: anchor(root, -FIN - 0.055, LEVELS[2], 0, 'gateLiner'),
    gateFill: anchor(root, -0.32, (LEVELS[1]+LEVELS[2])/2, 0, 'gateFill'),
  };
  let highlighted;
  function apply(stepIndex, u, view = 'overview', terminal = null) {
    const progress = clamp(stepIndex, 0, 7) + clamp(u, 0, 1);
    cutX = view === 'longitudinal' ? 0 : Infinity;
    cutZ = view === 'cross' ? 0 : Infinity;
    anchors.fourthSheet.position.z = view === 'cross' ? 0 : Z;
    anchors.sti.position.x = view === 'longitudinal' ? -1.47 : 1.75;
    box(substrate, -X, X, -0.62, -0.23, -Z, Z);
    box(mesa, -FIN, FIN, -0.23, CELL_FLOOR, -Z, Z);
    const flankEtch = srange(progress, 1.20, 1.66);
    const flankTop = lerp(STACK_TOP, -0.23, flankEtch);
    const sti = lerp(-0.23, 1.65, srange(progress, 1.66, 1.81))
      - 1.49 * srange(progress, 1.82, 1.97);
    for (const t of trenches) {
      const [a,b] = sided(t.sign, FIN, X);
      box(t.original, a, b, -0.23, Math.min(CELL_FLOOR, flankTop), -Z, Z);
      box(t.isolation, a, b, -0.23, sti, -Z, Z);
    }
    const maskHeight = 0.105 * srange(progress, 1.01, 1.15) * (1 - srange(progress, 1.86, 1.98));
    box(resist, -FIN, FIN, STACK_TOP, STACK_TOP + maskHeight, -Z, Z);
    const sdCeiling = lerp(STACK_TOP, CELL_FLOOR, srange(progress, 3, 3.38));
    const cavity = srange(progress, 3.39, 3.68);
    const plug = srange(progress, 3.69, 3.99);
    for (const layer of epiParts) {
      const { isSi, low, high, i } = layer;
      const layerIndex = i * 2 + (isSi ? 1 : 0);
      const growth = srange(progress, 0.04 + layerIndex * 0.115, 0.15 + layerIndex * 0.115);
      const grown = lerp(low, high, growth);
      const release = isSi ? 0 : srange(progress, 5.31 + (3-i)*0.022, 5.88 + (3-i)*0.022);
      const mid = (low + high) / 2;
      const a = lerp(low, mid, release), b = Math.min(grown, lerp(high, mid, release));
      box(layer.central, -FIN*(1-release), FIN*(1-release), a, b, -GATE, GATE);
      for (const end of layer.ends) {
        const [side0, side1] = sided(end.sign, FIN, X);
        box(end.field, side0, side1, low, Math.min(grown, flankTop), -Z, Z);
        const extension = isSi ? ENDS : lerp(ENDS, GATE, cavity);
        box(end.extension, -FIN, FIN, low, grown, ...sided(end.sign, GATE, extension));
        box(end.recess, -FIN, FIN, low, Math.min(grown, sdCeiling), ...sided(end.sign, ENDS, Z));
        if (end.plug) box(end.plug, -FIN, FIN, low, high, ...sided(end.sign, GATE, lerp(GATE, ENDS, plug)));
      }
    }

    const dummyAmount = srange(progress, 2.02, 2.59) * (1 - srange(progress, 5.02, 5.32));
    placeArch(dummy, 1.53, STACK_TOP, ROOF, -GATE, GATE, dummyAmount);
    for (const s of spacerArches) {
      const extent = lerp(GATE, ENDS, srange(progress, 2.60, 2.96));
      placeArch(s.arch, 1.53, STACK_TOP, ROOF - 0.12, ...sided(s.sign, GATE, extent), 1);
    }

    const buds = srange(progress, 4.01, 4.31);
    const merge = srange(progress, 4.24, 4.60);
    for (const end of endRegions) {
      for (const [i, seed] of end.seeds.entries()) {
        const halfHeight = (0.087 + 0.13*buds) * (1-merge);
        box(seed, -FIN, FIN, LEVELS[i]-halfHeight, LEVELS[i]+halfHeight,
          ...sided(end.sign, ENDS, ENDS + 0.40*buds));
      }
      place(end.body, merge, merge, lerp(1.16, 0.03, merge),
        ...sided(end.sign, ENDS - 0.004, ENDS + 1.30*merge));
    }

    const cover = srange(progress, 4.61, 4.85);
    const polished = srange(progress, 4.85, 4.99);
    const ildTop = lerp(0.16, 2.86, cover) - 0.38*polished;
    for (const f of fields) {
      box(f.flank, ...sided(f.sign, 1.53, X), 0.16, ildTop, -Z, Z);
      box(f.end, -1.53, 1.53, 0.03, cover > 0 ? ildTop : 0.03, ...sided(f.sign, 2.54, Z));
    }
    for (const [j, group] of liners.entries()) {
      const deposition = srange(progress, [6.02,6.16,6.42][j], [6.16,6.42,6.70][j]);
      for (const [i, film] of group.entries()) {
        deposit(film, LEVELS[i], deposition);
      }
    }
    const fillWidth = srange(progress, 6.70, 6.99);
    const fillHeight = srange(progress, 6.70, 6.92);
    for (const front of fillFronts) deposit(front, 0, fillWidth === 1 ? 0 : fillWidth, fillHeight);
    place(gate, fillWidth === 1 ? 1 : 0, 1, 0, -GATE, GATE);

    const cap = srange(progress, 7.01, 7.19);
    const punch = srange(progress, 7.20, 7.46);
    const stud = srange(progress, 7.47, 7.78);
    const land = srange(progress, 7.79, 7.98);
    for (const t of terminalData) {
      const w = t.id === 'gate' ? 0.29 : 0.38;
      const d = t.id === 'gate' ? 0.25 : 0.32;
      const roofBase = t.id === 'gate' ? t.bottom : Math.max(t.bottom, ildTop);
      const roofTop = lerp(roofBase, t.top, cap);
      const z0 = t.z - t.halfSpan, z1 = t.z + t.halfSpan;
      box(t.surround[0], -t.halfX, -w, t.bottom, roofTop, z0, z1);
      box(t.surround[1], w, t.halfX, t.bottom, roofTop, z0, z1);
      box(t.surround[2], -w, w, t.bottom, roofTop, z0, t.z-d);
      box(t.surround[3], -w, w, t.bottom, roofTop, t.z+d, z1);
      box(t.viaMask, -w, w, t.bottom, lerp(roofTop, t.bottom, punch), t.z-d, t.z+d);
      box(t.stud, -w, w, t.bottom, lerp(t.bottom,t.top,stud), t.z-d, t.z+d);
      box(t.land, -w*1.72, w*1.72, t.top, t.top + 0.155*land, t.z-d*1.32, t.z+d*1.32);
    }
    const selected = stepIndex === 7 ? terminal : null;
    if (highlighted !== selected) {
      for (const [id, mats] of Object.entries(terminalSurfaces)) {
        for (const mat of mats) {
          mat.emissive.setHex(id === selected ? 0x44b9ca : 0x000000);
          mat.emissiveIntensity = id === selected ? 0.64 : 0;
        }
      }
      highlighted = selected;
    }
  }

  apply(0, 0);
  return { root, apply, anchors, pickables };
}
