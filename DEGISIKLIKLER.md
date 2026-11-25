# Değişiklikler

## 2.3.0 — ilk açık sürüm
- Düzen: bir orkestratör, bir kalıcı kod oturumu, bir kalıcı tasarım oturumu. Orkestratör üretmez; işler aynı oturumlara mesajla gider.
- Sorusuz kurulum; aynı komut kurar ve günceller. Kurucu kendi işini kendi kontrol eder.
- Tek kural dosyası, üç beceri (`devir`, `is-kapat`, `compact-hazirlik`), beş yardımcı.
- Betikler: oturum açılışında ve compact sonrasında kaldığı yeri ve dersleri yükleme · bağlam doluluğunu oturum kaydından ölçme · iş tarifinde kullanıcının sözünü doğrulama · yardımcı modeli denetimi (iş akışlarında her çağrı ayrı; adıyla çağrılan rol tanımının modeli sayılır) · onay listesi · sessizlik nöbeti (13 dakika) · ders taraması · belge bakımı.
- Eforu her işte orkestratör seçer ve planda söyler; ayardaki değer yalnız açılış değeridir. Ultracode açıkken iş akışı sorulmadan kurulur.
- Bekletilen iş neyi beklediğiyle yazılır ve her rapor gelişinde bakılır.
- Kullanıcıdan beklenen her şey (soru, karar, onay, deneme) `DEVAM.md`'nin "Bekleyenler" bölümünde tek listede durur. İşi durduran hemen sorulur, durdurmayan iş kapanışında toplu sorulur. Kullanıcı "devam" dediğinde liste betikle hatırlatılır.
- Compact isterken, önceki işi kapanmış ve sıradaki işi ilgisiz olan oturum için `/clear` seçeneği de söylenir; karar kullanıcınındır.
- İki dil: Türkçe ve İngilizce. Betikler ortaktır; kural, beceriler, yardımcılar ve şablonlar `kit/dil/<dil>/` altındadır; betik metinlerinin Türkçesi betiklerin içinde, İngilizcesi `kit/dil/en/dil.json` dosyasındadır. Dil ilk kurulumda seçilir (`--dil`), ayarda saklanır, sonradan değiştirilebilir. İngilizce kurulum `SETUP.md` ile yapılır.
- Kit kaynağının bilgisayardaki yolu depoya girmeyen `yerel.json` dosyasında durur; kişisel varsayılanlar `kit/ayarlar/kisisel.json` ile verilir. "Teke'yi güncelle" demek yeter.
- Yardımcıda yasak model listesi varsayılanda boş, commit'te ortak yazar yasağı kapalıdır; ikisi de ayardan değişir.

Önceki sürümler (1.0.0 – 2.2.0) yalnız geliştirme sürecinde kullanıldı. O sürümlerle kurulu proje güncellemede kendiliğinden taşınır: eski `.claude/orkestra/` klasörü `.claude/teke/` olur, ayarlar ve oturum kimlikleri korunur.
