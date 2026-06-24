import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  particleCount?: number;
  className?: string;
}

export default function CosmicCanvas({ particleCount = 350, className = '' }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // Reduce particles on mobile for performance
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? Math.floor(particleCount * 0.4) : particleCount;

    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;

    // Renderer — transparent background so page color shows through
    const renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.pointerEvents = 'none';
    el.appendChild(renderer.domElement);

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = 6;

    // ── Sacred Geometry ──────────────────────────────────────────
    // Inner icosahedron — gold wireframe
    const innerGeo = new THREE.IcosahedronGeometry(2.0, 1);
    const innerEdges = new THREE.EdgesGeometry(innerGeo);
    const innerMat = new THREE.LineBasicMaterial({
      color: 0xC5A059,
      transparent: true,
      opacity: 0.18,
    });
    const innerIcosa = new THREE.LineSegments(innerEdges, innerMat);
    scene.add(innerIcosa);

    // Outer icosahedron — purple wireframe, counter-rotating
    const outerGeo = new THREE.IcosahedronGeometry(3.4, 0);
    const outerEdges = new THREE.EdgesGeometry(outerGeo);
    const outerMat = new THREE.LineBasicMaterial({
      color: 0x700B97,
      transparent: true,
      opacity: 0.08,
    });
    const outerIcosa = new THREE.LineSegments(outerEdges, outerMat);
    scene.add(outerIcosa);

    // ── Golden Particles ─────────────────────────────────────────
    const goldPositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.8 + Math.random() * 7;
      goldPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      goldPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      goldPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const goldGeo = new THREE.BufferGeometry();
    goldGeo.setAttribute('position', new THREE.BufferAttribute(goldPositions, 3));
    const goldMat = new THREE.PointsMaterial({
      color: 0xC5A059,
      size: 0.028,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.75,
    });
    const goldParticles = new THREE.Points(goldGeo, goldMat);
    scene.add(goldParticles);

    // ── White Stars (larger, fewer) ──────────────────────────────
    const starCount = Math.floor(count * 0.25);
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 5 + Math.random() * 6;
      starPositions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xEFE6F7,
      size: 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.45,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ── Mouse Parallax ───────────────────────────────────────────
    let targetX = 0, targetY = 0;
    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      targetY = -(e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    if (!isMobile) window.addEventListener('mousemove', onMouseMove);

    // ── Animation Loop ───────────────────────────────────────────
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = (performance.now() - startTime) / 1000;

      // Rotate sacred geometry
      innerIcosa.rotation.x = t * 0.07;
      innerIcosa.rotation.y = t * 0.11;
      outerIcosa.rotation.x = -t * 0.04;
      outerIcosa.rotation.y = t * 0.06;

      // Gently rotate particle clouds
      goldParticles.rotation.y = t * 0.025;
      stars.rotation.y = -t * 0.018;
      stars.rotation.x  = Math.sin(t * 0.05) * 0.05;

      // Smooth camera parallax
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ───────────────────────────────────────────────────
    const onResize = () => {
      const nw = el.clientWidth || window.innerWidth;
      const nh = el.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      innerGeo.dispose(); innerEdges.dispose(); innerMat.dispose();
      outerGeo.dispose(); outerEdges.dispose(); outerMat.dispose();
      goldGeo.dispose(); goldMat.dispose();
      starGeo.dispose(); starMat.dispose();
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [particleCount]);

  return <div ref={mountRef} className={`absolute inset-0 pointer-events-none ${className}`} />;
}
