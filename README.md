# Wallpaper3D

Web tabanlı 3D oda tasarımı ve **gerçek ölçekli duvar kağıdı önizleme** uygulaması.
Masaüstü ve mobilde çalışır.

## Özellikler
- **Çok odalı ev (v0.2):** ilk odanın sağına/soluna/önüne/arkasına yeni odalar eklenir; ortak duvar paylaşılır, aradaki kapı iki odada da açıklık oluşturur. Her oda ayrı düzenlenir (sahnede odaya dokunmak onu aktif yapar); "Ev" görünümü tüm evi gösterir.
- **Firma katalogları (v0.2):** her firmanın duvar kağıtları görsel + CSV/ZIP ile yüklenir, panelde yalnızca bu ürünler listelenir; fiyat/rulo bilgisi teklife yansır. Ayrıntı: [docs/KATALOG.md](docs/KATALOG.md)
- **Parça bazlı renk (v0.2):** her eşyada ana + ikincil malzeme rengi (ör. kanepe kumaşı + ayak, mutfak kapağı + tezgâh), geniş palet ve serbest renk seçici.
- **Oda editörü:** genişlik/uzunluk/yükseklik (cm) → gerçek ölçekli 3D oda; ölçü düzenleme, zemin malzemesi, duvar boyası.
- **Mobilya kütüphanesi (33 tip):** ahşap/döşemeli/ofis sandalyesi, bar taburesi, puf, yatak, gardırop, komodin, şifonyer, kanepe, L koltuk, berjer, sehpa, TV ünitesi, TV, kitaplık, yemek/çalışma masası, sandalye, mutfak alt/üst dolap, evye, ocak, buzdolabı, lavabo, klozet, küvet, halı, bitki, lambader, kapı, pencere, balkon kapısı.
- **Düzenleme:** sürükle-bırak (zeminde), döndürme halkası (90°'ye mıknatıslı), ölçü kaydırıcıları, renk, çoğalt, kilitle, sil, duvara yapıştırma, duvarlara mesafe ölçüleri, geri al/yinele, klavye kısayolları.
- **Kapı/pencere:** duvara gömülür, duvar boyunca ve duvarlar arasında sürüklenir; duvarda gerçek delik açılır.
- **Duvar kağıdı:** duvara dokun → katalogdan seç; desen cm cinsinden gerçek ölçekte, tavandan hizalı; yatay/dikey hizalama; kaldır/değiştir; tüm duvarlara uygula; kendi deseninizi yükleyin; **rulo hesabı ve teklif özeti**.
- **Görüntü al:** müşteriye gönderilecek PNG.
- **AI analiz:** oda fotoğrafları/videosu → eşya ve yaklaşık konum önerileri (onaylı ekleme, her şey elle düzeltilebilir).
- **Kalıcılık:** tarayıcıda otomatik kayıt, `.json` proje dışa/içe aktarma.

## Kurulum
Gereksinim: Node.js 22+

```bash
npm install
npm run dev            # http://localhost:5173
```

AI analizi için (ayrı terminal):
```bash
cp server/.env.example server/.env   # ANTHROPIC_API_KEY girin
npm run dev:server                   # http://localhost:8787 (Vite /api isteklerini buraya yönlendirir)
```

Üretim:
```bash
npm run build          # dist/
npm run dev:server     # dist/ + /api aynı sunucudan (PORT=8787)
```
Tek dosyalık demo (statik barındırma): `npm run build:single` → `dist-single/index.html` (AI hariç tüm özellikler).

Testler: `npm test` · Tip kontrolü: `npm run typecheck`

## Yapılandırma
| Değişken | Nerede | Açıklama |
|---|---|---|
| `VITE_WALLPAPER_CATALOG_URL` | ön yüz | Uzak katalog JSON (WallpaperDef[]). Boşsa yerleşik demo katalog. |
| `VITE_AI_ENDPOINT` | ön yüz | AI uç noktası (varsayılan `/api/analyze-room`) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | sunucu | Claude erişimi ve model |
| `ALLOWED_ORIGIN`, `RATE_LIMIT_PER_HOUR`, `PORT` | sunucu | CORS, hız sınırı, port |

## Genişletme
- **Yeni mobilya:** `src/catalog/furniture.ts`e kayıt ekleyin, `src/three/models/` altında parametrik bileşen yazıp `registry.tsx`e ekleyin. Gerçek model için `modelUrl: '/models/x.glb'` (public/models/) yeterli – ölçüye otomatik sığdırılır.
- **Yeni duvar kağıdı:** taranmış karo görseli + gerçek karo ölçüsü (cm) → `source: { type: 'image', url }`.
- Ayrıntılı mimari: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Kısayollar
`Delete` sil · `R` döndür (Shift: ters) · `Ctrl+D` çoğalt · Ok tuşları 1 cm (Shift 10 cm) · `Ctrl+Z` / `Ctrl+Y` · `Esc` seçimi kaldır
