/* ---------------------------------------------------------------------------
   setup.js — 渲染器 / 场景 / 相机 / 环境光 / 后期
   所有"贵的"东西集中在这里，其他地方只拿现成的。
   --------------------------------------------------------------------------- */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildNightSky } from './night-sky.js';

export const PALETTE = {
  ink: 0x04070b,
  fog: 0x050a11,
  cyan: 0x4fd2f0,
  cyanHot: 0x9df4ff,
  blue: 0x2a7bd4,
  copper: 0xcf8b52,
  amber: 0xe8b24c,
  steel: 0x8fb3cc,
};

/* --------------------------------------------------------------- environment
   用一张程序化生成的等距柱状贴图当环境光。
   重点是给金属面提供"Studio 高光"：顶部一条冷白主光带 + 两侧青色补光带。
   这比 HDR 文件轻，而且完全可控。
   ------------------------------------------------------------------------- */
function buildEnvCanvas() {
  const w = 1024, h = 512;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0.00, '#0a1220');
  sky.addColorStop(0.34, '#12283f');
  sky.addColorStop(0.50, '#1d4468');
  sky.addColorStop(0.56, '#0d1c2b');
  sky.addColorStop(1.00, '#03060a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const bands = [
    { y: 0.30, hh: 0.055, c: 'rgba(198,232,255,0.95)' },
    { y: 0.46, hh: 0.020, c: 'rgba(120,214,246,0.55)' },
    { y: 0.68, hh: 0.036, c: 'rgba(96,170,240,0.28)' },
    { y: 0.85, hh: 0.020, c: 'rgba(206,139,82,0.20)' },
  ];
  for (const b of bands) {
    const y = b.y * h;
    const g = ctx.createLinearGradient(0, y - b.hh * h, 0, y + b.hh * h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, b.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y - b.hh * h, w, b.hh * h * 2);
  }

  // 几块柔和的矩形灯箱，制造金属面上的长条高光
  const boxes = [
    { x: 0.10, y: 0.20, w: 0.16, h: 0.07, c: 'rgba(180,226,255,0.55)' },
    { x: 0.58, y: 0.16, w: 0.24, h: 0.05, c: 'rgba(140,210,255,0.38)' },
    { x: 0.78, y: 0.34, w: 0.10, h: 0.10, c: 'rgba(80,150,225,0.40)' },
    { x: 0.30, y: 0.40, w: 0.06, h: 0.14, c: 'rgba(220,245,255,0.30)' },
  ];
  ctx.filter = 'blur(22px)';
  for (const b of boxes) {
    ctx.fillStyle = b.c;
    ctx.fillRect(b.x * w, b.y * h, b.w * w, b.h * h);
  }
  ctx.filter = 'none';
  return cv;
}

function buildEnvironment(renderer) {
  const cv = buildEnvCanvas();
  const tex = new THREE.CanvasTexture(cv);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const rt = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return rt.texture;
}

/* --------------------------------------------------------------- backdrop
   地面点阵：Intel 官网页面的标志性元素，也给画面一个"参照系"。
   ------------------------------------------------------------------------- */
function buildFloor() {
  const geo = new THREE.PlaneGeometry(420, 420, 1, 1);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0x4f9fd0) },
      uOpacity: { value: 0.085 },
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: [
      'varying vec2 vUv;',
      'varying vec3 vPos;',
      'void main(){',
      '  vUv = uv;',
      '  vec4 wp = modelMatrix * vec4(position,1.0);',
      '  vPos = wp.xyz;',
      '  gl_Position = projectionMatrix * viewMatrix * wp;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'precision highp float;',
      'varying vec2 vUv;',
      'varying vec3 vPos;',
      'uniform vec3 uColor;',
      'uniform float uOpacity;',
      'uniform float uTime;',
      'uniform vec2 uCenter;',
      '',
      'void main(){',
      '  vec2 world = vPos.xz;',
      '  vec2 cell = world / 2.0;',
      '  vec2 g = fract(cell) - 0.5;',
      '  float d = length(g);',
      '  float dot0 = smoothstep(0.085, 0.0, d) * 0.75;',
      '',
      '  vec2 grid = abs(fract(world / 2.0 - 0.5) - 0.5) / fwidth(world / 2.0);',
      '  float line = 1.0 - min(min(grid.x, grid.y), 1.0);',
      '  line *= 0.10;',
      '',
      '  float radial = length(world - uCenter);',
      '  float fade = smoothstep(46.0, 3.0, radial);',
      '  float fade2 = smoothstep(80.0, 16.0, radial);',
      '',
      '  float a = (dot0 * fade + line * fade2) * uOpacity;',
      '  gl_FragColor = vec4(uColor, a);',
      '}'
    ].join('\n'),
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -0.02;
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

/* --------------------------------------------------------------- world */
export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setClearColor(PALETTE.ink, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.019);

  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 400);
  camera.position.set(12, 8, 16);
  camera.lookAt(0, 1, 0);

  const envMap = buildEnvironment(renderer);
  scene.environment = envMap;
  scene.environmentIntensity = 0.62;

  const hemi = new THREE.HemisphereLight(0x86bce8, 0x0a1420, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xdff2ff, 1.20);
  key.position.set(7, 11, 8);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x49c8ee, 0.80);
  rim.position.set(-9, 4.5, -7);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x2f5f9a, 0.30);
  fill.position.set(-3, -6, 6);
  scene.add(fill);

  const warm = new THREE.PointLight(0xe0a05c, 2.2, 18, 2);
  warm.position.set(3.4, 2.2, 4.2);
  scene.add(warm);

  const floor = buildFloor();
  scene.add(floor);
  const sky = buildNightSky();
  scene.add(sky.mesh);

  // 跟着相机走的补光：不管镜头在哪，正面总有一点"眼神光"
  const head = new THREE.DirectionalLight(0xcde6ff, 0.55);
  head.position.set(0, 0, 10);
  scene.add(head);
  const headTarget = new THREE.Object3D();
  scene.add(headTarget);
  head.target = headTarget;

  /* ------------------------------------------------------------ composer */
  const composer = new EffectComposer(renderer);
  // Geometry is drawn into the composer's offscreen buffer before blooming.
  // Multisample that buffer as well, especially for the narrow fins and ribbons.
  const gl = renderer.getContext();
  const supported = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES);
  const edgeSamples = Array.from(supported ?? []).find(samples => samples <= 4) ?? 0;
  for (const target of [composer.renderTarget1, composer.renderTarget2]) target.samples = edgeSamples;
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.34, 0.97);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  let quality = 'high';

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    bloom.setSize(w * dpr * 0.5, h * dpr * 0.5);
  }
  resize();

  function setQuality(q) {
    quality = q;
    const samples = q === 'high' ? edgeSamples : 0;
    for (const target of [composer.renderTarget1, composer.renderTarget2]) {
      if (target.samples !== samples) {
        target.dispose();
        target.samples = samples;
      }
    }
    if (q === 'low') {
      dpr = Math.min(window.devicePixelRatio || 1, 1.0);
      bloom.enabled = false;
    } else if (q === 'mid') {
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      bloom.enabled = true;
      bloom.strength = 0.20;
    } else {
      dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      bloom.enabled = true;
      bloom.strength = 0.24;
    }
    renderer.toneMappingExposure = q === 'low' ? 1.0 : 0.98;
    resize();
  }

  return {
    renderer, scene, camera, composer, bloom, floor, sky,
    envMap, key, rim, fill, warm, head, headTarget,
    resize, setQuality,
    get quality() { return quality; },
  };
}
