"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

const models = [
  {
    name: "Vază ceramică antică cu model floral",
    path: "/models/antique-ceramic-vase/antique_ceramic_vase_01_2k.gltf",
    orientation: [-0.08, -0.35, 0.02],
  },
  {
    name: "Elefant sculptat în lemn",
    path: "/models/carved-wooden-elephant/carved_wooden_elephant_2k.gltf",
    orientation: [-0.1, -0.55, 0.04],
  },
  {
    name: "Perne decorative țesute",
    path: "/models/throw-pillows/throw_pillows_01_2k.gltf",
    orientation: [-0.18, -0.42, 0.06],
  },
  {
    name: "Vază ceramică pictată",
    path: "/models/ceramic-vase-02/ceramic_vase_02_2k.gltf",
    orientation: [-0.08, -0.48, 0.02],
  },
  {
    name: "Vază din alamă gravată",
    path: "/models/brass-vase-03/brass_vase_03_2k.gltf",
    orientation: [-0.06, -0.38, 0.02],
  },
  {
    name: "Cupe ornamentale din alamă",
    path: "/models/brass-goblets/brass_goblets_2k.gltf",
    orientation: [-0.14, -0.5, 0.04],
  },
  {
    name: "Serviciu de ceai floral",
    path: "/models/tea-set/tea_set_01_2k.gltf",
    orientation: [-0.2, -0.44, 0.04],
  },
] as const;

function randomDeck() {
  const shuffled = [...models];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const random = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[random]] = [shuffled[random], shuffled[index]];
  }
  return shuffled.slice(0, 4);
}

