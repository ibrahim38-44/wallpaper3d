import type { Size3 } from '../core/types';

export type FurnitureCategory = 'yatak' | 'oturma' | 'yemek-calisma' | 'mutfak' | 'banyo' | 'yapi' | 'dekor';

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  yapi: 'Kapı & Pencere',
  yatak: 'Yatak Odası',
  oturma: 'Oturma Odası',
  'yemek-calisma': 'Yemek & Çalışma',
  mutfak: 'Mutfak',
  banyo: 'Banyo',
  dekor: 'Dekor',
};

/**
 * placement:
 *  - floor   : zemine konur, serbest sürüklenir
 *  - wall    : zemine konur ama varsayılan yükseklikte duvara yaslanır (üst dolap, duvar TV'si)
 *  - opening : duvara gömülür (kapı/pencere), duvar boyunca kayar
 */
export type Placement = 'floor' | 'wall' | 'opening';

export interface FurnitureDef {
  id: string;
  name: string;
  category: FurnitureCategory;
  placement: Placement;
  /** Prosedürel model anahtarı (src/three/models/registry.tsx) */
  model: string;
  /**
   * İsteğe bağlı gerçek 3D model (glTF/GLB). Tanımlıysa prosedürel model yerine
   * yüklenir ve `size` ölçülerine sığdırılır. Örn: '/models/sofa-oslo.glb'
   */
  modelUrl?: string;
  defaultSize: Size3;
  minSize: Size3;
  maxSize: Size3;
  defaultElevation?: number;
  /** Ana malzeme renk seçenekleri; ilki varsayılan */
  colors: string[];
  /** AI modeline gönderilen kısa İngilizce tanım (tespit doğruluğu için) */
  aiHint: string;
  keywords?: string[];
}

const S = (w: number, d: number, h: number): Size3 => ({ w, d, h });

