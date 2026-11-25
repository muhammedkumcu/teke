#!/usr/bin/env node
// Bakım: şişen ve bayatlayan kaydı bulur; eskiyeni arşive KELİMESİ KELİMESİNE taşır. Hiçbir şey silmez, hiçbir işi durdurmaz.
//
//   node .claude/teke/araclar/bakim.js                 rapor (ne şişmiş, ne bayat)
//   node .claude/teke/araclar/bakim.js --arsivle       "KAPANDI:" satırı taşıyan iş tariflerini arşive taşır
//   node .claude/teke/araclar/bakim.js --tasi <dosya> --baslik "<desen>"   başlığı desene uyan bölümleri arşive taşır
//   node .claude/teke/araclar/bakim.js --tasi <dosya> --madde "<desen>"    desene uyan maddeleri (ve tablo satırlarını) arşive taşır
//        [--hedef <arşiv dosyası>] [--prova]
// Desen büyük-küçük harf duyarsız düzenli ifadedir ve satırın tamamında aranır: çok uzun satırlı belgede dar yaz
// (ör. "^- \*\*\S+ \[K\]") ve önce --prova ile neyin taşınacağına bak. Neye karar verirsen betik yalnız onu taşır.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
// İngilizce seçenek adları da geçerlidir: --archive, --move, --heading, --item, --to, --dry-run.
const { projeKoku, ayarOku, belgeYolu, belgeAdi, devirKlasoru, arsivKlasoru, oku, paket, m, bayraklariCevir, TARIF_DEGIL, KAPANDI_SATIRI, RAPOR_BASLIGI } = require("../kancalar/ortak");

const HABER_KB = { "CLAUDE.md": 20, "DEVAM.md": 16, "docs/DERSLER.md": 40, "docs/KARARLAR.md": 80 };
const DIGER_KB = 48;          // adı geçmeyen kök ve docs/ belgeleri için
const HAFIZA_DIZIN_KB = 10;   // hafıza dizini (her oturumda yüklenir)
const HAFIZA_NOT_KB = 20;
const kb = (n) => Math.round(n / 1024);
const boyut = (y) => { try { return fs.statSync(y).size; } catch { return -1; } };

function git(kok, args) {
  try { return execFileSync("git", args, { cwd: kok, stdio: ["ignore", "pipe", "ignore"], timeout: 8000 }).toString().trim(); } catch { return null; }
}

function devirDosyalari(kok, ayar) {
  const k = devirKlasoru(kok, ayar);
  let d = [];
  try { d = fs.readdirSync(k).filter((f) => f.endsWith(".md") && !TARIF_DEGIL.test(f)); } catch {}
  return d.map((f) => {
    const y = path.join(k, f);
    const ic = oku(y) || "";
    return { ad: f, yol: y, kapandi: KAPANDI_SATIRI.test(ic), rapor: RAPOR_BASLIGI.test(ic), gun: (Date.now() - fs.statSync(y).mtimeMs) / 86400000 };
  });
}

