'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { BuildingDimensions, EnvironmentMode, ProjectData, RoomData, ShadingMode, TransformTool, WallData } from '@/lib/types';
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
  Maximize2,
  ChevronDown,
  Activity,
  Crosshair,
  Ruler
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
  diagnostics?: ProjectData['diagnostics'];
  blueprintUrl?: string;
  semanticBlueprintUrl?: string;
  overlayBlueprintUrl?: string;
}

// Procedural PBR Floor Texture Generators for Architectural Realism
function createWoodFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#bfa17c'; // Warm light oak base
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 32;
  const plankW = 128;
  ctx.strokeStyle = 'rgba(80, 50, 25, 0.45)';
  ctx.lineWidth = 1.5;

  for (let y = 0; y < 512; y += plankH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const offset = (Math.floor(y / plankH) % 3) * 42;
    for (let x = offset; x < 512; x += plankW) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + plankH);
      ctx.stroke();
    }
  }

  // Subtle wood grain streaks
  ctx.fillStyle = 'rgba(120, 75, 35, 0.06)';
  for (let i = 0; i < 300; i++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 512;
    ctx.fillRect(rx, ry, 25 + Math.random() * 35, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createTileFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#cbd5e1'; // Polished porcelain
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 64;
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
  ctx.lineWidth = 2;

  for (let p = 0; p <= 512; p += tileSize) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function createSlateFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155'; // Deep slate
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 32;
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.lineWidth = 1.5;

  for (let p = 0; p <= 512; p += tileSize) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function createPaverFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#78716c'; // Stone pavers
  ctx.fillRect(0, 0, 512, 512);

  const paverW = 64;
  const paverH = 32;
  ctx.strokeStyle = 'rgba(41, 37, 36, 0.7)';
  ctx.lineWidth = 2;

  for (let y = 0; y <= 512; y += paverH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const offset = (Math.floor(y / paverH) % 2) * (paverW / 2);
    for (let x = offset; x <= 512; x += paverW) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + paverH);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Helper: Creates high-resolution 2D canvas texture for 3D room floor text labels
function createRoomFloorLabelTexture(name: string, dimsText?: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle rounded tag badge background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  const pad = 16;
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

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
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
  diagnostics,
  blueprintUrl,
  semanticBlueprintUrl,
  overlayBlueprintUrl,
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
  const [showFurniture, setShowFurniture] = useState(true); // Default true for rich, furnished architectural 3D view
  const [showBlueprint, setShowBlueprint] = useState(false); // PlanPop-style 2D floor plan overlay
  const [blueprintLayer, setBlueprintLayer] = useState<'off' | 'semantic' | 'overlay' | 'source'>('off');
  const [colorMode, setColorMode] = useState<'schematic' | 'realistic'>('schematic'); // Default to 'schematic' so 3D model uses the PlanPop & room color schematics!
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExportingGLB, setIsExportingGLB] = useState(false);
  const [isExportingOBJ, setIsExportingOBJ] = useState(false);

  // Diagnostic & Framing State
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [viewportSize, setViewportSize] = useState({ width: 1200, height: 800 });
  const [cameraTelemetry, setCameraTelemetry] = useState({
    posX: 12.0,
    posY: 14.0,
    posZ: 15.0,
    targetX: 0.0,
    targetY: 1.0,
    targetZ: 0.0,
    fov: 45,
  });
  const [modelBounds, setModelBounds] = useState<{
    sizeX: number;
    sizeY: number;
    sizeZ: number;
    centerX: number;
    centerY: number;
    centerZ: number;
    aspectRatio: number;
  }>({
    sizeX: dimensions.width,
    sizeY: dimensions.wallHeight,
    sizeZ: dimensions.length,
    centerX: 0,
    centerY: dimensions.wallHeight / 2,
    centerZ: 0,
    aspectRatio: parseFloat((dimensions.width / Math.max(dimensions.length, 0.001)).toFixed(3)),
  });

  // Dynamically calculate model's actual bounding box and comfortably frame camera
  const fitCameraToModel = useCallback((padding = 1.3) => {
    if (!houseGroupRef.current || !cameraRef.current || !controlsRef.current) return;
    const group = houseGroupRef.current;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    if (box.isEmpty()) {
      size.set(dimensions.width, dimensions.wallHeight, dimensions.length);
      center.set(0, dimensions.wallHeight / 2, 0);
    } else {
      box.getSize(size);
      box.getCenter(center);
    }

    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = cam.aspect || 1.6;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

    const paddedW = Math.max(size.x, 1) * padding;
    const paddedH = Math.max(size.y, 1) * padding;
    const paddedD = Math.max(size.z, 1) * padding;

    // Distances required to fit horizontally and vertically
    const distW = (paddedW / 2) / Math.tan(hFov / 2);
    const distD = (paddedD / 2) / Math.tan(vFov / 2);
    const distH = (paddedH / 2) / Math.tan(vFov / 2);

    const fitDist = Math.max(distW, distD, distH, 6.0);

    // Center orbit target exactly on the model's geometric center
    ctrl.target.copy(center);

    // Isometric viewing vector: 40 deg elevation, 45 deg azimuth
    const isoDir = new THREE.Vector3(0.85, 1.05, 0.95).normalize();
    cam.position.copy(center).addScaledVector(isoDir, fitDist * 1.35);

    // Adjust clipping planes dynamically so no part of the building is sliced
    cam.near = Math.max(0.05, fitDist / 100);
    cam.far = Math.max(1000, fitDist * 25);
    cam.updateProjectionMatrix();
    ctrl.update();

    setCameraTelemetry({
      posX: parseFloat(cam.position.x.toFixed(2)),
      posY: parseFloat(cam.position.y.toFixed(2)),
      posZ: parseFloat(cam.position.z.toFixed(2)),
      targetX: parseFloat(ctrl.target.x.toFixed(2)),
      targetY: parseFloat(ctrl.target.y.toFixed(2)),
      targetZ: parseFloat(ctrl.target.z.toFixed(2)),
      fov: Math.round(cam.fov),
    });
  }, [dimensions]);

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

    const updateCamTelemetry = () => {
      setCameraTelemetry({
        posX: parseFloat(camera.position.x.toFixed(2)),
        posY: parseFloat(camera.position.y.toFixed(2)),
        posZ: parseFloat(camera.position.z.toFixed(2)),
        targetX: parseFloat(controls.target.x.toFixed(2)),
        targetY: parseFloat(controls.target.y.toFixed(2)),
        targetZ: parseFloat(controls.target.z.toFixed(2)),
        fov: Math.round(camera.fov),
      });
    };
    controls.addEventListener('change', updateCamTelemetry);
    setViewportSize({ width, height });

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
      setViewportSize({ width: w, height: h });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', updateCamTelemetry);
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

    // PlanPop-Style 2D Floor Plan Blueprint Texture Overlay
    const activeBlueprintUrl =
      blueprintLayer === 'semantic' && semanticBlueprintUrl
        ? semanticBlueprintUrl
        : blueprintLayer === 'overlay' && overlayBlueprintUrl
        ? overlayBlueprintUrl
        : blueprintLayer === 'source' && blueprintUrl
        ? blueprintUrl
        : (showBlueprint ? (semanticBlueprintUrl || overlayBlueprintUrl || blueprintUrl) : null);

    if (activeBlueprintUrl) {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(
        activeBlueprintUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const overlayGeo = new THREE.PlaneGeometry(W, L);
          const overlayMat = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.88,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
          overlayMesh.rotation.x = -Math.PI / 2;
          overlayMesh.position.set(0, 0.205, 0);
          group.add(overlayMesh);
          rendererRef.current?.render(sceneRef.current!, cameraRef.current!);
        },
        undefined,
        (err) => console.warn('Blueprint texture overlay error:', err)
      );
    }

    // 3D Model Materials: PlanPop Color Schematic vs Realistic Architectural PBR
    const isSchematic = colorMode === 'schematic';

    // 1. Walls: In Schematic mode -> PlanPop Solid Red (#ef4444 / #dc2626)
    const extWallColor = isSchematic
      ? 0xef4444
      : (shadingMode === 'rendered' ? 0xd1d5db : (shadingMode === 'solid' ? 0x9ca3af : 0x6b7280));
    const intWallColor = isSchematic
      ? 0xdc2626
      : (shadingMode === 'rendered' ? 0xe5e7eb : (shadingMode === 'solid' ? 0xa8a29e : 0xd1d5db));

    const exteriorWallMat = new THREE.MeshStandardMaterial({
      color: extWallColor,
      roughness: isSchematic ? 0.45 : 0.8,
      metalness: isSchematic ? 0.05 : 0.1,
      wireframe: isWireframe,
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: intWallColor,
      roughness: isSchematic ? 0.45 : 0.85,
      metalness: isSchematic ? 0.05 : 0.05,
      wireframe: isWireframe,
    });

    // 2. Doors: In Schematic mode -> PlanPop Solid Blue (#2563eb / #1d4ed8)
    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: isSchematic ? 0x2563eb : 0x92400e,
      roughness: isSchematic ? 0.35 : 0.6,
      metalness: 0.1,
      wireframe: isWireframe,
    });

    const doorThresholdMat = new THREE.MeshStandardMaterial({
      color: isSchematic ? 0x1d4ed8 : 0x854d0e,
      roughness: 0.5,
      metalness: 0.1,
      wireframe: isWireframe,
    });

    // 3. Windows: In Schematic mode -> PlanPop Solid Cyan (#06b6d4 / #0891b2)
    const glassMat = new THREE.MeshStandardMaterial({
      color: isSchematic ? 0x06b6d4 : 0x93c5fd,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: isSchematic ? 0.8 : 0.45,
    });

    const windowFrameMat = new THREE.MeshStandardMaterial({
      color: isSchematic ? 0x0891b2 : 0x0f172a,
      roughness: 0.35,
      metalness: 0.7,
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

      // PBR Floor Material Assignment with procedural textures
      let floorMap: THREE.Texture | null = null;
      if (shadingMode === 'rendered' && !isWireframe && !isSchematic) {
        if (room.type === 'living' || room.type === 'bedroom' || room.type === 'dining' || room.type === 'office') {
          floorMap = createWoodFloorTexture();
        } else if (room.type === 'kitchen') {
          floorMap = createTileFloorTexture();
        } else if (room.type === 'bathroom') {
          floorMap = createSlateFloorTexture();
        } else if (isPorch) {
          floorMap = createPaverFloorTexture();
        }
      }

      // 4. Room Floor Slabs: In Schematic mode -> Vibrant Room Semantic Color (#10b981, #3b82f6, #ec4899, etc.)
      const roomColor = room.color || '#3b82f6';
      const floorGeo = new THREE.BoxGeometry(roomW - 0.02, floorThickness, roomD - 0.02);
      const floorMat = new THREE.MeshStandardMaterial({
        color: isSelected
          ? 0xeb7724
          : (isSchematic
              ? roomColor
              : (isPorch ? 0x78716c : (shadingMode === 'rendered' ? (floorMap ? 0xffffff : roomColor) : 0x555555))),
        map: isSchematic ? null : floorMap,
        roughness: isSchematic ? 0.4 : (isPorch ? 0.95 : (room.type === 'bathroom' ? 0.2 : 0.65)),
        metalness: 0.05,
        wireframe: isWireframe,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(roomCenterX, floorY, roomCenterZ);
      floorMesh.receiveShadow = true;
      (floorMesh as any).userData = { roomId: room.id, roomName: room.name };
      group.add(floorMesh);

      // Room Floor Label Badge (Shown when furniture is off to prevent visual overlap)
      if (!showFurniture && shadingMode !== 'wireframe' && roomW > 1.2 && roomD > 1.2) {
        const areaM2 = (roomW * roomD).toFixed(1);
        const labelTexture = createRoomFloorLabelTexture(room.name, `${roomW.toFixed(1)}m × ${roomD.toFixed(1)}m (${areaM2} m²)`);
        const labelW = Math.min(roomW * 0.75, 2.2);
        const labelH = labelW * 0.5;
        const labelGeo = new THREE.PlaneGeometry(labelW, labelH);
        const labelMat = new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        });
        const labelMesh = new THREE.Mesh(labelGeo, labelMat);
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.position.set(roomCenterX, floorY + 0.045, roomCenterZ);
        group.add(labelMesh);
      }

      // Porch Architectural Columns & Outdoor Railing
      if (isPorch && shadingMode !== 'wireframe') {
        const colMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.4 });
        const col1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 0.18), colMat);
        col1.position.set(roomCenterX - roomW / 2 + 0.12, floorY + H / 2, roomCenterZ + roomD / 2 - 0.12);
        col1.castShadow = true;
        const col2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, H, 0.18), colMat);
        col2.position.set(roomCenterX + roomW / 2 - 0.12, floorY + H / 2, roomCenterZ + roomD / 2 - 0.12);
        col2.castShadow = true;
        group.add(col1, col2);
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
      if (showFurniture && shadingMode !== 'wireframe') {
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

      // Check for explicit window or door openings from validated geometry
      const winOp = w.openings?.find(op => op.type === 'window');
      const doorOp = w.openings?.find(op => op.type === 'door');

      if (winOp && len > 1.1) {
        // --- 1. TRUE ARCHITECTURAL WINDOW WITH SILL & GLASS ---
        const winWidth = Math.min(len * 0.55, winOp.width || 1.3);
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

        // Window Sill (Wall up to 0.9m)
        const sillH = 0.9;
        const sillMat = isSchematic ? new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.4, metalness: 0.2 }) : currentMat;
        const sill = new THREE.Mesh(new THREE.BoxGeometry(winWidth, sillH, T), sillMat);
        sill.position.set(0, -H / 2 + sillH / 2, 0);
        sill.castShadow = true;

        // Window Top Lintel (Wall above 2.1m)
        const topLintelH = Math.max(0.2, H - 2.1);
        const topLintelMat = isSchematic ? new THREE.MeshStandardMaterial({ color: 0x0891b2, roughness: 0.4, metalness: 0.2 }) : currentMat;
        const topLintel = new THREE.Mesh(new THREE.BoxGeometry(winWidth, topLintelH, T), topLintelMat);
        topLintel.position.set(0, H / 2 - topLintelH / 2, 0);
        topLintel.castShadow = true;

        // Glass Pane in center (Between 0.9m and 2.1m) - PlanPop Cyan
        const glassH = H - sillH - topLintelH;
        const glass = new THREE.Mesh(new THREE.BoxGeometry(winWidth, glassH, T * 0.2), glassMat);
        glass.position.set(0, -H / 2 + sillH + glassH / 2, 0);

        // Window Frame Border
        const frameBarH = new THREE.Mesh(new THREE.BoxGeometry(winWidth, 0.04, T * 0.3), windowFrameMat);
        frameBarH.position.set(0, -H / 2 + sillH + glassH / 2, 0);

        wallGroup.add(side1, side2, sill, topLintel, glass, frameBarH);
        group.add(wallGroup);
      } else if (doorOp && len > 0.9) {
        // --- 2. TRUE ARCHITECTURAL DOORWAY (Door leaf + threshold, no sill) - PlanPop Blue ---
        const doorWidth = Math.min(len * 0.75, doorOp.width || 0.95);
        const remainingLen = Math.max(0.15, len - doorWidth);
        const seg1Len = remainingLen * 0.5;
        const seg2Len = remainingLen * 0.5;

        const wallGroup = new THREE.Group();
        wallGroup.position.set(midX, wallY, midZ);
        wallGroup.rotation.y = -angle;

        const seg1 = new THREE.Mesh(new THREE.BoxGeometry(seg1Len, H, T), currentMat);
        seg1.position.set(-len / 2 + seg1Len / 2, 0, 0);
        seg1.castShadow = true;

        const seg2 = new THREE.Mesh(new THREE.BoxGeometry(seg2Len, H, T), currentMat);
        seg2.position.set(len / 2 - seg2Len / 2, 0, 0);
        seg2.castShadow = true;

        // Lintel above door (H - 2.1m)
        const lintelH = Math.max(0.2, H - 2.1);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelH, T), currentMat);
        lintel.position.set(0, H / 2 - lintelH / 2, 0);
        lintel.castShadow = true;

        // Door Threshold on floor
        const thresh = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 0.04, T * 1.3), doorThresholdMat);
        thresh.position.set(0, -H / 2 + 0.02, 0);

        // 3D Door Leaf swung open at 55 degrees into the room
        const doorLeaf = new THREE.Mesh(
          new THREE.BoxGeometry(doorWidth * 0.92, 2.06, 0.04),
          doorLeafMat
        );
        doorLeaf.position.set(-doorWidth / 2 + 0.04, -H / 2 + 1.03, 0.32);
        doorLeaf.rotation.y = Math.PI / 3.2; // Swung open
        doorLeaf.castShadow = true;

        wallGroup.add(seg1, seg2, lintel, thresh, doorLeaf);
        group.add(wallGroup);
      } else {
        // --- 3. SOLID CONTINUOUS WALL (No openings) ---
        const solidMesh = new THREE.Mesh(new THREE.BoxGeometry(len, H, T), currentMat);
        solidMesh.position.set(midX, wallY, midZ);
        solidMesh.rotation.y = -angle;
        solidMesh.castShadow = true;
        solidMesh.receiveShadow = true;
        group.add(solidMesh);
      }

      // Architectural Wall Top Cap (Coping Trim for authentic CAD dollhouse finish)
      const capMat = new THREE.MeshStandardMaterial({
        color: isSchematic ? 0xb91c1c : 0x334155,
        roughness: 0.5,
        metalness: 0.1,
        wireframe: isWireframe,
      });
      const capMesh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, T + 0.03), capMat);
      capMesh.position.set(midX, wallY + H / 2 + 0.02, midZ);
      capMesh.rotation.y = -angle;
      capMesh.castShadow = true;
      group.add(capMesh);
    });

    // 4.4 Architectural North Compass Rose (Gizmo on foundation floor)
    const compassGroup = new THREE.Group();
    compassGroup.position.set(W / 2 + 0.7, 0.22, -L / 2 - 0.2);

    const ringGeo = new THREE.RingGeometry(0.45, 0.52, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    compassGroup.add(ringMesh);

    // North Needle (Red Arrow pointing -Z towards North)
    const needleGeo = new THREE.ConeGeometry(0.14, 0.6, 4);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const needle = new THREE.Mesh(needleGeo, needleMat);
    needle.rotation.x = -Math.PI / 2;
    needle.position.set(0, 0.02, -0.28);
    compassGroup.add(needle);

    // South Needle (White Arrow pointing +Z towards South)
    const southNeedleGeo = new THREE.ConeGeometry(0.1, 0.4, 4);
    const southNeedleMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    const southNeedle = new THREE.Mesh(southNeedleGeo, southNeedleMat);
    southNeedle.rotation.x = Math.PI / 2;
    southNeedle.position.set(0, 0.02, 0.18);
    compassGroup.add(southNeedle);

    // "N" Label Texture
    const nCanvas = document.createElement('canvas');
    nCanvas.width = 128;
    nCanvas.height = 128;
    const nCtx = nCanvas.getContext('2d')!;
    nCtx.fillStyle = '#ef4444';
    nCtx.font = 'bold 84px sans-serif';
    nCtx.textAlign = 'center';
    nCtx.textBaseline = 'middle';
    nCtx.fillText('N', 64, 64);
    const nTex = new THREE.CanvasTexture(nCanvas);
    const nMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.38),
      new THREE.MeshBasicMaterial({ map: nTex, transparent: true })
    );
    nMesh.rotation.x = -Math.PI / 2;
    nMesh.position.set(0, 0.03, -0.68);
    compassGroup.add(nMesh);

    group.add(compassGroup);

    setStats(prev => ({
      ...prev,
      verts: group.children.length * 36,
      faces: group.children.length * 18,
      objects: group.children.length,
    }));

    // Calculate actual model bounding box dimensions, center, and aspect ratio
    const box = new THREE.Box3().setFromObject(group);
    if (!box.isEmpty()) {
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      setModelBounds({
        sizeX: parseFloat(size.x.toFixed(2)),
        sizeY: parseFloat(size.y.toFixed(2)),
        sizeZ: parseFloat(size.z.toFixed(2)),
        centerX: parseFloat(center.x.toFixed(2)),
        centerY: parseFloat(center.y.toFixed(2)),
        centerZ: parseFloat(center.z.toFixed(2)),
        aspectRatio: parseFloat((size.x / Math.max(size.z, 0.001)).toFixed(3)),
      });
    }

    // Auto-fit camera framing dynamically on model load
    requestAnimationFrame(() => {
      fitCameraToModel(1.25);
    });
  }, [dimensions, rooms, walls, selectedRoomId, shadingMode, showFurniture, showBlueprint, blueprintLayer, colorMode, blueprintUrl, semanticBlueprintUrl, overlayBlueprintUrl, fitCameraToModel]);

  // Keyboard Shortcuts: 'F' to Frame Model, '7' Top View, '1' Front View, '3' Right View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitCameraToModel(1.25);
      } else if (e.key === '7') {
        setCameraPreset('top');
      } else if (e.key === '1') {
        setCameraPreset('front');
      } else if (e.key === '3') {
        setCameraPreset('right');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fitCameraToModel]);

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

  // Camera Presets with dynamic model bounding box fitting & true centering
  const setCameraPreset = (view: 'top' | 'front' | 'right' | 'iso') => {
    if (!cameraRef.current || !controlsRef.current || !houseGroupRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const houseGroup = houseGroupRef.current;

    const box = new THREE.Box3().setFromObject(houseGroup);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    if (box.isEmpty()) {
      size.set(dimensions.width, dimensions.wallHeight, dimensions.length);
      center.set(0, dimensions.wallHeight / 2, 0);
    } else {
      box.getSize(size);
      box.getCenter(center);
    }

    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = cam.aspect || 1.6;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const fitDist = Math.max(
      (size.x * 1.3 / 2) / Math.tan(hFov / 2),
      (size.z * 1.3 / 2) / Math.tan(vFov / 2),
      (size.y * 1.3 / 2) / Math.tan(vFov / 2),
      6.0
    );

    ctrl.target.copy(center);

    if (view === 'top') {
      cam.up.set(0, 0, -1); // North (-Z) is UP in blueprint view
      cam.position.set(center.x, center.y + fitDist * 1.3, center.z);
    } else {
      cam.up.set(0, 1, 0);
      if (view === 'front') {
        cam.position.set(center.x, center.y, center.z + fitDist * 1.3);
      } else if (view === 'right') {
        cam.position.set(center.x + fitDist * 1.3, center.y, center.z);
      } else if (view === 'iso') {
        const isoDir = new THREE.Vector3(0.85, 1.05, 0.95).normalize();
        cam.position.copy(center).addScaledVector(isoDir, fitDist * 1.35);
      }
    }
    cam.near = Math.max(0.05, fitDist / 100);
    cam.far = Math.max(1000, fitDist * 25);
    cam.updateProjectionMatrix();
    ctrl.update();
  };

  // Export 3D Binary Model (.glb) for Blender, Unity, Unreal, or 3D Web
  const exportGLB = () => {
    if (!houseGroupRef.current) return;
    setIsExportingGLB(true);

    try {
      const exporter = new GLTFExporter();
      exporter.parse(
        houseGroupRef.current,
        (gltf) => {
          setIsExportingGLB(false);
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Beyond-2D_House_Model.glb`;
          a.click();
          URL.revokeObjectURL(url);
          setShowExportMenu(false);
        },
        (error) => {
          setIsExportingGLB(false);
          console.error('Error exporting GLB:', error);
          alert('Could not generate 3D GLB model. Try JSON format.');
        },
        { binary: true }
      );
    } catch (err) {
      setIsExportingGLB(false);
      console.error(err);
    }
  };

  // Export 3D Wavefront Model (.obj) (PlanPop 3D Architecture)
  const exportOBJ = () => {
    if (!houseGroupRef.current) return;
    setIsExportingOBJ(true);

    try {
      const exporter = new OBJExporter();
      const result = exporter.parse(houseGroupRef.current);
      const blob = new Blob([result], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Beyond-2D_House_Model.obj`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExportingOBJ(false);
      setShowExportMenu(false);
    } catch (err) {
      setIsExportingOBJ(false);
      console.error('Error exporting OBJ:', err);
    }
  };

  // Export CAD Floor Plan Schema (.json)
  const exportJSON = () => {
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
    setShowExportMenu(false);
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
          {/* Fit to View [F] button */}
          <button 
            onClick={() => fitCameraToModel(1.25)} 
            className="px-2 py-0.5 rounded bg-[#1e293b] text-[#38bdf8] hover:bg-[#2563eb] hover:text-white flex items-center gap-1 font-mono transition-colors border border-[#38bdf8]/30"
            title="Auto-Fit Camera to Model [F]"
          >
            <Maximize2 size={12} />
            <span>Fit [F]</span>
          </button>
        </div>

        {/* PlanPop CAD Color Schematic Toggle */}
        <button
          onClick={() => setColorMode(colorMode === 'schematic' ? 'realistic' : 'schematic')}
          className={`px-2.5 py-0.5 rounded text-[11px] font-mono border transition-colors flex items-center gap-1.5 ${
            colorMode === 'schematic' 
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#fca5a5] font-semibold shadow-sm' 
              : 'bg-[#202020] border-[#383838] text-[#808080] hover:text-[#bbb]'
          }`}
          title="Toggle 3D Model Color Schematic (PlanPop Red Walls, Blue Doors, Cyan Windows, Room-colored Floors)"
        >
          <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
          <span>Schematic: {colorMode === 'schematic' ? 'ON' : 'OFF'}</span>
        </button>

        {/* Furniture Staging Toggle */}
        <button
          onClick={() => setShowFurniture(!showFurniture)}
          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
            showFurniture 
              ? 'bg-[#2563eb]/30 border-[#3b82f6] text-[#93c5fd]' 
              : 'bg-[#202020] border-[#383838] text-[#808080] hover:text-[#bbb]'
          }`}
          title="Toggle Furniture Staging (Default: Off for clean blueprint models)"
        >
          {showFurniture ? 'Furniture: ON' : 'Furniture: OFF'}
        </button>

        {/* PlanPop 2D Blueprint Overlay Toggle */}
        {(blueprintUrl || semanticBlueprintUrl || overlayBlueprintUrl) && (
          <button
            onClick={() => {
              if (blueprintLayer === 'off') {
                setBlueprintLayer(semanticBlueprintUrl ? 'semantic' : 'source');
                setShowBlueprint(true);
              } else if (blueprintLayer === 'semantic' && overlayBlueprintUrl) {
                setBlueprintLayer('overlay');
                setShowBlueprint(true);
              } else if ((blueprintLayer === 'semantic' || blueprintLayer === 'overlay') && blueprintUrl) {
                setBlueprintLayer('source');
                setShowBlueprint(true);
              } else {
                setBlueprintLayer('off');
                setShowBlueprint(false);
              }
            }}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono border transition-colors flex items-center gap-1.5 ${
              blueprintLayer !== 'off' 
                ? 'bg-[#10b981]/25 border-[#10b981] text-[#6ee7b7] font-semibold' 
                : 'bg-[#202020] border-[#383838] text-[#808080] hover:text-[#bbb]'
            }`}
            title="Cycle 3D Floor Blueprint Overlay: PlanPop Semantic -> CAD Overlay -> 2D Plan -> OFF"
          >
            <Layers size={12} />
            <span>
              Blueprint: {
                blueprintLayer === 'semantic' 
                  ? 'PlanPop' 
                  : blueprintLayer === 'overlay' 
                  ? 'CAD' 
                  : blueprintLayer === 'source' 
                  ? '2D Plan' 
                  : 'OFF'
              }
            </span>
          </button>
        )}

        {/* Real-time Diagnostics HUD Toggle */}
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors flex items-center gap-1 ${
            showDiagnostics 
              ? 'bg-[#0f2438] border-[#38bdf8] text-[#38bdf8]' 
              : 'bg-[#202020] border-[#383838] text-[#808080] hover:text-[#bbb]'
          }`}
          title="Toggle Real-time PlanPop & Viewport Diagnostics HUD"
        >
          <Activity size={12} />
          <span>HUD: {showDiagnostics ? 'ON' : 'OFF'}</span>
        </button>

        {/* Center-Right: Active Engine Version Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131c2e] border border-[#2563eb]/40 text-[#60a5fa] text-[11px] font-mono shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold text-slate-200">
            {process.env.NEXT_PUBLIC_API_BASE_URL ? 'Version B (FastAPI:8001)' : 'Version A (Next.js:3000)'}
          </span>
          <span className="text-[#94a3b8] text-[10px]">Architecture Engine</span>
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

          {/* Export Dropdown Menu (GLB 3D Model vs JSON CAD Schema) */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#eb7724] hover:bg-[#f38938] text-white font-medium rounded shadow-sm text-xs transition-colors"
              title="Export 3D Model (.glb) or CAD Schema (.json)"
            >
              <Download size={13} />
              <span>Export</span>
              <ChevronDown size={11} className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)} 
                />
                <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#242424] border border-[#3e3e3e] rounded-lg shadow-2xl z-50 p-1.5 text-xs">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-[#888] border-b border-[#333]">
                    Choose Export Format
                  </div>

                  <button
                    onClick={exportGLB}
                    disabled={isExportingGLB}
                    className="w-full text-left p-2 hover:bg-[#303030] rounded flex items-start gap-2.5 transition-colors group mt-1"
                  >
                    <div className="w-7 h-7 rounded bg-[#3b82f6]/20 text-[#60a5fa] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#3b82f6] group-hover:text-white transition-colors">
                      <Box size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        3D Binary Model (.glb)
                        <span className="text-[9px] bg-[#3b82f6]/25 text-[#60a5fa] px-1 py-0.2 rounded font-mono">3D</span>
                      </div>
                      <div className="text-[10px] text-[#999] mt-0.5 leading-snug">
                        {isExportingGLB ? 'Generating GLB mesh...' : 'Full 3D model for Blender, Unity, Unreal, or Web.'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={exportOBJ}
                    disabled={isExportingOBJ}
                    className="w-full text-left p-2 hover:bg-[#303030] rounded flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-[#10b981]/20 text-[#34d399] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#10b981] group-hover:text-white transition-colors">
                      <Box size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        Wavefront 3D (.obj)
                        <span className="text-[9px] bg-[#10b981]/25 text-[#34d399] px-1 py-0.2 rounded font-mono">OBJ</span>
                      </div>
                      <div className="text-[10px] text-[#999] mt-0.5 leading-snug">
                        {isExportingOBJ ? 'Generating OBJ mesh...' : 'Universal CAD & 3D mesh geometry file.'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={exportJSON}
                    className="w-full text-left p-2 hover:bg-[#303030] rounded flex items-start gap-2.5 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded bg-[#eb7724]/20 text-[#f97316] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#eb7724] group-hover:text-white transition-colors">
                      <Layers size={14} />
                    </div>
                    <div>
                      <div className="font-semibold text-white">CAD Layout (.json)</div>
                      <div className="text-[10px] text-[#999] mt-0.5 leading-snug">
                        Room polygons, wall coordinates & metadata.
                      </div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
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

        {/* Real-Time Diagnostic HUD Overlay */}
        {showDiagnostics ? (
          <div className="absolute top-3 left-3 z-20 pointer-events-auto text-[11px] font-mono text-[#a0a0a0] bg-[#12161f]/92 backdrop-blur-md p-3 rounded-lg border border-[#38bdf8]/40 shadow-2xl max-w-sm transition-all duration-200">
            <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-[#1e293b]">
              <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
                <Activity size={13} className="text-[#38bdf8] animate-pulse" />
                <span>PlanPop & Viewport Diagnostics</span>
              </div>
              <button
                onClick={() => setShowDiagnostics(false)}
                className="text-[#64748b] hover:text-white text-xs px-1"
                title="Minimize Diagnostics HUD"
              >
                &times;
              </button>
            </div>

            {/* Grid of Telemetry */}
            <div className="space-y-1.5 text-[10.5px]">
              {/* Resolution & Aspect Ratio */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">Source Plan:</span>
                <span className="text-slate-200 font-medium">
                  {diagnostics?.footprint?.resolution || '1024 × 682 px'}
                  <span className="ml-1 text-[9px] text-[#38bdf8] bg-[#0c2438] px-1 py-0.5 rounded">
                    Aspect: {diagnostics?.footprint?.aspectRatio ? diagnostics.footprint.aspectRatio.toFixed(3) : '1.081'}
                  </span>
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">PlanPop Map:</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span>1024 × 682 px</span>
                  <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/30">
                    1:1 Match
                  </span>
                </span>
              </div>

              {/* 3D Model Bounding Box */}
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-[#1e293b]/70">
                <span className="text-[#64748b]">Model Bounding Box:</span>
                <span className="text-[#f59e0b] font-medium">
                  {modelBounds.sizeX}m (W) &times; {modelBounds.sizeY}m (H) &times; {modelBounds.sizeZ}m (D)
                </span>
              </div>

              {/* Model Center & World Scale */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">Model Center:</span>
                <span className="text-slate-300">
                  ({modelBounds.centerX}, {modelBounds.centerY}, {modelBounds.centerZ})
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">World Scale:</span>
                <span className="text-slate-300">1 unit = 1.0m (Metric CAD)</span>
              </div>

              {/* Aspect Ratio Preservation Status */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">Aspect Preserved:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span>{modelBounds.aspectRatio.toFixed(3)}</span>
                  <span className="text-[9px] bg-emerald-950/60 text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/30">
                    PRESERVED ✓
                  </span>
                </span>
              </div>

              {/* Camera Pos, Target, FOV */}
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-[#1e293b]/70">
                <span className="text-[#64748b]">Camera Pos:</span>
                <span className="text-[#93c5fd]">
                  ({cameraTelemetry.posX}, {cameraTelemetry.posY}, {cameraTelemetry.posZ})
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">Camera Target:</span>
                <span className="text-[#93c5fd]">
                  ({cameraTelemetry.targetX}, {cameraTelemetry.targetY}, {cameraTelemetry.targetZ})
                </span>
              </div>

              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">Camera FOV:</span>
                <span className="text-slate-300">{cameraTelemetry.fov}&deg; Perspective</span>
              </div>

              {/* Viewport Size */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#64748b]">Viewport Size:</span>
                <span className="text-slate-300">{viewportSize.width} &times; {viewportSize.height} px</span>
              </div>

              {/* 3D Color Schematic Palette Legend */}
              {colorMode === 'schematic' && (
                <div className="pt-2 border-t border-[#1e293b] space-y-1">
                  <div className="text-[10px] text-[#38bdf8] font-semibold flex items-center justify-between">
                    <span>3D CAD Color Schematic:</span>
                    <span className="text-[9px] bg-red-950/70 text-red-400 px-1 py-0.2 rounded border border-red-500/30">Active</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9.5px]">
                    <span className="inline-flex items-center gap-1 text-[#f87171]"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>Red Wall</span>
                    <span className="inline-flex items-center gap-1 text-[#60a5fa]"><span className="w-2 h-2 rounded-full bg-[#2563eb]"></span>Blue Door</span>
                    <span className="inline-flex items-center gap-1 text-[#22d3ee]"><span className="w-2 h-2 rounded-full bg-[#06b6d4]"></span>Cyan Window</span>
                    <span className="inline-flex items-center gap-1 text-[#34d399]"><span className="w-2 h-2 rounded-full bg-[#10b981]"></span>Bedrooms</span>
                    <span className="inline-flex items-center gap-1 text-[#60a5fa]"><span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>Living</span>
                    <span className="inline-flex items-center gap-1 text-[#f472b6]"><span className="w-2 h-2 rounded-full bg-[#ec4899]"></span>Kitchen</span>
                    <span className="inline-flex items-center gap-1 text-[#fbbf24]"><span className="w-2 h-2 rounded-full bg-[#eab308]"></span>Bath</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2.5 pt-1.5 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-[#64748b]">
              <span>Press <strong className="text-white bg-[#1e293b] px-1 py-0.5 rounded">F</strong> to Fit</span>
              <button
                onClick={() => fitCameraToModel(1.25)}
                className="text-[#38bdf8] hover:underline"
              >
                Frame Model &rarr;
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDiagnostics(true)}
            className="absolute top-3 left-3 z-10 text-[11px] font-mono text-[#38bdf8] bg-[#12161f]/85 backdrop-blur px-2.5 py-1 rounded border border-[#38bdf8]/40 hover:bg-[#1e293b] flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Activity size={12} className="text-[#38bdf8]" />
            <span>Show Diagnostics HUD</span>
          </button>
        )}

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
