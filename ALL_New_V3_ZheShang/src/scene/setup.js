import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildNightSky } from './night-sky.js';

export const PALETTE = {
  ink: 0x080c16, fog: 0x080e18, cyan: 0x4fd2f0, cyanHot: 0x9df4ff, blue: 0x2a7bd4,
  copper: 0xcf8b52, amber: 0xe8b24c, steel: 0x8fb3cc,
};

// Strip lights and black flags in a floating-point studio panorama give bevels
// both a sharp highlight and a dark edge. The visible sky is lit independently.
function studioEnvironment(renderer) {
  const width = 512, height = 256;
  const pixels = new Float32Array(width * height * 4);
  const boxes = [
    [.14,.34,.10,.13, [2.9,3.15,3.5]],
    [.80,.38,.16,.045,[3.25,2.90,2.48]],
    [.41,.19,.17,.035,[2.20,2.45,2.80]],
    [.56,.48,.028,.15,[1.6,1.92,2.40]],
    [.01,.56,.10,.035,[1.85,1.38,.99]],
    [.37,.69,.22,.027,[.27,.39,.57]],
  ];
  for (let y = 0; y < height; y++) {
    const v = 1 - (y + .5) / height;
    for (let x = 0; x < width; x++) {
      const u = (x + .5) / width, pos = 4 * (y * width + x);
      const sky = (1 - v) ** 2;
      pixels[pos] = .024 + .18*sky;
      pixels[pos+1] = .033 + .22*sky;
      pixels[pos+2] = .052 + .27*sky;
      for (const [cx,cy,sx,sy,tint] of boxes) {
        const offset = Math.abs(u-cx);
        const dx = Math.min(offset, 1-offset)/sx, dy = Math.abs(v-cy)/sy;
        const contribution = Math.exp(-1.7 * (dx**6 + dy**6));
        for (let c=0; c<3; c++) pixels[pos+c] += tint[c]*contribution;
      }
      pixels[pos+3] = 1;
    }
  }
  const texture = new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.FloatType);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.needsUpdate = true;
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromEquirectangular(texture);
  texture.dispose(); generator.dispose();
  return environment;
}

export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance', stencil:false });
  renderer.setClearColor(PALETTE.ink);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.01;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.010);
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 400);
  const envMap = studioEnvironment(renderer);
  scene.environment = envMap.texture;
  scene.environmentIntensity = .66;
  scene.environmentRotation.y = 2.10;
  const sky = buildNightSky();
  scene.add(sky.mesh);

  const hemi = new THREE.HemisphereLight(0xc5d6ed,0x28212a,.44);
  const key = new THREE.DirectionalLight(0xffe8cf,1.55);
  key.position.set(-5,12,8);
  key.castShadow = true;
  key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{ left:-7.5, right:7.5, top:7.5, bottom:-7.5, near:.2, far:35 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias = .010;
  key.shadow.bias = -.00025;
  key.shadow.intensity = .62;
  const rim = new THREE.DirectionalLight(0xc0dcff,1.72);
  rim.position.set(3,6,-8);
  const fill = new THREE.DirectionalLight(0x88a8dc,.46);
  fill.position.set(2,1,9);
  const head = new THREE.DirectionalLight(0xe2ebff,.33);
  const headTarget = new THREE.Object3D();
  head.target = headTarget;
  scene.add(hemi,key,key.target,rim,fill,head,headTarget);

  const composer = new EffectComposer(renderer);
  const aaSamples = Math.min(4,renderer.capabilities.maxSamples);
  composer.renderTarget1.samples = composer.renderTarget2.samples = aaSamples;
  composer.addPass(new RenderPass(scene,camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1,1), .18, .34, 1.10);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  let quality = 'high';
  let dpr = Math.min(window.devicePixelRatio || 1,1.6);
  function resize() {
    const w=window.innerWidth, h=window.innerHeight;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w,h,false);
    composer.setPixelRatio(dpr);
    composer.setSize(w,h);
    camera.aspect=w/h;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  resize();
  function setQuality(q) {
    quality = q;
    dpr = Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : q === 'mid' ? 1.25 : 1.6);
    bloom.enabled = q !== 'low';
    const samples = q === 'high' ? aaSamples : 0;
    if (composer.renderTarget1.samples !== samples) {
      for (const target of [composer.renderTarget1,composer.renderTarget2]) {
        target.samples = samples;
        target.dispose();
      }
    }
    renderer.shadowMap.enabled = q !== 'low';
    renderer.shadowMap.needsUpdate = true;
    resize();
  }

  let initialized = false, lastP = -1, lastYaw = NaN, lastPitch = NaN;
  let heroRoot;
  function updateBackdrop(progress, time) {
    sky.update(camera.aspect,progress,time);
    if (!initialized) {
      // The stage is constructed after the rendering context. Cast contact shadows
      // on opaque surfaces only so that the teaching cutaway stays transparent.
      for (const root of scene.children.filter(child => child.isGroup)) {
        if (!heroRoot) heroRoot = root;
        root.traverse(obj => {
          if (!obj.isMesh || !obj.material?.isMeshStandardMaterial) return;
          if ((obj.material.userData.baseOpacity ?? obj.material.opacity) < .9) return;
          obj.receiveShadow = true;
          obj.castShadow = !obj.isInstancedMesh;
        });
      }
      initialized = true;
    }
    const yaw = heroRoot?.rotation.y ?? 0, pitch = heroRoot?.rotation.x ?? 0;
    if (Math.abs(progress-lastP) > .00018 || yaw !== lastYaw || pitch !== lastPitch) {
      renderer.shadowMap.needsUpdate = true;
      lastP = progress; lastYaw = yaw; lastPitch = pitch;
    }
  }
  return { renderer,scene,camera,composer,envMap,key,head,headTarget,bloom,resize,setQuality,updateBackdrop,
    get quality() { return quality; } };
}
