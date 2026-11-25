// Betik: PreToolUse (SendMessage | send_message | start_session)
// Amaç: kullanıcının sözü başka oturuma DEĞİŞTİRİLEREK gitmesin.
// Mesajda "DEVİR: <dosya>.md" satırı varsa iş tarifini açar; "Kullanıcının sözü" bölümündeki alıntıların
// orkestratörün kendi konuşmasında kullanıcı tarafından gerçekten yazıldığını arar. Bulamadığı alıntıyı BİR KEZ
// geri çevirir ve hangisi olduğunu söyler; aynı tarif ikinci kez gönderilirse durdurmaz (betik yanılabilir, kilit yok).
// Devir olmayan mesajlara ve kendi biçimini kullanan tariflere karışmaz.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { girdiOku, projeKoku, reddet, guvenli, oku, katla, yalin, rolBul, durumOku, durumYaz, kullaniciSozu, kullaniciSatiriMi, DEVIR_SATIRI, m } = require("./ortak");

// "Kullanıcının sözü" başlığı altındaki alıntı öbeklerini döndürür (her öbek art arda gelen "> " satırlarıdır);
// bölüm yoksa null.
function sozler(tarif) {
  const s = tarif.split(/\r?\n/);
  const i = s.findIndex((x) => /^#{1,4}\s/.test(x) && /kullanicinin\s+s[öo]z[üu]|user[’']?s\s+(own\s+)?words/.test(katla(x)));
  if (i < 0) return null;
  const obekler = [];
  let simdiki = [];
  const kapat = () => { if (simdiki.length) { obekler.push(simdiki); simdiki = []; } };
  for (let j = i + 1; j < s.length && !/^#{1,4}\s/.test(s[j]); j++) {
    const m = s[j].match(/^\s*>\s?(.*)$/);
    if (m && m[1].trim()) simdiki.push(m[1].trim()); else kapat();
  }
  kapat();
  return obekler;
}
const yerTutucu = (a) => /^<.*>$/.test(a);
const kaynakli = (a) => /\((kaynak|source)\s*:[^)]+\)\s*$/i.test(a);
// Söz bölümü bilerek boş bırakıldı mı ("Kullanıcı bu işi sözle tarif etmedi" / "The user did not describe this task in words")?
const SOZ_YOK = /kullan[ıi]c[ıi]\s+(bu\s+i[sş]i\s+)?s[öo]zle\s+tarif\s+etmedi|user\s+did\s+not\s+describe\s+this\s+(task|work)\s+in\s+words/i;

// Konuşmada geçmeyen alıntıları döndürür. Bir öbek ya bütün olarak (satırlara bölünmüş tek söz) ya da satır satır
// (alt alta yazılmış ayrı sözler) aranır.
function uymayanlar(obekler, metin) {
  const yok = [];
  for (const obek of obekler) {
    const satirlar = obek.filter((a) => !yerTutucu(a) && !kaynakli(a));
    if (!satirlar.length || kaynakli(obek[obek.length - 1])) continue;
    const butun = yalin(satirlar.join(" "));
    if (butun.length < 12 || metin.includes(butun)) continue;
    for (const a of satirlar) if (yalin(a).length >= 12 && !metin.includes(yalin(a))) yok.push(a);
  }
  return yok;
}

// Oturum kaydında kullanıcının KENDİ yazdığı mesajların yalın (yalnız harf ve rakam) birleşimi.
// Compact özeti, başka oturumdan gelen mesajlar ve araç çıktıları sayılmaz. Süre sınırı aşılırsa null.
function konusma(kayitYolu, sinirMs) {
  const bas = Date.now();
  const fd = fs.openSync(kayitYolu, "r");
  const tampon = Buffer.alloc(4 * 1024 * 1024);
  const parcalar = [];
  let konum = 0;
  let artik = "";
  const isle = (x) => {
    if (!kullaniciSatiriMi(x)) return;
    let o;
    try { o = JSON.parse(x); } catch { return; }
    const m = kullaniciSozu(o);
    if (m) parcalar.push(yalin(m));
  };
  try {
    for (;;) {
      if (Date.now() - bas > sinirMs) return null;
      const n = fs.readSync(fd, tampon, 0, tampon.length, konum);
      if (!n) break;
      konum += n;
      const satirlar = (artik + tampon.toString("utf8", 0, n)).split("\n");
      artik = satirlar.pop();
      for (const x of satirlar) isle(x);
    }
    if (artik) isle(artik);
  } finally { fs.closeSync(fd); }
  return parcalar.join("\n");
}

