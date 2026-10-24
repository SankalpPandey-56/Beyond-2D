'use client';

import React, { useRef } from 'react';
import { 
  FolderPlus, 
  UploadCloud, 
  FileText, 
  Clock, 
  Sun, 
  Moon, 
  Lightbulb, 
  Compass,
  ChevronRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { EnvironmentMode, ProjectData } from '@/lib/types';

interface SidebarLeftProps {
  projects: ProjectData[];
  currentProjectId: string;
  onSelectProject: (projId: string) => void;
  onNewProject: () => void;
  onUploadImage: (file: File) => void;
  environment: EnvironmentMode;
  onEnvironmentChange: (env: EnvironmentMode) => void;
}

export default function SidebarLeft({
  projects,
  currentProjectId,
  onSelectProject,
  onNewProject,
  onUploadImage,
  environment,
  onEnvironmentChange,
}: SidebarLeftProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <aside className="w-64 bg-[#282828] border-r border-[#3c3c3c] flex flex-col h-full select-none text-xs text-[#cfcfcf]">
      {/* 1. Header / App Brand */}
      <div className="h-12 border-b border-[#3c3c3c] px-3.5 flex items-center justify-between bg-[#232323]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#eb7724] flex items-center justify-center font-bold text-white text-xs shadow">
            B2
          </div>
          <div>
            <div className="font-bold tracking-tight text-white text-sm flex items-center gap-1.5">
              Beyond-2D
              <span className="text-[9px] uppercase tracking-wider bg-[#383838] text-[#eb7724] px-1 rounded font-mono">
                CAD
              </span>
            </div>
            <div className="text-[10px] text-[#808080]">Architectural 3D Workspace</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 2. Primary Actions: New Project & Upload 2D (Directly from hand-drawn layout!) */}
        <div className="space-y-2">
          <button
            onClick={onNewProject}
            className="w-full flex items-center justify-center gap-2 bg-[#3a3a3a] hover:bg-[#454545] text-white font-medium py-2 px-3 rounded border border-[#4a4a4a] transition-colors shadow-sm"
          >
            <FolderPlus size={15} className="text-[#eb7724]" />
            <span>New Project</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-[#eb7724] hover:bg-[#f38938] text-white font-medium py-2 px-3 rounded transition-colors shadow-sm"
          >
            <UploadCloud size={15} />
            <span>Upload 2D Plan</span>
          </button>
        </div>

        {/* 3. Drag & Drop Floor Plan Area */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#444] hover:border-[#eb7724] bg-[#222] hover:bg-[#252525] rounded-lg p-3 text-center cursor-pointer transition-all"
        >
          <UploadCloud size={20} className="mx-auto text-[#777] mb-1" />
          <div className="text-[11px] font-medium text-[#ccc]">Drop architectural floor plan</div>
          <div className="text-[10px] text-[#777] mt-0.5">PNG, JPG, or SVG drawings</div>
        </div>

        {/* 4. Recents Section (From hand-drawn layout) */}
        <div>
          <div className="flex items-center justify-between text-[10px] uppercase font-mono text-[#808080] tracking-wider mb-1.5 px-1">
            <span className="flex items-center gap-1">
              <Clock size={11} />
              Recents
            </span>
            <span>{projects.length} files</span>
          </div>

          <div className="space-y-1">
            {projects.map(p => {
              const isActive = p.id === currentProjectId;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className={`group flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                    isActive 
                      ? 'bg-[#353535] border-[#eb7724] text-white font-medium' 
                      : 'bg-[#252525] border-[#333] hover:bg-[#2d2d2d] text-[#bbb]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={14} className={isActive ? 'text-[#eb7724]' : 'text-[#777]'} />
                    <div className="truncate text-xs">{p.title}</div>
                  </div>
                  <ChevronRight size={12} className="text-[#666] group-hover:text-white" />
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Environment Controls (From hand-drawn layout: "Environment: Day, night, Studio") */}
        <div className="pt-2 border-t border-[#3c3c3c]">
          <div className="text-[10px] uppercase font-mono text-[#808080] tracking-wider mb-2 px-1 flex items-center gap-1">
            <Sun size={11} />
            Environment Lighting
          </div>

          <div className="grid grid-cols-3 gap-1 bg-[#202020] p-1 rounded border border-[#383838]">
            <button
              onClick={() => onEnvironmentChange('day')}
              className={`flex flex-col items-center py-1.5 px-1 rounded transition-colors ${
                environment === 'day' 
                  ? 'bg-[#eb7724] text-white font-medium' 
                  : 'text-[#888] hover:text-[#ccc] hover:bg-[#2b2b2b]'
              }`}
            >
              <Sun size={14} className="mb-0.5" />
              <span className="text-[10px]">Day</span>
            </button>

            <button
              onClick={() => onEnvironmentChange('night')}
              className={`flex flex-col items-center py-1.5 px-1 rounded transition-colors ${
                environment === 'night' 
                  ? 'bg-[#eb7724] text-white font-medium' 
                  : 'text-[#888] hover:text-[#ccc] hover:bg-[#2b2b2b]'
              }`}
            >
              <Moon size={14} className="mb-0.5" />
              <span className="text-[10px]">Night</span>
            </button>

            <button
              onClick={() => onEnvironmentChange('studio')}
              className={`flex flex-col items-center py-1.5 px-1 rounded transition-colors ${
                environment === 'studio' 
                  ? 'bg-[#eb7724] text-white font-medium' 
                  : 'text-[#888] hover:text-[#ccc] hover:bg-[#2b2b2b]'
              }`}
            >
              <Lightbulb size={14} className="mb-0.5" />
              <span className="text-[10px]">Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Footer Info */}
      <div className="p-2.5 border-t border-[#3c3c3c] bg-[#222222] text-[10px] text-[#777] flex items-center justify-between">
        <span>Beyond-2D Prototype</span>
        <span className="text-emerald-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Ready
        </span>
      </div>
    </aside>
  );
}
