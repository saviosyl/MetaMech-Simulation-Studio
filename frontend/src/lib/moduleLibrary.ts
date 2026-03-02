import { 
  Cog, 
  Package, 
  ArrowRight, 
  Database, 
  RotateCw, 
  GitBranch,
  Columns,
  ArrowUp,
  ArrowRightLeft,
  TrendingUp,
  ArrowUpDown,
  Wrench,
  SquareStack
} from 'lucide-react';

export interface ModuleDefinition {
  id: string;
  name: string;
  category: 'process' | 'environment' | 'actors';
  icon: any;
  description: string;
  assetId?: string; // references AssetDef.id in manifest
  parameters: {
    [key: string]: {
      type: 'number' | 'string' | 'select' | 'boolean' | 'color';
      label: string;
      default: any;
      options?: string[];
      min?: number;
      max?: number;
      step?: number;
    };
  };
}

export const moduleLibrary: ModuleDefinition[] = [
  // Process Modules
  {
    id: 'source',
    name: 'Source',
    category: 'process',
    icon: Package,
    description: 'Generates products at specified intervals',
    parameters: {
      spawnRate: {
        type: 'number',
        label: 'Spawn Rate (items/min)',
        default: 60,
        min: 1,
        max: 600,
        step: 1,
      },
      productType: {
        type: 'select',
        label: 'Product Type',
        default: 'default',
        options: ['default', 'box', 'pallet', 'custom'],
      },
      maxItems: {
        type: 'number',
        label: 'Max Items (0 = unlimited)',
        default: 0,
        min: 0,
        max: 10000,
        step: 1,
      },
    },
  },
  {
    id: 'sink',
    name: 'Sink',
    category: 'process',
    icon: ArrowRight,
    description: 'Collects and removes products from the system',
    parameters: {
      capacity: {
        type: 'number',
        label: 'Capacity',
        default: 1000,
        min: 1,
        max: 10000,
        step: 1,
      },
      showCounter: {
        type: 'boolean',
        label: 'Show Counter',
        default: true,
      },
    },
  },
  {
    id: 'conveyor',
    name: 'Conveyor',
    category: 'process',
    icon: ArrowRight,
    description: 'Transports products along a linear path',
    parameters: {
      length: {
        type: 'number',
        label: 'Length (m)',
        default: 5,
        min: 1,
        max: 20,
        step: 0.5,
      },
      width: {
        type: 'number',
        label: 'Width (m)',
        default: 1,
        min: 0.5,
        max: 3,
        step: 0.1,
      },
      speed: {
        type: 'number',
        label: 'Speed (m/s)',
        default: 1.0,
        min: 0.1,
        max: 5.0,
        step: 0.1,
      },
      beltColor: {
        type: 'color',
        label: 'Belt Color',
        default: '#2d2d2d',
      },
    },
  },
  {
    id: 'belt-conveyor',
    name: 'Belt Conveyor',
    category: 'process',
    icon: ArrowRight,
    description: 'Parametric belt conveyor with adjustable dimensions',
    assetId: 'belt-conveyor',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 600, min: 300, max: 1200, step: 50 },
      length: { type: 'number', label: 'Length (mm)', default: 3000, min: 500, max: 12000, step: 100 },
      height: { type: 'number', label: 'Height (mm)', default: 800, min: 300, max: 3000, step: 50 },
      angle: { type: 'number', label: 'Angle (°)', default: 0, min: 0, max: 35, step: 1 },
      beltSpeed: { type: 'number', label: 'Belt Speed (m/min)', default: 20, min: 1, max: 100, step: 1 },
      sideGuides: { type: 'boolean', label: 'Side Guides', default: true },
      driveEnd: { type: 'select', label: 'Drive End', default: 'right', options: ['left', 'right'] },
      supportSpacing: { type: 'number', label: 'Support Spacing (mm)', default: 1500, min: 500, max: 3000, step: 100 },
    },
  },
  {
    id: 'roller-conveyor',
    name: 'Roller Conveyor',
    category: 'process',
    icon: ArrowRight,
    description: 'Parametric roller conveyor with adjustable pitch',
    assetId: 'roller-conveyor',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 600, min: 300, max: 1200, step: 50 },
      length: { type: 'number', label: 'Length (mm)', default: 3000, min: 500, max: 12000, step: 100 },
      height: { type: 'number', label: 'Height (mm)', default: 800, min: 300, max: 3000, step: 50 },
      rollerPitch: { type: 'number', label: 'Roller Pitch (mm)', default: 100, min: 50, max: 200, step: 10 },
      driven: { type: 'boolean', label: 'Powered Rollers', default: true },
      sideRails: { type: 'boolean', label: 'Side Rails', default: true },
    },
  },
  {
    id: 'buffer',
    name: 'Buffer',
    category: 'process',
    icon: Database,
    description: 'Stores products temporarily, providing accumulation',
    parameters: {
      capacity: {
        type: 'number',
        label: 'Capacity',
        default: 10,
        min: 1,
        max: 100,
        step: 1,
      },
      width: {
        type: 'number',
        label: 'Width (m)',
        default: 2,
        min: 1,
        max: 5,
        step: 0.5,
      },
      length: {
        type: 'number',
        label: 'Length (m)',
        default: 3,
        min: 1,
        max: 10,
        step: 0.5,
      },
    },
  },
  {
    id: 'machine',
    name: 'Machine',
    category: 'process',
    icon: Cog,
    description: 'Processes products with configurable timing',
    parameters: {
      processingTime: {
        type: 'number',
        label: 'Processing Time (s)',
        default: 5.0,
        min: 0.1,
        max: 60.0,
        step: 0.1,
      },
      capacity: {
        type: 'number',
        label: 'Capacity',
        default: 1,
        min: 1,
        max: 10,
        step: 1,
      },
      failureRate: {
        type: 'number',
        label: 'Failure Rate (%)',
        default: 0,
        min: 0,
        max: 50,
        step: 1,
      },
      statusLight: {
        type: 'boolean',
        label: 'Show Status Light',
        default: true,
      },
    },
  },
  {
    id: 'router',
    name: 'Router',
    category: 'process',
    icon: GitBranch,
    description: 'Routes products to different destinations',
    parameters: {
      mode: {
        type: 'select',
        label: 'Routing Mode',
        default: 'round-robin',
        options: ['round-robin', 'priority', 'shortest-queue', 'random'],
      },
      outputs: {
        type: 'number',
        label: 'Number of Outputs',
        default: 2,
        min: 2,
        max: 4,
        step: 1,
      },
    },
  },
  {
    id: 'transfer-bridge',
    name: 'Transfer Bridge',
    category: 'process',
    icon: Columns,
    description: 'Short bridge segment for connecting conveyors',
    parameters: {
      length: {
        type: 'number',
        label: 'Length (m)',
        default: 2,
        min: 0.5,
        max: 5,
        step: 0.5,
      },
      height: {
        type: 'number',
        label: 'Height (m)',
        default: 1,
        min: 0,
        max: 3,
        step: 0.1,
      },
    },
  },
  {
    id: 'popup-transfer',
    name: 'Pop-Up Transfer',
    category: 'process',
    icon: ArrowUp,
    description: 'Conveyor with popup mechanism for product transfer',
    parameters: {
      height: {
        type: 'number',
        label: 'Popup Height (m)',
        default: 0.5,
        min: 0.1,
        max: 2,
        step: 0.1,
      },
      speed: {
        type: 'number',
        label: 'Popup Speed (m/s)',
        default: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
      },
      length: {
        type: 'number',
        label: 'Length (m)',
        default: 3,
        min: 1,
        max: 8,
        step: 0.5,
      },
    },
  },
  {
    id: 'pusher-transfer',
    name: 'Pusher Transfer',
    category: 'process',
    icon: ArrowRightLeft,
    description: 'Conveyor with side pusher for diverting products',
    parameters: {
      force: {
        type: 'number',
        label: 'Push Force',
        default: 1.0,
        min: 0.1,
        max: 5.0,
        step: 0.1,
      },
      angle: {
        type: 'number',
        label: 'Push Angle (degrees)',
        default: 90,
        min: 30,
        max: 180,
        step: 15,
      },
      length: {
        type: 'number',
        label: 'Length (m)',
        default: 3,
        min: 1,
        max: 8,
        step: 0.5,
      },
    },
  },
  {
    id: 'spiral-conveyor',
    name: 'Spiral Conveyor',
    category: 'process',
    icon: TrendingUp,
    description: 'Helical conveyor for vertical transportation',
    parameters: {
      radius: {
        type: 'number',
        label: 'Radius (m)',
        default: 2,
        min: 1,
        max: 5,
        step: 0.5,
      },
      height: {
        type: 'number',
        label: 'Height (m)',
        default: 5,
        min: 2,
        max: 15,
        step: 0.5,
      },
      speed: {
        type: 'number',
        label: 'Speed (m/s)',
        default: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      turns: {
        type: 'number',
        label: 'Number of Turns',
        default: 2,
        min: 1,
        max: 5,
        step: 0.5,
      },
    },
  },
  {
    id: 'vertical-lifter',
    name: 'Vertical Lifter',
    category: 'process',
    icon: ArrowUpDown,
    description: 'Elevator for vertical product movement',
    parameters: {
      height: {
        type: 'number',
        label: 'Lift Height (m)',
        default: 3,
        min: 1,
        max: 10,
        step: 0.5,
      },
      speed: {
        type: 'number',
        label: 'Lift Speed (m/s)',
        default: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
      },
      capacity: {
        type: 'number',
        label: 'Platform Capacity',
        default: 4,
        min: 1,
        max: 20,
        step: 1,
      },
    },
  },
  {
    id: 'pick-and-place',
    name: 'Pick & Place Robot',
    category: 'process',
    icon: Wrench,
    description: 'Robotic arm for picking and placing products',
    parameters: {
      reach: {
        type: 'number',
        label: 'Reach Radius (m)',
        default: 3,
        min: 1,
        max: 6,
        step: 0.5,
      },
      speed: {
        type: 'number',
        label: 'Movement Speed (m/s)',
        default: 1.0,
        min: 0.1,
        max: 3.0,
        step: 0.1,
      },
      gripTime: {
        type: 'number',
        label: 'Grip Time (s)',
        default: 0.5,
        min: 0.1,
        max: 2.0,
        step: 0.1,
      },
      accuracy: {
        type: 'number',
        label: 'Accuracy (%)',
        default: 99,
        min: 80,
        max: 100,
        step: 1,
      },
    },
  },
  {
    id: 'palletizer',
    name: 'Palletizer',
    category: 'process',
    icon: SquareStack,
    description: 'Automated palletizing system for stacking products',
    parameters: {
      palletWidth: {
        type: 'number',
        label: 'Pallet Width (m)',
        default: 1.2,
        min: 0.8,
        max: 2.0,
        step: 0.1,
      },
      palletLength: {
        type: 'number',
        label: 'Pallet Length (m)',
        default: 0.8,
        min: 0.6,
        max: 1.5,
        step: 0.1,
      },
      stackHeight: {
        type: 'number',
        label: 'Max Stack Height (m)',
        default: 1.5,
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
      cycleTime: {
        type: 'number',
        label: 'Cycle Time (s)',
        default: 3.0,
        min: 1.0,
        max: 10.0,
        step: 0.5,
      },
    },
  },

  // Environment Modules
  {
    id: 'wall',
    name: 'Wall',
    category: 'environment',
    icon: Package,
    description: 'Structural wall element',
    assetId: 'wall',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 5000, min: 500, max: 20000, step: 100 },
      height: { type: 'number', label: 'Height (mm)', default: 3000, min: 1000, max: 8000, step: 100 },
      thickness: { type: 'number', label: 'Thickness (mm)', default: 200, min: 100, max: 500, step: 10 },
    },
  },
  {
    id: 'door',
    name: 'Door',
    category: 'environment',
    icon: Package,
    description: 'Door with frame',
    assetId: 'door',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 1200, min: 600, max: 3000, step: 50 },
      height: { type: 'number', label: 'Height (mm)', default: 2400, min: 1800, max: 3000, step: 50 },
      thickness: { type: 'number', label: 'Thickness (mm)', default: 100, min: 50, max: 200, step: 10 },
    },
  },
  {
    id: 'window',
    name: 'Window',
    category: 'environment',
    icon: Package,
    description: 'Window with frame and glass',
    assetId: 'window',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 1500, min: 400, max: 4000, step: 50 },
      height: { type: 'number', label: 'Height (mm)', default: 1200, min: 400, max: 3000, step: 50 },
      thickness: { type: 'number', label: 'Thickness (mm)', default: 100, min: 50, max: 200, step: 10 },
    },
  },
  {
    id: 'stairs',
    name: 'Stairs',
    category: 'environment',
    icon: Package,
    description: 'Staircase with configurable steps',
    assetId: 'stairs',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 1200, min: 600, max: 3000, step: 50 },
      stepCount: { type: 'number', label: 'Steps', default: 12, min: 3, max: 30, step: 1 },
      stepHeight: { type: 'number', label: 'Step Height (mm)', default: 180, min: 150, max: 220, step: 10 },
      stepDepth: { type: 'number', label: 'Step Depth (mm)', default: 280, min: 200, max: 350, step: 10 },
    },
  },
  {
    id: 'pallet-rack',
    name: 'Pallet Rack',
    category: 'environment',
    icon: Package,
    description: 'Industrial pallet racking',
    assetId: 'pallet-rack',
    parameters: {
      bayWidth: { type: 'number', label: 'Bay Width (mm)', default: 2700, min: 1500, max: 4000, step: 100 },
      depth: { type: 'number', label: 'Depth (mm)', default: 1100, min: 800, max: 1500, step: 50 },
      height: { type: 'number', label: 'Height (mm)', default: 5000, min: 2000, max: 12000, step: 100 },
      levels: { type: 'number', label: 'Levels', default: 4, min: 2, max: 8, step: 1 },
    },
  },
  {
    id: 'safety-rail',
    name: 'Safety Rail',
    category: 'environment',
    icon: Package,
    description: 'Safety guardrail',
    assetId: 'safety-rail',
    parameters: {
      width: { type: 'number', label: 'Length (mm)', default: 3000, min: 500, max: 10000, step: 100 },
      height: { type: 'number', label: 'Height (mm)', default: 1100, min: 900, max: 1200, step: 50 },
      thickness: { type: 'number', label: 'Thickness (mm)', default: 60, min: 40, max: 80, step: 10 },
    },
  },
  {
    id: 'warehouse-shell',
    name: 'Warehouse Shell',
    category: 'environment',
    icon: Package,
    description: 'Large warehouse enclosure',
    assetId: 'warehouse-shell',
    parameters: {
      width: { type: 'number', label: 'Width (mm)', default: 20000, min: 5000, max: 50000, step: 500 },
      height: { type: 'number', label: 'Height (mm)', default: 8000, min: 4000, max: 15000, step: 500 },
      thickness: { type: 'number', label: 'Thickness (mm)', default: 300, min: 200, max: 500, step: 50 },
    },
  },

  // Actor Modules
  {
    id: 'operator',
    name: 'Operator',
    category: 'actors',
    icon: Package, // Replace with appropriate icon
    description: 'Human operator worker',
    parameters: {
      walkSpeed: {
        type: 'number',
        label: 'Walk Speed (m/s)',
        default: 1.5,
        min: 0.5,
        max: 3.0,
        step: 0.1,
      },
      color: {
        type: 'color',
        label: 'Uniform Color',
        default: '#4f46e5',
      },
      skillLevel: {
        type: 'select',
        label: 'Skill Level',
        default: 'medium',
        options: ['low', 'medium', 'high', 'expert'],
      },
    },
  },

  {
    id: 'forklift',
    name: 'Forklift',
    category: 'actors',
    icon: Package, // Replace with appropriate icon
    description: 'Industrial forklift vehicle',
    parameters: {
      speed: {
        type: 'number',
        label: 'Travel Speed (m/s)',
        default: 3.0,
        min: 1.0,
        max: 8.0,
        step: 0.5,
      },
      liftHeight: {
        type: 'number',
        label: 'Max Lift Height (m)',
        default: 4,
        min: 2,
        max: 8,
        step: 0.5,
      },
      capacity: {
        type: 'number',
        label: 'Load Capacity (kg)',
        default: 2000,
        min: 500,
        max: 5000,
        step: 100,
      },
      fuelLevel: {
        type: 'number',
        label: 'Fuel Level (%)',
        default: 100,
        min: 0,
        max: 100,
        step: 1,
      },
    },
  },

  {
    id: 'agv',
    name: 'AGV',
    category: 'actors',
    icon: Package, // Replace with appropriate icon
    description: 'Automated Guided Vehicle',
    parameters: {
      speed: {
        type: 'number',
        label: 'Travel Speed (m/s)',
        default: 2.0,
        min: 0.5,
        max: 5.0,
        step: 0.1,
      },
      capacity: {
        type: 'number',
        label: 'Load Capacity (kg)',
        default: 500,
        min: 50,
        max: 2000,
        step: 50,
      },
      batteryLevel: {
        type: 'number',
        label: 'Battery Level (%)',
        default: 100,
        min: 0,
        max: 100,
        step: 1,
      },
      pathFinding: {
        type: 'select',
        label: 'Path Finding',
        default: 'shortest',
        options: ['shortest', 'safest', 'efficient'],
      },
    },
  },
];

export function getModuleDefinition(id: string): ModuleDefinition | undefined {
  return moduleLibrary.find(module => module.id === id);
}

export function getModulesByCategory(category: 'process' | 'environment' | 'actors'): ModuleDefinition[] {
  return moduleLibrary.filter(module => module.category === category);
}