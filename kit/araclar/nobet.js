#!/usr/bin/env node
// Sessizlik nöbeti: iş verilen oturum uzun süre hiçbir şey yazmazsa haber verir.
// Donan, kullanım sınırı dolan ya da bilgisayar uyuduğu için duran oturum başka türlü sessizce bekler.
// Orkestratör işi gönderdikten sonra ARKA PLANDA çalıştırır; betik bitince orkestratör kendiliğinden uyanır.
//
//   node .claude/teke/araclar/nobet.js kod --tarif docs/devir/<iş>.md      (ya da: tasarim)
//        [--dk 13]         bu kadar dakika sessizlikte haber ver
//        [--en-fazla 240]  en çok bu kadar dakika nöbet tut
//        [--kayit <oturum kaydı .jsonl>]   rol yerine doğrudan kayıt dosyası
// İngilizce adlar da geçerlidir: code | design, --brief, --minutes, --max-minutes, --transcript.
// Üç durumda biter ve tek satır yazar: nöbet sürerken yeni rapor yazıldı (iş bitti), oturum sessiz kaldı, nöbet süresi doldu.
const fs = require("fs");
const path = require("path");
const { projeKoku, jsonDene, oku, paket, m, bayraklariCevir, RAPOR_BASLIGI } = require("../kancalar/ortak");

bayraklariCevir();
const arg = (ad) => { const i = process.argv.indexOf("--" + ad); return i >= 0 ? process.argv[i + 1] : undefined; };
const kok = projeKoku({});
const ROL_ES = { code: "kod", design: "tasarim", tasarım: "tasarim" };
const rolHam = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const rol = rolHam ? ROL_ES[rolHam] || rolHam : null;
const dk = Number(arg("dk") || 13);
const enFazla = Number(arg("en-fazla") || 240);
const aralikMs = Number(arg("aralik-sn") || 20) * 1000;
const tarif = arg("tarif") ? path.resolve(kok, arg("tarif")) : null;

function kayitBul() {
  if (arg("kayit")) return path.resolve(arg("kayit"));
  const klasor = path.join(kok, ".claude", "teke", "durum");
  let enYeni = null;
  let dosyalar = [];
  try { dosyalar = fs.readdirSync(klasor).filter((f) => f.endsWith(".json")); } catch {}
  for (const f of dosyalar) {
    const d = jsonDene(path.join(klasor, f), {});
    if (d.rol !== rol || !d.kayit) continue;
    let z = 0;
    try { z = fs.statSync(d.kayit).mtimeMs; } catch { continue; }
    if (!enYeni || z > enYeni.z) enYeni = { z, yol: d.kayit };
  }
  return enYeni ? enYeni.yol : null;
}
const bitir = (s) => { console.log(s); process.exit(0); };
const saat = (ms) => { const t = new Date(ms); return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`; };
const ad = (rol && paket(kok).rolAdlari[rol]) || rolHam || m("nobet.izlenen", "izlenen oturum");

// Düzeltme turunda tarifte önceki turun raporu zaten durur: yalnız nöbet başladıktan sonra eklenen rapor "bitti" sayılır.
const RAPORLAR = new RegExp(RAPOR_BASLIGI.source, "gim");
const raporSay = () => ((oku(tarif) || "").match(RAPORLAR) || []).length;
const basRapor = tarif ? raporSay() : 0;
// Rapor mesajla da gelebilir (tarif verilmemiş ya da rapor başka dosyaya yazılmış): izlenen oturumun kaydına nöbet
// başladıktan sonra yazılan, "RAPOR:" ("REPORT:") ile başlayan bir gönderim de "bitti" sayılır.
let kayitBasi = -1;
function raporMesaji(yol) {
  try {
    const boyut = fs.statSync(yol).size;
    if (kayitBasi < 0) { kayitBasi = boyut; return false; }
    if (boyut <= kayitBasi) return false;
    const n = Math.min(boyut - kayitBasi, 4 * 1024 * 1024);
    const tampon = Buffer.alloc(n);
    const fd = fs.openSync(yol, "r");
    fs.readSync(fd, tampon, 0, n, boyut - n);
    fs.closeSync(fd);
    return /"message"\s*:\s*"(RAPOR|REPORT)\s*:/.test(tampon.toString("utf8"));
  } catch { return false; }
}
const basladi = Date.now();
let kayit = null;
function bak() {
  if (tarif && raporSay() > basRapor) bitir(m("nobet.yazildi", "RAPOR YAZILDI: {yol}. Nöbet bitti.", { yol: path.relative(kok, tarif).replace(/\\/g, "/") }));
  kayit = kayit || kayitBul();
  if (kayit && raporMesaji(kayit)) bitir(m("nobet.gonderildi", "RAPOR GÖNDERİLDİ: {ad} raporunu mesajla yolladı. Nöbet bitti.", { ad }));
  const gecen = (Date.now() - basladi) / 60000;
  if (kayit) {
    let son = 0;
    try { son = fs.statSync(kayit).mtimeMs; } catch {}
    // Sessizlik nöbetin başladığı andan sayılır: iş verilmeden önceki boşta bekleme sessizlik değildir.
    if (son && (Date.now() - Math.max(son, basladi)) / 60000 >= dk) {
      bitir(m("nobet.sessiz", "SESSİZ: {ad} {n} dakikadır hiçbir şey yazmadı (son yazma {saat}). Takılmış, kullanım sınırı dolmuş, bilgisayar uyumuş ya da uzun bir komutun bitmesini bekliyor olabilir: oturum listesinden durumuna bak; gerçekten durmuşsa kullanıcıya tek satırla söyle.", { ad, n: Math.round((Date.now() - son) / 60000), saat: saat(son) }));
    }
  } else if (gecen >= dk) {
    bitir(m("nobet.kayityok", "SESSİZ: {ad} için oturum kaydı {n} dakikadır bulunamadı; oturum hiç başlamamış olabilir (güven onayı ya da başlatılmamış kart). Oturum listesinden bak.", { ad, n: Math.round(gecen) }));
  }
  if (gecen >= enFazla) bitir(m("nobet.doldu", "Nöbet süresi doldu ({n} dakika); {ad} hâlâ çalışıyor görünüyor. Gerekirse nöbeti yeniden başlat.", { n: enFazla, ad }));
}
if (!rol && !arg("kayit")) bitir(m("nobet.kullanim", "Kullanım: node .claude/teke/araclar/nobet.js kod|tasarim [--tarif <iş tarifi>] [--dk 13]"));
bak();
setInterval(bak, aralikMs);