export function ArtisanOrbit({ onReady, onUnavailable, onLoading }: { onReady?: () => void; onUnavailable?: () => void; onLoading?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [deck, setDeck] = useState<(typeof models)[number][]>([]);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(true);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const resetRef = useRef<() => void>(() => {});
  const model = deck[index];

  useEffect(() => { queueMicrotask(() => { setDeck(randomDeck()); const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; setPaused(reduce); pausedRef.current = reduce; }); }, []);
  const select = (next: number) => {
    if (busy || next === index) return;
    setBusy(true);
    onLoading?.();
    setIndex((next + deck.length) % deck.length);
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !model) return;
    host.removeAttribute("data-loaded");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.15, 6.6);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "default" }); }
    catch { host.setAttribute("aria-label", "Previzualizare 3D indisponibilă pe acest dispozitiv"); queueMicrotask(() => setBusy(false)); onUnavailable?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    host.appendChild(renderer.domElement);

    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 1.45;
    controls.zoomSpeed = 0.55;
    controls.panSpeed = 0.22;
    controls.dynamicDampingFactor = 0.12;
    controls.minDistance = 6;
    controls.maxDistance = 8.6;
    controls.target.set(0, 0, 0);
    let interacting = false;
    controls.addEventListener("start", () => { interacting = true; });
    controls.addEventListener("end", () => { interacting = false; });

    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = environmentGenerator.fromScene(room, 0.04);
    room.dispose();
    scene.environment = environment.texture;

    const stage = new THREE.Group();
    const objectRoot = new THREE.Group();
    stage.add(objectRoot);
    scene.add(stage);

    const key = new THREE.DirectionalLight(0xfff4d2, 3.8);
    key.position.set(4.5, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9dbbae, 2.4);
    fill.position.set(-4, 1.5, 4);
    scene.add(fill);
    const rim = new THREE.PointLight(0x188fa7, 5, 12);
    rim.position.set(-3, 3.5, -2);
    scene.add(rim);

    let active = true;
    const timeout = setTimeout(() => {
      if (!active || host.dataset.loaded === "true") return;
      active = false;
      setBusy(false);
      onUnavailable?.();
    }, 20000);
    let visible = true;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const disposeModel = (root: THREE.Object3D) => {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
          material.dispose();
        });
      });
    };
    const loader = new GLTFLoader();
    loader.load(
      model.path,
      (gltf) => {
        if (!active) { disposeModel(gltf.scene); return; }
        const loadedScene = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(loadedScene);
        const sphere = bounds.getBoundingSphere(new THREE.Sphere());
        const scale = 1.25 / Math.max(sphere.radius, 0.001);
        loadedScene.scale.setScalar(scale);
        loadedScene.position.copy(sphere.center).multiplyScalar(-scale);
        loadedScene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial)
              material.envMapIntensity = 1.1;
          });
        });
        objectRoot.rotation.set(
          model.orientation[0],
          model.orientation[1],
          model.orientation[2]
        );
        objectRoot.add(loadedScene);
        clearTimeout(timeout);
        host.setAttribute("data-loaded", "true");
        setBusy(false);
        onReady?.();
        if (!reducedMotion) gsap.fromTo(
          objectRoot.scale,
          { x: 0.88, y: 0.88, z: 0.88 },
          { x: 1, y: 1, z: 1, duration: 1.4, ease: "power3.out" }
        );
      },
      undefined,
      () => {
        if (!active) return;
        clearTimeout(timeout);
        host.setAttribute("aria-label", "Modelul 3D nu a putut fi încărcat");
        setBusy(false);
        onUnavailable?.();
      }
    );

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      const vertical = THREE.MathUtils.degToRad(camera.fov);
      const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
      const distance = 1.35 / Math.sin(Math.min(vertical, horizontal) / 2) * 1.12;
      camera.position.sub(controls.target).normalize().multiplyScalar(distance).add(controls.target);
      controls.minDistance = distance;
      controls.maxDistance = distance * 1.5;
      camera.updateProjectionMatrix();
      controls.handleResize();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    resetRef.current = () => { controls.reset(); resize(); };
    const keyboard = (event: KeyboardEvent) => {
      const amount = 0.15;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const axis = new THREE.Vector3(event.key.includes("Left") || event.key.includes("Right") ? 0 : 1, event.key.includes("Left") || event.key.includes("Right") ? 1 : 0, 0);
        const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        camera.position.sub(controls.target).applyAxisAngle(axis, amount * direction).add(controls.target);
        camera.lookAt(controls.target);
      }
      if (event.key === "Home") { event.preventDefault(); resetRef.current(); }
    };
    host.addEventListener("keydown", keyboard);

    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(host);
    let rotation = 0;
    let movement = 0;
    let animationFrame = 0;
    let lastFrame = 0;
    const render = (now: number) => {
      animationFrame = requestAnimationFrame(render);
      if (document.hidden || !visible || now - lastFrame < 32) return;
      const delta = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      if (!pausedRef.current && !interacting) { rotation += delta * 0.018; movement += delta * 0.16; }
      objectRoot.rotation.set(
        model.orientation[0] + rotation,
        model.orientation[1] + rotation,
        model.orientation[2] + rotation
      );
      stage.position.set(
        Math.sin(movement) * 0.035,
        Math.sin(movement + (Math.PI * 2) / 3) * 0.035,
        Math.sin(movement + (Math.PI * 4) / 3) * 0.035
      );
      controls.update();
      controls.target.clampLength(0, 0.18);
      renderer.render(scene, camera);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      active = false;
      clearTimeout(timeout);
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      visibility.disconnect();
      controls.dispose();
      host.removeEventListener("keydown", keyboard);
      gsap.killTweensOf(objectRoot.scale);
      disposeModel(scene);
      environment.texture.dispose();
      environmentGenerator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [model, onReady, onUnavailable]);

  return (
    <div className="artisan-stage" role="region" aria-label="Colecție de obiecte 3D" aria-roledescription="carusel" aria-busy={busy}>
      <div
        ref={hostRef}
        className="artisan-orbit"
        aria-label={model ? `Model 3D: ${model.name}` : "Se încarcă modelul 3D"}
        role="img"
        tabIndex={0}
      />
      {deck.length > 0 && <div className="artisan-controls">
        <div className="artisan-caption" aria-live="polite"><span>{busy ? "Se încarcă obiectul…" : model.name}</span><small>{index + 1} / {deck.length}</small></div>
        <div className="artisan-actions"><button type="button" disabled={busy} onClick={() => select(index - 1)} aria-label="Obiectul anterior"><ChevronLeft size={18} /></button><div className="artisan-dots">{deck.map((item, position) => <button type="button" key={item.path} disabled={busy} aria-label={`Arată ${item.name}`} aria-current={position === index ? "true" : undefined} onClick={() => select(position)} />)}</div><button type="button" disabled={busy} onClick={() => select(index + 1)} aria-label="Obiectul următor"><ChevronRight size={18} /></button><button type="button" onClick={() => resetRef.current()} disabled={busy} aria-label="Resetează poziția"><RotateCcw size={16} /></button><button type="button" onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }} aria-label={paused ? "Pornește mișcarea" : "Oprește mișcarea"}>{paused ? <Play size={16} /> : <Pause size={16} />}</button></div>
      </div>}
    </div>
  );
}
