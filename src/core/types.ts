/**
 * Wallpaper3D domain modeli.
 *
 * BİRİM: Tüm uzunluklar SANTİMETRE (cm). 3D sahnede de 1 birim = 1 cm kullanılır;
 * böylece domain ↔ sahne arasında dönüşüm hatası oluşmaz ve duvar kağıdı
 * desenleri (cm ile tanımlı) doğrudan gerçek ölçekte uygulanır.
 *
 * KOORDİNAT SİSTEMİ (plan görünümü, yukarıdan bakış):
 *   x → sağa, z → öne (izleyiciye doğru), y → yukarı.
 *   Dikdörtgen oda köşeleri: (0,0) → (W,0) → (W,L) → (0,L)
 *   Duvar 0: Arka, 1: Sağ, 2: Ön, 3: Sol. Duvarın iç normali (-dir.z, dir.x).
 */

export interface Vec2 {
  x: number;
  z: number;
}

export interface Size3 {
  /** genişlik (yerel x) */
  w: number;
  /** derinlik (yerel z) */
  d: number;
  /** yükseklik (y) */
  h: number;
}

export interface RoomSpec {
  name: string;
  /** Saat yönünde (yukarıdan bakınca) sıralı köşe noktaları. Şimdilik dikdörtgen üretilir. */
  corners: Vec2[];
  height: number;
  wallThickness: number;
}

/** Oda köşelerinden türetilen duvar bilgisi (saklanmaz, hesaplanır). */
export interface WallInfo {
  index: number;
  label: string;
  start: Vec2;
  end: Vec2;
  length: number;
  /** birim yön vektörü (start → end) */
  dir: Vec2;
  /** odanın içine bakan birim normal */
  normal: Vec2;
  /** Y ekseni etrafında dönüş (radyan): yerel +x = dir, yerel +z = normal */
  rotationY: number;
}

/** Zemine yerleşen (veya duvara asılan) serbest nesne. */
export interface FloorItem {
  id: string;
  kind: 'floor';
  catalogId: string;
  name?: string;
  /** ayak izi merkezi (plan) */
  position: Vec2;
  /** tabanın zeminden yüksekliği (üst dolap, duvar TV'si vb.) */
  elevation: number;
  /** derece, Y ekseni etrafında; 0 = ön yüz +z'ye bakar */
  rotation: number;
  size: Size3;
  /** ana malzeme rengi (kumaş, gövde, kapak…) */
  color?: string;
  /** ikincil malzeme rengi (ayak, tezgâh, çerçeve…) – katalogda colorSlots tanımlıysa */
  color2?: string;
  locked?: boolean;
}

/** Duvara gömülü açıklık: kapı, pencere, balkon kapısı. */
export interface OpeningItem {
  id: string;
  kind: 'opening';
  catalogId: string;
  name?: string;
  wallIndex: number;
  /** açıklık merkezinin duvar başlangıcından uzaklığı (cm) */
  offset: number;
  /** açıklık alt kenarının zeminden yüksekliği */
  elevation: number;
  /** w = genişlik, h = yükseklik, d = kasa derinliği */
  size: Size3;
  /** kapı açılış yönünü ters çevir */
  flip?: boolean;
  color?: string;
  color2?: string;
  locked?: boolean;
}

export type SceneItem = FloorItem | OpeningItem;

export interface WallpaperAssignment {
  wallpaperId: string;
  /** desen kaydırma (cm) – yatay/dikey hizalama için */
  offsetU: number;
  offsetV: number;
}

export interface WallFinish {
  paintColor: string;
  wallpaper: WallpaperAssignment | null;
}

export type WallpaperSource =
  | { type: 'procedural'; generator: string; params: Record<string, unknown> }
  | { type: 'image'; url: string };

export interface WallpaperDef {
  id: string;
  name: string;
  collection: string;
  sku?: string;
  /** Firma/marka adı (firma kataloğundan içe aktarılan ürünlerde) */
  brand?: string;
  brandId?: string;
  /** Tek desen karosunun gerçek ölçüsü (cm) – dokunun tekrar ettiği birim. */
  tileWidthCm: number;
  tileHeightCm: number;
  /** Rulo bilgileri – ihtiyaç hesabı için */
  rollWidthCm: number;
  rollLengthCm: number;
  /** Dikey desen tekrarı (rapor); 0 = serbest eşleşme */
  patternRepeatCm: number;
  match: 'straight' | 'offset' | 'free';
  finish: 'matte' | 'satin' | 'textured';
  pricePerRoll?: number;
  currency?: string;
  /** Katalog listesinde renk göstergesi */
  swatch: string;
  source: WallpaperSource;
}

export interface FloorFinish {
  materialId: string;
}

/** Evdeki tek bir oda: kendi ölçüleri, eşyaları, duvar kaplamaları ve zemini vardır. */
export interface RoomDoc {
  id: string;
  /** Oda köşesinin (yerel 0,0) ev planındaki konumu (cm) */
  origin: Vec2;
  room: RoomSpec;
  /** oda-yerel koordinatlarda */
  items: SceneItem[];
  /** duvar indeksine göre */
  walls: WallFinish[];
  floor: FloorFinish;
}

export interface Project {
  schemaVersion: 2;
  id: string;
  name: string;
  /** Evin odaları; her biri ayrı düzenlenir */
  rooms: RoomDoc[];
  /** Düzenlenen (aktif) oda */
  activeRoomId: string;
  /** kullanıcının yüklediği desenler (proje ile birlikte taşınır) */
  customWallpapers: WallpaperDef[];
  createdAt: string;
  updatedAt: string;
}

export type Selection =
  | { type: 'item'; id: string }
  | { type: 'wall'; index: number }
  | null;
