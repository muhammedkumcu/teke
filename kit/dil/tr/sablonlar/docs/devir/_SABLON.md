# İŞ TARİFİ — <iş adı>

> Bu dosyayı aynı klasöre `<iş adı>.md` adıyla kopyala ve doldur. İşi yapan oturum konuşmayı görmez: burada yazmayan şey onun için yoktur.

- Rol: <kod | tasarım>
- Model ve efor: <model; bu iş için seçilen efor ve tek cümle nedeni>
- Raporun gideceği oturum: <orkestratörün oturum kimliği>

## Kullanıcının sözü (aynen; her biri alıntı satırı)
> <kullanıcının bu iş hakkında söylediği, konuşmadan kopyalanmış>

## Yorumum (orkestratörün çıkarımı; kullanıcının sözü değildir)
<kısa>

## Amaç
<bir iki cümle: bu iş bitince kullanıcı ne görecek>

## Ölçü alınacak örnek
<beğenilen ve reddedilen önceki işler, yollarıyla; ya da "henüz yok">

## Dayandığı kararlar
<karar defterindeki numaralar ya da "yok">

## Oku
<yasa dosyası, durum dosyası ve işe özgü dosyalar; yollarıyla>

## Skill
<yüklenecek skill'ler ya da "yok">

## Yapılacak
<ne isteniyor, gerçek kısıtlar ve bilinen tuzaklar. Yolu dikte etme: adım adım tarif yalnız sıra gerçekten önemliyse. Tasarım işinde ayrıca: istenen his, kaç seçenek istendiği>

## Dokunma
<kapsam dışı; ya da "yok">

## Bitti sayılır
<hangi kanıtla: komut, test, görüntü>

## Durma noktası
<nerede durup rapor yazılacak; onay isteyen adım varsa çalıştırma, raporda tam komutuyla yaz>

---

## İşi yapan oturum için (her tarifte aynı)
1. Bu dosyayı ve "Oku" listesini baştan sona oku; "Skill" alanındakileri yükle.
2. **Adım 0 (koda ya da çizime başlamadan):** ilgili yeri oku. Tarif ile gerçek durum uyuşmuyorsa ya da tarifte olmayan bir karar gerekiyorsa sessizce birini seçme; farkı orkestratöre `SORU:` mesajıyla bildir.
3. İşi yap. Kullanıcıya soru sorma; sorun olursa orkestratöre `SORU:` mesajı gönder ve cevabı beklerken cevaba bağlı olmayan kısımla devam et. Kayıt belgelerini (durum, karar, ders) orkestratör yazar; proje yasası bir belgeyi sana yazdırıyorsa o geçerlidir.
4. Kod işinde: testleri koş, commit'ten önce kendi farkını `code-review` ile incele, kod commit'ini at (commit'e yalnız kendi değiştirdiğin dosyaları adıyla ekle). Tasarım işinde: seçenekli üret, uygulama koduna dokunma.
5. Bu dosyanın sonuna "## Rapor" başlığıyla raporunu yaz:
   - ilk satır: yüklenen skill'ler;
   - ne yapıldı (kısa); hedef verildiyse ulaşılan / istenen;
   - kanıt: komut çıktısı özeti, test sayısı, commit, görüntü ya da sayfa yolu;
   - emin olmadıkların; onay bekleyen ve sana kalmayan adımlar (tam komutuyla). Komut yalnız burada, raporda durur.
6. Raporun dosyaya gerçekten yazıldığını oku (yazma başarısız olmuş olabilir). Sonra orkestratöre kısa mesaj gönder (`SendMessage` aracı, `to`: yukarıdaki "Raporun gideceği oturum" kimliği): ilk satır `RAPOR: <iş adı> bitti | kısmen | takıldı`, ardından en çok üç satır. Bağlamın compact eşiğini geçtiyse `COMPACT GEREK` yaz. Sonra dur.
7. Sohbete yazdığın son mesajda çalıştırılabilir komut ya da kod bloğu bırakma: uygulama ona "Çalıştır" düğmesi ekler, kullanıcı kendi işi sanıp çalıştırır. Kalan adımı raporda "sonraki iş" diye yaz; kimin yapacağını orkestratör söyler.