if (require.main === module) guvenli(async () => {
  const g = await girdiOku();
  const kok = projeKoku(g);
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) process.exit(0);
  const girdi = g.tool_input || {};
  const mesaj = [girdi.message, girdi.prompt].filter((x) => typeof x === "string").join("\n");
  const e = mesaj.match(DEVIR_SATIRI);
  if (!e) process.exit(0);
  if (rolBul(g, kok) !== "orkestrator") process.exit(0);

  const tarifYolu = path.resolve(kok, e[1].trim());
  const tarif = oku(tarifYolu);
  if (tarif === null) reddet(m("devir.yok", "İş tarifi bulunamadı: {yol}. Önce dosyayı yaz (devir becerisi), sonra gönder.", { yol: e[1].trim() }));

  const ozet = crypto.createHash("sha1").update(tarif).digest("hex");
  const d = durumOku(kok, g.session_id);
  d.devirUyari = d.devirUyari || {};
  const anahtar = path.relative(kok, tarifYolu).replace(/\\/g, "/");
  const bir_kez = (neden) => {
    if (d.devirUyari[anahtar] === ozet) process.exit(0); // aynı tarif ikinci kez: durdurma
    d.devirUyari[anahtar] = ozet;
    durumYaz(kok, g.session_id, d);
    reddet(neden);
  };

  const obekler = sozler(tarif);
  if (obekler === null) process.exit(0); // kendi biçimini kullanan proje: karışma
  const hepsi = obekler.flat();
  const bos = hepsi.length === 0 || hepsi.every(yerTutucu);
  if (bos && !SOZ_YOK.test(tarif)) {
    bir_kez(m("devir.bos", "\"{dosya}\" içinde \"Kullanıcının sözü\" bölümü boş. Kullanıcının bu iş hakkında söylediklerini konuşmadan AYNEN kopyala (\"> \" ile başlayan satırlar). Hiç söz yoksa bölüme \"Kullanıcı bu işi sözle tarif etmedi\" yaz.", { dosya: anahtar }));
  }
  if (bos || !g.transcript_path || !fs.existsSync(g.transcript_path)) process.exit(0);

  const metin = konusma(g.transcript_path, 7000);
  if (metin === null) process.exit(0); // kayıt çok büyük, süre yetmedi: engelleme
  const yok = uymayanlar(obekler, metin);
  if (yok.length) {
    bir_kez(m("devir.uymuyor", "\"{dosya}\" içindeki şu alıntı(lar) kullanıcının bu konuşmadaki mesajlarında bu hâliyle geçmiyor:", { dosya: anahtar }) + "\n" + yok.slice(0, 4).map((a) => `- "${a.length > 160 ? a.slice(0, 160) + "…" : a}"`).join("\n") + "\n" +
      m("devir.uymuyor.yap", "Kullanıcının sözünü özetleme, düzeltme; konuşmadan aynen kopyala (yazım hataları dahil). Kendi çıkarımın \"Yorumum\" bölümüne gider. Söz bir belgeden ya da önceki bir oturumdan geliyorsa alıntının sonuna \"(kaynak: <dosya>)\" yaz. Alıntı gerçekten aynen kullanıcının sözüyse ve bu uyarı yanlışsa aynı tarifi yeniden gönder; ikinci kez durdurulmaz."));
  }
  process.exit(0);
});

module.exports = { sozler, uymayanlar };
