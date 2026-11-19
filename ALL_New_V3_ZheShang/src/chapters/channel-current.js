import * as THREE from 'three';

// Draw a moving trace on the actual silicon. Using the mesh's own coordinates
// keeps it on the channel while the device rotates or the ribbons spread.
function trace(mesh, mode, gateLength, clock, strength, seed, gateScale) {
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const span = mode === 'planar' ? size.x : size.z;
  const shape = mode === 'planar' ? 0 : mode === 'fin' ? 1 : 2;
  const material = mesh.material;
  const originalCompile = material.onBeforeCompile;
  const originalKey = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    originalCompile.call(this, shader, renderer);
    Object.assign(shader.uniforms, {
      currentTime: clock, currentStrength: strength,
      currentSize: {value: size}, currentCenter: {value: center},
      currentGate: {value: gateLength / span}, gateScale, currentLane: {value: seed},
      currentMode: {value: shape},
    });
    shader.vertexShader = 'varying vec3 channelPos;\nuniform vec3 currentSize, currentCenter;\n' +
      shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\nchannelPos = (position - currentCenter) / currentSize + 0.5;');
    shader.fragmentShader = `
      varying vec3 channelPos;
      uniform float currentTime, currentStrength, currentGate, currentLane, currentMode, gateScale;
      float stripe(float at, float center, float width) {
        return 1.0 - smoothstep(width * .45, width + fwidth(at), abs(at - center));
      }
    ` + shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      bool planar = currentMode < 0.5;
      bool fin = currentMode > 0.5 && currentMode < 1.5;
      float path = planar ? channelPos.x : channelPos.z;
      float widthPos = planar ? channelPos.z : channelPos.x;
      float height = channelPos.y;
      float midTrack = stripe(widthPos,.50,.035);
      float topTracks = max(midTrack,max(stripe(widthPos,.27,.035),stripe(widthPos,.73,.035)));
      float lane = floor(widthPos * 4.0 + .45);
      float surface = topTracks * smoothstep(.93,.99,height);
      if (fin) {
        float sideTracks = max(stripe(height,.42,.029),stripe(height,.75,.029));
        surface = max(surface, sideTracks);
        if (height < .92) lane = floor(height * 5.0);
      } else if (!planar) {
        // Each thin ribbon also has a visible side edge.
        float edge = max(smoothstep(.93,.995,widthPos),1.0-smoothstep(.005,.07,widthPos));
        surface = max(surface, edge * stripe(height,.50,.18));
      }
      float travel = fract(path * 3.0 - currentTime * .88 + lane * .17 + currentLane * .29);
      float pulse = smoothstep(.24,.57,travel) * (1.0 - smoothstep(.66,.75,travel));
      float head = smoothstep(.52,.62,travel) * (1.0 - smoothstep(.65,.74,travel));
      float gate = 1.0 - smoothstep(currentGate * gateScale * .44, currentGate * gateScale * .54, abs(path-.5));
      float route = surface * currentStrength * (.62 + .38 * gate);
      // A dark line keeps the travelling head distinct on pale native silicon.
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.012,.12,.16), route * .75);
      totalEmissiveRadiance += route * (vec3(.015,.32,.40) * (.22 + pulse * 2.3)
                                   + vec3(.28,.76,.92) * head * 1.8);
    `);
  };
  material.customProgramCacheKey = () => originalKey + '/channel-current';
  material.needsUpdate = true;
}

export function channelCurrent(models) {
  const clock = {value: 0};
  const strength = {};
  const planarGateScale = {value: 1};
  const set = (model, mode, meshes, gateLength) => {
    const level = {value: 0};
    strength[model] = level;
    const gateScale = mode === 'planar' ? planarGateScale : {value: 1};
    meshes.forEach((mesh, i) => trace(mesh, mode, gateLength, clock, level, i, gateScale));
    const body = models[model].parts.gateBody.material;
    body.userData.baseOpacity = body.opacity;
  };
  const planar = models.planar.parts;
  set('planar', 'planar', [planar.channel], 2.35);
  planar.channelFlow.visible = false;
  // Treat the overlying oxide as a cutaway in the planar view. It otherwise
  // completely obscures the top of the inversion channel.
  planar.gateOxide.material.transparent = true;
  planar.gateOxide.material.depthWrite = false;
  planar.gateOxide.material.userData.baseOpacity = .22;
  for (const key of ['finfet', 'multiDense', 'multiPerf', 'n3']) {
    const model = models[key];
    set(key, 'fin', model.parts.fins.map(part => part.fin), model.gateLen);
    // The original animated sheaths used world coordinates and lit the
    // dielectric. All transient intensity now comes from the silicon.
    model.parts.dielectric.forEach(mesh => { mesh.visible = false; });
    model.parts.contactGlows.forEach(material => { material.userData.baseOpacity = 0; });
  }
  set('gaa', 'ribbon', models.gaa.parts.ribbons, models.gaa.metrics.gateLen);
  for (const device of [models.gaa, models.viaDev]) {
    const gate = device.parts.gateBody.material;
    gate.userData.baseOpacity = gate.opacity;
    device.parts.contactShells.forEach(mesh => {
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0x9dd8e5, roughness: .35, transparent: true, opacity: .13,
        depthWrite: false, side: THREE.FrontSide,
      });
      mesh.material.userData.baseOpacity = mesh.material.opacity;
    });
  }
  return {clock, strength, planarGateScale};
}
