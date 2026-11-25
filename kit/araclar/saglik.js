#!/usr/bin/env node
// Sağlık kontrolü: kit bu projede doğru kurulu ve çalışır durumda mı?
// Kullanım (proje kökünde): node .claude/teke/araclar/saglik.js
// Çıkış kodu 0 = sağlam. Kurucu her kurulum ve güncellemenin sonunda kendisi koşar; elle yalnız "bir şey çalışmıyor" şüphesinde koşulur.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const jsonOku = (y) => JSON.parse(fs.readFileSync(y, "utf8").replace(/^﻿/, ""));
const kok = path.resolve(process.argv[2] || process.env.CLAUDE_PROJECT_DIR || process.cwd());
const ork = path.join(kok, ".claude", "teke");
// Dil paketi ortak betikten gelir; o yüklenemiyorsa (bozuk kurulum) kontrol Türkçe adlarla ve metinlerle sürer.
let m = (anahtar, tr, d) => (d ? tr.replace(/\{(\w+)\}/g, (x, k) => (k in d ? String(d[k]) : x)) : tr);
let P = { beceriler: ["devir", "is-kapat", "compact-hazirlik"], ajanlar: ["tarayici", "hata-avcisi", "test-korlugu", "elestirmen", "supheci"], sablonAdi: "_SABLON.md", devirKlasoru: "docs/devir", kurulumBelgesi: "KURULUM.md" };
try { const o = require(path.join(ork, "kancalar", "ortak.js")); P = o.paket(kok); m = o.m; } catch {}

const satirlar = [];
let kaldi = 0;
const GECTI = m("saglik.gecti", "GEÇTİ"), KALDI = m("saglik.kaldi", "KALDI"), UYARI = m("saglik.uyari", "UYARI");
function kontrol(ad, tamam, ayrinti) {
  if (!tamam) kaldi++;
  satirlar.push(`${tamam ? GECTI : KALDI}  ${ad}${!tamam && ayrinti ? "\n       " + ayrinti : ""}`);
}
const uyari = (ad) => satirlar.push(`${UYARI}  ${ad}`);

const [nodeAna, nodeAlt] = process.versions.node.split(".").map(Number);
kontrol(m("saglik.node", "node sürümü ({surum})", { surum: process.versions.node }), nodeAna > 18 || (nodeAna === 18 && nodeAlt >= 17), m("saglik.node.gerek", "node 18.17 ya da üstü gerekli"));

let ayar = null;
try { ayar = jsonOku(path.join(ork, "ayar.json")); } catch {}
kontrol(m("saglik.ayar", "ayar.json okunuyor"), !!ayar, path.join(ork, "ayar.json"));
if (!ayar) { console.log(satirlar.join("\n")); console.log("\n" + m("saglik.kurulu.degil", "Sağlık: kit kurulu değil ya da bozuk.")); process.exit(1); }
const surum = (() => { try { return fs.readFileSync(path.join(ork, "SURUM"), "utf8").trim(); } catch { return null; } })();
kontrol(m("saglik.surum", "kit sürümü ({surum})", { surum }), !!surum);
let kitKaynagi = ayar.kitKaynagi;
try { kitKaynagi = jsonOku(path.join(ork, "yerel.json")).kitKaynagi || kitKaynagi; } catch {}
if (kitKaynagi && fs.existsSync(path.join(kitKaynagi, "SURUM"))) {
  const k = fs.readFileSync(path.join(kitKaynagi, "SURUM"), "utf8").trim();
  if (k !== surum) uyari(m("saglik.baskasurum", "kit kaynağında başka sürüm var ({surum}); güncelleme: kit kaynağındaki {belge}", { surum: k, belge: P.kurulumBelgesi }));
} else uyari(m("saglik.kaynakyok", "kit kaynağı bu bilgisayarda bulunamadı (güncelleme ve ders geri bildirimi yapılamaz)"));

