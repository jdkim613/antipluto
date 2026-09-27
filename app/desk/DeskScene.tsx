"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// Units are metres. Desk top surface sits at y = 0.
// Scanned models, textures and the HDRI are CC0 from Poly Haven, served from /public/assets.
const ASSETS = "/assets";

// ---------- deterministic randomness so the scene is stable across reloads ----------
let seed = 42;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const range = (a: number, b: number) => a + rand() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

// ---------- textures ----------
const texLoader = new THREE.TextureLoader();
function pbr(name: string, repeat: [number, number], anisotropy = 16) {
  const load = (map: string, srgb = false) => {
    const t = texLoader.load(`${ASSETS}/textures/${name}/${map}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...repeat);
    t.anisotropy = anisotropy;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: load("Diffuse", true), normalMap: load("nor_gl"), roughnessMap: load("Rough"), aoMap: load("AO") };
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 16;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(g: CanvasRenderingContext2D, w: number, h: number, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${rand() * alpha})`;
    g.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// Aged sheet with cursive-looking handwriting.
function paperTex(variant: number) {
  return canvasTex(1024, 1448, (g, w, h) => {
    const tones = ["#d9cba6", "#e0d4b4", "#cfbf95", "#d6c9a8"];
    g.fillStyle = tones[variant % tones.length];
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, w * 0.45, w / 2, h / 2, w * 0.95);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(110,70,25,0.18)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      g.fillStyle = `rgba(120,85,40,${range(0.02, 0.08)})`;
      g.beginPath();
      g.arc(rand() * w, rand() * h, range(40, 180), 0, Math.PI * 2);
      g.fill();
    }
    if (variant % 3 === 0) {
      g.strokeStyle = "rgba(100,60,25,0.22)";
      g.lineWidth = 7;
      g.beginPath();
      g.arc(range(200, 800), range(200, 1200), range(70, 110), 0, Math.PI * 2);
      g.stroke();
    }
    g.strokeStyle = `rgba(40,28,20,${range(0.6, 0.85)})`;
    g.lineWidth = 2.2;
    const lh = range(34, 46);
    for (let y = range(90, 140); y < h - 80; y += lh) {
      let x = range(70, 110);
      const end = w - range(60, 160);
      while (x < end) {
        const ww = range(36, 120);
        g.beginPath();
        const ph = rand() * 6, fr = range(0.35, 0.55);
        for (let t = 0; t <= ww; t += 1.5) {
          const loop = Math.sin(t * fr + ph);
          g.lineTo(x + t + Math.cos(t * fr + ph) * 3.2, y - Math.abs(loop) * range(6, 11) * (rand() > 0.95 ? 2.2 : 1));
        }
        g.stroke();
        x += ww + range(12, 24);
      }
    }
    g.fillStyle = "rgba(255,255,255,0.16)";
    g.fillRect(0, h / 2, w, 3);
    g.fillStyle = "rgba(0,0,0,0.1)";
    g.fillRect(0, h / 2 + 3, w, 3);
    noise(g, w, h, 40000, 0.1);
  });
}

const paperFibers = () =>
  canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = "#808080";
    g.fillRect(0, 0, w, h);
    noise(g, w, h, 120000, 0.25);
    for (let i = 0; i < 900; i++) {
      g.strokeStyle = `rgba(255,255,255,${range(0.05, 0.2)})`;
      g.lineWidth = range(0.5, 1.2);
      const x = rand() * w, y = rand() * h, a = rand() * 6, l = range(6, 30);
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + range(-8, 8), y + range(-8, 8), x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
  }, false);

const pageEdgeTex = () =>
  canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#a88a5c";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(80,55,25,${range(0.05, 0.4)})`;
      g.fillRect(0, y, w, 1);
    }
    noise(g, w, h, 8000, 0.15);
  });

const windowTex = () =>
  canvasTex(1024, 2048, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#f4f8ff");
    grad.addColorStop(1, "#b9c8d8");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(20,25,30,0.9)";
    g.lineWidth = 9;
    for (let i = -h; i < w + h; i += 140) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + h * 0.6, h);
      g.stroke();
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i - h * 0.6, h);
      g.stroke();
    }
    g.fillStyle = "#0b0d0e";
    g.fillRect(w / 2 - 24, 0, 48, h);
    g.fillRect(0, h * 0.55, w, 44);
    g.fillRect(0, 0, 36, h);
    g.fillRect(w - 36, 0, 36, h);
  });

