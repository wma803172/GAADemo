import * as THREE from 'three';
import { extrude } from './geo.js';

// Flat crystal facets and a short bevel make a silhouette visible at every
// zoom. Each cross section is an octagon in the x-z plane.
export function facetedSolid(levels) {
  const vertices = [];
  const ring = ([y, w, d, cutX, cutZ]) => {
    const x = w / 2, z = d / 2;
    const corners = [
      [-x + cutX, y, -z], [x - cutX, y, -z], [x, y, -z + cutZ],
      [x, y, z - cutZ], [x - cutX, y, z], [-x + cutX, y, z],
      [-x, y, z - cutZ], [-x, y, -z + cutZ],
    ];
    // A second, much narrower bevel along the vertical arrises catches
    // the studio strip lights between the broad crystallographic faces.
    return corners.flatMap(([px,py,pz], i) => [-1,1].map(dir => {
      const [nx,,nz] = corners[(i + 8 + dir) % 8];
      const dx = nx - px, dz = nz - pz;
      const length = Math.hypot(dx,dz);
      const setback = Math.min(length * .18, .022);
      return [px + dx / length * setback, py, pz + dz / length * setback];
    }));
  };
  const rings = levels.map(ring);
  const sides = rings[0].length;
  const triangle = (a, b, c) => vertices.push(...a, ...b, ...c);
  for (let j = 0; j < rings.length - 1; j++) {
    const lower = rings[j], upper = rings[j + 1];
    for (let i = 0; i < sides; i++) {
      const k = (i + 1) % sides;
      triangle(lower[i], upper[i], upper[k]);
      triangle(lower[i], upper[k], lower[k]);
    }
  }
  for (let i = 1; i < sides - 1; i++) {
    triangle(rings[0][0], rings[0][i], rings[0][i + 1]);
    const end = rings[rings.length - 1];
    triangle(end[0], end[i + 1], end[i]);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Finite-width bands of reflected light keep brushed surfaces readable when
// viewed from either side. The pattern lives in object space, so rotating the
// exhibit or changing the chapter cannot make the finish slide on the part.
export function satinMetal(color, roughness, metalness = 0.68) {
  const material = new THREE.MeshPhysicalMaterial({
    color, roughness, metalness, envMapIntensity: 1.12,
    clearcoat: 0.19, clearcoatRoughness: 0.30,
  });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 finishPos;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\nfinishPos = position;'
    );
    shader.fragmentShader = 'varying vec3 finishPos;\n' + shader.fragmentShader.replace(
      '#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      vec2 uvFinish = vec2(finishPos.x + 0.61 * finishPos.y, finishPos.z - 0.42 * finishPos.y);
      float bands = sin(uvFinish.y * 143.0 + 0.65 * sin(uvFinish.x * 6.0));
      float resolved = 1.0 - smoothstep(0.005,0.043,fwidth(uvFinish.y));
      roughnessFactor = clamp(roughnessFactor + resolved * bands * 0.018, 0.17, 0.86);`
    );
  };
  return material;
}

function tile(w, d, thickness, corner, material) {
  const points = [
    [-w/2 + corner, -d/2], [w/2 - corner, -d/2], [w/2, -d/2 + corner],
    [w/2, d/2 - corner], [w/2 - corner, d/2], [-w/2 + corner, d/2],
    [-w/2, d/2 - corner], [-w/2, -d/2 + corner],
  ];
  const shape = new THREE.Shape(points.map(([x,z]) => new THREE.Vector2(x,z)));
  const g = extrude(shape, thickness, { bevel: 0.014, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, material);
}

function etchPatterns(parent, y) {
  // Isolated dummy-fill fields on the specimen margin. There are deliberately
  // no metal paths between this etched margin and the transistor terminals.
  const boxes = [];
  for (const side of [-1,1]) {
    for (let bank = 0; bank < 6; bank++) {
      const z = (bank - 2.5) * 0.95;
      for (let row = 0; row < 7; row++) {
        const len = (row === 3 || row === 6) ? 0.27 : 0.47;
        boxes.push([side * (2.31 + len / 2), z - 0.34 + row * 0.105, len, 0.028]);
      }
      boxes.push([side * 2.22, z, 0.025, 0.68]);
    }
    // Wafer alignment crosses sit outside the patterned active area.
    for (const end of [-1,1]) {
      boxes.push([side * 1.79, end * 3.20, 0.28, 0.025], [side * 1.79, end * 3.20, 0.025, 0.28]);
    }
  }
  const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1), satinMetal(0x60757b, 0.51, 0.45), boxes.length);
  const pose = new THREE.Object3D();
  boxes.forEach(([x, z, w, d], index) => {
    pose.position.set(x, y + 0.008, z);
    pose.scale.set(w, 0.010, d);
    pose.updateMatrix();
    marks.setMatrixAt(index, pose.matrix);
  });
  parent.add(marks);
}

function contactShade(y) {
  const size = 96;
  const pixels = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const x = (col / (size - 1) - 0.5) * 5.3;
      const z = (row / (size - 1) - 0.5) * 7.25;
      const shade = Math.exp(-0.96 * x*x) *
        (0.54 * Math.exp(-5.0 * (Math.abs(z)-2.80)**2) + 0.20 * Math.exp(-0.18*z*z));
      pixels[(row * size + col) * 4 + 3] = Math.round(Math.min(shade,1) * 255);
    }
  }
  const map = new THREE.DataTexture(pixels, size, size);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 7.25), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y + 0.018;
  return mesh;
}

export function specimenBase(topY) {
  const base = new THREE.Group();
  const graphite = satinMetal(0x34424d, 0.42, 0.43);
  const die = satinMetal(0x4a5964, 0.34, 0.58);
  const luster = satinMetal(0xa0b5bd, 0.27);
  const sti = tile(6.10,7.10,0.24,0.32, die);
  sti.position.y = topY - 0.12 - 0.014;
  const substrate = tile(6.18,7.18,0.29,0.35, graphite);
  substrate.position.y = topY - 0.433;
  const film = tile(6.14,7.14,0.050,0.34, luster);
  film.position.y = topY - 0.271;
  const plinth = tile(6.10,7.10,0.11,0.34, satinMetal(0x39434f,0.48));
  plinth.position.y = topY - 0.653;
  const backing = tile(6.08,7.08,0.035,0.32, satinMetal(0xb19881,0.31));
  backing.position.y = topY - 0.586;
  base.add(plinth, backing, substrate, film, sti, contactShade(topY));
  etchPatterns(base, topY);
  return { base, substrate, sti, plinth };
}

// Superelliptic sections give nanosheets broad faces and softly curved edges.
// Use the same contour normal to grow conformal oxide and cut the gate holes.
function sheetSection(w, t, offset = 0) {
  const profile = [];
  for (let j = 0; j < 48; j++) {
    const a = (j / 48) * 2 * Math.PI;
    const power = v => Math.sign(v) * Math.pow(Math.abs(v), 0.5);
    const x = power(Math.cos(a)), y = power(Math.sin(a));
    const nx = x**3 / w, ny = y**3 / t, n = Math.hypot(nx,ny);
    profile.push([x * w / 2 + offset * nx / n, y * t / 2 + offset * ny / n, nx / n, ny / n]);
  }
  return profile;
}

export function ribbonPath(w, t, offset = 0, yShift = 0) {
  return new THREE.Shape(sheetSection(w,t,offset).map(([x,y]) => new THREE.Vector2(x,y + yShift)));
}

export function ribbonBlank(w, t, length) {
  const profile = sheetSection(w,t);
  const zStops = [-.50,-.45,-.35,-.14,.14,.35,.45,.50];
  const positions = [], normals = [], indices = [];
  for (let i = 0; i < zStops.length; i++) {
    const z = zStops[i];
    const width = 1 - 0.075 * THREE.MathUtils.smoothstep(Math.abs(z),.35,.49);
    for (let j = 0; j < profile.length; j++) {
      const [x,y,nx,ny] = profile[j];
      positions.push(x * width,y,z * length);
      normals.push(nx,ny,0);
      if (i === zStops.length-1) continue;
      const here = i * profile.length + j, next = i * profile.length + (j + 1) % profile.length;
      indices.push(here,next,next+profile.length,here,next+profile.length,here+profile.length);
    }
  }
  // Both ends continue into the opaque S/D crystal.
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geo.setIndex(indices);
  return geo;
}
