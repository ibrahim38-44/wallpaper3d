import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const Icon = {
  Undo: (p: P) => <Svg {...p}><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></Svg>,
  Redo: (p: P) => <Svg {...p}><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></Svg>,
  Cube: (p: P) => <Svg {...p}><path d="m12 2 9 5v10l-9 5-9-5V7z" /><path d="m3 7 9 5 9-5M12 12v10" /></Svg>,
  Top: (p: P) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="1" /><path d="M3 9h18M9 21V9" /></Svg>,
  Wall: (p: P) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 10h18M3 15h18M9 4v6M15 10v5M9 15v5" /></Svg>,
  Camera: (p: P) => <Svg {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Svg>,
  Menu: (p: P) => <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>,
  Plus: (p: P) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>,
  Trash: (p: P) => <Svg {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>,
  Copy: (p: P) => <Svg {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></Svg>,
  Rotate: (p: P) => <Svg {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></Svg>,
  Lock: (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Svg>,
  Unlock: (p: P) => <Svg {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-2" /></Svg>,
  Sofa: (p: P) => <Svg {...p}><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M3 11h4v4h10v-4h4v6H3z" /><path d="M5 17v2M19 17v2" /></Svg>,
  Paint: (p: P) => <Svg {...p}><rect x="3" y="3" width="14" height="6" rx="1" /><path d="M17 6h3v5h-8v3" /><rect x="10" y="14" width="4" height="7" rx="1" /></Svg>,
  Sparkle: (p: P) => <Svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></Svg>,
  Sliders: (p: P) => <Svg {...p}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></Svg>,
  Close: (p: P) => <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>,
  Upload: (p: P) => <Svg {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></Svg>,
  Download: (p: P) => <Svg {...p}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 16v4h16v-4" /></Svg>,
  Folder: (p: P) => <Svg {...p}><path d="M3 6h6l2 2h10v11H3z" /></Svg>,
  Ruler: (p: P) => <Svg {...p}><path d="m3 17 14-14 4 4L7 21z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></Svg>,
  Magnet: (p: P) => <Svg {...p}><path d="M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3z" /><path d="M6 7h4M14 7h4" /></Svg>,
  Flip: (p: P) => <Svg {...p}><path d="M12 3v18" /><path d="m8 7-4 5 4 5V7zM16 7l4 5-4 5V7z" /></Svg>,
  Search: (p: P) => <Svg {...p}><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></Svg>,
  Check: (p: P) => <Svg {...p}><path d="m5 12 5 5 9-10" /></Svg>,
  Home: (p: P) => <Svg {...p}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Svg>,
  Focus: (p: P) => <Svg {...p}><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /><circle cx="12" cy="12" r="2.5" /></Svg>,
};

/** Kütüphane kartları için basit üstten görünüş ikonları (model anahtarına göre). */
export function FurnitureGlyph({ model, size = 34 }: { model: string; size?: number }) {
  const g: Record<string, ReactNode> = {
    bed: <><rect x="4" y="3" width="16" height="18" rx="1.5" /><rect x="4" y="3" width="16" height="3" /><rect x="6" y="7" width="5" height="3" rx="1" /><rect x="13" y="7" width="5" height="3" rx="1" /><path d="M4 12h16" /></>,
    wardrobe: <><rect x="3" y="8" width="18" height="8" rx="1" /><path d="M9 8v8M15 8v8" /><path d="M3 16h18" /></>,
    nightstand: <><rect x="6" y="6" width="12" height="12" rx="1" /><path d="M6 12h12" /><circle cx="12" cy="9" r=".6" /></>,
    dresser: <><rect x="3" y="7" width="18" height="10" rx="1" /><path d="M12 7v10M3 12h18" /></>,
    sofa: <><rect x="3" y="7" width="18" height="10" rx="2" /><path d="M3 10h18M6 10v7M18 10v7M12 10v7" /></>,
    sofaL: <><path d="M3 4h18v7H10v9H3z" /><path d="M6 7h15M6 7v13" /></>,
    armchair: <><rect x="5" y="5" width="14" height="14" rx="2.5" /><path d="M5 9h14M8 9v10M16 9v10" /></>,
    coffeeTable: <><rect x="4" y="7" width="16" height="10" rx="1.5" /></>,
    tvUnit: <><rect x="3" y="9" width="18" height="6" rx="1" /><path d="M9 9v6M15 9v6" /></>,
    tv: <><rect x="3" y="5" width="18" height="11" rx="1" /><path d="M9 20h6M12 16v4" /></>,
    bookshelf: <><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M4 9h16M4 15h16M7 3v6M10 9v6M14 15v6" /></>,
    table: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><circle cx="7" cy="4" r="1" /><circle cx="17" cy="4" r="1" /><circle cx="7" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></>,
    desk: <><rect x="3" y="7" width="18" height="10" rx="1" /><rect x="14" y="7" width="7" height="10" /><circle cx="12" cy="20" r="1.5" /></>,
    chair: <><rect x="6" y="7" width="12" height="11" rx="1.5" /><path d="M6 7h12V5H6z" /></>,
    chairUph: <><rect x="6" y="8" width="12" height="11" rx="3" /><path d="M7 8c0-2 2-3 5-3s5 1 5 3" /></>,
    officeChair: <><circle cx="12" cy="13" r="7" /><rect x="8" y="9" width="8" height="8" rx="2" /><path d="M7 7h10" /></>,
    barStool: <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="3.5" /></>,
    pouf: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="5.5" strokeDasharray="1.5 1.5" /></>,
    kitchenBase: <><rect x="3" y="8" width="18" height="8" /><path d="M9 8v8M15 8v8M3 10h18" /></>,
    kitchenSink: <><rect x="3" y="7" width="18" height="10" /><rect x="7" y="9" width="10" height="6" rx="1.5" /><circle cx="12" cy="8" r=".8" /></>,
    kitchenWall: <><rect x="3" y="5" width="18" height="9" /><path d="M9 5v9M15 5v9M6 12h1M12 12h1M18 12h1" /></>,
    stove: <><rect x="5" y="5" width="14" height="14" rx="1" /><circle cx="9" cy="9" r="2" /><circle cx="15" cy="9" r="2" /><circle cx="9" cy="15" r="2" /><circle cx="15" cy="15" r="2" /></>,
    fridge: <><rect x="6" y="3" width="12" height="18" rx="1.5" /><path d="M6 10h12M9 5v3M9 12v4" /></>,
    basin: <><rect x="4" y="6" width="16" height="12" rx="2" /><ellipse cx="12" cy="12.5" rx="5" ry="3.5" /><circle cx="12" cy="7.8" r=".8" /></>,
    toilet: <><rect x="7" y="3" width="10" height="5" rx="1" /><ellipse cx="12" cy="14" rx="5" ry="6.5" /></>,
    bathtub: <><rect x="3" y="6" width="18" height="12" rx="3" /><rect x="5.5" y="8.5" width="13" height="7" rx="2.5" /></>,
    rug: <><rect x="4" y="4" width="16" height="16" rx="1" /><rect x="7" y="7" width="10" height="10" /></>,
    plant: <><circle cx="12" cy="12" r="4" /><path d="M12 8c0-4 4-5 4-5s1 5-4 5zM8 12c-4 0-5-4-5-4s5-1 5 4zM16 12c4 0 5 4 5 4s-5 1-5-4zM12 16c0 4-4 5-4 5s-1-5 4-5z" /></>,
    floorLamp: <><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="1.5" /></>,
    door: <><path d="M3 18h4M17 18h4" /><path d="M7 18V6a12 12 0 0 1 10 12" strokeDasharray="2 2" /><path d="M7 18V6" /></>,
    window: <><path d="M3 12h18" /><rect x="5" y="10" width="14" height="4" /><path d="M12 10v4" /></>,
    balconyDoor: <><path d="M3 12h18" /><rect x="4" y="10" width="16" height="4" /><path d="M8 8h8M12 10v4" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {g[model] ?? <rect x="4" y="4" width="16" height="16" rx="2" />}
    </svg>
  );
}
