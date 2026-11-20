import * as THREE from 'three';

// A metal line in a dielectric trench has a polished top, sloping sidewalls
// and small shoulders. Keep the end face flat even for very long lines.
export function trenchRail() {
  const section = new THREE.Shape();
  const corners = [[-.46,-.5],[.46,-.5],[.49,-.42],[.5,.30],[.47,.44],[.39,.5],[-.39,.5],[-.47,.44],[-.5,.30],[-.49,-.42]];
  corners.forEach(([x,y], i) => i ? section.lineTo(x,y) : section.moveTo(x,y));
  section.closePath();
  const geometry = new THREE.ExtrudeGeometry(section, {depth:1, bevelEnabled:false, steps:1, curveSegments:1});
  geometry.translate(0, 0, -.5);
  return geometry;
}

// A tapered barrier-lined plug. The wider ends are local landing surfaces
// inside the adjacent lines, not connections to lines on neighbouring tracks.
export function metalPlug() {
  const profile = [[0,-.5],[1.05,-.5],[1.05,-.44],[.76,-.415],[.70,-.38],[.88,.40],[1.04,.445],[1.04,.5],[0,.5]];
  return new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)), 16);
}

function planarExtrusion(shape, thickness, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth:thickness, steps:1, bevelEnabled:bevel > 0, bevelThickness:bevel,
    bevelSize:bevel, bevelSegments:2, curveSegments:16,
  });
  g.rotateX(-Math.PI/2);
  g.translate(0, -thickness/2, 0);
  return g;
}

// A remnant of the interlayer dielectric along the two uncut edges. Most of
// the insulator is removed from view so that crossings and vias stay legible.
export function dielectricEdgeGeometry(width, depth) {
  const x = width/2, z = depth/2, lip = .19;
  const shape = new THREE.Shape();
  shape.moveTo(-x,-z+.13);
  shape.lineTo(-x,z-.14);
  shape.lineTo(-x+.14,z);
  shape.lineTo(x-.18,z);
  shape.lineTo(x,z-.11);
  shape.lineTo(x,z-lip);
  shape.lineTo(-x+lip+.08,z-lip);
  shape.lineTo(-x+lip,z-lip-.08);
  shape.lineTo(-x+lip,-z+.04);
  shape.closePath();
  return planarExtrusion(shape, .075, .007);
}

function substrateSection(width, backZ, cutZ, locals, clearance) {
  const x = width/2, chamfer = .15;
  const shape = new THREE.Shape();
  shape.moveTo(-x+chamfer,-cutZ);
  // Expose one side of each sleeve at the polished section face. The groove
  // continues all the way down the substrate and does not fill the via.
  for (const {landing} of locals) {
    const z = -landing.z, r = clearance;
    shape.lineTo(landing.x-r,-cutZ);
    shape.lineTo(landing.x-r,z);
    shape.absarc(landing.x,z,r,Math.PI,0,true);
    shape.lineTo(landing.x+r,-cutZ);
  }
  shape.lineTo(x-chamfer,-cutZ);
  shape.lineTo(x,-cutZ+chamfer);
  shape.lineTo(x,backZ-chamfer);
  shape.lineTo(x-chamfer,backZ);
  shape.lineTo(-x+chamfer,backZ);
  shape.lineTo(-x,backZ-chamfer);
  shape.lineTo(-x,-cutZ+chamfer);
  shape.closePath();
  return shape;
}

function surfaceMaterial(color, roughness, metalness) {
  return new THREE.MeshStandardMaterial({color, roughness, metalness, envMapIntensity:.92});
}

// Shallow field-isolation motifs make the die surface readable beside the two
// active devices. The narrow strips are separated, below all metal contacts.
function isolationPattern(group,width,depth,locals,faceZ) {
  const tiles = [];
  const cellPitchX = .46, cellPitchZ = .40;
  for(let row=0; row<8; row++) {
    for(let col=0; col<12; col++) {
      const x = -width/2+.31+col*cellPitchX;
      const z = -depth/2+.31+row*cellPitchZ;
      if(z>faceZ-.12 || (Math.abs(x)<1.38 && Math.abs(z)<1.15)) continue;
      if(locals.some(({landing})=>Math.abs(x-landing.x)<.30 && Math.abs(z-landing.z)<.34)) continue;
      const seed = (col*17 + row*11)%9;
      // Small parallel oxide seams interspersed with longer field regions.
      const length = seed%3===0 ? .275 : .175;
      for(let i=0;i<2+(seed%2);i++) tiles.push([x+.014*(seed%3), z-.08+i*.057, length-(i%2)*.045]);
    }
  }
  const material = surfaceMaterial(0x66818c,.53,.26);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1,.007,.016),material,tiles.length);
  const matrix = new THREE.Matrix4();
  tiles.forEach(([x,z,len],i)=>{
    matrix.makeScale(len,1,1);
    matrix.setPosition(x,-.064,z);
    mesh.setMatrixAt(i,matrix);
  });
  mesh.computeBoundingSphere();
  group.add(mesh);
}

export function buildSectionedSilicon(width, depth, locals) {
  const root = new THREE.Group();
  root.name = 'sectionedDeviceSubstrate';
  const faceZ = locals[0].landing.z + .25;
  // From the device isolation down to backside insulation. The thin contrasting
  // interfaces make the depth of the silicon opening visible in close-up.
  const laminae = [
    {top:-.067, h:.065, color:0x526872, r:.45, m:.36, width:width, cut:faceZ, clearance:.134},
    {top:-.132, h:.012, color:0x8aabb2, r:.29, m:.49, width:width, cut:faceZ, clearance:.14},
    {top:-.144, h:.241, color:0x34424f, r:.30, m:.52, width:width, cut:faceZ, clearance:.139},
    {top:-.385, h:.019, color:0x8c98a3, r:.29, m:.49, width:width, cut:faceZ, clearance:.14},
    {top:-.404, h:.092, color:0x424957, r:.37, m:.29, width:width-.04, cut:faceZ-.02, clearance:.144},
  ];
  for (const s of laminae) {
    const face = substrateSection(s.width, depth/2, s.cut, locals, s.clearance);
    const mesh = new THREE.Mesh(planarExtrusion(face, s.h), surfaceMaterial(s.color,s.r,s.m));
    mesh.position.y = s.top - s.h/2;
    root.add(mesh);
  }
  isolationPattern(root,width,depth,locals,faceZ);
  return root;
}
