# Wallpaper3D – Mimari

## Hedef
Duvar kağıdı satışında müşteriye, kendi odasının gerçek ölçülerinde ve perspektife uygun bir önizleme sunmak.
Oda editörü → gerçekçi mobilya → duvar kağıdı kaplama → AI destekli fotoğraf/video analizi sırasıyla modüler geliştirildi.

## Teknoloji
| Katman | Seçim | Neden |
|---|---|---|
| UI | React 19 + TypeScript | Bileşen tabanlı, geniş ekosistem |
| 3D | three.js + @react-three/fiber + drei | Bildirimsel sahne, React state ile doğal senkron |
| Durum | Zustand | Küçük, hızlı; Canvas içi/dışı aynı store |
| Derleme | Vite | Hızlı geliştirme, tek dosyalık demo derlemesi |
| Sunucu | Bağımlılıksız Node.js | AI anahtarını gizler, statik dosya sunar |
| AI | Claude (vision) + tool-use yapılandırılmış çıktı | Görselden eşya/konum; şemaya uygun JSON |

## Katmanlar ve bağımlılık yönü
```
ui/  ──►  store/  ──►  core/   (saf TypeScript, DOM/three yok, birim testli)
 │          ▲          ▲
 ▼          │          │
three/ ─────┘   catalog/ (mobilya, duvar kağıdı, zemin tanımları + desen üreticileri)
ai/  ─► core/, catalog/        server/ ◄── HTTP ── ai/provider.ts
```
- **core/** – domain tipleri, geometri (duvar, ayak izi, sınırlama, yapışma, ışın testleri), rulo hesabı, proje (de)serileştirme. Tamamen test edilebilir.
- **store/** – `editorStore` (proje, seçim, geri al/yinele, eylemler), `catalogStore` (duvar kağıdı kataloğu), `persistence` (otomatik kayıt, içe/dışa aktarma).
- **catalog/** – veri. Yeni mobilya = `furniture.ts`e kayıt + `three/models/registry.tsx`e model. Yeni desen = `wallpapers.ts` (veya uzak katalog JSON'u).
- **three/** – sahne. `Room3D` (zemin, duvarlar, eşyalar), `Wall3D` (açıklıklı duvar + kaplama), `Item3D` (sürükle/döndür/seç), `models/` (parametrik modeller), `textures`/`materials` (önbellekli PBR).
- **ui/** – paneller; three.js'e doğrudan bağımlı değildir, `sceneBridge` üzerinden konuşur.
- **ai/** – medya ön işleme (tarayıcıda), sağlayıcı arayüzü, sonuç doğrulama, sahneye eşleme.

## Temel kararlar
1. **Birim = santimetre, sahnede de.** 1 three birimi = 1 cm. Dönüşüm hatası yok; desenler cm ile tanımlı olduğundan doğrudan gerçek ölçek.
2. **Duvar UV'leri santimetre.** `ShapeGeometry` UV'leri şekil koordinatlarıdır (cm). Doku tekrarı = `1 / karoCm`. Desen tavandan başlar (gerçek uygulamadaki gibi). Kaydırma ile hizalama yapılabilir.
3. **Açıklıklı duvar.** Duvar profili `THREE.Shape`; pencereler delik, zemine değen kapılar dış konturda çentik (üçgenleme hatasını önler). İç yüzey (kaplama) + `ExtrudeGeometry` gövde (kalınlık, pencere pervazları) + süpürgelik.
4. **Kesit görünüm.** Kamera bir duvarın dış tarafına geçince o duvar gizlenir; oda sınırı zemin çizgisi olarak kalır. Gizli duvarlar tıklamayı engellemez.
5. **Parametrik modeller.** Mobilyalar ölçüye göre yeniden üretilir (ör. gardırop kapak sayısı genişliğe göre değişir, bacaklar esnemez). `modelUrl` verilen katalog kalemleri glTF/GLB yükler ve ölçüye sığdırır; hata olursa prosedürel modele döner.
6. **Geri al/yinele.** Kalıcı eylemler anlık görüntü (immutable proje) kaydeder. Sürükleme/kaydırıcı sırasında `checkpoint()` + geçici güncelleme → tek geri alma adımı.
7. **Sahne ↔ UI köprüsü.** `sceneBridge` (ekrandan zemine/duvara ışın, ekran görüntüsü). HTML5 sürükle-bırak bu köprüyü kullanır.
8. **AI yalnızca öneri verir.** Sonuçlar şemayla doğrulanır, güven puanıyla listelenir, kullanıcı onaylar; eklenen her şey normal nesnedir ve elle düzeltilir. API anahtarı yalnızca sunucuda.

## Veri modeli (özet)
```ts
Project { schemaVersion: 1, room: RoomSpec, items: (FloorItem | OpeningItem)[], walls: WallFinish[], floor, customWallpapers }
RoomSpec { corners: Vec2[] /* cm, saat yönünde */, height, wallThickness }
FloorItem { catalogId, position{x,z}, elevation, rotation°, size{w,d,h}, color, locked }
OpeningItem { catalogId, wallIndex, offset /* duvar boyunca merkez */, elevation, size, flip }
WallFinish { paintColor, wallpaper: { wallpaperId, offsetU, offsetV } | null }
WallpaperDef { tileWidthCm, tileHeightCm, rollWidthCm, rollLengthCm, patternRepeatCm, match, source: procedural|image, pricePerRoll }
```
Oda köşe listesi çokgen olduğundan L-tipi odalar eklemek yalnızca UI (köşe düzenleme) gerektirir; geometri, duvar, zemin ve UV kodu genel çokgeni destekler.

## AI analiz akışı
1. Tarayıcı: fotoğraflar 1280 px JPEG'e küçültülür; videodan 6 eşit aralıklı kare çıkarılır.
2. `POST /api/analyze-room` → sunucu doğrular, hız sınırı uygular, Claude'a görseller + katalog + oda ölçüsüyle gider.
3. Model `report_room_analysis` aracını zorunlu çağırır (JSON şema, katalog kimlikleri `enum`).
4. İstemci `sanitizeResult` ile temizler → kullanıcı listeden seçer → `detectionsToItems` ilk fotoğrafın baktığı duvara göre koordinatları odaya çevirir, duvara yaslar, sınırlar.

## Yol haritası (önerilen sonraki adımlar)
- L/U tipi oda (köşe noktası düzenleme), çoklu oda.
- Gerçek GLB mobilya kütüphanesi (Sketchfab/Poly Haven ya da kendi modelleriniz) → `modelUrl`.
- Katalog API'si (stok, fiyat, görsel) → `VITE_WALLPAPER_CATALOG_URL`.
- Gerçek duvar kağıdı taramaları için normal/roughness haritaları, rulo eki (seam) görselleştirmesi.
- Hesap/proje paylaşımı (bulut depo), müşteriye link ile gönderim, PDF teklif.
- AI: derinlik tahmini ile daha doğru konum, kamera kalibrasyonu, eşya renk tespiti.