const dotSprite = () =>
  canvasTex(64, 64, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.4, "rgba(255,255,255,0.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });

// ---------- materials ----------
function makeMaterials() {
  const fibers = paperFibers();
  const leather = pbr("brown_leather", [1, 1], 8);
  const woodDesk = pbr("dark_wood", [2, 1.4]);
  const velvet = pbr("velour_velvet", [3, 8], 8);
  return {
    desk: new THREE.MeshPhysicalMaterial({
      ...woodDesk, color: 0x8a5a48, normalScale: new THREE.Vector2(0.6, 0.6),
      clearcoat: 0.6, clearcoatRoughness: 0.22,
    }),
    darkWood: new THREE.MeshStandardMaterial({ ...pbr("dark_wood", [1, 1], 8), color: 0x4a3028 }),
    leather,
    velvet: new THREE.MeshPhysicalMaterial({
      ...velvet, color: 0x3f9a50, sheen: 1, sheenColor: new THREE.Color(0x6adc7a), sheenRoughness: 0.35,
      side: THREE.DoubleSide,
    }),
    clearGlass: new THREE.MeshPhysicalMaterial({
      color: 0xfff0d0, roughness: 0.03, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false,
    }),
    brass: new THREE.MeshStandardMaterial({ color: 0xb08a4a, metalness: 1, roughness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 1, roughness: 0.18 }),
    blackMetal: new THREE.MeshPhysicalMaterial({ color: 0x0c0c0c, metalness: 0.3, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.85 }),
    keyTop: new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.3 }),
    flame: new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 6.5, 3.5), toneMapped: false }),
    papers: [0, 1, 2, 3, 4, 5].map(
      (v) => new THREE.MeshStandardMaterial({
        map: paperTex(v), bumpMap: fibers, bumpScale: 0.6, roughness: 0.88, side: THREE.DoubleSide,
      })
    ),
    pageEdge: new THREE.MeshStandardMaterial({ map: pageEdgeTex(), roughness: 0.95 }),
  };
}
type Mats = ReturnType<typeof makeMaterials>;

// ---------- mesh helpers ----------
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const rbox = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0, r = 0.004) =>
  mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2.01, h / 2.01, d / 2.01)), mat, x, y, z);
const lathe = (pts: number[][], mat: THREE.Material, x = 0, y = 0, z = 0) =>
  mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), 96), mat, x, y, z);
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0) =>
  mesh(new THREE.CylinderGeometry(rt, rb, h, 48), mat, x, y, z);
const unshadowed = <T extends THREE.Object3D>(o: T) => ((o.castShadow = false), o);

// One draw call for many copies of the same part. `place` sets up the dummy for each copy.
function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, place: (d: THREE.Object3D, i: number) => void) {
  const im = new THREE.InstancedMesh(geo, mat, n);
  const d = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    d.position.set(0, 0, 0);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    place(d, i);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  }
  im.castShadow = im.receiveShadow = true;
  return im;
}

// ---------- procedural props ----------
const COVER_TINTS = [0x8a5a3a, 0x6a3a22, 0x4a3a2a, 0x3a4a3a, 0x2a3a3a, 0x7a4a2a, 0x5a2a1a];

// Leather-bound book lying flat; spine on -x, length along z.
function book(w: number, t: number, d: number, m: Mats) {
  const g = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ ...m.leather, color: pick(COVER_TINTS) });
  const b = Math.max(0.0025, t * 0.08);
  g.add(rbox(w, b, d, cover, 0, t / 2 - b / 2, 0, 0.0015));
  g.add(rbox(w, b, d, cover, 0, -t / 2 + b / 2, 0, 0.0015));
  const spine = mesh(new THREE.CylinderGeometry(t / 2, t / 2, d, 32, 1, false, Math.PI, Math.PI), cover, -w / 2 + b, 0, 0);
  spine.rotation.x = Math.PI / 2;
  spine.scale.set(0.5, 1, 1);
  g.add(spine);
  g.add(mesh(new THREE.BoxGeometry(w - b * 2, t - 2 * b, d - b * 2.5), m.pageEdge, b * 0.4, 0, 0));
  for (const z of [-0.36, -0.3, 0.3, 0.36]) {
    g.add(mesh(new THREE.BoxGeometry(b * 1.2, t * 0.95, d * 0.01), m.brass, -w / 2 + b - t * 0.25, 0, z * d));
  }
  return g;
}

// A4 sheet, gently curled, lying flat.
function sheet(m: Mats, w = 0.21, h = 0.297) {
  const geo = new THREE.PlaneGeometry(w, h, 40, 56);
  const pos = geo.attributes.position;
  const curlX = range(0.004, 0.02) * (rand() > 0.5 ? 1 : -1);
  const curlY = range(0, 0.014);
  const wav = rand() * 6;
  const cornerLift = rand() > 0.6 ? range(0.005, 0.02) : 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2), y = pos.getY(i) / (h / 2);
    const corner = Math.max(0, x + y - 1.2) ** 2 * cornerLift * 3;
    const lift = Math.max(0, x * Math.sign(curlX)) ** 3 * Math.abs(curlX) + Math.max(0, -y) ** 4 * curlY
      + Math.sin(y * 3 + wav) * 0.0012 + Math.sin(x * 5 + y * 2 + wav) * 0.0006 + corner + 0.0012;
    pos.setZ(i, lift);
  }
  geo.computeVertexNormals();
  // thin curled sheets only receive shadows; casting them produces striping artifacts
  const p = unshadowed(mesh(geo, pick(m.papers)));
  p.rotation.x = -Math.PI / 2;
  const g = new THREE.Group();
  g.add(p);
  return g;
}

