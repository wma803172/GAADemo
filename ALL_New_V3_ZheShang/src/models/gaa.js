import * as THREE from 'three';
import { rbox, extrude, roundedRectShape, roundedRectPath } from './geo.js';
import { silicon, channel, metal, gateGlass } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';

const RIBBON_W = 1.9;
const RIBBON_T = 0.16;
const PITCH = 0.58;
const RIBBON_L = 6.6;
const STI_TOP = 0.36;

// The pulse is shaded onto the silicon itself. Its coordinates follow the
// device when it changes shape or the viewer rotates it. Oxide and gate metal
// never receive this material.
function activeSilicon(uniforms, layer) {
  const mat = channel({ color: 0xd99752, extra: {
    roughness: 0.39, metalness: 0.26, clearcoat: 0.22,
    emissive: 0x492510, emissiveIntensity: 0.3,
  } });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { layerPhase: { value: layer * 0.19 } });
    shader.vertexShader = 'varying vec3 siliconPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nsiliconPos = position;'
    );
    shader.fragmentShader = [
      'varying vec3 siliconPos;',
      'uniform float carrierTime, conduction, drainField, layerPhase;',
      shader.fragmentShader,
    ].join('\n').replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float z = siliconPos.z / ${RIBBON_L.toFixed(2)};
      float x = siliconPos.x / ${RIBBON_W.toFixed(2)};
      float y = siliconPos.y / ${RIBBON_T.toFixed(2)};
      float phase = fract(z * 4.5 - carrierTime * 0.93 + layerPhase);
      float head = 1.0 - smoothstep(0.025, 0.14, abs(phase - 0.58));
      float tail = smoothstep(0.14, 0.55, phase) * (1.0 - smoothstep(0.55, 0.59, phase));
      float top = 1.0 - smoothstep(0.035, 0.12, abs(abs(x) - 0.27));
      float side = (1.0 - smoothstep(0.045, 0.26, abs(y))) * smoothstep(0.43, 0.49, abs(x));
      float path = max(top, side) * (1.0 - smoothstep(0.40, 0.48, abs(z)));
      float gateRegion = 1.0 - smoothstep(0.07, 0.12, abs(z));
      totalEmissiveRadiance += vec3(1.0,0.89,0.63) * conduction * path *
          (0.09 + 2.15 * head + 0.35 * tail) * (1.0 + 0.38 * gateRegion);
      totalEmissiveRadiance += vec3(0.72,0.12,0.035) * drainField *
          smoothstep(-0.16, 0.25, z) * (1.0 - smoothstep(0.29,0.41,z));
    `);
  };
  return mat;
}

function staticGlass(hex, opacity) {
  const mat = gateGlass({ color: hex, opacity, extra: { side: THREE.FrontSide } });
  mat.userData.baseOpacity = opacity;
  return mat;
}

function makeGate(n, cy, bottom, gateLen, gateOuterW, gateOuterH) {
  const root = new THREE.Group();
  const film = new THREE.Group();
  const outer = roundedRectShape(gateOuterW, gateOuterH, 0.15);
  const filmShape = roundedRectShape(RIBBON_W + 0.15, RIBBON_T + 0.15, 0.085);
  filmShape.holes.push(roundedRectPath(RIBBON_W, RIBBON_T, 0.025));
  const filmGeometry = extrude(filmShape, gateLen + 0.04, { bevel: 0, curveSegments: 7 });
  const filmMat = staticGlass(0x91d6d8, 0.27);
  for (let i = 0; i < n; i++) {
    const y = bottom + i * PITCH;
    const hole = roundedRectPath(RIBBON_W + 0.154, RIBBON_T + 0.154, 0.085);
    const points = hole.getPoints(9).map(pt => new THREE.Vector2(pt.x, pt.y + y - cy));
    outer.holes.push(new THREE.Path(points));
    const dielectric = new THREE.Mesh(filmGeometry, filmMat);
    dielectric.position.y = y;
    dielectric.renderOrder = 2;
    film.add(dielectric);
  }
  const geometry = extrude(outer, gateLen, { bevel: 0.008, bevelSegments: 1, curveSegments: 7 });
  const body = new THREE.Mesh(geometry, staticGlass(0xb1e3ee, 0.26));
  body.position.y = cy;
  body.renderOrder = 3;
  root.add(body, film);

  // A narrow metal section at the back of the transparent cutaway makes the
  // four openings and the continuity of the surrounding gate easy to read.
  const section = new THREE.Mesh(extrude(outer, 0.045, { bevel: 0 }), metal(0x98c3cd, {
    roughness: 0.35, extra: { metalness: 0.54, emissive: 0x17363e, emissiveIntensity: 0.28 },
  }));
  section.position.set(0, cy, -gateLen / 2 + 0.015);
  root.add(section);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 38),
    new THREE.LineBasicMaterial({ color: 0xb4e9ef, transparent: true, opacity: 0.32, depthWrite: false }));
  edge.material.userData.baseOpacity = 0.32;
  edge.position.y = cy;
  edge.renderOrder = 4;
  root.add(edge);
  return { root, body };
}

function makeTerminal(root, dir, sdZ, cy, stackHeight) {
  const epi = new THREE.Shape();
  epi.moveTo(-0.83, -0.50);
  epi.lineTo(-1.125, -0.33);
  epi.lineTo(-1.125, 0.32);
  epi.lineTo(-0.91, 0.50);
  epi.lineTo(0.91, 0.50);
  epi.lineTo(1.125, 0.32);
  epi.lineTo(1.125, -0.33);
  epi.lineTo(0.83, -0.50);
  epi.closePath();
  const end = new THREE.Group();
  const terminal = new THREE.Mesh(extrude(epi, 0.95, { bevel: 0.015, bevelSegments: 1 }),
    channel({ color: 0xc4895c, extra: { roughness: 0.48, metalness: 0.3 } }));
  terminal.scale.y = stackHeight;
  const cap = new THREE.Mesh(rbox(RIBBON_W + 0.6, 0.12, 0.95, 0.035, 2), metal(0xc89c76, {
    roughness: 0.34, extra: { metalness: 0.65, emissive: 0x42281c, emissiveIntensity: 0.22 },
  }));
  cap.name = 'sourceDrainContact';
  cap.position.y = stackHeight / 2 + 0.05;
  end.position.set(0, cy, dir * sdZ);
  end.add(terminal, cap);
  root.add(end);
  return end;
}

export function buildGAA(opts = {}) {
  const n = opts.ribbons ?? 4;
  const gateLen = opts.gateLen ?? 1.15;
  const root = new THREE.Group();
  const stackBottom = STI_TOP + 0.62;
  const stackTop = stackBottom + (n - 1) * PITCH + RIBBON_T;
  const cy = (stackBottom + stackTop) / 2;
  const gateOuterW = RIBBON_W + 0.66;
  const gateOuterH = stackTop - stackBottom + 0.66;
  const sdZ = RIBBON_L / 2 - 0.5;

  const base = new THREE.Group();
  const substrate = new THREE.Mesh(rbox(7.6, 1.0, 7.4, 0.08, 2), silicon({ color: 0x293b4a }));
  substrate.position.y = -0.50;
  const plinth = new THREE.Mesh(rbox(8.0, 0.21, 7.80, 0.06, 2), silicon({ color: 0x14232f }));
  plinth.position.y = -1.12;
  const sti = new THREE.Mesh(rbox(6.65, STI_TOP, 6.88, 0.036, 2),
    silicon({ color: 0x30424c, extra: { roughness: 0.6, metalness: 0.2 } }));
  sti.position.y = STI_TOP / 2;
  base.add(substrate, plinth, sti);
  root.add(base);

  const uniforms = { carrierTime: { value: 0 }, conduction: { value: 0 }, drainField: { value: 0 } };
  const ribbons = [];
  // The silicon enters each terminal and ends inside it, away from the
  // outer contact face even when its edges taper.
  const ribbonGeometry = rbox(RIBBON_W, RIBBON_T, RIBBON_L - 0.22, 0.032, 2);
  for (let i = 0; i < n; i++) {
    const ribbon = new THREE.Mesh(ribbonGeometry, activeSilicon(uniforms, i));
    ribbon.position.y = stackBottom + i * PITCH;
    root.add(ribbon);
    ribbons.push(ribbon);
  }
  const gate = makeGate(n, cy, stackBottom, gateLen, gateOuterW, gateOuterH);
  root.add(gate.root);
  const terminals = [-1,1].map(dir => makeTerminal(root, dir, sdZ, cy, stackTop - stackBottom + 0.45));
  const parts = { gate: gate.root, gateBody: gate.body, ribbons, terminals, substrate, plinth, sti, base };
  const anchors = {
    gate: anchor(root, 0, cy + gateOuterH / 2, 0, 'gate'),
    ribbon: anchor(root, RIBBON_W / 2, stackTop, 1.40, 'ribbon'),
    sd: anchor(terminals[1], 0, (stackTop - stackBottom + 0.45) / 2 + 0.12, 0, 'sd'),
    source: anchor(terminals[0], 0, (stackTop - stackBottom + 0.45) / 2 + 0.12, 0, 'source'),
  };
  anchors.drain = anchors.sd;
  return {
    root, parts, anchors, fade: makeFade(root), kind: 'gaa',
    metrics: { cy, stackBottom, stackTop, gateLen, gateOuterW, gateOuterH, sdZ, RIBBON_W, RIBBON_T, RIBBON_L, pitch: PITCH, stiTop: STI_TOP },
    setConduction(strength, time) { uniforms.conduction.value = strength; uniforms.carrierTime.value = time; },
    setDrainField(strength) { uniforms.drainField.value = strength; },
  };
}
