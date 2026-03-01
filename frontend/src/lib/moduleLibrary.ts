import { 
  Cog, 
  Package, 
  ArrowRight, 
  Database, 
  RotateCw, 
  GitBranch,
  Bridge,
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
    icon: Bridge,
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

  // Environment Modules - will be added in the same pattern
  // For brevity, I'll add just a few key ones here
  {
    id: 'wall',
    name: 'Wall',
    category: 'environment',
    icon: Package, // Replace with appropriate icon
    description: 'Structural wall element',
    parameters: {
      width: {
        type: 'number',
        label: 'Width (m)',
        default: 5,
        min: 1,
        max: 20,
        step: 0.5,
      },
      height: {
        type: 'number',
        label: 'Height (m)',
        default: 3,
        min: 1,
        max: 8,
        step: 0.5,
      },
      thickness: {
        type: 'number',
        label: 'Thickness (m)',
        default: 0.2,
        min: 0.1,
        max: 0.5,
        step: 0.05,
      },
      color: {
        type: 'color',
        label: 'Color',
        default: '#f5f5f5',
      },
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