function openBook(m: Mats, w = 0.21, d = 0.3) {
  const g = new THREE.Group();
  const cover = new THREE.MeshStandardMaterial({ ...m.leather, color: 0x6a3a22 });
  g.add(rbox(w * 2 + 0.02, 0.005, d + 0.012, cover, 0, 0.0025, 0, 0.002));
  for (const s of [-1, 1]) {
    const thick = s < 0 ? 0.03 : 0.018;
    const shape = (uu: number) =>
      Math.sin(Math.min(1, uu * 1.6 + 0.05) * Math.PI * 0.5) * 0.028 - (1 - Math.min(1, uu * 6)) * 0.02;
    g.add(mesh(new THREE.BoxGeometry(w * 0.96, thick, d * 0.97), m.pageEdge, s * w * 0.5, 0.005 + thick / 2, 0));
    // a few stacked, slightly offset page surfaces give the block a riffled edge
    for (let k = 0; k < 3; k++) {
      const geo = new THREE.PlaneGeometry(w, d, 64, 12);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = (pos.getX(i) + w / 2) / w;
        const uu = s > 0 ? u : 1 - u;
        pos.setZ(i, shape(uu) - k * 0.0015 + Math.sin(pos.getY(i) * 30 + k) * 0.0004 * uu);
      }
      geo.computeVertexNormals();
      const page = mesh(geo, pick(m.papers));
      page.rotation.x = -Math.PI / 2;
      page.position.set(s * (w * 0.5 + k * 0.002), 0.005 + thick + 0.0005, k * 0.0015);
      g.add(page);
    }
  }
  return g;
}

function typewriter(m: Mats) {
  const g = new THREE.Group();
  g.add(rbox(0.32, 0.07, 0.2, m.blackMetal, 0, 0.035, -0.02, 0.014));
  const deck = rbox(0.3, 0.012, 0.13, m.blackMetal, 0, 0.055, 0.1, 0.005);
  deck.rotation.x = 0.35;
  g.add(deck);
  const key = (i: number) => {
    const r = Math.floor(i / 11), c = i % 11;
    return { x: -0.12 + c * 0.024 + (r % 2) * 0.008, y: 0.035 + r * 0.011, z: 0.15 - r * 0.026 };
  };
  g.add(instanced(new THREE.CylinderGeometry(0.0015, 0.0015, 0.03, 8), m.blackMetal, 44, (d, i) => {
    const k = key(i);
    d.position.set(k.x, k.y, k.z - 0.01);
  }));
  g.add(instanced(new THREE.CylinderGeometry(0.009, 0.009, 0.004, 32), m.chrome, 44, (d, i) => {
    const k = key(i);
    d.position.set(k.x, k.y + 0.016, k.z);
  }));
  g.add(instanced(new THREE.CylinderGeometry(0.0075, 0.0075, 0.0045, 32), m.keyTop, 44, (d, i) => {
    const k = key(i);
    d.position.set(k.x, k.y + 0.0165, k.z);
  }));
  const space = rbox(0.18, 0.008, 0.014, m.chrome, 0, 0.03, 0.175, 0.004);
  g.add(space);
  // type-bar basket: fan of thin bars
  g.add(instanced(new THREE.BoxGeometry(0.002, 0.001, 0.07), m.chrome, 30, (d, i) => {
    const a = Math.PI * (0.15 + (i / 29) * 0.7);
    d.position.set(Math.cos(a) * 0.05, 0.072, -0.03 - Math.sin(a) * 0.02);
    d.rotation.y = a - Math.PI / 2;
  }));
  // carriage, platen, knobs, ribbon spools, return lever
  g.add(rbox(0.4, 0.03, 0.06, m.blackMetal, 0, 0.09, -0.1, 0.01));
  const platen = cyl(0.022, 0.022, 0.38, m.rubber, 0, 0.12, -0.1);
  platen.rotation.z = Math.PI / 2;
  g.add(platen);
  for (const s of [-1, 1]) {
    const knob = cyl(0.02, 0.02, 0.025, m.blackMetal, s * 0.21, 0.12, -0.1);
    knob.rotation.z = Math.PI / 2;
    g.add(knob);
    g.add(cyl(0.028, 0.028, 0.01, m.blackMetal, s * 0.1, 0.078, 0.0));
    g.add(cyl(0.018, 0.018, 0.012, m.rubber, s * 0.1, 0.086, 0.0));
  }
  const lever = mesh(new THREE.TorusGeometry(0.04, 0.003, 12, 48, Math.PI * 0.6), m.chrome, -0.22, 0.13, -0.08);
  lever.rotation.set(0, Math.PI / 2, 0.4);
  g.add(lever);
  return g;
}

