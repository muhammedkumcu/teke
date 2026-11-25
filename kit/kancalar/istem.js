// Betik: UserPromptSubmit (her kullanıcı mesajında)
// 1) Oturumun rolünü ilk mesajdan öğrenir ve hatırlar ("ROL: kod" satırı).
// 2) Bağlam doluluğunu oturum kaydından ölçer; YALNIZ eşik aşıldığında tek satır ekler.
// 3) Orkestratörde uzun süredir ders taraması yapılmadıysa tek satır hatırlatır.
// 4) Orkestratörde kullanıcı "devam" dediğinde kullanıcıdan beklenenlerin listesini hatırlatır.
// Söyleyecek bir şey yoksa hiçbir şey eklemez.
const fs = require("fs");
const path = require("path");
const { girdiOku, projeKoku, ayarOku, baglamEkle, guvenli, rolAyrinti, rolSatiri, rolBasligi, rolAcik, metindenRol, devirMesajiMi, devirleBasliyor, durumOku, durumYaz, baglamOlc, baglamHaberi, katla, belgeAdi, bekleyenler, kullanicidanMi, paket, m } = require("./ortak");

// Mesajın tamamı bir "sürdür" sözü mü: devam, devam et, tamam devam, sürdür, kaldığın yerden devam… ("devam etme",
// "neden devam etmedin" gibi içinde yalnızca "devam" geçen mesajlar sayılmaz). katla() sonrası metne uygulanır.
const ON_SOZ = "(?:tamam|tamamdir|ok|okay|evet|peki|hadi|olur|oldu|lütfen|lutfen|yes|sure|alright|please)";
const SURDUR = "(?:devam(?:\\s+(?:et|edelim|edebilirsin|edebiliriz|edin))?|sürdür|surdur|kaldi[gğ]in\\s+yerden(?:\\s+(?:devam(?:\\s+et)?|sürdür|surdur))?|continue|go\\s+on|go\\s+ahead|keep\\s+going|carry\\s+on|proceed|resume)";
const DEVAM_SOZU = new RegExp(`^(?:${ON_SOZ}[\\s,.]*)*${SURDUR}(?:[\\s,.]*(?:${ON_SOZ}|bakalim))*[\\s.!]*$`);

