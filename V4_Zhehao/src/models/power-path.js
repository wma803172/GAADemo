import * as THREE from 'three';
import { anchor } from './common.js';
import { rbox, extrude, roundedRectShape, roundedRectPath, shellZ } from './geo.js';

export const NETS = {
  signal: 0x58dec9,
  vdd: 0xefac55,
  vss: 0x668cfa,
};
export const DEVICE_X = 0.75;
export const VIA_X = 1.54;
const CONTACT_Y = 0.65;
const CONTACT_Z = 0.85;
const GATE_Y = 0.74;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export function conductor(color, glow = 0.55) {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: glow * 0.23,
    metalness: 0.72, roughness: 0.32, envMapIntensity: 1.14,
  });
}

export function setAlpha(mat, opacity) {
  mat.visible = opacity > .002;
  mat.opacity = opacity;
  const transparent = opacity < 0.997;
  if (mat.transparent !== transparent) {
    mat.transparent = transparent;
    mat.needsUpdate = true;
  }
  mat.depthWrite = !transparent;
}

// Conductors are cylinders oriented between their actual two landing points.
export function span(mesh, a, b) {
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.y = a.distanceTo(b);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.subVectors(b, a).normalize());
}
const direction = new THREE.Vector3();

function makeRod(group, mat, radius, taper = 1) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * taper, 1, 28), mat);
  group.add(rod);
  return rod;
}

const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function contactFootprint(group, x, y, z, w, h, d, mat, name) {
  const mesh = new THREE.Mesh(rbox(w,h,d,.018,2),mat);
  mesh.position.set(x,y,z);
  mesh.name = name;
  group.add(mesh);
  return mesh;
}

// A section of the two neighbouring devices shares the silicon slab beneath it.
// The gate has four slots; the terminal pads sit outside the gate along Z.
function addDevice(group, x, terminalMetal) {
  const active = conductor(0xe6c49c, 0.2);
  const gateMetal = conductor(0xa3b9c9, 0.27);
  const dielectric = conductor(0x91ccda, 0.18);
  const outline = roundedRectShape(0.78, GATE_Y, 0.055);
  const oxideGeometry = shellZ(0.53, 0.070, 0.35, 0.018);
  for (let i = 0; i < 4; i++) {
    const y = 0.12 + i * 0.163;
    contactFootprint(group, x, y, 0, 0.52, 0.064, 1.72, active, 'siliconRibbon');
    const slot = roundedRectPath(0.573, 0.110, 0.032);
    const shifted = slot.getPoints(8).map(p => new THREE.Vector2(p.x, p.y + y - GATE_Y / 2));
    outline.holes.push(new THREE.Path(shifted));
    const insulation = new THREE.Mesh(oxideGeometry, dielectric);
    insulation.position.set(x, y, 0);
    group.add(insulation);
  }
  const gate = new THREE.Mesh(extrude(outline, 0.31, {bevel:0.004}), gateMetal);
  gate.position.set(x,GATE_Y / 2,0);
  group.add(gate);
  for (const direction of [-1, 1]) {
    contactFootprint(group,x,0.31,direction * CONTACT_Z,0.61,0.62,0.29,active,'terminal');
    contactFootprint(group,x,CONTACT_Y,direction * CONTACT_Z,0.66,0.09,0.29,terminalMetal,'terminalCap');
  }
}

