import * as THREE from 'three';
import { gateGlass, metal } from '../scene/materials.js';

// A bevelled rectangular section, with clipped corners. Keep the specified
// outer envelope so an existing contact, current track or label still lands
// at precisely the same position when a specimen is shown in close-up.
export function cutBlock(w, h, d, cut, bevel, shoulder=0) {
  const b = Math.min(bevel, h * 0.27, w * 0.14, d * 0.14);
  const positions = [];
  const ring = (inset, y) => {
    const a = w / 2 - inset, z = d / 2 - inset;
    const c = Math.min(Math.max(0.001, cut - inset * 0.45), a * 0.6, z * 0.6);
    return [[-a+c,y,-z],[a-c,y,-z],[a,y,-z+c],[a,y,z-c],
      [a-c,y,z],[-a+c,y,z],[-a,y,z-c],[-a,y,-z+c]];
  };
  const inset = Math.min(shoulder, w*0.16, d*0.16);
  const rings = [ring(b,-h/2),ring(0,-h/2+b)];
  if (inset>0) rings.push(ring(0,h/2-Math.min(h*0.25,inset*1.4)-b));
  rings.push(ring(inset,h/2-b),ring(inset+b,h/2));
  const top=rings[rings.length-1];
  for (let i=0; i<8; i++) {
    const k=(i+1)%8;
    positions.push(0,-h/2,0,...rings[0][i],...rings[0][k]);
    positions.push(0,h/2,0,...top[k],...top[i]);
    for (let j=0; j<rings.length-1; j++) {
      const lower=rings[j], upper=rings[j+1];
      positions.push(...lower[i],...upper[i],...upper[k],...lower[i],...upper[k],...lower[k]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.computeVertexNormals();
  const normals=geometry.attributes.normal,uv=[];
  for(let i=0;i<normals.count;i++){
    const p=i*3;
    if(Math.abs(normals.getY(i))>0.65) uv.push(positions[p]/w+0.5,positions[p+2]/d+0.5);
    else uv.push(Math.abs(normals.getX(i))>0.6?positions[p+2]/d+0.5:positions[p]/w+0.5,positions[p+1]/h+0.5);
  }
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  return geometry;
}

let metalGrain;
export function surfaceMetal(color, roughness=0.36) {
  if(!metalGrain){
    // A deterministic roughness map changes reflected highlights without
    // adding lines that could be mistaken for another electrical connection.
    const w=128,h=128,data=new Uint8Array(w*h*4);
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        const grain=Math.round(207+21*Math.sin(y*1.73)+12*Math.cos(y*0.47+x*0.07)+7*Math.sin(x*2.4+y*2.9));
        data.set([grain,grain,grain,255],i);
      }
    }
    metalGrain=new THREE.DataTexture(data,w,h);
    metalGrain.generateMipmaps=true;
    metalGrain.minFilter=THREE.LinearMipmapLinearFilter;
    metalGrain.magFilter=THREE.LinearFilter;
    metalGrain.needsUpdate=true;
  }
  return metal(color, {roughness, extra:{roughnessMap:metalGrain,metalness:0.58,clearcoat:0.28,clearcoatRoughness:0.25}});
}

export function gateSection() {
  const m=surfaceMetal(0xc5d1cd,0.31);
  m.transparent=true;
  m.opacity=0.32;
  m.depthWrite=false;
  m.side=THREE.FrontSide;
  m.userData.baseOpacity=m.opacity;
  return m;
}

export function cutawayGate(color, opacity) {
  const m = gateGlass({color,opacity,extra:{side:THREE.FrontSide,roughness:0.13,clearcoatRoughness:0.15}});
  m.userData.baseOpacity=opacity;
  return m;
}

// The same finish on every presentation plinth makes successive devices
// read as a series. The narrow reveal belongs to the display base, below
// the silicon; it does not add another layer to the represented device.
export function finishPlinth(mesh, w, h, d) {
  const edge = new THREE.Mesh(cutBlock(w+0.008, h*0.11, d+0.008, 0.22, 0.012),
    surfaceMetal(0x526875,0.44));
  edge.position.y=h*0.15;
  mesh.add(edge);
}