function smallLamp(m: Mats) {
  const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.03, 0], [0.032, 0.006], [0.018, 0.015], [0.012, 0.03], [0.02, 0.035], [0, 0.036]], m.brass));
  g.add(unshadowed(lathe([[0.016, 0], [0.022, 0.015], [0.02, 0.035], [0.012, 0.05]], m.clearGlass, 0, 0.036, 0)));
  const flame = unshadowed(mesh(new THREE.SphereGeometry(1, 24, 16), m.flame, 0, 0.052, 0));
  flame.scale.set(0.004, 0.01, 0.004);
  g.add(flame);
  const light = new THREE.PointLight(0xffa850, 0.012, 0.6, 2);
  light.position.y = 0.06;
  g.add(light);
  Object.assign(g.userData, { flame, light, base: 0.012, flameY: 0.01 });
  return g;
}

function inkwell(m: Mats) {
  const g = new THREE.Group();
  g.add(rbox(0.22, 0.012, 0.08, m.darkWood, 0, 0.006, 0, 0.004));
  g.add(lathe([[0, 0], [0.028, 0], [0.03, 0.02], [0.02, 0.03], [0.012, 0.04], [0.014, 0.045], [0, 0.045]], m.brass, 0.06, 0.012, 0));
  const pen = cyl(0.003, 0.004, 0.16, m.blackMetal, 0.065, 0.1, 0);
  pen.rotation.z = -0.25;
  g.add(pen);
  return g;
}

// ---------- background ----------
function background(m: Mats) {
  const g = new THREE.Group();
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.6),
    new THREE.MeshBasicMaterial({ map: windowTex(), color: new THREE.Color(1.7, 1.7, 1.8), fog: false })
  );
  win.position.set(0.3, 0.75, -1.9);
  g.add(win);

  const cgeo = new THREE.PlaneGeometry(0.7, 2.2, 240, 8);
  const cp = cgeo.attributes.position;
  for (let i = 0; i < cp.count; i++) {
    const x = cp.getX(i), y = cp.getY(i);
    cp.setZ(i, Math.sin(x * 45) * 0.03 + Math.sin(x * 13) * 0.02 + Math.sin(x * 90 + y * 2) * 0.004);
  }
  cgeo.computeVertexNormals();
  const curtain = mesh(cgeo, m.velvet, 0.95, 0.7, -1.5);
  curtain.rotation.y = -0.5;
  g.add(curtain);

  const shelfMat = new THREE.MeshStandardMaterial({ ...pbr("dark_wood", [1, 2], 4), color: 0x2a1a12 });
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.4, 0.05), shelfMat, -0.9, 0.6, -2.1));
  const spines: { x: number; y: number; t: number; h: number }[] = [];
  for (let s = 0; s < 6; s++) {
    const y = -0.4 + s * 0.38;
    g.add(mesh(new THREE.BoxGeometry(1.6, 0.03, 0.3), shelfMat, -0.9, y, -1.95));
    let x = -1.65;
    while (x < -0.2) {
      const t = range(0.025, 0.06), h = range(0.22, 0.32);
      spines.push({ x: x + t / 2, y: y + 0.015 + h / 2, t, h });
      x += t + 0.002;
    }
  }
  // ~200 spines in one instanced draw, tinted per instance
  const spineMesh = instanced(new RoundedBoxGeometry(1, 1, 0.22, 2, 0.004),
    new THREE.MeshStandardMaterial({ ...m.leather }), spines.length, (d, i) => {
      d.position.set(spines[i].x, spines[i].y, -1.95);
      d.scale.set(spines[i].t, spines[i].h, 1);
    });
  spines.forEach((_, i) => spineMesh.setColorAt(i, new THREE.Color(pick(COVER_TINTS))));
  g.add(spineMesh);
  return g;
}

