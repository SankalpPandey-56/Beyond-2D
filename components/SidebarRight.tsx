'use client';

import React, { useState } from 'react';
import { 
  BuildingDimensions, 
  RoomData 
} from '@/lib/types';
import { 
  Maximize2, 
  Sliders, 
  Layers, 
  Image as ImageIcon, 
  Eye, 
  EyeOff, 
  Home, 
  Maximize, 
  Minimize,
  Square,
  Ruler
} from 'lucide-react';

interface SidebarRightProps {
  dimensions: BuildingDimensions;
  onDimensionsChange: (dims: BuildingDimensions) => void;
  rooms: RoomData[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  previewUrl: string;
}

export default function SidebarRight({
  dimensions,
  onDimensionsChange,
  rooms,
  selectedRoomId,
  onSelectRoom,
  previewUrl,
}: SidebarRightProps) {
  const [activeTab, setActiveTab] = useState<'inspector' | 'outliner'>('inspector');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);

  const handleDimChange = (key: keyof BuildingDimensions, value: number) => {
    onDimensionsChange({
      ...dimensions,
      [key]: value,
    });
  };

  const totalArea = (dimensions.width * dimensions.length).toFixed(1);
  const totalVolume = (dimensions.width * dimensions.length * dimensions.wallHeight).toFixed(1);

