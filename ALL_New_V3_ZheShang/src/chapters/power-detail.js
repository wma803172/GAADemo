import * as THREE from 'three';
import { buildGAA } from '../models/gaa.js';
import { anchor, setTransparency } from '../models/common.js';
import { rbox } from '../models/geo.js';

export const NETS = {
  signal: 0x58dec9,
  vdd: 0xefac55,
  vss: 0x668cfa,
};
export const DEVICE_X = 0.75;
export const VIA_X = 1.54;
const SIZE = 0.31;
const DEVICE_Y = -0.23;
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
  setTransparency(mat,opacity < 0.997);
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
  let gateY;

  [-1, 1].forEach((side, i) => {
    const device = buildGAA();
    const m = device.metrics;
    const x = side * DEVICE_X;
    device.root.position.set(x, DEVICE_Y, 0);
    device.root.scale.setScalar(SIZE);
    // Face the source-side contact toward the camera; the same standalone
    // model names its negative-Z terminal the source.
    device.root.rotation.y = Math.PI;
    // The enlarged cutaway has a single shared substrate for the neighbouring devices.
    device.parts.base.visible = false;
    detailGroup.add(device.root);

    const source = device.anchors.source.parent;
    const capMesh = source.getObjectByName('sourceDrainContact');
    capMesh.updateWorldMatrix(true,false);
    const capBounds = new THREE.Box3().setFromObject(capMesh);
    const capCenter = capBounds.getCenter(new THREE.Vector3());
    const capY = capCenter.y;
    const sourceZ = capCenter.z;
    const capSide = side > 0 ? capBounds.max.x : capBounds.min.x;
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
      gateY = DEVICE_Y + SIZE * (m.cy + m.gateOuterH / 2);
      anchors.tsv = anchor(root, viaX, 0, sourceZ, 'tsv');
      anchors.sideContact = anchor(root, (viaX + capSide) / 2, capY, sourceZ, 'sideContact');
      anchors.sigGate = anchor(root, x, gateY, 0, 'sigGate');
      anchors.device = anchor(root, x, DEVICE_Y + m.cy * SIZE, 0.32, 'device');
    }
  });

  const gatePost = makeRod(detailGroup, signalMat, 0.052, 0.79);
  contactFootprint(detailGroup,DEVICE_X,gateY,0,.20,.048,.168,contactBarrier,'gateBarrier');
  contactFootprint(detailGroup,DEVICE_X,gateY+.028,0,.175,.035,.143,signalMat,'gateContact');
  const lowerGate = vec(DEVICE_X, gateY, 0);
  const upperGate = vec(DEVICE_X, 0, 0);
  const feed = vec(0, 0, 0);

  function update(frontPowerY, backPowerY, signalY, frontAlpha, backAlpha, fade) {
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
      backRods[i].visible = sleeves[i].visible = collars[i].visible = linerEnds[i].visible = backAlpha > 0.005;
      setAlpha(backFeedMat[i], backAlpha * fade);
      sleeveMats[i].opacity = 0.42 * backAlpha * fade;
    });
    anchors.tsv.position.y = (backPowerY + locals[1].landing.y) * 0.5;
  }
  return { update, anchors, locals };
}
