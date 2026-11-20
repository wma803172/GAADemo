import * as THREE from 'three';
import { clamp, lerp, srange } from '../core/util.js';

export const recommendedViews = [
  'overview', 'overview', 'overview', 'longitudinal',
  'overview', 'longitudinal', 'cross', 'overview',
];

const FOV = 32;
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const SITE_SCALE = 8;
const SITE_WIDTH = 6.8 / SITE_SCALE;
const SITE_DEPTH = 6.2 / SITE_SCALE;

// The selected patch fills a hole in the wafer face. At the end of the zoom it
// has exactly the fabrication substrate's footprint; the surrounding wafer
// can recede without putting a second face over the device.
function buildWafer() {
  const root = new THREE.Group();
  const radius = 3.4;
  const centerX = -0.37;
  const centerY = 0.41;
  const notch = -1.08;
  const outline = new THREE.Shape();
  for (let i = 0; i <= 200; i++) {
    const angle = -Math.PI + Math.PI * 2 * i / 200;
    const localRadius = radius - 0.11 * Math.max(0, 1 - Math.abs(angle - notch) / 0.055);
    const x = centerX + localRadius * Math.cos(angle);
    const y = centerY + localRadius * Math.sin(angle);
    if (i === 0) outline.moveTo(x, y);
    else outline.lineTo(x, y);
  }
  outline.closePath();

  const hole = new THREE.Path();
  const x = SITE_WIDTH / 2, z = SITE_DEPTH / 2;
  hole.moveTo(-x, -z);
  hole.lineTo(-x, z);
  hole.lineTo(x, z);
  hole.lineTo(x, -z);
  hole.closePath();
  outline.holes.push(hole);

  const thickness = 0.074;
  const surface = new THREE.MeshPhysicalMaterial({
    color: 0xa3b2c0, metalness: 0.71, roughness: 0.23, clearcoat: 0.64,
    clearcoatRoughness: 0.24, envMapIntensity: 1.4, transparent: true,
  });
  // A distant environment reflection is nearly uniform on a polished flat
  // wafer. Add the broad, diagonal reflection of a nearby studio softbox.
  // Wafer-local coordinates are shared by the face and its removable patch;
  // moving the eye changes the highlight on both continuously.
  const polish = { value: 1 };
  surface.onBeforeCompile = shader => {
    shader.uniforms.uWaferPolish = polish;
    shader.vertexShader = 'varying vec2 vWaferXZ;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>', '#include <begin_vertex>\n vWaferXZ = position.xz;'
    );
    shader.fragmentShader = 'uniform float uWaferPolish;\nvarying vec2 vWaferXZ;\n' +
      shader.fragmentShader.replace('#include <opaque_fragment>', `
        vec2 waferPoint = (vWaferXZ - vec2(-0.37, -0.41)) / 3.4;
        vec3 eyeRay = inverseTransformDirection(normalize(vViewPosition), viewMatrix);
        float diagonal = dot(waferPoint, vec2(0.81, 0.586))
                       - 0.21 * dot(eyeRay.xz, vec2(0.64, 0.77));
        float broad = (diagonal + 0.13) / 0.42;
        float core = (diagonal + 0.25) / 0.17;
        float bounce = (diagonal - 0.63) / 0.37;
        vec3 reflection = vec3(0.17, 0.20, 0.235) * exp(-broad * broad)
                        + vec3(0.17, 0.18, 0.185) * exp(-core * core)
                        + vec3(0.012, 0.030, 0.055) * exp(-bounce * bounce);
        outgoingLight += uWaferPolish * reflection;
        #include <opaque_fragment>
      `);
  };
  const edge = new THREE.MeshStandardMaterial({
    color: 0x8096a8, roughness: 0.32, metalness: 0.45, transparent: true,
  });
  const diskGeo = new THREE.ExtrudeGeometry(outline, { depth: thickness, bevelEnabled: false, steps: 1 });
  diskGeo.rotateX(-Math.PI / 2);
  diskGeo.translate(0, -thickness, 0);
  const disk = new THREE.Mesh(diskGeo, [surface, edge]);
  root.add(disk);

  const blank = new THREE.Mesh(new THREE.BoxGeometry(SITE_WIDTH, thickness, SITE_DEPTH), surface);
  blank.position.y = -thickness / 2;
  root.add(blank);

  const rimPoints = outline.getPoints(1).map(p => new THREE.Vector3(p.x, 0.004, -p.y));
  const rimMat = new THREE.LineBasicMaterial({ color: 0xb6cad6, transparent: true, opacity: 0.76, depthWrite: false });
  root.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(rimPoints), rimMat));

  const marks = [];
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      const cx = dx * x, cz = dz * z;
      marks.push(cx - dx * 0.15, 0.01, cz, cx, 0.01, cz,
        cx, 0.01, cz, cx, 0.01, cz - dz * 0.15);
    }
  }
  const markerGeo = new THREE.BufferGeometry();
  markerGeo.setAttribute('position', new THREE.Float32BufferAttribute(marks, 3));
  const markerMat = new THREE.LineBasicMaterial({ color: 0x8feaf2, transparent: true, depthTest: false });
  const markers = new THREE.LineSegments(markerGeo, markerMat);
  markers.renderOrder = 5;
  root.add(markers);

  const polished = surface.color.clone();
  const silicon = new THREE.Color(0x293d4c);
  function update(entry) {
    root.visible = entry < 0.97;
    if (!root.visible) return true;
    const zoom = srange(entry, 0.20, 0.81);
    const shoulder = 1 - srange(entry, 0.81, 0.97);
    root.scale.setScalar(Math.exp(Math.log(SITE_SCALE) * zoom));
    blank.visible = entry < 0.81;
    surface.color.lerpColors(polished, silicon, zoom);
    surface.metalness = lerp(0.71, 0.3, zoom);
    surface.roughness = lerp(0.23, 0.55, zoom);
    polish.value = 1 - srange(entry, 0.45, 0.81);
    surface.opacity = edge.opacity = shoulder;
    surface.depthWrite = edge.depthWrite = shoulder > 0.98;
    rimMat.opacity = 0.76 * shoulder;
    markerMat.opacity = srange(entry, 0, 0.20) * (1 - srange(entry, 0.70, 0.84));
    return !blank.visible;
  }
  return { root, update };
}

