/* ---------------------------------------------------------------------------
   materials.js — 材质库
   设计取向：Intel 官方 3D 渲染的那种"金属＋玻璃＋冷光"。
   全部程序化：没有贴图文件，启动零等待，也不会有 404。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { PALETTE } from './setup.js';

export const C = {
  ink: new THREE.Color(0x04070b),
  cyan: new THREE.Color(0x4fd2f0),
  cyanHot: new THREE.Color(0x9df4ff),
  blue: new THREE.Color(0x2a7bd4),
  copper: new THREE.Color(0xcf8b52),
  amber: new THREE.Color(0xe8b24c),
  steel: new THREE.Color(0x8fb3cc),
  ivory: new THREE.Color(0xf2dcb8),
};

/* ---------------------------------------------------------------- surfaces */

/** 体硅 / 衬底：深板岩，微弱金属感 */
export function silicon(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0x1a2430,
    metalness: opts.metalness ?? 0.30,
    roughness: opts.roughness ?? 0.62,
    clearcoat: 0.04,
    clearcoatRoughness: 0.80,
    envMapIntensity: 1.05,
    ...opts.extra,
  });
}

/** 有源区（fin / ribbon）：暖象牙色，和蓝色金属拉出对比 */
export function channel(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xf0dcbb,
    metalness: 0.30,
    roughness: 0.22,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
    ...opts.extra,
  });
}

/** 氧化物 / 绝缘层：几乎全黑，只有高光 */
export function oxide(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0x122232,
    metalness: 0.30,
    roughness: 0.44,
    clearcoat: 0.25,
    clearcoatRoughness: 0.38,
    envMapIntensity: 0.75,
    ...opts.extra,
  });
}

/** 金属：铜 / 银 / 金，靠 color 区分 */
export function metal(hex = 0xcf8b52, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: hex,
    metalness: 1.0,
    roughness: opts.roughness ?? 0.44,
    clearcoat: 0.10,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.95,
    ...opts.extra,
  });
}

/** 发光体：自发光 + 微透明，用来做"通电"的地方 */
export function emissive(hex = 0x5fe3ff, intensity = 2.2) {
  return new THREE.MeshStandardMaterial({
    color: 0x081018,
    emissive: new THREE.Color(hex),
    emissiveIntensity: intensity,
    metalness: 0.0,
    roughness: 0.4,
    transparent: true,
    opacity: 1,
  });
}

/** 半透明栅极玻璃 —— PPT 里反复强调的"Gate 尽量半透明" */
export function gateGlass(opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xa8ecff,
    metalness: 0.05,
    roughness: 0.045,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    ior: 1.5,
    reflectivity: 0.55,
    envMapIntensity: 1.15,
    transparent: true,
    opacity: opts.opacity ?? 0.30,
    depthWrite: false,
    side: THREE.DoubleSide,
    ...opts.extra,
  });
}

/* ------------------------------------------------------------------ shaders */

const RIM_VERT = [
  'varying vec3 vN;',
  'varying vec3 vV;',
  'void main(){',
  '  vN = normalize(normalMatrix * normal);',
  '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
  '  vV = normalize(-mv.xyz);',
  '  gl_Position = projectionMatrix * mv;',
  '}'
].join('\n');

const RIM_FRAG = [
  'precision highp float;',
  'varying vec3 vN;',
  'varying vec3 vV;',
  'uniform vec3 uColor;',
  'uniform float uPower;',
  'uniform float uStrength;',
  'uniform float uBase;',
  'void main(){',
  '  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);',
  '  float a = clamp(f * uStrength + uBase, 0.0, 1.0);',
  '  gl_FragColor = vec4(uColor * a, a);',
  '}'
].join('\n');

/** 边缘辉光外壳：给玻璃/金属加一层"发光的轮廓"，Intel 渲染的灵魂 */
export function rim(hex = 0x6fe6ff, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(hex) },
      uPower: { value: opts.power ?? 2.6 },
      uStrength: { value: opts.strength ?? 1.15 },
      uBase: { value: opts.base ?? 0.0 },
    },
    vertexShader: RIM_VERT,
    fragmentShader: RIM_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

const FLOW_VERT = [
  'varying vec3 vW;',
  'varying vec3 vN;',
  'varying vec3 vV;',
  'void main(){',
  '  vec4 wp = modelMatrix * vec4(position, 1.0);',
  '  vW = wp.xyz;',
  '  vN = normalize(normalMatrix * normal);',
  '  vec4 mv = viewMatrix * wp;',
  '  vV = normalize(-mv.xyz);',
  '  gl_Position = projectionMatrix * mv;',
  '}'
].join('\n');

