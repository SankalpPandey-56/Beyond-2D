'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import SidebarLeft from '@/components/SidebarLeft';
import SidebarRight from '@/components/SidebarRight';
import { SAMPLE_PROJECTS } from '@/lib/sampleData';
import { 
  BuildingDimensions, 
  EnvironmentMode, 
  ProjectData, 
  ShadingMode, 
  TransformTool 
} from '@/lib/types';

// Dynamic import with ssr: false for WebGL Three.js canvas
const BlenderViewport = dynamic(() => import('@/components/BlenderViewport'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col items-center justify-center text-xs font-mono text-[#808080]">
      <div className="w-8 h-8 border-2 border-[#eb7724] border-t-transparent rounded-full animate-spin mb-3"></div>
      <div>Loading Blender-style 3D Viewport...</div>
    </div>
  ),
});

export default function Beyond2DApp() {
  const [projects, setProjects] = useState<ProjectData[]>(SAMPLE_PROJECTS);
  const [currentProjectId, setCurrentProjectId] = useState<string>(SAMPLE_PROJECTS[0].id);

  // Viewport Settings
  const [environment, setEnvironment] = useState<EnvironmentMode>('studio');
  const [shadingMode, setShadingMode] = useState<ShadingMode>('rendered');
  const [activeTool, setActiveTool] = useState<TransformTool>('select');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Active Project Data
  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];

  // Handle Dimensions Change
  const handleDimensionsChange = (newDims: BuildingDimensions) => {
    setProjects(prev =>
      prev.map(p => (p.id === currentProjectId ? { ...p, dimensions: newDims } : p))
    );
  };

  // Handle New Project Creation
  const handleNewProject = () => {
    const newId = `proj_${Date.now()}`;
    const newProj: ProjectData = {
      id: newId,
      title: `Architectural Layout #${projects.length + 1}`,
      updatedAt: 'Just now',
      dimensions: {
        width: 12.0,
        length: 9.0,
        wallHeight: 3.0,
        wallThickness: 0.2,
      },
      rooms: [
        {
          id: 'room_great_hall',
          name: 'Main Living Hall',
          type: 'living',
          color: '#3b82f6',
          relX: 0.0,
          relZ: 0.0,
          relW: 0.6,
          relD: 1.0,
        },
        {
          id: 'room_suite',
          name: 'Master Suite',
          type: 'bedroom',
          color: '#10b981',
          relX: 0.6,
          relZ: 0.0,
          relW: 0.4,
          relD: 0.5,
        },
        {
          id: 'room_ensuite',
          name: 'Ensuite Bath',
          type: 'bathroom',
          color: '#eab308',
          relX: 0.6,
          relZ: 0.5,
          relW: 0.4,
          relD: 0.5,
        },
      ],
      previewUrl: currentProject.previewUrl,
    };
    setProjects([newProj, ...projects]);
    setCurrentProjectId(newId);
    setSelectedRoomId(null);
  };

  // Handle Upload 2D Floor Plan
  const handleUploadImage = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    const newId = `proj_upload_${Date.now()}`;
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '');

    const newUploadedProject: ProjectData = {
      id: newId,
      title: cleanFileName.length > 22 ? `${cleanFileName.slice(0, 20)}...` : cleanFileName,
      updatedAt: 'Just now',
      previewUrl: imageUrl,
      dimensions: {
        width: 11.5,
        length: 8.5,
        wallHeight: 2.8,
        wallThickness: 0.22,
      },
      rooms: [
        {
          id: 'room_up_1',
          name: 'Living & Reception',
          type: 'living',
          color: '#3b82f6',
          relX: 0.0,
          relZ: 0.0,
          relW: 0.5,
          relD: 0.6,
        },
        {
          id: 'room_up_2',
          name: 'Kitchen / Diner',
          type: 'kitchen',
          color: '#ec4899',
          relX: 0.0,
          relZ: 0.6,
          relW: 0.5,
          relD: 0.4,
        },
        {
          id: 'room_up_3',
          name: 'Master Bed',
          type: 'bedroom',
          color: '#10b981',
          relX: 0.5,
          relZ: 0.0,
          relW: 0.5,
          relD: 0.5,
        },
        {
          id: 'room_up_4',
          name: 'Guest Bathroom',
          type: 'bathroom',
          color: '#eab308',
          relX: 0.5,
          relZ: 0.5,
          relW: 0.5,
          relD: 0.5,
        },
      ],
    };

    setProjects([newUploadedProject, ...projects]);
    setCurrentProjectId(newId);
    setSelectedRoomId(null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#1e1e1e]">
      {/* 1. Left Sidebar: Branding, New Project, Upload 2D, Recents, Environment */}
      <SidebarLeft
        projects={projects}
        currentProjectId={currentProjectId}
        onSelectProject={id => {
          setCurrentProjectId(id);
          setSelectedRoomId(null);
        }}
        onNewProject={handleNewProject}
        onUploadImage={handleUploadImage}
        environment={environment}
        onEnvironmentChange={setEnvironment}
      />

      {/* 2. Center: Large Blender-Style 3D Viewport */}
      <main className="flex-1 h-full relative overflow-hidden">
        <BlenderViewport
          dimensions={currentProject.dimensions}
          rooms={currentProject.rooms}
          environment={environment}
          onEnvironmentChange={setEnvironment}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          shadingMode={shadingMode}
          onShadingModeChange={setShadingMode}
        />
      </main>

      {/* 3. Right Sidebar: 2D Image Preview, Realtime Dimensions, Outliner */}
      <SidebarRight
        dimensions={currentProject.dimensions}
        onDimensionsChange={handleDimensionsChange}
        rooms={currentProject.rooms}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        previewUrl={currentProject.previewUrl}
      />
    </div>
  );
}
