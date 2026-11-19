import * as THREE from 'three';

// Tangent-plane projection of the seven principal stars (J2000 RA/Dec in degrees).
// Their relative positions are preserved as the panel changes aspect ratio.
const STARS = [
  [165.932, 61.751, 1.79], [165.461, 56.382, 2.37], [178.458, 53.695, 2.44],
  [183.856, 57.033, 3.31], [193.507, 55.960, 1.76], [200.982, 54.925, 2.23],
  [206.885, 49.313, 1.85],
];

function chartTexture() {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 438;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,cv.width,cv.height);
  const rad = Math.PI / 180;
  const centreDec = 56 * rad;
  const projected = STARS.map(([ra, dec, magnitude]) => {
    const a = (ra - 186) * rad, d = dec * rad;
    const k = Math.sin(centreDec) * Math.sin(d) + Math.cos(centreDec) * Math.cos(d) * Math.cos(a);
    const x = Math.cos(d) * Math.sin(a) / k;
    const y = (Math.cos(centreDec) * Math.sin(d) - Math.sin(centreDec) * Math.cos(d) * Math.cos(a)) / k;
    const rot = 0.32;
    return [x * Math.cos(rot) - y * Math.sin(rot), -(x * Math.sin(rot) + y * Math.cos(rot)), magnitude];
  });
  const xs = projected.map(s => s[0]), ys = projected.map(s => s[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const scale = Math.min((cv.width - 106) / (xmax - xmin), (cv.height - 88) / (ymax - ymin));
  const points = projected.map(([x, y, mag]) => [
    cv.width / 2 + (x - (xmax + xmin) / 2) * scale,
    cv.height / 2 + (y - (ymax + ymin) / 2) * scale,
    mag,
  ]);
  ctx.lineWidth = 1.45;
  ctx.lineCap = 'round';
  for (const [a, b] of [[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6]]) {
    const [x0,y0] = points[a], [x1,y1] = points[b];
    const g = ctx.createLinearGradient(x0,y0,x1,y1);
    g.addColorStop(0, 'rgba(197,210,239,.72)');
    g.addColorStop(.5, 'rgba(166,185,220,.35)');
    g.addColorStop(1, 'rgba(216,217,230,.74)');
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x1,y1); ctx.stroke();
  }
  points.forEach(([x,y,mag], index) => {
    const strength = (4.4 - mag) / 2.4;
    const radius = 11 + 12 * strength;
    const glow = ctx.createRadialGradient(x,y,0,x,y,radius);
    const tint = index === 0 ? '253,207,143' : '162,198,255';
    glow.addColorStop(0,'rgba(255,249,226,.97)');
    glow.addColorStop(.09,'rgba('+tint+',.68)');
    glow.addColorStop(.28,'rgba('+tint+',.23)');
    glow.addColorStop(1,'rgba('+tint+',0)');
    ctx.fillStyle = glow; ctx.fillRect(x-radius,y-radius,2*radius,2*radius);
    const r = 1.8 + strength * 1.5;
    const spike = strength * 13;
    ctx.save(); ctx.translate(x,y); ctx.rotate(.16);
    ctx.fillStyle = 'rgba(235,237,245,.59)';
    for (let j=0; j<4; j++) {
      ctx.beginPath(); ctx.moveTo(-1,0); ctx.lineTo(0,-spike); ctx.lineTo(1,0); ctx.fill(); ctx.rotate(Math.PI/2);
    }
    ctx.restore();
    ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  });
  const texture = new THREE.CanvasTexture(cv);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildNightSky() {
  const field = new THREE.TextureLoader().load(new URL('../../assets/deep-field.webp', import.meta.url).href);
  field.colorSpace = THREE.SRGBColorSpace;
  const uniforms = {
    uField:{ value:field }, uChart:{ value:chartTexture() },
    uAspect:{ value:1 }, uSkyTime:{ value:0 }, uProgress:{ value:0 }, uParallax:{ value:new THREE.Vector2() },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest:false, depthWrite:false,
    vertexShader:`
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`,
    fragmentShader:`
      varying vec2 vUv;
      uniform sampler2D uField, uChart;
      uniform vec2 uParallax;
      uniform float uAspect, uSkyTime, uProgress;
      void main() {
        vec2 uv = vUv;
        vec2 cover = min(vec2(1.0),vec2(uAspect / 1.77778, 1.77778 / uAspect));
        vec2 skyUV = (uv - 0.5) * cover * 0.94 + 0.5;
        skyUV += vec2(0.017, -0.020) * uProgress + uParallax * 0.005;
        vec3 photographic = texture2D(uField, skyUV).rgb;
        // Work in scene-linear light before the display's filmic output pass.
        float quiet = mix(1.0,0.75,smoothstep(0.05,0.3,uProgress));
        vec3 col = photographic * (1.18*quiet) + vec3(0.0052, 0.0068, 0.0105);
        float chartW = min(0.45, 0.6 / uAspect);
        vec2 chartSize = vec2(chartW, chartW*uAspect*438.0/1024.0);
        vec2 centre = vec2(0.725, 0.787) + vec2(-0.032,0.017)*uProgress - uParallax*.0025;
        vec2 cuv = (uv - centre)/chartSize+0.5;
        if (min(cuv.x,cuv.y) >= 0.0 && max(cuv.x,cuv.y) <= 1.0) {
          vec4 stars = texture2D(uChart,cuv);
          float pulse = 0.94 + 0.06*sin(uSkyTime*0.48+cuv.x*6.0);
          float emphasis = mix(1.0,0.68,smoothstep(0.045,0.22,uProgress));
          col += stars.rgb * stars.a * (1.6 * pulse * emphasis);
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1000;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = new THREE.Vector2();
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', e => {
      pointer.set(2*e.clientX/window.innerWidth-1, 1-2*e.clientY/window.innerHeight);
    },{passive:true});
    window.addEventListener('blur', () => pointer.set(0,0));
  }
  let previousTime = 0;
  return { mesh, update(aspect, progress, time) {
    uniforms.uAspect.value = aspect;
    uniforms.uProgress.value = progress;
    uniforms.uSkyTime.value = reduced.matches ? 0 : time;
    if (reduced.matches) uniforms.uParallax.value.set(0,0);
    else uniforms.uParallax.value.lerp(pointer,1-Math.exp(-4*Math.max(0,time-previousTime)));
    previousTime = time;
  }};
}
