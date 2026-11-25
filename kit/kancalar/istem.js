// Betik: UserPromptSubmit (her kullanıcı mesajında)
// 1) Oturumun rolünü ilk mesajdan öğrenir ve hatırlar ("ROL: kod" satırı).
// 2) Bağlam doluluğunu oturum kaydından ölçer; YALNIZ eşik aşıldığında tek satır ekler.
// 3) Orkestratörde uzun süredir ders taraması yapılmadıysa tek satır hatırlatır.
// 4) Orkestratörde kullanıcı "devam" dediğinde kullanıcıdan beklenenlerin listesini hatırlatır.
// Söyleyecek bir şey yoksa hiçbir şey eklemez.
const fs = require("fs");
const path = require("path");
const { girdiOku, projeKoku, ayarOku, baglamEkle, guvenli, rolBul, metindenRol, devirMesajiMi, durumOku, durumYaz, baglamOlc, baglamHaberi, katla, belgeAdi, bekleyenler, kullanicidanMi, paket, m } = require("./ortak");

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
  const yazili = metindenRol(istem);
  const onceki = d.rol;
  // Rol bir kez belirlenir; sonradan yalnız bu oturuma gelen bir devir mesajı (DEVİR: + ROL:) değiştirebilir.
  if (yazili && (!d.rol || devirMesajiMi(istem))) d.rol = yazili;
  if (!d.rol) d.rol = rolBul(g, kok);
  if (g.transcript_path) d.kayit = g.transcript_path;
  if (d.rol !== "orkestrator" && d.rol !== onceki) {
    p.push(m("istem.rol", "[teke] Bu oturumun rolü: {rol}. Kullanıcıya soru sorma; sorun olursa orkestratöre SORU: mesajı gönder. Onay isteyen komutları çalıştırma, raporunda yaz. Kayıt belgelerine dokunma. Raporunu iş tarifinin sonuna yaz ve orkestratöre RAPOR: mesajı gönder.", { rol: paket(kok).rolAdlari[d.rol] }));
  }

  // 2) bağlam
  const haber = baglamHaberi(ayar, d, g.transcript_path ? baglamOlc(g.transcript_path, ayar) : null, d.rol);
  if (haber) p.push(haber);
  d.sonOlcum = Date.now();

  // 3) ders taraması hatırlatması (yalnız orkestratörde; başka oturumdan ya da uygulamadan gelen mesaj sayılmaz)
  const kullanicidan = kullanicidanMi(istem);
  if (d.rol === "orkestrator" && kullanicidan) {
    d.mesajSayisi = (d.mesajSayisi || 0) + 1;
    const esik = (ayar.ders && ayar.ders.hatirlatMesaj) || 25;
    if (d.mesajSayisi >= esik && d.mesajSayisi % esik === 0) {
      p.push(m("istem.ders", "[teke ders] Son ders taramasından beri {n} kullanıcı mesajı var. Uygun bir iş arasında: node .claude/teke/araclar/ders-tara.js", { n: d.mesajSayisi }));
    }
  }

  // 4) bekleyenler: kullanıcı "devam" dediyse ondan beklenenler gösterilmeden sürülmez
  if (d.rol === "orkestrator" && kullanicidan && DEVAM_SOZU.test(katla(istem))) {
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
