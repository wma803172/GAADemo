import * as THREE from 'three';
import { rbox } from './geo.js';
import { satinMetal } from './specimen.js';
import { makeFade } from './common.js';

// The hero is an excerpt of two nets. The backside metal carries one selected
// supply to the S/D contact; the independent front input stops at the gate.
export function buildHeroInterconnect(device) {
  const { root: deviceRoot, anchors, metrics } = device;
  const root = new THREE.Group();
  root.name = 'heroInterconnect';
  deviceRoot.add(root);
  const gold = satinMetal(0xf8b563,0.29,0.57);
  gold.emissive.setHex(0x5e2e0a);
  gold.emissiveIntensity = 0.13;
  const signal = satinMetal(0xbbdadd,0.25,0.65);
  const barrier = satinMetal(0x718087,0.36,0.55);
  const oxide = new THREE.MeshPhysicalMaterial({
    color: 0xc7eaed, metalness:0.08, roughness:0.23, clearcoat:0.4,
    transparent:true, opacity:0.28, depthWrite:false, side:THREE.DoubleSide,
  });
  oxide.userData.baseOpacity = oxide.opacity;

  function track(name, x, y, z, w, h, d, mat = gold) {
    const mesh = new THREE.Mesh(rbox(w,h,d,Math.min(h,d,w)*0.17,2),mat);
    mesh.name = name;
    mesh.position.set(x,y,z);
    root.add(mesh);
    return mesh;
  }
  function plug(name,x,fromY,toY,z,lowerR,upperR,mat = gold) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(upperR,lowerR,toY-fromY,32),mat);
    mesh.name = name;
    mesh.position.set(x,(fromY+toY)/2,z);
    root.add(mesh);
    return mesh;
  }

  const source = anchors.source.parent;
  const cap = source.getObjectByName('sourceDrainContact');
  const capY = source.position.y + cap.position.y;
  const capX = (metrics.RIBBON_W + 0.60) / 2;
  const zSource = source.position.z;
  const viaX = capX + 0.53;
  const fineY = -0.79, coarseY = -1.17;
  const fineXs = [-2.16,-0.37,viaX,3.01];
  const coarseZs = [-2.55,0.19,3.38];
  for (const x of fineXs) track('backLocalMetal',x,fineY,0,0.22,0.115,7.78);
  for (const z of coarseZs) track('backDistributionMetal',0,coarseY,z,6.86,0.154,0.33);
  for (const x of fineXs) {
    for (const z of coarseZs) {
      plug('backInterlevelVia',x,coarseY+0.063,fineY-0.043,z,0.096,0.084);
    }
  }
  track('backViaLanding',viaX,fineY,zSource,0.38,0.13,0.36);
  plug('heroSupplyVia',viaX,fineY,capY,zSource,0.106,0.084);
  // A cutaway in the insulating sleeve reveals the metal core in the
  // exposed section; the rest of the via continues behind the silicon.
  const linerGeo = new THREE.CylinderGeometry(0.119,0.144,capY-fineY-0.064,48,1,true,
    Math.PI*0.54,Math.PI*1.38);
  const sleeve = new THREE.Mesh(linerGeo,oxide);
  sleeve.name = 'supplyDielectric';
  sleeve.position.set(viaX,(fineY+capY)/2,zSource);
  root.add(sleeve);
  track('localSideContact', (viaX+capX)/2,capY,zSource,viaX-capX+0.08,0.105,0.22);
  plug('localContactHead',viaX,capY-0.050,capY+0.071,zSource,0.130,0.135);

  const gateY = metrics.cy + metrics.gateOuterH / 2;
  const m0Y = gateY + 0.48, m1Y = m0Y + 0.25;
  track('gateContactBottom',0,gateY+0.025,0,0.44,0.062,0.41,barrier);
  plug('gateSignalContact',0,gateY+0.05,m0Y,0,0.119,0.156,signal);
  // Two consecutive orthogonal routing segments at different heights.
  // The remote end of the upper segment leaves the cropped specimen.
  const turnX = -1.58;
  track('signalLocalTrack',turnX/2,m0Y,0,-turnX+0.30,0.12,0.32,signal);
  plug('signalInterlevelVia',turnX,m0Y+0.052,m1Y-0.050,0,0.110,0.098,signal);
  track('signalUpperTrack',turnX,m1Y,-1.10,0.30,0.12,2.52,signal);

  const fade = makeFade(root);
  let previous = -1;
  return opacity => {
    if (opacity === previous) return;
    previous = opacity;
    fade(opacity);
  };
}
