# Değişiklikler

## 2.3.1 — süren projeye kurulum
Uzun süredir süren, açık oturumları olan projelere kurulumda ortaya çıkan açıkları kapatır.
- **Rol kayıtla belirlenir.** Kit kurulmadan önce açılmış oturumun ilk mesajı görülemiyorsa rol tahmin edilip kalıcı yazılmaz: oturuma rolünün kayıtlı olmadığı ve hangi komutla kaydedeceği söylenir. Yeni araç `rol.js` oturumları listeler ve rol yazar. İlk mesajı başka oturumdan gelen oturum kod oturumu sayılır; ilk satırı `ROL:` olan mesaj yanlış çıkarılmış rolü düzeltir. Öteki oturumdan gelen rapor da, kullanıcının orkestratöre yazdığı mesajda geçen `DEVİR:` ve `ROL:` satırları da orkestratörün rolünü değiştirmez.
- **Onay listesi.** Yayın desenleri alt klasörden (`pnpm -C … deploy`), `pages` ile ve `npx wrangler@…` ile yapılan yayını yakalar; deneme yayını (`--dry-run`) sorulmaz. Yeni varsayılan madde: canlı ortam ayarı (`wrangler secret put`, rollback). Güncellemede kitin eski varsayılanıyla duran desenler yenilenir, kullanıcının yazdığı desen kalır.
- **Kimde çalışır.** Her desene `"kimde": "kod"` yazılabilir: onay kartı o oturumda açılır, ötekinde komut reddedilir. Yayını kod oturumunun yaptığı projeler için.
- **Yanlış retler.** Commit mesajının gövdesinde (heredoc, here-string) geçen `git push` ya da yayın sözü komut sayılmaz; başka komuta verilen gövde eskisi gibi denetlenir. `eval` ve `Invoke-Expression` ile tırnak içinde verilen komut da denetlenir. Ortak yazar denetimi yalnız gerçek `Co-Authored-By: Ad <adres>` satırını reddeder.
- **Sağlık kontrolü,** içinde yayın komutu çalıştıran ama onay listesinin yakalamadığı `package.json` betiklerini bildirir; kurucu bunu kurulum çıktısında gösterir.
- **Bayat durum belgesi.** Açılış özeti, durum belgesi son güncellendikten sonra kaç gün geçtiğini ve kaç commit atıldığını söyler.
- **Dersler bölüm bölüm yüklenir.** Uzun ve bölümlü ders dosyasında her bölümün son dersleri alınır; önceden yalnız dosyanın başı ve sonu yükleniyordu.
- **Söz denetimi** oturum kaydını sondan başa okur ve alıntılar bulununca durur; yüzlerce MB'lik kayıtta da çalışır. Süre yetmezse sessizce atlamaz, haber verir.
- Kod ve tasarım oturumuna giden rol satırı yumuşadı: kayıt belgelerini orkestratör yazar, proje yasası bir belgeyi o oturuma yazdırıyorsa o geçerlidir.
- Kural dosyası yardımcıların bağlamına da girdiği için başına yardımcılara yönelik bir satır eklendi.
- `KURULUM.md` 5. bölüm yeniden yazıldı: süren projede kurucudan önce ve hemen sonra yapılacaklar.

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
