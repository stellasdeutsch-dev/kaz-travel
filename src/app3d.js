import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LOCATIONS } from './locations.js';
import { buildWalkScene } from './scenes.js';

// ---- проекция: долгота/широта -> плоскость XZ ----
const CLON = 67.3, CLAT = 48.2, K = 1.55;
const COSLAT = Math.cos((CLAT * Math.PI) / 180);
export const toX = (lon) => (lon - CLON) * COSLAT * K;
export const toZ = (lat) => -(lat - CLAT) * K;

const MAP_TOP = 0.7; // высота "плиты" карты
const MAP_BLOOM = { strength: 0.16, radius: 0.5, threshold: 0.93 };

function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

// мягкая радиальная текстура для свечения/частиц
function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class App3D {
  constructor({ stage, canvas, labels, onSelect, onDeselect }) {
    this.stage = stage;
    this.labels = labels;
    this.onSelect = onSelect;
    this.onDeselect = onDeselect;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.labelRenderer = new CSS2DRenderer({ element: labels });

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 500);
    this.camera.position.set(0, 58, 2);

    this.mapScene = this.buildMapScene();

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enableZoom = false;      // не перехватываем скролл страницы
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = 1.25;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = -0.32;
    this.controls.target.set(0, 6.5, 0.5);

    // на тач-устройствах один палец скроллит страницу, карту вращают двумя
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    if (this.isTouch) {
      this.controls.touches.ONE = null;
      this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      canvas.style.touchAction = 'pan-y';
    }

    // пауза авто-вращения при взаимодействии
    canvas.addEventListener('pointerdown', () => {
      this.controls.autoRotate = false;
      clearTimeout(this._idleT);
      this._idleT = setTimeout(() => { if (!this.selected && !this.walk) this.controls.autoRotate = true; }, 9000);
    });

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.mapScene, this.camera);
    // на светлой карте свечение почти выключено; в тёмных сценах прогулки его усиливаем
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), MAP_BLOOM.strength, MAP_BLOOM.radius, MAP_BLOOM.threshold);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.hovered = null;
    this.selected = null;
    this.walk = null;       // { id, scene, camera, controls, bounds }
    this.walkCache = new Map();
    this.keys = new Set();
    this.tween = null;
    this.clock = new THREE.Clock();

    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('click', (e) => this.onClick(e));
    addEventListener('keydown', (e) => this.keys.add(e.code));
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('resize', () => this.resize());
    this.resize();

    // вступительный пролёт камеры
    const home = this.homeView();
    this.flyTo(home.pos, home.target, 2.2);

    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ================= КАРТА =================
  buildMapScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 60, 150);
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.5;

    // студийный свет: белая плита «продуктово» подсвечена на чёрном
    scene.add(new THREE.HemisphereLight(0xffffff, 0x1a1a24, 0.6));
    const key = new THREE.DirectionalLight(0xfff2e0, 0.95);
    key.position.set(-16, 28, 14);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x8fb8e0, 0.5);
    fill.position.set(22, 10, -18);
    scene.add(fill);

    // холодное и тёплое свечение в глубине кадра
    const washBlue = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(41,151,255,0.10)'), transparent: true, depthWrite: false,
    }));
    washBlue.scale.setScalar(100);
    washBlue.position.set(-28, -6, -36);
    scene.add(washBlue);
    const washWarm = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(232,184,75,0.07)'), transparent: true, depthWrite: false,
    }));
    washWarm.scale.setScalar(85);
    washWarm.position.set(30, -4, -22);
    scene.add(washWarm);

    // лёгкая взвесь в воздухе
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(120 * 3);
    for (let i = 0; i < 120; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 52;
      dustPos[i * 3 + 1] = 1 + Math.random() * 10;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    this.dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
      map: glowTexture('rgba(180,200,230,0.8)'), size: 0.28,
      transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(this.dust);

    // мягкое световое пятно под «плитой» карты
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(30, 48),
      new THREE.MeshBasicMaterial({
        map: glowTexture('rgba(70,90,130,0.35)', 'rgba(10,10,15,0)'),
        transparent: true, depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.1;
    shadow.scale.set(1.5, 1, 1);
    scene.add(shadow);

    this.mapGroup = new THREE.Group();
    scene.add(this.mapGroup);
    this.markers = [];
    this.hitMeshes = [];

    fetch(`${import.meta.env.BASE_URL}kaz-border.json`)
      .then((r) => r.json())
      .then((pts) => {
        this.buildCountry(pts);
        this.buildMarkers();
        this.ready?.();
      });

    return scene;
  }

  buildCountry(pts) {
    const shape = new THREE.Shape();
    pts.forEach(([lon, lat], i) => {
      const x = toX(lon), y = (lat - CLAT) * K; // y формы -> -Z мира после поворота
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: MAP_TOP, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.07, bevelSegments: 2, steps: 1,
    });
    geo.rotateX(-Math.PI / 2);

    // белая «фарфоровая» плита с приглушённым золотым торцом
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xbfc6d4, metalness: 0.15, roughness: 0.6, envMapIntensity: 0.4,
    });
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xc9a75f, metalness: 0.55, roughness: 0.35, envMapIntensity: 1.0,
    });
    const country = new THREE.Mesh(geo, [topMat, sideMat]);
    this.mapGroup.add(country);

    // контур границы
    const linePts = pts.map(([lon, lat]) => new THREE.Vector3(toX(lon), MAP_TOP + 0.1, toZ(lat)));
    linePts.push(linePts[0].clone());
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(linePts),
      new THREE.LineBasicMaterial({ color: 0xd8b25a, transparent: true, opacity: 0.55 })
    );
    this.mapGroup.add(line);

    // внутренняя сетка точек по территории (декор)
    const inside = [];
    const poly = pts.map(([lon, lat]) => [toX(lon), toZ(lat)]);
    for (let gx = -22; gx <= 22; gx += 0.9) {
      for (let gz = -12; gz <= 13; gz += 0.9) {
        if (this.pointInPoly(gx, gz, poly)) inside.push(gx, MAP_TOP + 0.06, gz);
      }
    }
    const gridGeo = new THREE.BufferGeometry();
    gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(inside, 3));
    this.mapGroup.add(new THREE.Points(gridGeo, new THREE.PointsMaterial({
      color: 0x9aa4b8, size: 0.08, transparent: true, opacity: 0.45,
    })));
  }

  pointInPoly(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  buildMarkers() {
    const ringGeo = new THREE.RingGeometry(0.5, 0.68, 44);
    const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.05, 8);
    const headGeo = new THREE.SphereGeometry(0.34, 22, 22);
    const outlineGeo = new THREE.SphereGeometry(0.42, 22, 22);
    const baseGeo = new THREE.CircleGeometry(0.18, 20);

    for (const loc of LOCATIONS) {
      const g = new THREE.Group();
      g.position.set(toX(loc.lon), MAP_TOP, toZ(loc.lat));
      // единый акцент для всех маркеров — сдержанная «системная» палитра
      const accent = new THREE.Color(0x2997ff);
      const deep = accent.clone().multiplyScalar(0.72);

      // тень-подпятник на плите
      const base = new THREE.Mesh(baseGeo, new THREE.MeshBasicMaterial({
        color: deep, transparent: true, opacity: 0.55,
      }));
      base.rotation.x = -Math.PI / 2;
      base.position.y = 0.02;
      g.add(base);

      const stem = new THREE.Mesh(stemGeo, new THREE.MeshBasicMaterial({ color: deep }));
      stem.position.y = 0.55;
      g.add(stem);

      // тёмная обводка: видна только «дальняя» сторона сферы, поэтому получается контур
      const outline = new THREE.Mesh(outlineGeo, new THREE.MeshBasicMaterial({
        color: 0x0a1626, side: THREE.BackSide,
      }));
      outline.position.y = 1.12;
      g.add(outline);

      const head = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: accent }));
      head.position.y = 1.12;
      g.add(head);

      // мягкое цветное свечение вокруг головки
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(`#${accent.getHexString()}`, 'rgba(255,255,255,0)'),
        transparent: true, opacity: 0.4, depthWrite: false,
      }));
      halo.scale.setScalar(1.6);
      halo.position.y = 1.12;
      g.add(halo);

      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: accent, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
      }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      g.add(ring);

      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(0.75, 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.y = 0.8;
      hit.userData.loc = loc;
      g.add(hit);
      this.hitMeshes.push(hit);

      const el = document.createElement('div');
      el.className = 'marker-label';
      el.textContent = loc.name;
      el.addEventListener('click', () => this.select(loc.id));
      const label = new CSS2DObject(el);
      label.position.set(0, 1.75, 0);
      g.add(label);

      this.mapGroup.add(g);
      this.markers.push({ loc, group: g, ring, halo, head, el });
    }
  }

  // ================= ВЗАИМОДЕЙСТВИЕ =================
  castPointer(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    return hits.length ? hits[0].object.userData.loc : null;
  }

  onPointerMove(e) {
    if (this.walk) return;
    const loc = this.castPointer(e);
    this.renderer.domElement.style.cursor = loc ? 'pointer' : 'grab';
    if (this.hovered !== loc) {
      this.hovered = loc;
      for (const m of this.markers) m.el.classList.toggle('hot', m.loc === loc);
    }
  }

  onClick(e) {
    if (this.walk) return;
    const loc = this.castPointer(e);
    if (loc) this.select(loc.id);
  }

  select(id) {
    const loc = LOCATIONS.find((l) => l.id === id);
    if (!loc) return;
    this.selected = loc;
    this.controls.autoRotate = false;
    const x = toX(loc.lon), z = toZ(loc.lat);
    const dir = new THREE.Vector3(x, 0, z).normalize();
    this.flyTo(
      new THREE.Vector3(x - dir.x * 2 + 1.5, 7.5, z + 7.5),
      new THREE.Vector3(x, 0.6, z),
      1.4
    );
    this.onSelect?.(loc);
  }

  // Страна вытянута с запада на восток, поэтому на узких экранах камеру нужно отодвигать,
  // иначе карта не помещается по ширине.
  homeView() {
    const a = this.camera.aspect || 1.6;
    if (a >= 1.3) return { pos: new THREE.Vector3(0, 28, 30), target: new THREE.Vector3(0, 6.5, 0.5) };
    if (a >= 0.9) return { pos: new THREE.Vector3(0, 41, 44), target: new THREE.Vector3(0, 9, 0.5) };
    // портрет: карта уходит ниже под заголовок, камера дальше — иначе страна не влезает по ширине
    return { pos: new THREE.Vector3(0, 56, 60), target: new THREE.Vector3(0, 10, 0.5) };
  }

  resetView() {
    this.selected = null;
    const home = this.homeView();
    this.flyTo(home.pos, home.target, 1.4);
    this.onDeselect?.();
  }

  flyTo(pos, target, dur = 1.5) {
    this.tween = {
      t: 0, dur,
      p0: this.camera.position.clone(), p1: pos,
      t0: this.controls.target.clone(), t1: target,
    };
  }

  // ================= ПРОГУЛКА =================
  async enterWalk(id) {
    const loc = LOCATIONS.find((l) => l.id === id);
    if (!loc || this.walk) return;

    let w = this.walkCache.get(id);
    if (!w) {
      w = buildWalkScene(loc, this.envMap, glowTexture);
      this.walkCache.set(id, w);
    }
    const cam = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    cam.position.copy(w.camPos);

    const controls = new OrbitControls(cam, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.copy(w.target);
    controls.maxPolarAngle = w.maxPolar ?? 1.52;
    controls.minDistance = 2;
    controls.maxDistance = w.maxDist ?? 60;
    controls.enablePan = false;

    this.walk = { loc, ...w, camera: cam, controls };
    this.controls.enabled = false;
    if (this.isTouch) this.renderer.domElement.style.touchAction = 'none';
    this.renderPass.scene = w.scene;
    this.renderPass.camera = cam;
    const b = w.bloom ?? {};
    this.bloom.strength = b.strength ?? 0.55;
    this.bloom.threshold = b.threshold ?? 0.8;
    this.bloom.radius = b.radius ?? 0.5;
    this.resize();
  }

  exitWalk() {
    if (!this.walk) return;
    this.walk.controls.dispose();
    this.walk = null;
    this.controls.enabled = true;
    if (this.isTouch) this.renderer.domElement.style.touchAction = 'pan-y';
    this.renderPass.scene = this.mapScene;
    this.renderPass.camera = this.camera;
    this.bloom.strength = MAP_BLOOM.strength;
    this.bloom.threshold = MAP_BLOOM.threshold;
    this.bloom.radius = MAP_BLOOM.radius;
    this.resize();
  }

  updateWalkKeys(dt) {
    const w = this.walk;
    if (!w) return;
    const speed = (w.speed ?? 9) * dt;
    const fwd = new THREE.Vector3().subVectors(w.controls.target, w.camera.position);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) return;
    fwd.normalize();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const move = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) move.add(fwd);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) move.sub(fwd);
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) move.add(right);
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) move.sub(right);
    if (!move.lengthSq()) return;
    move.normalize().multiplyScalar(speed);
    const b = w.bounds ?? { x: 50, z: 50 };
    const np = w.camera.position.clone().add(move);
    const nt = w.controls.target.clone().add(move);
    if (Math.abs(nt.x) < b.x && Math.abs(nt.z) < b.z) {
      w.camera.position.copy(np);
      w.controls.target.copy(nt);
    }
  }

  // ================= ЦИКЛ =================
  frame() {
    // слой скрыт (открыта другая страница) — не тратим ресурсы
    if (!this.walk && this.stage.classList.contains('stage-hidden')) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    if (this.walk) {
      this.walk.controls.update();
      this.updateWalkKeys(dt);
      this.walk.tick?.(t, dt);
      this.composer.render();
      return;
    }

    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      const k = easeInOut(Math.min(tw.t / tw.dur, 1));
      this.camera.position.lerpVectors(tw.p0, tw.p1, k);
      this.controls.target.lerpVectors(tw.t0, tw.t1, k);
      if (tw.t >= tw.dur) this.tween = null;
    }
    this.controls.update();

    // пульс маркеров
    for (let i = 0; i < this.markers.length; i++) {
      const m = this.markers[i];
      const s = 1 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7));
      m.ring.scale.setScalar(s);
      m.ring.material.opacity = 1.05 - s * 0.55;
      m.halo.scale.setScalar(1.1 + 0.15 * Math.sin(t * 2.4 + i * 1.7));
      const hot = this.hovered === m.loc || this.selected === m.loc;
      m.head.scale.setScalar(hot ? 1.5 : 1);
    }
    this.dust.rotation.y = t * 0.012;

    this.composer.render();
    this.labelRenderer.render(this.mapScene, this.camera);
  }

  resize() {
    const w = this.stage.clientWidth, h = this.stage.clientHeight;
    if (!w || !h) return;
    const cam = this.walk ? this.walk.camera : this.camera;
    const prevAspect = cam.aspect;
    cam.aspect = w / h;
    if (cam === this.camera) cam.fov = cam.aspect < 0.75 ? 58 : 46; // шире обзор на узких экранах
    cam.updateProjectionMatrix();

    // при смене пропорций (поворот телефона, ресайз окна) переставляем камеру на новый «домашний» план
    if (cam === this.camera && !this.selected && Math.abs(prevAspect - cam.aspect) > 0.01) {
      const home = this.homeView();
      this.flyTo(home.pos, home.target, this._sized ? 0.8 : 2.2);
      this._sized = true;
    }
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }
}
