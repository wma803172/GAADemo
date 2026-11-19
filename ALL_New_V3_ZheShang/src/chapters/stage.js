import * as THREE from 'three';
import { buildDeviceEvolution } from './device-transition.js';
import { buildStack } from '../models/stack.js';
import { buildDie, buildPackage, buildServer, buildLaptop } from '../models/macro.js';
import { lerp, srange, win } from '../core/util.js';

// Keep the source and drain in the same screen order through the generations.
// Positions and targets are in scene units; they are not physical dimensions.
const SHOTS = [
  [0.000, [13, 7.6, 8.4], [-1.75, 0.72, 0]],
  [0.105, [11.8, 6.0, 6.3], [-1.45, 0.82, 0]],
  [0.170, [11.2, 5.0, 5.9], [-1.45, 0.83, 0]],
  [0.245, [12.1, 5.5, 6.4], [-1.60, 1.30, 0]],
  [0.335, [13.2, 7.0, 7.2], [-1.75, 1.30, 0]],
  [0.420, [12.7, 6.1, 6.8], [-1.65, 1.35, 0]],
  [0.495, [11.8, 4.6, 6.3], [-1.55, 1.65, 0]],
  [0.533, [11.8, 4.6, 6.3], [-1.55, 1.65, 0]],
  [0.570, [17.5, 8.3, 13.0], [-1.9, 2.60, 0]],
  [0.651, [17.5, 7.5, 13.0], [-1.9, 1.65, 0]],
  [0.708, [17.0, 6.0, 13.0], [-1.8, 0.85, 0]],
  [0.738, [16.0, 5.5, 12.0], [-1.6, 0.55, 0]],
  [0.768, [4.5, 2.6, 5.5], [-0.1, 0.08, 0.4]],
  [0.790, [4.5, 2.6, 5.5], [-0.1, 0.08, 0.4]],
  [0.811, [17.5, 7.0, 13.5], [-1.9, 0.80, 0]],
  [0.846, [0, 3.6, 18.6], [0, 0.1, 0]],
  [0.900, [1.2, 3.0, 16.0], [0, 1.2, 0]],
  [0.970, [0, 0.35, 16.5], [0, 0, 0]],
];

const MACRO = [
  { key: 'die', enter: [0.826, 0.843], exit: [0.856, 0.868], scale: 1.45, y: 0 },
  { key: 'package', enter: [0.847, 0.861], exit: [0.881, 0.894], scale: 1.1, y: 0 },
  { key: 'server', enter: [0.875, 0.890], exit: [0.907, 0.917], scale: 0.86, y: 0.4 },
  { key: 'laptop', enter: [0.905, 0.922], exit: [0.960, 0.970], scale: 0.88, y: 0.6 },
];

export function createStage(scene) {
  const models = {
    device: buildDeviceEvolution(),
    stack: buildStack({}),
    die: buildDie(),
    package: buildPackage(),
    server: buildServer(),
    laptop: buildLaptop(),
  };
  for (const model of Object.values(models)) scene.add(model.root);

  const cameraPos = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3();
  const next = new THREE.Vector3();
  const result = { cameraPos, cameraTarget, fov: 31 };

  function apply(p, time, view, gateOn = true) {
    const device = models.device;
    device.root.rotation.set(view.pitch, view.yaw, 0);
    device.apply(p, time, gateOn);

    const stack = models.stack;
    const opacity = win(p, 0.543, 0.561, 0.826, 0.840);
    stack.fade(opacity);
    if (opacity > 0.001) {
      stack.root.rotation.set(view.pitch, view.yaw, 0);
      stack.root.scale.setScalar(lerp(1, 0.22, srange(p, 0.822, 0.840)));
      stack.apply({
        split: srange(p, 0.624, 0.686),
        assemble: srange(p, 0.702, 0.750),
        detail: win(p, 0.739, 0.768, 0.790, 0.808),
        time,
      });
    }

    for (const shot of MACRO) {
      const m = models[shot.key];
      const intensity = win(p, ...shot.enter, ...shot.exit);
      m.fade(intensity);
      if (intensity < 0.001) continue;
      m.root.position.y = shot.y;
      const entryScale = lerp(1.45, 1, srange(p, ...shot.enter));
      const exitScale = lerp(1, 0.2, srange(p, ...shot.exit));
      m.root.scale.setScalar(shot.scale * entryScale * exitScale);
      const spin = shot.key === 'laptop' ? lerp(-0.60, -0.14, srange(p, 0.88, 0.96)) : 0;
      m.root.rotation.set(view.pitch, view.yaw + spin, 0);
    }

    const endIndex = SHOTS.findIndex(shot => shot[0] > p);
    const j = endIndex === -1 ? SHOTS.length - 1 : Math.max(1, endIndex);
    const a = SHOTS[j - 1], b = SHOTS[j];
    const t = srange(p, a[0], b[0]);
    cameraPos.fromArray(a[1]).lerp(next.fromArray(b[1]), t);
    cameraTarget.fromArray(a[2]).lerp(next.fromArray(b[2]), t);
    return result;
  }
  return { models, apply };
}