guvenli(async () => {
  const g = await girdiOku();
  if (!g.session_id) process.exit(0); // oturum kimliği olmayan çağrı (ör. sağlık kontrolü): iz bırakma
  const kok = projeKoku(g);
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) process.exit(0);
  const ayar = ayarOku(kok);
  const d = durumOku(kok, g.session_id);
  const p = [];

  // 1) rol
  const istem = String(g.prompt || "");
  const onceki = d.rol;
  // Açıkça verilmiş rolü yalnız bu oturuma gelen bir devir mesajı (DEVİR: + ROL:) ya da rol aracı değiştirir.
  // Çıkarılmış ya da varsayılmış rolü, ilk satırı "ROL: …" olan mesaj da düzeltir (kit kurulmadan önce açılmış oturum).
  // Devir mesajı başka oturumdan gelir. Kullanıcının kendi yazdığı mesajda geçen DEVİR ve ROL satırları (ör. "şunu kod
  // oturumuna gönder: …") orkestratörün rolünü değiştirmez; kullanıcı devri elle yapıştırıyorsa (oturumu kendisi açtıysa)
  // mesaj DEVİR satırıyla başlar ve yalnız rolü açıkça verilmemiş oturumda geçerlidir.
  const insandan = kullanicidanMi(istem);
  if (devirMesajiMi(istem) && (!insandan || (!rolAcik(d) && devirleBasliyor(istem)))) { d.rol = rolSatiri(istem); d.rolKaynak = "satir"; }
  else if (!rolAcik(d)) {
    const bas = rolBasligi(istem);
    if (bas) { d.rol = bas; d.rolKaynak = "satir"; }
    else if (!d.rol) {
      const a = rolAyrinti(g, kok);
      if (a.kaynak !== "varsayim") { d.rol = a.rol; d.rolKaynak = a.kaynak; }
      else if (a.ilk && a.ilk.yok) {
        // Kayıtta henüz mesaj yok: bu mesaj oturumun ilk mesajıdır.
        const r = metindenRol(istem);
        d.rol = r || "orkestrator";
        d.rolKaynak = r ? (rolSatiri(istem.slice(0, 8000)) ? "satir" : "kayit") : "kayit";
      }
    }
  }
  const rol = d.rol || "orkestrator";
  if (g.transcript_path) d.kayit = g.transcript_path;
  if (rol !== "orkestrator" && rol !== onceki) {
    p.push(m("istem.rol", "[teke] Bu oturumun rolü: {rol}. Kullanıcıya soru sorma; sorun olursa orkestratöre SORU: mesajı gönder. Betiğin reddettiği komutu çalıştırma, raporunda yaz. Kayıt belgelerini (durum, karar, ders) orkestratör yazar; proje yasası bir belgeyi sana yazdırıyorsa o geçerlidir. Raporunu iş tarifinin sonuna yaz ve orkestratöre RAPOR: mesajı gönder.", { rol: paket(kok).rolAdlari[rol] }));
  }
  // Rol bilinmiyor (kit kurulmadan önce açılmış, compact edilmiş oturum): bir kez söylenir, oturum rolünü kendisi kaydeder.
  if (!d.rol && !d.rolSoruldu) {
    d.rolSoruldu = true;
    p.push(m("istem.rol.bilinmiyor", "[teke] Bu oturumun rolü kayıtlı değil; ilk mesajı görülemediği için orkestratör varsayılıyor. Hangi oturum olduğunu biliyorsun: rolünü bir kez kaydet, sonra işine dön: node .claude/teke/araclar/rol.js {id} orkestrator   (kod oturumuysan sona kod, tasarım oturumuysan tasarim yaz)", { id: g.session_id }));
  }

  // 2) bağlam
  const haber = baglamHaberi(ayar, d, g.transcript_path ? baglamOlc(g.transcript_path, ayar) : null, rol);
  if (haber) p.push(haber);
  d.sonOlcum = Date.now();

  // 3) ders taraması hatırlatması (yalnız orkestratörde; başka oturumdan ya da uygulamadan gelen mesaj sayılmaz)
  const kullanicidan = insandan;
  if (rol === "orkestrator" && kullanicidan) {
    d.mesajSayisi = (d.mesajSayisi || 0) + 1;
    const esik = (ayar.ders && ayar.ders.hatirlatMesaj) || 25;
    if (d.mesajSayisi >= esik && d.mesajSayisi % esik === 0) {
      p.push(m("istem.ders", "[teke ders] Son ders taramasından beri {n} kullanıcı mesajı var. Uygun bir iş arasında: node .claude/teke/araclar/ders-tara.js", { n: d.mesajSayisi }));
    }
  }

  // 4) bekleyenler: kullanıcı "devam" dediyse ondan beklenenler gösterilmeden sürülmez
  if (rol === "orkestrator" && kullanicidan && DEVAM_SOZU.test(katla(istem))) {
    const liste = bekleyenler(kok, ayar);
    const ad = belgeAdi(kok, ayar, "DEVAM.md");
    if (liste && liste.length) {
      const kisa = liste.slice(0, 12).map((s) => (s.length > 240 ? s.slice(0, 240) + "…" : s));
      p.push(m("istem.bekleyen.var", "[teke bekleyenler] Kullanıcı sürdürmeni istedi; {ad} dosyasında ondan beklenen {n} madde var:", { ad, n: liste.length }) + "\n" + kisa.join("\n") +
        (liste.length > 12 ? "\n" + m("istem.bekleyen.fazla", "…({n} madde daha dosyada)", { n: liste.length - 12 }) : "") + "\n" +
        m("istem.bekleyen.yap", "Yanıtında bunları iki grupta göster: işi durduranlar ve durdurmayanlar (hangi varsayımla sürdüğünle). Bu mesaj maddeleri cevaplamış sayılmaz. Cevaplanmış olanı listeden çıkar; konuşmada sorup listeye yazmadığın varsa ekle."));
    } else if (liste) {
      p.push(m("istem.bekleyen.bos", "[teke bekleyenler] Kullanıcı sürdürmeni istedi; {ad} dosyasındaki bekleyenler listesi boş. Konuşmada sorup cevabını almadığın bir şey varsa önce listeye yaz ve göster; yoksa yanıtında tek cümleyle ondan beklediğin bir şey olmadığını söyle.", { ad }));
    }
  }

  durumYaz(kok, g.session_id, d);
  if (!p.length) process.exit(0);
  baglamEkle("UserPromptSubmit", p.join("\n"));
});
