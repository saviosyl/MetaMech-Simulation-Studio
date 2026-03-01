import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as THREE from 'three';

// Types
export interface ProcessNode {
  id: string;
  type: 'source' | 'sink' | 'conveyor' | 'buffer' | 'machine' | 'router' | 
        'transfer-bridge' | 'popup-transfer' | 'pusher-transfer' | 
        'spiral-conveyor' | 'vertical-lifter' | 'pick-and-place' | 'palletizer';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
}

export interface EnvironmentAsset {
  id: string;
  type: 'wall' | 'door' | 'window' | 'stairs' | 'safety-rail' | 
        'floor-marking' | 'pallet-rack' | 'warehouse-shell' | 'floor';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
}

export interface Actor {
  id: string;
  type: 'operator' | 'engineer' | 'forklift' | 'agv';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
}

export interface ProcessEdge {
  id: string;
  from: string;
  to: string;
  parameters: Record<string, any>;
}

export interface Underlay {
  id: string;
  url: string;
  opacity: number;
  visible: boolean;
  locked: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneSettings {
  environment: 'factory' | 'studio-white' | 'dark-showroom' | 'transparent';
  lighting: {
    intensity: number;
    shadows: boolean;
  };
  grid: {
    visible: boolean;
    size: number;
    divisions: number;
  };
  axes: {
    visible: boolean;
    size: number;
  };
}

export interface CustomProduct {
  id: string;
  name: string;
  model?: string;
  color: string;
  dimensions: [number, number, number];
}

interface EditorState {
  // Scene objects
  processNodes: ProcessNode[];
  environmentAssets: EnvironmentAsset[];
  actors: Actor[];
  edges: ProcessEdge[];
  underlay: Underlay | null;
  customProducts: CustomProduct[];
  
  // Scene settings
  sceneSettings: SceneSettings;
  
  // Selection and tools
  selectedObjectId: string | null;
  selectedObjectType: 'process' | 'environment' | 'actor' | null;
  transformMode: 'translate' | 'rotate' | 'scale';
  
  // Simulation state
  isPlaying: boolean;
  simulationSpeed: number;
  
  // UI state
  activeLibraryTab: 'process' | 'environment' | 'actors';
  showPropertiesPanel: boolean;
  
  // Actions
  addProcessNode: (type: ProcessNode['type'], position: [number, number, number]) => void;
  addEnvironmentAsset: (type: EnvironmentAsset['type'], position: [number, number, number]) => void;
  addActor: (type: Actor['type'], position: [number, number, number]) => void;
  
  updateObject: (id: string, type: 'process' | 'environment' | 'actor', updates: Partial<ProcessNode | EnvironmentAsset | Actor>) => void;
  removeObject: (id: string, type: 'process' | 'environment' | 'actor') => void;
  
  setSelectedObject: (id: string | null, type: 'process' | 'environment' | 'actor' | null) => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  
  setSceneSettings: (settings: Partial<SceneSettings>) => void;
  setActiveLibraryTab: (tab: 'process' | 'environment' | 'actors') => void;
  
  // Simulation controls
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSimulationSpeed: (speed: number) => void;
  
