'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BuildingDimensions, EnvironmentMode, RoomData, ShadingMode, TransformTool } from '@/lib/types';
import { 
  Box, 
  Sun, 
  Moon, 
  Lightbulb, 
  Eye, 
  Rotate3d, 
  Download, 
  Maximize2, 
  Move, 
  Compass,
  Layers,
  Sparkles
} from 'lucide-react';

interface BlenderViewportProps {
  dimensions: BuildingDimensions;
  rooms: RoomData[];
  environment: EnvironmentMode;
  onEnvironmentChange: (env: EnvironmentMode) => void;
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  activeTool: TransformTool;
  onToolChange: (tool: TransformTool) => void;
  shadingMode: ShadingMode;
  onShadingModeChange: (mode: ShadingMode) => void;
}

export default function BlenderViewport({
  dimensions,
  rooms,
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

  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [stats, setStats] = useState({ verts: 284, faces: 142, objects: 12, fps: 60 });

  // 1. Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera (Blender default FOV ~ 50mm / 45-50 deg)
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(14, 12, 16);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 1.2, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't go below floor
    controlsRef.current = controls;

    // Subtle Blender Grid
    const grid = new THREE.GridHelper(30, 30, 0x4f4f4f, 0x2d2d2d);
    grid.position.y = 0;
    scene.add(grid);

    // Subtle World Axes Indicator on Floor
    const axesFloor = new THREE.AxesHelper(1.5);
    axesFloor.position.set(0, 0.01, 0);
    scene.add(axesFloor);

    // Lights Container
    const lightsGroup = new THREE.Group();
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    // House Mesh Container
    const houseGroup = new THREE.Group();
    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      // Render main scene
      renderer.render(scene, camera);

      // Render Gizmo
      renderGizmo();

      // FPS tracking
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setStats(prev => ({ ...prev, fps: frameCount }));
        frameCount = 0;
        lastTime = now;
      }
    };
    animate();

    // Resize Handler
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

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(35, 35, 35, 0.7)';
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Get camera orientation matrix
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

    // Project vectors
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

    // Sort by depth (back to front)
    projected.sort((a, b) => a.z - b.z);

    projected.forEach(axis => {
      if (axis.z < -0.1 && axis.name.startsWith('-')) {
        // Draw negative axis dots
        ctx.beginPath();
        ctx.arc(axis.x, axis.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = axis.color;
        ctx.fill();
      } else if (!axis.name.startsWith('-')) {
        // Draw line from center
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(axis.x, axis.y);
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw axis head circle
        ctx.beginPath();
        ctx.arc(axis.x, axis.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = axis.color;
        ctx.fill();

        // Axis label
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

    // Clear existing lights
    while (lights.children.length > 0) {
      lights.remove(lights.children[0]);
    }

    if (environment === 'studio') {
      scene.background = new THREE.Color(0x1e1e1e);
      const ambLight = new THREE.AmbientLight(0xffffff, 0.8);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(12, 18, 10);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;

      const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.6);
      fillLight.position.set(-10, 8, -10);

      const rimLight = new THREE.DirectionalLight(0xffeedd, 0.5);
      rimLight.position.set(0, -5, -10);

      lights.add(ambLight, keyLight, fillLight, rimLight);
    } else if (environment === 'day') {
      scene.background = new THREE.Color(0x28323e);
      const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
      sunLight.position.set(16, 22, 14);
      sunLight.castShadow = true;
      const skyLight = new THREE.HemisphereLight(0x87ceeb, 0x332211, 0.8);
      lights.add(sunLight, skyLight);
    } else if (environment === 'night') {
      scene.background = new THREE.Color(0x0c1017);
      const moonLight = new THREE.DirectionalLight(0x406090, 0.6);
      moonLight.position.set(-10, 15, -10);
      const amb = new THREE.AmbientLight(0x182030, 0.5);
      
      // Warm interior point lights
      const warm1 = new THREE.PointLight(0xffaa44, 2.5, 8);
      warm1.position.set(0, 1.8, 0);
      lights.add(moonLight, amb, warm1);
    }
  }, [environment]);

  // 4. Procedural 3D Dollhouse Model Generation (Real-time update on dimensions or rooms)
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

    // Foundation Base Slab (Extruded foundation)
    const slabGeo = new THREE.BoxGeometry(W + 0.8, 0.25, L + 0.8);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x2d3238,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: isWireframe,
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.set(0, 0.125, 0);
    slabMesh.receiveShadow = true;
    group.add(slabMesh);

    // Build Rooms (Floor plates + Walls)
    rooms.forEach(room => {
      // Calculate actual world coordinates centered around (0,0)
      const roomW = room.relW * W;
      const roomD = room.relD * L;
      const roomCenterX = (room.relX * W) + (roomW / 2) - (W / 2);
      const roomCenterZ = (room.relZ * L) + (roomD / 2) - (L / 2);

      const isSelected = selectedRoomId === room.id;

      // Floor tile for this room
      const floorGeo = new THREE.BoxGeometry(roomW - 0.05, 0.06, roomD - 0.05);
      const floorMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xeb7724 : (shadingMode === 'rendered' ? room.color : 0x555555),
        roughness: 0.6,
        metalness: 0.1,
        wireframe: isWireframe,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(roomCenterX, 0.28, roomCenterZ);
      floorMesh.receiveShadow = true;
      (floorMesh as any).userData = { roomId: room.id, roomName: room.name };
      group.add(floorMesh);

      // Room border wireframe highlight if selected
      if (isSelected) {
        const selGeo = new THREE.BoxGeometry(roomW, H + 0.2, roomD);
        const selEdges = new THREE.EdgesGeometry(selGeo);
        const selLine = new THREE.LineSegments(
          selEdges,
          new THREE.LineBasicMaterial({ color: 0xeb7724, linewidth: 2 })
        );
        selLine.position.set(roomCenterX, 0.28 + H / 2, roomCenterZ);
        group.add(selLine);
      }
    });

    // 5. Exterior & Interior Walls
    const wallColor = shadingMode === 'rendered' ? 0xdddddd : (shadingMode === 'solid' ? 0x8a8a8a : 0xcccccc);
    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.85,
      metalness: 0.05,
      wireframe: isWireframe,
    });

    // Outer Perimeter Walls (North, South, East, West)
    const halfW = W / 2;
    const halfL = L / 2;
    const wallY = 0.28 + (H / 2);

    // North Wall (Z = -halfL)
    const northGeo = new THREE.BoxGeometry(W + T, H, T);
    const northMesh = new THREE.Mesh(northGeo, wallMat);
    northMesh.position.set(0, wallY, -halfL);
    northMesh.castShadow = true;
    northMesh.receiveShadow = true;
    group.add(northMesh);

    // South Wall (Z = halfL) with a main entrance door opening gap!
    const southGeo1 = new THREE.BoxGeometry(W * 0.4, H, T);
    const southMesh1 = new THREE.Mesh(southGeo1, wallMat);
    southMesh1.position.set(-W * 0.3, wallY, halfL);
    southMesh1.castShadow = true;
    group.add(southMesh1);

    const southGeo2 = new THREE.BoxGeometry(W * 0.4, H, T);
    const southMesh2 = new THREE.Mesh(southGeo2, wallMat);
    southMesh2.position.set(W * 0.3, wallY, halfL);
    southMesh2.castShadow = true;
    group.add(southMesh2);

    // Door lintel (above door opening)
    const lintelGeo = new THREE.BoxGeometry(W * 0.2, H * 0.3, T);
    const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
    lintelMesh.position.set(0, wallY + H * 0.35, halfL);
    group.add(lintelMesh);

    // West Wall (X = -halfW)
    const westGeo = new THREE.BoxGeometry(T, H, L + T);
    const westMesh = new THREE.Mesh(westGeo, wallMat);
    westMesh.position.set(-halfW, wallY, 0);
    westMesh.castShadow = true;
    group.add(westMesh);

    // East Wall (X = halfW)
    const eastGeo = new THREE.BoxGeometry(T, H, L + T);
    const eastMesh = new THREE.Mesh(eastGeo, wallMat);
    eastMesh.position.set(halfW, wallY, 0);
    eastMesh.castShadow = true;
    group.add(eastMesh);

    // Interior Partition Walls (Cross division based on rooms)
    if (rooms.length >= 2) {
      // Main dividing spine wall along X or Z
      const spineX = (rooms[0].relW * W) - halfW;
      const spineGeo = new THREE.BoxGeometry(T, H, L * 0.85);
      const spineMesh = new THREE.Mesh(spineGeo, wallMat);
      spineMesh.position.set(spineX, wallY, 0);
      spineMesh.castShadow = true;
      group.add(spineMesh);

      // Horizontal partition
      const partZ = (rooms[0].relD * L) - halfL;
      const partGeo = new THREE.BoxGeometry(W * 0.48, H, T);
      const partMesh = new THREE.Mesh(partGeo, wallMat);
      partMesh.position.set(-halfW + (W * 0.24), wallY, partZ);
      partMesh.castShadow = true;
      group.add(partMesh);
    }

    // Update geometry counters
    setStats(prev => ({
      ...prev,
      verts: group.children.length * 24,
      faces: group.children.length * 12,
      objects: group.children.length,
    }));
  }, [dimensions, rooms, selectedRoomId, shadingMode]);

  // Raycaster for Room Hover / Click in Viewport
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !houseGroupRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObjects(houseGroupRef.current.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0].object as any;
      if (hit.userData && hit.userData.roomId) {
        onSelectRoom(hit.userData.roomId);
        return;
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
      cam.position.set(0, dist + 4, 0.001); // slight offset so controls don't gimbal lock
      ctrl.target.set(0, 0, 0);
    } else if (view === 'front') {
      cam.position.set(0, 3, dist + 2);
      ctrl.target.set(0, dimensions.wallHeight / 2, 0);
    } else if (view === 'right') {
      cam.position.set(dist + 2, 3, 0);
      ctrl.target.set(0, dimensions.wallHeight / 2, 0);
    } else if (view === 'iso') {
      cam.position.set(14, 12, 16);
      ctrl.target.set(0, 1.2, 0);
    }
    ctrl.update();
  };

  // Export 3D Model placeholder
  const handleExport = () => {
    const exportData = {
      project: "Beyond-2D Export",
      timestamp: new Date().toISOString(),
      dimensions,
      rooms,
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
        {/* Left: Transform Tools */}
        <div className="flex items-center gap-1">
          <span className="text-[#808080] font-mono text-[10px] mr-1 uppercase tracking-wider">Mode</span>
          <button
            onClick={() => onToolChange('select')}
            title="Box Select (W)"
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${
              activeTool === 'select' ? 'bg-[#4772b3] text-white' : 'text-[#cfcfcf] hover:bg-[#383838]'
            }`}
          >
            <Box size={13} />
            <span>Select</span>
          </button>
          <button
            onClick={() => onToolChange('move')}
            title="Move / Translate (G)"
            className={`px-2 py-1 rounded flex items-center gap-1 font-medium ${
              activeTool === 'move' ? 'bg-[#4772b3] text-white' : 'text-[#cfcfcf] hover:bg-[#383838]'
            }`}
          >
            <Move size={13} />
            <span>Move</span>
          </button>
          <button
            onClick={() => onToolChange('rotate')}
            title="Rotate (R)"
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
          {/* Shading modes */}
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

          {/* Export Button (Directly from hand-drawn layout sketch!) */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#eb7724] hover:bg-[#f38938] text-white font-medium rounded shadow-sm text-xs transition-colors"
            title="Export 3D Model (JSON / GLTF)"
          >
            <Download size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* 2. Main 3D WebGL Canvas Area */}
      <div 
        ref={mountRef} 
        onPointerDown={handlePointerDown}
        className="flex-1 w-full relative cursor-grab active:cursor-grabbing outline-none"
      >
        {/* XYZ Axis Gizmo Overlay (Top-Right of Viewport, like Blender) */}
        <div className="absolute top-3 right-3 z-10 flex flex-col items-center pointer-events-none">
          <canvas ref={gizmoRef} width={80} height={80} className="w-20 h-20" />
        </div>

        {/* Viewport Overlay Info (Top-Left of Canvas) */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none text-[11px] font-mono text-[#a0a0a0] bg-[#1a1a1a]/80 backdrop-blur px-2.5 py-1.5 rounded border border-[#333]/50">
          <div className="text-white font-semibold">User Perspective</div>
          <div>Scale: 1:1 Metric (m)</div>
          <div>Grid: 1.0m Ortho</div>
        </div>

        {/* Environment Quick Toggle Floating Pill (Bottom-Left of Viewport) */}
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

        {/* Interaction Helper Pill (Bottom-Right) */}
        <div className="absolute bottom-4 right-4 z-10 pointer-events-none text-[10px] text-[#777] font-mono bg-[#1c1c1c]/90 px-2.5 py-1 rounded border border-[#333]">
          L-Click: Orbit &bull; M-Click/Shift: Pan &bull; Scroll: Zoom &bull; Click: Select Room
        </div>
      </div>

      {/* 3. Blender-style Bottom Status Bar */}
      <div className="h-6 bg-[#222222] border-t border-[#333] flex items-center justify-between px-3 text-[11px] text-[#888] font-mono">
        <div className="flex items-center gap-4">
          <span>Building: {dimensions.width.toFixed(1)}m &times; {dimensions.length.toFixed(1)}m</span>
          <span>Rooms: {rooms.length}</span>
          <span>Verts: {stats.verts}</span>
          <span>Faces: {stats.faces}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#4772b3]">Tool: {activeTool.toUpperCase()}</span>
          <span className="text-emerald-500">{stats.fps} FPS</span>
          <span>Beyond-2D v0.1.0</span>
        </div>
      </div>
    </div>
  );
}
