export interface User {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  subscription: SubscriptionInfo;
}

export interface SubscriptionInfo {
  status: 'pending_verification' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
  entitled: boolean;
  requiresEmailVerification?: boolean;
  planCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface RegisterResult {
  message: string;
  requiresEmailVerification: boolean;
  email: string;
  devVerificationLink?: string;
}

export interface Project {
  id: number;
  name: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
}

export type AssetStatus = 'draft' | 'published' | 'archived';
export type SceneCategory =
  | 'process'
  | 'modular'
  | 'environment'
  | 'actors'
  | 'robots'
  | 'pallets'
  | 'fmcg'
  | 'medical';

export interface AssetCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  sceneCategory: SceneCategory;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDefinitionNode {
  id: string;
  label?: string;
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  direction?: [number, number, number];
  compatibility?: Record<string, unknown>;
}

export interface AssetMovingPart {
  objectName: string;
  motionType: 'translate' | 'rotate';
  axis: 'x' | 'y' | 'z';
  min: number;
  max: number;
  default: number;
  speed: number;
}

export interface ParametricParameterValues {
  [key: string]: number | string | boolean;
}

export type ParametricTemplateId = 'basic-belt-conveyor-v1';

export interface ParametricTemplateParameterDef {
  type: 'number' | 'string' | 'text' | 'select' | 'boolean' | 'color';
  label: string;
  default: number | string | boolean;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export type BehaviorTemplateType =
  | 'none'
  | 'straight-conveyor'
  | 'lift-conveyor'
  | 'rotary-transfer'
  | 'angle-transfer'
  | 'robot-pick-place';

export interface AssetMetadata {
  nodes?: AssetDefinitionNode[];
  movableParts?: AssetMovingPart[];
  transportPath?: {
    mode: 'node-link' | 'straight-node' | 'polyline';
    sourceNodeId?: string;
    targetNodeId?: string;
    points: [number, number, number][];
  };
  parameters?: Record<string, number | string | boolean>;
  sourceUnit?: 'mm' | 'cm' | 'm' | 'unknown';
  scaleCorrection?: number;
  nativeBounds?: {
    width: number;
    depth: number;
    height: number;
    min: [number, number, number];
    max: [number, number, number];
  };
  normalizedBoundsMm?: {
    width: number;
    depth: number;
    height: number;
  };
  pivotOffset?: [number, number, number];
  templateId?: ParametricTemplateId;
  parameterValues?: ParametricParameterValues;
  templateParameters?: Record<string, ParametricTemplateParameterDef>;
  behaviorTemplate?: BehaviorTemplateType;
  behaviorConfig?: Record<string, unknown>;
  runtimeControls?: {
    showSpeedSlider?: boolean;
    showTargetHeight?: boolean;
    showAutoManual?: boolean;
    showHomeCommand?: boolean;
    showEnableToggle?: boolean;
    showSensorState?: boolean;
    showStopperState?: boolean;
  };
  [key: string]: unknown;
}

export interface LibraryAsset {
  id: string;
  dbId: number;
  name: string;
  slug: string;
  assetType?: 'static' | 'parametric';
  templateId?: ParametricTemplateId | null;
  parameterValues?: ParametricParameterValues;
  status: AssetStatus;
  lifecycleState?: 'draft' | 'internal' | 'live' | 'archived' | 'deleted';
  visibleInRuntimeLibrary?: boolean;
  version: number;
  sortOrder: number;
  categoryId: number;
  categoryName: string | null;
  categorySlug: string | null;
  sceneCategory: SceneCategory;
  modelKey: string;
  modelUrl: string;
  thumbnailKey: string | null;
  thumbnailUrl: string | null;
  previewKey: string | null;
  previewUrl: string | null;
  description: string;
  tags: string[];
  metadata: AssetMetadata;
  publishedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}