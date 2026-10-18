import {
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { brewLook, mixColour } from "@/domain/steep";
import { cssColour, type CreateScene } from "../scene";

/**
 * The steep glass in 3D (D-068). A turned tumbler; the brew inside fills, darkens, swirls and lets
 * its grounds settle as the steep runs, read from the same --steep (0 to 1) that drives the SVG
 * glass. Dragging sideways tilts the glass and the brew sloshes, then both settle back.
 */

/** Glass dimensions in scene units: the inside floor and the highest the brew reaches. */
const FLOOR = 0.1;
const BRIM = 1.36;
const DARK_BREW = "#2a1a0e";
const GROUNDS = "#1a110a";
const MAX_TILT = 0.45;
const DRIP_MS = 1600;

const profile = (points: readonly [number, number][]) => points.map(([x, y]) => new Vector2(x, y));

const GLASS_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const GLASS_FRAG = /* glsl */ `
  uniform vec3 uTint;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec3 n = normalize(vNormal);
    float facing = abs(dot(n, normalize(vView)));
    float rim = pow(1.0 - facing, 2.5);
    float streak = smoothstep(0.55, 0.75, n.x) * smoothstep(0.95, 0.8, n.x);
    gl_FragColor = vec4(uTint, 0.04 + 0.6 * rim + 0.35 * streak);
  }
`;

const LIQUID_VERT = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vLocal = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const LIQUID_FRAG = /* glsl */ `
  uniform float uSurface;
  uniform vec3 uPlane;
  uniform vec3 uBrew;
  uniform vec3 uTop;
  uniform vec3 uGrounds;
  uniform vec3 uRim;
  uniform float uSettled;
  uniform float uTime;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    if (dot(vLocal - vec3(0.0, uSurface, 0.0), uPlane) > 0.0) discard;
    if (!gl_FrontFacing) {
      gl_FragColor = vec4(uTop, 1.0);
      return;
    }
    float h = clamp((vLocal.y - ${FLOOR.toFixed(2)}) / ${(BRIM - FLOOR).toFixed(2)}, 0.0, 1.0);
    float angle = atan(vLocal.z, vLocal.x);
    float swirl = sin(angle * 3.0 + vLocal.y * 9.0 - uTime * 0.7) * 0.5 + 0.5;
    vec3 colour = uBrew * (0.72 + 0.28 * h) + swirl * 0.035;
    float bed = ${FLOOR.toFixed(2)} + 0.13 * uSettled;
    float speck = hash(floor(vec2(angle * 40.0, vLocal.y * 120.0)));
    float inBed = smoothstep(bed + 0.012, bed - 0.012, vLocal.y);
    colour = mix(colour, uGrounds * (0.8 + 0.4 * speck), inBed * uSettled);
    vec3 n = normalize(vNormal);
    float rim = pow(1.0 - abs(dot(n, normalize(vView))), 3.0);
    gl_FragColor = vec4(colour + uRim * rim * 0.3, 1.0);
  }
`;

/** A damped spring, for the tilt and the slosh that trails it. */
function spring(stiffness: number, damping: number) {
  let value = 0;
  let velocity = 0;
  return {
    get value() {
      return value;
    },
    get moving() {
      return Math.abs(velocity) > 1e-4;
    },
    step(target: number, dt: number) {
      velocity += ((target - value) * stiffness - velocity * damping) * dt;
      value += velocity * dt;
      return value;
    },
    kick(amount: number) {
      velocity += amount;
    },
  };
}

/** The nearest ancestor that carries --steep inline (the steep clock stage, or the explorer). */
function steepSource(host: HTMLElement): HTMLElement | null {
  for (let el = host.parentElement; el; el = el.parentElement) {
    if (el.style.getPropertyValue("--steep") !== "") return el;
  }
  return null;
}

export const createScene: CreateScene = (canvas, host, wake) => {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0, 1.84, 4.37);
  camera.lookAt(0, 0.66, 0);

  const glass = new Group();
  scene.add(glass);

  const amber = cssColour(document.documentElement, "--color-amber", "#d98e3b");
  const tint = cssColour(host, "--fg", "#ece7df");

  const liquidGeometry = new LatheGeometry(
    profile([
      [0, FLOOR],
      [0.413, FLOOR],
      [0.488, BRIM],
    ]),
    72,
  );
  const liquidMaterial = new ShaderMaterial({
    vertexShader: LIQUID_VERT,
    fragmentShader: LIQUID_FRAG,
    side: DoubleSide,
    uniforms: {
      uSurface: { value: FLOOR },
      uPlane: { value: new Vector3(0, 1, 0) },
      uBrew: { value: new Vector3(...mixColour(amber, DARK_BREW, 0)) },
      uTop: { value: new Vector3(...mixColour(amber, DARK_BREW, 0)) },
      uGrounds: { value: new Vector3(...mixColour(GROUNDS, GROUNDS, 0)) },
      uRim: { value: new Vector3(...mixColour(amber, amber, 0)) },
      uSettled: { value: 0 },
      uTime: { value: 0 },
    },
  });
  const liquid = new Mesh(liquidGeometry, liquidMaterial);
  glass.add(liquid);

  const glassGeometry = new LatheGeometry(
    profile([
      [0, 0],
      [0.44, 0],
      [0.52, 1.4],
      [0.49, 1.4],
      [0.415, FLOOR],
      [0, FLOOR],
    ]),
    72,
  );
  const glassMaterial = new ShaderMaterial({
    vertexShader: GLASS_VERT,
    fragmentShader: GLASS_FRAG,
    side: DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: { uTint: { value: new Vector3(...mixColour(tint, tint, 0)) } },
  });
  const shell = new Mesh(glassGeometry, glassMaterial);
  shell.renderOrder = 1;
  glass.add(shell);

  const dropGeometry = new SphereGeometry(0.035, 16, 12);
  const dropMaterial = new MeshBasicMaterial({ color: amber, transparent: true });
  const drop = new Mesh(dropGeometry, dropMaterial);
  scene.add(drop);

  const source = { el: steepSource(host) };
  const tilt = spring(60, 9);
  const slosh = spring(38, 3.2);
  let target = 0;
  let lastLevel = 0;
  let last = 0;

  /* Sideways drag tilts the glass. Listeners sit on the host: the canvas lets events through. */
  let dragFrom: number | null = null;
  const down = (e: PointerEvent) => {
    dragFrom = e.clientX;
    host.setPointerCapture(e.pointerId);
    wake();
  };
  const move = (e: PointerEvent) => {
    if (dragFrom === null) return;
    target = Math.max(-MAX_TILT, Math.min(MAX_TILT, (e.clientX - dragFrom) / 140));
    wake();
  };
  const up = () => {
    dragFrom = null;
    target = 0;
    wake();
  };
  host.addEventListener("pointerdown", down);
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up);
  host.addEventListener("pointercancel", up);

  const plane = new Vector3();
  const inverse = new Quaternion();
  return {
    frame(now) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;

      source.el ??= steepSource(host);
      const progress = Number.parseFloat(source.el?.style.getPropertyValue("--steep") ?? "") || 0;
      const look = brewLook(progress);
      /* A change of level (scrolling the steep) nudges the brew, as pouring would. */
      slosh.kick((look.level - lastLevel) * 6);
      lastLevel = look.level;

      tilt.step(target, dt);
      slosh.step(tilt.value, dt);
      glass.rotation.z = -tilt.value;
      glass.rotation.y = now * 0.00012;

      /* The surface is level in the world once the brew catches up with the glass; until then it leans by the lag. */
      const lean = (tilt.value - slosh.value) * 0.9;
      plane.set(-Math.sin(lean), Math.cos(lean), 0).applyQuaternion(inverse.copy(glass.quaternion).invert());

      const u = liquidMaterial.uniforms;
      u.uSurface!.value = FLOOR + look.level * (BRIM - FLOOR);
      u.uPlane!.value = plane;
      (u.uBrew!.value as Vector3).set(...mixColour(amber, DARK_BREW, look.darkness));
      (u.uTop!.value as Vector3).set(...mixColour(amber, DARK_BREW, Math.min(1, look.darkness + 0.08)));
      u.uSettled!.value = look.settled;
      u.uTime!.value = now / 1000;
      liquid.visible = look.level > 0.002;

      /* The drip, as on the SVG glass: falls from above the rim into the brew, until the glass is full. */
      const t = (now % DRIP_MS) / DRIP_MS;
      const surfaceY = u.uSurface!.value as number;
      drop.visible = look.level < 0.98;
      drop.position.set(0, 2.05 - (2.05 - surfaceY) * t * t, 0);
      dropMaterial.opacity = Math.min(1, t * 6) * (1 - Math.max(0, t - 0.9) * 10);

      renderer.render(scene, camera);
      return true;
    },
    resize(width, height, dpr) {
      if (!width || !height) return;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose() {
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up);
      for (const thing of [liquidGeometry, liquidMaterial, glassGeometry, glassMaterial, dropGeometry, dropMaterial]) {
        thing.dispose();
      }
      renderer.dispose();
    },
  };
};
