// Scenen: ett enda partikelsystem och en kamera som åker inåt genom det när
// besökaren scrollar. Dessutom linjer och etiketter. Anpassad från Inuti
// AI-hjärnan (src/scene/stage.js): shadern, kamerablandningen, vridningen och
// etiketterna är desamma, formerna och scenerna är nya.
import * as THREE from 'three';
import {
  N, buildField, buildCloud, buildSplit, buildGalaxy, buildWindow, buildStream, splitEnd,
  GALAXY_CENTER, GALAXY_SCALE, FAR_CENTER, FAR_SCALE, WINDOW_Z, STREAM_Z0, STREAM_LEN, SPLIT_K,
} from './shapes.js';

export const ACCENT = 0xffb24a;
const V3 = THREE.Vector3;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// Färglägen i shadern
const MODE = { cloud: 0, dust: 1, galaxy: 2, window: 3, stream: 5 };

const VERT = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec4 aRnd;
  attribute float aBrightFrom;
  attribute float aBrightTo;
  attribute float aAccent;
  attribute float aMark;
  uniform float uT;
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  uniform float uModeFrom;
  uniform float uModeTo;
  uniform float uAccentFrom;
  uniform float uAccentTo;
  uniform float uDim;
  uniform float uFog;
  uniform float uFlow;
  varying vec3 vColor;
  varying float vAlpha;

  vec3 palette(float mode, vec3 p, vec4 rnd, float bright) {
    if (mode < 0.5) {            // frågan: varmt vitt klot
      vec3 c = mix(vec3(0.3, 0.45, 1.0), vec3(1.0, 0.92, 0.75), bright);
      return c * (0.08 + 0.9 * bright * bright);
    } else if (mode < 1.5) {     // stoft, och strängarna i omformuleringen
      vec3 c = mix(vec3(0.16, 0.24, 0.5), vec3(0.4, 0.5, 0.8), rnd.x) * (0.2 + 0.45 * rnd.y * rnd.y);
      return c + vec3(1.0, 0.75, 0.4) * bright * bright * 0.9;
    } else if (mode < 2.5) {     // webben: färg efter plats, sidorna ljusare
      float a = 0.5 + 0.5 * sin(p.x * 0.9 + p.z * 0.6);
      float b = 0.5 + 0.5 * sin(p.y * 1.1 - p.x * 0.4 + 1.3);
      vec3 c = mix(vec3(0.16, 0.32, 1.0), vec3(0.62, 0.3, 0.95), a);
      c = mix(c, vec3(0.1, 0.75, 0.8), b * 0.55);
      c = mix(c, vec3(1.0), step(0.965, rnd.z) * 0.8);
      return c * (0.5 + 0.8 * rnd.y) + vec3(0.9, 0.95, 1.0) * bright;
    } else if (mode < 3.5) {     // kontextfönstret: kall ram
      return mix(vec3(0.14, 0.3, 0.95), vec3(0.15, 0.85, 0.8), rnd.x) * (0.25 + 1.6 * bright);
    }
    // strömmen
    return mix(vec3(0.2, 0.35, 1.0), vec3(0.8, 0.4, 0.95), rnd.x) * (0.6 + 0.9 * rnd.y);
  }

  float sizeFor(float mode, float bright) {
    if (mode < 0.5) return 0.5 + 0.6 * bright;
    if (mode > 0.5 && mode < 1.5) return 0.7 + 0.5 * bright;
    if (mode > 1.5 && mode < 2.5) return 1.0 + 1.6 * bright;
    if (mode > 2.5 && mode < 3.5) return 0.6 + 0.8 * bright;
    return 1.0;
  }

  // Strömmen rinner mot kameran och börjar om längst in
  vec3 place(float mode, vec3 p) {
    if (mode > 4.5) p.z = ${STREAM_Z0.toFixed(2)} - mod(${STREAM_Z0.toFixed(2)} - p.z - uFlow, ${STREAM_LEN.toFixed(2)});
    return p;
  }

  void main() {
    float delay = aRnd.x * 0.4;
    float t = clamp((uT - delay) / 0.6, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 from = place(uModeFrom, aFrom), to = place(uModeTo, aTo);
    vec3 p = mix(from, to, t);
    // På vägen mellan två former virvlar partiklarna ut i en båge
    float mid = sin(t * 3.14159265);
    vec3 swirl = vec3(sin(aRnd.y * 40.0 + uTime * 0.3), cos(aRnd.z * 37.0 + uTime * 0.25), sin(aRnd.w * 51.0 - uTime * 0.2));
    vec3 tangent = cross(normalize(p + vec3(0.001)), vec3(0.0, 1.0, 0.0));
    p += mid * (swirl * 0.3 + tangent * 0.55);
    // Lugn egenrörelse
    p += 0.006 * vec3(sin(uTime * 0.7 + aRnd.y * 60.0), cos(uTime * 0.6 + aRnd.z * 60.0), sin(uTime * 0.5 + aRnd.w * 60.0));

    float bright = mix(aBrightFrom, aBrightTo, t);
    vec3 c = mix(palette(uModeFrom, from, aRnd, aBrightFrom), palette(uModeTo, to, aRnd, aBrightTo), t);
    float size = mix(sizeFor(uModeFrom, aBrightFrom), sizeFor(uModeTo, aBrightTo), t);
    c *= uDim;
    // Din fråga lyser orange, i de scener där den finns med
    float accent = aAccent * mix(uAccentFrom, uAccentTo, t);
    c = mix(c, vec3(1.0, 0.7, 0.29) * 1.6, accent);
    // Träffarna lyser vitt, starkare ju högre de rankas
    float mark = aMark * mix(uAccentFrom, uAccentTo, t);
    c = mix(c, vec3(1.0, 0.98, 0.9) * 1.3, mark);
    float hero = max(accent, mark);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = max(-mv.z, 0.02);
    float px = uSize * size * uScale / d;
    // Djup: punkter långt bort bleknar, punkter nära blir stora och mjuka,
    // och de allra närmaste tonas bort.
    float soft = max(1.0, px / (0.011 * uScale));
    float fog = exp(-max(d - 0.6, 0.0) * uFog);
    vAlpha = smoothstep(0.05, 0.45, d) * mix(fog / pow(soft, 0.9), 1.0, hero);
    px *= 1.0 + 4.5 * accent + 2.6 * mark;
    gl_PointSize = min(px, 0.1 * uScale);
    vColor = c;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor * a * a * vAlpha, 1.0);
  }