// Fake volumetric shaft from the window: additive cone, brightest at the window, soft at the edges.
function lightShaft(from: THREE.Vector3, to: THREE.Vector3) {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.42, 0.75, len, 64, 1, true);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(0xcfdcff) }, uStrength: { value: 0.05 } },
    vertexShader: `
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = uv.y;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uStrength;
      varying vec3 vN; varying vec3 vV; varying float vY;
      void main() {
        float edge = pow(abs(dot(vN, vV)), 3.0);
        float along = smoothstep(1.0, 0.3, vY) * smoothstep(0.0, 0.15, vY); // uv.y = 0 at the window end
        gl_FragColor = vec4(uColor * edge * along * uStrength, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from).add(to).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize().negate());
  return m;
}

function dust(from: THREE.Vector3, to: THREE.Vector3, n = 900) {
  const axis = from.clone().sub(to);
  const len = axis.length();
  axis.normalize();
  const tmp = new THREE.Vector3(1, 0, 0);
  const u = tmp.clone().cross(axis).normalize();
  const v = axis.clone().cross(u).normalize();
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = range(0.05, 0.9);
    const r = (0.75 + (0.42 - 0.75) * t) * Math.sqrt(rand()) * 0.9;
    const a = rand() * Math.PI * 2;
    const p = to.clone().addScaledVector(axis, t * len).addScaledVector(u, Math.cos(a) * r).addScaledVector(v, Math.sin(a) * r);
    pos.set([p.x, p.y, p.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => i), 1));
  const mat = new THREE.PointsMaterial({
    map: dotSprite(), size: 0.005, color: 0xfff2dc, transparent: true, opacity: 0.55,
    depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  // Drift runs in the vertex shader: no per-frame CPU loop or buffer re-upload.
  const uTime = { value: 0 };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nattribute float aSeed;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        transformed += vec3(sin(uTime * 0.13 + aSeed) * 0.02,
                            sin(uTime * 0.09 + aSeed * 1.7) * 0.03,
                            cos(uTime * 0.11 + aSeed * 0.7) * 0.02);`);
  };
  const pts = new THREE.Points(geo, mat);
  pts.userData.uTime = uTime;
  return pts;
}