  // Scene management
  clearScene: () => void;
  loadScene: (data: any) => void;
  getSceneData: () => any;
}

const defaultSceneSettings: SceneSettings = {
  environment: 'factory',
  lighting: {
    intensity: 1.0,
    shadows: true,
  },
  grid: {
    visible: true,
    size: 50,
    divisions: 50,
  },
  axes: {
    visible: true,
    size: 5,
  },
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  processNodes: [],
  environmentAssets: [],
  actors: [],
  edges: [],
  underlay: null,
  customProducts: [],
  
  sceneSettings: defaultSceneSettings,
  
  selectedObjectId: null,
  selectedObjectType: null,
  transformMode: 'translate',
  
  isPlaying: false,
  simulationSpeed: 1.0,
  
  activeLibraryTab: 'process',
  showPropertiesPanel: true,
  
  // Actions
  addProcessNode: (type, position) => {
    const newNode: ProcessNode = {
      id: uuidv4(),
      type,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: getDefaultParameters(type),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
    };
    
    set(state => ({
      processNodes: [...state.processNodes, newNode],
      selectedObjectId: newNode.id,
      selectedObjectType: 'process',
    }));
  },
  
  addEnvironmentAsset: (type, position) => {
    const newAsset: EnvironmentAsset = {
      id: uuidv4(),
      type,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: getDefaultParameters(type),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
    };
    
    set(state => ({
      environmentAssets: [...state.environmentAssets, newAsset],
      selectedObjectId: newAsset.id,
      selectedObjectType: 'environment',
    }));
  },
  
  addActor: (type, position) => {
    const newActor: Actor = {
      id: uuidv4(),
      type,
      position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: getDefaultParameters(type),
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
    };
    
    set(state => ({
      actors: [...state.actors, newActor],
      selectedObjectId: newActor.id,
      selectedObjectType: 'actor',
    }));
  },
  
  updateObject: (id, type, updates) => {
    set(state => {
      if (type === 'process') {
        return {
          processNodes: state.processNodes.map(node =>
            node.id === id ? { ...node, ...updates } : node
          ),
        };
      } else if (type === 'environment') {
        return {
          environmentAssets: state.environmentAssets.map(asset =>
            asset.id === id ? { ...asset, ...updates } : asset
          ),
        };
      } else if (type === 'actor') {
        return {
          actors: state.actors.map(actor =>
            actor.id === id ? { ...actor, ...updates } : actor
          ),
        };
      }
      return state;
    });
  },
  
  removeObject: (id, type) => {
    set(state => {
      const newState: Partial<EditorState> = {
        selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
        selectedObjectType: state.selectedObjectId === id ? null : state.selectedObjectType,
      };
      
      if (type === 'process') {
        newState.processNodes = state.processNodes.filter(node => node.id !== id);
      } else if (type === 'environment') {
        newState.environmentAssets = state.environmentAssets.filter(asset => asset.id !== id);
      } else if (type === 'actor') {
        newState.actors = state.actors.filter(actor => actor.id !== id);
      }
      
      return { ...state, ...newState };
    });
  },
  
  setSelectedObject: (id, type) => {
    set({ selectedObjectId: id, selectedObjectType: type });
  },
  
  setTransformMode: (mode) => {
    set({ transformMode: mode });
  },
  
  setSceneSettings: (settings) => {
    set(state => ({
      sceneSettings: { ...state.sceneSettings, ...settings },
    }));
  },
  
  setActiveLibraryTab: (tab) => {
    set({ activeLibraryTab: tab });
  },
  
  play: () => {
    set({ isPlaying: true });
  },
  
  pause: () => {
    set({ isPlaying: false });
  },
  
  reset: () => {
    set({ isPlaying: false });
  },
  
  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed });
  },
  
  clearScene: () => {
    set({
      processNodes: [],
      environmentAssets: [],
      actors: [],
      edges: [],
      underlay: null,
      selectedObjectId: null,
      selectedObjectType: null,
      isPlaying: false,
    });
  },
  
  loadScene: (data) => {
    set({
      processNodes: data.processNodes || [],
      environmentAssets: data.environmentAssets || [],
      actors: data.actors || [],
      edges: data.edges || [],
      underlay: data.underlay || null,
      sceneSettings: { ...defaultSceneSettings, ...(data.sceneSettings || {}) },
      customProducts: data.customProducts || [],
      selectedObjectId: null,
      selectedObjectType: null,
      isPlaying: false,
    });
  },
  
  getSceneData: () => {
    const state = get();
    return {
      processNodes: state.processNodes,
      environmentAssets: state.environmentAssets,
      actors: state.actors,
      edges: state.edges,
      underlay: state.underlay,
      sceneSettings: state.sceneSettings,
      customProducts: state.customProducts,
    };
  },
}));

// Helper function to get default parameters for different object types
function getDefaultParameters(type: string): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    // Process nodes
    source: { spawnRate: 1.0, productType: 'default' },
    sink: { capacity: 100 },
    conveyor: { length: 5, width: 1, speed: 1.0 },
    buffer: { capacity: 10 },
    machine: { processingTime: 2.0, capacity: 1 },
    router: { mode: 'round-robin' },
    'transfer-bridge': { length: 2 },
    'popup-transfer': { height: 0.5, speed: 1.0 },
    'pusher-transfer': { force: 1.0, angle: 90 },
    'spiral-conveyor': { radius: 2, height: 5, speed: 0.5 },
    'vertical-lifter': { height: 3, speed: 1.0 },
    'pick-and-place': { reach: 3, speed: 1.0 },
    palletizer: { palletSize: [1.2, 0.8], stackHeight: 1.5 },
    
    // Environment
    wall: { width: 5, height: 3, thickness: 0.2 },
    door: { width: 2, height: 2.5, thickness: 0.1 },
    window: { width: 2, height: 1.5, thickness: 0.1 },
    stairs: { width: 2, steps: 10, stepHeight: 0.2 },
    'safety-rail': { length: 5, height: 1.2 },
    'floor-marking': { length: 5, width: 0.2, color: 'yellow' },
    'pallet-rack': { width: 3, height: 4, depth: 1.2, levels: 4 },
    'warehouse-shell': { width: 20, height: 8, depth: 15 },
    floor: { width: 50, depth: 50, color: '#f0f0f0' },
    
    // Actors
    operator: { walkSpeed: 1.5, color: '#4f46e5' },
    engineer: { walkSpeed: 1.2, color: '#059669' },
    forklift: { speed: 3.0, liftHeight: 4, capacity: 2000 },
    agv: { speed: 2.0, capacity: 500, batteryLevel: 100 },
  };
  
  return defaults[type] || {};
}