// Two separate devices let the drawing show VDD and VSS without suggesting that
// the two supplies are connected across one transistor or along a single via.
export function buildDeviceDetail(root) {
  const locals = [];
  const anchors = {};
  const vdd = conductor(NETS.vdd);
  const vss = conductor(NETS.vss);
  const signalMat = conductor(NETS.signal, 0.58);
  const frontFeedMat = [vss, vdd].map(mat => mat.clone());
  const backFeedMat = [vss, vdd].map(mat => mat.clone());
  const frontRods = [], backRods = [], collars = [], sleeves = [], linerEnds = [];
  const sleeveMats = [];
  const detailGroup = new THREE.Group();
  root.add(detailGroup);
  const contactBarrier = conductor(0x687886,0.16);
  const passivation = new THREE.MeshStandardMaterial({
    color:0xb4c3c5, roughness:0.36, metalness:0.17,
  });
  [-1, 1].forEach((side, i) => {
    const x = side * DEVICE_X;
    addDevice(detailGroup, x, contactBarrier);
    const capY = CONTACT_Y;
    const sourceZ = CONTACT_Z;
    const capSide = x + side * 0.33;
    const viaX = side * VIA_X;
    const mat = i === 1 ? vdd : vss;
    const cap = vec(capSide, capY, sourceZ);
    const landing = vec(viaX, capY, sourceZ);
    // The local contact is a rectangular metallization joined to the side of
    // the source cap. The net-coloured cap and its thin neutral barrier share
    // the same footprint. The small overhang overlaps the plug top.
    const bridgeLength = Math.abs(cap.x - landing.x) + .09;
    const bridgeX = (cap.x + landing.x) / 2;
    contactFootprint(detailGroup,bridgeX,capY-.024,sourceZ,bridgeLength+.014,.068,.190,contactBarrier,'contactBarrier');
    contactFootprint(detailGroup,bridgeX,capY+.006,sourceZ,bridgeLength,.076,.166,mat,'sourceContactBridge');
    contactFootprint(detailGroup,viaX,capY+.009,sourceZ,.205,.082,.204,mat,'plugLanding');

    frontRods.push(makeRod(detailGroup, frontFeedMat[i], 0.060, 0.90));
    backRods.push(makeRod(detailGroup, backFeedMat[i], 0.081, 0.82));
    backRods[i].name = i ? 'VDDnanoTSV' : 'VSSnanoTSV';
    const jacketMat = new THREE.MeshStandardMaterial({
      color:0xb3cad7, transparent:true, opacity:0.39, depthWrite:false,
      metalness:0.14, roughness:0.26, side:THREE.DoubleSide,
    });
    sleeveMats.push(jacketMat);
    // Open the near quadrant of the dielectric to expose the metal fill.
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(.117,.109,1,40,1,true,Math.PI*.47,Math.PI*1.42),jacketMat);
    detailGroup.add(sleeve);
    sleeves.push(sleeve);
    const foot = contactFootprint(detailGroup,viaX,0,sourceZ,.232,.055,.196,backFeedMat[i],'backMetalLanding');
    collars.push(foot);
    const liner = new THREE.Mesh(new THREE.RingGeometry(.081,.118,40,1,Math.PI*.03,Math.PI*1.42),passivation);
    liner.rotation.x = -Math.PI/2;
    liner.position.set(viaX,0,sourceZ);
    detailGroup.add(liner);
    linerEnds.push(liner);
    locals.push({ landing, cap });

    if (side === 1) {
      anchors.tsv = anchor(root, viaX, 0, sourceZ, 'tsv');
      anchors.sideContact = anchor(root, (viaX + capSide) / 2, capY, sourceZ, 'sideContact');
      anchors.sigGate = anchor(root, x, GATE_Y, 0, 'sigGate');
      anchors.device = anchor(root, x, 0.34, 0.32, 'device');
    }
  });

  const gatePost = makeRod(detailGroup, signalMat, 0.052, 0.79);
  contactFootprint(detailGroup,DEVICE_X,GATE_Y,0,.20,.048,.168,contactBarrier,'gateBarrier');
  contactFootprint(detailGroup,DEVICE_X,GATE_Y+.028,0,.175,.035,.143,signalMat,'gateContact');
  const lowerGate = vec(DEVICE_X, GATE_Y, 0);
  const upperGate = vec(DEVICE_X, 0, 0);
  const feed = vec(0, 0, 0);

  function update(frontPowerY, backPowerY, signalY, frontAlpha, backAlpha, viaAlpha, fade) {
    upperGate.y = signalY;
    span(gatePost, lowerGate, upperGate);
    setAlpha(signalMat, fade);
    setAlpha(contactBarrier,fade);
    setAlpha(passivation,fade);
    setAlpha(vdd, fade);
    setAlpha(vss, fade);
    locals.forEach(({ landing }, i) => {
      feed.copy(landing);
      feed.y = frontPowerY;
      span(frontRods[i], feed, landing);
      frontRods[i].visible = frontAlpha > 0.005;
      setAlpha(frontFeedMat[i], frontAlpha * fade);
      feed.y = backPowerY;
      span(backRods[i], feed, landing);
      collars[i].position.copy(feed);
      // The sleeve lines the opening through the sectioned substrate. Its ends
      // stay on the cut faces as the backside interconnect spreads apart.
      sleeves[i].scale.y = .43;
      sleeves[i].position.set(landing.x,-.281,landing.z);
      linerEnds[i].position.y = -.064;
      backRods[i].visible = sleeves[i].visible = viaAlpha > 0.005;
      collars[i].visible = linerEnds[i].visible = backAlpha > 0.005;
      setAlpha(backFeedMat[i], viaAlpha * fade);
      sleeveMats[i].opacity = 0.42 * viaAlpha * fade;
    });
    anchors.tsv.position.y = (backPowerY + locals[1].landing.y) * 0.5;
  }
  return { update, anchors, locals };
}
