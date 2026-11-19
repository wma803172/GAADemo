import * as THREE from 'three';
import { rbox, extrude, roundedRectShape } from './geo.js';
import { channel, gateGlass } from '../scene/materials.js';
import { anchor, makeFade } from './common.js';
import { satinMetal, facetedSolid, specimenBase, ribbonBlank, ribbonPath } from './specimen.js';

const RIBBON_W = 1.9;
const RIBBON_T = 0.16;
const PITCH = 0.58;
const RIBBON_L = 6.6;
const STI_TOP = 0.36;

// The pulse is shaded onto the silicon itself. Its coordinates follow the
// device when it changes shape or the viewer rotates it. Oxide and gate metal
// never receive this material.
function activeSilicon(uniforms, layer) {
  const mat = channel({ color: 0xe7882c, extra: {
    roughness: 0.37, metalness: 0.24, clearcoat: 0.08,
    specularIntensity: 0.46, envMapIntensity: 0.83,
    emissive: 0x763218, emissiveIntensity: 0.23,
  } });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, { layerPhase: { value: layer * 0.19 } });
    shader.vertexShader = 'varying vec3 siliconPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nsiliconPos = position;'
    );
    shader.fragmentShader = [
      'varying vec3 siliconPos;',
      'uniform float carrierTime, conduction, drainField, layerPhase, planarView, finView, gateHalf;',
      shader.fragmentShader,
    ].join('\n').replace('#include <color_fragment>', `
      #include <color_fragment>
      // The two coloured diffusion regions meet the gate edges in the
      // planar cutaway. Their inner edges mark the source/drain junctions.
      float diffusion = smoothstep(gateHalf - 0.035, gateHalf + 0.035, abs(siliconPos.z));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.23,0.34,0.40), planarView * diffusion);
    `).replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float z = siliconPos.z / ${RIBBON_L.toFixed(2)};
      float x = siliconPos.x / ${RIBBON_W.toFixed(2)};
      float y = siliconPos.y / ${RIBBON_T.toFixed(2)};
      float gateZ = siliconPos.z / gateHalf;
      float phase = fract(mix(z * 3.2, gateZ * 0.90, finView) - carrierTime * 0.81 + layerPhase);
      float head = 1.0 - smoothstep(0.025, 0.12, abs(phase - 0.58));
      float tail = smoothstep(0.14, 0.55, phase) * (1.0 - smoothstep(0.55, 0.59, phase));
      float top = 1.0 - smoothstep(0.018, 0.085, abs(abs(x) - 0.28));
      float side = (1.0 - smoothstep(0.045, 0.26, abs(y))) * smoothstep(0.43, 0.49, abs(x));
      float ribbonPath = max(top, side) * (1.0 - smoothstep(0.40, 0.48, abs(z)));
      float finPath = max(top * smoothstep(0.33, 0.46, y), side) *
          (1.0 - smoothstep(0.88, 1.0, abs(gateZ)));
      float path = mix(ribbonPath, finPath, finView);
      float gateRegion = 1.0 - smoothstep(0.07, 0.12, abs(z));
      totalEmissiveRadiance += vec3(1.0,0.65,0.24) * conduction * path *
          (0.13 + 2.0 * head + 0.43 * tail) * (1.0 + 0.34 * gateRegion);
      totalEmissiveRadiance += vec3(0.95,0.16,0.035) * drainField *
          smoothstep(-0.92, 0.83, gateZ) * (1.0 - smoothstep(1.0, 1.32, abs(gateZ)));
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
  const filmShape = ribbonPath(RIBBON_W,RIBBON_T,0.075);
  filmShape.holes.push(ribbonPath(RIBBON_W,RIBBON_T));
  const filmGeometry = extrude(filmShape, gateLen + 0.04, { bevel: 0, curveSegments: 7 });
  const filmMat = staticGlass(0x83d8ce, 0.34);
  const oxideLip = extrude(filmShape,0.019,{ bevel: 0, curveSegments: 8 });
  const oxideLipMat = satinMetal(0xa9e3d0,0.30,0.23);
  const spacerMaterial = new THREE.MeshStandardMaterial({
    color: 0xa8b5ab, roughness: 0.63, metalness: 0.12,
  });
  const spacer = rbox(RIBBON_W - 0.03, PITCH - RIBBON_T - 0.02, 0.13, 0.049, 2);
  for (let i = 0; i < n; i++) {
    const y = bottom + i * PITCH;
    outer.holes.push(ribbonPath(RIBBON_W,RIBBON_T,0.077,y-cy));
    const dielectric = new THREE.Mesh(filmGeometry, filmMat);
    dielectric.position.y = y;
    dielectric.renderOrder = 2;
    film.add(dielectric);
    for (const sign of [-1,1]) {
      const exposedOxide = new THREE.Mesh(oxideLip,oxideLipMat);
      exposedOxide.position.set(0,y,sign * (gateLen / 2 + 0.020));
      film.add(exposedOxide);
      // Inner spacers occupy the recesses between sheets at each gate end.
      if (i < n - 1) {
        const plug = new THREE.Mesh(spacer, spacerMaterial);
        plug.position.set(0, y + PITCH / 2, sign * (gateLen / 2 + 0.089));
        film.add(plug);
      }
    }
  }
  const geometry = extrude(outer, gateLen, { bevel: 0.008, bevelSegments: 1, curveSegments: 7 });
  const body = new THREE.Mesh(geometry, staticGlass(0xc2e1ec, 0.20));
  body.position.y = cy;
  body.renderOrder = 3;
  root.add(body, film);

  // A narrow metal section at the back of the transparent cutaway makes the
  // four openings and the continuity of the surrounding gate easy to read.
  const silver = satinMetal(0xb6c6c9,0.28,0.66);
  const section = new THREE.Mesh(extrude(outer, gateLen * 0.19, { bevel: 0.008, bevelSegments: 2 }), silver);
  section.position.set(0, cy, -gateLen * 0.405);
  section.scale.set(1.002,1.002,1);
  const crown = new THREE.Mesh(rbox(gateOuterW - 0.20, 0.135, gateLen, 0.054, 3), silver);
  crown.position.set(0,cy + gateOuterH / 2 - 0.067,0);
  const liner = new THREE.Mesh(rbox(gateOuterW - 0.17, 0.034, gateLen - 0.02, 0.014, 2),
    satinMetal(0x84949b,0.39,0.45));
  liner.position.set(0,crown.position.y - 0.082,0);
  root.add(section, crown, liner);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 38),
    new THREE.LineBasicMaterial({ color: 0xc7e3e3, transparent: true, opacity: 0.25, depthWrite: false }));
  edge.material.userData.baseOpacity = 0.25;
  edge.position.y = cy;
  edge.renderOrder = 4;
  root.add(edge);
  // The exposed metal section can extend toward the viewer in the complete
  // device portrait, then recede for the teaching cutaway.
  function setCoverage(amount) {
    const fraction = 0.19 + amount * 0.51;
    section.scale.z = fraction / 0.19;
    section.position.z = gateLen * (fraction / 2 - 0.50);
  }
  return { root, body, setCoverage };
}

