"use client";

import { useEffect, useRef } from "react";

const TEXT = "antipluto.com";
const GRID = 1.05;
const DOT_RADIUS = 0.5;
const HOVER_RADIUS = 260;
const PULL_FORCE = 2200;
const SWIRL = 1.2;
const EVENT_HORIZON = 8;
const SPRING = 0.02;
const DAMPING = 0.92;

const VERT = `#version 300 es
in vec2 a_pos;
uniform vec2 u_res;
uniform float u_size;
void main() {
  vec2 clip = (a_pos / u_res) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = u_size;
}`;

const FRAG = `#version 300 es
precision mediump float;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = dot(p, p);
  if (d > 0.25) discard;
  float a = smoothstep(0.25, 0.20, d);
  outColor = vec4(0.0, 0.0, 0.0, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
  }
  return s;
}

export default function HalftoneCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -1e6, y: -1e6, active: false };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uSize = gl.getUniformLocation(prog, "u_size");
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const aPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let targets: Float32Array = new Float32Array(0);
    let positions: Float32Array = new Float32Array(0);
    let velocities: Float32Array = new Float32Array(0);
    let count = 0;
    let W = 0;
    let H = 0;

    function sampleText() {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      W = w * dpr;
      H = h * dpr;
      canvas!.width = W;
      canvas!.height = H;
      gl!.viewport(0, 0, W, H);
      gl!.uniform2f(uRes, W, H);
      gl!.uniform1f(uSize, DOT_RADIUS * 2 * dpr * 2.4);

      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const ctx = off.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      const fontSize = Math.min(W, H) * 0.15;
      ctx.fillStyle = "#000";
      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(TEXT, W / 2, H / 2);

      const img = ctx.getImageData(0, 0, W, H).data;
      const step = GRID * dpr;
      const pts: number[] = [];
      for (let y = step / 2; y < H; y += step) {
        for (let x = step / 2; x < W; x += step) {
          const i = ((y | 0) * W + (x | 0)) * 4;
          if (img[i] < 128) {
            pts.push(x + (Math.random() - 0.5) * step * 0.4, y + (Math.random() - 0.5) * step * 0.4);
          }
        }
      }
      count = pts.length / 2;
      targets = new Float32Array(pts);
      positions = new Float32Array(pts);
      velocities = new Float32Array(pts.length);
    }

    function frame() {
      const r = HOVER_RADIUS * dpr;
      const horizon = EVENT_HORIZON * dpr;
      for (let i = 0; i < count; i++) {
        const ix = i * 2;
        const iy = ix + 1;

        let pulled = 0;
        if (mouse.active) {
          const mx = mouse.x - positions[ix];
          const my = mouse.y - positions[iy];
          const d2 = mx * mx + my * my;
          if (d2 < r * r) {
            const d = Math.max(Math.sqrt(d2), horizon);
            const strength = (1 - d / r) * PULL_FORCE * 0.016;
            const nx = mx / d;
            const ny = my / d;
            velocities[ix] += nx * strength;
            velocities[iy] += ny * strength;
            velocities[ix] += -ny * strength * SWIRL;
            velocities[iy] += nx * strength * SWIRL;
            pulled = 1 - d / r;
            if (d <= horizon) {
              positions[ix] = mouse.x;
              positions[iy] = mouse.y;
              velocities[ix] = 0;
              velocities[iy] = 0;
            }
          }
        }

        const spring = SPRING * (1 - pulled);
        velocities[ix] += (targets[ix] - positions[ix]) * spring;
        velocities[iy] += (targets[iy] - positions[iy]) * spring;

        velocities[ix] *= DAMPING;
        velocities[iy] *= DAMPING;
        positions[ix] += velocities[ix];
        positions[iy] += velocities[iy];
      }

      gl!.clearColor(1, 1, 1, 1);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.bufferData(gl!.ARRAY_BUFFER, positions, gl!.DYNAMIC_DRAW);
      gl!.drawArrays(gl!.POINTS, 0, count);
      raf = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
      mouse.active = true;
    }
    function onLeave() {
      mouse.active = false;
    }
    function onResize() {
      sampleText();
    }

    sampleText();
    let raf = requestAnimationFrame(frame);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);

    // ponytail: re-samples text on every resize; fine at typical DPRs, throttle if profiling shows jank.

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="fixed inset-0 h-screen w-screen" />;
}
