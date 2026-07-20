import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';

const perlin = new ImprovedNoise();

function fbm(x, z, oct = 4) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * perlin.noise(x * freq, z * freq, 7.31 + i * 13.7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm;
}
const ridged = (x, z, oct = 4) => 1 - Math.abs(fbm(x, z, oct));

// ---------- общие блоки ----------
function skyDome(top, bottom) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(280, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bottom) } },
      vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 bot; varying vec3 vP;
        void main(){ float h=clamp(normalize(vP).y,0.0,1.0); gl_FragColor=vec4(mix(bot,top,pow(h,0.55)),1.0); }`,
    })
  );
}

function base({ envMap, skyTop, skyBot, fog, fogNear = 35, fogFar = 170, amb = 0x8899aa, ambI = 0.55, sun = 0xfff2d8, sunI = 2, sunPos = [35, 45, 15], envI = 1 }) {
  const scene = new THREE.Scene();
  scene.environment = envMap;
  scene.environmentIntensity = envI;
  scene.fog = new THREE.Fog(fog, fogNear, fogFar);
  scene.add(skyDome(skyTop, skyBot));
  scene.add(new THREE.AmbientLight(amb, ambI));
  const dir = new THREE.DirectionalLight(sun, sunI);
  dir.position.set(...sunPos);
  scene.add(dir);
  return scene;
}

function terrain({ size = 150, seg = 150, height, paint }) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = height(x, z);
    pos.setY(i, h);
    paint(c, h, x, z);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0 }));
}

function water(radius, color, y = 0) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 64),
    new THREE.MeshStandardMaterial({ color, roughness: 0.07, metalness: 0.55, envMapIntensity: 1.4, transparent: true, opacity: 0.96 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

// хвойный лес: инстансы ствол + крона (две конус-юбки)
function conifers({ count, sample, trunk = 0x3d2c1e, crown = 0x1e4034, scaleY = 1 }) {
  const g = new THREE.Group();
  const tGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.8, 5);
  const cGeo = new THREE.ConeGeometry(0.55, 2.3, 6);
  const tMat = new THREE.MeshStandardMaterial({ color: trunk, roughness: 1, flatShading: true });
  const cMat = new THREE.MeshStandardMaterial({ color: crown, roughness: 1, flatShading: true });
  const trunks = new THREE.InstancedMesh(tGeo, tMat, count);
  const crowns = new THREE.InstancedMesh(cGeo, cMat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let placed = 0, guard = 0;
  while (placed < count && guard++ < count * 30) {
    const spot = sample();
    if (!spot) continue;
    const sc = (0.7 + Math.random() * 0.8) * scaleY;
    p.set(spot.x, spot.y + 0.35 * sc, spot.z);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(placed, m);
    p.y = spot.y + (0.7 + 1.15) * sc;
    m.compose(p, q, s);
    crowns.setMatrixAt(placed, m);
    placed++;
  }
  trunks.count = crowns.count = placed;
  g.add(trunks, crowns);
  return g;
}

function jitterGeo(geo, amt) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(
      i,
      pos.getX(i) + (Math.random() - 0.5) * amt,
      pos.getY(i) + (Math.random() - 0.5) * amt * 0.6,
      pos.getZ(i) + (Math.random() - 0.5) * amt
    );
  }
  geo.computeVertexNormals();
  return geo;
}

function particles(count, spread, y0, y1, color, size, glowTex) {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = (Math.random() - 0.5) * spread;
    arr[i * 3 + 1] = y0 + Math.random() * (y1 - y0);
    arr[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return new THREE.Points(geo, new THREE.PointsMaterial({
    map: glowTex(), color, size, transparent: true, opacity: 0.45,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
}

const box = (w, h, d, color, opts = {}) =>
  new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts }));

// ============================================================
// СЦЕНЫ
// ============================================================

function charyn(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x35284e, skyBot: 0xe8935a, fog: 0xc27a50, fogNear: 40, fogFar: 190,
    amb: 0x8a5a60, ambI: 0.7, sun: 0xffab66, sunI: 2.3, sunPos: [45, 14, -30], envI: 0.5,
  });

  const centerX = (z) => 6 * Math.sin(z * 0.045) + 2.4 * Math.sin(z * 0.11);
  const strata = [0x8c3b22, 0xb5552c, 0xd9784a, 0xe0956b];
  const c2 = new THREE.Color();

  scene.add(terrain({
    size: 170, seg: 170,
    height: (x, z) => {
      const d = Math.abs(x - centerX(z));
      const wall = THREE.MathUtils.smoothstep(d, 3.6, 12);
      let h = wall * 11 + fbm(x * 0.05, z * 0.05, 4) * 2.2 * (0.4 + wall);
      h = Math.round(h / 1.55) * 1.55 * 0.82 + h * 0.18; // террасы
      return h + 0.25 * fbm(x * 0.3, z * 0.3, 2);
    },
    paint: (c, h, x, z) => {
      if (h < 0.9) { c.setHex(0xc77e4e); }
      else {
        c.setHex(strata[Math.abs(Math.floor(h / 1.55)) % strata.length]);
        c2.setHex(0x5e2714);
        c.lerp(c2, 0.18 * (0.5 + 0.5 * fbm(x * 0.2, z * 0.2, 2)));
      }
    },
  }));

  // отдельные останцы-«замки»
  const pil = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const z = -60 + i * 8 + Math.random() * 5;
    const side = Math.random() > 0.5 ? 1 : -1;
    const x = centerX(z) + side * (4.6 + Math.random() * 2.4);
    const hgt = 3 + Math.random() * 5.5;
    const geo = jitterGeo(new THREE.CylinderGeometry(0.6 + Math.random() * 0.7, 1 + Math.random() * 0.9, hgt, 7, 3), 0.3);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: strata[i % strata.length], flatShading: true, roughness: 1,
    }));
    mesh.position.set(x, hgt / 2 + 0.2, z);
    pil.add(mesh);
  }
  scene.add(pil);

  const dust = particles(90, 90, 0.5, 8, 0xffc088, 0.5, glowTex);
  scene.add(dust);

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex('rgba(255,190,120,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sun.scale.setScalar(70);
  sun.position.set(120, 26, -140);
  scene.add(sun);

  return {
    scene,
    camPos: new THREE.Vector3(centerX(20) + 1, 3.4, 20),
    target: new THREE.Vector3(centerX(-8), 4.2, -8),
    bounds: { x: 70, z: 70 }, speed: 11, maxPolar: 1.58, maxDist: 70,
    bloom: { strength: 0.5, threshold: 0.75, radius: 0.6 },
    tick: (t) => { dust.rotation.y = t * 0.02; },
  };
}

function bao(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x2e6ba8, skyBot: 0xc4dcec, fog: 0xa9c6d8, fogNear: 75, fogFar: 280,
    amb: 0x9fb8d0, ambI: 0.7, sun: 0xfff8e8, sunI: 2.4, sunPos: [40, 55, 12], envI: 0.9,
  });

  const hMap = (x, z) => {
    const r = Math.hypot(x, z);
    if (r < 16) return -0.6;
    const rise = Math.pow(THREE.MathUtils.smoothstep(r, 16, 60), 1.35) * 30;
    const ridge = ridged(x * 0.045, z * 0.045, 4) * 7 * THREE.MathUtils.smoothstep(r, 15, 32);
    return rise + ridge + fbm(x * 0.12, z * 0.12, 3) * 1.4;
  };
  const snow = new THREE.Color(0xe8eff5), rock = new THREE.Color(0x525f6b),
        grass = new THREE.Color(0x47664f), scree = new THREE.Color(0x6b7784);
  scene.add(terrain({
    size: 160, seg: 160, height: hMap,
    paint: (c, h, x, z) => {
      const n = fbm(x * 0.15, z * 0.15, 2);
      if (h < 2.5) c.copy(scree).lerp(grass, 0.5 + n * 0.4);
      else if (h < 9) c.copy(rock).lerp(grass, Math.max(0, 0.5 - h * 0.06) + n * 0.25);
      else c.copy(rock).lerp(snow, THREE.MathUtils.smoothstep(h, 9, 14) * (0.8 + n * 0.2));
    },
  }));

  scene.add(water(16, 0x189ec4, 0.05));

  scene.add(conifers({
    count: 240,
    sample: () => {
      const a = Math.random() * Math.PI * 2, r = 17.5 + Math.random() * 13;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = hMap(x, z);
      if (z > 14 && Math.abs(x) < 10) return null; // коридор для камеры
      return y < 6 ? { x, y, z } : null;
    },
    crown: 0x17382c,
  }));

  return {
    scene,
    camPos: new THREE.Vector3(0, 7, 31),
    target: new THREE.Vector3(0, 1.5, -2),
    bounds: { x: 55, z: 55 }, speed: 10, maxPolar: 1.5, maxDist: 60,
    bloom: { strength: 0.3, threshold: 0.85, radius: 0.4 },
  };
}

function kaindy(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x26424e, skyBot: 0xa3bfb8, fog: 0x86a49a, fogNear: 42, fogFar: 150,
    amb: 0x88a098, ambI: 0.75, sun: 0xf2f6e8, sunI: 1.7, sunPos: [-30, 40, 20], envI: 0.7,
  });

  const hMap = (x, z) => {
    const r = Math.hypot(x * 1.1, z * 0.85);
    if (r < 10.5) return -1;
    return Math.pow(THREE.MathUtils.smoothstep(r, 10.5, 48), 1.3) * 22 +
      ridged(x * 0.05, z * 0.05, 4) * 5 * THREE.MathUtils.smoothstep(r, 10, 26) +
      fbm(x * 0.13, z * 0.13, 3) * 1.2;
  };
  const moss = new THREE.Color(0x3d5c46), rock = new THREE.Color(0x5d6b70), snow = new THREE.Color(0xe8eff2);
  scene.add(terrain({
    size: 140, seg: 150, height: hMap,
    paint: (c, h, x, z) => {
      const n = fbm(x * 0.2, z * 0.2, 2);
      if (h < 6) c.copy(moss).lerp(rock, 0.25 + n * 0.3);
      else c.copy(rock).lerp(snow, THREE.MathUtils.smoothstep(h, 10, 16));
    },
  }));

  scene.add(water(10.5, 0x14806e, 0.05));

  // затонувший лес — сухие стволы из воды
  const deadGeo = new THREE.CylinderGeometry(0.045, 0.11, 1, 5);
  const dead = new THREE.InstancedMesh(deadGeo, new THREE.MeshStandardMaterial({ color: 0xb9bfc4, roughness: 1, flatShading: true }), 46);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 8;
    const h = 2.2 + Math.random() * 3.6;
    e.set((Math.random() - 0.5) * 0.14, 0, (Math.random() - 0.5) * 0.14);
    q.setFromEuler(e);
    m.compose(new THREE.Vector3(Math.cos(a) * r * 1.15, h / 2 - 0.4, Math.sin(a) * r * 0.8), q, new THREE.Vector3(1, h, 1));
    dead.setMatrixAt(i, m);
  }
  scene.add(dead);

  scene.add(conifers({
    count: 200,
    sample: () => {
      const a = Math.random() * Math.PI * 2, r = 12.5 + Math.random() * 16;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = hMap(x, z);
      if (z > 10 && Math.abs(x) < 9) return null; // коридор для камеры
      return y < 6.5 ? { x, y, z } : null;
    },
    crown: 0x1c3d30,
  }));

  // туман — крупные мягкие спрайты
  const mist = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex('rgba(210,228,220,0.16)'), transparent: true, depthWrite: false,
    }));
    s.scale.set(26 + Math.random() * 16, 8, 1);
    s.position.set((Math.random() - 0.5) * 34, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 30);
    s.userData.v = 0.12 + Math.random() * 0.25;
    mist.add(s);
  }
  scene.add(mist);

  return {
    scene,
    camPos: new THREE.Vector3(0, 5.5, 20),
    target: new THREE.Vector3(0, 0.8, 0),
    bounds: { x: 45, z: 45 }, speed: 9, maxPolar: 1.5, maxDist: 50,
    bloom: { strength: 0.35, threshold: 0.82, radius: 0.5 },
    tick: (t) => {
      mist.children.forEach((s, i) => {
        s.position.x = ((s.position.x + s.userData.v * 0.016 + 17 + i) % 34) - 17 - i;
      });
    },
  };
}

function baiterek(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x0a1130, skyBot: 0x1d2c5e, fog: 0x0d1530, fogNear: 40, fogFar: 200,
    amb: 0x39466e, ambI: 0.7, sun: 0x8aa6ff, sunI: 0.7, sunPos: [-20, 40, 30], envI: 0.35,
  });

  // звёзды
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(500 * 3);
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, y = 30 + Math.random() * 160, r = 120 + Math.random() * 120;
    sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = y; sp[i * 3 + 2] = Math.sin(a) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.7, color: 0xbfd0ff, transparent: true, opacity: 0.8 })));

  // земля и бульвар
  const ground = box(240, 1, 240, 0x0b0f1a);
  ground.position.y = -0.5;
  scene.add(ground);
  const blvd = box(9, 0.12, 130, 0x1d2436, { roughness: 0.6, metalness: 0.3 });
  scene.add(blvd);

  // здания + окна-огни
  const bCount = 240;
  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshStandardMaterial({ color: 0x0e1526, roughness: 0.5, metalness: 0.6 });
  const buildings = new THREE.InstancedMesh(bGeo, bMat, bCount);
  const m4 = new THREE.Matrix4(), q0 = new THREE.Quaternion();
  const winGold = [], winCyan = [];
  for (let i = 0; i < bCount; i++) {
    const side = i % 2 ? 1 : -1;
    const bx = side * (8 + Math.random() * 42);
    const bz = (Math.random() - 0.5) * 120;
    const w = 2.4 + Math.random() * 3.6, d = 2.4 + Math.random() * 3.6;
    const proximity = 1 - Math.min(1, (Math.abs(bx) + Math.abs(bz)) / 100);
    const h = 2.5 + Math.random() * 6 + proximity * 14;
    m4.compose(new THREE.Vector3(bx, h / 2, bz), q0, new THREE.Vector3(w, h, d));
    buildings.setMatrixAt(i, m4);
    const wins = 6 + Math.floor(Math.random() * 14);
    for (let k = 0; k < wins; k++) {
      const arr = Math.random() > 0.35 ? winGold : winCyan;
      arr.push(
        bx + (Math.random() - 0.5) * w * 1.02,
        0.5 + Math.random() * (h - 1),
        bz + (Math.random() - 0.5) * d * 1.02
      );
    }
  }
  scene.add(buildings);
  const mkWins = (arr, color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({
      size: 0.16, color, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
  };
  scene.add(mkWins(winGold, 0xffd580), mkWins(winCyan, 0x7fd8f0));

  // Байтерек
  const white = new THREE.MeshStandardMaterial({ color: 0xe8eefa, roughness: 0.35, metalness: 0.5, emissive: 0xb8c8e8, emissiveIntensity: 0.22 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 11, 12), white);
  trunk.position.y = 5.5;
  scene.add(trunk);
  const lattice = new THREE.Mesh(
    new THREE.CylinderGeometry(2.9, 0.42, 4.2, 14, 3, true),
    new THREE.MeshBasicMaterial({ color: 0xdce8ff, wireframe: true, transparent: true, opacity: 0.8 })
  );
  lattice.position.y = 9.4;
  scene.add(lattice);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(1.75, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0xf5c842, roughness: 0.15, metalness: 0.85, emissive: 0xf5b325, emissiveIntensity: 1.25 })
  );
  orb.position.y = 11.9;
  scene.add(orb);
  const orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex('rgba(255,205,90,0.85)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  orbHalo.scale.setScalar(9);
  orbHalo.position.y = 11.9;
  scene.add(orbHalo);

  // фонари бульвара
  const lampPts = [];
  for (let z = -60; z <= 60; z += 6) { lampPts.push(-5.2, 1.6, z, 5.2, 1.6, z); }
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampPts, 3));
  scene.add(new THREE.Points(lampGeo, new THREE.PointsMaterial({
    size: 0.35, color: 0xffca6a, map: glowTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  })));

  return {
    scene,
    camPos: new THREE.Vector3(11, 5.5, 24),
    target: new THREE.Vector3(0, 8, 0),
    bounds: { x: 60, z: 60 }, speed: 13, maxPolar: 1.53, maxDist: 70,
    bloom: { strength: 1.0, threshold: 0.45, radius: 0.65 },
    tick: (t) => {
      orb.rotation.y = t * 0.3;
      orbHalo.material.opacity = 0.75 + 0.25 * Math.sin(t * 1.8);
    },
  };
}

function turkestan(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x46395f, skyBot: 0xf0a96a, fog: 0xd8956a, fogNear: 50, fogFar: 210,
    amb: 0xa08070, ambI: 0.75, sun: 0xffc080, sunI: 2.1, sunPos: [-50, 18, -35], envI: 0.55,
  });

  const sand = new THREE.Color(0xc9a876), sand2 = new THREE.Color(0xa9885c);
  scene.add(terrain({
    size: 200, seg: 120,
    height: (x, z) => (Math.hypot(x, z) < 20 ? 0 : fbm(x * 0.04, z * 0.04, 4) * 1.8),
    paint: (c, h, x, z) => c.copy(sand).lerp(sand2, 0.5 + 0.5 * fbm(x * 0.09, z * 0.09, 3)),
  }));

  const g = new THREE.Group();
  // платформа
  const plat = box(30, 0.8, 22, 0xb89b70);
  plat.position.y = 0.4;
  g.add(plat);

  const brick = 0xc7ac80;
  // основной объём
  const body = box(11, 8, 9, brick);
  body.position.set(0, 4.8, -1.5);
  g.add(body);
  // пештак — портал
  const portal = box(9.5, 10.8, 2.4, 0xcfb389);
  portal.position.set(0, 5.8, 4.2);
  g.add(portal);
  // арка-ниша
  const archShape = new THREE.Shape();
  archShape.moveTo(-2.3, 0);
  archShape.lineTo(-2.3, 4.6);
  archShape.absarc(0, 4.6, 2.3, Math.PI, 0, true);
  archShape.lineTo(2.3, 0);
  archShape.closePath();
  const arch = new THREE.Mesh(new THREE.ShapeGeometry(archShape), new THREE.MeshStandardMaterial({ color: 0x241b12, roughness: 1 }));
  arch.position.set(0, 1.2, 5.42);
  g.add(arch);
  // барабан + большой бирюзовый купол
  const teal = new THREE.MeshStandardMaterial({ color: 0x37afa6, roughness: 0.3, metalness: 0.25, emissive: 0x1a5a54, emissiveIntensity: 0.25 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 3.2, 24), new THREE.MeshStandardMaterial({ color: 0xd8bd8f, roughness: 0.8 }));
  drum.position.set(0, 11.3, 0.6);
  g.add(drum);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.5, 26, 18, 0, Math.PI * 2, 0, Math.PI / 2), teal);
  dome.position.set(0, 12.9, 0.6);
  g.add(dome);
  // малый купол над задней частью
  const drum2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.4, 18), new THREE.MeshStandardMaterial({ color: 0xd8bd8f, roughness: 0.8 }));
  drum2.position.set(0, 8.6, -4.6);
  g.add(drum2);
  const dome2 = new THREE.Mesh(new THREE.SphereGeometry(1.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), teal);
  dome2.position.set(0, 9.3, -4.6);
  g.add(dome2);
  // изразцовая полоса
  const band = box(11.2, 0.9, 9.2, 0x2f7ea8, { roughness: 0.4 });
  band.position.set(0, 8.2, -1.5);
  g.add(band);
  // угловые башни
  for (const [tx, tz] of [[-5.2, 2.8], [5.2, 2.8], [-5.2, -5.6], [5.2, -5.6]]) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1, 9.5, 12), new THREE.MeshStandardMaterial({ color: brick, roughness: 0.9 }));
    tw.position.set(tx, 5.1, tz);
    g.add(tw);
  }
  scene.add(g);

  const sun = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex('rgba(255,180,110,1)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sun.scale.setScalar(85);
  sun.position.set(-150, 22, -110);
  scene.add(sun);

  const dust = particles(70, 90, 0.4, 6, 0xffcf9a, 0.45, glowTex);
  scene.add(dust);

  return {
    scene,
    camPos: new THREE.Vector3(16, 7.5, 26),
    target: new THREE.Vector3(0, 6.5, 0),
    bounds: { x: 70, z: 70 }, speed: 11, maxPolar: 1.52, maxDist: 80,
    bloom: { strength: 0.5, threshold: 0.72, radius: 0.55 },
    tick: (t) => { dust.rotation.y = t * 0.015; },
  };
}

function bozzhyra(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x4384c4, skyBot: 0xe4d5b8, fog: 0xd8c9a8, fogNear: 60, fogFar: 240,
    amb: 0xb0a890, ambI: 0.5, sun: 0xfff5e0, sunI: 1.75, sunPos: [55, 45, 25], envI: 0.5,
  });

  const chalk = new THREE.Color(0xe8dfc9), tan = new THREE.Color(0xc4b18a), shade = new THREE.Color(0x9c8d68);
  scene.add(terrain({
    size: 200, seg: 160,
    height: (x, z) => {
      const r = Math.hypot(x, z * 0.8);
      const pan = THREE.MathUtils.smoothstep(r, 14, 55);
      let h = ridged(x * 0.03, z * 0.03, 4) * 13 * pan;
      h = Math.round(h / 1.9) * 1.9 * 0.85 + h * 0.15;
      return h + fbm(x * 0.2, z * 0.2, 2) * 0.35;
    },
    paint: (c, h, x, z) => {
      const band = Math.abs(Math.floor(h / 1.9)) % 3;
      c.copy(band === 0 ? chalk : band === 1 ? tan : shade);
      c.lerp(shade, 0.2 * (0.5 + 0.5 * fbm(x * 0.11, z * 0.11, 2)));
    },
  }));

  // меловые «клыки»
  const fangMat = new THREE.MeshStandardMaterial({ color: 0xf2ecdd, flatShading: true, roughness: 0.9 });
  for (const [fx, fz, h, tilt] of [[-7, -14, 16, 0.1], [6, -18, 13, -0.14]]) {
    const fang = new THREE.Mesh(jitterGeo(new THREE.ConeGeometry(2.6, h, 7, 4), 0.42), fangMat);
    fang.scale.z = 0.55;
    fang.rotation.z = tilt;
    fang.position.set(fx, h / 2 - 0.5, fz);
    scene.add(fang);
    const baseM = new THREE.Mesh(jitterGeo(new THREE.ConeGeometry(4.6, 5, 8, 2), 0.35), fangMat);
    baseM.scale.z = 0.6;
    baseM.position.set(fx, 2, fz);
    scene.add(baseM);
  }

  return {
    scene,
    camPos: new THREE.Vector3(3, 5, 16),
    target: new THREE.Vector3(-1, 6, -14),
    bounds: { x: 75, z: 75 }, speed: 12, maxPolar: 1.55, maxDist: 90,
    bloom: { strength: 0.22, threshold: 0.9, radius: 0.35 },
  };
}

function burabay(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x3e7cb8, skyBot: 0xd2e4ec, fog: 0xbdd4de, fogNear: 45, fogFar: 200,
    amb: 0xa8c0c8, ambI: 0.8, sun: 0xfff8e0, sunI: 2.2, sunPos: [45, 50, -20], envI: 0.9,
  });

  const lakeC = { x: 0, z: 10, r: 15 };
  const hMap = (x, z) => {
    if (Math.hypot(x - lakeC.x, z - lakeC.z) < lakeC.r) return -0.6;
    let h = Math.max(0, fbm(x * 0.05, z * 0.05, 4)) * 4;
    // гранитные сопки
    for (const [sx, sz, sr, sh] of [[-14, -16, 12, 12], [12, -20, 10, 9], [-2, -26, 9, 7]]) {
      const d = Math.hypot(x - sx, z - sz);
      h += Math.exp(-(d * d) / (sr * sr * 0.55)) * sh;
    }
    return h;
  };
  const pine = new THREE.Color(0x2c5238), grass = new THREE.Color(0x5b7a4a), granite = new THREE.Color(0x6f747e);
  scene.add(terrain({
    size: 160, seg: 150, height: hMap,
    paint: (c, h, x, z) => {
      const n = fbm(x * 0.14, z * 0.14, 2);
      c.copy(grass).lerp(pine, 0.3 + n * 0.35);
      c.lerp(granite, THREE.MathUtils.smoothstep(h, 3.5, 7.5));
    },
  }));

  const lake = water(lakeC.r, 0x2e86b0, 0.05);
  lake.position.set(lakeC.x, 0.05, lakeC.z);
  scene.add(lake);

  // скала Жумбактас
  const rock = new THREE.Group();
  let ry = 0;
  for (const [w, h] of [[2.6, 1.6], [2.2, 1.7], [2.5, 1.5], [1.7, 1.4]]) {
    const b = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(w, h, w * 0.8, 2, 2, 2), 0.25),
      new THREE.MeshStandardMaterial({ color: 0xa8acb4, flatShading: true, roughness: 0.9 }));
    b.position.y = ry + h / 2;
    b.rotation.y = Math.random() * 0.5;
    rock.add(b);
    ry += h * 0.92;
  }
  rock.position.set(3, -0.3, 7);
  scene.add(rock);

  // сосны
  scene.add(conifers({
    count: 300,
    sample: () => {
      const x = (Math.random() - 0.5) * 110, z = (Math.random() - 0.5) * 110;
      if (Math.hypot(x - lakeC.x, z - lakeC.z) < lakeC.r + 1.5) return null;
      const y = hMap(x, z);
      return y < 7 ? { x, y, z } : null;
    },
    crown: 0x24523a, scaleY: 1.15,
  }));

  // облака
  for (let i = 0; i < 5; i++) {
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex('rgba(255,255,255,0.35)'), transparent: true, depthWrite: false,
    }));
    cl.scale.set(38 + Math.random() * 22, 11, 1);
    cl.position.set((Math.random() - 0.5) * 140, 34 + Math.random() * 16, -60 - Math.random() * 40);
    scene.add(cl);
  }

  return {
    scene,
    camPos: new THREE.Vector3(-4, 4.5, 26),
    target: new THREE.Vector3(0, 3, -6),
    bounds: { x: 60, z: 60 }, speed: 10, maxPolar: 1.5, maxDist: 60,
    bloom: { strength: 0.28, threshold: 0.88, radius: 0.4 },
  };
}

function baikonur(envMap, glowTex) {
  const scene = base({
    envMap, skyTop: 0x181d3c, skyBot: 0x6e5a7a, fog: 0x3a3550, fogNear: 45, fogFar: 210,
    amb: 0x5a5878, ambI: 0.65, sun: 0xc0aaff, sunI: 0.9, sunPos: [-40, 30, 30], envI: 0.4,
  });

  // звёзды
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(350 * 3);
  for (let i = 0; i < 350; i++) {
    const a = Math.random() * Math.PI * 2, y = 40 + Math.random() * 140, r = 130 + Math.random() * 110;
    sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = y; sp[i * 3 + 2] = Math.sin(a) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.6, color: 0xcfd8ff, transparent: true, opacity: 0.7 })));

  const steppe = new THREE.Color(0x8a7f5e), steppe2 = new THREE.Color(0x6e6548);
  scene.add(terrain({
    size: 220, seg: 100,
    height: (x, z) => (Math.hypot(x, z) < 18 ? 0 : fbm(x * 0.05, z * 0.05, 3) * 1.1),
    paint: (c, h, x, z) => c.copy(steppe).lerp(steppe2, 0.5 + 0.5 * fbm(x * 0.08, z * 0.08, 2)),
  }));

  // стартовый стол
  const pad = box(16, 1.4, 16, 0x63666e, { roughness: 0.7, metalness: 0.25 });
  pad.position.y = 0.7;
  scene.add(pad);
  const trench = box(6, 0.5, 22, 0x2c2f38);
  trench.position.set(0, 0.3, 14);
  scene.add(trench);

  // ракета
  const rocket = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe3e6ea, roughness: 0.35, metalness: 0.4 });
  const boostMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, roughness: 0.45, metalness: 0.4 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 7.5, 14), bodyMat);
  core.position.y = 5.1;
  rocket.add(core);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.9, 14), new THREE.MeshStandardMaterial({ color: 0xd0d8de, roughness: 0.3, metalness: 0.5 }));
  nose.position.y = 9.8;
  rocket.add(nose);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 3.6, 10), boostMat);
    b.position.set(Math.cos(a) * 1.05, 3.1, Math.sin(a) * 1.05);
    b.rotation.z = Math.cos(a) * 0.1;
    b.rotation.x = -Math.sin(a) * 0.1;
    rocket.add(b);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1, 10), boostMat);
    tip.position.set(Math.cos(a) * 0.92, 5.35, Math.sin(a) * 0.92);
    rocket.add(tip);
  }
  rocket.position.y = 1.4;
  scene.add(rocket);

  // фермы обслуживания
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x3f4756, roughness: 0.8, metalness: 0.4 });
  const wired = new THREE.MeshBasicMaterial({ color: 0x77839c, wireframe: true, transparent: true, opacity: 0.6 });
  for (const sx of [-3.4, 3.4]) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(1.1, 11, 1.1), mastMat);
    mast.position.set(sx, 6.9, 0);
    scene.add(mast);
    const grid = new THREE.Mesh(new THREE.BoxGeometry(1.5, 11.4, 1.5, 2, 8, 2), wired);
    grid.position.copy(mast.position);
    scene.add(grid);
  }

  // молниеотводы с маячками
  const beacons = [];
  for (const [bx, bz] of [[-26, -14], [24, -18], [0, -32]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 18, 6), mastMat);
    pole.position.set(bx, 9, bz);
    scene.add(pole);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 2 }));
    beacon.position.set(bx, 18.2, bz);
    scene.add(beacon);
    beacons.push(beacon);
  }

  // дальние ангары
  for (const [hx, hz, hw] of [[-46, -40, 18], [-20, -52, 14], [30, -46, 20]]) {
    const hangar = box(hw, 6, 10, 0x2e3444, { roughness: 0.8 });
    hangar.position.set(hx, 3, hz);
    scene.add(hangar);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, hw, 3, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x39415a, roughness: 0.8 }));
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(hx, 6, hz);
    scene.add(roof);
  }

  // прожекторы у стартового стола
  const flood = particles(8, 18, 1, 4, 0xfff0c0, 0.7, glowTex);
  scene.add(flood);

  return {
    scene,
    camPos: new THREE.Vector3(15, 4.5, 18),
    target: new THREE.Vector3(0, 5, 0),
    bounds: { x: 70, z: 70 }, speed: 12, maxPolar: 1.54, maxDist: 80,
    bloom: { strength: 0.75, threshold: 0.6, radius: 0.55 },
    tick: (t) => {
      const blink = 0.6 + 1.8 * (Math.sin(t * 2.6) > 0.55 ? 1 : 0.12);
      beacons.forEach((b) => (b.material.emissiveIntensity = blink));
    },
  };
}

const BUILDERS = { charyn, bao, kaindy, baiterek, turkestan, bozzhyra, burabay, baikonur };

export function buildWalkScene(loc, envMap, glowTex) {
  return BUILDERS[loc.id](envMap, glowTex);
}
