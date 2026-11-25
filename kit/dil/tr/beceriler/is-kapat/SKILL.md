---
name: is-kapat
description: Kod ya da tasarım oturumundan rapor gelen bir işi orkestratörün kapatması. Doğrular, bağımsız göze baktırır, kayıtları yazar, ders taraması ve bakımı koşar, kullanıcıya kısa özet verir. Bir işin raporu geldiğinde kullan. Argüman işin adı.
argument-hint: <iş adı>
---

İş: $ARGUMENTS

1. **Raporu oku:** iş tarifinin sonundaki "## Rapor". İlk satırdaki skill listesi tarifle uyuşuyor mu, hedef küçülmüş mü bak. `COMPACT GEREK` yazıyorsa kullanıcıya ilk satırda söyle.
2. **Kendi gözünle doğrula.** Rapor kanıt değildir.
   - Kod: farka bak (`git diff`, `git log`), testi ya da uygulamayı kendin çalıştır ya da çıktısını gör. Kullanıcının göreceği bir şey değiştiyse çalışırken gör.
   - Tasarım: çıktıyı aç ve bak. Çıktı yayımlanmış bir sayfa ya da tuvalse yayımlanmış hâline de bak (tarayıcıda aç); açamıyorsan bunu kullanıcıya söyle. "Kullanıcının sözü" ve "ölçü alınacak örnek" ile yan yana koy.
3. **Bağımsız göz.**
   - Kod: değişen dosyalarla `hata-avcisi`; davranış değiştiren işte `test-korlugu` da.
   - Tasarım: `elestirmen`e seçenekleri kimin ürettiğini söylemeden ver; iş tarifinin yolunu ve çıktının yerini (dosya yolu, sayfa bağlantısı, varsa ekran görüntüleri) ver; kaynak koda değil görüntüye bakarak puanlamasını iste. Tek genel eleştiri yetmez: `elestirmen`i ayrı açılarla en az iki kez çağır ve her çağrıya tek açı ver (kullanıcının sözüne ve ölçü örneğe uygunluk · okunurluk ve küçük ekran · özgünlük ve his · uygulanabilirlik). Çıktıda kullanıcının okuyacağı metin varsa (düğme, kart, karakter sözü, açıklama) ayrı bir çağrıyla dil açısından da baktır: doğallık, hedef kitleye uygunluk, verilen bilginin doğruluğu, tekrar.
   - Yalnız belge değiştiren ya da tek satırlık işte ajan koşma.
   - Büyük dönemeçte (yayın öncesi, bir bölümün sonu, yeni büyük özellik) ağır inceleme: alan başına ayrı `hata-avcisi`, `test-korlugu`, ve yüksek önemli bulguların `supheci` ile toplu doğrulanması. Bunu başlatmadan önce önerini yaz.
   - Yüksek önemli bulgu varsa iş kapanmaz: aynı oturuma `EK:` ile düzelttir. Orta ve düşük bulguyu bir işe bağla ya da gerekçesiyle ertele.
4. **Bekleyen işe bak.** `DEVAM.md`'de "bekliyor: …" yazan işlerin beklediği şey bu raporla (ya da daha önce) geldi mi? Geldiyse o işi bu turda gönder (`devir`); öteki oturumun hâlâ çalışıyor olması ya da bu işin düzeltme turuna dönmesi engel değildir. Bu adım iş kapanmasa da atlanmaz.
5. **Kayıt.**
   - `DEVAM.md`: "şu an / sıradaki", bekleyenler ve sonraya bırakılanlar güncel hâle gelsin (üzerine yaz). Bekletilen iş neyi beklediğiyle yazılır.
   - Bekleyenler: bu iş sırasında biriktirdiğin soruları, karşılık görmemiş önerilerini ve kullanıcının yapacağı denemeyi listeye yaz; cevaplanmış olanı çıkar. Konuşmada "sonra sorarım" dediğin her şey ya listede ya da sorulmuş olmalı.
   - İş tarifinin en sonuna tek satır: `KAPANDI: <tarih> — <kabul | düzeltmeyle kabul | ret>`.
   - Yeni karar çıktıysa karar defterine.
6. **Ders taraması:** `node .claude/teke/araclar/ders-tara.js` çıktısındaki kullanıcı mesajlarını oku. Düzeltme, itiraz, tekrarlanan istek ve "öyle demedim" türünden olanlar ders adayıdır. Ders defterinde olmayanları yaz (tek cümle kural, tek cümle neden). Sonra `node .claude/teke/araclar/ders-tara.js --isaretle`.
7. **Bakım:** `node .claude/teke/araclar/bakim.js`. Kapanmış iş tariflerini arşive taşımak için `--arsivle`; bir belgenin eskiyen bölümünü taşımak için `--tasi` (önce `--prova` ile neyin taşınacağına bak). Bildirdiği şişkin ya da bayat kayıt varsa şimdi düzelt; büyükse sıradaki işlere yaz.
8. **Commit:** yalnız kendi değiştirdiğin kayıt dosyalarını adıyla ekleyip commit et (`git add -A` kullanma: başka oturumun yarım işi olabilir).
9. **Kullanıcıya özet** (kısa): ne oldu, nasıl görebilir, sırada ne var. Sonra bekleyenler listesi, iki grupta: işi durduranlar (cevap gelmeden başlamayacak iş) ve durdurmayanlar (hangi varsayımla sürdüğünle). Liste boşsa bunu tek cümleyle söyle. Karar ya da ders yazdıysan "Kaydedildi: …" satırı.