export const FURNITURE: FurnitureDef[] = [
  // ---- Yapı elemanları
  {
    id: 'door', name: 'İç kapı', category: 'yapi', placement: 'opening', model: 'door',
    defaultSize: S(90, 12, 210), minSize: S(60, 8, 180), maxSize: S(160, 30, 260), defaultElevation: 0,
    colors: ['#f4f1ec', '#8a6a4a', '#3b3b3b', '#c9b08c'], aiHint: 'interior door', keywords: ['kapı'],
  },
  {
    id: 'window', name: 'Pencere', category: 'yapi', placement: 'opening', model: 'window',
    defaultSize: S(120, 12, 140), minSize: S(40, 8, 40), maxSize: S(400, 30, 250), defaultElevation: 90,
    colors: ['#ffffff', '#3b3b3b', '#8a6a4a'], aiHint: 'window', keywords: ['cam'],
  },
  {
    id: 'balcony-door', name: 'Balkon kapısı', category: 'yapi', placement: 'opening', model: 'balconyDoor',
    defaultSize: S(150, 12, 220), minSize: S(70, 8, 190), maxSize: S(400, 30, 260), defaultElevation: 0,
    colors: ['#ffffff', '#3b3b3b'], aiHint: 'glass balcony door / french door', keywords: ['sürgü'],
  },
  // ---- Yatak odası
  {
    id: 'bed-double', name: 'Çift kişilik yatak', category: 'yatak', placement: 'floor', model: 'bed',
    defaultSize: S(170, 215, 105), minSize: S(120, 190, 60), maxSize: S(220, 240, 160),
    colors: ['#b9ada0', '#6d7580', '#e8e1d6', '#4a4f5a', '#7c6a58'], aiHint: 'double bed', keywords: ['yatak'],
  },
  {
    id: 'bed-single', name: 'Tek kişilik yatak', category: 'yatak', placement: 'floor', model: 'bed',
    defaultSize: S(100, 205, 95), minSize: S(80, 180, 60), maxSize: S(130, 220, 140),
    colors: ['#b9ada0', '#6d7580', '#e8e1d6'], aiHint: 'single bed', keywords: ['yatak'],
  },
  {
    id: 'wardrobe', name: 'Gardırop', category: 'yatak', placement: 'floor', model: 'wardrobe',
    defaultSize: S(180, 60, 220), minSize: S(50, 40, 120), maxSize: S(400, 70, 270),
    colors: ['#f2efe9', '#a07c5a', '#595e66', '#d8c6aa'], aiHint: 'wardrobe / closet', keywords: ['dolap'],
  },
  {
    id: 'nightstand', name: 'Komodin', category: 'yatak', placement: 'floor', model: 'nightstand',
    defaultSize: S(50, 40, 50), minSize: S(30, 30, 35), maxSize: S(80, 55, 75),
    colors: ['#a07c5a', '#f2efe9', '#595e66'], aiHint: 'nightstand / bedside table',
  },
  {
    id: 'dresser', name: 'Şifonyer', category: 'yatak', placement: 'floor', model: 'dresser',
    defaultSize: S(120, 48, 85), minSize: S(60, 35, 60), maxSize: S(200, 60, 130),
    colors: ['#a07c5a', '#f2efe9', '#595e66'], aiHint: 'dresser / chest of drawers',
  },
  // ---- Oturma
  {
    id: 'sofa', name: 'Kanepe (3\'lü)', category: 'oturma', placement: 'floor', model: 'sofa',
    defaultSize: S(220, 92, 82), minSize: S(140, 75, 65), maxSize: S(320, 110, 100),
    colors: ['#8c8f94', '#3f4a5a', '#b7a58c', '#6b7b5e', '#a55d4a', '#e3ddd3'], aiHint: 'sofa / couch', keywords: ['koltuk'],
  },
  {
    id: 'sofa-l', name: 'L koltuk', category: 'oturma', placement: 'floor', model: 'sofaL',
    defaultSize: S(280, 180, 82), minSize: S(200, 140, 65), maxSize: S(380, 300, 100),
    colors: ['#8c8f94', '#3f4a5a', '#b7a58c', '#6b7b5e', '#e3ddd3'], aiHint: 'L-shaped sectional sofa', keywords: ['köşe koltuk'],
  },
  {
    id: 'armchair', name: 'Berjer', category: 'oturma', placement: 'floor', model: 'armchair',
    defaultSize: S(80, 82, 85), minSize: S(60, 60, 65), maxSize: S(110, 100, 110),
    colors: ['#b7a58c', '#3f4a5a', '#a55d4a', '#6b7b5e'], aiHint: 'armchair', keywords: ['koltuk'],
  },
  {
    id: 'coffee-table', name: 'Orta sehpa', category: 'oturma', placement: 'floor', model: 'coffeeTable',
    defaultSize: S(110, 60, 42), minSize: S(50, 40, 30), maxSize: S(160, 110, 55),
    colors: ['#a07c5a', '#2e2e2e', '#e9e5de'], aiHint: 'coffee table',
  },
  {
    id: 'tv-unit', name: 'TV ünitesi', category: 'oturma', placement: 'floor', model: 'tvUnit',
    defaultSize: S(180, 42, 50), minSize: S(80, 30, 30), maxSize: S(320, 55, 80),
    colors: ['#a07c5a', '#f2efe9', '#2e2e2e'], aiHint: 'TV stand / media console',
  },
  {
    id: 'tv', name: 'Televizyon (duvar)', category: 'oturma', placement: 'wall', model: 'tv',
    defaultSize: S(145, 6, 84), minSize: S(60, 3, 35), maxSize: S(230, 10, 130), defaultElevation: 95,
    colors: ['#1a1a1a'], aiHint: 'wall-mounted television',
  },
  {
    id: 'bookshelf', name: 'Kitaplık', category: 'oturma', placement: 'floor', model: 'bookshelf',
    defaultSize: S(90, 32, 190), minSize: S(40, 20, 60), maxSize: S(240, 45, 260),
    colors: ['#a07c5a', '#f2efe9', '#2e2e2e'], aiHint: 'bookshelf',
  },
  // ---- Yemek & çalışma
  {
    id: 'dining-table', name: 'Yemek masası', category: 'yemek-calisma', placement: 'floor', model: 'table',
    defaultSize: S(160, 90, 76), minSize: S(70, 60, 70), maxSize: S(300, 120, 80),
    colors: ['#a07c5a', '#e9e5de', '#2e2e2e'], aiHint: 'dining table', keywords: ['masa'],
  },
  {
    id: 'desk', name: 'Çalışma masası', category: 'yemek-calisma', placement: 'floor', model: 'desk',
    defaultSize: S(130, 65, 75), minSize: S(70, 45, 65), maxSize: S(220, 90, 80),
    colors: ['#a07c5a', '#f2efe9', '#2e2e2e'], aiHint: 'desk', keywords: ['masa'],
  },
  {
    id: 'chair', name: 'Sandalye', category: 'yemek-calisma', placement: 'floor', model: 'chair',
    defaultSize: S(46, 52, 85), minSize: S(38, 40, 70), maxSize: S(65, 65, 110),
    colors: ['#a07c5a', '#2e2e2e', '#e9e5de', '#6b7b5e'], aiHint: 'chair',
  },
  // ---- Mutfak
  {
    id: 'kitchen-base', name: 'Mutfak tezgâhı (alt dolap)', category: 'mutfak', placement: 'floor', model: 'kitchenBase',
    defaultSize: S(240, 60, 90), minSize: S(30, 45, 80), maxSize: S(500, 70, 100),
    colors: ['#f2efe9', '#58606b', '#a07c5a', '#7d8b74'], aiHint: 'kitchen base cabinets with countertop', keywords: ['tezgah', 'dolap'],
  },
  {
    id: 'kitchen-sink', name: 'Evyeli tezgâh', category: 'mutfak', placement: 'floor', model: 'kitchenSink',
    defaultSize: S(120, 60, 90), minSize: S(60, 45, 80), maxSize: S(200, 70, 100),
    colors: ['#f2efe9', '#58606b', '#a07c5a', '#7d8b74'], aiHint: 'kitchen sink cabinet', keywords: ['eviye', 'lavabo'],
  },
  {
    id: 'kitchen-wall', name: 'Mutfak üst dolabı', category: 'mutfak', placement: 'wall', model: 'kitchenWall',
    defaultSize: S(240, 35, 72), minSize: S(30, 25, 35), maxSize: S(500, 45, 110), defaultElevation: 145,
    colors: ['#f2efe9', '#58606b', '#a07c5a', '#7d8b74'], aiHint: 'upper wall kitchen cabinets', keywords: ['dolap'],
  },
  {
    id: 'stove', name: 'Ocak / Fırın', category: 'mutfak', placement: 'floor', model: 'stove',
    defaultSize: S(60, 60, 90), minSize: S(45, 50, 80), maxSize: S(120, 70, 100),
    colors: ['#d9d9d9', '#2b2b2b'], aiHint: 'kitchen range / stove with oven',
  },
  {
    id: 'fridge', name: 'Buzdolabı', category: 'mutfak', placement: 'floor', model: 'fridge',
    defaultSize: S(70, 70, 185), minSize: S(50, 55, 80), maxSize: S(120, 80, 210),
    colors: ['#dcdcdc', '#f5f5f5', '#2b2b2b'], aiHint: 'refrigerator',
  },
  // ---- Banyo
  {
    id: 'basin', name: 'Lavabo', category: 'banyo', placement: 'floor', model: 'basin',
    defaultSize: S(65, 46, 85), minSize: S(40, 35, 70), maxSize: S(140, 60, 95),
    colors: ['#f2efe9', '#a07c5a', '#58606b'], aiHint: 'bathroom sink vanity',
  },
  {
    id: 'toilet', name: 'Klozet', category: 'banyo', placement: 'floor', model: 'toilet',
    defaultSize: S(38, 65, 80), minSize: S(34, 50, 70), maxSize: S(45, 75, 90),
    colors: ['#ffffff'], aiHint: 'toilet',
  },
  {
    id: 'bathtub', name: 'Küvet', category: 'banyo', placement: 'floor', model: 'bathtub',
    defaultSize: S(170, 75, 58), minSize: S(120, 65, 45), maxSize: S(200, 100, 65),
    colors: ['#ffffff'], aiHint: 'bathtub',
  },
  // ---- Dekor
  {
    id: 'rug', name: 'Halı', category: 'dekor', placement: 'floor', model: 'rug',
    defaultSize: S(200, 290, 1.5), minSize: S(60, 60, 0.5), maxSize: S(400, 500, 3),
    colors: ['#b9a58f', '#6d7580', '#a55d4a', '#e3ddd3', '#3f4a5a'], aiHint: 'area rug / carpet',
  },
  {
    id: 'plant', name: 'Saksı bitkisi', category: 'dekor', placement: 'floor', model: 'plant',
    defaultSize: S(45, 45, 120), minSize: S(20, 20, 30), maxSize: S(90, 90, 220),
    colors: ['#d8d2c8', '#3b3b3b', '#b0704f'], aiHint: 'potted plant',
  },
  {
    id: 'floor-lamp', name: 'Lambader', category: 'dekor', placement: 'floor', model: 'floorLamp',
    defaultSize: S(40, 40, 160), minSize: S(25, 25, 100), maxSize: S(60, 60, 200),
    colors: ['#efe6d6', '#2e2e2e'], aiHint: 'floor lamp',
  },
];

const byId = new Map(FURNITURE.map((f) => [f.id, f]));

export function getFurniture(id: string): FurnitureDef | undefined {
  return byId.get(id);
}

export function clampSize(def: FurnitureDef, size: Size3): Size3 {
  const c = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  return {
    w: c(size.w, def.minSize.w, def.maxSize.w),
    d: c(size.d, def.minSize.d, def.maxSize.d),
    h: c(size.h, def.minSize.h, def.maxSize.h),
  };
}
