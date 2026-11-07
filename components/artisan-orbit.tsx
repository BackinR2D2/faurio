"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HERO_INTERVAL_MS, heroModels, shuffledHeroModels, type HeroModel } from "@/lib/hero-models";

function disposeModel(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) textures.add(value); });
    });
  });
  textures.forEach((texture) => { if (typeof ImageBitmap !== "undefined" && texture.source.data instanceof ImageBitmap) texture.source.data.close(); texture.dispose(); });
  materials.forEach((material) => material.dispose());
  geometries.forEach((geometry) => geometry.dispose());
}

export function ArtisanOrbit({ onReady, onUnavailable }: { onReady?: () => void; onUnavailable?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.removeAttribute("data-loaded");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.15, 6.6);
    camera.lookAt(0, 0, 0);
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "default" }); }
    catch { host.setAttribute("aria-label", "Previzualizare 3D indisponibilă pe acest dispozitiv"); queueMicrotask(() => setBusy(false)); onUnavailable?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    host.appendChild(renderer.domElement);

    const controls = new TrackballControls(camera, renderer.domElement);
    controls.rotateSpeed = 1.45;
    controls.zoomSpeed = 0.55;
    controls.panSpeed = 0.22;
    controls.dynamicDampingFactor = 0.12;
    controls.target.set(0, 0, 0);
    let interacting = false;
    let focused = false;
    let hovered = false;
    let manuallyPaused = false;
    let editing = false;
    let dirty = true;
    let visible = false;
    let active = true;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = preference.matches;
    const paused = () => reducedMotion || manuallyPaused || interacting || focused || hovered || editing || !visible || document.hidden;
    const updatePlayback = () => { host.dataset.playback = paused() ? "paused" : "playing"; };
    controls.addEventListener("start", () => { interacting = true; updatePlayback(); });
    controls.addEventListener("end", () => { interacting = false; updatePlayback(); });
    controls.addEventListener("change", () => { dirty = true; });

    const environmentGenerator = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = environmentGenerator.fromScene(room, 0.04, 0.1, 100, { size: 64 });
    room.dispose();
    scene.environment = environment.texture;
    const stage = new THREE.Group();
    scene.add(stage);
    const key = new THREE.DirectionalLight(0xfff4e4, 2.4);
    key.position.set(4.5, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd7e9e4, 1.3);
    fill.position.set(-4, 1.5, 4);
    scene.add(fill);
    const rim = new THREE.PointLight(0x188fa7, 3, 12);
    rim.position.set(-3, 3.5, -2);
    scene.add(rim);

    type Prepared = { root: THREE.Group; model: HeroModel };
    let current: Prepared | undefined;
    let upcoming: Prepared | undefined;
    let deck = shuffledHeroModels();
    let rotation = 0;
    let movement = 0;
    let elapsed = 0;
    let lastFrame = performance.now();
    let waitingForFirstFrame = false;
    let preparing = false;
    let transitioning = false;
    const roots = new Set<THREE.Group>();
    const failed = new Set<string>();
    const pendingLoads = new Set<{ abort: () => void }>();
    const loader = new GLTFLoader();
    const load = (model: HeroModel) => new Promise<Prepared>((resolve, reject) => {
      let settled = false;
      const request = { abort: () => finish(new Error("Model loading cancelled")) };
      const finish = (error?: Error, value?: Prepared) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        pendingLoads.delete(request);
        if (error) reject(error); else resolve(value!);
      };
      const timeout = setTimeout(() => finish(new Error("Model loading timed out")), 20000);
      pendingLoads.add(request);
      loader.load(model.path, (gltf) => {
        if (!active || settled) { disposeModel(gltf.scene); return; }
        const loadedScene = gltf.scene;
        const sphere = new THREE.Box3().setFromObject(loadedScene).getBoundingSphere(new THREE.Sphere());
        const scale = 1.25 / Math.max(sphere.radius, 0.001);
        loadedScene.scale.setScalar(scale);
        loadedScene.position.copy(sphere.center).multiplyScalar(-scale);
        loadedScene.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => { if (material instanceof THREE.MeshStandardMaterial) material.envMapIntensity = 0.8; });
        });
        const root = new THREE.Group();
        root.rotation.set(model.orientation[0], model.orientation[1], model.orientation[2]);
        root.add(loadedScene);
        roots.add(root);
        finish(undefined, { root, model });
      }, undefined, () => finish(new Error("Model unavailable")));
    });
    const release = (item: Prepared) => {
      gsap.killTweensOf(item.root.scale);
      stage.remove(item.root);
      dirty = true;
      roots.delete(item.root);
      disposeModel(item.root);
    };
    const nextModel = () => {
      if (!deck.length) deck = shuffledHeroModels(current?.model.path);
      return deck.shift()!;
    };
    const prepareNext = async () => {
      if (preparing || upcoming || !active || failed.size >= heroModels.length) return;
      preparing = true;
      for (let attempt = 0; attempt < heroModels.length && active; attempt++) {
        const model = nextModel();
        if (failed.has(model.path)) continue;
        try {
          const item = await load(model);
          if (!active) { release(item); break; }
          try { await renderer.compileAsync(item.root, camera, scene); }
          catch (error) { release(item); throw error; }
          if (!active) { release(item); break; }
          upcoming = item;
          break;
        } catch { if (active) failed.add(model.path); }
      }
      preparing = false;
    };
    const showNext = () => {
      if (!upcoming || transitioning || !active) return;
      const previous = current;
      current = upcoming;
      upcoming = undefined;
      transitioning = true;
      rotation = 0;
      elapsed = 0;
      waitingForFirstFrame = true;
      controls.reset();
      resize();
      stage.add(current.root);
      dirty = true;
      lastFrame = performance.now();
      const complete = () => { if (previous) release(previous); transitioning = false; if (!reducedMotion) void prepareNext(); };
      if (reducedMotion || !previous) { current.root.scale.setScalar(1); complete(); return; }
      if (previous) gsap.to(previous.root.scale, { x: 0, y: 0, z: 0, duration: 0.25, ease: "power2.in", onUpdate: () => { dirty = true; } });
      gsap.fromTo(current.root.scale, { x: 0.85, y: 0.85, z: 0.85 }, { x: 1, y: 1, z: 1, duration: 0.45, ease: "power2.out", onUpdate: () => { dirty = true; }, onComplete: complete });
    };

    const resize = () => {
      dirty = true;
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
    const keyboard = (event: KeyboardEvent) => {
      if ([" ", "Escape"].includes(event.key)) {
        event.preventDefault();
        manuallyPaused = event.key === "Escape" || !manuallyPaused;
        updatePlayback();
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const horizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
        const axis = new THREE.Vector3(horizontal ? 0 : 1, horizontal ? 1 : 0, 0);
        const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
        camera.position.sub(controls.target).applyAxisAngle(axis, 0.15 * direction).add(controls.target);
        camera.lookAt(controls.target);
      }
      if (event.key === "Home") { event.preventDefault(); controls.reset(); resize(); }
    };
    const focus = () => { focused = true; updatePlayback(); };
    const blur = () => { focused = false; updatePlayback(); };
    const enter = (event: PointerEvent) => { if (event.pointerType === "mouse") { hovered = true; updatePlayback(); } };
    const leave = () => { hovered = false; updatePlayback(); };
    const motion = () => { reducedMotion = preference.matches; updatePlayback(); if (!reducedMotion) void prepareNext(); };
    const editingChanged = () => queueMicrotask(() => {
      if (!active) return;
      editing = Boolean(document.activeElement?.matches("input, textarea, [contenteditable=true]"));
      updatePlayback();
    });
    host.addEventListener("keydown", keyboard);
    host.addEventListener("focus", focus);
    host.addEventListener("blur", blur);
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", updatePlayback);
    document.addEventListener("focusin", editingChanged);
    document.addEventListener("focusout", editingChanged);
    editingChanged();
    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updatePlayback(); });
    visibility.observe(host);
    updatePlayback();
    void prepareNext().then(() => {
      if (!active) return;
      if (upcoming) showNext();
      else { setBusy(false); onUnavailable?.(); }
    });

    let animationFrame = 0;
    const render = () => {
      animationFrame = requestAnimationFrame(render);
      const now = performance.now();
      if (now - lastFrame < 32) return;
      const frameTime = now - lastFrame;
      const delta = Math.min(frameTime / 1000, 0.05);
      lastFrame = now;
      if (document.hidden || !visible) return;
      if (!paused()) {
        rotation += delta * 0.018;
        movement += delta * 0.16;
        elapsed += frameTime;
        if (elapsed >= HERO_INTERVAL_MS && !transitioning) showNext();
      }
      if (current) current.root.rotation.set(current.model.orientation[0] + rotation, current.model.orientation[1] + rotation, current.model.orientation[2] + rotation);
      stage.position.set(Math.sin(movement) * 0.035, Math.sin(movement + (Math.PI * 2) / 3) * 0.035, Math.sin(movement + (Math.PI * 4) / 3) * 0.035);
      controls.update();
      controls.target.clampLength(0, 0.18);
      if (paused() && !dirty) return;
      renderer.render(scene, camera);
      dirty = false;
      if (waitingForFirstFrame && current) {
        host.dataset.model = current.model.path;
        host.setAttribute("aria-label", `Model 3D: ${current.model.name}`);
        host.dataset.loaded = "true";
        setBusy(false);
        onReady?.();
        elapsed = 0; lastFrame = performance.now(); waitingForFirstFrame = false;
      }
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      active = false;
      pendingLoads.forEach((request) => request.abort());
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      visibility.disconnect();
      controls.dispose();
      host.removeEventListener("keydown", keyboard);
      host.removeEventListener("focus", focus);
      host.removeEventListener("blur", blur);
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", updatePlayback);
      document.removeEventListener("focusin", editingChanged);
      document.removeEventListener("focusout", editingChanged);
      roots.forEach((root) => { gsap.killTweensOf(root.scale); disposeModel(root); });
      environment.texture.dispose();
      environmentGenerator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onReady, onUnavailable]);

  return <div className="artisan-stage" role="region" aria-label="Colecție de obiecte 3D" aria-busy={busy}>
    <div ref={hostRef} className="artisan-orbit" aria-label="Se încarcă modelul 3D" role="img" tabIndex={0} aria-describedby="artisan-help" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home Space Escape" />
    <span id="artisan-help" className="sr-only">Trage pentru a roti obiectul. Schimbarea automată se oprește când interacționezi sau focalizezi scena. Săgețile rotesc obiectul, Home resetează poziția, Space comută pauza și Escape oprește animația.</span>
  </div>;
}