// dosyalar
const gerekli = [
  ...["ortak.js", "oturum-baslangici.js", "istem.js", "baglam-izle.js", "ajan-kapisi.js", "devir-kapisi.js", "komut-kapisi.js"].map((f) => ".claude/teke/kancalar/" + f),
  ...["bakim.js", "ders-tara.js", "nobet.js", "rol.js"].map((f) => ".claude/teke/araclar/" + f),
  ".claude/teke/package.json", ".claude/rules/teke.md",
  ...P.beceriler.map((b) => `.claude/skills/${b}/SKILL.md`),
  path.posix.join(ayar.devirKlasoru || P.devirKlasoru, P.sablonAdi),
];
const eksik = gerekli.filter((g) => !fs.existsSync(path.join(kok, g)));
kontrol(m("saglik.dosyalar", "kit dosyaları ({var}/{toplam})", { var: gerekli.length - eksik.length, toplam: gerekli.length }), eksik.length === 0, m("saglik.eksik", "eksik: {liste}", { liste: eksik.join(", ") }));

// yardımcı tanımları
const ajanSorun = [];
for (const a of P.ajanlar) {
  let ic = null;
  try { ic = fs.readFileSync(path.join(kok, ".claude", "agents", a + ".md"), "utf8"); } catch {}
  if (!ic) { ajanSorun.push(m("saglik.ajan.dosyayok", "{ad}: dosya yok", { ad: a })); continue; }
  const model = (ic.match(/^model:\s*(.+)$/m) || [])[1];
  if (!model) ajanSorun.push(m("saglik.ajan.modelyok", "{ad}: model satırı yok", { ad: a }));
  else if (/\{\{/.test(model)) ajanSorun.push(m("saglik.ajan.bos", "{ad}: model doldurulmamış ({model})", { ad: a, model }));
  else if (((ayar.ajan || {}).yasakModeller || []).some((y) => model.toLowerCase().includes(String(y).toLowerCase()))) ajanSorun.push(m("saglik.ajan.yasak", "{ad}: yasak model ({model})", { ad: a, model }));
}
kontrol(m("saglik.ajanlar", "yardımcı tanımları ({n} yardımcı, modeli sabit)", { n: P.ajanlar.length }), ajanSorun.length === 0, ajanSorun.join("; "));

// Onay listesi: betik yalnız yazılan komutu görür, package.json betiğinin içini görmez. İçinde onay isteyen bir komut
// çalıştıran ("uretim": "wrangler deploy") ya da adı yayına benzeyen betik listede yakalanmıyorsa bildirilir.
{
  const desenler = ((ayar.onay || {}).desenler || []).map((d) => { try { return new RegExp(d.desen, "i"); } catch { return null; } }).filter(Boolean);
  const paketler = ["package.json"];
  for (const ust of ["apps", "packages", "services", "workers"]) {
    try { for (const a of fs.readdirSync(path.join(kok, ust))) paketler.push(path.posix.join(ust, a, "package.json")); } catch {}
  }
  const YAYIN_ADI = /(^|[^a-z])(deploy|publish|yayinla)([^a-z]|$)/i;
  const kacan = [];
  for (const p of desenler.length ? paketler : []) {
    let pj = null;
    try { pj = jsonOku(path.join(kok, p)); } catch { continue; }
    for (const [ad, govde] of Object.entries((pj && pj.scripts) || {})) {
      if (typeof govde !== "string") continue;
      if (!YAYIN_ADI.test(ad) && !desenler.some((d) => d.test(govde))) continue;
      const cagrilar = [`pnpm run ${ad}`, `npm run ${ad}`, `yarn ${ad}`, `bun run ${ad}`, `pnpm ${ad}`];
      if (!cagrilar.some((c) => desenler.some((d) => d.test(c)))) kacan.push((p === "package.json" ? "" : path.posix.dirname(p) + ": ") + ad);
    }
  }
  if (kacan.length) uyari(m("saglik.onay.kacan", "onay listesinin yakalamadığı, yayına benzeyen betik(ler): {liste}. Onay isteyecekse ayar.json → onay.desenler listesine ekle.", { liste: kacan.slice(0, 8).join(", ") + (kacan.length > 8 ? ", …" : "") }));
}

// betik kaydı ve gerçekten çalışıyor mu
const setAd = ayar.gitDisi ? "settings.local.json" : "settings.json";
let set = null;
try { set = jsonOku(path.join(kok, ".claude", setAd)); } catch {}
kontrol(m("saglik.set", ".claude/{ad} okunuyor", { ad: setAd }), !!set);
if (set) {
  const beklenen = { SessionStart: ["oturum-baslangici.js"], UserPromptSubmit: ["istem.js"], PreToolUse: ["ajan-kapisi.js", "devir-kapisi.js", "komut-kapisi.js"], PostToolUse: ["baglam-izle.js"] };
  const kapali = new Set(ayar.kapaliKancalar || []);
  const sorun = [];
  for (const [olay, betikler] of Object.entries(beklenen)) {
    const metin = JSON.stringify((set.hooks || {})[olay] || []);
    for (const b of betikler) {
      if (kapali.has(b)) { uyari(m("saglik.kapali", "{betik} kullanıcı kararıyla kapalı (ayar.json → kapaliKancalar)", { betik: b })); continue; }
      if (!metin.includes(b)) sorun.push(m("saglik.kayitsiz", "{olay} → {betik} kayıtlı değil", { olay, betik: b }));
    }
  }
  kontrol(m("saglik.kayit", "betikler ayar dosyasında kayıtlı"), sorun.length === 0, sorun.join("; "));
  // Kayıtlı komutları uygulamanın çalıştıracağı biçimde koş: node bulunuyor mu, yol doğru mu, boş girdide sessizce çıkıyor mu.
  const kosSorun = [];
  let kosulan = 0;
  for (const gruplar of Object.values(set.hooks || {})) {
    for (const g of gruplar) for (const h of g.hooks || []) {
      if (!JSON.stringify(h).includes(".claude/teke/kancalar/")) continue;
      const ac = (s) => String(s).split("${CLAUDE_PROJECT_DIR}").join(kok).split("$CLAUDE_PROJECT_DIR").join(kok);
      const r = spawnSync(ac(h.command), (h.args || []).map(ac), { input: "{}", encoding: "utf8", timeout: 20000, env: { ...process.env, CLAUDE_PROJECT_DIR: kok } });
      kosulan++;
      if (r.error || r.status !== 0) kosSorun.push(`${(h.args || []).join(" ")} → ${r.error ? r.error.message : m("saglik.cikis", "çıkış {kod}", { kod: r.status }) + " " + (r.stderr || "").slice(0, 160)}`);
    }
  }
  kontrol(m("saglik.kos", "kayıtlı betikler çalışıyor ({n} komut)", { n: kosulan }), kosulan > 0 && kosSorun.length === 0, kosSorun.join("; ") || m("saglik.kos.yok", "kayıtlı kit betiği yok"));
}

// araçlar yükleniyor mu
for (const a of ["bakim.js", "ders-tara.js", "nobet.js", "rol.js"]) {
  const r = spawnSync(process.execPath, ["--check", path.join(ork, "araclar", a)], { encoding: "utf8" });
  kontrol(m("saglik.sozdizimi", "{ad} sözdizimi", { ad: a }), r.status === 0, (r.stderr || "").slice(0, 200));
}

// git
const depo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: kok, encoding: "utf8" });
if (depo.status !== 0) uyari(m("saglik.gityok", "bu klasör henüz bir git deposu değil"));
if (ayar.gitDisi && depo.status === 0) {
  const iz = spawnSync("git", ["status", "--porcelain", "--", ayar.belgeKoku || ".teke", ".claude/teke", "CLAUDE.local.md"], { cwd: kok, encoding: "utf8" });
  kontrol(m("saglik.gitdisi", "git dışı kurulum: kit dosyaları git'e görünmüyor"), (iz.stdout || "").trim() === "", (iz.stdout || "").trim().split(/\r?\n/).slice(0, 5).join("; "));
}

console.log(satirlar.join("\n"));
console.log("\n" + (kaldi === 0 ? m("saglik.saglam", "Sağlık: SAĞLAM") : m("saglik.sonuc.kaldi", "Sağlık: {n} kontrol KALDI", { n: kaldi })));
process.exit(kaldi === 0 ? 0 : 1);