// A gate-centre cutting plane. Only the corner marks persist long enough to
// place the cut during the turn; the end view exposes the actual materials.
function buildSliceGuide() {
  const geo = new THREE.BufferGeometry();
  const points = [];
  for (const [x, signX] of [[-1.55, 1], [1.55, -1]]) {
    for (const [y, signY] of [[0.04, 1], [2.48, -1]]) {
      points.push(x + signX * 0.33, y, 0.015, x, y, 0.015,
        x, y, 0.015, x, y + signY * 0.30, 0.015);
    }
  }
  // Guide across the top runs in X. In the preceding longitudinal view
  // its vertical edge is seen at the middle of the gated region.
  points.push(-1.55, 2.48, 0.015, 1.55, 2.48, 0.015, 1.55, 2.48, 0.015, 1.55, 0.04, 0.015);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({ color: 0x82d3de, transparent: true, depthWrite: false });
  const guide = new THREE.LineSegments(geo, material);
  guide.renderOrder = 3;
  return guide;
}

// A single signal route starts on the gate landing. Every change of level
// includes a via, and adjacent traces remain electrically separate.
function buildLocalRoute() {
  const root = new THREE.Group();
  const trace = new THREE.MeshStandardMaterial({
    color: 0x5faeb7, metalness: 0.55, roughness: 0.35, emissive: 0x153c40,
  });
  const via = new THREE.MeshStandardMaterial({ color: 0xd6a473, metalness: 0.6, roughness: 0.32 });
  const others = new THREE.MeshStandardMaterial({ color: 0x3b6876, metalness: 0.52, roughness: 0.43 });
  const axis = new THREE.Vector3(0, 1, 0);
  const bars = [];
  function segment(a, b, start, end, isVia, adjacent = false) {
    const from = new THREE.Vector3(...a);
    const vector = new THREE.Vector3(...b).sub(from);
    const geo = isVia ? new THREE.CylinderGeometry(0.091, 0.091, 1, 12) : new THREE.BoxGeometry(0.14, 1, 0.12);
    const mesh = new THREE.Mesh(geo, isVia ? via : adjacent ? others : trace);
    mesh.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
    root.add(mesh);
    bars.push({ mesh, from, vector, length: vector.length(), start, end });
  }
  segment([0,0,0], [0,0.48,0], 0.04, 0.17, true);
  segment([0,0.48,0], [1.16,0.48,0], 0.13, 0.30, false);
  segment([1.16,0.48,0], [1.16,1.05,0], 0.27, 0.41, true);
  segment([1.16,1.05,0], [1.16,1.05,-1.28], 0.38, 0.56, false);
  segment([1.16,1.05,-1.28], [1.16,1.67,-1.28], 0.52, 0.66, true);
  segment([1.16,1.67,-1.28], [-2.45,1.67,-1.28], 0.62, 0.84, false);
  for (const side of [-1, 1]) {
    segment([-2.42,0.48,side * 0.50], [1.91,0.48,side * 0.50], 0.40, 0.68, false, true);
    segment([1.16 + side * 0.63,1.05,1.6], [1.16 + side * 0.63,1.05,-2.45], 0.50, 0.79, false, true);
    segment([-2.86,1.67,-1.28 + side * 0.70], [2.47,1.67,-1.28 + side * 0.70], 0.64, 0.88, false, true);
  }
  function update(progress, anchor) {
    root.visible = progress > 0;
    if (!root.visible) return;
    root.position.copy(anchor);
    for (const b of bars) {
      const u = srange(progress, b.start, b.end);
      b.mesh.visible = u > 0.001;
      b.mesh.scale.y = u * b.length;
      b.mesh.position.copy(b.from).addScaledVector(b.vector, u * 0.5);
    }
  }
  return { root, update };
}