function makeTerminal(root, dir, sdZ, cy, stackHeight) {
  const end = new THREE.Group();
  const h = stackHeight;
  const foot = new THREE.Mesh(facetedSolid([
    [STI_TOP - cy - 0.10,1.59,0.86,0.15,0.10],
    [-h*0.49,1.62,0.82,0.16,0.11], [-h*0.43,1.79,0.85,0.18,0.13],
  ]), satinMetal(0x62747f,0.48,0.28));
  const terminal = new THREE.Mesh(facetedSolid([
    [-h*0.54,1.70,0.76,0.18,0.12], [-h*0.39,2.13,0.99,0.23,0.18],
    [-h*0.24,2.26,1.08,0.27,0.19], [h*0.22,2.26,1.08,0.27,0.19],
    [h*0.42,1.92,0.88,0.20,0.15], [h*0.48,1.72,0.81,0.14,0.12],
  ]), satinMetal(0x8999a2,0.40,0.36));
  const bond = new THREE.Mesh(facetedSolid([
    [h*0.464,1.76,0.83,0.11,0.10], [h*0.484,1.83,0.86,0.10,0.10],
    [h*0.51,1.83,0.86,0.10,0.10],
  ]), satinMetal(0x75838b,0.29));
  // Keep the horizontal landing at the exact point used by the PowerVia
  // cutaway. The narrow neck and the pad above it are the same metal contact.
  const cap = new THREE.Mesh(facetedSolid([
    [-0.055,2.42,0.85,0.16,0.12], [-0.024,RIBBON_W + 0.6,0.95,0.15,0.115],
    [0.024,RIBBON_W + 0.6,0.95,0.15,0.115], [0.057,2.40,0.85,0.14,0.11],
  ]), satinMetal(0xc8c8bf,0.26,0.70));
  cap.name = 'sourceDrainContact';
  cap.position.y = stackHeight / 2 + 0.05;
  const neck = new THREE.Mesh(facetedSolid([
    [0,1.08,0.64,0.08,0.08], [0.045,0.92,0.55,0.065,0.065],
    [0.112,0.92,0.55,0.065,0.065], [0.143,1.02,0.63,0.08,0.08],
  ]), satinMetal(0x939fa2,0.32,0.63));
  neck.position.y = cap.position.y + 0.05;
  const pad = new THREE.Mesh(rbox(1.19,0.087,0.79,0.040,3),satinMetal(0xd0c6af,0.29));
  pad.position.y = neck.position.y + 0.176;
  end.position.set(0, cy, dir * sdZ);
  end.add(foot, terminal, bond, cap, neck, pad);
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

  const { base, substrate, plinth, sti } = specimenBase(STI_TOP);
  root.add(base);

  const uniforms = {
    carrierTime: { value: 0 }, conduction: { value: 0 }, drainField: { value: 0 },
    planarView: { value: 0 }, finView: { value: 0 }, gateHalf: { value: gateLen / 2 },
  };
  const ribbons = [];
  // The silicon enters each terminal and ends inside it, away from the
  // outer contact face even when its edges taper.
  const ribbonGeometry = ribbonBlank(RIBBON_W, RIBBON_T, RIBBON_L - 0.22);
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
    setGateCoverage: gate.setCoverage,
    setConduction(strength, time) { uniforms.conduction.value = strength; uniforms.carrierTime.value = time; },
    setChannelView(planar, fin, gateHalf) {
      uniforms.planarView.value = planar;
      uniforms.finView.value = fin;
      uniforms.gateHalf.value = gateHalf;
    },
    setDrainField(strength) { uniforms.drainField.value = strength; },
  };
}