  return (
    <aside className="w-72 bg-[#282828] border-l border-[#3c3c3c] flex flex-col h-full select-none text-xs text-[#cfcfcf]">
      {/* 1. Header Tabs: Inspector vs Outliner (Blender style) */}
      <div className="h-10 border-b border-[#3c3c3c] flex items-center bg-[#232323] px-2 gap-1">
        <button
          onClick={() => setActiveTab('inspector')}
          className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
            activeTab === 'inspector'
              ? 'bg-[#383838] text-white border-b-2 border-[#eb7724]'
              : 'text-[#888] hover:text-[#ccc] hover:bg-[#2b2b2b]'
          }`}
        >
          <Sliders size={13} className={activeTab === 'inspector' ? 'text-[#eb7724]' : ''} />
          <span>Properties</span>
        </button>

        <button
          onClick={() => setActiveTab('outliner')}
          className={`flex-1 py-1.5 px-2 rounded flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
            activeTab === 'outliner'
              ? 'bg-[#383838] text-white border-b-2 border-[#eb7724]'
              : 'text-[#888] hover:text-[#ccc] hover:bg-[#2b2b2b]'
          }`}
        >
          <Layers size={13} className={activeTab === 'outliner' ? 'text-[#eb7724]' : ''} />
          <span>Outliner</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 2. 2D Image Preview Section (Directly from hand-drawn layout: "2D Image Preview") */}
        <div className="bg-[#202020] border border-[#383838] rounded-lg overflow-hidden">
          <div className="p-2 border-b border-[#333] flex items-center justify-between text-[11px] font-semibold text-[#ddd]">
            <span className="flex items-center gap-1.5">
              <ImageIcon size={13} className="text-[#eb7724]" />
              2D Image Preview
            </span>
            <button
              onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
              className="text-[#888] hover:text-white p-0.5 rounded"
              title={isPreviewExpanded ? "Minimize preview" : "Expand preview"}
            >
              <Maximize2 size={12} />
            </button>
          </div>

          <div className="relative p-2 bg-[#181818] flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="2D Architectural Floor Plan"
              className={`w-full object-contain rounded border border-[#333] transition-all ${
                isPreviewExpanded ? 'h-64' : 'h-32'
              }`}
            />
            <div className="absolute bottom-3 right-3 text-[9px] bg-black/70 backdrop-blur px-1.5 py-0.5 rounded font-mono text-[#aaa]">
              Source 2D
            </div>
          </div>
        </div>

        {activeTab === 'inspector' ? (
          /* 3. Real-time Dimensions Inspector (Directly from hand-drawn layout: "Dimensions which on changing realtime") */
          <div className="space-y-4">
            <div className="bg-[#202020] border border-[#383838] rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#ddd] border-b border-[#333] pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Ruler size={13} className="text-[#eb7724]" />
                  Realtime Dimensions
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Live 3D Update</span>
              </div>

              {/* Width Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#aaa]">Width (X)</span>
                  <span className="font-mono text-white bg-[#2e2e2e] px-1.5 py-0.5 rounded text-[10px]">
                    {dimensions.width.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="20.0"
                  step="0.5"
                  value={dimensions.width}
                  onChange={e => handleDimChange('width', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Length Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#aaa]">Length (Z)</span>
                  <span className="font-mono text-white bg-[#2e2e2e] px-1.5 py-0.5 rounded text-[10px]">
                    {dimensions.length.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="4.0"
                  max="20.0"
                  step="0.5"
                  value={dimensions.length}
                  onChange={e => handleDimChange('length', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Wall Height Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#aaa]">Wall Height (Y)</span>
                  <span className="font-mono text-white bg-[#2e2e2e] px-1.5 py-0.5 rounded text-[10px]">
                    {dimensions.wallHeight.toFixed(1)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.1"
                  value={dimensions.wallHeight}
                  onChange={e => handleDimChange('wallHeight', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Wall Thickness Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#aaa]">Wall Thickness</span>
                  <span className="font-mono text-white bg-[#2e2e2e] px-1.5 py-0.5 rounded text-[10px]">
                    {(dimensions.wallThickness * 100).toFixed(0)} cm
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.4"
                  step="0.02"
                  value={dimensions.wallThickness}
                  onChange={e => handleDimChange('wallThickness', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#333] rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Calculated Metrics */}
            <div className="grid grid-cols-2 gap-2 bg-[#202020] p-2.5 rounded-lg border border-[#383838] text-[11px]">
              <div>
                <div className="text-[#888] text-[10px]">Total Floor Area</div>
                <div className="font-mono text-white font-bold">{totalArea} m&sup2;</div>
              </div>
              <div>
                <div className="text-[#888] text-[10px]">Building Volume</div>
                <div className="font-mono text-white font-bold">{totalVolume} m&sup3;</div>
              </div>
            </div>

            {/* Selected Room Details */}
            {selectedRoomId ? (
              <div className="bg-[#202020] border border-[#eb7724] rounded-lg p-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white mb-2">
                  <span>Selected Room</span>
                  <button
                    onClick={() => onSelectRoom(null)}
                    className="text-[#888] hover:text-white text-[10px]"
                  >
                    Deselect
                  </button>
                </div>
                {(() => {
                  const r = rooms.find(item => item.id === selectedRoomId);
                  if (!r) return null;
                  const roomActualW = (r.relW * dimensions.width).toFixed(1);
                  const roomActualD = (r.relD * dimensions.length).toFixed(1);
                  const roomArea = (parseFloat(roomActualW) * parseFloat(roomActualD)).toFixed(1);

                  return (
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                        <span className="font-medium text-white">{r.name}</span>
                        <span className="text-[10px] text-[#888] uppercase font-mono ml-auto">{r.type}</span>
                      </div>
                      <div className="text-[#aaa] text-[10px]">Dimensions: {roomActualW}m &times; {roomActualD}m</div>
                      <div className="text-[#aaa] text-[10px]">Usable Area: {roomArea} m&sup2;</div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center p-3 text-[10px] text-[#777] border border-dashed border-[#383838] rounded-lg">
                Click any room in the 3D viewport or Outliner to inspect its specific properties.
              </div>
            )}
          </div>
        ) : (
          /* 4. Blender-style Scene Outliner (Hierarchy of Building, Rooms, Walls) */
          <div className="bg-[#202020] border border-[#383838] rounded-lg p-2 space-y-1">
            <div className="text-[10px] uppercase font-mono text-[#808080] tracking-wider px-1 pb-1 border-b border-[#333] mb-1">
              Scene Collection
            </div>

            {/* Building Root */}
            <div className="flex items-center gap-1.5 p-1 text-white font-medium">
              <Home size={13} className="text-[#eb7724]" />
              <span>Building Root</span>
            </div>

            {/* Rooms list */}
            <div className="pl-4 space-y-0.5 border-l border-[#3a3a3a] ml-2">
              {rooms.map(room => {
                const isSelected = room.id === selectedRoomId;
                return (
                  <div
                    key={room.id}
                    onClick={() => onSelectRoom(isSelected ? null : room.id)}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#4772b3] text-white font-medium'
                        : 'hover:bg-[#2e2e2e] text-[#ccc]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: room.color }} />
                      <span className="truncate">{room.name}</span>
                    </div>
                    <Eye size={11} className={isSelected ? 'text-white' : 'text-[#777]'} />
                  </div>
                );
              })}

              {/* Walls Group */}
              <div className="flex items-center justify-between px-2 py-1 text-[#aaa] hover:bg-[#2e2e2e] rounded">
                <div className="flex items-center gap-2">
                  <Square size={10} className="text-[#999]" />
                  <span>Exterior & Partition Walls</span>
                </div>
                <Eye size={11} className="text-[#777]" />
              </div>

              {/* Foundation Slab */}
              <div className="flex items-center justify-between px-2 py-1 text-[#aaa] hover:bg-[#2e2e2e] rounded">
                <div className="flex items-center gap-2">
                  <Square size={10} className="text-[#999]" />
                  <span>Base Foundation Slab</span>
                </div>
                <Eye size={11} className="text-[#777]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer */}
      <div className="p-2 border-t border-[#3c3c3c] bg-[#222222] text-[10px] text-[#777] flex items-center justify-between">
        <span>Coordinate System: Z-Up</span>
        <span className="font-mono">Metric</span>
      </div>
    </aside>
  );
}
