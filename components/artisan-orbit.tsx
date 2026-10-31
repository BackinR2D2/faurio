"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

function randomIndex() {
  return Math.floor(Math.random() * models.length);
}

export function ArtisanOrbit({ onReady, onUnavailable }: { onReady?: () => void; onUnavailable?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [model, setModel] = useState<(typeof models)[number] | null>(null);

  useEffect(() => { queueMicrotask(() => setModel(models[randomIndex()])); }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !model) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0.15, 6.6);
    camera.lookAt(0, 0, 0);

    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "default" }); }
    catch { host.setAttribute("aria-label", "Previzualizare 3D indisponibilă pe acest dispozitiv"); onUnavailable?.(); return; }
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
        host.setAttribute("data-loaded", "true");
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
        host.setAttribute("aria-label", "Modelul 3D nu a putut fi încărcat");
        onUnavailable?.();
      }
    );

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
      controls.handleResize();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibility.observe(host);
    const startedAt = performance.now();
    let animationFrame = 0;
    let lastFrame = 0;
    const render = (now: number) => {
      animationFrame = requestAnimationFrame(render);
      if (document.hidden || !visible || now - lastFrame < 32) return;
      lastFrame = now;
      const elapsed = (now - startedAt) / 1000;
      const rotation = reducedMotion ? 0 : elapsed * 0.024;
      const movement = reducedMotion ? 0 : elapsed * 0.22;
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
      renderer.render(scene, camera);
    };
    animationFrame = requestAnimationFrame(render);

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      visibility.disconnect();
      controls.dispose();
      gsap.killTweensOf(objectRoot.scale);
      disposeModel(scene);
      environment.texture.dispose();
      environmentGenerator.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [model, onReady, onUnavailable]);

  return (
    <div className="artisan-stage">
      <div
        ref={hostRef}
        className="artisan-orbit"
        aria-label={model ? `Model 3D: ${model.name}` : "Se încarcă modelul 3D"}
        role="img"
      />
    </div>
  );
}