// ---------- scanned models ----------
// Big items stand on the bare desk (y=0); small props rest on top of the paper pile (paperTop).
async function loadModels(scene: THREE.Scene, m: Mats, paperTop: number, flickers: THREE.Object3D[]) {
  const loader = new GLTFLoader();
  const load = (name: string) => loader.loadAsync(`${ASSETS}/models/${name}/${name}.gltf`).then((g) => g.scene);
  const [lantern, books, spectacles, watch, magnifier, postcards, stationery, bottles] = await Promise.all(
    ["Lantern_01", "book_encyclopedia_set_01", "round_spectacles", "vintage_pocket_watch", "magnifying_glass_01",
      "postcard_set_01", "stationery_supplies", "wine_bottles_01"].map(load)
  );
  // Transmission glass costs an extra scene render and blows out under the lamp; swap for plain transparent glass.
  const shadows = (o: THREE.Object3D) =>
    o.traverse((c) => {
      const mm = c as THREE.Mesh;
      if (!mm.isMesh) return;
      mm.castShadow = mm.receiveShadow = true;
      const mat = mm.material as THREE.MeshPhysicalMaterial;
      if (mat.transmission > 0) {
        mat.transmission = 0;
        mat.transparent = true;
        mat.opacity = mat.name.includes("green") || mat.name.includes("wine") ? 0.8 : 0.22;
        mat.depthWrite = false;
        mat.roughness = Math.min(mat.roughness, 0.08);
        mm.castShadow = false;
      }
    });
  const place = (o: THREE.Object3D, x: number, y: number, z: number, ry = 0, s = 1) => {
    o.position.set(x, y, z);
    o.rotation.y = ry;
    o.scale.setScalar(s);
    shadows(o);
    scene.add(o);
    return o;
  };
  // Re-centre a node so its bounding box bottom sits on y=0 and x/z are centred.
  const grounded = (o: THREE.Object3D) => {
    o.position.set(0, 0, 0);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const c = box.getCenter(new THREE.Vector3());
    o.position.set(-c.x, -box.min.y, -c.z);
    const g = new THREE.Group();
    g.add(o);
    g.userData.size = box.getSize(new THREE.Vector3());
    return g;
  };

  // --- green hurricane lantern (hero) ---
  const L = 1.8;
  lantern.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (mat.name.includes("glass")) {
      // dark albedo + green emission: the lamp inside tints it instead of washing it out
      mesh.material = new THREE.MeshPhysicalMaterial({
        color: 0x061208, emissive: 0x2c8a3c, emissiveIntensity: 1.8, roughness: 0.04, transparent: true,
        opacity: 0.62, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.5,
      });
      mesh.castShadow = false;
    } else {
      const painted = mat.clone() as THREE.MeshPhysicalMaterial;
      painted.transmission = 0;
      painted.color = new THREE.Color(0.28, 0.5, 0.32);
      mesh.material = painted;
    }
  });
  place(lantern, 0.36, 0, -0.33, 0.4, L);
  shadows(lantern);
  lantern.traverse((c) => {
    if ((c as THREE.Mesh).isMesh && (c as THREE.Mesh).material instanceof THREE.MeshPhysicalMaterial) c.castShadow = false;
  });
  lantern.updateMatrixWorld(true); // bbox below must be in world space
  const glass = lantern.getObjectByName("Lantern_01_glass")!;
  const gBox = new THREE.Box3().setFromObject(glass);
  const flamePos = gBox.getCenter(new THREE.Vector3());
  flamePos.y = gBox.min.y + (gBox.max.y - gBox.min.y) * 0.42;
  const flame = unshadowed(mesh(new THREE.SphereGeometry(1, 32, 24), m.flame, flamePos.x, flamePos.y, flamePos.z));
  flame.scale.set(0.012, 0.026, 0.012);
  scene.add(flame);
  const light = new THREE.PointLight(0xe0f0b0, 0.45, 0, 2);
  light.position.copy(flamePos);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.003;
  light.shadow.camera.near = 0.08;
  scene.add(light);
  const holder = new THREE.Object3D();
  const glassMat = (glass as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
  // level: 1 lit, 0 out (eased in the render loop). hover: 0..1 outline strength.
  Object.assign(holder.userData, { flame, light, base: 0.45, flameY: 0.026, level: 1, lit: true, hover: 0, lantern, glassMat });
  flickers.push(holder);

  // --- encyclopedia volumes, laid flat into stacks ---
  const volumes = books.children.filter((c) => c.name.includes("book"));
  const coverTints = [new THREE.Color(1, 1, 1), new THREE.Color(0.75, 0.55, 0.4), new THREE.Color(0.55, 0.7, 0.6), new THREE.Color(0.9, 0.55, 0.45)];
  const flatBook = (i: number) => {
    const src = volumes[i % volumes.length].clone();
    src.traverse((c) => {
      const mm = c as THREE.Mesh;
      if (!mm.isMesh) return;
      const cm = (mm.material as THREE.MeshStandardMaterial).clone();
      // aged, yellowed pages; varied cloth covers
      cm.color = cm.name.includes("cover") ? pick(coverTints) : new THREE.Color(0.62, 0.52, 0.38);
      mm.material = cm;
    });
    src.rotation.set(0, 0, Math.PI / 2);
    return grounded(src);
  };
  const stack = (n: number, x: number, z: number, ry: number, s: number, jitter: number) => {
    let y = 0;
    for (let i = 0; i < n; i++) {
      const b = flatBook(Math.floor(rand() * 100));
      b.rotation.y = ry + range(-jitter, jitter) + (rand() > 0.7 ? Math.PI : 0);
      place(b, x + range(-0.008, 0.008), y, z + range(-0.008, 0.008), b.rotation.y, s);
      y += b.userData.size.y * s;
    }
    return y;
  };
  stack(7, -0.28, -0.5, Math.PI / 2 + 0.05, 1.3, 0.08);
  stack(6, 0.62, -0.2, 0.1, 1.35, 0.05);

  // --- small props ---
  const spec = grounded(spectacles);
  place(spec, 0.1, paperTop, -0.12, 0.4 + Math.PI, 1);

  const w = grounded(watch);
  w.children[0].rotation.x = -Math.PI / 2;
  const wg = grounded(w);
  place(wg, 0.26, paperTop, 0.12, 0.8, 1);

  magnifier.rotation.x = -Math.PI / 2;
  place(grounded(magnifier), -0.08, paperTop, 0.25, -0.5, 1);

  const cards = postcards.children.slice(0, 3);
  cards.forEach((c, i) => {
    const card = grounded(c.clone());
    place(card, -0.55 + i * 0.07, paperTop + i * 0.001, 0.12 + i * 0.03, range(-0.6, 0.6), 1);
  });

  for (const name of ["stationery_supplies_pen_fancy", "stationery_supplies_pencil_old"]) {
    const p = stationery.getObjectByName(name);
    if (p) place(grounded(p.clone()), range(0.0, 0.15), paperTop, range(0.3, 0.38), range(-0.8, -0.3), 1);
  }

  const green = bottles.children.find((b) => {
    let hit = false;
    b.traverse((c) => {
      const mm = c as THREE.Mesh;
      if (mm.isMesh && (Array.isArray(mm.material) ? mm.material : [mm.material]).some((x) => x.name.includes("green"))) hit = true;
    });
    return hit;
  }) ?? bottles.children[0];
  place(grounded(green.clone()), -0.52, 0, -0.72, 0.6, 1);

  return holder;
}