// Rapor: { haberler: [...] }. Oturum açılışında da çağrılır; hızlı ve salt-okurdur.
function denetle(kok, ayar) {
  const h = [];
  const esik = { ...HABER_KB, ...((ayar.belge && ayar.belge.haberKB) || {}) };
  const bilinen = new Set();
  for (const [ad, sinir] of Object.entries(esik)) {
    const y = belgeYolu(kok, ayar, ad);
    bilinen.add(path.resolve(y).toLowerCase());
    const b = boyut(y);
    if (b > sinir * 1024) h.push(m("bakim.sisen", "{ad} {kb} KB (haber eşiği {sinir} KB): eskiyen bölümleri arşive taşı (bakim.js --tasi).", { ad: belgeAdi(kok, ayar, ad), kb: kb(b), sinir }));
  }
  for (const klasor of [kok, path.join(kok, ayar.belgeKoku || "", "docs")]) {
    let d = [];
    try { d = fs.readdirSync(klasor).filter((f) => /\.md$/i.test(f)); } catch {}
    for (const f of d) {
      const y = path.join(klasor, f);
      if (bilinen.has(path.resolve(y).toLowerCase())) continue;
      const b = boyut(y);
      if (b > DIGER_KB * 1024) h.push(m("bakim.diger", "{ad} {kb} KB: kapanmış ve eskimiş bölümleri arşive taşınabilir.", { ad: path.relative(kok, y).replace(/\\/g, "/"), kb: kb(b) }));
    }
  }

  // hafıza notları (salt-okuma; yalnız haber)
  try {
    const hafiza = path.join(os.homedir(), ".claude", "projects", path.resolve(kok).replace(/[^a-zA-Z0-9]/g, "-"), "memory");
    const dizin = boyut(path.join(hafiza, "MEMORY.md"));
    if (dizin > HAFIZA_DIZIN_KB * 1024) h.push(m("bakim.hafiza.dizin", "Hafıza dizini (MEMORY.md) {kb} KB ve her oturumda yükleniyor: satırları kısalt, eskiyen notları birleştir.", { kb: kb(dizin) }));
    for (const f of fs.readdirSync(hafiza)) {
      const b = boyut(path.join(hafiza, f));
      if (f !== "MEMORY.md" && b > HAFIZA_NOT_KB * 1024) h.push(m("bakim.hafiza.not", "Hafıza notu {ad} {kb} KB: durum ve plan içeriyorsa belgeye taşı, notu kısalt.", { ad: f, kb: kb(b) }));
    }
  } catch {}

  // karar numarası bayatlığı: DEVAM "K3-K17" gibi bir aralık söylüyor ama defterde daha büyüğü var
  const devam = oku(belgeYolu(kok, ayar, "DEVAM.md")) || "";
  const kararlar = oku(belgeYolu(kok, ayar, "docs/KARARLAR.md")) || "";
  // Karar numarasının ön harfi (Türkçe K3, İngilizce D3). Defterde kurulum dilinin harfi hiç geçmiyorsa öteki dilinki denenir
  // (dili sonradan değiştirilen projede defter eski dilde kalır).
  const harfler = [...new Set([String(paket(kok).kararOnek || "K").replace(/[^A-Za-z]/g, "") || "K", "K", "D"])];
  const K = harfler.find((h) => new RegExp(`\\b${h}\\d{1,4}\\b`).test(kararlar)) || harfler[0];
  const enBuyuk = (t) => Math.max(0, ...[...t.matchAll(new RegExp(`\\b${K}(\\d{1,4})\\b`, "g"))].map((x) => Number(x[1])));
  const aralik = devam.match(new RegExp(`\\b${K}\\d{1,4}\\s*[-–]\\s*${K}(\\d{1,4})\\b`));
  if (aralik && enBuyuk(kararlar) > Number(aralik[1])) {
    h.push(m("bakim.karar", "{ad} kararları {k}{son}'e kadar sayıyor, defterde {k}{buyuk} var: DEVAM bayat.", { ad: belgeAdi(kok, ayar, "DEVAM.md"), k: K, son: aralik[1], buyuk: enBuyuk(kararlar) }));
  }

  // DEVAM uzun süredir güncellenmedi mi (commit sayısıyla)
  if (devam && git(kok, ["rev-parse", "--is-inside-work-tree"]) === "true") {
    const ad = belgeAdi(kok, ayar, "DEVAM.md");
    const son = git(kok, ["log", "-1", "--format=%H", "--", ad]);
    const n = son ? Number(git(kok, ["rev-list", "--count", son + "..HEAD"]) || 0) : 0;
    if (n >= 15) h.push(m("bakim.bayat", "{ad} son {n} commit'tir güncellenmedi: \"şu an / sıradaki\" bayat olabilir.", { ad, n }));
  }

  // iş tarifleri
  const d = devirDosyalari(kok, ayar);
  const kapali = d.filter((x) => x.kapandi);
  if (kapali.length) h.push(m("bakim.kapali", "{n} kapanmış iş tarifi arşive taşınabilir: node .claude/teke/araclar/bakim.js --arsivle", { n: kapali.length }));
  const askida = d.filter((x) => x.rapor && !x.kapandi && x.gun > 2);
  if (askida.length) h.push(m("bakim.askida", "Raporu yazılmış ama kapatılmamış iş tarifi: {liste} (is-kapat).", { liste: askida.map((x) => x.ad).join(", ") }));
  const eskiAcik = d.filter((x) => !x.rapor && !x.kapandi && x.gun > 14);
  if (eskiAcik.length) h.push(m("bakim.eskiacik", "İki haftadır raporu gelmeyen iş tarifi: {liste}; sürüyor mu, vazgeçildi mi?", { liste: eskiAcik.map((x) => x.ad).join(", ") }));

  return { haberler: h };
}

