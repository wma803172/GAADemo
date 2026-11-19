import * as THREE from 'three';
import { buildGAA } from '../models/gaa.js';
import { anchor } from '../models/common.js';

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
    color, emissive: color, emissiveIntensity: glow,
    metalness: 0.54, roughness: 0.28,
  });
}

export function setAlpha(mat, opacity) {
  mat.opacity = opacity;
  mat.transparent = opacity < 0.997;
  mat.depthWrite = !mat.transparent;
}

// Conductors are cylinders oriented between their actual two landing points.
export function span(mesh, a, b) {
  mesh.position.addVectors(a, b).multiplyScalar(0.5);
  mesh.scale.y = a.distanceTo(b);
  mesh.quaternion.setFromUnitVectors(Y_AXIS, direction.subVectors(b, a).normalize());
}
const direction = new THREE.Vector3();

function makeRod(group, mat, radius) {
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 14), mat);
  group.add(rod);
  return rod;
}

const vec = (x, y, z) => new THREE.Vector3(x, y, z);

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
  const frontRods = [], backRods = [], collars = [], sleeves = [];
  const sleeveMats = [];
  const detailGroup = new THREE.Group();
  root.add(detailGroup);
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
    const capCenter = capMesh.getWorldPosition(new THREE.Vector3());
    const capY = capCenter.y;
    const sourceZ = capCenter.z;
    const capSide = x + side * SIZE * (m.RIBBON_W + 0.6) / 2;
    const viaX = side * VIA_X;
    const mat = i === 1 ? vdd : vss;
    const cap = vec(capSide, capY, sourceZ);
    const landing = vec(viaX, capY, sourceZ);
    const local = makeRod(detailGroup, mat, 0.080);
    span(local, landing, cap);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.070, 16), mat);
    pad.position.copy(landing);
    detailGroup.add(pad);

    frontRods.push(makeRod(detailGroup, frontFeedMat[i], 0.070));
    backRods.push(makeRod(detailGroup, backFeedMat[i], 0.094));
    const jacketMat = new THREE.MeshStandardMaterial({
      color: 0xaacddd, transparent: true, opacity: 0.13, depthWrite: false,
      metalness: 0.05, roughness: 0.38, side: THREE.DoubleSide,
    });
    sleeveMats.push(jacketMat);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 1, 20, 1, true), jacketMat);
    detailGroup.add(sleeve);
    sleeves.push(sleeve);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.157, 0.157, 0.065, 20), backFeedMat[i]);
    detailGroup.add(foot);
    collars.push(foot);
    locals.push({ landing, cap });

    if (side === 1) {
      gateY = DEVICE_Y + SIZE * (m.cy + m.gateOuterH / 2);
      anchors.tsv = anchor(root, viaX, 0, sourceZ, 'tsv');
      anchors.sideContact = anchor(root, (viaX + capSide) / 2, capY, sourceZ, 'sideContact');
      anchors.sigGate = anchor(root, x, gateY, 0, 'sigGate');
      anchors.device = anchor(root, x, DEVICE_Y + m.cy * SIZE, 0.32, 'device');
    }
  });

  const gatePost = makeRod(detailGroup, signalMat, 0.065);
  const gateContact = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.068, 0.18), signalMat);
  gateContact.position.set(DEVICE_X, gateY, 0);
  detailGroup.add(gateContact);
  const lowerGate = vec(DEVICE_X, gateY, 0);
  const upperGate = vec(DEVICE_X, 0, 0);
  const feed = vec(0, 0, 0);

  function update(frontPowerY, backPowerY, signalY, frontAlpha, backAlpha, fade) {
    upperGate.y = signalY;
    span(gatePost, lowerGate, upperGate);
    setAlpha(signalMat, fade);
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
      span(sleeves[i], feed, landing);
      collars[i].position.copy(feed);
      backRods[i].visible = sleeves[i].visible = collars[i].visible = backAlpha > 0.005;
      setAlpha(backFeedMat[i], backAlpha * fade);
      sleeveMats[i].opacity = 0.14 * backAlpha * fade;
    });
    anchors.tsv.position.y = (backPowerY + locals[1].landing.y) * 0.5;
  }
  return { update, anchors, locals };
}
