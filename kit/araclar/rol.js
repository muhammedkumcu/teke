#!/usr/bin/env node
// Rol aracı: bir oturumun rolünü görür ya da kaydeder.
// Betikler rolü oturumun ilk mesajından öğrenir. Kit kurulmadan önce açılmış oturumda ilk mesaj görülemeyebilir
// ya da rol satırı taşımaz; o oturumun rolü bu araçla bir kez yazılır.
//
//   node .claude/teke/araclar/rol.js                       bu projenin oturumlarını ve rollerini listeler
//   node .claude/teke/araclar/rol.js <oturum> <rol>        rolü kaydeder (rol: orkestrator | kod | tasarim)
//
// <oturum>: oturumun kimliği ya da kimliğin ilk harfleri (listede ve "[teke]" açılış satırında yazar).
// İngilizce adlar da geçerlidir: orchestrator | code | design.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { projeKoku, jsonDene, durumOku, durumYaz, durumYolu, rolAyrinti, rolKaynagi, ROL_DEGERI, katla, paket, m, bayraklariCevir } = require("../kancalar/ortak");

bayraklariCevir();
const kok = projeKoku({});
const P = paket(kok);
const durumKlasor = path.join(kok, ".claude", "teke", "durum");
// Bu projenin oturum kayıtları (uygulamanın tuttuğu klasör; yalnız okunur).
const kayitKlasor = path.join(os.homedir(), ".claude", "projects", path.resolve(kok).replace(/[^a-zA-Z0-9]/g, "-"));
const bitir = (s, kod = 0) => { console.log(s); process.exit(kod); };

function oturumlar() {
  const liste = new Map(); // kimlik → { kimlik, kayit, zaman }
  try {
    for (const f of fs.readdirSync(kayitKlasor)) {
      if (!f.endsWith(".jsonl")) continue;
      const y = path.join(kayitKlasor, f);
      liste.set(f.slice(0, -6), { kimlik: f.slice(0, -6), kayit: y, zaman: fs.statSync(y).mtimeMs });
    }
  } catch {}
  try {
    for (const f of fs.readdirSync(durumKlasor)) {
      if (!f.endsWith(".json")) continue;
      const kimlik = f.slice(0, -5);
      const d = jsonDene(path.join(durumKlasor, f), {});
      const o = liste.get(kimlik) || { kimlik, kayit: d.kayit || null, zaman: 0 };
      if (!o.zaman && o.kayit) { try { o.zaman = fs.statSync(o.kayit).mtimeMs; } catch {} }
      if (o.zaman || d.rol) liste.set(kimlik, o);
    }
  } catch {}
  return [...liste.values()].sort((a, b) => b.zaman - a.zaman);
}
const zamanYaz = (ms) => {
  if (!ms) return "-";
  const t = new Date(ms), iki = (n) => String(n).padStart(2, "0");
  return `${iki(t.getDate())}.${iki(t.getMonth() + 1)} ${iki(t.getHours())}:${iki(t.getMinutes())}`;
};
const KAYNAK_ADI = {
  elle: m("rol.k.elle", "elle yazıldı"), satir: m("rol.k.satir", "ROL satırı"),
  kayit: m("rol.k.kayit", "ilk mesajdan"), varsayim: m("rol.k.varsayim", "VARSAYIM, kayıtlı değil"),
};

const [hedef, rolHam] = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!hedef) {
  const hepsi = oturumlar();
  if (!hepsi.length) bitir(m("rol.yok", "Bu proje için oturum kaydı bulunamadı."));
  console.log(m("rol.baslik", "Bu projenin oturumları (en son yazan başta):"));
  for (const o of hepsi.slice(0, 12)) {
    const a = rolAyrinti({ session_id: o.kimlik, transcript_path: o.kayit }, kok);
    const ilk = a.ilk && a.ilk.metin ? a.ilk.metin.replace(/\s+/g, " ").slice(0, 70) : "";
    console.log(`  ${o.kimlik.slice(0, 8)}  ${zamanYaz(o.zaman)}  ${P.rolAdlari[a.rol] || a.rol} (${KAYNAK_ADI[a.kaynak] || a.kaynak})${ilk ? `  "${ilk}…"` : ""}`);
  }
  if (hepsi.length > 12) console.log(m("rol.fazla", "  …({n} eski oturum daha)", { n: hepsi.length - 12 }));
  bitir("\n" + m("rol.kullanim", "Rol yazmak için: node .claude/teke/araclar/rol.js <oturum kimliğinin ilk harfleri> orkestrator|kod|tasarim"));
}

const rol = ROL_DEGERI[katla(rolHam)];
if (!rol) bitir(m("rol.gecersiz", "Rol yazılmadı: ikinci söz orkestrator, kod ya da tasarim olmalı.") + "\n" + m("rol.kullanim", "Rol yazmak için: node .claude/teke/araclar/rol.js <oturum kimliğinin ilk harfleri> orkestrator|kod|tasarim"), 2);

const adaylar = oturumlar().filter((o) => o.kimlik === hedef || o.kimlik.startsWith(hedef));
const tam = adaylar.find((o) => o.kimlik === hedef);
if (!tam && adaylar.length > 1) bitir(m("rol.belirsiz", "\"{hedef}\" birden çok oturuma uyuyor: {liste}. Daha uzun yaz.", { hedef, liste: adaylar.map((o) => o.kimlik.slice(0, 13)).join(", ") }), 2);
// Listede olmayan kimlik de yazılabilir (kayıt klasörü başka yerdeyse); o zaman kimliğin tamamı gerekir.
if (!tam && !adaylar.length && !/^[\w-]{20,}$/.test(hedef)) bitir(m("rol.bulunamadi", "\"{hedef}\" ile başlayan oturum bulunamadı. Listeyi görmek için aracı sözsüz çalıştır.", { hedef }), 2);
const secilen = tam || adaylar[0] || { kimlik: hedef, kayit: null };

const d = durumOku(kok, secilen.kimlik);
const onceki = d.rol ? `${P.rolAdlari[d.rol] || d.rol} (${KAYNAK_ADI[rolKaynagi(d)]})` : m("rol.k.varsayim", "VARSAYIM, kayıtlı değil");
d.rol = rol;
d.rolKaynak = "elle";
if (!d.kayit && secilen.kayit) d.kayit = secilen.kayit;
durumYaz(kok, secilen.kimlik, d);
const yazildi = jsonDene(durumYolu(kok, secilen.kimlik), {}).rol === rol;
bitir(yazildi
  ? m("rol.yazildi", "Rol kaydedildi: {kimlik} → {rol} (önceki: {onceki}).", { kimlik: secilen.kimlik.slice(0, 8), rol: P.rolAdlari[rol], onceki })
  : m("rol.yazilamadi", "Rol yazılamadı: {yol}", { yol: durumYolu(kok, secilen.kimlik) }), yazildi ? 0 : 1);
