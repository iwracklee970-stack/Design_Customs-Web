export enum ApparelType {
  T_SHIRT = 'T_SHIRT',
  HOODIE = 'HOODIE',
  LONG_SLEEVE = 'LONG_SLEEVE',
  SWEATER = 'SWEATER',
  TANK_TOP = 'TANK_TOP'
}

export enum ViewSide {
  FRONT = 'FRONT',
  BACK = 'BACK'
}

export enum PatternType {
  NONE = 'NONE',
  STRIPES = 'STRIPES',
  GRID = 'GRID',
  DOTS = 'DOTS',
  TEXTURE = 'TEXTURE',
  ZIGZAG = 'ZIGZAG',
  CROSSHATCH = 'CROSSHATCH'
}

export enum FilterType {
  ORIGINAL = 'ORIGINAL',
  MONOCHROME = 'MONOCHROME',
  DUOTONE = 'DUOTONE'
}

export interface PatternSettings {
  id: string;
  type: PatternType;
  scale: number; // 5 to 200
  rotation: number; // 0 to 360
  opacity: number; // 0 to 1
  color: string; // Hex color for the pattern elements
}

export interface VectorOverlay {
  id: string;
  type: 'star' | 'badge' | 'stitch_collar' | 'stitch_sleeve' | 'stitch_hem' | 'text' | 'lightning' | 'cross' | 'heart' | 'rectangle' | 'circle' | 'triangle';
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotation: number;
  color: string;
  textContent?: string;
  viewSide: ViewSide;
}

export interface ImageOverlay {
  id: string;
  url: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  rotation: number;
  opacity: number;
  tintColor: string; // Hex color
  filterType: FilterType;
  aspectRatio: number;
  viewSide: ViewSide;
}

export interface CanvasState {
  apparelType: ApparelType;
  viewSide: ViewSide;
  baseColor: string;
  patterns: PatternSettings[];
  vectors: VectorOverlay[];
  images: ImageOverlay[];
  selectedElementId: string | null; // ID of the graphic, image, or pattern currently selected
  selectedElementType: 'vector' | 'image' | 'pattern' | null;
}

export type PrintQuality = 'standard' | 'premium' | 'ultra';
export type FabricType = 'cotton' | 'polyester' | 'organic' | 'triblend';
export type ApparelSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface CartItem {
  id: string;
  apparelType: ApparelType;
  baseColor: string;
  patternCount: number;
  vectorCount: number;
  printQuality: PrintQuality;
  fabricType: FabricType;
  size: ApparelSize;
  quantity: number;
  unitPrice: number;
  previewSnapshot: string; // hex color or data URI
}
