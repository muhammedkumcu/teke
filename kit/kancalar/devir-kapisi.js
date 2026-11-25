// Betik: PreToolUse (SendMessage | send_message | start_session)
// Amaç: kullanıcının sözü başka oturuma DEĞİŞTİRİLEREK gitmesin.
// Mesajda "DEVİR: <dosya>.md" satırı varsa iş tarifini açar; "Kullanıcının sözü" bölümündeki alıntıların
// orkestratörün kendi konuşmasında kullanıcı tarafından gerçekten yazıldığını arar. Bulamadığı alıntıyı BİR KEZ
// geri çevirir ve hangisi olduğunu söyler; aynı tarif ikinci kez gönderilirse durdurmaz (betik yanılabilir, kilit yok).
// Devir olmayan mesajlara ve kendi biçimini kullanan tariflere karışmaz.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { girdiOku, projeKoku, reddet, cikar, guvenli, oku, katla, yalin, rolBul, durumOku, durumYaz, kullaniciSozu, kullaniciSatiriMi, DEVIR_SATIRI, m } = require("./ortak");

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

// Alıntıları oturum kaydında, kullanıcının KENDİ yazdığı mesajlarda arar (compact özeti, başka oturumdan gelen
// mesajlar ve araç çıktıları sayılmaz). Kayıt SONDAN başa doğru okunur: devredilen söz çoğunlukla son mesajlardadır,
// alıntıların hepsi bulununca okuma biter; yüzlerce MB'lik kayıtta da çabuk sonuç verir.
// Döner: { yok: bulunamayan alıntılar, tam: kaydın tamamı okundu mu (süre sınırına takılmadıysa true) }.
function kayittaAra(kayitYolu, obekler, sinirMs) {
  const bas = Date.now();
  const boyut = fs.statSync(kayitYolu).size;
  const fd = fs.openSync(kayitYolu, "r");
  const PARCA = 4 * 1024 * 1024;
  const parcalar = [];
  let konum = boyut;
  let artik = Buffer.alloc(0); // parçanın başında yarım kalan satır (baytlar olarak: çok baytlı harf bölünmesin)
  let yok = uymayanlar(obekler, "");
  const isle = (x) => {
    if (!kullaniciSatiriMi(x)) return;
    let o;
    try { o = JSON.parse(x); } catch { return; }
    const s = kullaniciSozu(o);
    if (s) parcalar.push(yalin(s));
  };
  try {
    while (konum > 0 && yok.length) {
      if (Date.now() - bas > sinirMs) return { yok, tam: false };
      const n = Math.min(PARCA, konum);
      const tampon = Buffer.alloc(n);
      fs.readSync(fd, tampon, 0, n, konum - n);
      konum -= n;
      const hepsi = Buffer.concat([tampon, artik]);
      let metin;
      if (konum > 0) {
        const ilkSatirSonu = hepsi.indexOf(0x0a);
        if (ilkSatirSonu < 0) { artik = hepsi; continue; } // tek satır parçadan uzun: bir önceki parçayla birleşecek
        artik = hepsi.subarray(0, ilkSatirSonu);
        metin = hepsi.toString("utf8", ilkSatirSonu + 1);
      } else {
        artik = Buffer.alloc(0);
        metin = hepsi.toString("utf8");
      }
      const once = parcalar.length;
      for (const x of metin.split("\n")) isle(x);
      if (parcalar.length > once) yok = uymayanlar(obekler, parcalar.join("\n"));
    }
  } finally { fs.closeSync(fd); }
  return { yok, tam: true };
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

  const { yok, tam } = kayittaAra(g.transcript_path, obekler, 7000);
  if (yok.length && !tam) {
    // Kayıt çok büyük, süre yetmedi: alıntı eski bir mesajda olabilir. Engellenmez ama sessiz de geçilmez.
    cikar({ systemMessage: m("devir.atlandi", "[teke] Söz denetimi tamamlanamadı: oturum kaydı çok büyük, {n} alıntı kaydın okunabilen son bölümünde bulunamadı. İş tarifi gönderildi; alıntıların kullanıcının sözüyle aynı olduğunu sen doğrula.", { n: yok.length }) });
    process.exit(0);
  }
  if (yok.length) {
    bir_kez(m("devir.uymuyor", "\"{dosya}\" içindeki şu alıntı(lar) kullanıcının bu konuşmadaki mesajlarında bu hâliyle geçmiyor:", { dosya: anahtar }) + "\n" + yok.slice(0, 4).map((a) => `- "${a.length > 160 ? a.slice(0, 160) + "…" : a}"`).join("\n") + "\n" +
      m("devir.uymuyor.yap", "Kullanıcının sözünü özetleme, düzeltme; konuşmadan aynen kopyala (yazım hataları dahil). Kendi çıkarımın \"Yorumum\" bölümüne gider. Söz bir belgeden ya da önceki bir oturumdan geliyorsa alıntının sonuna \"(kaynak: <dosya>)\" yaz. Alıntı gerçekten aynen kullanıcının sözüyse ve bu uyarı yanlışsa aynı tarifi yeniden gönder; ikinci kez durdurulmaz."));
  }
  process.exit(0);
});

module.exports = { sozler, uymayanlar, kayittaAra };
