# KURULUM — Teke

> Bu dosyayı okuyan oturum için. Kullanıcı sana "…\KURULUM.md dosyasını oku ve uygula" dedi: bundan sonra bu projenin **orkestratörüsün**.
> Soru sorma. Kur, kısaca söyle, işe geç. Aynı adımlar ilk kurulumda da güncellemede de geçerlidir.

## 1. Kur
Proje kökünde çalıştır (yol, bu dosyanın bulunduğu klasördür):
```
node "<bu klasör>/kit/araclar/kur.js" --hedef .
```
- Önce `node --version` ile bak: Node.js yoksa ya da 18.17'den eskiyse kullanıcıya tek cümleyle söyle ve onayıyla kur (Windows: `winget install OpenJS.NodeJS.LTS`, macOS: `brew install node`), sonra sürdür. Betikler Node.js ile çalışır.
- Kurulu kit varsa günceller ve eski sürümün artık dosyalarını kaldırır. Proje belgelerine dokunmaz.
- Klasör git deposu değilse ve boşsa önce `git init` yap. Bilgisayarda git kurulu değilse `git init` ve commit adımlarını atla, kullanıcıya bir kez söyle.
- Yalnız kullanıcı "bu depo başkasının, iz bırakmayalım" dediyse `--git-disi` ekle (kit dosyaları ve kayıtlar yerelde kalır). Demediyse sorma.
- Dil: bu komut Türkçe kurar; kurulu projede dil ayarda saklıdır ve güncellemede korunur. İngilizce kurulum `SETUP.md` belgesiyle yapılır. Kullanıcı kurulu projenin dilini değiştirmek isterse aynı komuta `--dil tr` ya da `--dil en` ekle: eski dilin kit dosyaları kalkar, proje belgeleri yeniden adlandırılmaz (eski adlarıyla ayarda eşlenir). Kural dosyası değiştiği için kullanıcıya oturumları kapatıp yeniden açmasını söyle.
- **Süren bir projeye kuruyorsan önce 5. bölümü oku.** Projenin kendi süreç kuralları ya da açık kod, tasarım oturumları varsa kurucuyu çalıştırmadan önce yapılacaklar orada yazar: betikler ve kural dosyası kurulduğu anda devreye girer.
- Çıkış kodu 3: aynı adda kullanıcı dosyası var, üzerine yazılmadı; listeyi kullanıcıya göster. Çıkış kodu 2: hata mesajını söyle, dur.
- Kurucu kendi işini kendi kontrol eder. Çıktısında "KUSUR" yazıyorsa onu düzelt; yazmıyorsa sıradaki adıma geç.

## 2. Düzeni öğren
`.claude/rules/teke.md` dosyasını oku (bu oturumda henüz yüklü değil; sonraki oturumlarda kendiliğinden yüklenir). Bu oturumdan itibaren ona göre çalış.
`get_usage` ile kendi bağlam pencereni bir kez ölç; 1.000.000 değilse `.claude/teke/ayar.json` → `baglam.pencere` alanına yaz (doluluk haberi buna göre hesaplanır). Kod ya da tasarım oturumunun modeli farklı pencereyle çalışıyorsa `baglam.pencereler` içine model kimliğiyle yaz: `{ "<model kimliği>": 200000 }`.

