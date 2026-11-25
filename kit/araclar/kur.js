#!/usr/bin/env node
// Teke kurucusu. Soru sormaz; kit kaynağından çalıştırılır:
//   node <kit>/kit/araclar/kur.js --hedef <proje> [--dil tr|en] [--git-disi] [--ad "Proje adı"] [--prova]
// İngilizce seçenek adları da geçerlidir: --target, --lang, --untracked, --name, --dry-run.
// Aynı komut hem ilk kurulumu hem güncellemeyi yapar (kurulu kit varsa günceller, eski sürümün artık dosyalarını kaldırır).
// Dil ilk kurulumda seçilir (verilmezse Türkçe) ve ayarda saklanır; güncellemede yeniden yazmak gerekmez.
//
// İlkeler:
//  1) PROJE BELGELERİNE (yasa dosyası, DEVAM, docs/...) var iseler ASLA dokunulmaz.
//  2) Kitin daha önce kendi yazmadığı, aynı adlı bir kullanıcı dosyasının (ajan, beceri, kural) üzerine YAZILMAZ;
//     çakışma raporlanır. Kitin yazdığı dosyalar `.claude/teke/kurulu-dosyalar.json` içinde tutulur.
//  3) Hiçbir şey yazılmadan önce bütün ön kontroller yapılır (yarım kurulum bırakmamak için).
//  4) Yalnız kitin kendi yazdığı dosyalar kaldırılır (eski sürümden kalanlar).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { paketAyarla, m, bayraklariCevir } = require("../kancalar/ortak");

bayraklariCevir();
const KIT = path.resolve(__dirname, "..");            // .../kit
const KAYNAK = path.resolve(KIT, "..");               // kit deposunun kökü
const arg = (ad, vars) => {
  const i = process.argv.indexOf("--" + ad);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : vars;
};
const bayrak = (ad) => process.argv.includes("--" + ad);
const dur = (s) => { console.error(m("hata.on", "HATA: ") + s); process.exit(2); };
const jsonOku = (y) => JSON.parse(fs.readFileSync(y, "utf8").replace(/^﻿/, ""));
const dilPaketi = (d) => jsonOku(path.join(KIT, "dil", d, "dil.json"));
const dilVar = (d) => /^[a-z]{2,8}$/.test(String(d)) && fs.existsSync(path.join(KIT, "dil", d, "dil.json"));
const diller = () => fs.readdirSync(path.join(KIT, "dil")).filter(dilVar).join(", ");

// ---------- ön kontroller (hiçbir şey yazılmadan) ----------
// Dil açıkça verildiyse hata mesajları da o dilde yazılsın diye paket en başta yüklenir.
const dilIstenen = arg("dil");
let P = paketAyarla(null);
if (dilIstenen && !dilVar(dilIstenen)) dur(`--dil ${dilIstenen}: kit/dil/${dilIstenen}/dil.json yok / not found (${diller()}).`);
if (dilIstenen) P = paketAyarla(dilPaketi(dilIstenen));
// Kit kaynağındaki kişisel varsayılanlar (kit/ayarlar/kisisel.json; depoya girmez). İçindeki "dil" ilk kurulumun dilini belirler.
let kisisel = {};
try { kisisel = jsonOku(path.join(KIT, "ayarlar", "kisisel.json")); } catch {}

if (!arg("hedef")) dur(m("kur.hedef.gerek", "--hedef <proje klasörü> gerekli."));
const hedef = path.resolve(arg("hedef"));
const prova = bayrak("prova");
if (!fs.existsSync(hedef)) dur(m("kur.hedef.yok", "hedef klasör yok: {yol}", { yol: hedef }));
if (hedef.toLowerCase() === KAYNAK.toLowerCase() || hedef.toLowerCase().startsWith(KAYNAK.toLowerCase() + path.sep)) dur(m("kur.hedef.kaynak", "hedef, kit kaynağının kendisi ya da içi olamaz."));