`;

// En vy per scen i berättelsen. Kamerans plats räknas ut i Stage.view().
// morph: när under övergången in till scenen partiklarna byter form.
// lift: bilden lyfts ovanför undertexten.
const VIEWS = [
  { shape: 'field', mode: MODE.dust, accent: 0, fog: 0.05, lift: 0 },            // 0 svaret som bara kommer
  { shape: 'cloud', mode: MODE.cloud, accent: 0, fog: 0, lift: 0.08 },            // 1 din fråga
  { shape: 'split', mode: MODE.dust, accent: 0, fog: 0, lift: 0.06 },             // 2 omformuleringen
  { shape: 'galaxy', mode: MODE.galaxy, accent: 1, fog: 0.08, lift: 0.1 },        // 3 träffarna
  { shape: 'galaxy', mode: MODE.galaxy, accent: 1, fog: 0.08, lift: 0.16 },       // 4 den lurande träffen
  { shape: 'window', mode: MODE.window, accent: 0, fog: 0.05, lift: 0.02 },       // 5 utdragen
  { shape: 'stream', mode: MODE.stream, accent: 0, fog: 0.06, lift: 0 },          // 6 svaret
  { shape: 'far', mode: MODE.galaxy, accent: 1, fog: 0.04, lift: 0.08 },          // 7 hänvisningen
  { shape: 'far', mode: MODE.galaxy, accent: 1, fog: 0, lift: 0 },                // 8 vad gör du
];
const LAST = VIEWS.length - 1;
const GC = new V3(...GALAXY_CENTER), FC = new V3(...FAR_CENTER);

export class Stage {
  constructor(canvas, labelRoot, { reduced = false } = {}) {
    this.canvas = canvas;
    this.labelRoot = labelRoot;
    this.reduced = reduced;
    this.paused = reduced;
    // Var i resan vi är: scen k, andel t av övergången till scen k + 1, och hur
    // långt in i scenen kameran har åkt (qa för scen k, qb för scen k + 1).
    this.k = 0; this.t = 0; this.qa = 0; this.qb = 0;
    this.stage = 0;
    this.pair = -1;
    this.time = 0;
    this.labels = new Map();
    this.focus = null; this.focusAmount = 0; this.focusStep = -1;
    this.pointer = new THREE.Vector2();
    this.orbit = { yaw: 0, pitch: 0, ty: 0, tp: 0 };
    this.held = new Set();
    this.M = 0;                 // antal textbitar, partikel M är frågan
    this.queryPos = new V3();   // frågans plats i webben, relativt mitten (-1..1)
    this.hitIds = [];

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer = renderer;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(this.pixelRatio);
    renderer.setClearColor(0x04050c, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.03, 90);
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Former. galaxy och far byts ut när korpuset har laddats (setPassages).
    this.shapes = {
      field: buildField(), cloud: buildCloud(), split: buildSplit(),
      galaxy: buildGalaxy([]), far: buildGalaxy([], FAR_CENTER, FAR_SCALE, 53),
      window: buildWindow(), stream: buildStream(),
    };

    // Partiklarna
    const geo = new THREE.BufferGeometry();
    const rnd = new Float32Array(N * 4);
    let seed = 1234567;
    for (let i = 0; i < rnd.length; i++) { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; rnd[i] = (seed >>> 0) / 4294967296; }
    this.attr = {
      from: new THREE.BufferAttribute(new Float32Array(N * 3), 3),
      to: new THREE.BufferAttribute(new Float32Array(N * 3), 3),
      brightFrom: new THREE.BufferAttribute(new Float32Array(N), 1),
      brightTo: new THREE.BufferAttribute(new Float32Array(N), 1),
      accent: new THREE.BufferAttribute(new Float32Array(N), 1),
      mark: new THREE.BufferAttribute(new Float32Array(N), 1),
    };
    for (const a of Object.values(this.attr)) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr.to); // krävs av three.js, används inte i shadern
    geo.setAttribute('aFrom', this.attr.from);
    geo.setAttribute('aTo', this.attr.to);
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
    geo.setAttribute('aBrightFrom', this.attr.brightFrom);
    geo.setAttribute('aBrightTo', this.attr.brightTo);
    geo.setAttribute('aAccent', this.attr.accent);
    geo.setAttribute('aMark', this.attr.mark);
    geo.boundingSphere = new THREE.Sphere(new V3(), 120);
    this.uniforms = {
      uT: { value: 0 }, uTime: { value: 0 }, uSize: { value: 0.02 }, uScale: { value: 1 },
      uModeFrom: { value: 0 }, uModeTo: { value: 0 }, uAccentFrom: { value: 0 }, uAccentTo: { value: 0 }, uDim: { value: 1 },
      uFog: { value: 0 }, uFlow: { value: 0 },
    };
    this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
    }));
    this.points.frustumCulled = false;
    this.group.add(this.points);

    // Linjer: från frågan till träffarna i webben, och trådarna från svaret till källorna
    this.hitLines = this.makeSegments(0xffffff, 16);
    this.threadLines = this.makeSegments(ACCENT, 16);
    this.group.add(this.hitLines, this.threadLines);
    this.threadFrom = null; // { pos: V3 } varifrån trådarna går
    this.threadIds = [];

    const v = this.view(0, 0);
    this.camPos = v.pos.clone(); this.camLook = v.look.clone();
    this.resize();
    this.applyPair(0);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('pointermove', (e) => {
      this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
    this.initOrbit();
  }

  // ---------- Vrida bilden (från hjärnprojektet) ----------
  initOrbit() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' };
      if (!drag.touch) { try { c.setPointerCapture(e.pointerId); } catch {} }
      c.classList.add('dragging');
    });
    c.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      this.turn((drag.x - e.clientX) * 0.005, drag.touch ? 0 : (e.clientY - drag.y) * 0.005);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    const end = (e) => { if (drag && e.pointerId === drag.id) { drag = null; c.classList.remove('dragging'); } };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('dblclick', () => this.resetOrbit());
    window.addEventListener('keydown', (e) => {
      if (!e.key.startsWith('Arrow') || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target.closest && e.target.closest('input, textarea, select')) return;
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) return;
      e.preventDefault();
      this.held.add(e.key);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.key));
    window.addEventListener('blur', () => this.held.clear());
  }

  turn(dYaw, dPitch) {
    const o = this.orbit;
    o.ty = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, o.ty + dYaw));
    o.tp = Math.max(-1.1, Math.min(1.1, o.tp + dPitch));
  }
  resetOrbit() { this.orbit.ty = this.orbit.tp = 0; }
  get orbited() { return Math.abs(this.orbit.ty) + Math.abs(this.orbit.tp) > 0.01; }

  makeSegments(color, max) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 6), 3));
    g.setDrawRange(0, 0);
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false }));
    l.frustumCulled = false;
    return l;
  }

  // ---------- Data in ----------
  // Textbitarna får sina platser i webben, både nära (galaxy) och på håll (far)
  setPassages(passages) {
    this.M = passages.length;
    this.shapes.galaxy = buildGalaxy(passages);
    this.shapes.far = buildGalaxy(passages, FAR_CENTER, FAR_SCALE, 53);
    this.setQuery(this.queryPos.toArray());
    this.pair = -1; // ladda upp på nytt
  }

  // Frågans plats i webben (-1..1). Partikel M flyttas dit och lyser orange.
  setQuery(pos) {
    this.queryPos.set(...pos);
    for (const [name, c, s] of [['galaxy', GC, GALAXY_SCALE], ['far', FC, FAR_SCALE]]) {
      const p = this.shapes[name].pos;
      p[this.M * 3] = c.x + pos[0] * s; p[this.M * 3 + 1] = c.y + pos[1] * s; p[this.M * 3 + 2] = c.z + pos[2] * s;
      this.shapes[name].bright[this.M] = 0.9;
    }
    const a = this.attr.accent.array; a.fill(0); a[this.M] = 1;
    this.attr.accent.needsUpdate = true;
    this.uploadShape('galaxy'); this.uploadShape('far');
    this.updateHitLines();
  }

  // Träffarna: ids i rankningsordning, strengths 0..1 (hur starkt var och en lyser)
  setHits(ids, strengths) {
    this.hitIds = ids;
    const m = this.attr.mark.array; m.fill(0);
    ids.forEach((id, i) => { m[id] = strengths[i]; });
    this.attr.mark.needsUpdate = true;
    this.updateHitLines();
  }

  updateHitLines() {
    const arr = this.hitLines.geometry.attributes.position.array;
    const q = this.galaxyPosition(this.M);
    let n = 0;
    for (const id of this.hitIds.slice(0, 16)) { const p = this.galaxyPosition(id); arr.set([q.x, q.y, q.z, p.x, p.y, p.z], n * 6); n++; }
    this.hitLines.geometry.attributes.position.needsUpdate = true;
    this.hitLines.geometry.setDrawRange(0, n * 2);
  }

  // Trådarna i scen 7: från en punkt framför kameran till de hänvisade sidorna i webben på håll
  setThreads(ids) {
    this.threadIds = ids;
    const arr = this.threadLines.geometry.attributes.position.array;
    const from = this.threadAnchor();
    let n = 0;
    for (const id of ids.slice(0, 16)) { const p = this.farPosition(id); arr.set([from.x, from.y, from.z, p.x, p.y, p.z], n * 6); n++; }
    this.threadLines.geometry.attributes.position.needsUpdate = true;
    this.threadLines.geometry.setDrawRange(0, n * 2);
  }
  threadAnchor() { return new V3(FC.x, FC.y - 0.2, FC.z + FAR_SCALE * 1.5 + 0.8); }

  // Kameran åker till en sida (i webben på håll) när besökaren drar i en tråd. null släpper.
  setFocus(id, step) {
    this.focus = id === null ? null : { pos: this.farPosition(id) };
    this.focusStep = step;
  }

  galaxyPosition(id) { const g = this.shapes.galaxy.pos; return new V3(g[id * 3], g[id * 3 + 1], g[id * 3 + 2]); }
  farPosition(id) { const g = this.shapes.far.pos; return new V3(g[id * 3], g[id * 3 + 1], g[id * 3 + 2]); }
  splitEndPosition(k) { return new V3(...splitEnd(k)); }

  // ---------- Etiketter (HTML-element som följer punkter i 3D) ----------
  setLabels(group, items) {
    for (const [key, l] of this.labels) if (l.group === group) { l.el.remove(); this.labels.delete(key); }
    items.forEach((it, i) => {
      const el = document.createElement('div');
      el.className = 'label ' + (it.cls || '');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = it.html || '';
      this.labelRoot.appendChild(el);
      this.labels.set(group + ':' + i, { group, el, getPos: it.getPos, vis: it.vis, text: it.text, dx: it.dx || 0, dy: it.dy || 0 });
    });
  }

  // ---------- Kameran ----------
  // Kamerans plats och blickpunkt i scen i, när besökaren har scrollat andelen q genom scenen.
  view(i, q) {
    const time = this.time, n = this.narrow;
    switch (i) {
      case 0: { // framför sökrutan, fältet svävar bakom
        const a = 0.15 * Math.sin(time * 0.11);
        return { pos: new V3(Math.sin(a) * 3.2, 0.25, Math.cos(a) * (n ? 4.6 : 3.2) - 0.6 * q), look: new V3(0.4, 0, -0.5) };
      }
      case 1: // frågan: kameran står nära klotet och går sakta runt det
        return { pos: new V3(0.5 * Math.sin(time * 0.15), 0.2, (n ? 3.6 : 2.6) - 0.3 * q), look: new V3(0, 0, 0) };
      case 2: // omformuleringen: backar så att alla strängar får plats
        return { pos: new V3(0.2 * Math.sin(time * 0.1), 0.15, (n ? 7.5 : 5.2) + 0.6 * q), look: new V3(0, 0, -0.5) };
      case 3: { // in i webben, mot frågans punkt
        const qp = this.galaxyPosition(this.M);
        const far = GC.clone().add(new V3(0.4, 0.3, GALAXY_SCALE * (n ? 2.6 : 1.9)));
        const near = qp.clone().add(new V3(0.5, 0.35, 1.9));
        return { pos: far.lerp(near, smooth(q)), look: qp.clone().lerp(GC, 0.3 * (1 - q)) };
      }
      case 4: { // den lurande träffen: kameran går runt frågan och träffarna
        const qp = this.galaxyPosition(this.M);
        const a = 0.5 * q;
        return { pos: qp.clone().add(new V3(Math.sin(a) * 2.2 + 0.5, 0.35, Math.cos(a) * 2.2)), look: qp };
      }
      case 5: // kontextfönstret rakt framifrån
        return { pos: new V3(0, 0, WINDOW_Z + (n ? 6.5 : 4.8) - 0.4 * q), look: new V3(0, 0, WINDOW_Z) };
      case 6: { // in i strömmen
        const z = STREAM_Z0 - 1.5 - 2.5 * q;
        return { pos: new V3(0, 0, z), look: new V3(0.3 * Math.sin(time * 0.1), 0, z - 5), turn: true };
      }
      case 7: { // ut ur strömmen: webben på håll, med trådarna
        const anchor = this.threadAnchor();
        return { pos: new V3(anchor.x, anchor.y + 0.3, anchor.z + (n ? 4.4 : 3.0) - 0.4 * q), look: FC.clone().add(new V3(0, 0, 1.2)) };
      }
      default: { // backar ut och ser hela webben på håll
        const a = 0.25 * Math.sin(time * 0.08), r = (n ? 8.5 : 5.6) + 1.2 * q;
        return { pos: new V3(FC.x + Math.sin(a) * r, 0.8, FC.z + Math.cos(a) * r), look: FC };
      }
    }
  }

  // ---------- Form och bild ----------
  uploadShape(name) {
    const k = Math.max(0, Math.min(LAST - 1, this.pair));
    if (VIEWS[k].shape === name) { this.attr.from.array.set(this.shapes[name].pos); this.attr.from.needsUpdate = true; this.attr.brightFrom.array.set(this.shapes[name].bright); this.attr.brightFrom.needsUpdate = true; }
    if (VIEWS[k + 1].shape === name) { this.attr.to.array.set(this.shapes[name].pos); this.attr.to.needsUpdate = true; this.attr.brightTo.array.set(this.shapes[name].bright); this.attr.brightTo.needsUpdate = true; }
  }

  applyPair(k) {
    this.pair = k;
    const a = VIEWS[k], b = VIEWS[k + 1];
    this.attr.from.array.set(this.shapes[a.shape].pos); this.attr.to.array.set(this.shapes[b.shape].pos);
    this.attr.brightFrom.array.set(this.shapes[a.shape].bright); this.attr.brightTo.array.set(this.shapes[b.shape].bright);
    this.attr.from.needsUpdate = this.attr.to.needsUpdate = this.attr.brightFrom.needsUpdate = this.attr.brightTo.needsUpdate = true;
    this.uniforms.uModeFrom.value = a.mode; this.uniforms.uModeTo.value = b.mode;
    this.uniforms.uAccentFrom.value = a.accent; this.uniforms.uAccentTo.value = b.accent;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.uniforms.uScale.value = h * this.pixelRatio;
    this.narrow = w < 820;
  }

  // Hur mycket scen nummer step syns just nu (0..1), och samma sak för ett spann av scener
  weightOfStep(step) { return Math.max(0, 1 - Math.abs(this.stage - step)); }
  inScenes(a, b) { return clamp01(Math.min(this.stage - a + 1, b + 1 - this.stage) * 2 - 1); }
  weight(shape) {
    const k = Math.min(LAST - 1, Math.floor(this.stage)), t = clamp01(this.stage - k);
    return (VIEWS[k].shape === shape ? 1 - t : 0) + (VIEWS[k + 1].shape === shape ? t : 0);
  }

  frame(dt) {
    if (!this.paused) this.time += dt;
    let { k, t, qa, qb } = this;
    if (k >= LAST) { k = LAST - 1; t = 1; qb = qa; qa = 1; }
    this.stage = k + t;
    if (k !== this.pair) this.applyPair(k);
    const A = VIEWS[k], B = VIEWS[k + 1];
    const m = B.morph || [0, 1];
    this.uniforms.uT.value = clamp01((t - m[0]) / (m[1] - m[0]));
    this.uniforms.uTime.value = this.time;
    this.uniforms.uFlow.value = (this.time * 0.55) % STREAM_LEN;

    // Kamera: scenens egen åkning, och en mjuk övergång mellan två scener
    const e = smooth(t), lerp = (x, y) => x + (y - x) * e;
    const va = this.view(k, qa), vb = this.view(k + 1, qb);
    const nearView = t < 0.5 ? va : vb;
    const pos = va.pos.lerp(vb.pos, e), look = va.look.lerp(vb.look, e);
    this.uniforms.uFog.value = lerp(A.fog, B.fog);

    // Dragen tråd: kameran åker till källan
    const wantFocus = this.focus && this.weightOfStep(this.focusStep) > 0.6 ? 1 : 0;
    this.focusAmount += (wantFocus - this.focusAmount) * Math.min(1, dt * (this.reduced ? 100 : 2.5));
    if (this.focusAmount > 0.001 && this.focus) {
      pos.lerp(this.focus.pos.clone().add(new V3(0.3, 0.2, 1.4)), this.focusAmount);
      look.lerp(this.focus.pos, this.focusAmount);
    }
    // Besökarens egen vridning (från hjärnprojektet)
    const o = this.orbit, h = this.held;
    this.turn(((h.has('ArrowRight') ? 1 : 0) - (h.has('ArrowLeft') ? 1 : 0)) * dt * 1.4, ((h.has('ArrowUp') ? 1 : 0) - (h.has('ArrowDown') ? 1 : 0)) * dt * 1.1);
    const ease = this.reduced ? 1 : Math.min(1, dt * 10);
    o.yaw += (o.ty - o.yaw) * ease; o.pitch += (o.tp - o.pitch) * ease;
    if (Math.abs(o.yaw) > 1e-4 || Math.abs(o.pitch) > 1e-4) {
      const sph = new THREE.Spherical(), lim = (phi) => Math.max(0.2, Math.min(Math.PI - 0.2, phi));
      if (nearView.turn) {
        sph.setFromVector3(look.clone().sub(pos));
        sph.theta -= o.yaw; sph.phi = lim(sph.phi - o.pitch);
        look.copy(pos).add(new V3().setFromSpherical(sph));
      } else {
        const c = look.clone();
        sph.setFromVector3(pos.clone().sub(c));
        sph.theta += o.yaw; sph.phi = lim(sph.phi - o.pitch);
        pos.copy(c).add(new V3().setFromSpherical(sph));
      }
    }
    if (!this.paused) { pos.x += this.pointer.x * 0.06; pos.y += -this.pointer.y * 0.04; }
    const follow = this.reduced ? 1 : Math.min(1, dt * 6);
    this.camPos.lerp(pos, follow); this.camLook.lerp(look, follow);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    // Bilden lyfts uppåt när det står text under
    const lift = this.narrow ? 0.16 : lerp(A.lift, B.lift);
    this.camera.setViewOffset(this.width, this.height, 0, lift * this.height, this.width, this.height);
    this.camera.updateMatrixWorld();

    // Synlighet för linjer
    const hitW = Math.max(0, this.inScenes(3, 4) * 2 - 1) * (this.hitIds.length ? 1 : 0);
    this.hitLines.material.opacity = 0.45 * hitW; this.hitLines.visible = hitW > 0;
    const thrW = Math.max(0, this.weightOfStep(7) * 2 - 1) * (this.threadIds.length ? 1 : 0);
    this.threadLines.material.opacity = 0.7 * thrW; this.threadLines.visible = thrW > 0;

    // Bakom texten i slutscenen lyser partiklarna svagare
    this.uniforms.uDim.value = 1 - 0.3 * clamp01(this.stage - (LAST - 0.8));

    // Etiketter
    const v = new V3();
    const only = (step) => Math.max(0, this.weightOfStep(step) * 2 - 1);
    const groupWeight = { question: only(1), split: only(2), hits: Math.max(0, this.inScenes(3, 4) * 2 - 1), threads: only(7) };
    const placed = [];
    for (const l of this.labels.values()) {
      const w = Math.min(1, groupWeight[l.group.split('.')[0]] ?? 0) * (l.vis ? l.vis() : 1);
      if (w <= 0.01) { l.el.style.opacity = 0; l.el.style.visibility = 'hidden'; continue; }
      v.copy(l.getPos()).applyMatrix4(this.camera.matrixWorldInverse);
      if (v.z > -0.08) { l.el.style.visibility = 'hidden'; continue; } // bakom kameran
      v.applyMatrix4(this.camera.projectionMatrix);
      if (l.text) { const s = l.text(); if (s !== l.last) { l.last = s; l.el.innerHTML = s; l.w = 0; } }
      const x = (v.x * 0.5 + 0.5) * this.width + l.dx; let y = (-v.y * 0.5 + 0.5) * this.height + l.dy;
      const lw = l.w || (l.w = l.el.offsetWidth + 8);
      for (let pass = 0; pass < 12; pass++) {
        const hit = placed.find((q) => x < q.x + q.w && q.x < x + lw && Math.abs(y - q.y) < 23);
        if (!hit) break;
        y = hit.y + 23;
      }
      placed.push({ x, y, w: lw });
      l.el.style.visibility = 'visible';
      l.el.style.opacity = w;
      l.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

export { VIEWS, SPLIT_K };
