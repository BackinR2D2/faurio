"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ArtisanOrbit() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 6.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const group = new THREE.Group();
    group.rotation.set(-0.18, -0.3, 0.12);
    scene.add(group);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.38, 4),
      new THREE.MeshStandardMaterial({ color: 0x9f3428, roughness: 0.92, metalness: 0.02, flatShading: true }),
    );
    group.add(core);

    const threadMaterial = new THREE.MeshStandardMaterial({ color: 0xf1dfc4, roughness: 0.75, metalness: 0.01 });
    const greenThread = new THREE.MeshStandardMaterial({ color: 0x173f35, roughness: 0.72 });
    for (let index = 0; index < 11; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.47 + (index % 3) * 0.018, 0.018 + (index % 2) * 0.006, 7, 120),
        index % 4 === 0 ? greenThread : threadMaterial,
      );
      ring.rotation.set(index * 0.37, index * 0.59, index * 0.23);
      group.add(ring);
    }

    const charm = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.34, 0.08, 80, 12, 2, 3),
      new THREE.MeshStandardMaterial({ color: 0xe4ad54, roughness: 0.45, metalness: 0.32 }),
    );
    charm.position.set(1.52, -0.75, 0.35);
    charm.scale.setScalar(0.72);
    group.add(charm);

    const needle = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.035, 1.45, 6, 12),
      new THREE.MeshStandardMaterial({ color: 0xe8d7b7, roughness: 0.25, metalness: 0.65 }),
    );
    needle.position.set(-1.45, 0.95, 0.7);
    needle.rotation.set(0.3, 0.2, -0.82);
    group.add(needle);

    scene.add(new THREE.HemisphereLight(0xfff1d9, 0x183d34, 2.6));
    const warmLight = new THREE.DirectionalLight(0xffc78f, 4.2);
    warmLight.position.set(3, 4, 5);
    scene.add(warmLight);
    const rim = new THREE.PointLight(0xc8f0d6, 2.4, 12);
    rim.position.set(-4, -1, 3);
    scene.add(rim);

    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.7;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.55;
    };
    host.addEventListener("pointermove", onPointer);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    let frame = 0;
    const clock = new THREE.Clock();
    const render = () => {
      const elapsed = clock.getElapsedTime();
      group.rotation.y += (pointer.x + elapsed * 0.07 - group.rotation.y) * 0.035;
      group.rotation.x += (-pointer.y - 0.16 - group.rotation.x) * 0.045;
      group.position.y = Math.sin(elapsed * 0.85) * 0.09;
      charm.rotation.x = elapsed * 0.7;
      charm.rotation.y = elapsed * 0.45;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      host.removeEventListener("pointermove", onPointer);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="artisan-orbit" aria-hidden="true" />;
}
