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
  TransformTool,
  AIAnalysisResponse
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

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStep, setAnalyzingStep] = useState('');

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

  // Handle Upload & Analyze Floor Plan via Gemma 4 Backend
  const handleUploadImage = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    const newId = `proj_upload_${Date.now()}`;
    const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
    const displayTitle = cleanFileName.length > 20 ? `${cleanFileName.slice(0, 18)}...` : cleanFileName;

    setIsAnalyzing(true);
    setAnalyzingStep('1/3 Uploading architectural plan...');

    let progressInterval: any = null;

    try {
      const formData = new FormData();
      formData.append('file', file);

      setAnalyzingStep('2/3 Vision AI inspecting rooms & walls...');
      progressInterval = setInterval(() => {
        setAnalyzingStep(prev => {
          if (prev.includes('rooms')) return '2/3 Extracting metric dimensions...';
          if (prev.includes('dimensions')) return '2/3 Tracing wall boundaries & doors...';
          return '2/3 Vision AI inspecting rooms & walls...';
        });
      }, 5000);

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const response = await fetch(`${apiBaseUrl}/api/analyze-floorplan`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setAnalyzingStep('3/3 Building 3D dollhouse & furniture...');

      const data: AIAnalysisResponse = await response.json();

      if (data && data.layout) {
        const analyzedProject: ProjectData = {
          id: newId,
          title: displayTitle,
          updatedAt: 'Just now',
          previewUrl: imageUrl,
          semanticPreviewUrl: data.diagnostics?.semanticImageBase64,
          overlayPreviewUrl: data.diagnostics?.overlayImageBase64,
          diagnostics: data.diagnostics,
          dimensions: data.layout.dimensions,
          rooms: data.layout.rooms,
          walls: data.layout.walls,
          aiMetadata: data.metadata,
        };

        setProjects(prev => [analyzedProject, ...prev]);
        setCurrentProjectId(newId);
        setSelectedRoomId(null);
      } else {
        throw new Error(data.error || 'Invalid response from analysis server');
      }
    } catch (err: any) {
      console.error('Floor plan analysis error:', err);
      // Even on unexpected network catch, fallback seamlessly
      const fallbackProject: ProjectData = {
        id: newId,
        title: `${displayTitle} (Fallback)`,
        updatedAt: 'Just now',
        previewUrl: imageUrl,
        dimensions: {
          width: 10.0,
          length: 8.0,
          wallHeight: 2.8,
          wallThickness: 0.2,
        },
        rooms: [
          {
            id: 'room_fb_1',
            name: 'Living Space',
            type: 'living',
            color: '#3b82f6',
            relX: 0.0,
            relZ: 0.0,
            relW: 0.6,
            relD: 1.0,
          },
          {
            id: 'room_fb_2',
            name: 'Bedroom Area',
            type: 'bedroom',
            color: '#10b981',
            relX: 0.6,
            relZ: 0.0,
            relW: 0.4,
            relD: 0.6,
          },
          {
            id: 'room_fb_3',
            name: 'Bathroom',
            type: 'bathroom',
            color: '#eab308',
            relX: 0.6,
            relZ: 0.6,
            relW: 0.4,
            relD: 0.4,
          },
        ],
        aiMetadata: {
          provider: 'Fallback Engine',
          model: 'sample-preset',
          confidence: 0.7,
          isFallback: true,
          processingTimeMs: 0,
          message: 'Client fallback triggered due to network/API error.',
        },
      };

      setProjects(prev => [fallbackProject, ...prev]);
      setCurrentProjectId(newId);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsAnalyzing(false);
      setAnalyzingStep('');
    }
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
        isAnalyzing={isAnalyzing}
        analyzingStep={analyzingStep}
        aiMetadata={currentProject.aiMetadata}
      />

      {/* 2. Center: Large Blender-Style 3D Viewport */}
      <main className="flex-1 h-full relative overflow-hidden">
        <BlenderViewport
          dimensions={currentProject.dimensions}
          rooms={currentProject.rooms}
          walls={currentProject.walls}
          environment={environment}
          onEnvironmentChange={setEnvironment}
          selectedRoomId={selectedRoomId}
          onSelectRoom={setSelectedRoomId}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          shadingMode={shadingMode}
          onShadingModeChange={setShadingMode}
          diagnostics={currentProject.diagnostics}
          blueprintUrl={currentProject.previewUrl}
          semanticBlueprintUrl={currentProject.semanticPreviewUrl}
          overlayBlueprintUrl={currentProject.overlayPreviewUrl}
        />
      </main>

      {/* 3. Right Sidebar: 2D Image Preview, Realtime Dimensions, Outliner, 3D Export */}
      <SidebarRight
        dimensions={currentProject.dimensions}
        onDimensionsChange={handleDimensionsChange}
        rooms={currentProject.rooms}
        walls={currentProject.walls}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        previewUrl={currentProject.previewUrl}
        semanticPreviewUrl={currentProject.semanticPreviewUrl}
        overlayPreviewUrl={currentProject.overlayPreviewUrl}
        diagnostics={currentProject.diagnostics}
      />
    </div>
  );
}
