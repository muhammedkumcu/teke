---
name: devir
description: Orkestratörün kod ya da tasarım oturumuna iş vermesi. İş tarifini yazar, oturumu (yoksa) açar ve tarifi mesajla gönderir. Bir iş başka oturuma gidecekken kullan. Argüman işin kısa adı.
argument-hint: <iş adı>
---

İş: $ARGUMENTS

Belge yolları projede farklıysa oturum açılışındaki "[teke]" özetindeki yollar geçerlidir. Oturum araçları yüklü değilse önce araç aramasıyla yükle: `mcp__ccd_session__start_session`, `SendMessage`, `mcp__ccd_session_mgmt__get_usage`, `mcp__ccd_session_mgmt__get_session`, `mcp__ccd_session_mgmt__set_session_effort`, `mcp__ccd_session_mgmt__list_sessions`, `mcp__ccd_host__request_keep_awake`.

1. **Karar ve söz kontrolü.** Bu işin dayandığı kararları karar defterinde bul. Kararı verilmemiş bir konu ya da neyi kastettiği belli olmayan bir kullanıcı sözü varsa DUR, önce kullanıcıya sor.
2. **Tarifi yaz.** Devir klasöründeki `_SABLON.md` dosyasını `<iş adı>.md` olarak kopyala, alanları doldur:
   - "Kullanıcının sözü": bu iş hakkında söylediklerini konuşmadan AYNEN kopyala; her söz `> ` ile başlayan ayrı bir satır. Düzeltme, özetleme, güzelleştirme yapma; yazım hataları da kalır. Söz bu konuşmada değil bir belgede ya da önceki bir oturumdaysa alıntının sonuna `(kaynak: <dosya>)` yaz. Hiç söz yoksa "Kullanıcı bu işi sözle tarif etmedi" yaz.
   - "Yorumum": kendi çıkarımların burada, ayrı. Kullanıcının beğendiği örnekten uzaklaşan bir yorum yazma.
   - "Ölçü alınacak örnek": beğenilen ve reddedilen önceki işler, yollarıyla. Tasarım işinde boş geçilmez; hiç örnek yoksa "henüz yok" yaz.
   - "Skill": işe gerçekten gerekenler; gerekmiyorsa "yok". Kod işinde `code-review` varsayılandır (oturum commit'ten önce kendi farkını inceler). Tasarım: `artifact-design`, `artifact-diagramming`, `artifact-capabilities`, `dataviz` (tasarım işinde bunlarsız gönderme) · kod incelemesi: `code-review` · sadeleştirme: `simplify` · güvenlik: `security-review` · uygulamayı çalıştırma: `run` · belge: `docs`. Proje bu listeyi `CLAUDE.md`'de genişletebilir.
   - **Yolu dikte etme.** İş tarifi ne istendiğini, ölçüyü ve sınırları söyler; nasıl yapılacağını işi yapan oturum seçer. Kod işinde adım adım tarif yalnız sıra gerçekten önemliyse yazılır; bildiğin tuzakları yaz.
   - **Tasarım işinde çözümü dikte etme.** Amacı, istenen hissi, ölçü örnekleri ve gerçek kısıtları ver; "nasıl"ı tasarım oturumuna bırak. Mekanik tarif yavan sonuç verir. Kullanıcının yasaklamadığı bir yönü sen yasaklama. Kaç seçenek isteneceği kural değildir: kullanıcı sayı söylediyse o; söylemediyse işe göre sen karar verirsin ya da tasarım oturumuna bırakırsın (küçük bir düzeltmede tek öneri yeter; yeni bir ekranda ya da görselde birkaç yön görmek işe yarar). Birden çok seçenek isteniyorsa birbirinden gerçekten farklı olsunlar (aynı fikrin renk değişikliği seçenek değildir) ve her biri görüntüyle gelsin; değişen bir şey varsa bugünkü hâli de karşılaştırma için yanlarında dursun. Aynı ekran ya da görsel iki kez reddedildiyse yeni tur açmadan önce beğenilenlerle reddedilenlerin ortak yanını yaz ve kendi tarifini eleştir; yeni bir kaplama getirmek çözüm değildir.
   - "Raporun gideceği oturum": kendi oturum kimliğin (`get_session` ile `"self"`).
   - "Bitti sayılır": hangi kanıtla (komut, test, görüntü).
   - İş büyükse böl; her parça ayrı tarif.
3. **Oturum.** `.claude/teke/oturumlar.json` dosyasına bak.
   - Rolün oturumu kayıtlıysa: büyük işten önce doluluğunu ölç (`get_usage`); compact eşiğinin üstündeyse önce kullanıcıdan o oturumda `/compact` iste. Bu iş için seçtiğin efor oturumun şimdiki eforundan farklıysa göndermeden önce `set_session_effort` ile ayarla ve `oturumlar.json`daki değeri güncelle.
   - Kayıtlı değilse aç: `start_session`, `initiation: "user_asked"` (plan onaylandıysa), `context: "fresh"`, `use_worktree: false`, `name: "kod"` ya da `"tasarim"`, model `ayar.json` → `roller` (model takma adını güncel tam model kimliğine çevir), efor bu iş için planda söylediğin değer (ayardaki yalnız açılış değeridir). Uygulama senin modelinden ve eforundan yükseğini açmaz, sessizce düşürür: istediğin değer seninkinden yüksekse kullanıcıya söyle. `background` alanı zorunludur (en az 80 karakter): projenin iki cümlelik tanımı ve "bu oturum projenin kalıcı kod (ya da tasarım) oturumudur". `prompt` 4. adımdaki mesajdır. Dönen kimliği `oturumlar.json` dosyasına yaz: `{ "kod": { "id": "local_…", "model": "…", "efor": "…" } }`.
   - Açılmıyorsa (uygulama reddetti ya da klasör güven onayı bekliyor) kullanıcıya tek satırla ne yapacağını söyle: kartı başlat, onay ver, ya da "şu klasörde şu model ve eforla oturum aç ve şu satırları yapıştır".
4. **Gönder** (`SendMessage`, `to`: oturum kimliği). Oturumu bu turda açtıysan mesaj `prompt` ile zaten gitti; yeniden gönderme. Mesaj kısa olur, içerik dosyadadır; yol proje köküne göre yazılır:
   ```
   DEVİR: docs/devir/<iş adı>.md
   ROL: kod            (ya da: ROL: tasarım)
   Bu dosyayı baştan sona oku ve uygula. Raporun gideceği oturum: <kendi oturum kimliğin>.
   ```
   Betik "Kullanıcının sözü" alıntılarını konuşmandaki kullanıcı mesajlarında arar; bulamadığını bir kez geri çevirir ve hangisi olduğunu söyler. Alıntıyı düzelt.
5. **Nöbet.** İşi gönderdikten sonra arka planda sessizlik nöbetini başlat (komutu arka planda çalıştır): `node .claude/teke/araclar/nobet.js kod --tarif docs/devir/<iş adı>.md` (tasarım için `tasarim`). Oturum 13 dakika hiçbir şey yazmazsa ya da rapor yazılınca betik biter ve seni uyandırır; "SESSİZ" derse oturum listesinden durumuna bak (uzun bir komutun bitmesini bekliyor da olabilir). Oturum kullanıcının `/compact` yazmasını beklerken nöbet başlatma. Uzun sürecek işte bilgisayarın uyumaması için `request_keep_awake` iste: uyuyan bilgisayarda oturumlar donar. İstek reddedilirse yeniden deneme; kullanıcıya bir kez söyle. `EK:` ile gönderdiğin düzeltme turunda da nöbeti aynı `--tarif` ile başlat.
6. **Kullanıcıya tek satır:** ne gitti, hangi oturuma, bitince ne olacak.
7. **Rapor gelince** `is-kapat` becerisini uygula.