// ---------- scene ----------
function buildScene(scene: THREE.Scene) {
  seed = 42;
  const m = makeMaterials();
  const flickers: THREE.Object3D[] = [];

  const deskGeo = new RoundedBoxGeometry(2.2, 0.05, 1.5, 6, 0.012);
  deskGeo.setAttribute("uv1", deskGeo.attributes.uv);
  const desk = mesh(deskGeo, m.desk, 0.1, -0.025, -0.3);
  desk.rotation.y = 0.08;
  scene.add(desk);
  const apron = mesh(new THREE.BoxGeometry(2.1, 0.7, 0.05), m.darkWood, 0.1, -0.4, 0.42);
  apron.rotation.y = 0.08;
  scene.add(apron);

  const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number, ry = 0) => {
    o.position.set(x, y, z);
    o.rotation.y = ry;
    scene.add(o);
    return o;
  };

  at(typewriter(m), 0.08, 0, -0.52, -0.35);

  // right foreground: big leather tomes
  let sy = 0;
  for (const [bw, bd] of [[0.36, 0.32], [0.38, 0.34], [0.36, 0.33], [0.35, 0.3]]) {
    const t = range(0.035, 0.055);
    at(book(bw, t, bd, m), 0.58 + range(-0.01, 0.01), sy + t / 2, 0.3, 0.05 + range(-0.03, 0.03) + Math.PI);
    sy += t;
  }
  at(book(0.22, 0.03, 0.3, m), -0.1, 0.015, -0.28, 1.4);

  let y = 0.001;
  for (let i = 0; i < 16; i++) {
    const cx = i < 4 ? range(-0.65, -0.4) : range(-0.35, 0.22);
    const cz = i < 4 ? range(-0.35, -0.2) : range(-0.05, 0.45);
    at(sheet(m), cx, y, cz, range(-0.5, 0.5) + (rand() > 0.6 ? Math.PI / 2 : 0));
    y += 0.0012;
  }
  at(openBook(m), -0.33, y, -0.02, 0.28);
  at(inkwell(m), 0.2, y, -0.04, -0.15);
  flickers.push(at(smallLamp(m), 0.02, y, -0.2));

  scene.add(background(m));

  const winPt = new THREE.Vector3(0.3, 0.9, -1.85);
  const deskPt = new THREE.Vector3(0.0, -0.05, 0.1);
  scene.add(lightShaft(winPt, deskPt));
  const motes = dust(winPt, deskPt);
  scene.add(motes);

  return { m, flickers, motes, paperTop: y };
}