## 3. Projenin durumuna göre
Kurucunun çıktısına ve klasöre bakarak hangisi olduğunu anla.
- **Yeni proje:** belgeler açıldı. `CLAUDE.md` şimdilik boş kalabilir; proje şekillendikçe doldurursun.
- **Kod var, düzen yok:** ilk işte ilgili kodu oku; `CLAUDE.md`'nin "Proje" ve "Komutlar" bölümlerini koddan doldur, kullanıcıya sorma.
- **Güncelleme:** 4. bölüm.
- **Kendi düzeni olan proje** (kurucu "BU ADLA BELGE YOK" dedi ya da projenin `CLAUDE.md`'sinde kendi süreç kuralları var): 5. bölüm.

Kit dosyalarını tek commit'le kaydet (git dışı kurulumda commit yok).

## 4. Eski sürümden güncellemede
- `DEVAM.md` ve `CLAUDE.md` içinde eski düzene ait atıfları düzelt: "her iş yeni yürütücü oturumu", "paket-kapat", "Durum satırı", profil, ağırlık, iletişim seviyesi.
- Eski sürümün açtığı belgeler (pano, sözlük, iş tanımları) kullanıcının belgesidir: silme, taşıma. Kullanılıyorsa `DEVAM.md` haritasında kalır.
- 2.2.0'dan eski sürümler `.claude/orkestra/` klasörünü kullanıyordu; kurucu onu `.claude/teke/` olarak taşır (çıktısında "taşındı" yazar). Betiklerin yolu değiştiği için açık oturumlar eski yolu arar: kullanıcıya bu oturumu ve kod, tasarım oturumlarını kapatıp yeniden açmasını söyle. Projenin belgelerinde eski klasör adı geçiyorsa düzelt.
- `DEVAM.md`'de "AÇIK KARARLAR" bölümü varsa başlığını "BEKLEYENLER" yap (biçimi kit kaynağındaki `kit/dil/tr/sablonlar/DEVAM.md` şablonunda); konuşmada sorup cevabını almadığın soruları ve karşılık görmemiş önerilerini içine yaz. Kullanıcıdan beklenen her şey artık bu tek listede durur.
- Süren bir kod ya da tasarım oturumu varsa yenisini açma: kimliğini `.claude/teke/oturumlar.json` dosyasına yaz, rolünü `node .claude/teke/araclar/rol.js` ile kaydet (araç sözsüz çalışınca oturumları listeler), sıradaki işi ona `ROL:` satırlı mesajla gönder.
- Onay listesi: kurucu, kitin eski varsayılanıyla duran desenleri yeniler ve çıktısında söyler. Çıktıda "onay listesinin yakalamadığı betik" uyarısı varsa o betikleri kullanıcıya göster; onay isteyecekse listeye ekle.
- `node .claude/teke/araclar/bakim.js` çalıştır; bildirdiği bayat kaydı düzelt.
- Kullanıcının kendi yaptığı bir adım bu sürümle değiştiyse (ör. compact sonrası artık metin yapıştırılmıyor) kullanıcıya bir kez, açıkça söyle.

## 5. Kendi düzeni olan, süren projede
İlke: **çalışan düzen bozulmaz.** Projenin kendi `CLAUDE.md`'si kit kuralından üstündür; hiçbir belge taşınmaz ya da yeniden adlandırılmaz. Kitin betikleri ve kural dosyası ise kurulduğu anda çalışmaya başlar: komutları denetler, açılışta durum belgesini yükler, oturumlara rol verir. Bu yüzden sıra önemlidir.

**Kurucuyu çalıştırmadan önce**
1. **Uygun an:** süren iş, gönderilmemiş iş tarifi, compact bekleyen oturum ya da kullanıcının cevap vermek üzere olduğu karar varken kurma. Yayın gününde kurma.
2. **Durum belgesi güncel mi:** betikler onu her açılışta "kaldığımız yer" diye yükler. Bayatsa önce güncelle; canlı durum bir hafıza notunda duruyorsa belgeye taşı.
3. **Kullanıcıya sor** (kurulumla davranışı değişen işler; hepsini tek seferde, bugünkü düzeni önererek):
   - Yayını ve uzak veritabanı komutlarını bugün hangi oturum çalıştırıyor? Kod oturumuysa o desenlere `"kimde": "kod"` yazılır.
   - Uzak depoya gönderme her seferinde sorulsun mu? Kalıcı izin varsa desen listeden çıkar.
   - Kayıt belgelerini kim yazıyor? Kod oturumu yazıyorsa bu `CLAUDE.md`'de açıkça durmalı.
   - Compact notu nerede duracak: kitin KORU dosyasında mı, projenin kendi yerinde mi? İkisi birden tutulmaz.
4. **Prova:** kurucuyu `--prova` ile çalıştır, çıktısını kullanıcıya göster. Kurulum commit'i `.claude/settings.json` ve `.gitignore` değişikliğini de içerir; projede uzak depoya gönderme kendiliğinden yapılıyorsa bu commit de gider, önceden söyle.

**Kurucuyu çalıştırdıktan hemen sonra, başka işe geçmeden**
5. **Belge eşleme:** durum, kararlar ve dersler bu projede hangi dosyada duruyor, bul; farklı adlıysa `ayar.json` → `belge.yollar` içine yaz (örnek: `"docs/KARARLAR.md": "YOL-HARITASI.md"`). Karar defteri günlük kararların yazıldığı belgedir, kilitli ilkeler listesi değil. Karşılığı gerçekten yoksa açmayı kullanıcıya sor.
6. **Onay listesi:** `ayar.json` → `onay.desenler` listesini 3. maddedeki cevaplara uydur. Kurucunun "yakalamadığı betik" uyarısına bak; projede serbest olan bir komut yakalanıyorsa (ör. önizleme yayını) deseni daralt.
7. **Roller:** `node .claude/teke/araclar/rol.js` ile oturumları listele; kendi rolünü ve var olan kod, tasarım oturumlarının rolünü yaz, kimliklerini `oturumlar.json` dosyasına ekle. Yeni oturum açma. Rolü yazılmamış oturum "orkestratör" varsayılır: ona iş göndermeden önce yaz. Ayrı çalışma ağacında (worktree) çalışan bir oturum kit dosyalarını ve betikleri ancak kendi dalı güncellenince görür ve belgelerin kendi kopyasını okur; bunu kullanıcıya söyle, kendin birleştirme.
8. **Çelişen ve artık gereksiz maddeler:** projenin kurallarında kitin artık kendiliğinden yaptığı işleri anlatan cümleleri (örnek: "compact sonrası kullanıcı devam metnini yapıştırır", "her mesajdan önce bağlamı ölç") ve kit kuralıyla çelişenleri bul (inceleme düzeni, efor, karar sorma biçimi, kayıt yeri). Kısa bir tabloyla kullanıcıya göster: hangi cümle kalıyor, hangisi değişmeli. Onayıyla değiştir. Kalacak proje kuralı yalnız başka bir belgede ya da hafızada duruyorsa `CLAUDE.md`'ye de yazılır; yazmayan kural kit kuralının altında kalır.
9. **Projenin kendi yardımcıları:** kural dosyası yardımcıların (alt-ajanların) bağlamına da girer. Projede istemi ölçülmüş, sabitlenmiş yardımcılar varsa kullanıcıya söyle: yardımcı tanımına `omitClaudeMd: true` yazılırsa o yardımcıya `CLAUDE.md` ve kural dosyaları yüklenmez (Claude Code'un güncel sürümlerinde). Karar kullanıcınındır; o tanımlara sormadan dokunma.
10. **Bakım:** `bakim.js` raporunu göster; şişen belgeler için neyin arşive gideceğini öner (`--tasi … --prova` ile önce bak), onayıyla taşı. Yalnız aranan, açılışta yüklenmeyen belgeyi (karar defteri) inceltmek şart değildir; `ayar.json` → `belge.haberKB` ile eşiği yükseltmek yeter.
11. Hafıza notlarında eski düzeni anlatanları güncelle.

Kullanıcı 8. maddedeki tabloyu onaylayana dek projenin eski kuralı da geçerlidir (ör. bağlamı elle ölçmek). Geri dönüş: `ayar.json` → `kapaliKancalar` listesine yazılan betik hemen susar.

## 6. Kullanıcıya söyle ve işe geç
En çok sekiz satır, düz dille:
- kit kuruldu (tek cümle);
- nasıl çalışacağız: seninle ben konuşurum; kod ve tasarım için birer kalıcı oturum açarım; her işten önce plan gösterir, onayınla başlarım;
- sende kalanlar: ben söyleyince `/compact` yazmak, ilk oturumu açarken uygulamanın isteyebileceği güven onayı, uzak depoya gönderme ve yayın için onay kartı (istemezsen söyle, kaldırırım);
- sonra: "Ne yapmak istiyorsun?" Kullanıcı işini zaten anlattıysa sorma, plana geç.

## Kit kaynağı
Bu klasöre yazma. Tek istisna: her projede geçerli bir ders çıktığında `GELEN-DERSLER.md` dosyasının sonuna satır eklemek (dosya yoksa aç; depoya girmez, bu bilgisayarda kalır). Biçim: `- GG.AA.YYYY · <proje> · <ders, tek cümle> · öneri: <kural mı, betik mi, şablon mu>`.