const SURUM = fs.readFileSync(path.join(KAYNAK, "SURUM"), "utf8").trim();
const ork = path.join(hedef, ".claude", "teke");
const ayarYol = path.join(ork, "ayar.json");
// 2.2.0'dan önceki sürümler ".claude/orkestra" klasörünü kullanıyordu. Orada kurulum varsa yeni klasöre taşınır;
// ayarlar, oturum kimlikleri ve durum dosyaları korunur.
const ESKI_AD = "orkestra";
const eskiKlasor = path.join(hedef, ".claude", ESKI_AD);
const tasinacak = !fs.existsSync(ayarYol) && fs.existsSync(path.join(eskiKlasor, "ayar.json"));
const okuKok = tasinacak ? eskiKlasor : ork;
let eski = null;
if (fs.existsSync(path.join(okuKok, "ayar.json"))) {
  try { eski = jsonOku(path.join(okuKok, "ayar.json")); } catch { dur(m("kur.ayar.bozuk", ".claude/{klasor}/ayar.json var ama geçerli JSON değil; elle düzeltmeden kurulum ya da güncelleme yapılmaz.", { klasor: path.basename(okuKok) })); }
}
// Dil: açıkça verilen > kurulu olan > kişisel varsayılan > Türkçe. Dil sonradan değiştirilebilir; eski dilin kit dosyaları
// kaldırılır, proje belgeleri yerinde ve kendi adlarıyla kalır (ayarda eşlenir).
const eskiDil = eski ? (dilVar(eski.dil) ? eski.dil : "tr") : null;
const dil = dilIstenen || eskiDil || (dilVar(kisisel.dil) ? kisisel.dil : "tr");
P = paketAyarla(dilPaketi(dil));
const DIL = path.join(KIT, "dil", dil);
const dilDegisti = !!eski && eskiDil !== dil;

const eskiGitDisi = !!(eski && (eski.gitDisi || eski.mod === "misafir"));
if (eski && bayrak("git-disi") && !eskiGitDisi) dur(m("kur.gitdisi.degismez", "bu projede kit git içinde kurulu; kurulum türü sonradan değiştirilemez."));
const gitDisi = eski ? eskiGitDisi : bayrak("git-disi");
// Git dışı kurulumda belgelerin durduğu klasör: var olan kurulumda yeri değişmez (kullanıcının belgeleri taşınmaz).
const belgeKoku = eski && typeof eski.belgeKoku === "string" ? eski.belgeKoku : gitDisi ? (eski && fs.existsSync(path.join(hedef, "." + ESKI_AD)) ? "." + ESKI_AD : ".teke") : "";
const yasaDosyasi = gitDisi ? "CLAUDE.local.md" : "CLAUDE.md";
const ayarDosyasiAdi = gitDisi ? "settings.local.json" : "settings.json";
const setYol = path.join(hedef, ".claude", ayarDosyasiAdi);
let set = {};
if (fs.existsSync(setYol)) {
  try { set = jsonOku(setYol); } catch { dur(m("kur.set.bozuk", ".claude/{ad} geçerli JSON değil; elle düzeltmeden kurulum yapılmaz (hiçbir şey yazılmadı).", { ad: ayarDosyasiAdi })); }
}
const projeAdi = arg("ad", (eski && eski.projeAdi) || path.basename(hedef));