// Final grade: subtle chromatic fringe, green-teal shadows / warm highlights, vignette, film grain.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      vec2 off = d * 0.004;
      vec3 c = vec3(texture2D(tDiffuse, vUv - off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv + off).b);
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c * vec3(0.88, 1.04, 1.0), c * vec3(1.05, 1.0, 0.92), smoothstep(0.15, 0.7, l));
      c += vec3(0.0, 0.006, 0.005) * (1.0 - l);
      c *= 1.0 - smoothstep(0.3, 0.85, length(d * vec2(1.0, 1.15))) * 0.8;
      float n = fract(sin(dot(vUv * 1024.0 + fract(uTime) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
      c += (n - 0.5) * 0.03;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export default function DeskScene() {
  const mount = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = mount.current!;
    let disposed = false;
    // Every loader here (textures, glTFs, HDRI) goes through three's default manager, so it sees all of it.
    // onLoad fires whenever the pending count hits zero; the model/HDRI promises below cover the gaps between.
    const manager = THREE.DefaultLoadingManager;
    const allFiles = new Promise<void>((r) => (manager.onLoad = r));
    manager.onProgress = (_, loaded, total) => !disposed && setProgress((p) => Math.max(p, loaded / total));
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    const maxRatio = Math.min(devicePixelRatio, 1.5);
    let ratio = maxRatio;
    renderer.setPixelRatio(ratio);
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Nothing in the scene moves and the lights only change intensity, so shadow maps are rendered
    // on demand (after load) instead of every frame. That skips 7 scene passes (sun + 6 cube faces).
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const bg = new THREE.Color(0x050706);
    scene.background = bg;
    scene.fog = new THREE.FogExp2(bg, 0.34);
    scene.environmentIntensity = 0.22;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new HDRLoader().loadAsync(`${ASSETS}/hdri/old_room_2k.hdr`).then((hdr) => {
      if (disposed) return;
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
    });

    scene.add(new THREE.HemisphereLight(0x1d2e24, 0x060403, 0.2));
    const sun = new THREE.DirectionalLight(0xe4ecff, 2.0);
    sun.position.set(0.5, 1.3, -1.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -1.2;
    sc.right = sc.top = 1.2;
    sc.near = 0.1;
    sc.far = 5;
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.008;
    scene.add(sun, sun.target);

    const { m, flickers, motes, paperTop } = buildScene(scene);
    let lamp: THREE.Object3D | null = null;
    const models = loadModels(scene, m, paperTop, flickers).then((h) => {
      lamp = h;
      renderer.shadowMap.needsUpdate = true;
    });

    const camera = new THREE.PerspectiveCamera(42, el.clientWidth / el.clientHeight, 0.02, 20);
    camera.position.set(0.0, 0.62, 0.98);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0.05, 0.03, -0.2);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.3;
    controls.minDistance = 0.4;
    controls.maxDistance = 2.2;

    const size = () => [el.clientWidth, el.clientHeight] as const;
    const rt = new THREE.WebGLRenderTarget(...size(), { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    const ao = new GTAOPass(scene, camera, ...size());
    // Half the AO and denoise samples: the result is blurred and low-contrast here, so the loss is invisible.
    ao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 1, thickness: 0.5, scale: 1, samples: 8 });
    ao.updatePdMaterial({ samples: 8 });
    ao.blendIntensity = 0.9;
    composer.addPass(ao);
    composer.addPass(new BokehPass(scene, camera, { focus: 1.3, aperture: 0.015, maxblur: 0.02 }));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(...size()), 0.5, 0.6, 1.0));
    // Hover outline; the pass is skipped entirely while nothing is selected.
    const outline = new OutlinePass(new THREE.Vector2(...size()), scene, camera);
    outline.edgeGlow = 1;
    outline.edgeThickness = 2;
    outline.visibleEdgeColor.set(0xa8ffb8);
    outline.hiddenEdgeColor.set(0x2a5a34);
    composer.addPass(outline);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);

    const clock = new THREE.Clock();
    // Dynamic resolution: each second, drop render scale if under ~50fps, raise it back if above ~58.
    let frames = 0, windowStart = 0;
    const adaptResolution = (t: number) => {
      frames++;
      if (t - windowStart < 1) return;
      const fps = frames / (t - windowStart);
      frames = 0;
      windowStart = t;
      const next = fps < 50 ? Math.max(0.6, ratio - 0.15) : fps > 58 ? Math.min(maxRatio, ratio + 0.1) : ratio;
      if (next !== ratio) {
        ratio = next;
        renderer.setPixelRatio(ratio);
        composer.setPixelRatio(ratio);
      }
    };
    renderer.setAnimationLoop(() => {
      const dt = clock.getDelta();
      const t = clock.elapsedTime;
      easeLamp(dt);
      adaptResolution(t);
      flickers.forEach((f, i) => {
        const k = 1 + Math.sin(t * 11 + i * 3) * 0.03 + Math.sin(t * 6.1 + i) * 0.04 + Math.sin(t * 23 + i) * 0.015;
        const lvl = f.userData.level ?? 1;
        (f.userData.light as THREE.PointLight).intensity = f.userData.base * k * lvl;
        (f.userData.flame as THREE.Mesh).scale.y = f.userData.flameY * k * lvl;
        (f.userData.flame as THREE.Mesh).visible = lvl > 0.02;
      });
      motes.userData.uTime.value = t;
      grade.uniforms.uTime.value = t;
      controls.update();
      composer.render();
    });

    // Compile shaders before revealing so the first visible frames don't hitch.
    Promise.all([models, env, allFiles])
      .then(() => renderer.compileAsync(scene, camera))
      .catch((e) => console.error("desk scene load failed", e))
      .finally(() => !disposed && setReady(true));

    // Lantern: hover highlights it, a click (not an orbit drag) blows it out / relights it.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovering = false;
    const overLamp = (e: PointerEvent) => {
      if (!lamp) return false;
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObject(lamp.userData.lantern, true).length > 0;
    };
    const onMove = (e: PointerEvent) => {
      hovering = e.buttons === 0 && overLamp(e);
      renderer.domElement.style.cursor = hovering ? "pointer" : "";
    };
    let downAt = [0, 0];
    const onDown = (e: PointerEvent) => (downAt = [e.clientX, e.clientY]);
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5 || !overLamp(e)) return;
      lamp!.userData.lit = !lamp!.userData.lit;
    };
    const canvas = renderer.domElement;
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    const easeLamp = (dt: number) => {
      if (!lamp) return;
      const u = lamp.userData;
      const ease = 1 - Math.exp(-dt * 6);
      u.level += ((u.lit ? 1 : 0) - u.level) * ease;
      u.hover += ((hovering ? 1 : 0) - u.hover) * ease;
      (u.glassMat as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.12 + 1.68 * u.level;
      outline.edgeStrength = 4 * u.hover;
      outline.selectedObjects = u.hover > 0.01 ? [u.lantern] : [];
    };

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(...size());
      composer.setSize(...size());
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      manager.onLoad = manager.onProgress = () => {};
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      renderer.setAnimationLoop(null);
      controls.dispose();
      composer.dispose();
      pmrem.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative h-screen w-full bg-[#050706]">
      <div ref={mount} className="h-full w-full" />
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#050706] transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`}
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-sm tracking-[0.3em] text-[#c9b98f]/70 uppercase">Lighting the lamp</p>
        <div className="h-px w-48 bg-[#c9b98f]/15">
          <div className="h-full bg-[#c9b98f]/70 transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