export function createFabricationCamera(scene) {
  const wafer = buildWafer();
  const guide = buildSliceGuide();
  const route = buildLocalRoute();
  scene.add(wafer.root, guide, route.root);

  const target = new THREE.Vector3();
  const desiredTarget = new THREE.Vector3();
  const gate = new THREE.Vector3();
  let angle = 0, elevation = 0, radius = 1;
  let initialized = false;
  let modelView = 'overview', requestedView = 'overview', turnTime = 0;
  function hide() {
    wafer.root.visible = guide.visible = route.root.visible = false;
    initialized = false;
  }
  hide();

  function update({ step, fraction, view, yaw = 0, pitch = 0, dt, entry = 1, exit = 0, reduced,
    rect, screenWidth, screenHeight, camera, anchors }) {
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    // Regard the DOM aperture as the camera's full frame, then render its
    // surroundings into the actual canvas. This keeps optics and fog density
    // unchanged when a phone places the aperture above the caption.
    camera.fov = FOV;
    camera.setViewOffset(w, h, -rect.left, -rect.top, screenWidth, screenHeight);
    let az = 1.00, el = 0.35, spanX = 8.8, spanY = 5.7, nearAllowance = 2.4;
    desiredTarget.set(0, 0.94, 0);
    if (view === 'longitudinal') {
      az = Math.PI / 2 - 0.025;
      el = 0.09;
      spanX = 7.25; spanY = 4.4; nearAllowance = 0.45;
      desiredTarget.y = 1.10;
    } else if (view === 'cross') {
      az = 0.015;
      el = 0.045;
      spanX = 4.0; spanY = step === 7 ? 4.12 : 3.65; nearAllowance = 0.15;
      desiredTarget.y = step === 7 ? 1.55 : 1.17;
    } else if (step === 1) {
      // Look down while the lithographic outline defines the fin width.
      el += 0.55 * (1 - srange(fraction, 0.24, 0.76));
      desiredTarget.y = 0.88;
    }
    const deviceVisible = wafer.update(entry);
    if (entry < 1) {
      const intoDevice = srange(entry, 0.17, 0.94);
      az = lerp(0.36, az, intoDevice);
      el = lerp(0.72, el, intoDevice);
      spanX = lerp(7.8, spanX, intoDevice);
      spanY = lerp(6.5, spanY, intoDevice);
      desiredTarget.x = lerp(-0.37, desiredTarget.x, intoDevice);
      desiredTarget.y = lerp(0, desiredTarget.y, intoDevice);
      desiredTarget.z = lerp(-0.41, desiredTarget.z, intoDevice);
    }
    gate.set(0, 3.26, 0);
    if (anchors?.gate) anchors.gate.getWorldPosition(gate);
    route.update(exit, gate);
    if (exit > 0) {
      const close = srange(exit, 0, 0.24);
      const pull = srange(exit, 0.25, 0.91);
      desiredTarget.lerp(gate, close * 0.68);
      desiredTarget.y = lerp(desiredTarget.y, gate.y + 0.20, pull);
      spanX = lerp(lerp(spanX, 6.4, close), 11.8, pull);
      spanY = lerp(lerp(spanY, 4.5, close), 7.9, pull);
      az = lerp(az, 0.79, close);
      el = lerp(el, 0.34, close);
      nearAllowance = lerp(nearAllowance, 2.5, pull);
    }
    const drag = 1 - srange(exit, 0, 0.30);
    az += yaw * drag;
    el = clamp(el + pitch * drag, -0.46, 1.30);
    const distance = Math.max(spanY, spanX * h / w) / (2 * HALF_FOV_TAN) + nearAllowance;
    const desiredView = exit > 0.18 ? 'overview' : view;
    if (desiredView !== requestedView) {
      requestedView = desiredView;
      turnTime = 0;
    }
    turnTime += Math.max(0, dt);
    // Keep the preceding cutaway while the observer sees where the new plane
    // intersects the device. Expose the new section once the orbit nears it.
    if (!initialized || reduced || turnTime >= 0.19) modelView = desiredView;
    const smoothing = !initialized || reduced ? 1 : 1 - Math.exp(-Math.max(0, dt) * 10);
    target.lerp(desiredTarget, smoothing);
    angle += Math.atan2(Math.sin(az - angle), Math.cos(az - angle)) * smoothing;
    elevation = lerp(elevation, el, smoothing);
    radius = lerp(radius, distance, smoothing);
    const flat = Math.cos(elevation) * radius;
    camera.position.set(target.x + Math.sin(angle) * flat,
      target.y + Math.sin(elevation) * radius, target.z + Math.cos(angle) * flat);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    initialized = true;

    const guideAlpha = step === 6 && view === 'cross' && !reduced
      ? (1 - srange(fraction, 0.13, 0.40)) * (1 - exit) : 0;
    guide.visible = guideAlpha > 0.001;
    guide.material.opacity = 0.78 * guideAlpha;
    return { deviceVisible, target, modelView };
  }

  return { update, hide };
}
