'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingDimensions, EnvironmentMode, RoomData, ShadingMode, TransformTool, WallData } from '@/lib/types';
import { 
  Box, 
  Sun, 
  Moon, 
  Lightbulb, 
  Rotate3d, 
  Download, 
  Move, 
  Layers,
  Sparkles,
  Maximize2
} from 'lucide-react';

interface BlenderViewportProps {
  dimensions: BuildingDimensions;
  rooms: RoomData[];
  walls?: WallData[];
  environment: EnvironmentMode;
  onEnvironmentChange: (env: EnvironmentMode) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  activeTool: TransformTool;
  onToolChange: (tool: TransformTool) => void;
  shadingMode: ShadingMode;
  onShadingModeChange: (mode: ShadingMode) => void;
}

// Helper: Creates high-resolution 2D canvas texture for 3D room floor text labels
function createRoomFloorLabelTexture(name: string, dimsText?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle rounded tag badge background
  ctx.fillStyle = 'rgba(20, 20, 20, 0.75)';
  const pad = 20;
  const rw = canvas.width - pad * 2;
  const rh = canvas.height - pad * 2;
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.arcTo(pad + rw, pad, pad + rw, pad + rh, r);
  ctx.arcTo(pad + rw, pad + rh, pad, pad + rh, r);
  ctx.arcTo(pad, pad + rh, pad, pad, r);
  ctx.arcTo(pad, pad, pad + rw, pad, r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Room Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), canvas.width / 2, dimsText ? 100 : 128);

  // Dimensions subtitle
  if (dimsText) {
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(dimsText, canvas.width / 2, 160);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export default function BlenderViewport({
  dimensions,
  rooms,
  walls,
  environment,
  onEnvironmentChange,
  selectedRoomId,
  onSelectRoom,
  activeTool,
  onToolChange,
  shadingMode,
  onShadingModeChange,
}: BlenderViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const gizmoRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);

  const [stats, setStats] = useState({ verts: 450, faces: 220, objects: 18, fps: 60 });

  // 1. Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 14, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.0, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controlsRef.current = controls;

    // Grid Floor
    const grid = new THREE.GridHelper(30, 30, 0x4f4f4f, 0x2d2d2d);
    grid.position.y = 0;
    scene.add(grid);

    const axesFloor = new THREE.AxesHelper(1.5);
    axesFloor.position.set(0, 0.01, 0);
    scene.add(axesFloor);

    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;

    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      renderGizmo();

      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setStats(prev => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        lastTime = now;
      }
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // 2. Render XYZ Gizmo (Compass in corner)
  const renderGizmo = useCallback(() => {
    if (!gizmoRef.current || !cameraRef.current) return;
    const canvas = gizmoRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 28;

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(35, 35, 35, 0.75)';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    const matrix = new THREE.Matrix4();
    matrix.extractRotation(cameraRef.current.matrixWorldInverse);

    const axes = [
      { name: 'X', vec: new THREE.Vector3(1, 0, 0), color: '#ef4444' },
      { name: 'Y', vec: new THREE.Vector3(0, 1, 0), color: '#22c55e' },
      { name: 'Z', vec: new THREE.Vector3(0, 0, 1), color: '#3b82f6' },
      { name: '-X', vec: new THREE.Vector3(-1, 0, 0), color: '#7f1d1d' },
      { name: '-Y', vec: new THREE.Vector3(0, -1, 0), color: '#14532d' },
      { name: '-Z', vec: new THREE.Vector3(0, 0, -1), color: '#1e3a8a' },
    ];

    const projected = axes.map(axis => {
      const v = axis.vec.clone().applyMatrix4(matrix);
      return {
        name: axis.name,
        color: axis.color,
        x: cx + v.x * radius,
        y: cy - v.y * radius,
        z: v.z,
      };
    });

    projected.sort((a, b) => a.z - b.z);

    projected.forEach(axis => {
      if (axis.z < -0.1 && axis.name.startsWith('-')) {
        ctx.beginPath();
        ctx.arc(axis.x, axis.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = axis.color;
        ctx.fill();
      } else if (!axis.name.startsWith('-')) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(axis.x, axis.y);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(axis.x, axis.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = axis.color;
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(axis.name, axis.x, axis.y);
      }
    });
  }, []);

  // 3. Update Environment & Lighting
  useEffect(() => {
    if (!sceneRef.current || !lightsGroupRef.current) return;
    const scene = sceneRef.current;
    const lights = lightsGroupRef.current;

    while (lights.children.length > 0) {
      lights.remove(lights.children[0]);
    }

    if (environment === 'studio') {
      scene.background = new THREE.Color(0x1e1e1e);
      const ambLight = new THREE.AmbientLight(0xffffff, 0.85);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
      keyLight.position.set(12, 18, 10);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;

      const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.65);
      fillLight.position.set(-10, 8, -10);

      const rimLight = new THREE.DirectionalLight(0xffeedd, 0.5);
      rimLight.position.set(0, -5, -10);

      lights.add(ambLight, keyLight, fillLight, rimLight);
    } else if (environment === 'day') {
      scene.background = new THREE.Color(0x28323e);
      const sunLight = new THREE.DirectionalLight(0xfffaed, 2.2);
      sunLight.position.set(16, 22, 14);
      sunLight.castShadow = true;
      const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x332211, 0.85);
      lights.add(sunLight, skyLight);
    } else if (environment === 'night') {
      scene.background = new THREE.Color(0x0c1017);
      const moonLight = new THREE.DirectionalLight(0x406090, 0.7);
      moonLight.position.set(-10, 15, -10);
      const amb = new THREE.AmbientLight(0x182030, 0.6);
      
      const warm1 = new THREE.PointLight(0xffaa44, 3.0, 12);
      warm1.position.set(0, 2.2, 0);
      lights.add(moonLight, amb, warm1);
    }
  }, [environment]);

  // 4. HIGH-PRECISION 3D DOLLHOUSE ENGINE (Floors, Walls, Doors, Windows, Furniture, Labels)
  useEffect(() => {
    if (!houseGroupRef.current) return;
    const group = houseGroupRef.current;

    // Clear old meshes
    while (group.children.length > 0) {
      const child = group.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose());
      } else if (child.material) {
        child.material.dispose();
      }
      group.remove(child);
    }

    const { width: W, length: L, wallHeight: H, wallThickness: T } = dimensions;
    const isWireframe = shadingMode === 'wireframe';

    // Foundation Base Slab (Ground level foundation)
    const slabGeo = new THREE.BoxGeometry(W + 0.6, 0.2, L + 0.6);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: isWireframe,
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.set(0, 0.1, 0);
    slabMesh.receiveShadow = true;
    group.add(slabMesh);

    // Materials
    const wallColor = shadingMode === 'rendered' ? 0xe5e7eb : (shadingMode === 'solid' ? 0x9ca3af : 0xd1d5db);
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: isWireframe,
    });

    const exteriorWallMat = new THREE.MeshStandardMaterial({
      color: shadingMode === 'rendered' ? 0xd1d5db : 0x6b7280,
      roughness: 0.8,
      metalness: 0.1,
      wireframe: isWireframe,
    });

    const doorThresholdMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e, // warm wood
      roughness: 0.5,
      metalness: 0.1,
      wireframe: isWireframe,
    });

    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.45,
    });

    // 4.1 Build Room Floor Slabs + Text Labels + Furniture Proxies
    rooms.forEach(room => {
      const roomW = room.relW * W;
      const roomD = room.relD * L;
      const roomCenterX = (room.relX * W) + (roomW / 2) - (W / 2);
      const roomCenterZ = (room.relZ * L) + (roomD / 2) - (L / 2);
      const isSelected = selectedRoomId === room.id;
      const isPorch = room.type === 'porch';

      // Floor tile height: porch is lower (outdoor level)
      const floorY = isPorch ? 0.15 : 0.24;
      const floorThickness = isPorch ? 0.1 : 0.08;

      const floorGeo = new THREE.BoxGeometry(roomW - 0.02, floorThickness, roomD - 0.02);
      const floorMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xeb7724 : (isPorch ? 0x78716c : (shadingMode === 'rendered' ? room.color : 0x555555)),
        roughness: isPorch ? 0.95 : 0.65,
        metalness: 0.05,
        wireframe: isWireframe,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(roomCenterX, floorY, roomCenterZ);
      floorMesh.receiveShadow = true;
      (floorMesh as any).userData = { roomId: room.id, roomName: room.name };
      group.add(floorMesh);

      // Room Floor Label Badge (Placed on the floor slab)
      if (shadingMode !== 'wireframe' && roomW > 1.2 && roomD > 1.2) {
        const labelTexture = createRoomFloorLabelTexture(room.name, room.dimensionsText || `${roomW.toFixed(1)}m x ${roomD.toFixed(1)}m`);
        const labelW = Math.min(roomW * 0.75, 2.2);
        const labelH = labelW * 0.5;
        const labelGeo = new THREE.PlaneGeometry(labelW, labelH);
        const labelMat = new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true,
          opacity: 0.88,
          depthWrite: false,
        });
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.set(roomCenterX, floorY + 0.045, roomCenterZ);
        group.add(labelMesh);
      }

      // Selection Wireframe Outline
      if (isSelected) {
        const selGeo = new THREE.BoxGeometry(roomW, H + 0.2, roomD);
        const selEdges = new THREE.EdgesGeometry(selGeo);
        const selLine = new THREE.LineSegments(
          selEdges,
          new THREE.LineBasicMaterial({ color: 0xeb7724, linewidth: 3 })
        );
        selLine.position.set(roomCenterX, floorY + H / 2, roomCenterZ);
        group.add(selLine);
      }

      // 4.2 Architectural 3D Furniture Proxies (Bed, Sofa, Table, Kitchen, Toilet)
      if (shadingMode !== 'wireframe') {
        const furnGroup = new THREE.Group();
        furnGroup.position.set(roomCenterX, floorY + 0.04, roomCenterZ);

        if (room.type === 'bedroom') {
          // 3D Bed (Mattress, Wooden Frame, Pillows)
          const bedFrame = new THREE.Mesh(
            new THREE.BoxGeometry(1.9, 0.35, 1.7),
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 })
          );
          bedFrame.position.set(0, 0.175, 0);

          const headboard = new THREE.Mesh(
            new THREE.BoxGeometry(1.95, 0.8, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 })
          );
          headboard.position.set(0, 0.4, -0.8);

          const pillow1 = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.15, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
          );
          pillow1.position.set(-0.5, 0.4, -0.5);

          const pillow2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.15, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
          );
          pillow2.position.set(0.5, 0.4, -0.5);

          furnGroup.add(bedFrame, headboard, pillow1, pillow2);
        } else if (room.type === 'living') {
          // 3D Modern Sofa (Seats, Backrest, Armrests) + Coffee Table
          const sofaBase = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.4, 0.85),
            new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8 })
          );
          sofaBase.position.set(0, 0.2, -0.5);

          const sofaBack = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 0.5, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8 })
          );
          sofaBack.position.set(0, 0.5, -0.85);

          const coffeeTable = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.3, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 })
          );
          coffeeTable.position.set(0, 0.15, 0.3);

          furnGroup.add(sofaBase, sofaBack, coffeeTable);
        } else if (room.type === 'kitchen') {
          // Kitchen Counter + Sink
          const counter = new THREE.Mesh(
            new THREE.BoxGeometry(Math.min(roomW * 0.8, 2.5), 0.85, 0.65),
            new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
          );
          counter.position.set(0, 0.425, -roomD * 0.25);

          const sink = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.05, 0.45),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
          );
          sink.position.set(0.3, 0.86, -roomD * 0.25);

          furnGroup.add(counter, sink);
        } else if (room.type === 'dining') {
          // Dining Table + Chairs
          const table = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.75, 0.9),
            new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
          );
          table.position.set(0, 0.375, 0);

          const chair1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
          chair1.position.set(-0.5, 0.225, 0.6);
          const chair2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
          chair2.position.set(0.5, 0.225, 0.6);

          furnGroup.add(table, chair1, chair2);
        } else if (room.type === 'bathroom') {
          // Toilet & Vanity
          const toiletBowl = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.4, 0.6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
          );
          toiletBowl.position.set(-0.3, 0.2, 0);

          const cistern = new THREE.Mesh(
            new THREE.BoxGeometry(0.45, 0.45, 0.2),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
          );
          cistern.position.set(-0.3, 0.55, -0.2);

          const vanity = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.8, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
          );
          vanity.position.set(0.4, 0.4, 0);

          furnGroup.add(toiletBowl, cistern, vanity);
        } else if (isPorch) {
          // Outdoor steps leading up to the house
          const step1 = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.08, 0.4),
            new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.9 })
          );
          step1.position.set(0, 0.04, roomD * 0.4);

          furnGroup.add(step1);
        }

        group.add(furnGroup);
      }
    });

    // 4.3 DYNAMIC WALL GENERATION (Exterior & Interior Walls derived from room boundaries)
    const wallY = 0.24 + (H / 2);
    const activeWalls = walls && walls.length > 0 ? walls : [];

    activeWalls.forEach(w => {
      const dx = w.endX - w.startX;
      const dz = w.endZ - w.startZ;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.15) return;

      const midX = (w.startX + w.endX) / 2;
      const midZ = (w.startZ + w.endZ) / 2;
      const angle = Math.atan2(dz, dx);
      const isExt = w.isExterior;

      const currentMat = isExt ? exteriorWallMat : wallMat;

      // Check if wall has a doorway opening
      const hasDoorway = (!isExt && len > 1.3) || (isExt && Math.abs(midZ - L/2) < 1.0 && Math.abs(midX) < 2.0); // Entrance door

      if (hasDoorway) {
        const doorWidth = 0.95;
        const remainingLen = Math.max(0.2, len - doorWidth);
        const seg1Len = remainingLen * 0.5;
        const seg2Len = remainingLen * 0.5;

        const wallGroup = new THREE.Group();
        wallGroup.position.set(midX, wallY, midZ);
        wallGroup.rotation.y = -angle;

        // Wall segment 1
        const seg1 = new THREE.Mesh(new THREE.BoxGeometry(seg1Len, H, T), currentMat);
        seg1.position.set(-len / 2 + seg1Len / 2, 0, 0);
        seg1.castShadow = true;

        // Wall segment 2
        const seg2 = new THREE.Mesh(new THREE.BoxGeometry(seg2Len, H, T), currentMat);
        seg2.position.set(len / 2 - seg2Len / 2, 0, 0);
        seg2.castShadow = true;

        // Lintel above door
        const lintelH = H * 0.3;
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, T), currentMat);
        lintel.position.set(0, H / 2 - lintelH / 2, 0);
        lintel.castShadow = true;

        // Wooden Door Threshold on floor
        const thresh = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 0.04, T * 1.3), doorThresholdMat);
        thresh.position.set(0, -H / 2 + 0.02, 0);

        wallGroup.add(seg1, seg2, lintel, thresh);
        group.add(wallGroup);
      } else if (isExt && len > 1.8) {
        // Exterior wall with an architectural window!
        const winWidth = Math.min(len * 0.45, 1.4);
        const wallGroup = new THREE.Group();
        wallGroup.position.set(midX, wallY, midZ);
        wallGroup.rotation.y = -angle;

        const sideSegLen = (len - winWidth) / 2;
        const side1 = new THREE.Mesh(new THREE.BoxGeometry(sideSegLen, H, T), currentMat);
        side1.position.set(-len / 2 + sideSegLen / 2, 0, 0);
        side1.castShadow = true;

        const side2 = new THREE.Mesh(new THREE.BoxGeometry(sideSegLen, H, T), currentMat);
        side2.position.set(len / 2 - sideSegLen / 2, 0, 0);
        side2.castShadow = true;

        // Window Sill (bottom)
        const sillH = H * 0.32;
        const sill = new THREE.Mesh(new THREE.BoxGeometry(winWidth, sillH, T), currentMat);
        sill.position.set(0, -H / 2 + sillH / 2, 0);

        // Window Lintel (top)
        const topLintelH = H * 0.28;
        const topLintel = new THREE.Mesh(new THREE.BoxGeometry(winWidth, topLintelH, T), currentMat);
        topLintel.position.set(0, H / 2 - topLintelH / 2, 0);

        // Glass Pane in center
        const glass = new THREE.Mesh(new THREE.BoxGeometry(winWidth, H - sillH - topLintelH, T * 0.2), glassMat);
        glass.position.set(0, (-H / 2 + sillH + H / 2 - topLintelH) / 2, 0);

        wallGroup.add(side1, side2, sill, topLintel, glass);
        group.add(wallGroup);
      } else {
        // Solid wall segment
        const solidMesh = new THREE.Mesh(new THREE.BoxGeometry(len, H, T), currentMat);
        solidMesh.position.set(midX, wallY, midZ);
        solidMesh.rotation.y = -angle;
        solidMesh.castShadow = true;
        solidMesh.receiveShadow = true;
        group.add(solidMesh);
      }
    });

    setStats(prev => ({
      ...prev,
      verts: group.children.length * 36,
      faces: group.children.length * 18,
      objects: group.children.length,
    }));
  }, [dimensions, rooms, walls, selectedRoomId, shadingMode]);

  // Raycaster for Room Selection
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !houseGroupRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObjects(houseGroupRef.current.children, true);

    if (intersects.length > 0) {
      for (const hit of intersects) {
        const obj = hit.object as any;
        if (obj.userData && obj.userData.roomId) {
          onSelectRoom(obj.userData.roomId);
          return;
        }
      }
    }
  };

  // Camera Presets
  const setCameraPreset = (view: 'top' | 'front' | 'right' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const dist = Math.max(dimensions.width, dimensions.length) * 1.8;

    if (view === 'top') {
      cam.position.set(0, dist + 4, 0.001);
      ctrl.target.set(0, 0, 0);
    } else if (view === 'front') {
      cam.position.set(0, 3, dist + 2);
      ctrl.target.set(0, dimensions.wallHeight / 2, 0);
    } else if (view === 'right') {
      cam.position.set(dist + 2, 3, 0);
      ctrl.target.set(0, dimensions.wallHeight / 2, 0);
    } else if (view === 'iso') {
      cam.position.set(12, 14, 15);
      ctrl.target.set(0, 1.0, 0);
    }
    ctrl.update();
  };

  const handleExport = () => {
    const exportData = {
      project: "Beyond-2D Architectural Model",
      exportedAt: new Date().toISOString(),
      dimensions,
      rooms,
      walls,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Beyond-2D_House_Model.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#1e1e1e] overflow-hidden select-none">
      {/* 1. Blender-style Viewport Top Header Toolbar */}
      <div className="h-10 bg-[#282828] border-b border-[#3c3c3c] flex items-center justify-between px-3 z-10 text-xs">
        {/* Left: Tools */}
        <div className="flex items-center gap-1">
          <span className="text-[#808080] font-mono text-[10px] mr-1 uppercase tracking-wider">Mode</span>
          <button
            onClick={() => onToolChange('select')}
            title="Box Select"
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${
              activeTool === 'select' ? 'bg-[#4772b3] text-white' : 'text-[#cfcfcf] hover:bg-[#383838]'
            }`}
          >
            <Box size={13} />
            <span>Select</span>
          </button>
          <button
            onClick={() => onToolChange('move')}
            title="Move / Translate"
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${
              activeTool === 'move' ? 'bg-[#4772b3] text-white' : 'text-[#cfcfcf] hover:bg-[#383838]'
            }`}
          >
            <Move size={13} />
            <span>Move</span>
          </button>
          <button
            onClick={() => onToolChange('rotate')}
            title="Rotate"
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${
              activeTool === 'rotate' ? 'bg-[#4772b3] text-white' : 'text-[#cfcfcf] hover:bg-[#383838]'
            }`}
          >
            <Rotate3d size={13} />
            <span>Rotate</span>
          </button>
        </div>

        {/* Center: Viewport Camera Presets */}
        <div className="flex items-center gap-1 bg-[#202020] px-1.5 py-0.5 rounded border border-[#383838]">
          <span className="text-[#707070] text-[10px] uppercase font-mono mr-1">Views</span>
          <button 
            onClick={() => setCameraPreset('top')} 
            className="px-2 py-0.5 rounded hover:bg-[#333] text-[#bbb] hover:text-white"
            title="Top View (2D Blueprint)"
          >
            Top [7]
          </button>
          <button 
            onClick={() => setCameraPreset('front')} 
            className="px-2 py-0.5 rounded hover:bg-[#333] text-[#bbb] hover:text-white"
            title="Front View"
          >
            Front [1]
          </button>
          <button 
            onClick={() => setCameraPreset('right')} 
            className="px-2 py-0.5 rounded hover:bg-[#333] text-[#bbb] hover:text-white"
            title="Side View"
          >
            Right [3]
          </button>
          <button 
            onClick={() => setCameraPreset('iso')} 
            className="px-2 py-0.5 rounded bg-[#383838] text-white hover:bg-[#444]"
            title="Isometric 3D Dollhouse"
          >
            3D Dollhouse
          </button>
        </div>

        {/* Right: Shading Modes & Export Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#202020] p-0.5 rounded border border-[#383838]">
            <button
              onClick={() => onShadingModeChange('wireframe')}
              title="Wireframe View"
              className={`p-1 rounded ${shadingMode === 'wireframe' ? 'bg-[#4772b3] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
            >
              <Layers size={13} />
            </button>
            <button
              onClick={() => onShadingModeChange('solid')}
              title="Solid Shading"
              className={`p-1 rounded ${shadingMode === 'solid' ? 'bg-[#4772b3] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
            >
              <Box size={13} />
            </button>
            <button
              onClick={() => onShadingModeChange('rendered')}
              title="Rendered Material Preview"
              className={`p-1 rounded ${shadingMode === 'rendered' ? 'bg-[#4772b3] text-white' : 'text-[#888] hover:text-[#ccc]'}`}
            >
              <Sparkles size={13} />
            </button>
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#eb7724] hover:bg-[#f38938] text-white font-medium rounded shadow-sm text-xs transition-colors"
            title="Export 3D Model"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Main 3D Canvas Area */}
      <div 
        ref={mountRef} 
        onPointerDown={handlePointerDown}
        className="flex-1 w-full relative cursor-grab active:cursor-grabbing outline-none"
      >
        {/* XYZ Axis Gizmo Overlay */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-center pointer-events-none">
          <canvas ref={gizmoRef} width={80} height={80} className="w-20 h-20" />
        </div>

        {/* Viewport Info Overlay */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-[#a0a0a0] bg-[#1a1a1a]/80 backdrop-blur px-2.5 py-1.5 rounded border border-[#333]/50">
          <div className="text-white font-semibold">Beyond-2D Architectural Viewport</div>
          <div>Scale: {dimensions.width.toFixed(1)}m &times; {dimensions.length.toFixed(1)}m</div>
          <div>Rooms: {rooms.length} | Walls: {walls?.length || 0}</div>
        </div>

        {/* Lighting Quick Toggle Pill */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center bg-[#242424]/90 backdrop-blur px-2 py-1 rounded-full border border-[#3c3c3c] shadow-lg text-xs gap-1.5">
          <span className="text-[#808080] text-[10px] uppercase font-mono px-1">Lighting:</span>
          <button
            onClick={() => onEnvironmentChange('day')}
            className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
              environment === 'day' ? 'bg-[#eb7724] text-white font-medium' : 'text-[#aaa] hover:text-white'
            }`}
          >
            <Sun size={12} />
            <span>Day</span>
          </button>
          <button
            onClick={() => onEnvironmentChange('night')}
            className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
              environment === 'night' ? 'bg-[#eb7724] text-white font-medium' : 'text-[#aaa] hover:text-white'
            }`}
          >
            <Moon size={12} />
            <span>Night</span>
          </button>
          <button
            onClick={() => onEnvironmentChange('studio')}
            className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${
              environment === 'studio' ? 'bg-[#eb7724] text-white font-medium' : 'text-[#aaa] hover:text-white'
            }`}
          >
            <Lightbulb size={12} />
            <span>Studio</span>
          </button>
        </div>

        <div className="absolute bottom-4 right-4 z-10 pointer-events-none text-[10px] text-[#777] font-mono bg-[#1c1c1c]/90 px-2.5 py-1 rounded border border-[#333]">
          L-Click: Orbit &bull; Shift+Click: Pan &bull; Scroll: Zoom &bull; Click Room: Inspect
        </div>
      </div>

      {/* 3. Blender Status Bar */}
      <div className="h-6 bg-[#222222] border-t border-[#333] flex items-center justify-between px-3 text-[11px] text-[#888] font-mono">
        <div className="flex items-center gap-4">
          <span>Building: {dimensions.width.toFixed(1)}m &times; {dimensions.length.toFixed(1)}m</span>
          <span>Rooms: {rooms.length}</span>
          <span>Wall Height: {dimensions.wallHeight.toFixed(1)}m</span>
          <span>Objects: {stats.objects}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#4772b3]">Tool: {activeTool.toUpperCase()}</span>
          <span className="text-emerald-500">{stats.fps} FPS</span>
          <span>Beyond-2D Engine</span>
        </div>
      </div>
    </div>
  );
}
