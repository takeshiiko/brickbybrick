"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export function House3DViewer({ progress = 0.58, minHeight = 420, autoFit = false }: { progress?: number; minHeight?: number; autoFit?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const clipBelowRef = useRef<THREE.Plane | null>(null);
  const clipAboveRef = useRef<THREE.Plane | null>(null);
  const frontierGroupRef = useRef<THREE.Group | null>(null);
  const minYRef = useRef(-2);
  const maxYRef = useRef(2);

  function setY(y: number) {
    if (clipBelowRef.current) clipBelowRef.current.constant =  y;
    if (clipAboveRef.current) clipAboveRef.current.constant = -y;
    if (frontierGroupRef.current) frontierGroupRef.current.position.y = y;
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cleanup: (() => void) | null = null;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        io.disconnect();
        cleanup = initScene(container, autoFit);
      }
    }, { threshold: 0.1 });
    io.observe(container);
    return () => { io.disconnect(); cleanup?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function initScene(container: HTMLDivElement, autoFit: boolean) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setClearColor(0x080c14, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const aspect = container.clientWidth / container.clientHeight;
    // Use wider FOV for tall/narrow panels so the whole house fits
    const fov = aspect < 0.9 ? 62 : 42;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 200);
    camera.position.set(0, 0.5, 9);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(6, 10, 6);
    scene.add(sun);
    const blueLight = new THREE.DirectionalLight(0x3366ff, 0.6);
    blueLight.position.set(0, 10, 0);
    scene.add(blueLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI * 0.38;
    controls.maxPolarAngle = Math.PI * 0.52;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

    // clipBelow: keeps y <= constant
    const clipBelow = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    // clipAbove: keeps y >= -constant
    const clipAbove = new THREE.Plane(new THREE.Vector3(0,  1, 0), 0);
    clipBelowRef.current = clipBelow;
    clipAboveRef.current = clipAbove;

    const frontierGroup = new THREE.Group();
    frontierGroupRef.current = frontierGroup;
    scene.add(frontierGroup);

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    loader.load("/house/house.glb", (gltf) => {
      const root = gltf.scene;

      const box    = new THREE.Box3().setFromObject(root);
      const center = box.getCenter(new THREE.Vector3());
      const size   = box.getSize(new THREE.Vector3());
      const scale  = 5 / Math.max(size.x, size.y, size.z);
      root.position.sub(center.multiplyScalar(scale));
      root.scale.setScalar(scale);
      const box2 = new THREE.Box3().setFromObject(root);
      minYRef.current = box2.min.y;
      maxYRef.current = box2.max.y;

      if (autoFit) {
        const modelH  = box2.max.y - box2.min.y;
        const modelW  = box2.max.x - box2.min.x;
        const halfVFov = (camera.fov / 2) * (Math.PI / 180);
        const halfHFov = Math.atan(Math.tan(halfVFov) * camera.aspect);
        const fitByH  = (modelH / 2) / Math.tan(halfVFov);
        const fitByW  = (modelW / 2) / Math.tan(halfHFov);
        const fitZ    = Math.max(fitByH, fitByW) * 1.45;
        const centerY = (box2.min.y + box2.max.y) / 2;
        camera.position.set(0, centerY, fitZ);
        controls.target.set(0, centerY, 0);
        controls.update();
      }

      // BUILT (colored) — clipped below frontier
      const builtRoot = root.clone(true);
      builtRoot.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        const applyClip = (mat: THREE.Material) => {
          const m = (mat as THREE.MeshStandardMaterial).clone();
          m.clippingPlanes = [clipBelow];
          m.clipShadows = false;
          return m;
        };
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(applyClip)
          : applyClip(mesh.material);
      });
      scene.add(builtRoot);

      // BLUEPRINT — clipped above frontier
      const blueRoot = root.clone(true);
      const bpSolid = new THREE.MeshStandardMaterial({
        color: 0x0a1e3d,
        emissive: new THREE.Color(0x0d3a7a),
        emissiveIntensity: 0.5,
        roughness: 0.9,
        clippingPlanes: [clipAbove],
      });
      const edgeMat = new THREE.LineBasicMaterial({
        color: 0x4499ff,
        transparent: true,
        opacity: 0.6,
        clippingPlanes: [clipAbove],
      });
      blueRoot.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.material = bpSolid;
        const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
        const lines = new THREE.LineSegments(edges, edgeMat);
        mesh.add(lines);
      });
      scene.add(blueRoot);

      const y0 = minYRef.current + progress * (maxYRef.current - minYRef.current);
      setY(y0);
    });

    let animId = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    const ro = new ResizeObserver(() => {
      const a = container.clientWidth / container.clientHeight;
      camera.fov = a < 0.9 ? 62 : 42;
      camera.aspect = a;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }

  useEffect(() => {
    const y = minYRef.current + progress * (maxYRef.current - minYRef.current);
    setY(y);
  }, [progress]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", minHeight: `${minHeight}px` }}
    />
  );
}