// ---------- taşıma ----------
function ayAdi() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
}
function bugun() {
  const t = new Date();
  return `${String(t.getDate()).padStart(2, "0")}.${String(t.getMonth() + 1).padStart(2, "0")}.${t.getFullYear()}`;
}

// Metni (kalan, taşınan parçalar) diye ikiye ayırır. Kod çitlerinin içine bakmaz.
function ayir(metin, tur, desen) {
  // Türkçe İ/I/ı farkı büyük-küçük harf duyarsız aramayı bozar ("sıradaki" ile "SIRADAKİ" eşleşmez):
  // desen hem olduğu gibi hem de bu üç harf "i"ye indirilmiş hâliyle denenir.
  const tr = (x) => x.replace(/[İIı]/g, "i");
  const re1 = new RegExp(desen, "iu");
  const re2 = new RegExp(tr(desen), "iu");
  const re = { test: (x) => re1.test(x) || re2.test(tr(x)) };
  const s = metin.split(/\r?\n/);
  const tasinan = [];
  const kalan = [];
  // Taşınan parçanın ardında kalan boş satırlar: önceki satır da boşsa atılır (çift boşluk bırakmamak için).
  const dikisiTemizle = (i) => {
    while (i + 1 < s.length && !s[i + 1].trim() && (!kalan.length || !kalan[kalan.length - 1].trim())) i++;
    return i;
  };
  let cit = false;
  const girinti = (x) => x.match(/^\s*/)[0].length;
  const maddeMi = (x) => /^\s*([-*+]|\d+[.)])\s+/.test(x);
  for (let i = 0; i < s.length; i++) {
    const x = s[i];
    if (/^\s*(```|~~~)/.test(x)) { cit = !cit; kalan.push(x); continue; }
    if (cit) { kalan.push(x); continue; }
    if (tur === "baslik") {
      const b = x.match(/^(#{1,6})\s+(.*)$/);
      if (b && re.test(b[2])) {
        const seviye = b[1].length;
        let j = i + 1;
        let ic = false;
        for (; j < s.length; j++) {
          if (/^\s*(```|~~~)/.test(s[j])) ic = !ic;
          if (ic) continue;
          const n = s[j].match(/^(#{1,6})\s+/);
          if (n && n[1].length <= seviye) break;
        }
        tasinan.push(s.slice(i, j).join("\n").replace(/\n+$/, ""));
        i = j - 1;
        continue;
      }
    } else {
      if (/^\s*\|/.test(x) && !/^\s*\|[\s:|-]+\|\s*$/.test(x) && re.test(x)) { tasinan.push(x); i = dikisiTemizle(i); continue; }
      if (maddeMi(x) && re.test(x)) {
        const g = girinti(x);
        let j = i + 1;
        for (; j < s.length; j++) {
          const y = s[j];
          if (!y.trim()) { // boş satır: ardından daha girintili devam geliyorsa maddeye dahil
            if (j + 1 < s.length && s[j + 1].trim() && girinti(s[j + 1]) > g) continue;
            break;
          }
          if (/^#{1,6}\s/.test(y)) break;
          if (girinti(y) <= g && (maddeMi(y) || /^\s*\|/.test(y))) break;
          if (girinti(y) <= g && !maddeMi(y) && j > i + 1 && !s[j - 1].trim()) break;
        }
        tasinan.push(s.slice(i, j).join("\n").replace(/\n+$/, ""));
        i = dikisiTemizle(j - 1);
        continue;
      }
    }
    kalan.push(x);
  }
  // Dosyanın satır sonu biçimi korunur (CRLF ise CRLF kalır); taşınmayan içerik değişmez.
  const son = /\r\n/.test(metin) ? "\r\n" : "\n";
  return { kalan: kalan.join(son), tasinan, son };
}