const FLOW_FRAG = [
  'precision highp float;',
  'varying vec3 vW;',
  'varying vec3 vN;',
  'varying vec3 vV;',
  'uniform vec3 uColor;',
  'uniform float uTime;',
  'uniform float uSpeed;',
  'uniform float uDensity;',
  'uniform float uOpacity;',
  'uniform float uRimOnly;',
  'uniform float uOpaque;',
  'uniform vec3 uAxis;',
  'void main(){',
  '  float axis = dot(vW, normalize(uAxis));',
  '  float ph = fract(axis * uDensity - uTime * uSpeed);',
  '  float pulse = pow(smoothstep(0.42, 0.0, abs(ph - 0.5)), 1.6);',
  '  float rimF = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);',
  '  float a = mix(pulse, rimF * (0.35 + 0.65 * pulse), uRimOnly);',
  '  a *= uOpacity;',
  '  if (uOpaque > 0.5) {',
  '    vec3 col = mix(uColor * 0.88, uColor + vec3(0.12, 0.26, 0.30), a);',
  '    gl_FragColor = vec4(col, 1.0);',
  '  } else {',
  '    gl_FragColor = vec4(uColor * (0.55 + 1.25 * a), a);',
  '  }',
  '}'
].join('\n');

/** 沿轴向流动的能量带：表现"电流在接触面上跑" */
export function energyFlow(opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(opts.color ?? 0x6fe6ff) },
      uTime: { value: 0 },
      uSpeed: { value: opts.speed ?? 1.4 },
      uDensity: { value: opts.density ?? 5.0 },
      uOpacity: { value: opts.opacity ?? 0.95 },
      uRimOnly: { value: opts.rimOnly ?? 0.0 },
      uOpaque: { value: opts.opaque ? 1 : 0 },
      uAxis: { value: new THREE.Vector3(...(opts.axis ?? [0, 0, 1])).normalize() },
    },
    vertexShader: FLOW_VERT,
    fragmentShader: FLOW_FRAG,
    transparent: !opts.opaque,
    blending: opts.opaque ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: !!opts.opaque,
    side: THREE.DoubleSide,
  });
}

/* ---------------------------------------------------------------- particles */
const PTS_VERT = [
  'attribute float aSeed;',
  'attribute float aBright;',
  'varying float vA;',
  'void main(){',
  '  vA = aBright;',
  '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
  '  gl_PointSize = aBright * 62.0 / max(0.001, -mv.z);',
  '  gl_Position = projectionMatrix * mv;',
  '}'
].join('\n');

const PTS_FRAG = [
  'precision highp float;',
  'varying float vA;',
  'uniform vec3 uColor;',
  'uniform float uOpacity;',
  'void main(){',
  '  vec2 c = gl_PointCoord - 0.5;',
  '  float d = length(c);',
  '  if (d > 0.5) discard;',
  '  float a = smoothstep(0.5, 0.02, d);',
  '  a = pow(a, 1.6);',
  '  gl_FragColor = vec4(uColor, a * vA * uOpacity);',
  '}'
].join('\n');

/** 电子点：小小的、带拖尾感的亮点 */
export function particlePoints(count, color = 0x8ff2ff) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const bright = new Float32Array(count);
  for (let i = 0; i < count; i++) { seed[i] = Math.random(); bright[i] = 0.6 + Math.random() * 0.8; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1.0 },
    },
    vertexShader: PTS_VERT,
    fragmentShader: PTS_FRAG,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}

/* ------------------------------------------------------------------- utils */

const _matCache = new Map();

/** 递归设置透明度；opacity<1 时临时打开 transparent，回到 1 时关掉以恢复排序性能 */
export function setOpacity(root, o) {
  const t = o < 0.999;
  root.traverse((obj) => {
    const m = obj.material;
    if (!m) return;
    const arr = Array.isArray(m) ? m : [m];
    for (const mm of arr) {
      if (mm.userData && mm.userData.noFade) continue;
      if (mm.uniforms && mm.uniforms.uOpacity) {
        mm.uniforms.uOpacity.value = (mm.userData.baseOpacity ?? 1) * o;
        continue;
      }
      mm.opacity = o;
      if (!mm.userData.fixedTransparent) {
        if (t) { mm.transparent = true; mm.depthWrite = false; }
        else { mm.transparent = !!mm.userData.origTransparent; mm.depthWrite = true; }
      }
    }
  });
}

/** 记录材质原始的 transparent 状态，供 setOpacity 还原 */
export function markBase(root) {
  root.traverse((obj) => {
    const m = obj.material;
    if (!m) return;
    const arr = Array.isArray(m) ? m : [m];
    for (const mm of arr) {
      if (mm.userData.origTransparent === undefined) mm.userData.origTransparent = mm.transparent;
    }
  });
}

/** 一次性给整棵树统一 renderOrder，解决透明体排序 */
export function setRenderOrder(root, order) {
  root.traverse((o) => { o.renderOrder = order; });
}

/** 深拷贝材质，让每个模型可以独立淡入淡出 */
export function cloneMaterials(root) {
  root.traverse((obj) => {
    if (!obj.material) return;
    obj.material = Array.isArray(obj.material)
      ? obj.material.map((m) => m.clone())
      : obj.material.clone();
  });
}

/** 让所有 energyFlow 材质动起来 */
export function tickMaterials(root, time) {
  root.traverse((obj) => {
    const m = obj.material;
    if (!m) return;
    const arr = Array.isArray(m) ? m : [m];
    for (const mm of arr) if (mm.uniforms && mm.uniforms.uTime) mm.uniforms.uTime.value = time;
  });
}
