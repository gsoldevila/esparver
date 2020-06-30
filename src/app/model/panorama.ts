export interface Panorama {
  id: string;
  media?: string;
  postalCode?: string;
  slug?: string;
  name: string;
  label?: string;
  index?: boolean;
  timestamp: number;
  latitude: number;
  longitude: number;
  distance?: number;
  faceSize?: number;
  initialViewParameters: PitchYawFov;
  hotspots?: Hotspot[];
  levels?: Level[];
}

export enum PanoramaType {
  HOUSE = 'HOUSE',
  RESTAURANT = 'RESTAURANT',
  SCENERY = 'SCENERY',
}

export const PANORAMA_ICONS = {
  'HOUSE': 'house',
  'RESTAURANT': 'restaurant',
  'SCENERY': 'wallpaper',
}

export interface Level {
  tileSize: number;
  size: number;
  fallbackOnly?: boolean;
}

export interface PitchYawFov {
  pitch: number;
  yaw: number;
  fov: number;
}

export interface Hotspot {
  type: HotspotType;
  position: HotspotPosition;
  data: any;
}

export enum HotspotType {
  PANORAMA = 'PANORAMA',
}

export interface HotspotPosition {
  yaw: number;
  pitch: number;
  rotation?: number;
}

export const LEVELS = [];
LEVELS[4096] = [
  { tileSize: 256, size: 256, fallbackOnly: true },
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
  { tileSize: 512, size: 4096 }
];

LEVELS[8192] = [
  { tileSize: 256, size: 256, fallbackOnly: true },
  { tileSize: 512, size: 512 },
  { tileSize: 512, size: 1024 },
  { tileSize: 512, size: 2048 },
  { tileSize: 512, size: 4096 },
  { tileSize: 512, size: 8192 }
];
