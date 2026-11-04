// WorldGlobe: the interactive backdrop of the sign-in page. A dotted Earth
// (continents from `land-mask.ts`) with an atmosphere glow and graticule;
// glowing hubs in cities joined by raised arcs, with packets of work flying
// along them and a ripple where each lands: OpenFlows agents passing work
// across a distributed team.
//
// It reacts to the pointer: the globe leans toward the cursor, land dots near
// the cursor light up, and it can be dragged to spin (with inertia) before it
// eases back into its slow auto-rotation.
//
// Placement is relative to the canvas: `x`/`y` are the centre as fractions of
// width/height and `size` is the radius as a fraction of the shorter side, so
// the globe can sit behind a whole page. A first frame is drawn synchronously
// on mount, so the globe is never blank while the browser defers animation
// frames (background tab, slow first paint).
//
// Drawn on one <canvas> with no dependencies. Decorative (`aria-hidden`) and
// built to stay cheap: device-pixel ratio is capped at 2, the loop pauses when
// the tab is hidden or the canvas is off screen, and under
// `prefers-reduced-motion` one still frame is drawn and the pointer is ignored.
"use client";

import { useEffect, useRef } from "react";

import { LAND_B64, LAND_H, LAND_W } from "./land-mask";

type V3 = [number, number, number];

const DEG = Math.PI / 180;
const DOT_STEP = 1.55; // degrees between land dots
const GREEN = "76,184,138";
const VIOLET = "139,124,246";

// Hubs: [name, lat, lon]. Purely illustrative locations, not customer data.
const HUBS: [string, number, number][] = [
  ["San Francisco", 37.77, -122.42],
  ["New York", 40.71, -74.0],
  ["São Paulo", -23.55, -46.63],
  ["London", 51.5, -0.12],
  ["Berlin", 52.52, 13.4],
  ["Nuremberg", 49.45, 11.08],
  ["Lagos", 6.52, 3.37],
  ["Yaoundé", 3.85, 11.5],
  ["Nairobi", -1.29, 36.82],
  ["Bangalore", 12.97, 77.59],
  ["Singapore", 1.35, 103.82],
  ["Tokyo", 35.68, 139.69],
  ["Sydney", -33.87, 151.21],
];
const ROUTES: [number, number][] = [
  [0, 1], [1, 3], [3, 4], [4, 5], [5, 7], [7, 6], [6, 2], [2, 1], [4, 9], [9, 10], [10, 11], [11, 0], [10, 12], [7, 8], [8, 9], [3, 7], [0, 12], [5, 11],
];

function toVec(lat: number, lon: number): V3 {
  const c = Math.cos(lat * DEG);
  return [c * Math.sin(lon * DEG), Math.sin(lat * DEG), c * Math.cos(lon * DEG)];
}

function landDots(): V3[] {
  const raw = atob(LAND_B64);
  const isLand = (lat: number, lon: number) => {
    const r = Math.min(LAND_H - 1, Math.floor(((90 - lat) / 180) * LAND_H));
    const c = Math.min(LAND_W - 1, Math.floor(((lon + 180) / 360) * LAND_W));
    const i = r * LAND_W + c;
    return ((raw.charCodeAt(i >> 3) >> (i & 7)) & 1) === 1;
  };
  const dots: V3[] = [];
  for (let lat = -58; lat <= 82; lat += DOT_STEP) {
    const ring = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / DOT_STEP));
    for (let k = 0; k < ring; k++) {
      const lon = -180 + (k * 360) / ring;
      if (isLand(lat, lon)) dots.push(toVec(lat, lon));
    }
  }
  return dots;
}

/** Points along the great circle a→b, lifted off the surface in the middle. */
function arcPoints(a: V3, b: V3, n = 48): V3[] {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const s = Math.sin(omega) || 1;
  const lift = 0.08 + omega * 0.14;
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ka = Math.sin((1 - t) * omega) / s, kb = Math.sin(t * omega) / s;
    const h = 1 + lift * Math.sin(Math.PI * t);
    pts.push([(a[0] * ka + b[0] * kb) * h, (a[1] * ka + b[1] * kb) * h, (a[2] * ka + b[2] * kb) * h]);
  }
  return pts;
}

