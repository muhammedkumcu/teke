// Teke — betiklerin ortak yardımcıları.
// İlke: betik hatası işi ASLA durdurmaz. Yalnız bilerek verilen "reddet" kararı durdurur.
const fs = require("fs");
const path = require("path");

const BOM = /^﻿/;
function girdiOku() {
  return new Promise((coz) => {
    let ham = "";
    let bitti = false;
    const bitir = () => {
      if (bitti) return;
      bitti = true;
      try { coz(JSON.parse(ham.replace(BOM, ""))); } catch { coz({}); }
    };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (d) => (ham += d));
    process.stdin.on("end", bitir);
    process.stdin.on("error", bitir);
    setTimeout(bitir, 5000).unref(); // stdin hiç kapanmazsa oturumu kilitleme
  });
}

function oku(yol) {
  try { return fs.readFileSync(yol, "utf8").replace(BOM, ""); } catch { return null; }
}
function jsonOku(yol) {
  return JSON.parse(fs.readFileSync(yol, "utf8").replace(BOM, ""));
}
function jsonDene(yol, vars) {
  try { return jsonOku(yol); } catch { return vars; }
}

// Türkçe İ/I/ı farkını ve büyük-küçük harfi yok sayan karşılaştırma biçimi.
function katla(s) {
  return String(s || "").replace(/[İIı]/g, "i").toLowerCase().replace(/i̇/g, "i").replace(/[`*_]/g, "").trim();
}
// Alıntı karşılaştırması için: yalnız harf ve rakam kalır (tırnak, noktalama, boşluk farkı sayılmaz).
function yalin(s) {
  return katla(s).replace(/[^\p{L}\p{N}]+/gu, "");
}

let SON_KOK = null; // son bulunan proje kökü: dil paketi buradan yüklenir
function projeKoku(girdi) {
  return (SON_KOK = projeKokuBul(girdi));
}
function projeKokuBul(girdi) {
  const adaylar = [process.env.CLAUDE_PROJECT_DIR, girdi && girdi.cwd, process.cwd()].filter(Boolean);
  for (const a of adaylar) {
    if (fs.existsSync(path.join(a, ".claude", "teke", "ayar.json"))) return a;
  }
  let d = adaylar[adaylar.length - 1] || process.cwd(); // cwd alt klasör olabilir: yukarı doğru ara
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(d, ".claude", "teke", "ayar.json"))) return d;
    const ust = path.dirname(d);
    if (ust === d) break;
    d = ust;
  }
  return adaylar[0] || process.cwd();
}

// ---------- dil paketi ----------
// Betikler tek kopyadır; modelin ve kullanıcının okuduğu metinler ile projeye kurulan adlar dile göre değişir.
// Türkçe değerler burada ve betiklerin içinde durur (varsayılan). Başka dilde kurulumda kurucu, kit kaynağındaki
// kit/dil/<dil>/dil.json dosyasını .claude/teke/dil.json olarak kopyalar; orada yazan ad ve metin buradakinin yerine geçer.
// Betiklerin OKUDUĞU işaretler (ROL:, DEVİR:, KAPANDI:, "## Rapor" …) her iki dilde de tanınır; dile bağlı değildir.
const VARSAYILAN_PAKET = {
  dil: "tr",
  klasorler: { kurallar: "kurallar", beceriler: "beceriler", ajanlar: "ajanlar", sablonlar: "sablonlar" },
  belgeler: {},                       // varsayılan belge adının bu dildeki karşılığı: { "DEVAM.md": "STATUS.md", … }
  devirKlasoru: "docs/devir",
  arsivKlasoru: "docs/arsiv",
  sablonAdi: "_SABLON.md",
  koruOnek: "KORU-",
  roller: { orkestrator: "orkestrator", kod: "kod", tasarim: "tasarim" },                    // dosya adlarında
  rolAdlari: { orkestrator: "orkestratör", kod: "kod oturumu", tasarim: "tasarım oturumu" }, // cümle içinde
  beceriler: ["devir", "is-kapat", "compact-hazirlik"],
  ajanlar: ["tarayici", "hata-avcisi", "test-korlugu", "elestirmen", "supheci"],
  basliklar: { suAn: ["ŞU AN", "SIRADAK"], bekleyen: ["BEKLEYENLER", "AÇIK KARAR"], hedef: ["HEDEF"], harita: ["HARİTA", "HARITA"] },
  kararOnek: "K",
  onayAdlari: [],                     // varsayılan onay listesindeki adların bu dildeki karşılığı (sırayla)
  kurulumBelgesi: "KURULUM.md",
  metin: {},
};
let PAKET = null;
function paketBirlestir(p) {
  const s = { ...VARSAYILAN_PAKET, ...(p || {}) };
  for (const k of ["klasorler", "belgeler", "roller", "rolAdlari", "basliklar", "metin"]) s[k] = { ...VARSAYILAN_PAKET[k], ...((p && p[k]) || {}) };
  return s;
}
function paket(kok) {
  if (PAKET) return PAKET;
  const k = kok || SON_KOK || projeKokuBul({});
  return (PAKET = paketBirlestir(jsonDene(path.join(k, ".claude", "teke", "dil.json"), null)));
}
function paketAyarla(p) {
  return (PAKET = paketBirlestir(p));
}
// Metin: paket bu anahtar için metin veriyorsa o, vermiyorsa buradaki Türkçe. {ad} yer tutucuları d nesnesinden dolar.
function m(anahtar, tr, d) {
  const p = paket();
  const s = typeof p.metin[anahtar] === "string" ? p.metin[anahtar] : tr;
  return d ? s.replace(/\{(\w+)\}/g, (x, k) => (k in d ? String(d[k]) : x)) : s;
}
// Araçların İngilizce seçenek adları Türkçe adlarıyla aynı işi görür.
const BAYRAK_ES = {
  "--target": "--hedef", "--to": "--hedef", "--lang": "--dil", "--untracked": "--git-disi", "--name": "--ad", "--dry-run": "--prova",
  "--archive": "--arsivle", "--move": "--tasi", "--heading": "--baslik", "--item": "--madde",
  "--mark": "--isaretle", "--long": "--uzun", "--all": "--hepsi", "--transcript": "--kayit",
  "--brief": "--tarif", "--minutes": "--dk", "--max-minutes": "--en-fazla", "--interval-sec": "--aralik-sn",
};
function bayraklariCevir() {
  process.argv = process.argv.map((a) => BAYRAK_ES[a] || a);
}

const VARSAYILAN_AYAR = {
  dil: "tr",
  belgeKoku: "",
  yasaDosyasi: "CLAUDE.md",
  devirKlasoru: "",
  belge: { yollar: {}, haberKB: {} },
  roller: { kod: { model: "opus", efor: "high" }, tasarim: { model: "opus", efor: "high" }, ajanIsci: "sonnet", ajanHakem: "opus" },
  ajan: { yasakModeller: [], forkYasak: true, modelZorunlu: true },
  baglam: { bildirYuzde: 50, compactYuzde: 65, pencere: 1000000, pencereler: {} },
  commit: { ortakYazarYasak: false },
  onay: { desenler: [] },
  ders: { hatirlatMesaj: 25 },
  kapaliKancalar: [],
};

// ayar.json yoksa: kit kurulu değil. VAR ama okunamıyorsa: _bozuk işaretlenir, varsayılanla sürülür.
function ayarOku(kok) {
  const yol = path.join(kok, ".claude", "teke", "ayar.json");
  let a = {};
  let bozuk = false;
  if (fs.existsSync(yol)) {
    try { a = jsonOku(yol); } catch { bozuk = true; }
  }
  const s = { ...VARSAYILAN_AYAR, ...a };
  for (const k of ["belge", "roller", "ajan", "baglam", "commit", "onay", "ders"]) s[k] = { ...VARSAYILAN_AYAR[k], ...(a[k] || {}) };
  if (bozuk) s._bozuk = true;
  // Bu bilgisayara ait bilgiler (kit kaynağının yolu) depoya girmeyen yerel dosyada durur.
  try { const y = jsonOku(path.join(kok, ".claude", "teke", "yerel.json")); if (y.kitKaynagi) s.kitKaynagi = y.kitKaynagi; } catch {}
  return s;
}

// Kurallarda geçen varsayılan belge adını projedeki gerçek yola çevirir.
//  - ayar.belge.yollar: { "docs/KARARLAR.md": "YOL-HARITASI.md", ... } (kendi düzeni olan projeler; anahtar
//    varsayılan Türkçe ad ya da kurulum dilindeki ad olabilir)
//  - dil paketi: varsayılan adın kurulum dilindeki karşılığı ("DEVAM.md" → "STATUS.md")
//  - ayar.belgeKoku: git dışı kurulumda ".teke"; ayar.yasaDosyasi: git dışı kurulumda "CLAUDE.local.md"
function paketAdi(goreli) {
  return paket().belgeler[goreli] || goreli;
}
function belgeYolu(kok, ayar, goreli) {
  const esleme = (ayar && ayar.belge && ayar.belge.yollar) || {};
  const yerel = paketAdi(goreli);
  if (esleme[goreli]) return path.join(kok, esleme[goreli]);
  if (esleme[yerel]) return path.join(kok, esleme[yerel]);
  if (goreli === "CLAUDE.md") return path.join(kok, (ayar && ayar.yasaDosyasi) || "CLAUDE.md");
  return path.join(kok, (ayar && ayar.belgeKoku) || "", yerel);
}
function belgeAdi(kok, ayar, goreli) {
  return path.relative(kok, belgeYolu(kok, ayar, goreli)).replace(/\\/g, "/");
}
function devirKlasoru(kok, ayar) {
  return path.join(kok, (ayar && ayar.devirKlasoru) || path.join((ayar && ayar.belgeKoku) || "", paket().devirKlasoru));
}
function arsivKlasoru(kok, ayar) {
  return path.join(kok, (ayar && ayar.belgeKoku) || "", paket().arsivKlasoru);
}
// Devir klasöründeki iş tarifi olmayan dosyalar (şablon ve KORU notları), kapanış satırı ve rapor başlığı: her iki dilde.
const TARIF_DEGIL = /^(_SABLON|_TEMPLATE|KORU-|KEEP-)/i;
const KAPANDI_SATIRI = /^(KAPANDI|CLOSED)\s*:/im;
const RAPOR_BASLIGI = /^##\s*(Rapor|Report)/im;

// Başlığında verilen sözcüklerden biri geçen bölümü döndürür (Türkçe İ/I ve büyük-küçük harf duyarsız).
// Sözcük başlıkta bir sözcüğün BAŞINDA aranır ("HEDEF" → "HEDEFLER" olur; "NOW" → "Known" olmaz).
// Belgenin en başındaki tek # başlık (belgenin adı) bölüm sayılmaz.
function bolum(metin, sozcukler, enFazla) {
  const satirlar = metin.split(/\r?\n/);
  let cit = false; // kod çiti içindeki "# …" satırı başlık değildir
  const baslik = satirlar.map((s) => { if (/^\s*(```|~~~)/.test(s)) { cit = !cit; return false; } return !cit && /^#{1,3}\s/.test(s); });
  const ilkDolu = satirlar.findIndex((s) => s.trim());
  if (ilkDolu >= 0 && /^#\s/.test(satirlar[ilkDolu])) baslik[ilkDolu] = false;
  const desenler = sozcukler.map((z) => new RegExp("(^|[^\\p{L}\\p{N}])" + katla(z).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  const i = satirlar.findIndex((s, n) => baslik[n] && desenler.some((d) => d.test(katla(s.replace(/^#+\s*/, "")))));
  if (i < 0) return "";
  const seviye = satirlar[i].match(/^#+/)[0].length;
  let j = i + 1;
  while (j < satirlar.length && !(baslik[j] && satirlar[j].match(/^#+/)[0].length <= seviye)) j++;
  const b = satirlar.slice(i, j).join("\n").trim();
  return b.length > enFazla ? b.slice(0, enFazla) + m("kirpildi", "\n…(kırpıldı; dosyanın kendisini oku)") : b;
}
// Durum belgesinin bölümleri. Önce kurulum dilindeki başlıklarla aranır; bulunamazsa öteki dilin başlıklarıyla
// (dili sonradan değiştirilen projede belgeler yeniden adlandırılmaz ve eski dilde kalır).
const TUM_BASLIKLAR = {
  suAn: [["ŞU AN", "SIRADAK"], ["NOW", "NEXT"]],
  bekleyen: [["BEKLEYENLER", "AÇIK KARAR"], ["WAITING ON YOU"]],
  hedef: [["HEDEF"], ["TARGETS"]],
  harita: [["HARİTA", "HARITA"], ["MAP"]],
};
function durumBolumu(metin, ad, enFazla) {
  for (const sozcukler of [paket().basliklar[ad], ...(TUM_BASLIKLAR[ad] || [])]) {
    const b = sozcukler && sozcukler.length ? bolum(metin, sozcukler, enFazla) : "";
    if (b) return b;
  }
  return "";
}
// Rolün compact notu (KORU / KEEP): kurulum dilindeki adla, yoksa öteki dildeki adla aranır; birden çoksa en yenisi.
function koruDosyasi(kok, ayar, rol) {
  const P = paket();
  const adlar = [...new Set([`${P.koruOnek}${P.roller[rol]}.md`, `KORU-${rol}.md`, `KEEP-${{ orkestrator: "orchestrator", kod: "code", tasarim: "design" }[rol]}.md`])];
  const klasor = devirKlasoru(kok, ayar);
  let secilen = null;
  for (const ad of adlar) {
    let z = 0;
    try { z = fs.statSync(path.join(klasor, ad)).mtimeMs; } catch { continue; }
    if (!secilen || z > secilen.z) secilen = { ad, yol: path.join(klasor, ad), z };
  }
  return secilen;
}
// Kullanıcıdan beklenenlerin tek listesi: durum belgesindeki "Bekleyenler" bölümü (eski adı "Açık kararlar").
// Bölümün maddeleri; bölüm yoksa ya da madde yerine düz yazıyla doldurulmuşsa null (karışılmaz), bölüm var ama boşsa [].
// Girintili alt madde ve maddenin alt satıra kayan devamı üst maddeye eklenir; yalnız "yok" yazan madde sayılmaz.
function bekleyenler(kok, ayar) {
  const metin = oku(belgeYolu(kok, ayar, "DEVAM.md"));
  const b = metin ? durumBolumu(metin, "bekleyen", 8000) : "";
  if (!b) return null;
  const MADDE = /^([-*+]|\d+[.)])\s+(\S.*)$/;
  const YOK = /^(yok|none)[.!]?$/;
  const maddeler = [];
  let duzYazi = false;
  for (const s of b.split(/\r?\n/).slice(1)) {
    const t = s.trim();
    if (!t || t.startsWith(">")) continue;
    const girintili = /^(\s{2,}|\t)/.test(s);
    const e = t.match(MADDE);
    if (e && !girintili) { if (!YOK.test(katla(e[2]))) maddeler.push(t); }
    else if (maddeler.length && girintili) maddeler[maddeler.length - 1] += " " + (e ? e[2] : t);
    else if (!YOK.test(katla(t))) duzYazi = true;
  }
  return !maddeler.length && duzYazi ? null : maddeler;
}
// Mesajı kullanıcı mı yazdı (uygulamanın ya da başka oturumun eklediği mesaj değil)?
function kullanicidanMi(metin) {
  const t = String(metin || "").trim();
  return !!t && !KULLANICI_DEGIL.test(t) && !/^(<|Another Claude session|\[)/.test(t);
}

function cikar(nesne) {
  try { fs.writeSync(1, JSON.stringify(nesne)); } catch { process.stdout.write(JSON.stringify(nesne)); }
}
function reddet(neden) {
  cikar({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "[teke] " + neden } });
  process.exit(0);
}
function kullaniciyaSor(neden) {
  cikar({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "ask", permissionDecisionReason: "[teke] " + neden } });
  process.exit(0);
}
function baglamEkle(olay, metin) {
  cikar({ hookSpecificOutput: { hookEventName: olay, additionalContext: metin } });
  process.exit(0);
}

// ---------- oturum durumu (yerel, git'e girmez): .claude/teke/durum/<oturum>.json ----------
function durumYolu(kok, oturum) {
  return path.join(kok, ".claude", "teke", "durum", String(oturum || "bilinmeyen").replace(/[^\w-]/g, "_") + ".json");
}
function durumOku(kok, oturum) {
  return jsonDene(durumYolu(kok, oturum), {});
}
function durumYaz(kok, oturum, d) {
  try {
    const y = durumYolu(kok, oturum);
    fs.mkdirSync(path.dirname(y), { recursive: true });
    fs.writeFileSync(y, JSON.stringify(d, null, 2) + "\n");
  } catch {}
}

// ---------- rol ----------
// Rol sırasıyla şuradan bulunur:
//  1) oturum durum dosyasında kayıtlıysa o (bir kez bulunan rol hatırlanır);
//  2) oturumun ilk kullanıcı mesajında "ROL: kod | tasarım | orkestratör" (ya da "ROLE: code | design | orchestrator") satırı varsa o;
//  3) ilk mesaj, uygulamanın başka oturumun açtığı oturuma koyduğu başlığı ya da "DEVİR: …md" ("HANDOFF: …md") satırını taşıyorsa "kod";
//  4) hiçbiri değilse "orkestrator" (kullanıcının doğrudan konuştuğu oturum).
// Rolün iç adı her dilde aynıdır: orkestrator | kod | tasarim.
// Etiket büyük harfle ve satır başında yazılır; değer tam bir sözcüktür. Böylece sıradan bir cümle ("Role: code reviewer",
// "rol: kodlama", satır başında "handoff: notes.md") oturumun rolünü değiştirmez.
const ROL_SATIRI = /(?:^|\n|>)[ \t]*(?:ROLE|ROL)[ \t]*:[ \t]*([\p{L}]+)(?![\p{L}\p{N}_-])/gu;
const ROL_DEGERI = { kod: "kod", code: "kod", tasarim: "tasarim", design: "tasarim", orkestratör: "orkestrator", orkestrator: "orkestrator", orchestrator: "orkestrator" };
// "DEVİR: <yol>.md" satırı; yol boşluk içerebilir ve tırnak içinde olabilir. 1. grup dosya yoludur.
const DEVIR_SATIRI = /(?:^|\n|>)[ \t]*(?:DEV[İI]R|HANDOFF)[ \t]*:[ \t]*[`"']?([^\n`"']+?\.md)(?![\w.])/;
const BASKA_OTURUM = /Background \(from the session that started this one\)/i;
// Metindeki ilk geçerli rol satırının rolü (iç adıyla); yoksa null.
function rolSatiri(metin) {
  for (const e of String(metin || "").matchAll(ROL_SATIRI)) {
    const r = ROL_DEGERI[katla(e[1])];
    if (r) return r;
  }
  return null;
}
// Mesaj metninden rol: "ROL:" satırı varsa o; yoksa başka oturumdan gelen iş mesajıysa "kod"; hiçbiri değilse null.
function metindenRol(metin) {
  const t = String(metin || "").slice(0, 8000);
  return rolSatiri(t) || (BASKA_OTURUM.test(t) || DEVIR_SATIRI.test(t) ? "kod" : null);
}
// Bu mesaj oturuma iş veren bir devir mi (rolü sonradan değiştirebilen tek mesaj türü)?
function devirMesajiMi(metin) {
  const t = String(metin || "").slice(0, 8000);
  return DEVIR_SATIRI.test(t) && !!rolSatiri(t);
}
// Kayıt satırı kullanıcı mesajı taşıyor olabilir mi (ayrıştırmadan önce hızlı eleme)?
function kullaniciSatiriMi(s) {
  return (s.includes('"type":"user"') && !s.includes('"tool_result"')) || s.includes('"queued_command"');
}
function kullaniciMetni(o) {
  // Tur sürerken yazılan mesaj kayıtta ek olarak durur (attachment / queued_command).
  if (o && o.type === "attachment" && o.attachment && o.attachment.type === "queued_command") {
    const a = o.attachment;
    return a.origin && a.origin.kind && a.origin.kind !== "human" ? "" : String(a.prompt || "");
  }
  if (!o || o.type !== "user" || o.isMeta || !o.message) return "";
  const c = o.message.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.filter((b) => b && b.type === "text").map((b) => b.text).join("\n");
  return "";
}
// Kullanıcının kendi yazdığı söz: uygulamanın eklediği sarmalayıcılar atılır; kullanıcının yazmadığı mesajda "" döner.
const KULLANICI_DEGIL = /^(<command-name>|<local-command|<task-notification|<side-sessions-event|<ci-monitor-event|<cross-session-message|<agent-message|Another Claude session sent|\[Request interrupted|This session is being continued from a previous conversation|Caveat: The messages below|\[Cross-session|<bash-|<user-prompt-submit-hook)/;
function kullaniciSozu(o) {
  if (!o || o.isSidechain || o.isCompactSummary || o.isVisibleInTranscriptOnly) return "";
  const s = kullaniciMetni(o)
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<artifact-view-context[\s\S]*?<\/artifact-view-context>/g, "")
    .replace(/<\/?pasted_content[^>]*>/g, "")
    .trim();
  return !s || KULLANICI_DEGIL.test(s) ? "" : s;
}
function rolBul(girdi, kok) {
  try {
    const d = durumOku(kok, girdi.session_id);
    if (d.rol) return d.rol;
    const yol = girdi.transcript_path;
    if (!yol || !fs.existsSync(yol)) return "orkestrator";
    const fd = fs.openSync(yol, "r");
    const tampon = Buffer.alloc(262144);
    const n = fs.readSync(fd, tampon, 0, tampon.length, 0);
    fs.closeSync(fd);
    for (const s of tampon.toString("utf8", 0, n).split("\n")) {
      if (!s.includes('"type":"user"')) continue;
      let o;
      try { o = JSON.parse(s); } catch { continue; }
      const metin = kullaniciMetni(o);
      if (!metin.trim()) continue;
      return metindenRol(metin) || "orkestrator";
    }
  } catch {}
  return "orkestrator";
}

// ---------- bağlam ölçümü ----------
// Oturum kaydının sonundaki son asıl yanıtın kullanım sayılarından okunur (uygulamanın gösterdiği yüzdeyle aynı kaynak).
// Yalnız dosyanın son parçası okunur; kayıt yüzlerce MB olabilir.
function baglamOlc(kayitYolu, ayar) {
  // Son yanıt satırı büyük bir araç çıktısının (görüntü, sayfa) gerisinde kalmış olabilir: bulunamazsa daha geniş parça okunur.
  for (const mb of [1.5, 12, 48]) {
    const s = baglamOlcParca(kayitYolu, ayar, Math.round(mb * 1024 * 1024));
    if (s === undefined) return null;      // dosya okunamadı
    if (s) return s;
  }
  return null;
}
function baglamOlcParca(kayitYolu, ayar, enFazla) {
  try {
    const boyut = fs.statSync(kayitYolu).size;
    const parca = Math.min(boyut, enFazla);
    const fd = fs.openSync(kayitYolu, "r");
    const tampon = Buffer.alloc(parca);
    fs.readSync(fd, tampon, 0, parca, boyut - parca);
    fs.closeSync(fd);
    const satirlar = tampon.toString("utf8").split("\n");
    const b0 = (ayar && ayar.baglam) || VARSAYILAN_AYAR.baglam;
    for (let i = satirlar.length - 1; i >= 0; i--) {
      const s = satirlar[i];
      // Compact sınırından sonra henüz yanıt yoksa eski (compact öncesi) ölçüm geçersizdir: boş say.
      if (s.includes('"compact_boundary"') && s.length < 20000) {
        try { const k = JSON.parse(s); if (k.type === "system" && k.subtype === "compact_boundary") return { belirtec: 0, model: "", pencere: b0.pencere || 1000000, yuzde: 0, compactSonrasi: true }; } catch {}
      }
      if (!s.includes('"usage"') || !s.includes('"type":"assistant"')) continue;
      let o;
      try { o = JSON.parse(s); } catch { continue; }
      if (o.type !== "assistant" || o.isSidechain || !o.message || !o.message.usage) continue;
      const u = o.message.usage;
      const belirtec = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
      if (!belirtec) continue;
      const model = o.message.model || "";
      const b = (ayar && ayar.baglam) || VARSAYILAN_AYAR.baglam;
      const pencere = (b.pencereler && b.pencereler[model]) || b.pencere || 1000000;
      return { belirtec, model, pencere, yuzde: Math.round((belirtec / pencere) * 100) };
    }
    return boyut <= enFazla ? undefined : null; // dosyanın tamamı okundu ve ölçüm yok: daha geniş okumak anlamsız
  } catch { return undefined; }
}

// Ölçümden haber satırı üretir; söylenecek bir şey yoksa null. Aynı düzey iki kez söylenmez: yalnız eşik ilk
// aşıldığında ve doluluk her beş puan arttığında haber verilir. d (oturum durumu) yerinde güncellenir.
function baglamHaberi(ayar, d, b, rol) {
  if (!b) return null;
  const { bildirYuzde, compactYuzde } = ayar.baglam;
  if (b.yuzde < bildirYuzde) { d.sonBant = 0; return null; }
  const bant = Math.floor(b.yuzde / 5) * 5;
  if (bant <= (d.sonBant || 0)) return null;
  d.sonBant = bant;
  const v = { olcum: m("baglam.olcum", "[teke bağlam] Ölçüm: %{yuzde} ({bin} bin / {pencere} bin)", { yuzde: b.yuzde, bin: Math.round(b.belirtec / 1000), pencere: Math.round(b.pencere / 1000) }), bildir: bildirYuzde, compact: compactYuzde };
  if (b.yuzde >= compactYuzde) {
    return rol === "orkestrator"
      ? m("baglam.compact.ork", "{olcum}, compact eşiği %{compact} aşıldı. Adımı bitir, compact-hazirlik becerisini uygula ve yanıtının İLK satırında kullanıcıdan bu oturumda /compact yazmasını iste.", v)
      : m("baglam.compact.diger", "{olcum}, compact eşiği %{compact} aşıldı. Adımın sonunda dur, compact-hazirlik becerisini uygula ve orkestratöre raporunda COMPACT GEREK de.", v);
  }
  return rol === "orkestrator"
    ? m("baglam.bildir.ork", "{olcum}, bildirim eşiği %{bildir} üstünde. Yanıtının ilk satırında kullanıcıya tek cümleyle haber ver; compact eşiği %{compact}. Büyük bir işe girilecekse önce compact.", v)
    : m("baglam.bildir.diger", "{olcum}, bildirim eşiği %{bildir} üstünde. Raporunda yüzdeyi yaz; compact eşiği %{compact}. Büyük bir işe girilecekse önce compact.", v);
}

function guvenli(ana) {
  process.on("uncaughtException", () => process.exit(0));
  process.on("unhandledRejection", () => process.exit(0));
  // ayar.json → kapaliKancalar içinde adı geçen betik hemen susar (kayıttan çıkması için kurucunun yeniden çalışması gerekmez).
  try {
    const ad = path.basename((require.main && require.main.filename) || "");
    if (ad && (ayarOku(projeKokuBul({})).kapaliKancalar || []).includes(ad)) process.exit(0);
  } catch {}
  Promise.resolve().then(ana).catch(() => process.exit(0));
}

module.exports = {
  girdiOku, oku, jsonOku, jsonDene, katla, yalin, projeKoku, ayarOku, belgeYolu, belgeAdi, devirKlasoru, arsivKlasoru,
  reddet, kullaniciyaSor, baglamEkle, durumYolu, durumOku, durumYaz, rolBul, metindenRol, devirMesajiMi, kullaniciMetni, kullaniciSozu, kullaniciSatiriMi,
  baglamOlc, baglamHaberi, DEVIR_SATIRI, guvenli, VARSAYILAN_AYAR, bolum, durumBolumu, koruDosyasi, bekleyenler, kullanicidanMi,
  paket, paketAyarla, paketAdi, m, bayraklariCevir, VARSAYILAN_PAKET, TARIF_DEGIL, KAPANDI_SATIRI, RAPOR_BASLIGI,
};