function git(args) {
  try { return execFileSync("git", args, { cwd: hedef, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return null; }
}
const gitDeposu = git(["rev-parse", "--is-inside-work-tree"]) === "true";
const izlenen = new Set(gitDeposu && gitDisi ? (git(["ls-files", ".claude", belgeKoku || ".teke", "CLAUDE.local.md"]) || "").split(/\r?\n/).filter(Boolean) : []);

const manifestYol = path.join(ork, "kurulu-dosyalar.json");
let eskiManifest = [];
try { eskiManifest = jsonOku(path.join(okuKok, "kurulu-dosyalar.json")); } catch {}
// taşınan kurulumda eski klasördeki dosyalar yeni klasörün içinde sayılır: artık olmayanlar 4. adımda temizlenir
if (tasinacak) eskiManifest = eskiManifest.map((g) => (g.startsWith(`.claude/${ESKI_AD}/`) ? ".claude/teke/" + g.slice(`.claude/${ESKI_AD}/`.length) : g));
const bizim = new Set(eskiManifest);

const yeniManifest = new Set();

const rapor = { yazilan: [], guncellenen: [], belge: [], dokunulmayan: [], aranacak: [], kaldirilan: [], cakisan: [], notlar: [] };
const bugun = new Date();
const TARIH = `${String(bugun.getDate()).padStart(2, "0")}.${String(bugun.getMonth() + 1).padStart(2, "0")}.${bugun.getFullYear()}`;
const goreli = (y) => path.relative(hedef, y).replace(/\\/g, "/");
const ayni = (y, icerik) => { try { return fs.readFileSync(y, "utf8") === icerik; } catch { return false; } };
const ic = (...p) => fs.readFileSync(path.join(KIT, ...p), "utf8");
const dilIc = (...p) => fs.readFileSync(path.join(DIL, ...p), "utf8");

// tur: "ic" (.claude/teke altı ve ayar kaydı; her zaman bizim) | "kit" (ajan, beceri, kural, tarif şablonu; çakışma korumalı)
// Provada taşıma yapılmaz; yeni klasördeki yolun bugünkü karşılığı eski klasördedir (rapor gerçeği göstersin diye).
const bugunku = (y) => (prova && tasinacak && y.toLowerCase().startsWith(ork.toLowerCase() + path.sep) ? path.join(eskiKlasor, path.relative(ork, y)) : y);
function yaz(y, icerik, tur) {
  const g = goreli(y);
  const b = bugunku(y);
  const var_ = fs.existsSync(b);
  if (tur === "kit" && var_ && !bizim.has(g) && !ayni(b, icerik)) { rapor.cakisan.push(g); return; }
  if (tur === "kit" && izlenen.has(g)) { rapor.cakisan.push(g + m("kur.cakisan.izlenen", " (depoda izlenen dosya)")); return; }
  yeniManifest.add(g);
  if (var_ && ayni(b, icerik)) return;
  if (!prova) { fs.mkdirSync(path.dirname(y), { recursive: true }); fs.writeFileSync(y, icerik); }
  (var_ ? rapor.guncellenen : rapor.yazilan).push(g);
}

// ---------- 0) eski adla kurulu klasörü taşı (ön kontroller bitti; bundan sonrası yazma) ----------
// Tam taşıma: yeni klasörde kurulum yoksa eski klasör olduğu gibi yeni ada geçer.
// Artık toplama: yeni klasör zaten varsa (başka bilgisayarda taşınıp depoyla gelmiş ya da önceki taşıma yarıda kalmış olabilir)
// eski klasörde kalan, yalnız bu bilgisayara ait dosyalar (oturum kimlikleri, durum) var olanın üzerine yazılmadan alınır.
const KIT_ADLARI = ["ayar.json", "oturumlar.json", "yerel.json", "dil.json", "durum", "kancalar", "araclar", "sablon", "SURUM", "package.json", "kurulu-dosyalar.json", "gunluk.jsonl"];
let eskiBizim = false; // aynı adda, kitin olmayan bir klasöre dokunulmaz
try { const ic_ = fs.readdirSync(eskiKlasor); eskiBizim = ic_.length > 0 && ic_.every((f) => KIT_ADLARI.includes(f)); } catch {}
function kopyalaYoksa(kaynak, varis) {
  if (fs.statSync(kaynak).isDirectory()) { fs.mkdirSync(varis, { recursive: true }); for (const f of fs.readdirSync(kaynak)) kopyalaYoksa(path.join(kaynak, f), path.join(varis, f)); }
  else if (!fs.existsSync(varis)) fs.copyFileSync(kaynak, varis);
}
if (eskiBizim && !prova) {
  let tasindi = false;
  if (tasinacak) { try { fs.renameSync(eskiKlasor, ork); tasindi = true; } catch {} }
  if (!tasindi) {
    // yeniden adlandırılamadıysa (dosyası açık olabilir) önce kopyalanır; eski klasör ancak kopya tamamsa silinir
    try {
      if (tasinacak) kopyalaYoksa(eskiKlasor, ork);
      else for (const ad of ["oturumlar.json", "durum"]) { const k = path.join(eskiKlasor, ad); if (fs.existsSync(k)) kopyalaYoksa(k, path.join(ork, ad)); }
    } catch (e) { dur(m("kur.tasi.hata", ".claude/{eski}/ klasörü .claude/teke/ altına kopyalanamadı ({neden}); eski kurulum yerinde duruyor, hiçbir şey silinmedi.", { eski: ESKI_AD, neden: e.message })); }
    try { fs.rmSync(eskiKlasor, { recursive: true, force: true }); } catch {}
    if (fs.existsSync(eskiKlasor)) rapor.notlar.push(m("kur.tasi.silinemedi", ".claude/{eski}/ klasörü silinemedi (bir dosyası açık olabilir); içeriği .claude/teke/ altına alındı. Oturumları kapattıktan sonra kurucuyu yeniden çalıştır ya da klasörü elle sil.", { eski: ESKI_AD }));
  }
}
if (tasinacak) rapor.notlar.push(prova
  ? m("kur.tasi.tasinacak", "Eski sürümün klasörü taşınacak: .claude/{eski}/ → .claude/teke/ (ayarlar ve oturum kimlikleri korunur). Betiklerin yolu değişir: açık oturumlar kapatılıp yeniden açılana dek eski yolu arar; kullanıcıya bu oturumu ve kod, tasarım oturumlarını yeniden açmasını söyle.", { eski: ESKI_AD })
  : m("kur.tasi.tasindi", "Eski sürümün klasörü taşındı: .claude/{eski}/ → .claude/teke/ (ayarlar ve oturum kimlikleri korunur). Betiklerin yolu değişir: açık oturumlar kapatılıp yeniden açılana dek eski yolu arar; kullanıcıya bu oturumu ve kod, tasarım oturumlarını yeniden açmasını söyle.", { eski: ESKI_AD }));
else if (eskiBizim) rapor.notlar.push(prova
  ? m("kur.tasi.yerel.alinacak", ".claude/{eski}/ klasöründe kalan yerel dosyalar (oturum kimlikleri, durum) .claude/teke/ altına alınacak.", { eski: ESKI_AD })
  : m("kur.tasi.yerel.alindi", ".claude/{eski}/ klasöründe kalan yerel dosyalar (oturum kimlikleri, durum) .claude/teke/ altına alındı.", { eski: ESKI_AD }));

// ---------- 1) ayar.json: varsayılan + eski kurulumdan korunanlar ----------
const vars = jsonOku(path.join(KIT, "ayarlar", "ayar.varsayilan.json"));
// Varsayılan onay listesindeki adlar kurulum dilinde yazılır (sırayla); desenler aynıdır.
const onayVars = { desenler: vars.onay.desenler.map((d, i) => ({ ...d, ad: (P.onayAdlari && P.onayAdlari[i]) || d.ad })) };
const ayar = {
  _aciklama: m("kur.ayar.aciklama", vars._aciklama),
  kitSurumu: SURUM,
  dil,
  projeAdi, gitDisi, belgeKoku, yasaDosyasi,
  devirKlasoru: path.posix.join(belgeKoku, P.devirKlasoru),
  belge: vars.belge, roller: vars.roller, ajan: vars.ajan, baglam: vars.baglam, commit: vars.commit, onay: onayVars, ders: vars.ders,
  kapaliKancalar: [],
};
// Kişisel varsayılanlar ilk kurulumda uygulanır; güncellemede projenin kendi ayarı aşağıda bunların üzerine yazılır.
// Kurulumun kendisinin belirlediği alanlar (dil, kurulum türü, yollar) kişisel dosyadan alınmaz.
const KURULUM_ALANLARI = ["dil", "kitSurumu", "projeAdi", "gitDisi", "belgeKoku", "yasaDosyasi", "devirKlasoru"];
for (const k of Object.keys(kisisel)) {
  if (k.startsWith("_") || KURULUM_ALANLARI.includes(k)) continue;
  const v = kisisel[k];
  ayar[k] = v && typeof v === "object" && !Array.isArray(v) ? { ...ayar[k], ...v } : v;
}
if (eski) {
  ayar.devirKlasoru = eski.devirKlasoru || (eski.devir && eski.devir.klasor) || ayar.devirKlasoru;
  if (eski.belge) ayar.belge = { yollar: eski.belge.yollar || {}, haberKB: eski.belge.haberKB || {} };
  const er = eski.roller || {};
  ayar.roller = {
    kod: er.kod || er.yurutucu || vars.roller.kod,
    tasarim: er.tasarim || vars.roller.tasarim,
    ajanIsci: er.ajanIsci || vars.roller.ajanIsci,
    ajanHakem: er.ajanHakem || vars.roller.ajanHakem,
  };
  ayar.ajan = { ...vars.ajan, ...(eski.ajan || {}) };
  ayar.baglam = { ...vars.baglam, ...(eski.baglam || {}) };
  if (eski.commit && eski.commit.ortakYazarYasak !== undefined) ayar.commit = { ortakYazarYasak: !!eski.commit.ortakYazarYasak };
  if (eski.onay && Array.isArray(eski.onay.desenler)) ayar.onay = { desenler: eski.onay.desenler };
  if (eski.ders) ayar.ders = { ...vars.ders, ...eski.ders };
  // eski sürümün kanca adları artık yok; yalnız bugünkü adlar korunur
  ayar.kapaliKancalar = (eski.kapaliKancalar || []).filter((k) => fs.existsSync(path.join(KIT, "kancalar", k)));
}
// Dil değiştiyse proje belgeleri yeniden adlandırılmaz: eski dildeki adıyla duran belge ayarda eşlenir.
if (dilDegisti) {
  const eskiP = paketAyarla(dilPaketi(eskiDil));
  const eskiAdlar = { ...eskiP.belgeler };
  const eskiOnay = eskiP.onayAdlari || [];
  P = paketAyarla(dilPaketi(dil));
  // Onay listesinde kitin varsayılan adıyla duran maddeler yeni dile çevrilir; kullanıcının kendi yazdığı ad kalır.
  ayar.onay = { desenler: (ayar.onay.desenler || []).map((d) => {
    const i = vars.onay.desenler.findIndex((v) => v.desen === d.desen);
    if (i < 0 || d.ad !== (eskiOnay[i] || vars.onay.desenler[i].ad)) return d;
    return { ...d, ad: (P.onayAdlari && P.onayAdlari[i]) || vars.onay.desenler[i].ad };
  }) };
  ayar.belge = { yollar: { ...((ayar.belge && ayar.belge.yollar) || {}) }, haberKB: (ayar.belge && ayar.belge.haberKB) || {} };
  for (const ad of ["DEVAM.md", "docs/KARARLAR.md", "docs/DERSLER.md"]) {
    const once = eskiAdlar[ad] || ad;
    const simdi = P.belgeler[ad] || ad;
    if (once === simdi || ayar.belge.yollar[ad] || ayar.belge.yollar[once] || ayar.belge.yollar[simdi]) continue;
    if (fs.existsSync(path.join(hedef, belgeKoku, once))) ayar.belge.yollar[ad] = path.posix.join(belgeKoku, once);
  }
  rapor.notlar.push(m("kur.dil.degisti", "Kurulum dili değişti: {eski} → {yeni}. Kit dosyaları yeni dilde kuruldu, eski dilin kit dosyaları kaldırıldı. Proje belgeleri yeniden adlandırılmadı; eski adlarıyla ayarda eşlendi (ayar.json → belge.yollar).", { eski: eskiDil, yeni: dil }));
}
yaz(ayarYol, JSON.stringify(ayar, null, 2) + "\n", "ic");

// ---------- 2) kit dosyaları ----------
const K = P.klasorler;
for (const f of fs.readdirSync(path.join(KIT, "kancalar"))) yaz(path.join(ork, "kancalar", f), ic("kancalar", f), "ic");
for (const f of ["bakim.js", "ders-tara.js", "nobet.js", "saglik.js"]) yaz(path.join(ork, "araclar", f), ic("araclar", f), "ic");
yaz(path.join(ork, "SURUM"), SURUM + "\n", "ic");
// Dil paketi: betiklerin bu projede kullanacağı adlar ve metinler.
yaz(path.join(ork, "dil.json"), dilIc("dil.json"), "ic");
// Projenin kök package.json dosyası "type": "module" diyorsa node, kitin .js betiklerini ES modülü sayar ve hepsi çöker.
// En yakın package.json belirleyici olduğu için kit klasörüne kendi bildirimi konur.
yaz(path.join(ork, "package.json"), JSON.stringify({ private: true, type: "commonjs", description: m("kur.package", "Teke betikleri (CommonJS). Projenin modül türünden bağımsız çalışmaları için; silme.") }, null, 2) + "\n", "ic");
for (const f of fs.readdirSync(path.join(DIL, K.kurallar))) yaz(path.join(hedef, ".claude", "rules", f), dilIc(K.kurallar, f), "kit");
const kitAjanlari = fs.readdirSync(path.join(DIL, K.ajanlar));
const ajanDoldur = (s) => s.replace(/\{\{ISCI\}\}/g, ayar.roller.ajanIsci).replace(/\{\{HAKEM\}\}/g, ayar.roller.ajanHakem);
for (const f of kitAjanlari) yaz(path.join(hedef, ".claude", "agents", f), ajanDoldur(dilIc(K.ajanlar, f)), "kit");
const kitBecerileri = fs.readdirSync(path.join(DIL, K.beceriler));
for (const b of kitBecerileri) yaz(path.join(hedef, ".claude", "skills", b, "SKILL.md"), dilIc(K.beceriler, b, "SKILL.md"), "kit");
yaz(path.join(hedef, ayar.devirKlasoru, P.sablonAdi), dilIc(K.sablonlar, ...P.devirKlasoru.split("/"), P.sablonAdi), "kit");

// ---------- 3) betik kaydı: kitin eski kayıtlarını çıkar, yenisini ekle; başka her şeyi koru ----------
const sablon = jsonOku(path.join(KIT, "ayarlar", "settings.sablon.json"));
const kitMi = (grup) => { const s = JSON.stringify(grup); return s.includes(".claude/teke/kancalar/") || s.includes(`.claude/${ESKI_AD}/kancalar/`); };
const kapali = new Set(ayar.kapaliKancalar || []);
set.hooks = set.hooks || {};
for (const olay of Object.keys(set.hooks)) {
  set.hooks[olay] = (set.hooks[olay] || []).filter((g) => !kitMi(g));
  if (!set.hooks[olay].length) delete set.hooks[olay];
}
for (const [olay, gruplar] of Object.entries(sablon.hooks)) {
  const eklenecek = gruplar.filter((g) => ![...kapali].some((k) => JSON.stringify(g).includes(k)));
  if (eklenecek.length) set.hooks[olay] = [...(set.hooks[olay] || []), ...eklenecek];
}
if (!Object.keys(set.hooks).length) delete set.hooks;
if (kapali.size) rapor.notlar.push(m("kur.kapali", "Kullanıcı kararıyla kapalı betikler kaydedilmedi: {liste} (ayar.json → kapaliKancalar).", { liste: [...kapali].join(", ") }));
yaz(setYol, JSON.stringify(set, null, 2) + "\n", "ic");

// ---------- 4) eski sürümden kalan kit dosyalarını kaldır (yalnız kitin kendi yazdıkları) ----------
for (const g of eskiManifest) {
  if (yeniManifest.has(g)) continue;
  const y = path.resolve(hedef, g);
  if (!y.toLowerCase().startsWith(hedef.toLowerCase() + path.sep) || !fs.existsSync(bugunku(y))) continue;
  if (rapor.cakisan.some((c) => c.split(" ")[0] === g)) { yeniManifest.add(g); continue; } // çakışan dosya sahibinde kalır
  if (!prova) {
    try { fs.unlinkSync(y); } catch { continue; }
    let d = path.dirname(y); // boşalan klasörleri topla
    while (d.toLowerCase().startsWith(hedef.toLowerCase() + path.sep)) {
      try { if (fs.readdirSync(d).length) break; fs.rmdirSync(d); } catch { break; }
      d = path.dirname(d);
    }
  }
  rapor.kaldirilan.push(g);
}
if (!prova) { try { fs.unlinkSync(path.join(ork, "gunluk.jsonl")); } catch {} }

// ---------- 5) proje belgeleri: yalnız yoksa; güncellemede ve kendi düzeni olan projede oluşturulmaz ----------
{
  const S = path.join(DIL, K.sablonlar);
  const doldur = (s) => s.replace(/\{\{PROJE_ADI\}\}/g, projeAdi).replace(/\{\{TARIH\}\}/g, TARIH);
  const esleme = (ayar.belge && ayar.belge.yollar) || {};
  const yerel = (ad) => P.belgeler[ad] || ad; // varsayılan adın kurulum dilindeki karşılığı
  const varis = (ad) => path.join(hedef, esleme[ad] || esleme[yerel(ad)] || (ad === "CLAUDE.md" ? yasaDosyasi : path.join(belgeKoku, yerel(ad))));
  const kalemler = ["CLAUDE.md", "DEVAM.md", "docs/KARARLAR.md", "docs/DERSLER.md"].map((ad) => [ad, path.join(S, ...yerel(ad).split("/"))]);
  // Yasa dosyası ve durum dosyası zaten varsa proje kendi düzenini kurmuştur: eksik belge kendiliğinden açılmaz.
  const kendiDuzeni = !eski && fs.existsSync(varis("CLAUDE.md")) && fs.existsSync(varis("DEVAM.md"));
  for (const [ad, kaynak] of kalemler) {
    const y = varis(ad);
    if (fs.existsSync(y)) { rapor.dokunulmayan.push(goreli(y)); continue; }
    if (eski || kendiDuzeni) { rapor.aranacak.push(yerel(ad)); continue; }
    if (!prova) { fs.mkdirSync(path.dirname(y), { recursive: true }); fs.writeFileSync(y, doldur(fs.readFileSync(kaynak, "utf8"))); }
    rapor.belge.push(goreli(y));
  }
}

// ---------- 6) git yok sayma ----------
if (gitDisi) {
  const satirlar = [
    (belgeKoku || ".teke") + "/", "CLAUDE.local.md", ".claude/settings.local.json", ".claude/teke/", ".claude/rules/teke.md",
    ...kitAjanlari.map((f) => `.claude/agents/${f}`), ...kitBecerileri.map((b) => `.claude/skills/${b}/`),
  ];
  const exGoreli = gitDeposu ? git(["rev-parse", "--git-path", "info/exclude"]) : null; // .git bir dosya da olabilir (çalışma ağacı)
  if (exGoreli) {
    const ex = path.resolve(hedef, exGoreli);
    let t = "";
    try { t = fs.readFileSync(ex, "utf8"); } catch {}
    const eksik = satirlar.filter((s) => !t.split(/\r?\n/).includes(s));
    if (eksik.length) {
      if (!prova) { fs.mkdirSync(path.dirname(ex), { recursive: true }); fs.writeFileSync(ex, (t ? t.replace(/\n*$/, "\n") : "") + m("kur.exclude.baslik", "# Teke (yerel; depoya girmez)") + "\n" + eksik.join("\n") + "\n"); }
      rapor.notlar.push(m("kur.exclude.not", "Git'in yerel yok-sayma listesine {n} satır eklendi: kit dosyaları depoya girmez; deponun .gitignore dosyasına dokunulmadı.", { n: eksik.length }));
    }
  } else rapor.notlar.push(m("kur.gitdisi.depoyok", "UYARI: bu klasör bir git deposu değil; git dışı kurulumda kit dosyalarını depoya sokmamak sana kalır."));
} else {
  const gi = path.join(hedef, ".gitignore");
  let t = "";
  try { t = fs.readFileSync(gi, "utf8"); } catch {}
  // Kit dosyaları ve kayıtlar git'e girer; yalnız bu bilgisayara ait ve geçici olanlar girmez.
  const istenen = [path.posix.join(ayar.devirKlasoru, P.koruOnek + "*.md"), ".claude/teke/durum/", ".claude/teke/oturumlar.json", ".claude/teke/yerel.json", ".claude/settings.local.json", ".claude/worktrees/"];
  const eksik = istenen.filter((s) => !t.split(/\r?\n/).includes(s));
  if (eksik.length) {
    if (!prova) fs.writeFileSync(gi, (t ? t.replace(/\n*$/, "\n") : "") + m("kur.gitignore.baslik", "# Teke: bu bilgisayara ait geçici dosyalar") + "\n" + eksik.join("\n") + "\n");
    rapor.notlar.push(m("kur.gitignore.not", ".gitignore dosyasına eklendi: {liste}.", { liste: eksik.join(", ") }));
  }
}

// ---------- 7) kurulu dosya listesi ve rapor ----------
if (!prova) {
  fs.mkdirSync(ork, { recursive: true });
  fs.writeFileSync(manifestYol, JSON.stringify([...yeniManifest].sort(), null, 2) + "\n");
  // Kit kaynağının bu bilgisayardaki yolu depoya girmez: ayar.json'a değil yerel dosyaya yazılır.
  fs.writeFileSync(path.join(ork, "yerel.json"), JSON.stringify({ kitKaynagi: KAYNAK.replace(/\\/g, "/") }, null, 2) + "\n");
}

const tur = eski ? m("kur.tur.guncelleme", "{eski} → {yeni} güncelleme", { eski: eski.kitSurumu || m("kur.tur.eskisurum", "eski sürüm"), yeni: SURUM }) : m("kur.tur.ilk", "ilk kurulum");
console.log(`${prova ? m("kur.prova", "PROVA — hiçbir şey yazılmadı. ") : ""}Teke ${SURUM} · ${tur}${gitDisi ? m("kur.gitdisi.etiket", " · git dışı") : ""} · ${hedef}`);
console.log(m("kur.ozet", "kit dosyası: yeni {yeni}, güncellenen {guncellenen}, kaldırılan {kaldirilan}, çakışan {cakisan} · belge: oluşturulan {belge}, dokunulmayan {dokunulmayan}", {
  yeni: rapor.yazilan.length, guncellenen: rapor.guncellenen.length, kaldirilan: rapor.kaldirilan.length, cakisan: rapor.cakisan.length, belge: rapor.belge.length, dokunulmayan: rapor.dokunulmayan.length,
}));
const liste = (baslik, kalemler) => console.log("\n" + baslik + "\n  " + kalemler.join("\n  "));
if (rapor.belge.length) liste(m("kur.b.olusturulan", "OLUŞTURULAN BELGE:"), rapor.belge);
if (rapor.dokunulmayan.length) liste(m("kur.b.dokunulmayan", "VARDI, DOKUNULMADI (proje belgesi):"), rapor.dokunulmayan);
if (rapor.aranacak.length) liste(m("kur.b.aranacak", "BU ADLA BELGE YOK, OLUŞTURULMADI (proje kendi düzenini kurmuş; karşılığı başka bir dosyadaysa ayar.json → belge.yollar ile eşle, gerçekten yoksa kullanıcıya sorarak aç):"), rapor.aranacak);
if (rapor.kaldirilan.length) liste(m("kur.b.kaldirilan", "KALDIRILAN ESKİ KİT DOSYASI:"), rapor.kaldirilan);
if (rapor.cakisan.length) liste(m("kur.b.cakisan", "ÇAKIŞMA — ÜZERİNE YAZILMADI (aynı adda, kitin yazmadığı dosya var; kullanıcıya göster, karar onun):"), rapor.cakisan);
if (rapor.notlar.length) liste(m("kur.b.not", "NOT:"), rapor.notlar);
// Kurucu kendi işini kendi kontrol eder: ayrı bir doğrulama adımı yoktur. Sağlamsa tek satır, kusur varsa yalnız kusurlu satırlar yazılır.
if (!prova && !rapor.cakisan.length) {
  const s = require("child_process").spawnSync(process.execPath, [path.join(ork, "araclar", "saglik.js"), hedef], { cwd: hedef, encoding: "utf8", timeout: 60000 });
  if (s.status === 0) console.log("\n" + m("kur.saglam", "Kurulum sağlam."));
  else {
    const KALDI = m("saglik.kaldi", "KALDI");
    const satirlar = String(s.stdout || "").split(/\r?\n/);
    const kusur = satirlar.filter((x, i) => x.startsWith(KALDI) || (/^\s{7}/.test(x) && (satirlar[i - 1] || "").startsWith(KALDI)));
    console.log("\n" + m("kur.kusur", "KUSUR — düzelt (kurucu kendi kontrolünde buldu):") + "\n  " + (kusur.length ? kusur.join("\n  ") : String(s.stderr || s.error || m("kur.saglik.calismadi", "sağlık betiği çalışmadı")).trim()));
  }
}
process.exit(rapor.cakisan.length ? 3 : 0);