export function WorldGlobe({
  className = "",
  x = 0.5,
  y = 0.5,
  size = 0.4,
}: Readonly<{ className?: string; x?: number; y?: number; size?: number }>) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dots = landDots();
    const hubs = HUBS.map(([, lat, lon]) => toVec(lat, lon));
    const arcs = ROUTES.map(([a, b], i) => ({
      a, b, pts: arcPoints(hubs[a], hubs[b]),
      t: (i * 0.37) % 1, speed: 0.22 + ((i * 7) % 5) * 0.04, hue: i % 4 === 3 ? VIOLET : GREEN,
    }));
    const ripple = new Float32Array(hubs.length);

    let w = 0, h = 0, dpr = 1, cx = 0, cy = 0, R = 0;
    let yaw = -0.35, pitch = 0.32; // start over Europe/Africa, tilted to show the north
    let leanX = 0, leanY = 0, targetLeanX = 0, targetLeanY = 0;
    let velYaw = 0, velPitch = 0, dragging = false, lastPX = 0, lastPY = 0;
    let mouseX = -9999, mouseY = -9999;
    let raf = 0, last = performance.now(), visible = true;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w, h) * size;
      cx = w * x; cy = h * y;
    }

    // Rotation (yaw about Y, then pitch about X) as a cached 3x3 per frame.
    let m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    function setRotation() {
      const y = yaw + leanX, p = pitch + leanY;
      const cyw = Math.cos(y), syw = Math.sin(y), cp = Math.cos(p), sp = Math.sin(p);
      m = [cyw, 0, syw, sp * syw, cp, -sp * cyw, -cp * syw, sp, cp * cyw];
    }
    function project(v: V3) {
      const x = m[0] * v[0] + m[1] * v[1] + m[2] * v[2];
      const y = m[3] * v[0] + m[4] * v[1] + m[5] * v[2];
      const z = m[6] * v[0] + m[7] * v[1] + m[8] * v[2];
      return { x: cx + x * R, y: cy - y * R, z, out: x * x + y * y > 1 };
    }

    function draw(dt: number) {
      ctx!.clearRect(0, 0, w, h);
      setRotation();

      // Atmosphere and body.
      const halo = ctx!.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.35);
      halo.addColorStop(0, `rgba(${GREEN},0.16)`);
      halo.addColorStop(1, `rgba(${GREEN},0)`);
      ctx!.fillStyle = halo;
      ctx!.beginPath(); ctx!.arc(cx, cy, R * 1.35, 0, Math.PI * 2); ctx!.fill();
      const body = ctx!.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, "#10201b");
      body.addColorStop(0.65, "#0a110f");
      body.addColorStop(1, "#070a09");
      ctx!.fillStyle = body;
      ctx!.beginPath(); ctx!.arc(cx, cy, R, 0, Math.PI * 2); ctx!.fill();
      ctx!.strokeStyle = `rgba(${GREEN},0.28)`;
      ctx!.lineWidth = 1;
      ctx!.beginPath(); ctx!.arc(cx, cy, R, 0, Math.PI * 2); ctx!.stroke();

      // Graticule: parallels and meridians every 30°, front side only.
      ctx!.strokeStyle = "rgba(255,255,255,0.05)";
      ctx!.lineWidth = 0.8;
      for (let lat = -60; lat <= 60; lat += 30) strokeLine((t) => toVec(lat, -180 + t * 360));
      for (let lon = -180; lon < 180; lon += 30) strokeLine((t) => toVec(-80 + t * 160, lon));

      // Land dots, shaded by depth, lit up near the cursor.
      const size = Math.max(1.1, R / 210);
      for (const v of dots) {
        const p = project(v);
        if (p.z <= 0) continue;
        const dx = p.x - mouseX, dy = p.y - mouseY;
        const near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (R * 0.32));
        const a = 0.22 + p.z * 0.7;
        if (near > 0) {
          ctx!.fillStyle = `rgba(${GREEN},${Math.min(1, a + near * 0.8)})`;
          const s = size * (1 + near * 0.9);
          ctx!.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        } else {
          ctx!.fillStyle = `rgba(200,214,208,${a})`;
          ctx!.fillRect(p.x - size / 2, p.y - size / 2, size, size);
        }
      }

      // Arcs: faint full route plus a bright travelling packet.
      for (const arc of arcs) {
        arc.t += dt * arc.speed;
        if (arc.t >= 1.25) { arc.t = 0; }
        if (arc.t >= 1 && arc.t - dt * arc.speed < 1) ripple[arc.b] = 1;
        const proj = arc.pts.map(project);
        const vis = (q: ReturnType<typeof project>) => q.z > 0 || q.out;
        ctx!.lineWidth = 1;
        ctx!.strokeStyle = `rgba(${arc.hue},0.35)`;
        ctx!.beginPath();
        let pen = false;
        for (const q of proj) {
          if (!vis(q)) { pen = false; continue; }
          if (pen) ctx!.lineTo(q.x, q.y); else { ctx!.moveTo(q.x, q.y); pen = true; }
        }
        ctx!.stroke();

        if (arc.t < 1) {
          const head = Math.min(proj.length - 1, Math.max(0, Math.floor(arc.t * (proj.length - 1))));
          const tail = Math.max(0, head - 10);
          for (let i = tail; i < head; i++) {
            const q0 = proj[i], q1 = proj[i + 1];
            if (!vis(q0) || !vis(q1)) continue;
            ctx!.strokeStyle = `rgba(${arc.hue},${((i - tail + 1) / (head - tail + 1)) * 0.95})`;
            ctx!.lineWidth = 1.8;
            ctx!.beginPath(); ctx!.moveTo(q0.x, q0.y); ctx!.lineTo(q1.x, q1.y); ctx!.stroke();
          }
          const q = proj[head];
          if (vis(q)) {
            ctx!.fillStyle = `rgba(${arc.hue},1)`;
            ctx!.beginPath(); ctx!.arc(q.x, q.y, 2.2, 0, Math.PI * 2); ctx!.fill();
          }
        }
      }

      // Hubs with a landing ripple.
      hubs.forEach((v, i) => {
        const p = project(v);
        ripple[i] = Math.max(0, ripple[i] - dt * 0.9);
        if (p.z <= 0.02) return;
        const r = ripple[i];
        if (r > 0) {
          ctx!.strokeStyle = `rgba(${GREEN},${r * 0.7})`;
          ctx!.lineWidth = 1.2;
          ctx!.beginPath(); ctx!.arc(p.x, p.y, 3 + (1 - r) * 16, 0, Math.PI * 2); ctx!.stroke();
        }
        const glow = ctx!.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9);
        glow.addColorStop(0, `rgba(${GREEN},${0.55 * p.z})`);
        glow.addColorStop(1, `rgba(${GREEN},0)`);
        ctx!.fillStyle = glow;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = `rgba(230,255,244,${0.4 + 0.6 * p.z})`;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx!.fill();
      });
    }

    function strokeLine(at: (t: number) => V3) {
      ctx!.beginPath();
      let pen = false;
      for (let i = 0; i <= 72; i++) {
        const p = project(at(i / 72));
        if (p.z <= 0) { pen = false; continue; }
        if (pen) ctx!.lineTo(p.x, p.y); else { ctx!.moveTo(p.x, p.y); pen = true; }
      }
      ctx!.stroke();
    }

    function frame(now: number) {
      // rAF timestamps can precede the performance.now() taken in start(), so
      // clamp: a negative step would run packets backwards off their arcs.
      const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
      last = now;
      if (!dragging) {
        // Inertia from a drag decays into the slow auto-rotation.
        velYaw += (0.09 - velYaw) * Math.min(1, dt * 1.5);
        velPitch *= Math.max(0, 1 - dt * 3);
        yaw += velYaw * dt;
        pitch += velPitch * dt;
        pitch += (0.32 - pitch) * Math.min(1, dt * 0.8);
      }
      leanX += (targetLeanX - leanX) * Math.min(1, dt * 3);
      leanY += (targetLeanY - leanY) * Math.min(1, dt * 3);
      draw(dt);
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (reduced || raf || !visible || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top;
      targetLeanX = Math.max(-1, Math.min(1, (mouseX - cx) / (R * 2))) * 0.25;
      targetLeanY = Math.max(-1, Math.min(1, (mouseY - cy) / (R * 2))) * -0.18;
      if (dragging) {
        const dx = e.clientX - lastPX, dy = e.clientY - lastPY;
        lastPX = e.clientX; lastPY = e.clientY;
        yaw += dx / R; pitch = Math.max(-1.2, Math.min(1.2, pitch + dy / R));
        velYaw = (dx / R) * 60; velPitch = (dy / R) * 60;
      }
    };
    const onLeave = () => { mouseX = mouseY = -9999; targetLeanX = targetLeanY = 0; };
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left - cx, dy = e.clientY - rect.top - cy;
      if (dx * dx + dy * dy > R * R * 1.1) return; // only grab the globe itself
      dragging = true; lastPX = e.clientX; lastPY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      canvas.style.cursor = "";
    };
    const onHoverCursor = (e: PointerEvent) => {
      if (dragging) return;
      const rect = canvas.getBoundingClientRect();
      const dx = e.clientX - rect.left - cx, dy = e.clientY - rect.top - cy;
      canvas.style.cursor = dx * dx + dy * dy <= R * R ? "grab" : "";
    };

    resize();
    if (reduced) {
      arcs.forEach((a) => { a.t = 0.6; });
      draw(0);
    } else {
      draw(0);
      start();
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointermove", onHoverCursor);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);
    }

    const ro = new ResizeObserver(() => { resize(); draw(0); });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    io.observe(canvas);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointermove", onHoverCursor);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [x, y, size]);

  return <canvas ref={ref} aria-hidden className={`h-full w-full touch-none ${className}`} />;
}
