# Firma kataloğu yükleme

Uygulamada **Duvar kağıdı → Firma katalogları** (veya menü → Firma katalogları) penceresinden
her firma için ayrı bir katalog oluşturulur. Ürünler bu tarayıcıda (IndexedDB) saklanır;
**ZIP** düğmesiyle dışa aktarılıp başka bir cihaza aynı pencereden geri yüklenebilir.

## Kabul edilen dosyalar
| Seçilen | Ne olur |
|---|---|
| Yalnızca görseller (JPG/PNG/WebP) | Her görsel bir ürün olur. Ad = dosya adı, ölçüler = pencerede girilen varsayılanlar |
| Görseller + `katalog.csv` | CSV satırları görsellerle eşleştirilir (`gorsel` sütunu veya ürün kodu = dosya adı) |
| Tek bir `.zip` | İçindeki görseller ve CSV/JSON otomatik okunur (klasör yapısı önemsiz) |
| `.json` | `WallpaperDef[]` biçimi (uzak katalog ile aynı) |

## CSV sütunları
Excel'de **"CSV UTF-8"** olarak kaydedin. Ayırıcı `;` veya `,` olabilir; başlıklar Türkçe ya da İngilizce yazılabilir.
Boş bırakılan alanlarda içe aktarma penceresindeki varsayılanlar kullanılır.

| Sütun | Açıklama | Örnek |
|---|---|---|
| `kod` | Ürün/stok kodu | KL-1021 |
| `ad` | Ürün adı | Versailles Damask |
| `koleksiyon` | Seri / katalog adı | Klasik 2026 |
| `desen_genislik_cm` | Görselin duvardaki gerçek genişliği (genelde rulo eni) | 53 |
| `desen_yukseklik_cm` | Boşsa görsel oranından hesaplanır | 64 |
| `rulo_en_cm` | Rulo eni | 53 |
| `rulo_boy_m` | Rulo boyu (metre veya cm) | 10,05 |
| `rapor_cm` | Desen raporu (boşsa desen yüksekliği) | 64 |
| `eslesme` | düz / kaydırmalı / serbest | kaydırmalı |
| `fiyat` | Rulo fiyatı (1.450 veya 1450,50 yazılabilir) | 1.450 |
| `para_birimi` | TRY, EUR, USD… | TRY |
| `yuzey` | mat / saten / dokulu | saten |
| `gorsel` | Görsel dosya adı | KL-1021.jpg |

Pencereden **Şablon CSV indir** ile hazır bir örnek alınabilir.

## Gerçekçi sonuç için görsel
Görsel, desenin **bir tam tekrarını** (yan yana ve alt alta döşenince kesintisiz devam eden parça) içermelidir.
Firmaların ürün sayfalarındaki "desen/karo" görselleri genelde budur; oda fotoğrafı (mockup) kullanmayın.