function tasi(kok, ayar, dosya, tur, desen, hedef, prova) {
  const kaynak = path.resolve(kok, dosya);
  const metin = oku(kaynak);
  if (metin === null) return { hata: m("bakim.okunamadi", "dosya okunamadı: {dosya}", { dosya }) };
  const { kalan, tasinan } = ayir(metin, tur, desen);
  if (!tasinan.length) return { adet: 0 };
  const hedefYol = hedef ? path.resolve(kok, hedef) : path.join(arsivKlasoru(kok, ayar), `${path.basename(dosya, ".md")}-${ayAdi()}.md`);
  const ek = "\n## " + m("bakim.arsiv.baslik", "{dosya} dosyasından taşındı ({tarih})", { dosya: path.relative(kok, kaynak).replace(/\\/g, "/"), tarih: bugun() }) + "\n\n" + tasinan.join("\n\n") + "\n";
  const bayt = Buffer.byteLength(tasinan.join("\n"), "utf8");
  if (!prova) {
    fs.mkdirSync(path.dirname(hedefYol), { recursive: true });
    const once = boyut(hedefYol);
    fs.appendFileSync(hedefYol, (once > 0 ? "" : m("bakim.arsiv.giris", "# Arşiv — {dosya}\n\n> Kelimesi kelimesine taşınan eski içerik. Düzenlenmez.\n", { dosya: path.basename(dosya) })) + ek);
    if (boyut(hedefYol) < Math.max(once, 0) + bayt) return { hata: m("bakim.yazilamadi", "arşive yazılamadı; kaynak değiştirilmedi") };
    fs.writeFileSync(kaynak, kalan);
  }
  return { adet: tasinan.length, bayt, hedef: path.relative(kok, hedefYol).replace(/\\/g, "/"), kalanBayt: Buffer.byteLength(kalan, "utf8"), ornek: tasinan.slice(0, 3).map((t) => t.split("\n")[0].slice(0, 90)) };
}

function arsivle(kok, ayar, prova) {
  const hedef = path.join(arsivKlasoru(kok, ayar), path.basename(paket(kok).devirKlasoru));
  const tasinanlar = [];
  for (const d of devirDosyalari(kok, ayar).filter((x) => x.kapandi)) {
    let varis = path.join(hedef, d.ad);
    if (fs.existsSync(varis)) varis = path.join(hedef, d.ad.replace(/\.md$/, `-${Date.now()}.md`));
    if (!prova) { fs.mkdirSync(hedef, { recursive: true }); fs.renameSync(d.yol, varis); }
    tasinanlar.push(d.ad);
  }
  return tasinanlar;
}

if (require.main === module) {
  bayraklariCevir();
  const arg = (ad) => { const i = process.argv.indexOf("--" + ad); return i >= 0 ? process.argv[i + 1] : undefined; };
  const bayrak = (ad) => process.argv.includes("--" + ad);
  const kok = projeKoku({});
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) { console.log(m("bakim.kurulu.degil", "Kit bu klasörde kurulu değil.")); process.exit(1); }
  const ayar = ayarOku(kok);
  const prova = bayrak("prova");
  const provaOn = prova ? m("prova.on", "PROVA — ") : "";
  const HATA = m("hata.on", "HATA: ");
  if (arg("tasi")) {
    const tur = arg("baslik") ? "baslik" : arg("madde") ? "madde" : null;
    if (!tur) { console.log(m("bakim.tasi.eksik", "--tasi için --baslik <desen> ya da --madde <desen> gerekli.")); process.exit(2); }
    let s;
    try { s = tasi(kok, ayar, arg("tasi"), tur, arg(tur), arg("hedef"), prova); } catch (e) { console.log(HATA + e.message); process.exit(2); }
    if (s.hata) { console.log(HATA + s.hata); process.exit(2); }
    if (!s.adet) { console.log(m("bakim.tasi.yok", "Desene uyan parça yok; hiçbir şey taşınmadı.")); process.exit(0); }
    console.log(provaOn + m("bakim.tasi.tamam", "{n} parça ({kb} KB) → {hedef}. Kaynak şimdi {kalan} KB.", { n: s.adet, kb: kb(s.bayt), hedef: s.hedef, kalan: kb(s.kalanBayt) }));
    for (const o of s.ornek) console.log("  · " + o);
    process.exit(0);
  }
  if (bayrak("arsivle")) {
    const t = arsivle(kok, ayar, prova);
    console.log(t.length ? provaOn + m("bakim.arsivle.tamam", "{n} kapanmış iş tarifi arşive taşındı: {liste}", { n: t.length, liste: t.join(", ") }) : m("bakim.arsivle.yok", "Arşive taşınacak kapanmış iş tarifi yok."));
  }
  const { haberler } = denetle(kok, ayar);
  console.log(haberler.length ? m("bakim.haber", "Bakım: {n} haber", { n: haberler.length }) + "\n- " + haberler.join("\n- ") : m("bakim.temiz", "Bakım: temiz."));
  process.exit(0);
}

module.exports = { denetle, tasi, ayir, arsivle };
