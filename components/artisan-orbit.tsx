"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ArtisanOrbit() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
    camera.position.set(0, 0.1, 7.4);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const root = new THREE.Group();
    root.rotation.set(-0.08, -0.35, -0.04);
    scene.add(root);
    const vessel = new THREE.Group();
    root.add(vessel);

    const ceramic = new THREE.MeshStandardMaterial({ color: 0xe2dbbe, roughness: 0.56, metalness: 0.02 });
    const teal = new THREE.MeshStandardMaterial({ color: 0x188fa7, roughness: 0.5, metalness: 0.02 });
    const muted = new THREE.MeshStandardMaterial({ color: 0x9dbbae, roughness: 0.68 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x769fb6, roughness: 0.58 });
    const custard = new THREE.MeshStandardMaterial({ color: 0xd5d6aa, roughness: 0.72 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.35, 36, 24), ceramic);
    body.scale.set(1.12, 0.92, 1);
    body.position.y = -0.2;
    vessel.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.78, 0.72, 32), ceramic);
    neck.position.y = 1.05;
    vessel.add(neck);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.085, 10, 42), teal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.43;
    vessel.add(rim);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.54, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), blue);
    lid.scale.y = 0.45;
    lid.position.y = 1.48;
    vessel.add(lid);
    const lidDot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 18, 12), teal);
    lidDot.position.y = 1.82;
    vessel.add(lidDot);

    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.13, 14, 48, Math.PI * 1.65), teal);
    handle.rotation.set(0, Math.PI / 2, 0.2);
    handle.position.set(-1.18, 0.05, 0);
    vessel.add(handle);
    const spout = new THREE.Group();
    const spoutBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 1.45, 20), ceramic);
    spoutBase.rotation.z = -1.04;
    spoutBase.position.set(1.22, 0.45, 0);
    spout.add(spoutBase);
    const spoutLip = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.07, 10, 28), teal);
    spoutLip.rotation.set(Math.PI / 2, 0, 0.52);
    spoutLip.position.set(1.82, 0.82, 0);
    spout.add(spoutLip);
    vessel.add(spout);

    for (let index = 0; index < 7; index += 1) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (index % 2) * 0.018, 12, 8), index % 2 ? teal : blue);
      const angle = (index / 7) * Math.PI * 2;
      dot.position.set(Math.cos(angle) * 1.06, -0.25 + Math.sin(index * 1.8) * 0.48, Math.sin(angle) * 0.95);
      vessel.add(dot);
    }

    const ribbonCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, -1.3, -0.2), new THREE.Vector3(-1.3, -1.75, 0.45), new THREE.Vector3(0, -1.5, 0.1),
      new THREE.Vector3(1.4, -1.8, -0.3), new THREE.Vector3(2.45, -1.2, 0.15),
    ]);
    const ribbon = new THREE.Mesh(new THREE.TubeGeometry(ribbonCurve, 52, 0.045, 8, false), teal);
    root.add(ribbon);

    const mobile = new THREE.Group();
    root.add(mobile);
    const petalGeometry = new THREE.SphereGeometry(0.16, 14, 10);
    for (let index = 0; index < 9; index += 1) {
      const orbit = (index / 9) * Math.PI * 2;
      const petal = new THREE.Mesh(petalGeometry, index % 3 === 0 ? custard : index % 2 ? muted : blue);
      petal.scale.set(1.7, 0.5, 0.75);
      petal.position.set(Math.cos(orbit) * (2.2 + (index % 2) * 0.3), Math.sin(orbit * 1.7) * 1.55, Math.sin(orbit) * 1.1);
      petal.rotation.set(orbit, orbit * 0.5, -orbit);
      mobile.add(petal);
    }
    const needle = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 1.05, 5, 10), new THREE.MeshStandardMaterial({ color: 0xc7d8db, roughness: 0.28, metalness: 0.66 }));
    needle.position.set(-2.05, 1.5, 0.6);
    needle.rotation.z = -0.75;
    mobile.add(needle);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x769fb6, 2.2));
    const key = new THREE.DirectionalLight(0xfff7db, 4.3);
    key.position.set(3, 5, 6);
    scene.add(key);
    const edge = new THREE.PointLight(0x188fa7, 2.2, 10);
    edge.position.set(-4, 0, 4);
    scene.add(edge);

    const pointer = { x: 0, y: 0 };
    const onPointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.8;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.55;
    };
    host.addEventListener("pointermove", onPointer, { passive: true });
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      camera.aspect = Math.max(1, width) / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frame = 0;
    let last = 0;
    const start = performance.now();
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (document.hidden || now - last < 33) return;
      last = now;
      const elapsed = (now - start) / 1000;
      root.rotation.y += (pointer.x - 0.28 + elapsed * 0.05 - root.rotation.y) * 0.035;
      root.rotation.x += (-pointer.y - 0.08 - root.rotation.x) * 0.045;
      root.position.y = Math.sin(elapsed * 0.75) * 0.08;
      vessel.rotation.z = Math.sin(elapsed * 0.55) * 0.025;
      mobile.rotation.y = -elapsed * 0.12;
      mobile.children.forEach((child, index) => { child.rotation.y += 0.006 + index * 0.0003; });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", onPointer);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="artisan-orbit" aria-hidden="true" />;
}
