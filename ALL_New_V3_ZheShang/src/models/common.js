/* ---------------------------------------------------------------------------
   common.js — 模型共用的小零件
   --------------------------------------------------------------------------- */
import * as THREE from 'three';

/** 结构边缘的一圈冷光：Intel 渲染里那种"金属被灯打亮"的棱线 */
export function edgeGlow(mesh, color = 0x9fe6ff, opacity = 0.28) {
  const eg = new THREE.EdgesGeometry(mesh.geometry, 32);
  const line = new THREE.LineSegments(
    eg,
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  line.renderOrder = 3;
  mesh.add(line);
  return line;
}

/** 一个可以挂 DOM 标签的锚点 */
export function anchor(parent, x, y, z, tag) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData.tag = tag;
  parent.add(o);
  return o;
}

/** 让一组物体整体显隐 + 透明度 */
// Three r170 bakes OPAQUE into the material program. A change of opacity
// alone does not refresh that program when the same mesh changes render pass.
export function setTransparency(material, transparent) {
  if (material.transparent !== transparent) {
    material.transparent = transparent;
    material.needsUpdate = true;
  }
  material.depthWrite = !transparent;
}

export function makeFade(root) {
  return function fade(v) {
    const on = v > 0.003;
    root.visible = on;
    if (!on) return;
    root.traverse((o) => {
      const m = o.material;
      if (!m) return;
      const arr = Array.isArray(m) ? m : [m];
      for (const mm of arr) {
        if (mm.userData && mm.userData.noFade) continue;
        if (mm.userData.origTransparent === undefined) mm.userData.origTransparent = mm.transparent;
        const base = mm.userData.baseOpacity ?? 1;
        if (mm.uniforms && mm.uniforms.uOpacity) {
          mm.uniforms.uOpacity.value = base * v;
        } else {
          mm.opacity = base * v;
          const tr = v < 0.995;
          if (!mm.userData.fixedTransparent) {
            setTransparency(mm,tr || !!mm.userData.origTransparent);
          }
        }
      }
    });
  };
}
