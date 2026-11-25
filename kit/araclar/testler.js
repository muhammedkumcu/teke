#!/usr/bin/env node
// Kit testleri: kurucu, kendiliğinden çalışan betikler ve araçlar. Kit kaynağında koşulur:
//   node kit/araclar/testler.js [--sessiz]
// Her test geçici bir klasörde gerçek kurulum yapar ve betikleri uygulamanın çağıracağı biçimde çalıştırır.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const KIT = path.resolve(__dirname, "..");
const KUR = path.join(KIT, "araclar", "kur.js");
const sessiz = process.argv.includes("--sessiz");
let gecti = 0;
const kalanlar = [];
function esit(ad, kosul, ayrinti) {
  if (kosul) { gecti++; if (!sessiz) console.log("GEÇTİ  " + ad); }
  else { kalanlar.push(ad); console.log("KALDI  " + ad + (ayrinti ? "\n       " + String(ayrinti).slice(0, 600) : "")); }
}
const gecici = [];
function klasor(git = true) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ork-test-"));
  gecici.push(d);
  if (git) spawnSync("git", ["init", "-q"], { cwd: d });
  return d;
}
const kur = (hedef, ...ek) => spawnSync(process.execPath, [KUR, "--hedef", hedef, ...ek], { encoding: "utf8" });
const yaz = (y, m) => { fs.mkdirSync(path.dirname(y), { recursive: true }); fs.writeFileSync(y, m); };
const oku = (y) => fs.readFileSync(y, "utf8");
const var_ = (...p) => fs.existsSync(path.join(...p));
function betik(kok, ad, girdi) {
  const r = spawnSync(process.execPath, [path.join(kok, ".claude", "teke", "kancalar", ad)], { input: JSON.stringify(girdi), encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: kok }, cwd: kok });
  let c = null;
  try { c = JSON.parse(r.stdout); } catch {}
  const h = (c && c.hookSpecificOutput) || {};
  return { kod: r.status, karar: h.permissionDecision || null, neden: h.permissionDecisionReason || "", ek: h.additionalContext || "", ham: r.stdout, hata: r.stderr };
}
const arac = (kok, ad, ...a) => spawnSync(process.execPath, [path.join(kok, ".claude", "teke", "araclar", ad), ...a], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: kok }, cwd: kok });
// Sahte oturum kaydı
const kul = (metin, ek = {}) => JSON.stringify({ type: "user", timestamp: "2026-11-25T10:00:00.000Z", message: { role: "user", content: metin }, ...ek });
const arcSonuc = () => JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "tool_result", tool_use_id: "x", content: "çıktı öyle demedim" }] } });
const asi = (belirtec, model = "claude-opus-5-5") => JSON.stringify({ type: "assistant", message: { role: "assistant", model, usage: { input_tokens: 10, cache_read_input_tokens: belirtec - 110, cache_creation_input_tokens: 50, output_tokens: 50 }, content: [{ type: "text", text: "tamam" }] } });
function kayit(kok, ad, satirlar) {
  const y = path.join(kok, ad + ".jsonl");
  fs.writeFileSync(y, satirlar.join("\n") + "\n");
  return y;
}

// ================= A) KURULUM =================
{
  const d = klasor();
  let r = kur(d);
  esit("A1 boş klasörde kurulum başarılı", r.status === 0, r.stdout + r.stderr);
  esit("A1 soru sormadan belge açtı", ["CLAUDE.md", "DEVAM.md", "docs/KARARLAR.md", "docs/DERSLER.md"].every((f) => var_(d, f)));
  esit("A1 tek kural dosyası", fs.readdirSync(path.join(d, ".claude", "rules")).join() === "teke.md");
  esit("A1 üç beceri, beş yardımcı", fs.readdirSync(path.join(d, ".claude", "skills")).length === 3 && fs.readdirSync(path.join(d, ".claude", "agents")).length === 5);
  esit("A1 yardımcı modelleri dolduruldu", !/\{\{/.test(oku(path.join(d, ".claude", "agents", "elestirmen.md"))) && /^model: opus$/m.test(oku(path.join(d, ".claude", "agents", "elestirmen.md"))));
  const s = arac(d, "saglik.js");
  esit("A1 sağlık kontrolü sağlam", s.status === 0, s.stdout);
  esit("A1 kurucu kendi kontrolünü yapıyor, ayrı doğrulama adımı istemiyor", /Kurulum sağlam/.test(r.stdout) && !/Sıradaki|saglik\.js/.test(r.stdout), r.stdout);
  esit("A1 kendi kontrolü geride durum dosyası bırakmıyor", !var_(d, ".claude", "teke", "durum") || fs.readdirSync(path.join(d, ".claude", "teke", "durum")).length === 0);
  esit("A1 provada kontrol koşmuyor", !/Kurulum sağlam|KUSUR/.test(kur(klasor(), "--prova").stdout));
  esit("A1 .gitignore geçici dosyaları dışlıyor", /KORU-\*\.md/.test(oku(path.join(d, ".gitignore"))) && /teke\/durum\//.test(oku(path.join(d, ".gitignore"))));
  yaz(path.join(d, "DEVAM.md"), "# benim durumum\n");
  r = kur(d);
  esit("A2 yeniden çalıştırma kullanıcı belgesine dokunmuyor", oku(path.join(d, "DEVAM.md")) === "# benim durumum\n" && r.status === 0);
  esit("A2 yeniden çalıştırma hiçbir kit dosyasını değiştirmiyor", /yeni 0, güncellenen 0, kaldırılan 0/.test(r.stdout), r.stdout);
  // ayardaki kullanıcı değişikliği korunur
  const ay = JSON.parse(oku(path.join(d, ".claude", "teke", "ayar.json")));
  ay.onay.desenler = []; ay.roller.kod.efor = "xhigh"; ay.belge.yollar = { "docs/KARARLAR.md": "KARAR.md" };
  yaz(path.join(d, ".claude", "teke", "ayar.json"), JSON.stringify(ay));
  kur(d);
  const ay2 = JSON.parse(oku(path.join(d, ".claude", "teke", "ayar.json")));
  esit("A3 güncelleme kullanıcının ayarını koruyor", ay2.onay.desenler.length === 0 && ay2.roller.kod.efor === "xhigh" && ay2.belge.yollar["docs/KARARLAR.md"] === "KARAR.md");
}
{
  const d = klasor();
  yaz(path.join(d, ".claude", "agents", "tarayici.md"), "kullanıcının kendi ajanı\n");
  const r = kur(d);
  esit("A4 kullanıcının aynı adlı dosyasının üzerine yazılmıyor", r.status === 3 && oku(path.join(d, ".claude", "agents", "tarayici.md")) === "kullanıcının kendi ajanı\n", r.stdout);
}
{
  const d = klasor();
  yaz(path.join(d, "CLAUDE.md"), "# yasa\n"); yaz(path.join(d, "DEVAM.md"), "# durum\n"); yaz(path.join(d, "docs", "DERSLER.md"), "# ders\n");
  const r = kur(d);
  esit("A5 kendi düzeni olan projede eksik belge kendiliğinden açılmıyor", r.status === 0 && !var_(d, "docs", "KARARLAR.md") && /BU ADLA BELGE YOK/.test(r.stdout) && oku(path.join(d, "CLAUDE.md")) === "# yasa\n", r.stdout);
}
{
  const d = klasor();
  yaz(path.join(d, "package.json"), '{"type":"module"}');
  kur(d);
  const b = betik(d, "oturum-baslangici.js", { source: "startup", session_id: "m1" });
  esit("A6 ES modüllü projede betikler çalışıyor", b.kod === 0 && /teke/.test(b.ek), b.hata);
}
{
  const d = klasor();
  yaz(path.join(d, "src.js"), "1\n"); spawnSync("git", ["add", "-A"], { cwd: d }); spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "ilk"], { cwd: d });
  const r = kur(d, "--git-disi");
  const durum = spawnSync("git", ["status", "--porcelain"], { cwd: d, encoding: "utf8" }).stdout.trim();
  esit("A7 git dışı kurulum depoda iz bırakmıyor", r.status === 0 && durum === "" && var_(d, ".teke", "DEVAM.md") && var_(d, "CLAUDE.local.md") && var_(d, ".claude", "settings.local.json"), durum + r.stdout);
  esit("A7 git dışı kurulumda sağlık sağlam", arac(d, "saglik.js").status === 0);
}
{
  // 1.x kurulumundan güncelleme: eski sürüm ".claude/orkestra" klasörünü ve "orkestra.md" kural dosyasını kullanıyordu
  const d = klasor();
  const eskiDosyalar = [".claude/rules/calisma-kurallari.md", ".claude/rules/orkestra.md", ".claude/skills/durum/SKILL.md", ".claude/skills/devir/SKILL.md", ".claude/agents/yazici.md", ".claude/orkestra/kancalar/durus-kapisi.js", ".claude/orkestra/kancalar/istem-durumu.js", ".claude/orkestra/araclar/belge-denetim.js", ".claude/orkestra/sablon/DEVAM.md", "docs/devir/_SABLON.md"];
  for (const f of eskiDosyalar) yaz(path.join(d, f), "eski\n");
  yaz(path.join(d, ".claude", "orkestra", "kurulu-dosyalar.json"), JSON.stringify([...eskiDosyalar, ".claude/orkestra/ayar.json", ".claude/settings.json"]));
  yaz(path.join(d, ".claude", "orkestra", "ayar.json"), JSON.stringify({ kitSurumu: "1.0.4", mod: "yeni", profil: "tam", agirlik: "standart", iletisim: "dengeli", roller: { planlayici: { model: "fable", efor: "high" }, yurutucu: { model: "opus", efor: "high" }, ajanIsci: "sonnet", ajanHakem: "opus" }, ajan: { yasakModeller: ["fable"] }, devir: { klasor: "docs/devir", zorunlu: true }, onay: { desenler: [{ ad: "git push", desen: "\\bgit\\s+push\\b" }] }, durumSatiri: { zorunlu: true }, kapaliKancalar: [] }));
  yaz(path.join(d, ".claude", "settings.json"), JSON.stringify({ permissions: { allow: ["Bash(ls:*)"] }, hooks: { Stop: [{ hooks: [{ type: "command", command: "node", args: ["${CLAUDE_PROJECT_DIR}/.claude/orkestra/kancalar/durus-kapisi.js"] }] }, { hooks: [{ type: "command", command: "echo benim" }] }] } }));
  for (const f of ["CLAUDE.md", "DEVAM.md", "docs/PANO.md", "docs/KARARLAR.md", "docs/DERSLER.md", "docs/SOZLUK.md"]) yaz(path.join(d, f), "kullanıcı belgesi " + f + "\n");
  yaz(path.join(d, ".claude", "skills", "benim", "SKILL.md"), "kullanıcının becerisi\n");
  yaz(path.join(d, ".claude", "orkestra", "oturumlar.json"), JSON.stringify({ kod: { id: "local_eski", model: "opus", efor: "high" } }));
  const r = kur(d);
  esit("A8 güncelleme başarılı", r.status === 0 && /1\.0\.4 → /.test(r.stdout), r.stdout + r.stderr);
  esit("A8 eski klasör yeni ada taşındı, oturum kimlikleri korundu", !var_(d, ".claude", "orkestra") && var_(d, ".claude", "teke", "ayar.json") && /local_eski/.test(oku(path.join(d, ".claude", "teke", "oturumlar.json"))) && /taşındı/.test(r.stdout), r.stdout);
  esit("A8 eski kural dosyası gitti, yenisi geldi, kayıtta eski yol kalmadı", !var_(d, ".claude", "rules", "orkestra.md") && var_(d, ".claude", "rules", "teke.md") && !oku(path.join(d, ".claude", "settings.json")).includes("orkestra/kancalar") && oku(path.join(d, ".claude", "settings.json")).includes("teke/kancalar"));
  esit("A8 taşınan kurulumda sağlık sağlam ve ikinci güncelleme hiçbir şey değiştirmiyor", arac(d, "saglik.js").status === 0 && /yeni 0, güncellenen 0, kaldırılan 0/.test(kur(d).stdout));
  esit("A8 eski kit dosyaları kaldırıldı", [".claude/rules/calisma-kurallari.md", ".claude/skills/durum", ".claude/agents/yazici.md", ".claude/teke/kancalar/durus-kapisi.js", ".claude/teke/sablon"].every((f) => !var_(d, f)));
  esit("A8 kullanıcı belgeleri ve kendi becerisi yerinde", ["CLAUDE.md", "docs/PANO.md", "docs/SOZLUK.md"].every((f) => oku(path.join(d, f)) === "kullanıcı belgesi " + f + "\n") && var_(d, ".claude", "skills", "benim", "SKILL.md"));
  const set = JSON.parse(oku(path.join(d, ".claude", "settings.json")));
  esit("A8 eski Stop betiği kayıttan çıktı, kullanıcının kendi kaydı ve izinleri kaldı", JSON.stringify(set.hooks.Stop) === JSON.stringify([{ hooks: [{ type: "command", command: "echo benim" }] }]) && set.permissions.allow[0] === "Bash(ls:*)" && !!set.hooks.UserPromptSubmit, JSON.stringify(set.hooks));
  const ay = JSON.parse(oku(path.join(d, ".claude", "teke", "ayar.json")));
  esit("A8 ayar yeni biçime taşındı", ay.kitSurumu !== "1.0.4" && ay.roller.kod.efor === "high" && ay.roller.tasarim && ay.onay.desenler.length === 1 && ay.devirKlasoru === "docs/devir" && ay.profil === undefined && ay.durumSatiri === undefined, JSON.stringify(ay));
  esit("A8 güncelleme sonrası sağlık sağlam", arac(d, "saglik.js").status === 0, arac(d, "saglik.js").stdout);
}
{
  // eski adla kurulu projede prova: hiçbir şey taşınmaz, rapor gerçeği gösterir
  const d = klasor();
  kur(d);
  fs.renameSync(path.join(d, ".claude", "teke"), path.join(d, ".claude", "orkestra"));
  yaz(path.join(d, ".claude", "orkestra", "oturumlar.json"), JSON.stringify({ kod: { id: "local_p", model: "opus", efor: "high" } }));
  const r = kur(d, "--prova");
  esit("A12 provada eski klasör taşınmıyor, rapor taşınacağını ve yeni dosya olmadığını söylüyor", r.status === 0 && var_(d, ".claude", "orkestra", "ayar.json") && !var_(d, ".claude", "teke") && /taşınacak/.test(r.stdout) && /kit dosyası: yeni 0,/.test(r.stdout), r.stdout);
  // yeni klasör zaten var (başka bilgisayarda taşınıp depoyla gelmiş): eski klasörde kalan yerel dosyalar alınır
  fs.cpSync(path.join(d, ".claude", "orkestra"), path.join(d, ".claude", "teke"), { recursive: true });
  for (const f of ["ayar.json", "kancalar", "araclar", "SURUM", "package.json", "kurulu-dosyalar.json"]) fs.rmSync(path.join(d, ".claude", "orkestra", f), { recursive: true, force: true });
  fs.rmSync(path.join(d, ".claude", "teke", "oturumlar.json"));
  const r2 = kur(d);
  esit("A12 eski klasörde kalan oturum kimlikleri alınıyor ve eski klasör kalkıyor", r2.status === 0 && /local_p/.test(oku(path.join(d, ".claude", "teke", "oturumlar.json")) || "") && !var_(d, ".claude", "orkestra") && /yerel dosyalar/.test(r2.stdout), r2.stdout);
  // aynı adda ama kitin olmayan klasöre dokunulmaz
  yaz(path.join(d, ".claude", "orkestra", "benim-notum.txt"), "kullanıcının\n");
  const r3 = kur(d);
  esit("A12 aynı adda kullanıcı klasörüne dokunulmuyor", r3.status === 0 && oku(path.join(d, ".claude", "orkestra", "benim-notum.txt")) === "kullanıcının\n", r3.stdout);
}
{
  // eski adla git dışı kurulum: kullanıcının belgeleri ".orkestra" altında yerinde kalır
  const d = klasor();
  yaz(path.join(d, "src.js"), "1\n"); spawnSync("git", ["add", "-A"], { cwd: d }); spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "ilk"], { cwd: d });
  kur(d, "--git-disi");
  fs.renameSync(path.join(d, ".claude", "teke"), path.join(d, ".claude", "orkestra"));
  fs.renameSync(path.join(d, ".teke"), path.join(d, ".orkestra"));
  const ayY = path.join(d, ".claude", "orkestra", "ayar.json"), a0 = JSON.parse(oku(ayY));
  yaz(ayY, JSON.stringify({ ...a0, kitSurumu: "2.0.0", belgeKoku: ".orkestra", devirKlasoru: ".orkestra/docs/devir" }));
  yaz(path.join(d, ".orkestra", "DEVAM.md"), "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Eski git dışı kurulumun işi.\n");
  fs.appendFileSync(path.join(d, ".git", "info", "exclude"), ".orkestra/\n.claude/orkestra/\n");
  const r = kur(d);
  const ay = JSON.parse(oku(path.join(d, ".claude", "teke", "ayar.json")) || "{}");
  const b = betik(d, "oturum-baslangici.js", { source: "startup", session_id: "g1" });
  const durum = spawnSync("git", ["status", "--porcelain"], { cwd: d, encoding: "utf8" }).stdout.trim();
  esit("A13 eski git dışı kurulum taşınıyor, belgeler yerinde kalıyor ve bulunuyor", r.status === 0 && ay.belgeKoku === ".orkestra" && ay.devirKlasoru === ".orkestra/docs/devir" && !var_(d, ".teke") && !var_(d, ".claude", "orkestra") && /Eski git dışı kurulumun işi/.test(b.ek), r.stdout + b.ek);
  esit("A13 taşınan git dışı kurulum depoda iz bırakmıyor, sağlık sağlam", durum === "" && arac(d, "saglik.js").status === 0, durum + arac(d, "saglik.js").stdout);
}
{
  const d = klasor();
  yaz(path.join(d, ".claude", "settings.json"), "{bozuk");
  const r = kur(d);
  esit("A9 bozuk ayar dosyasında hiçbir şey yazılmıyor", r.status === 2 && !var_(d, ".claude", "teke"), r.stdout + r.stderr);
}

{
  const d = klasor();
  kur(d);
  const k = kayit(d, "kapali", [kul("selam")]);
  const once = betik(d, "ajan-kapisi.js", { tool_name: "Agent", tool_input: { prompt: "x" } }).karar;
  const y = path.join(d, ".claude", "teke", "ayar.json");
  const ay = JSON.parse(oku(y)); ay.kapaliKancalar = ["ajan-kapisi.js"]; fs.writeFileSync(y, JSON.stringify(ay));
  esit("A11 kapatılan betik kurucu yeniden çalışmadan da susuyor", once === "deny" && betik(d, "ajan-kapisi.js", { tool_name: "Agent", tool_input: { prompt: "x" } }).karar === null);
  esit("A11 kapatılmayan betikler çalışmayı sürdürüyor", betik(d, "komut-kapisi.js", { tool_name: "Bash", tool_input: { command: "git push" }, transcript_path: k, session_id: "k1" }).karar === "ask");
}

// ================= ortak kurulum: betik testleri =================
const P = klasor();
kur(P);
// Yasak model ve ortak yazar yasağı varsayılanda kapalıdır; testler açık hâlini sınar.
{
  const y = path.join(P, ".claude", "teke", "ayar.json");
  const ay = JSON.parse(oku(y));
  ay.ajan.yasakModeller = ["fable"]; ay.commit.ortakYazarYasak = true;
  fs.writeFileSync(y, JSON.stringify(ay, null, 2));
}
const devirK = path.join(P, "docs", "devir");

// ================= B) OTURUM AÇILIŞI =================
{
  yaz(path.join(P, "DEVAM.md"), "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Lobi ekranı kodlanıyor.\n\n## AÇIK KARARLAR\n- renk seçimi\n\n## HEDEFLER VE SAYILAR\n- en az 2500 soru\n\n## HARİTA\n`docs/TASARIM.md` tasarım sistemi\n");
  let b = betik(P, "oturum-baslangici.js", { source: "startup", session_id: "o1" });
  esit("B1 açılışta kaldığımız yer ve hedef sayılar yükleniyor", /Lobi ekranı kodlanıyor/.test(b.ek) && /renk seçimi/.test(b.ek) && /2500 soru/.test(b.ek), b.ek);
  esit("B1b açılışta belge haritası da yükleniyor", /docs\/TASARIM\.md/.test(b.ek), b.ek);
  yaz(path.join(devirK, "KORU-orkestrator.md"), "KORU 25.11: kullanıcı L2 çizgisini beğendi.\n");
  yaz(path.join(devirK, "KORU-kod.md"), "KORU kod: migration yarım.\n");
  b = betik(P, "oturum-baslangici.js", { source: "startup", session_id: "o1" });
  esit("B2 düz açılışta KORU içeriği yüklenmiyor, yalnız varlığı söyleniyor", !/L2 çizgisini/.test(b.ek) && /KORU-orkestrator\.md var/.test(b.ek), b.ek);
  b = betik(P, "oturum-baslangici.js", { source: "compact", session_id: "o1" });
  esit("B3 compact sonrası orkestratörün KORU'su kendiliğinden yükleniyor", /L2 çizgisini beğendi/.test(b.ek) && !/migration yarım/.test(b.ek), b.ek);
  const k = kayit(P, "kod-oturumu", [kul("DEVİR: docs/devir/x.md\nROL: kod\nBu dosyayı oku.")]);
  b = betik(P, "oturum-baslangici.js", { source: "compact", session_id: "k1", transcript_path: k });
  esit("B4 kod oturumunda compact sonrası kendi KORU'su yükleniyor", /migration yarım/.test(b.ek) && !/L2 çizgisini/.test(b.ek) && /kod oturumu/.test(b.ek), b.ek);
  yaz(path.join(devirK, "lobi.md"), "# İŞ TARİFİ — lobi\n");
  yaz(path.join(devirK, "eski.md"), "# İŞ TARİFİ — eski\n\nKAPANDI: 20.11.2026 — kabul\n");
  b = betik(P, "oturum-baslangici.js", { source: "startup", session_id: "o1" });
  esit("B5 süren iş tarifleri listeleniyor, kapanan listelenmiyor", /docs\/devir\/lobi\.md/.test(b.ek) && !/docs\/devir\/eski\.md/.test(b.ek), b.ek);
  b = betik(P, "oturum-baslangici.js", { source: "clear", session_id: "temiz1" });
  esit("B5b clear sonrası rol ilk mesajı bekliyor, başka rolün notu yüklenmiyor", /ilk mesajda/.test(b.ek) && !/L2 çizgisini/.test(b.ek) && !/migration yarım/.test(b.ek) && /Lobi ekranı kodlanıyor/.test(b.ek), b.ek);
  fs.rmSync(path.join(devirK, "KORU-orkestrator.md")); fs.rmSync(path.join(devirK, "KORU-kod.md")); fs.rmSync(path.join(devirK, "lobi.md"));
  const dersYol = path.join(P, "docs", "DERSLER.md"), dersEski = oku(dersYol);
  esit("B6 ders yokken açılışta ders bölümü eklenmiyor", !/bu projenin dersleri/.test(b.ek), b.ek);
  yaz(dersYol, dersEski + "\n- 20.11.2026 · Seçenekler görüntüyle sunulur; yazıyla anlatılan seçenek anlaşılmıyor.\n**D2 · Kalın başlıklı ders (24.11.2026).** " + "uzun ".repeat(600) + "SONU\n- 25.11.2026 · Tuş etiketleri küçük tutulur; kullanıcı iri tuşu sevmedi.\n");
  b = betik(P, "oturum-baslangici.js", { source: "startup", session_id: "o1" });
  esit("B6 açılışta bütün dersler yükleniyor: madde imli de kalın başlıklı da, uzun olan kısaltılarak", /Tuş etiketleri küçük tutulur/.test(b.ek) && /görüntüyle sunulur/.test(b.ek) && /Kalın başlıklı ders/.test(b.ek) && !/SONU/.test(b.ek) && /dersleri \(3;/.test(b.ek), b.ek);
  yaz(dersYol, dersEski + "\n" + Array.from({ length: 40 }, (_, i) => "- ders " + (i + 1) + " " + "x".repeat(150)).join("\n") + "\n");
  b = betik(P, "oturum-baslangici.js", { source: "startup", session_id: "o1" });
  esit("B6 çok ders varsa baştan ve sondan alınıyor, kalanı için dosya gösteriliyor", /ders 1 x/.test(b.ek) && /ders 40 x/.test(b.ek) && !/ders 20 x/.test(b.ek) && /22 ders daha dosyada/.test(b.ek), b.ek.slice(0, 600));
  yaz(dersYol, dersEski);
}

// ================= C) HER MESAJDA: ROL, BAĞLAM, DERS =================
{
  let k = kayit(P, "c-az", [kul("selam"), asi(300000)]);
  let b = betik(P, "istem.js", { session_id: "c1", transcript_path: k, prompt: "tamam" });
  esit("C1 eşik altında hiçbir şey eklenmiyor", b.kod === 0 && b.ham === "", b.ham);
  k = kayit(P, "c-orta", [kul("selam"), asi(560000)]);
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C2 bildirim eşiğinde ölçülmüş yüzde ekleniyor", /%56/.test(b.ek) && /bildirim eşiği/.test(b.ek), b.ek);
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C3 aynı düzeyde ikinci kez söylenmiyor", b.ham === "", b.ham);
  fs.writeFileSync(k, [kul("selam"), asi(620000)].join("\n") + "\n");
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C4 doluluk arttıkça yeniden haber veriliyor", /%62/.test(b.ek), b.ek);
  fs.writeFileSync(k, [kul("selam"), asi(700000)].join("\n") + "\n");
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  const b2 = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C5 compact eşiğinde compact yanıtın ilk satırında isteniyor; aynı düzeyde yinelenmiyor", /compact eşiği %65 aşıldı/.test(b.ek) && /İLK satırında/.test(b.ek) && b2.ham === "", b.ek + b2.ham);
  fs.writeFileSync(k, [kul("selam"), asi(760000)].join("\n") + "\n");
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C5b kullanıcı ertelerse doluluk arttıkça yeniden isteniyor", /%76/.test(b.ek) && /compact eşiği/.test(b.ek), b.ek);
  // compact yapıldı: sınırdan sonra henüz yanıt yok; eski ölçümle yeniden compact istenmemeli
  const sinir = JSON.stringify({ type: "system", subtype: "compact_boundary", timestamp: "2026-11-25T12:00:00.000Z" });
  fs.writeFileSync(k, [kul("selam"), asi(760000), sinir, kul("özet", { isCompactSummary: true })].join("\n") + "\n");
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C5c compact sonrası ilk mesajda yeniden compact istenmiyor", b.ham === "", b.ham);
  fs.appendFileSync(k, asi(520000) + "\n");
  b = betik(P, "istem.js", { session_id: "c2", transcript_path: k, prompt: "tamam" });
  esit("C5d compact sonrası ölçüm sıfırdan başlıyor", /%52/.test(b.ek) && /bildirim eşiği/.test(b.ek), b.ek);
  // iş sürerken (araç çağrılarından sonra) ölçüm
  k = kayit(P, "c-uzun", [kul("DEVİR: docs/devir/x.md\nROL: kod"), asi(300000)]);
  betik(P, "istem.js", { session_id: "cu", transcript_path: k, prompt: "DEVİR: docs/devir/x.md\nROL: kod" });
  fs.writeFileSync(k, [kul("DEVİR: docs/devir/x.md\nROL: kod"), asi(680000)].join("\n") + "\n");
  let iz = betik(P, "baglam-izle.js", { session_id: "cu", transcript_path: k, tool_name: "Bash" });
  esit("C5e iki dakika dolmadan yeniden ölçülmüyor", iz.ham === "", iz.ham);
  const du = JSON.parse(oku(path.join(P, ".claude", "teke", "durum", "cu.json")));
  du.sonOlcum = Date.now() - 200000;
  yaz(path.join(P, ".claude", "teke", "durum", "cu.json"), JSON.stringify(du));
  iz = betik(P, "baglam-izle.js", { session_id: "cu", transcript_path: k, tool_name: "Bash" });
  esit("C5f uzun iş sürerken kod oturumu eşiği duyuyor", /%68/.test(iz.ek) && /COMPACT GEREK/.test(iz.ek), iz.ham);
  iz = betik(P, "baglam-izle.js", { session_id: "cu", transcript_path: k, tool_name: "Bash", agent_id: "a1" });
  esit("C5g yardımcı çağrılarında ölçülmüyor", iz.ham === "", iz.ham);
  // pencere modele göre
  const ay = JSON.parse(oku(path.join(P, ".claude", "teke", "ayar.json")));
  ay.baglam.pencereler = { "claude-kucuk": 200000 };
  yaz(path.join(P, ".claude", "teke", "ayar.json"), JSON.stringify(ay, null, 2));
  k = kayit(P, "c-kucuk", [kul("selam"), asi(120000, "claude-kucuk")]);
  b = betik(P, "istem.js", { session_id: "c3", transcript_path: k, prompt: "tamam" });
  esit("C6 pencere modele göre ayarlanabiliyor (120 bin / 200 bin = %60)", /%60/.test(b.ek), b.ek);
  // rol
  k = kayit(P, "c-rol", []);
  b = betik(P, "istem.js", { session_id: "c4", transcript_path: k, prompt: "DEVİR: docs/devir/x.md\nROL: tasarım\nBu dosyayı oku." });
  esit("C7 ROL satırı oturumun rolünü belirliyor", /tasarım oturumu/.test(b.ek) && JSON.parse(oku(path.join(P, ".claude", "teke", "durum", "c4.json"))).rol === "tasarim", b.ek);
  betik(P, "istem.js", { session_id: "c5", transcript_path: k, prompt: "merhaba, lobi ekranını yapalım" });
  b = betik(P, "istem.js", { session_id: "c5", transcript_path: k, prompt: "RAPOR: lobi bitti\nTarifte şu yazıyordu:\nROL: kod" });
  esit("C8 orkestratörün rolü, içinde ROL geçen bir raporla değişmiyor", JSON.parse(oku(path.join(P, ".claude", "teke", "durum", "c5.json"))).rol === "orkestrator" && b.ham === "", b.ham);
  b = betik(P, "istem.js", { session_id: "c6", transcript_path: k, prompt: "Background (from the session that started this one): proje\n\nişi yap" });
  esit("C9 başka oturumun açtığı oturum orkestratör sayılmıyor", JSON.parse(oku(path.join(P, ".claude", "teke", "durum", "c6.json"))).rol === "kod");
  let son = null;
  for (let i = 0; i < 25; i++) son = betik(P, "istem.js", { session_id: "c7", transcript_path: k, prompt: "mesaj " + i });
  esit("C10 uzun süre taranmayınca ders taraması hatırlatılıyor", /ders-tara\.js/.test(son.ek), son.ek);
  // bekleyenler: kullanıcı "devam" dediğinde ondan beklenenler hatırlatılır
  const devamYol = path.join(P, "DEVAM.md"), devamEski = oku(devamYol);
  k = kayit(P, "c-bek", [kul("selam"), asi(100000)]);
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "Tamam, devam et." });
  esit("C11 'devam' denince bekleyenler hatırlatılıyor (eski 'açık kararlar' başlığıyla da)", /teke bekleyenler/.test(b.ek) && /renk seçimi/.test(b.ek) && /1 madde/.test(b.ek) && /iki grupta/.test(b.ek), b.ek);
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "lobi ekranına devam etmeden önce şu rengi de değiştirelim, bir de kayıt ekranındaki yazıya bakalım" });
  esit("C12 içinde 'devam' geçen uzun istekte hatırlatılmıyor", b.ham === "", b.ham);
  const tetik = (soz) => betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: soz }).ham !== "";
  esit("C12b 'devam etme', soru ve durdurma mesajlarında hatırlatılmıyor", !["devam etme, dur", "neden devam etmedin?", "Devam eden işler ne durumda?", "devam ettirelim mi yoksa duralım mı", "sürdürme"].some(tetik));
  esit("C12c sürdürme sözünün olağan biçimleri tanınıyor", ["devam", "Devam et.", "tamam, devam edelim", "ok devam", "Kaldığın yerden devam et", "kaldigin yerden", "sürdür lütfen", "continue", "ok, go ahead"].every(tetik));
  yaz(devamYol, "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Lobi.\n\n## BEKLEYENLER (kullanıcıdan beklenen soru, karar, onay, deneme; yoksa \"yok\")\n> Her satır: `- (durduruyor | durdurmuyor) <soru>`\n- (durduruyor) Ödeme sağlayıcısı hangisi olsun? — ödeme ekranı bekliyor · soruldu 24.11\n- (durdurmuyor) Logo rengi — maviyle sürüyorum · henüz sorulmadı\n\n## SONRAYA\n- karanlık tema\n");
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "devam" });
  esit("C13 yeni başlıkla maddeler aynen geliyor, açıklama satırı ve başka bölüm gelmiyor", /2 madde/.test(b.ek) && /Ödeme sağlayıcısı hangisi olsun/.test(b.ek) && /maviyle sürüyorum/.test(b.ek) && !/Her satır/.test(b.ek) && !/karanlık tema/.test(b.ek), b.ek);
  const ac = betik(P, "oturum-baslangici.js", { source: "compact", session_id: "cb1" });
  esit("C13b açılışta ve compact sonrasında bekleyenler yükleniyor", /bekleyenler \(kullanıcıdan beklenen/.test(ac.ek) && /Ödeme sağlayıcısı/.test(ac.ek) && /iki grupta göster/.test(ac.ek), ac.ek);
  yaz(devamYol, "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Lobi.\n\n## BEKLEYENLER\n- yok\n");
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "devam" });
  esit("C14 liste boşsa boş olduğu söyleniyor, uydurma madde yok", /listesi boş/.test(b.ek) && !/madde var/.test(b.ek), b.ek);
  yaz(devamYol, "# DEVAM\r\n\r\n## 4) AÇIK KARARLAR\r\n1. Yok ama renk sorulacak\r\n   - alt ayrıntı: iki ton var\r\n   devamı alt satırda\r\n+ artı imli madde\r\n- Yok.\r\n\r\n```\r\n# çit içindeki satır başlık değildir\r\n```\r\n- çitten sonraki madde\r\n");
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "devam" });
  esit("C14b 'yok' ile başlayan gerçek madde sayılıyor, alt madde üstüne ekleniyor, çit bölümü kesmiyor", /3 madde/.test(b.ek) && /Yok ama renk sorulacak alt ayrıntı: iki ton var devamı alt satırda/.test(b.ek) && /artı imli madde/.test(b.ek) && /çitten sonraki madde/.test(b.ek), b.ek);
  yaz(devamYol, "# DEVAM\n\n## AÇIK KARARLAR\nRenk seçimi kullanıcıdan bekleniyor, düz yazıyla yazılmış.\n");
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "devam" });
  esit("C14c düz yazıyla doldurulmuş bölümde 'liste boş' denmiyor", b.ham === "", b.ham);
  yaz(devamYol, "# durum\n\nBu projede bekleyenler bölümü yok.\n");
  b = betik(P, "istem.js", { session_id: "cb1", transcript_path: k, prompt: "devam" });
  esit("C15 bölümü olmayan projede hiçbir şey eklenmiyor", b.ham === "", b.ham);
  yaz(devamYol, devamEski);
  const kk = kayit(P, "c-bek-kod", [kul("DEVİR: docs/devir/x.md\nROL: kod"), asi(100000)]);
  betik(P, "istem.js", { session_id: "cb2", transcript_path: kk, prompt: "DEVİR: docs/devir/x.md\nROL: kod" });
  b = betik(P, "istem.js", { session_id: "cb2", transcript_path: kk, prompt: "devam" });
  esit("C16 kod oturumunda 'devam' mesajına bekleyenler eklenmiyor", b.ham === "", b.ham);
}

// ================= D) YARDIMCI MODELİ =================
{
  const a = (girdi, ad = "Agent") => betik(P, "ajan-kapisi.js", { tool_name: ad, tool_input: girdi });
  esit("D1 modelsiz yardımcı reddediliyor", a({ prompt: "x", subagent_type: "general-purpose" }).karar === "deny");
  esit("D2 yasak modelli yardımcı reddediliyor", a({ prompt: "x", model: "fable" }).karar === "deny");
  esit("D3 açık modelli yardımcı geçiyor", a({ prompt: "x", model: "sonnet" }).karar === null);
  esit("D4 modeli sabit kit yardımcısı geçiyor", a({ prompt: "x", subagent_type: "elestirmen" }).karar === null);
  esit("D5 fork reddediliyor", a({ prompt: "x", subagent_type: "fork" }).karar === "deny");
  esit("D6 iş akışında modelsiz agent() reddediliyor", a({ script: "await agent('x', {label:'a'})" }, "Workflow").karar === "deny");
  const karisik = a({ script: "const r = await agent('tara', {label:'a', model:'sonnet'});\nconst v = await agent(`doğrula (${r.length})`, {label:'b'});" }, "Workflow");
  esit("D7 iş akışında tek yardımcıya model yazmak ötekileri kurtarmıyor", karisik.karar === "deny" && /2 agent\(\) çağrısının 1 tanesinde/.test(karisik.neden), karisik.neden);
  // betiğe gömülü içerik metninde geçen "agent (…)" sözü çağrı sayılmaz; şablon içindeki gerçek çağrı sayılır
  const gomulu = "const KARTLAR = [{ metin: 'an alkylating agent (obsolete) and a biologic agent (rituximab)' }, { metin: \"agent (see Figure 2)\" }];\n// eski: agent('x')\n/* agent('y') */\nconst not = `ek: agent (z) ${1 + 1}`;\nawait agent(istem(KARTLAR), { label: 'a', model: 'sonnet' });";
  esit("D8b içerik metninde geçen 'agent (…)' sözü yardımcı çağrısı sayılmıyor", a({ script: gomulu }, "Workflow").karar === null, a({ script: gomulu }, "Workflow").neden);
  esit("D8b dize dışındaki modelsiz çağrı yine yakalanıyor, şablonun içindeki de", a({ script: gomulu + "\nawait agent('modelsiz', { label: 'b' });" }, "Workflow").karar === "deny" && a({ script: "const s = `${await agent('x', {label:'c'})}`;" }, "Workflow").karar === "deny");
  esit("D8 iş akışında her yardımcıda model varsa geçiyor", a({ script: "await parallel(xs.map(x => () => agent(x.prompt, {label:x.k, model:'sonnet'})));\nawait agent('sentez (bölüm 1)', {model:'opus', effort:'high'});" }, "Workflow").karar === null);
  esit("D9 ortak seçenek değişkeniyle verilen model sayılıyor", a({ script: "const TARA = { model: 'sonnet', effort: 'low' };\nawait agent('a', { ...TARA, label: 'x' });\nawait agent('b', TARA);" }, "Workflow").karar === null);
  esit("D10 istem metninde geçen model sözcüğü model sayılmıyor", a({ script: "await agent('hangi model daha iyi (karşılaştır)', {label:'a'})" }, "Workflow").karar === "deny");
  esit("D11 iş akışında yasak model reddediliyor", a({ script: "await agent('x', {model:'claude-fable-5-2'})" }, "Workflow").karar === "deny");
  yaz(path.join(P, ".claude", "agents", "denetci.md"), "---\nname: denetci\nmodel: opus\n---\nDenetle.\n");
  yaz(path.join(P, ".claude", "agents", "modelsiz-rol.md"), "---\nname: modelsiz-rol\n---\nBak.\n");
  yaz(path.join(P, ".claude", "agents", "yasakli-rol.md"), "---\nname: yasakli-rol\nmodel: claude-fable-5-2\n---\nBak.\n");
  esit("D13 iş akışında adıyla çağrılan, modeli tanımda yazılı rol geçiyor", a({ script: "await agent('x', {label:'d', agentType:'denetci'})" }, "Workflow").karar === null);
  esit("D13 rol adı değişkenle verilmişse karışılmıyor", a({ script: "await parallel(isler.map(i => () => agent(i.istem, {label:i.etiket, agentType: i.rol, effort:'high'})))" }, "Workflow").karar === null);
  esit("D13 tanımında model olmayan rol adı modeli kurtarmıyor", a({ script: "await agent('x', {agentType:'modelsiz-rol'})" }, "Workflow").karar === "deny");
  esit("D13 tanımı yasak modelli rol iş akışında reddediliyor", a({ script: "await agent('x', {agentType:'yasakli-rol'})" }, "Workflow").karar === "deny");
  esit("D12 yüksek eforlu ve büyük modelli yardımcıya karışılmıyor", a({ prompt: "x", model: "opus", effort: "high" }).karar === null);
}

// ================= E) ONAY LİSTESİ VE COMMIT =================
{
  const ork = kayit(P, "e-ork", [kul("selam")]);
  const kod = kayit(P, "e-kod", [kul("DEVİR: docs/devir/x.md\nROL: kod")]);
  const k = (komut, kayitYolu, oturum) => betik(P, "komut-kapisi.js", { tool_name: "Bash", tool_input: { command: komut }, transcript_path: kayitYolu, session_id: oturum });
  esit("E1 orkestratörde push kullanıcıya soruluyor", k("git push origin main", ork, "e1").karar === "ask");
  esit("E2 kod oturumunda push reddediliyor ve rapora yazması isteniyor", k("git push", kod, "e2").karar === "deny" && /raporunda/.test(k("git push", kod, "e2").neden));
  esit("E3 tırnak içinde geçen komut adı komut sayılmıyor", k('echo "git push yapma"', ork, "e1").karar === null);
  esit("E4 ortak-yazar satırlı commit reddediliyor", k('git commit -m "x\n\nCo-Authored-By: Claude <a@b>"', ork, "e1").karar === "deny");
  esit("E5 düz commit geçiyor", k('git commit -m "lobi duzeltildi"', ork, "e1").karar === null);
  esit("E6 geçici dosya temizliğine karışılmıyor", k("rm -rf dist node_modules/.cache", kod, "e2").karar === null);
  esit("E7 yayın komutu kod oturumunda reddediliyor", k("pnpm run deploy", kod, "e2").karar === "deny");
  esit("E8 genel seçenekli push yakalanıyor", k("git -C . push origin main", ork, "e1").karar === "ask");
  esit("E9 başka kabuğa tırnak içinde verilen push yakalanıyor", k('bash -c "git push"', kod, "e2").karar === "deny");
  esit("E10 mesajında push geçen commit'e karışılmıyor", k('git commit -m "push oncesi duzeltme"', ork, "e1").karar === null);
}

// ================= F) KULLANICININ SÖZÜ DEĞİŞMEDEN GİDİYOR MU =================
{
  const soz = "l2 3 ve 4 fena değil ama daha yaratıcı şeyler bekliyorum";
  const k = kayit(P, "f-ork", [kul("logo işine bakalım"), arcSonuc(), kul(soz + ", renkler de biraz soluk"), asi(100000)]);
  const tarif = (ad, sozBolumu) => yaz(path.join(devirK, ad + ".md"), `# İŞ TARİFİ — ${ad}\n\n- Rol: tasarım\n\n## Kullanıcının sözü (aynen; her biri alıntı satırı)\n${sozBolumu}\n\n## Yorumum\nkısa\n`);
  const g = (ad, oturum = "f1", kayitYolu = k, alan = "message") => betik(P, "devir-kapisi.js", { tool_name: "SendMessage", tool_input: { to: "tasarim", [alan]: `DEVİR: docs/devir/${ad}.md\nROL: tasarım\nBu dosyayı oku.` }, transcript_path: kayitYolu, session_id: oturum });
  esit("F1 devir olmayan mesaja karışılmıyor", betik(P, "devir-kapisi.js", { tool_name: "SendMessage", tool_input: { to: "kod", message: "EK: şunu da ekle" }, transcript_path: k, session_id: "f1" }).karar === null);
  esit("F2 olmayan iş tarifi reddediliyor", g("yok-boyle-dosya").karar === "deny");
  tarif("aynen", "> " + soz);
  esit("F3 aynen alıntı geçiyor", g("aynen").karar === null, g("aynen").neden);
  tarif("noktalama", "> “L2, 3 ve 4 fena değil; ama daha yaratıcı şeyler bekliyorum.”");
  esit("F4 yalnız noktalama ve büyük-küçük harf farkı olan alıntı geçiyor", g("noktalama").karar === null, g("noktalama").neden);
  tarif("yorum", "> Önceki logoları beğenmedi, bambaşka fikirler istiyor");
  const r1 = g("yorum");
  esit("F5 yorumlanmış söz geri çevriliyor ve hangisi olduğu söyleniyor", r1.karar === "deny" && /bambaşka fikirler/.test(r1.neden), r1.neden);
  esit("F6 aynı tarif ikinci kez gönderilince geçiyor (kilit yok)", g("yorum").karar === null);
  yaz(path.join(devirK, "yorum.md"), oku(path.join(devirK, "yorum.md")).replace("bambaşka", "çok başka"));
  esit("F7 tarif değişip yine uymuyorsa yeniden uyarılıyor", g("yorum").karar === "deny");
  tarif("bos", "> <kullanıcının bu iş hakkında söylediği, konuşmadan kopyalanmış>");
  esit("F8 boş bırakılan söz bölümü geri çevriliyor", g("bos").karar === "deny");
  tarif("sozsuz", "Kullanıcı bu işi sözle tarif etmedi; iş yol haritasından geliyor.");
  esit("F9 söz yoksa ve bu yazıldıysa geçiyor", g("sozsuz").karar === null, g("sozsuz").neden);
  tarif("belgeden", "> Ekranlar renksiz ve boş duruyor (kaynak: docs/KARARLAR.md)");
  esit("F10 belgeden alınan söz kaynak notuyla geçiyor", g("belgeden").karar === null, g("belgeden").neden);
  tarif("iki", "> " + soz + "\n\n> renkler de biraz soluk\n\n> maskot daha sevimli olsun");
  const r2 = g("iki", "f2");
  esit("F11 birden çok alıntıda yalnız uymayan bildiriliyor", r2.karar === "deny" && /maskot daha sevimli/.test(r2.neden) && !/soluk"/.test(r2.neden), r2.neden);
  const kodKaydi = kayit(P, "f-kod", [kul("DEVİR: docs/devir/x.md\nROL: kod")]);
  esit("F12 kod oturumunun mesajları denetlenmiyor", g("bos", "f3", kodKaydi).karar === null);
  tarif("acilis", "> uydurma bir söz ki konuşmada yok");
  esit("F13 oturum açarken de denetleniyor", betik(P, "devir-kapisi.js", { tool_name: "mcp__ccd_session__start_session", tool_input: { title: "kod", prompt: "DEVİR: docs/devir/acilis.md\nROL: kod" }, transcript_path: k, session_id: "f4" }).karar === "deny");
  // alt alta yazılmış, ayrı mesajlardan gelen iki söz
  const k3 = kayit(P, "f-ork3", [kul("butonlar mavi olsun ama koyu tonda"), kul("ana ekranda logo daha büyük dursun"), asi(100000),
    kul("This session is being continued from a previous conversation. Kullanıcı tüm testlerin kaldırılmasını istedi.", { isCompactSummary: true }),
    kul("Another Claude session sent a message:\nRAPOR: lobi bitti, kullanıcı muhtemelen yeşil tonları sever")]);
  tarif("altalta", "> butonlar mavi olsun ama koyu tonda\n> ana ekranda logo daha büyük dursun");
  esit("F14 alt alta yazılan ayrı sözler geçiyor", g("altalta", "f5", k3).karar === null, g("altalta", "f5", k3).neden);
  tarif("bolunmus", "> butonlar mavi olsun\n> ama koyu tonda");
  esit("F15 satırlara bölünmüş tek söz geçiyor", g("bolunmus", "f5", k3).karar === null, g("bolunmus", "f5", k3).neden);
  tarif("ozetten", "> Kullanıcı tüm testlerin kaldırılmasını istedi");
  esit("F16 compact özetindeki cümle kullanıcının sözü sayılmıyor", g("ozetten", "f5", k3).karar === "deny");
  tarif("rapordan", "> kullanıcı muhtemelen yeşil tonları sever");
  esit("F17 başka oturumun mesajındaki cümle kullanıcının sözü sayılmıyor", g("rapordan", "f5", k3).karar === "deny");
  // boşluklu ve tam yol
  yaz(path.join(P, "docs", "devir", "bosluklu ad.md"), "# İŞ TARİFİ\n\n## Kullanıcının sözü\n> uydurulmuş bir cümle daha burada\n");
  const tam = betik(P, "devir-kapisi.js", { tool_name: "SendMessage", tool_input: { to: "kod", message: `DEVİR: ${path.join(P, "docs", "devir", "bosluklu ad.md")}\nROL: kod` }, transcript_path: k3, session_id: "f6" });
  esit("F18 boşluklu ve tam yolla verilen iş tarifi de denetleniyor", tam.karar === "deny" && /uydurulmuş bir cümle/.test(tam.neden), tam.neden);
  for (const f of fs.readdirSync(devirK)) if (f !== "_SABLON.md" && f !== "eski.md") fs.rmSync(path.join(devirK, f));
}

// ================= G) DERS TARAMASI =================
{
  const k = kayit(P, "g-ork", [
    kul("lobi ekranını yapalım"), arcSonuc(),
    kul("<system-reminder>gizli</system-reminder>"),
    kul("Another Claude session sent a message:\nRAPOR: lobi bitti"),
    kul("öyle demedim, 50 kategori istemiştim sen 10 yapmışsın"),
    kul("öyle demedim, 50 kategori istemiştim sen 10 yapmışsın"),
    kul("yan görev mesajı", { isSidechain: true }),
    asi(100000),
  ]);
  let r = arac(P, "ders-tara.js", "--kayit", k);
  esit("G1 kullanıcının sözleri çıkarılıyor", /2 kullanıcı mesajı/.test(r.stdout) && /50 kategori istemiştim/.test(r.stdout) && /lobi ekranını yapalım/.test(r.stdout), r.stdout);
  esit("G2 araç çıktısı, başka oturum mesajı ve sistem notu sayılmıyor", !/RAPOR: lobi/.test(r.stdout) && !/gizli/.test(r.stdout) && !/çıktı öyle/.test(r.stdout) && !/yan görev/.test(r.stdout), r.stdout);
  arac(P, "ders-tara.js", "--kayit", k, "--isaretle");
  r = arac(P, "ders-tara.js", "--kayit", k);
  esit("G3 işaretledikten sonra yeniden çıkmıyor", /yeni kullanıcı mesajı yok/.test(r.stdout), r.stdout);
  fs.appendFileSync(k, kul("yine aynı hata, hâlâ düzelmemiş") + "\n");
  r = arac(P, "ders-tara.js", "--kayit", k);
  esit("G4 işaretten sonra gelen mesaj çıkıyor", /1 kullanıcı mesajı/.test(r.stdout) && /hâlâ düzelmemiş/.test(r.stdout), r.stdout);
  // kayıt verilmeden: orkestratörün kaydı durum dosyasından bulunur
  betik(P, "istem.js", { session_id: "g9", transcript_path: k, prompt: "tamam" });
  r = arac(P, "ders-tara.js");
  esit("G5 kayıt yolu verilmeden orkestratörün kaydı bulunuyor", /hâlâ düzelmemiş/.test(r.stdout), r.stdout);
  // tur sürerken yazılan mesaj ve sayfa bağlamı taşıyan mesaj
  const turOrtasi = JSON.stringify({ type: "attachment", timestamp: "2026-11-25T11:00:00.000Z", attachment: { type: "queued_command", prompt: "hayır L2yi kastettim", origin: { kind: "human" } } });
  const k2 = kayit(P, "g-ork2", [turOrtasi, kul('<artifact-view-context artifact="a1">\n{"context":{}}\n(açıklama)\n</artifact-view-context>\n\nkurt kediye benzemiş'), kul('<pasted_content id="7">\nyapıştırdığım uzun istek\n</pasted_content>')]);
  r = arac(P, "ders-tara.js", "--kayit", k2);
  esit("G6 tur sürerken yazılan mesaj da çıkarılıyor", /3 kullanıcı mesajı/.test(r.stdout) && /L2yi kastettim/.test(r.stdout), r.stdout);
  esit("G7 uygulamanın eklediği sarmalayıcılar atılıyor, kullanıcının sözü kalıyor", /\] kurt kediye benzemiş/.test(r.stdout) && /\] yapıştırdığım uzun istek/.test(r.stdout) && !/artifact-view-context/.test(r.stdout), r.stdout);
  yaz(path.join(devirK, "turortasi.md"), "# İŞ TARİFİ\n\n## Kullanıcının sözü\n> hayır L2yi kastettim\n");
  const b = betik(P, "devir-kapisi.js", { tool_name: "SendMessage", tool_input: { to: "tasarim", message: "DEVİR: docs/devir/turortasi.md\nROL: tasarım" }, transcript_path: k2, session_id: "g7" });
  esit("G8 tur sürerken söylenen söz iş tarifinde alıntılanabiliyor", b.karar === null, b.neden);
  fs.rmSync(path.join(devirK, "turortasi.md"));
  // sayfalama: okunmayan mesaj "tarandı" diye işaretlenmez
  const cok = [];
  for (let i = 0; i < 65; i++) cok.push(kul(`sayfa mesajı numara ${i} burada`));
  cok.push(kul("BAŞTAKİ-İZ " + "dolgu ".repeat(400) + " SONDAKİ-DÜZELTME öyle demedim"));
  const k4 = kayit(P, "g-cok", cok);
  r = arac(P, "ders-tara.js", "--kayit", k4, "--isaretle");
  esit("G9 listeleme yapılmadan işaretlenemiyor", /Önce taramayı çalıştır/.test(r.stdout), r.stdout);
  r = arac(P, "ders-tara.js", "--kayit", k4);
  esit("G10 çok mesaj varsa en eskiden başlayarak sayfa sayfa gösteriliyor", /66 kullanıcı mesajı; ilk 60 tanesi/.test(r.stdout) && /numara 0 burada/.test(r.stdout) && !/numara 64 burada/.test(r.stdout), r.stdout.slice(0, 300));
  r = arac(P, "ders-tara.js", "--kayit", k4, "--isaretle");
  esit("G11 işaret yalnız gösterilenleri kapsıyor", /6 mesaj daha var/.test(r.stdout), r.stdout);
  r = arac(P, "ders-tara.js", "--kayit", k4);
  esit("G12 kalan mesajlar sonraki taramada çıkıyor", /6 kullanıcı mesajı/.test(r.stdout) && /numara 64 burada/.test(r.stdout) && !/numara 59 burada/.test(r.stdout), r.stdout.slice(0, 300));
  esit("G13 uzun mesajın başı da sonu da gösteriliyor", /BAŞTAKİ-İZ/.test(r.stdout) && /SONDAKİ-DÜZELTME öyle demedim/.test(r.stdout) && /karakter atlandı/.test(r.stdout), r.stdout.slice(-400));
}

// ================= G2) SESSİZLİK NÖBETİ =================
{
  const d = klasor();
  kur(d);
  yaz(path.join(d, "docs", "devir", "is.md"), "# İŞ TARİFİ\n");
  const k = kayit(d, "n-kod", [kul("DEVİR: docs/devir/is.md\nROL: kod")]);
  betik(d, "istem.js", { session_id: "n1", transcript_path: k, prompt: "DEVİR: docs/devir/is.md\nROL: kod" });
  let r = arac(d, "nobet.js", "kod", "--tarif", "docs/devir/is.md", "--dk", "0.01", "--aralik-sn", "0.2");
  esit("N1 oturum sessiz kalınca nöbet haber veriyor", /SESSİZ: kod oturumu/.test(r.stdout), r.stdout + r.stderr);
  const tarifYolu = path.join(d, "docs", "devir", "is.md");
  // Rapor, nöbet başladıktan kısa süre sonra ayrı bir süreçten yazılır.
  require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').appendFileSync(process.argv[1], '\\n## Rapor\\nbitti\\n'), 700)", tarifYolu], { detached: true, stdio: "ignore" }).unref();
  r = spawnSync(process.execPath, [path.join(d, ".claude", "teke", "araclar", "nobet.js"), "kod", "--tarif", "docs/devir/is.md", "--dk", "5", "--aralik-sn", "0.2", "--en-fazla", "0.3"], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: d }, cwd: d });
  esit("N2 nöbet sürerken rapor yazılınca kendiliğinden bitiyor", /RAPOR YAZILDI/.test(r.stdout), r.stdout);
  r = arac(d, "nobet.js", "kod", "--tarif", "docs/devir/is.md", "--dk", "0.01", "--aralik-sn", "0.2");
  require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').appendFileSync(process.argv[1], JSON.stringify({type:'assistant',message:{role:'assistant',content:[{type:'tool_use',name:'SendMessage',input:{to:'x',message:'RAPOR: bitti'}}]}}) + '\\n'), 700)", k], { detached: true, stdio: "ignore" }).unref();
  const r5 = spawnSync(process.execPath, [path.join(d, ".claude", "teke", "araclar", "nobet.js"), "kod", "--dk", "5", "--aralik-sn", "0.2", "--en-fazla", "0.3"], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: d }, cwd: d });
  esit("N5 tarif verilmese de mesajla gelen rapor nöbeti bitiriyor", /RAPOR GÖNDERİLDİ/.test(r5.stdout), r5.stdout);
  esit("N4 düzeltme turunda eski rapor bitti sayılmıyor", !/RAPOR YAZILDI/.test(r.stdout) && /SESSİZ/.test(r.stdout), r.stdout);
  r = arac(d, "nobet.js", "tasarim", "--dk", "0.01", "--aralik-sn", "0.2");
  esit("N3 hiç başlamamış oturum da bildiriliyor", /kaydı .* bulunamadı/.test(r.stdout), r.stdout);
}

// ================= H) BAKIM =================
{
  const d = klasor();
  kur(d);
  let r = arac(d, "bakim.js");
  esit("H1 temiz projede haber yok", /Bakım: temiz/.test(r.stdout), r.stdout);
  const eskiBolum = "## Eski tarihçe\n\nEkim ayında şunlar oldu: " + "uzun kayıt ".repeat(1800) + "\n\n### alt başlık\nalt içerik ÖZEL-İZ-1\n";
  yaz(path.join(d, "DEVAM.md"), "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. iş (kararlar K3-K17)\n\n" + eskiBolum + "\n## HARİTA\nharita satırı\n");
  yaz(path.join(d, "docs", "KARARLAR.md"), "# KARARLAR\n\n| No | Karar |\n|---|---|\n| K17 | a |\n| K18 | b |\n");
  yaz(path.join(d, "docs", "devir", "bitti.md"), "# İŞ TARİFİ\n\n## Rapor\nok\n\nKAPANDI: 25.11.2026 — kabul\n");
  yaz(path.join(d, "docs", "devir", "suruyor.md"), "# İŞ TARİFİ\n");
  r = arac(d, "bakim.js");
  esit("H2 şişen belge bildiriliyor", /DEVAM\.md \d+ KB \(haber eşiği 16 KB\)/.test(r.stdout), r.stdout);
  esit("H3 bayat karar numarası bildiriliyor", /K17'e kadar sayıyor, defterde K18 var/.test(r.stdout), r.stdout);
  esit("H4 kapanmış iş tarifi bildiriliyor", /1 kapanmış iş tarifi/.test(r.stdout), r.stdout);
  const once = oku(path.join(d, "DEVAM.md"));
  r = arac(d, "bakim.js", "--tasi", "DEVAM.md", "--baslik", "eski tarihçe", "--prova");
  esit("H5 prova hiçbir şeyi değiştirmiyor", /PROVA/.test(r.stdout) && oku(path.join(d, "DEVAM.md")) === once && !var_(d, "docs", "arsiv"), r.stdout);
  r = arac(d, "bakim.js", "--tasi", "DEVAM.md", "--baslik", "eski tarihçe");
  const sonra = oku(path.join(d, "DEVAM.md"));
  const arsivDosya = fs.readdirSync(path.join(d, "docs", "arsiv")).find((f) => /^DEVAM-\d{4}-\d{2}\.md$/.test(f));
  const arsiv = arsivDosya ? oku(path.join(d, "docs", "arsiv", arsivDosya)) : "";
  esit("H6 bölüm arşive kelimesi kelimesine taşınıyor (alt başlığıyla)", arsiv.includes(eskiBolum.trim()) && !sonra.includes("Eski tarihçe") && !sonra.includes("ÖZEL-İZ-1"), r.stdout);
  esit("H7 taşınmayan bölümler yerinde", sonra.includes("## ŞU AN / SIRADAKİ") && sonra.includes("harita satırı") && sonra.includes("K3-K17"));
  yaz(path.join(d, "docs", "PANO.md"), "# PANO\n\n- [K] F1-01 lobi kapandı\n  kanıt: 238 test\n  ikinci satır\n- [~] F1-02 sürüyor\n  ayrıntı\n- [K] F1-03 renk kapandı\n\n| iş | durum |\n|---|---|\n| a | [K] bitti |\n| b | açık |\n\n```\n- [K] kod örneği, taşınmamalı\n```\n");
  r = arac(d, "bakim.js", "--tasi", "docs/PANO.md", "--madde", "\\[K\\]");
  const pano = oku(path.join(d, "docs", "PANO.md"));
  const panoArsiv = oku(path.join(d, "docs", "arsiv", fs.readdirSync(path.join(d, "docs", "arsiv")).find((f) => f.startsWith("PANO-"))));
  esit("H8 kapanmış maddeler devam satırlarıyla taşınıyor", /3 parça/.test(r.stdout) && panoArsiv.includes("- [K] F1-01 lobi kapandı\n  kanıt: 238 test\n  ikinci satır") && panoArsiv.includes("| a | [K] bitti |"), r.stdout + panoArsiv);
  esit("H9 açık maddeler ve kod örneği yerinde", pano.includes("- [~] F1-02 sürüyor\n  ayrıntı") && pano.includes("| b | açık |") && pano.includes("- [K] kod örneği, taşınmamalı") && !pano.includes("F1-01") && !pano.includes("F1-03"), pano);
  r = arac(d, "bakim.js", "--arsivle");
  esit("H10 kapanmış iş tarifi arşive taşınıyor, süren kalıyor", var_(d, "docs", "arsiv", "devir", "bitti.md") && !var_(d, "docs", "devir", "bitti.md") && var_(d, "docs", "devir", "suruyor.md"), r.stdout);
  r = arac(d, "bakim.js", "--tasi", "DEVAM.md", "--baslik", "olmayan başlık");
  esit("H11 desene uyan yoksa hiçbir şey taşınmıyor", /hiçbir şey taşınmadı/.test(r.stdout));
  let b = betik(d, "oturum-baslangici.js", { source: "startup", session_id: "h1" });
  esit("H12 rolü henüz belli olmayan yeni oturuma bakım haberi verilmiyor", !/Bakım haberi/.test(b.ek), b.ek);
  betik(d, "istem.js", { session_id: "h1", transcript_path: kayit(d, "h-ork", [kul("selam")]), prompt: "selam" });
  b = betik(d, "oturum-baslangici.js", { source: "resume", session_id: "h1" });
  esit("H13 bakım haberi orkestratöre oturum açılışında söyleniyor", /Bakım haberi/.test(b.ek) && /K18/.test(b.ek), b.ek);
  esit("H14 açılışta depo durumu ve kaydedilmemiş değişiklik söyleniyor", /Depo: /.test(b.ek) && /kaydedilmemiş değişiklik/.test(b.ek), b.ek);
  // Türkçe büyük harfli başlık ve satır sonu biçimi
  const crlf = "# BELGE\r\n\r\n## ŞU AN / SIRADAKİ\r\nbir\r\n\r\n\r\n\r\n## ESKİ TARİHÇE\r\neski satır\r\n\r\n## KALAN\r\nüç boş satır yukarıda korunmalı\r\n";
  yaz(path.join(d, "docs", "CRLF.md"), crlf);
  r = arac(d, "bakim.js", "--tasi", "docs/CRLF.md", "--baslik", "eski tarihçe");
  const kalan = oku(path.join(d, "docs", "CRLF.md"));
  esit("H15 küçük harfle yazılan desen Türkçe büyük harfli başlığı buluyor", /1 parça/.test(r.stdout) && !kalan.includes("ESKİ TARİHÇE"), r.stdout);
  esit("H16 taşınmayan içerik ve satır sonu biçimi aynen kalıyor", kalan === "# BELGE\r\n\r\n## ŞU AN / SIRADAKİ\r\nbir\r\n\r\n\r\n\r\n## KALAN\r\nüç boş satır yukarıda korunmalı\r\n", JSON.stringify(kalan));
  r = arac(d, "bakim.js", "--tasi", "docs/CRLF.md", "--baslik", "sıradaki", "--prova");
  esit("H17 ı/İ farkı eşleşmeyi bozmuyor", /1 parça/.test(r.stdout), r.stdout);
}

// ================= I) DAYANIKLILIK =================
{
  const d = klasor();
  kur(d);
  for (const ad of ["oturum-baslangici.js", "istem.js", "ajan-kapisi.js", "devir-kapisi.js", "komut-kapisi.js"]) {
    const r = spawnSync(process.execPath, [path.join(d, ".claude", "teke", "kancalar", ad)], { input: "bozuk girdi {{{", encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: d } });
    esit(`I1 ${ad} bozuk girdide işi durdurmuyor`, r.status === 0 && !/deny/.test(r.stdout), r.stdout + r.stderr);
  }
  yaz(path.join(d, ".claude", "teke", "ayar.json"), "{bozuk");
  const b = betik(d, "oturum-baslangici.js", { source: "startup", session_id: "i1" });
  esit("I2 bozuk ayar dosyası söyleniyor, oturum kilitlenmiyor", b.kod === 0 && /okunamıyor/.test(b.ek), b.ek);
  const yok = betik(d, "istem.js", { session_id: "i2", transcript_path: path.join(d, "olmayan.jsonl"), prompt: "selam" });
  esit("I3 olmayan oturum kaydında sessizce geçiliyor", yok.kod === 0);
}

// ================= J) İKİ DİL: DİL PAKETİ VE İNGİLİZCE KURULUM =================
{
  const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
  const dilYol = (dil, ...p) => path.join(KIT, "dil", dil, ...p);
  const en = JSON.parse(oku(dilYol("en", "dil.json")));
  // Betiklerdeki her metin anahtarı İngilizce pakette de var mı, yer tutucuları aynı mı?
  const kaynakMetin = {};
  const re = /(?:\bm|\bM|\bmetin)\(\s*"([a-z][\w.]*)",\s*"((?:[^"\\]|\\.)*)"/g;
  for (const k of ["kancalar", "araclar"]) for (const f of fs.readdirSync(path.join(KIT, k))) {
    if (f === "testler.js") continue;
    const t = oku(path.join(KIT, k, f));
    let e;
    while ((e = re.exec(t))) kaynakMetin[e[1]] = JSON.parse('"' + e[2] + '"');
  }
  const yerTutucu = (s) => (s.match(/\{\w+\}/g) || []).sort().join(",");
  const eksik = Object.keys(kaynakMetin).filter((k) => typeof en.metin[k] !== "string");
  const tutmayan = Object.keys(kaynakMetin).filter((k) => typeof en.metin[k] === "string" && yerTutucu(en.metin[k]) !== yerTutucu(kaynakMetin[k]));
  const fazla = Object.keys(en.metin).filter((k) => !(k in kaynakMetin) && k !== "kur.ayar.aciklama");
  esit("J1 betiklerdeki her metnin İngilizcesi var (" + Object.keys(kaynakMetin).length + " metin)", Object.keys(kaynakMetin).length > 150 && eksik.length === 0, eksik.join(" "));
  esit("J1 İngilizce metinlerde yer tutucular Türkçesiyle aynı, kullanılmayan metin yok", tutmayan.length === 0 && fazla.length === 0, tutmayan.concat(fazla).join(" "));
  // İki dilin metin dosyaları aynı yapıda mı (bir dile eklenen kural ötekinde unutulmasın)
  const say = (t, desen) => (t.match(desen) || []).length;
  const trKural = oku(dilYol("tr", "kurallar", "teke.md")), enKural = oku(dilYol("en", "rules", "teke.md"));
  esit("J2 kural dosyası iki dilde aynı yapıda (bölüm, madde ve tablo satırı sayısı)", say(trKural, /^## /gm) === say(enKural, /^## /gm) && say(trKural, /^- /gm) === say(enKural, /^- /gm) && say(trKural, /^\|/gm) === say(enKural, /^\|/gm),
    `bölüm ${say(trKural, /^## /gm)}/${say(enKural, /^## /gm)}, madde ${say(trKural, /^- /gm)}/${say(enKural, /^- /gm)}, tablo ${say(trKural, /^\|/gm)}/${say(enKural, /^\|/gm)}`);
  const ciftler = [["beceriler/devir/SKILL.md", "skills/handoff/SKILL.md"], ["beceriler/is-kapat/SKILL.md", "skills/close-out/SKILL.md"], ["beceriler/compact-hazirlik/SKILL.md", "skills/compact-prep/SKILL.md"],
    ["ajanlar/tarayici.md", "agents/scout.md"], ["ajanlar/hata-avcisi.md", "agents/bug-hunter.md"], ["ajanlar/test-korlugu.md", "agents/test-gaps.md"], ["ajanlar/elestirmen.md", "agents/critic.md"], ["ajanlar/supheci.md", "agents/skeptic.md"],
    ["sablonlar/CLAUDE.md", "templates/CLAUDE.md"], ["sablonlar/DEVAM.md", "templates/STATUS.md"], ["sablonlar/docs/KARARLAR.md", "templates/docs/DECISIONS.md"], ["sablonlar/docs/DERSLER.md", "templates/docs/LESSONS.md"], ["sablonlar/docs/devir/_SABLON.md", "templates/docs/handoff/_TEMPLATE.md"]];
  const yapi = (t) => [say(t, /^#+ /gm), say(t, /^\s*(-|\d+\.) /gm), t.split(/\r?\n/).length].join("/");
  const farkliYapi = ciftler.filter(([a, b]) => yapi(oku(dilYol("tr", ...a.split("/")))) !== yapi(oku(dilYol("en", ...b.split("/")))));
  esit("J2 beceri, yardımcı ve şablon dosyaları iki dilde aynı yapıda", farkliYapi.length === 0, farkliYapi.map(([a, b]) => `${a} ${yapi(oku(dilYol("tr", ...a.split("/"))))} ≠ ${b} ${yapi(oku(dilYol("en", ...b.split("/"))))}`).join(" · "));
  const enDosyalar = fs.readdirSync(dilYol("en"), { recursive: true }).map(String).filter((f) => /\.(md|json)$/.test(f));
  const trHarfli = enDosyalar.filter((f) => TR_HARF.test(oku(dilYol("en", f))));
  esit("J2 İngilizce dosyalarda Türkçe harf yok", enDosyalar.length >= 15 && trHarfli.length === 0, trHarfli.join(", "));

  // İngilizce kurulum
  const d = klasor();
  const cikti = []; // modelin ya da kullanıcının göreceği her çıktı: içinde Türkçe kalmış mı diye sonda bakılır
  const gor = (x) => { cikti.push(typeof x === "string" ? x : (x.ek || "") + (x.neden || "") + (x.stdout || "") + (x.stderr || "")); return x; };
  let r = gor(kur(d, "--lang", "en"));
  esit("J3 İngilizce kurulum başarılı, belgeler İngilizce adlarla açılıyor", r.status === 0 && /Install is sound/.test(r.stdout) && ["CLAUDE.md", "STATUS.md", "docs/DECISIONS.md", "docs/LESSONS.md", "docs/handoff/_TEMPLATE.md"].every((f) => var_(d, f)) && !var_(d, "DEVAM.md") && !var_(d, "docs", "devir"), r.stdout + r.stderr);
  esit("J3 beceriler ve yardımcılar İngilizce adlarla kuruluyor", fs.readdirSync(path.join(d, ".claude", "skills")).sort().join() === "close-out,compact-prep,handoff" && fs.readdirSync(path.join(d, ".claude", "agents")).sort().join() === "bug-hunter.md,critic.md,scout.md,skeptic.md,test-gaps.md" && /^model: opus$/m.test(oku(path.join(d, ".claude", "agents", "critic.md"))));
  const ay = JSON.parse(oku(path.join(d, ".claude", "teke", "ayar.json")));
  esit("J3 dil ayarda saklanıyor, onay adları ve devir klasörü İngilizce", ay.dil === "en" && ay.devirKlasoru === "docs/handoff" && /git push/.test(ay.onay.desenler[0].ad) && !TR_HARF.test(JSON.stringify(ay)), JSON.stringify(ay).slice(0, 400));
  esit("J3 .gitignore İngilizce KEEP dosyalarını dışlıyor", /docs\/handoff\/KEEP-\*\.md/.test(oku(path.join(d, ".gitignore"))));
  r = gor(kur(d));
  esit("J3 dil yazılmadan güncelleme İngilizce kalıyor ve hiçbir şey değiştirmiyor", /0 new, 0 updated, 0 removed/.test(r.stdout), r.stdout);
  esit("J3 İngilizce kurulumda sağlık sağlam", /Health: SOUND/.test(gor(arac(d, "saglik.js")).stdout));
  gor(kur(d, "--dry-run"));

  // açılış, rol, bekleyenler
  const hk = path.join(d, "docs", "handoff");
  yaz(path.join(d, "STATUS.md"), "# STATUS\n\n## NOW / NEXT\n1. Lobby screen is being coded.\n\n## WAITING ON YOU\n- (blocking) Which payment provider? — the payment screen waits · asked 24.11\n- (not blocking) Logo colour — continuing with blue · not asked yet\n\n## TARGETS AND NUMBERS\n- at least 2500 questions\n\n## MAP\n`docs/DESIGN.md` design system\n");
  yaz(path.join(d, "docs", "LESSONS.md"), "# LESSONS\n\n- 20.11.2026 · Options are shown as images.\n");
  yaz(path.join(hk, "KEEP-orchestrator.md"), "KEEP 25.11: the user liked line L2.\n");
  yaz(path.join(hk, "KEEP-code.md"), "KEEP code: migration half done.\n");
  yaz(path.join(hk, "lobby.md"), "# BRIEF — lobby\n");
  yaz(path.join(hk, "old.md"), "# BRIEF — old\n\n## Report\nok\n\nCLOSED: 20.11.2026 — accepted\n");
  yaz(path.join(d, ".claude", "teke", "oturumlar.json"), JSON.stringify({ code: { id: "local_abc", model: "opus", effort: "medium" } }));
  let b = gor(betik(d, "oturum-baslangici.js", { source: "compact", session_id: "e1" }));
  esit("J4 açılış İngilizce: durum, bekleyenler, dersler, KEEP notu, süren iş tarifi", /Lobby screen is being coded/.test(b.ek) && /Which payment provider/.test(b.ek) && /2500 questions/.test(b.ek) && /Options are shown as images/.test(b.ek) && /the user liked line L2/.test(b.ek) && !/migration half done/.test(b.ek) && /docs\/handoff\/lobby\.md/.test(b.ek) && !/old\.md/.test(b.ek), b.ek);
  esit("J4 oturum kimlikleri İngilizce anahtarlarla da okunuyor", /code session: local_abc \(opus\/medium\)/.test(b.ek), b.ek);
  gor(betik(d, "oturum-baslangici.js", { source: "startup", session_id: "e0" }));
  const ko = kayit(d, "e-ork", [kul("hello"), asi(100000)]);
  b = gor(betik(d, "istem.js", { session_id: "e1", transcript_path: ko, prompt: "ok, continue" }));
  esit("J4 'continue' denince bekleyenler İngilizce hatırlatılıyor", /teke waiting/.test(b.ek) && /2 items/.test(b.ek) && /Which payment provider/.test(b.ek) && /two groups/.test(b.ek), b.ek);
  yaz(path.join(d, "STATUS.md"), "# STATUS\n\n## NOW / NEXT\n1. Lobby.\n\n## WAITING ON YOU\n- none\n");
  b = gor(betik(d, "istem.js", { session_id: "e1", transcript_path: ko, prompt: "continue" }));
  esit("J4 'none' yazan liste boş sayılıyor", /is empty/.test(b.ek), b.ek);
  const kt = kayit(d, "e-tas", []);
  b = gor(betik(d, "istem.js", { session_id: "e2", transcript_path: kt, prompt: "HANDOFF: docs/handoff/lobby.md\nROLE: design\nRead this file." }));
  esit("J4 ROLE satırı rolü belirliyor", /design session/.test(b.ek) && JSON.parse(oku(path.join(d, ".claude", "teke", "durum", "e2.json"))).rol === "tasarim", b.ek);
  b = gor(betik(d, "oturum-baslangici.js", { source: "compact", session_id: "e3", transcript_path: kayit(d, "e-kod", [kul("HANDOFF: docs/handoff/x.md\nROLE: code")]) }));
  esit("J4 kod oturumuna kendi KEEP notu yükleniyor", /migration half done/.test(b.ek) && !/liked line L2/.test(b.ek), b.ek);
  // bağlam eşikleri (iki rol)
  for (const [oturum, kayitYolu] of [["e1", ko], ["e2", kt]]) for (const n of [560000, 700000]) {
    fs.writeFileSync(kayitYolu, [kul("HANDOFF: docs/handoff/lobby.md\nROLE: design"), asi(n)].join("\n") + "\n");
    b = gor(betik(d, "istem.js", { session_id: oturum, transcript_path: kayitYolu, prompt: "fine" }));
  }
  esit("J4 bağlam haberi İngilizce", /teke context/.test(cikti.join("\n")) && /COMPACT NEEDED/.test(cikti.join("\n")) && /type \/compact/.test(cikti.join("\n")));
  let son = null;
  for (let i = 0; i < 25; i++) son = betik(d, "istem.js", { session_id: "e5", transcript_path: kayit(d, "e-ders", [kul("hi")]), prompt: "message " + i });
  esit("J4 ders taraması hatırlatması İngilizce", /teke lessons/.test(gor(son).ek), son.ek);

  // iş tarifi: kullanıcının sözü
  const ks = kayit(d, "e-soz", [kul("the lobby should feel calmer, less blue"), asi(100000)]);
  const tarif = (ad, soz) => yaz(path.join(hk, ad + ".md"), `# BRIEF — ${ad}\n\n- Role: design\n\n## The user's words (verbatim; each one a quote line)\n${soz}\n\n## My reading\nshort\n`);
  const gonder = (ad, oturum) => gor(betik(d, "devir-kapisi.js", { tool_name: "SendMessage", tool_input: { to: "design", message: `HANDOFF: docs/handoff/${ad}.md\nROLE: design\nRead this file.` }, transcript_path: ks, session_id: oturum }));
  tarif("verbatim", "> the lobby should feel calmer, less blue");
  tarif("changed", "> The user dislikes the lobby and wants a full redesign");
  tarif("empty", "> <what the user said about this task, copied from the conversation>");
  tarif("nowords", "The user did not describe this task in words; it comes from the roadmap.");
  tarif("sourced", "> Screens look empty and colourless (source: docs/DECISIONS.md)");
  const rd = gonder("changed", "es1");
  esit("J5 İngilizce iş tarifinde söz denetimi çalışıyor", gonder("verbatim", "es1").karar === null && rd.karar === "deny" && /full redesign/.test(rd.neden) && /My reading/.test(rd.neden) && gonder("empty", "es1").karar === "deny" && gonder("nowords", "es1").karar === null && gonder("sourced", "es1").karar === null && gonder("no-such-file", "es1").karar === "deny", rd.neden);

  // yardımcı ve komut kapıları
  const aj = (girdi, ad = "Agent") => gor(betik(d, "ajan-kapisi.js", { tool_name: ad, tool_input: girdi }));
  const ayY = path.join(d, ".claude", "teke", "ayar.json");
  const a2 = JSON.parse(oku(ayY)); a2.ajan.yasakModeller = ["fable"]; a2.commit.ortakYazarYasak = true; fs.writeFileSync(ayY, JSON.stringify(a2, null, 2));
  esit("J6 yardımcı kapısı İngilizce kurulumda çalışıyor, kit yardımcıları geçiyor", aj({ prompt: "x" }).karar === "deny" && aj({ prompt: "x", model: "fable" }).karar === "deny" && aj({ prompt: "x", subagent_type: "fork" }).karar === "deny" && aj({ prompt: "x", subagent_type: "critic" }).karar === null && aj({ script: "await agent('x', {label:'a'})" }, "Workflow").karar === "deny" && aj({ script: "await agent('x', {model:'claude-fable-5-2'})" }, "Workflow").karar === "deny");
  yaz(path.join(d, ".claude", "agents", "banned-role.md"), "---\nname: banned-role\nmodel: claude-fable-5-2\n---\nLook.\n");
  aj({ script: "await agent('x', {agentType:'banned-role'})" }, "Workflow");
  const kk = kayit(d, "e-kod2", [kul("HANDOFF: docs/handoff/x.md\nROLE: code")]);
  const km = (komut, kayitYolu, oturum) => gor(betik(d, "komut-kapisi.js", { tool_name: "Bash", tool_input: { command: komut }, transcript_path: kayitYolu, session_id: oturum }));
  esit("J6 komut kapısı İngilizce kurulumda çalışıyor", km("git push origin main", ks, "es1").karar === "ask" && km("git push", kk, "ek1").karar === "deny" && /report/.test(km("git push", kk, "ek1").neden) && km('git commit -m "x\n\nCo-Authored-By: Claude <a@b>"', ks, "es1").karar === "deny");

  // araçlar
  r = gor(arac(d, "ders-tara.js", "--transcript", ks));
  esit("J7 ders taraması İngilizce seçenek adlarıyla çalışıyor", /1 user message/.test(r.stdout) && /calmer, less blue/.test(r.stdout) && /Marked|marked/.test(gor(arac(d, "ders-tara.js", "--transcript", ks, "--mark")).stdout), r.stdout);
  gor(arac(d, "ders-tara.js", "--transcript", ks)); gor(arac(d, "ders-tara.js", "--transcript", path.join(d, "yok.jsonl")));
  yaz(path.join(d, "STATUS.md"), "# STATUS\n\n## NOW / NEXT\n1. task (decisions D3-D17)\n\n## Old history\n\n" + "long record ".repeat(1800) + "\n\n## MAP\nmap line\n");
  yaz(path.join(d, "docs", "DECISIONS.md"), "# DECISIONS\n\n| No | Decision |\n|---|---|\n| D17 | a |\n| D18 | b |\n");
  r = gor(arac(d, "bakim.js"));
  esit("J7 bakım İngilizce: şişen belge, bayat karar numarası, kapanmış iş tarifi", /STATUS\.md is \d+ KB/.test(r.stdout) && /up to D17, but the log has D18/.test(r.stdout) && /1 closed briefs/.test(r.stdout), r.stdout);
  r = gor(arac(d, "bakim.js", "--move", "STATUS.md", "--heading", "old history", "--dry-run"));
  const once = oku(path.join(d, "STATUS.md"));
  esit("J7 bakım İngilizce seçeneklerle: prova hiçbir şeyi değiştirmiyor", /DRY RUN/.test(r.stdout) && /1 piece/.test(r.stdout) && !var_(d, "docs", "archive"), r.stdout);
  gor(arac(d, "bakim.js", "--move", "STATUS.md", "--heading", "old history"));
  r = gor(arac(d, "bakim.js", "--archive"));
  esit("J7 arşiv İngilizce klasörlere gidiyor", var_(d, "docs", "archive", "handoff", "old.md") && !var_(d, "docs", "handoff", "old.md") && var_(d, "docs", "handoff", "lobby.md") && fs.readdirSync(path.join(d, "docs", "archive")).some((f) => /^STATUS-\d{4}-\d{2}\.md$/.test(f)) && oku(path.join(d, "STATUS.md")).length < once.length, r.stdout);
  gor(arac(d, "bakim.js", "--move", "STATUS.md", "--heading", "no such heading")); gor(arac(d, "bakim.js", "--move", "STATUS.md"));
  betik(d, "istem.js", { session_id: "ek1", transcript_path: kk, prompt: "HANDOFF: docs/handoff/lobby.md\nROLE: code" });
  r = gor(arac(d, "nobet.js", "code", "--brief", "docs/handoff/lobby.md", "--minutes", "0.01", "--interval-sec", "0.2"));
  esit("J7 sessizlik nöbeti İngilizce adlarla çalışıyor", /SILENT: the code session/.test(r.stdout), r.stdout + r.stderr);
  require("child_process").spawn(process.execPath, ["-e", "setTimeout(() => require('fs').appendFileSync(process.argv[1], '\\n## Report\\ndone\\n'), 700)", path.join(hk, "lobby.md")], { detached: true, stdio: "ignore" }).unref();
  r = gor(spawnSync(process.execPath, [path.join(d, ".claude", "teke", "araclar", "nobet.js"), "code", "--brief", "docs/handoff/lobby.md", "--minutes", "5", "--interval-sec", "0.2", "--max-minutes", "0.3"], { encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: d }, cwd: d }));
  esit("J7 İngilizce rapor başlığı nöbeti bitiriyor", /REPORT WRITTEN/.test(r.stdout), r.stdout);
  gor(arac(d, "nobet.js", "design", "--minutes", "0.01", "--interval-sec", "0.2")); gor(arac(d, "nobet.js"));

  // kurucunun öteki çıktıları: çakışma, kendi düzeni olan proje
  const d2 = klasor();
  yaz(path.join(d2, ".claude", "agents", "scout.md"), "the user's own agent\n");
  yaz(path.join(d2, "CLAUDE.md"), "# rules\n"); yaz(path.join(d2, "STATUS.md"), "# status\n");
  r = gor(kur(d2, "--lang", "en"));
  esit("J8 İngilizce kurulumda çakışma ve eksik belge raporu", r.status === 3 && /CONFLICT/.test(r.stdout) && /NO DOCUMENT BY THIS NAME/.test(r.stdout) && /docs\/DECISIONS\.md/.test(r.stdout) && oku(path.join(d2, ".claude", "agents", "scout.md")) === "the user's own agent\n", r.stdout);
  gor(spawnSync(process.execPath, [KUR, "--lang", "en"], { encoding: "utf8" }));
  esit("J8 olmayan dil reddediliyor", kur(klasor(), "--dil", "xx").status === 2);

  const sizan = cikti.map((c, i) => [i, c]).filter(([, c]) => TR_HARF.test(c));
  esit("J9 İngilizce kurulumda hiçbir çıktıda Türkçe kalmıyor (" + cikti.length + " çıktı)", cikti.length > 40 && sizan.length === 0, sizan.map(([i, c]) => `#${i}: ${(c.match(/.{0,50}[çğıöşüÇĞİÖŞÜ].{0,30}/) || [""])[0]}`).slice(0, 8).join(" · "));

  // Türkçe kurulu projede dili değiştirme
  const d3 = klasor();
  kur(d3);
  yaz(path.join(d3, "DEVAM.md"), "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Türkçe kurulumdan kalan iş.\n");
  yaz(path.join(d3, ".claude", "teke", "oturumlar.json"), JSON.stringify({ kod: { id: "local_tr", model: "opus", efor: "high" } }));
  r = kur(d3, "--dil", "en");
  const ay3 = JSON.parse(oku(path.join(d3, ".claude", "teke", "ayar.json")));
  b = betik(d3, "oturum-baslangici.js", { source: "startup", session_id: "t1" });
  esit("J10 dil değişince eski dilin kit dosyaları kalkıyor, yenisi geliyor", r.status === 0 && !var_(d3, ".claude", "skills", "devir") && var_(d3, ".claude", "skills", "handoff") && !var_(d3, ".claude", "agents", "tarayici.md") && var_(d3, ".claude", "agents", "scout.md") && !var_(d3, "docs", "devir", "_SABLON.md") && /language changed/.test(r.stdout), r.stdout);
  esit("J10 dil değişince belgeler yerinde kalıyor ve bulunuyor, oturum kimlikleri korunuyor", var_(d3, "DEVAM.md") && !var_(d3, "STATUS.md") && ay3.belge.yollar["DEVAM.md"] === "DEVAM.md" && /Türkçe kurulumdan kalan iş/.test(b.ek) && /local_tr/.test(b.ek) && arac(d3, "saglik.js").status === 0, JSON.stringify(ay3.belge) + b.ek);
  // dil değişiminden sonra eski dildeki belge bölümleri, compact notu, karar defteri ve onay adları
  yaz(path.join(d3, "DEVAM.md"), "# DEVAM — Known Roadmap\n\n## ŞU AN / SIRADAKİ\n1. Lobi kodlanıyor.\n\n## BEKLEYENLER\n- (durduruyor) Ödeme sağlayıcısı hangisi olsun?\n\n## HARİTA\nharita satırı\n\n(kararlar K3-K17)\n");
  yaz(path.join(d3, "docs", "KARARLAR.md"), "# KARARLAR\n\n| No | Karar |\n|---|---|\n| K17 | a |\n| K18 | b |\n");
  yaz(path.join(d3, "docs", "devir", "KORU-orkestrator.md"), "KORU: Türkçe dönemden kalan not.\n");
  b = betik(d3, "oturum-baslangici.js", { source: "compact", session_id: "t1" });
  const bk = betik(d3, "istem.js", { session_id: "t1", transcript_path: kayit(d3, "t-ork", [kul("hello"), asi(100000)]), prompt: "continue" });
  esit("J10 dil değişince eski dildeki bölümler bölüm olarak bulunuyor, belge adı bölüm sayılmıyor", /now \/ next:\n## ŞU AN/.test(b.ek) && /document map:\n## HARİTA/.test(b.ek) && !/\(start\)/.test(b.ek) && (b.ek.match(/Known Roadmap/g) || []).length === 0, b.ek);
  esit("J10 dil değişince eski dildeki compact notu ve bekleyenler de bulunuyor", /Türkçe dönemden kalan not/.test(b.ek) && /1 items/.test(bk.ek) && /Ödeme sağlayıcısı/.test(bk.ek), b.ek + bk.ek);
  esit("J10 dil değişince bakım eski dildeki karar numaralarını tanıyor, onay adları yeni dile geçiyor", /K17/.test(arac(d3, "bakim.js").stdout) && /K18/.test(arac(d3, "bakim.js").stdout) && /pushing to the remote/.test(ay3.onay.desenler[0].ad), arac(d3, "bakim.js").stdout + JSON.stringify(ay3.onay));
  // rol satırı yalnız büyük harfli etiket ve tam sözcükle tanınır
  const { metindenRol, bolum } = require(path.join(KIT, "kancalar", "ortak.js"));
  const rolYok = ["Role: code reviewer. Please review my commit.", "please act in this role: design lead", "rol: kodlama yapacağız", "ROLE: codex", "ROL: kodlama", "> role: design system lead", "Please read\nhandoff: docs/notes.md"].filter((s) => metindenRol(s) !== null);
  const rolVar = [["ROLE: code", "kod"], ["ROL: tasarım", "tasarim"], ["HANDOFF: docs/handoff/x.md\nROLE: design\nRead it.", "tasarim"], ["ROL: orkestratör", "orkestrator"], ["ROLE: orchestrator", "orkestrator"], ["DEVİR: docs/devir/x.md", "kod"], ["ROLE: code            (or: ROLE: design)", "kod"]].filter(([s, r]) => metindenRol(s) !== r);
  esit("J11 sıradan cümle oturumun rolünü değiştirmiyor, gerçek rol satırı tanınıyor", rolYok.length === 0 && rolVar.length === 0, JSON.stringify([rolYok, rolVar]));
  // hem "Bekleyenler" hem eski "Açık kararlar" bölümü olan belgede liste olarak "Bekleyenler" alınır (sırası sonra olsa da)
  yaz(path.join(P, "DEVAM.md"), "# DEVAM\n\n## 3) ŞU AN / SIRADAKİ\n1. iş\n\n## 4) AÇIK KARARLAR (zamanı gelince sorulur)\n1. Mağaza ne zaman açılsın\n2. Sunucu taşıma\n\n## 5) BEKLEYENLER\n- (durduruyor) Ara durağın kararları\n");
  const bo = betik(P, "istem.js", { session_id: "j-onc", transcript_path: kayit(P, "j-onc", [kul("selam"), asi(100000)]), prompt: "devam" });
  esit("J11 iki bölüm de varsa 'Bekleyenler' öncelikli", /1 madde/.test(bo.ek) && /Ara durağın kararları/.test(bo.ek) && !/Mağaza/.test(bo.ek), bo.ek);
  esit("J11 bölüm başlığı sözcük başında aranıyor", bolum("# T\n\n## KNOWN ISSUES\nx\n\n## ROADMAP\ny\n\n## NOW / NEXT\nz\n", ["NOW", "NEXT"], 500).startsWith("## NOW / NEXT") && bolum("# T\n\n## ROADMAP\ny\n", ["MAP"], 500) === "" && bolum("# D\n\n## HEDEFLER VE SAYILAR\nh\n", ["HEDEF"], 500).startsWith("## HEDEFLER"));
  esit("J10 Türkçe kurulumda İngilizce işaretler de tanınıyor", JSON.parse(oku(path.join(P, ".claude", "teke", "durum", "c4.json"))).rol === "tasarim" && betik(P, "istem.js", { session_id: "j-tr", transcript_path: kayit(P, "j-tr", []), prompt: "HANDOFF: docs/devir/x.md\nROLE: design" }).ek.includes("tasarım oturumu"));
}

// ================= K) 2.3.1: SÜREN PROJEYE KURULUM (rol, onay listesi, bayat belge, büyük kayıt) =================
{
  const Q = klasor();
  kur(Q);
  const durum = (oturum) => { try { return JSON.parse(oku(path.join(Q, ".claude", "teke", "durum", oturum + ".json"))); } catch { return {}; } };
  const istem = (oturum, k, prompt) => betik(Q, "istem.js", { session_id: oturum, transcript_path: k, prompt });
  const komut = (oturum, k, c) => betik(Q, "komut-kapisi.js", { tool_name: "Bash", tool_input: { command: c }, transcript_path: k, session_id: oturum });
  const ozet = JSON.stringify({ type: "user", isCompactSummary: true, message: { role: "user", content: "This session is being continued from a previous conversation.\nDEVİR: docs/devir/eski.md\nROL: kod" } });
  const baskaOturum = (metin) => JSON.stringify({ type: "user", isMeta: true, message: { role: "user", content: `Another Claude session sent a message:\n<cross-session-message from="local_abc" from-name="Orkestratör">\n${metin}\n</cross-session-message>` } });

  // K1: kit kurulmadan önce açılmış, compact edilmiş oturum (kayıt özetle başlar): rol varsayılır, kaydedilmez, bir kez sorulur
  let k = kayit(Q, "k-eski", [ozet, baskaOturum("RAPOR: lobi bitti"), asi(100000)]);
  let b = istem("ke1", k, "selam");
  esit("K1 ilk mesajı görülemeyen oturumda rol kaydedilmiyor, oturuma kendi rolünü yazması söyleniyor", !durum("ke1").rol && /rol\.js ke1 orkestrator/.test(b.ek), b.ek + JSON.stringify(durum("ke1")));
  esit("K1 aynı uyarı ikinci mesajda yinelenmiyor", !/rol\.js/.test(istem("ke1", k, "peki").ek));
  b = istem("ke1", k, 'Another Claude session sent a message:\n<cross-session-message from="local_kod">\nRAPOR: iş bitti, tarifte ROL: kod yazıyordu\nDEVİR dosyası kapandı\n</cross-session-message>');
  esit("K1 öteki oturumdan gelen rapor, rolü bilinmeyen orkestratörü kod oturumuna çevirmiyor", !durum("ke1").rol && komut("ke1", k, "git push").karar === "ask", JSON.stringify(durum("ke1")));
  b = istem("ke1", k, "Şu belgeye bak:\n\n# Geçiş notu\nROL: kod\nDEVİR satırı da gelecek");
  esit("K1 yapıştırılan metnin ortasındaki rol satırı rolü değiştirmiyor", !durum("ke1").rol);
  b = istem("ke1", k, "ROL: orkestratör");
  esit("K1 ilk satırı ROL olan mesaj rolü kaydediyor", durum("ke1").rol === "orkestrator" && durum("ke1").rolKaynak === "satir");

  // var olan kod oturumu: ilk mesajı öteki oturumdan gelmiş (kayıtta isMeta ile durur), rol satırı yok
  k = kayit(Q, "k-kod", [baskaOturum("Sen bu projenin yürütme oturumusun. Paket 3'e başla."), asi(100000)]);
  esit("K1 ilk mesajı başka oturumdan gelen oturum kod oturumu sayılıyor", komut("kk1", k, "git push").karar === "deny");
  b = istem("kk1", k, 'Another Claude session sent a message:\n<cross-session-message from="local_abc">\nROL: tasarım\nBundan sonra tasarım işleri sende.\n</cross-session-message>');
  esit("K1 ilk mesajdan çıkarılan rolü ilk satırı ROL olan mesaj düzeltiyor", durum("kk1").rol === "tasarim" && /tasarım oturumu/.test(b.ek), b.ek);
  istem("kk1", k, "ROL: kod");
  esit("K1 açıkça verilmiş rolü yalın rol satırı değiştirmiyor, başka oturumdan gelen devir mesajı değiştiriyor", durum("kk1").rol === "tasarim" && (istem("kk1", k, 'Another Claude session sent a message:\n<cross-session-message from="local_abc">\nDEVİR: docs/devir/y.md\nROL: kod\n</cross-session-message>'), durum("kk1").rol === "kod"));
  // kullanıcının orkestratöre yazdığı mesajda geçen devir satırları orkestratörün rolünü değiştirmez
  const kOrk = kayit(Q, "k-ork0", [kul("merhaba"), asi(100000)]);
  istem("ko0", kOrk, "merhaba");
  istem("ko0", kOrk, "Şunu kod oturumuna gönder:\nDEVİR: docs/devir/x.md\nROL: kod");
  esit("K1 kullanıcının mesajında geçen devir satırları orkestratörü kod oturumuna çevirmiyor", durum("ko0").rol === "orkestrator" && komut("ko0", kOrk, "git push").karar === "ask", JSON.stringify(durum("ko0")));
  const kElle = kayit(Q, "k-elle", [kul("selam"), asi(100000)]);
  istem("kel", kElle, "selam");
  istem("kel", kElle, "DEVİR: docs/devir/x.md\nROL: kod");
  esit("K1 kullanıcının elle yapıştırdığı, DEVİR satırıyla başlayan mesaj rolü veriyor", durum("kel").rol === "kod");

  // 2.3.0'dan kalan durum dosyası: yanlış kaydedilmiş "orkestratör" düzeltilebilir, doğru kaydedilmiş "kod" korunur
  yaz(path.join(Q, ".claude", "teke", "durum", "eski230.json"), JSON.stringify({ rol: "orkestrator" }));
  istem("eski230", k, "ROL: kod\nBu oturum kod oturumu.");
  yaz(path.join(Q, ".claude", "teke", "durum", "eski230b.json"), JSON.stringify({ rol: "kod" }));
  istem("eski230b", k, "ROL: orkestratör");
  esit("K1 eski sürümün yanlış kaydettiği orkestratör rolü düzeliyor, doğru kaydedilmiş rol korunuyor", durum("eski230").rol === "kod" && durum("eski230b").rol === "kod");

  // açılış: rolü bilinmeyen oturuma başka rolün compact notu yüklenmez; rol yazılınca yüklenir
  yaz(path.join(Q, "docs", "devir", "KORU-orkestrator.md"), "ORKESTRATÖR NOTU: karar bekleniyor.\n");
  yaz(path.join(Q, "docs", "devir", "KORU-kod.md"), "KOD NOTU: paket 3 yarıda.\n");
  k = kayit(Q, "k-eski2", [ozet, asi(100000)]);
  b = betik(Q, "oturum-baslangici.js", { source: "resume", session_id: "ke2", transcript_path: k });
  esit("K2 rolü bilinmeyen oturumda açılış: rol komutu veriliyor, hiçbir compact notu yüklenmiyor, ikisi de sayılıyor", /rol\.js ke2 orkestrator/.test(b.ek) && !/karar bekleniyor|paket 3 yarıda/.test(b.ek) && /KORU-orkestrator\.md, docs\/devir\/KORU-kod\.md/.test(b.ek) && !durum("ke2").rol, b.ek);
  let r = arac(Q, "rol.js");
  esit("K2 rol aracı oturumları listeliyor", r.status === 0 && /ke2/.test(r.stdout) && /VARSAYIM/.test(r.stdout) && /kk1/.test(r.stdout), r.stdout + r.stderr);
  r = arac(Q, "rol.js", "ke2", "kod");
  b = betik(Q, "oturum-baslangici.js", { source: "compact", session_id: "ke2", transcript_path: k });
  esit("K2 rol aracı rolü yazıyor, sonraki açılışta o rolün notu yükleniyor", r.status === 0 && durum("ke2").rol === "kod" && durum("ke2").rolKaynak === "elle" && /paket 3 yarıda/.test(b.ek) && !/karar bekleniyor/.test(b.ek), r.stdout + b.ek);
  esit("K2 rol aracı İngilizce rol adını alıyor, geçersiz rolü ve bulunamayan oturumu reddediyor", arac(Q, "rol.js", "ke2", "design").status === 0 && durum("ke2").rol === "tasarim" && arac(Q, "rol.js", "ke2", "yazar").status === 2 && arac(Q, "rol.js", "yokboyle", "kod").status === 2);
  esit("K2 rol aracıyla yazılan rolü yalın rol satırı değiştirmiyor", (istem("ke2", k, "ROL: kod"), durum("ke2").rol === "tasarim"));

  // K3: onay listesi
  const ork = kayit(Q, "k-ork", [kul("merhaba"), asi(100000)]);
  const kod = kayit(Q, "k-kod2", [kul("DEVİR: docs/devir/x.md\nROL: kod")]);
  const sorulan = ["pnpm -C apps/worker deploy", "npx wrangler@latest pages deploy dist", "pnpm --filter web run deploy:web", "wrangler secret put KAPALI_MOD", "vercel --prod", "pnpm exec wrangler d1 migrations apply ana --remote"].filter((c) => komut("ko1", ork, c).karar !== "ask");
  const sorulmayan = ["wrangler deploy --dry-run --outdir dist", "pnpm -C apps/worker deploy --dry-run", "pnpm install", "wrangler d1 execute ana --local --command \"select 1\"", "echo deployment bitti"].filter((c) => komut("ko1", ork, c).karar !== null);
  esit("K3 yayın desenleri: alt klasörden, pages ile, secret ile yapılan yakalanıyor; deneme yayını sorulmuyor", sorulan.length === 0 && sorulmayan.length === 0, JSON.stringify([sorulan, sorulmayan]));
  esit("K3 commit mesajının gövdesinde geçen komut adı komut sayılmıyor (heredoc ve here-string)",
    komut("ko1", ork, "git commit -q -F - <<'EOF'\nKural: git push yalnız orkestratörde, wrangler deploy onayla\nEOF").karar === null &&
    komut("ko1", ork, "git commit -m \"$(cat <<'EOF'\nYayın notu: \"pnpm yayinla\" artık sorulur\nEOF\n)\"").karar === null &&
    komut("ko1", ork, "git commit -m @'\nDEVAM'ı güncelle: git push kuralı\n'@").karar === null);
  esit("K3 gövdesi kabuğa verilen heredoc komut sayılıyor", komut("ko1", ork, "bash <<EOF\ngit push\nEOF").karar === "ask" && komut("ko1", ork, "cat <<EOF | bash\nwrangler deploy\nEOF").karar === "ask");
  // gövde ayıklama yalnız commit mesajında yapılır: başka her gövde denetlenir
  const kacan = [
    'echo "<<EOF"\ngit push origin main\nEOF',
    "# <<EOF\ngit push origin main\nEOF",
    "cat <<<EOF\ngit push origin main\nEOF",
    "/bin/bash <<EOF\ngit push origin main\nEOF",
    "source /dev/stdin <<EOF\ngit push origin main\nEOF",
    "eval \"$(cat <<'EOF'\ngit push origin main\nEOF\n)\"",
    "Invoke-Expression @'\ngit push origin main\n'@",
    "@'\ngit push origin main\n'@ | iex",
    "cat <<EOF\n$(git push origin main)\nEOF",
    "cat > d.sh <<EOF\nwrangler deploy\nEOF\nsh d.sh",
    'git commit -m "<<EOF"\ngit push origin main\nEOF',
    "git commit -F - <<EOF\n$(git push origin main)\nEOF",
    "git commit -F - <<'EOF'\nmesaj\nEOF\ngit push origin main",
    "/bin/bash -c \"git push origin main\"",
    "yarn workspace web deploy",
    "wrangler deploy --var X:--dry-run",
  ].filter((c) => komut("ko1", ork, c).karar !== "ask");
  esit("K3 gövde ayıklama gerçek komutu kaçırmıyor (dize içindeki <<, here-string, kabuğa giden gövde, açılım, gövdeden sonraki komut)", kacan.length === 0, JSON.stringify(kacan));
  const t0 = Date.now();
  const uzun = komut("ko1", ork, "pnpm " + "--filter=@app/x ".repeat(60) + "build");
  esit("K3 çok seçenekli komutta yayın deseni takılmıyor", uzun.karar === null && Date.now() - t0 < 3000, String(Date.now() - t0) + " ms");
  const ayarYol = path.join(Q, ".claude", "teke", "ayar.json");
  let ay = JSON.parse(oku(ayarYol));
  ay.commit.ortakYazarYasak = true;
  ay.onay.desenler[1].kimde = "kod";
  yaz(ayarYol, JSON.stringify(ay));
  esit("K3 ortak yazar denetimi: kuralı anlatan mesaj geçiyor, gerçek satır reddediliyor",
    komut("ko1", ork, "git commit -m \"Co-Authored-By satırı artık eklenmiyor\"").karar === null &&
    komut("ko1", ork, "git commit -m \"düzeltme\n\nCo-Authored-By: Claude <noreply@anthropic.com>\"").karar === "deny" &&
    komut("ko1", ork, "git commit -m x --trailer=Co-authored-by=Claude").karar === "deny");
  b = komut("ko1", ork, "pnpm yayinla");
  esit("K3 'kimde: kod' yazılan iş kod oturumunda onay kartı açıyor, orkestratörde reddediliyor", komut("ko2", kod, "pnpm yayinla").karar === "ask" && b.karar === "deny" && /kod oturumu/.test(b.neden) && komut("ko2", kod, "git push").karar === "deny", b.neden);

  // güncelleme: kitin eski varsayılan desenleri yenilenir, kullanıcının kendi deseni kalır
  ay = JSON.parse(oku(ayarYol));
  ay.kitSurumu = "2.3.0";
  ay.onay.desenler = [
    { ad: "yayın", desen: "\\b(wrangler|vercel|netlify|firebase|flyctl|fly)\\s+(deploy|publish)\\b|\\b(npm|pnpm|yarn|bun)\\s+(run\\s+)?(deploy|yayinla|publish)\\b", kimde: "kod" },
    { ad: "uzak veritabanı", desen: "\\bwrangler\\s+d1\\s+(execute|migrations\\s+apply)\\b.*--remote\\b" },
    { ad: "benim desenim", desen: "\\bterraform\\s+apply\\b" },
  ];
  yaz(ayarYol, JSON.stringify(ay));
  r = kur(Q);
  ay = JSON.parse(oku(ayarYol));
  const vars = JSON.parse(oku(path.join(KIT, "ayarlar", "ayar.varsayilan.json"))).onay.desenler;
  esit("K3 güncellemede eski varsayılan desenler yenileniyor, kullanıcının deseni ve 'kimde' ayarı kalıyor, yeni madde ekleniyor",
    r.status === 0 && ay.onay.desenler[0].desen === vars[1].desen && ay.onay.desenler[0].kimde === "kod" && ay.onay.desenler[0].ad === "yayın" && ay.onay.desenler[1].desen === vars[2].desen && ay.onay.desenler[2].desen === "\\bterraform\\s+apply\\b" && ay.onay.desenler.length === 4 && ay.onay.desenler[3].desen === vars[3].desen && /yenilendi/.test(r.stdout), r.stdout + JSON.stringify(ay.onay));
  esit("K3 ikinci güncelleme onay listesini değiştirmiyor", (kur(Q), JSON.stringify(JSON.parse(oku(ayarYol)).onay) === JSON.stringify(ay.onay)));
  yaz(path.join(Q, "package.json"), JSON.stringify({ scripts: { uretim: "wrangler deploy", "web:deploy": "node yayin.mjs", deploy: "wrangler deploy", test: "vitest" } }));
  r = arac(Q, "saglik.js");
  esit("K3 sağlık kontrolü, içinde yayın çalıştıran ama listenin yakalamadığı betiği bildiriyor", r.status === 0 && /uretim, web:deploy\./.test(r.stdout) && /onay\.desenler/.test(r.stdout), r.stdout);
  esit("K3 kurucu bu uyarıyı kurulum çıktısında gösteriyor", /uretim, web:deploy/.test(kur(Q).stdout));
}
{
  // K4: açılış özeti bayat durum belgesini söyler; uzun ve bölümlü ders dosyasından her bölüm yüklenir
  const Q = klasor();
  kur(Q);
  const git = (a, env) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: Q, encoding: "utf8", env: { ...process.env, ...(env || {}) } });
  yaz(path.join(Q, "DEVAM.md"), "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Ara durak sunuldu, cevap bekleniyor.\n");
  git(["add", "-A"]);
  const besGunOnce = new Date(Date.now() - 5 * 86400000).toISOString();
  git(["commit", "-qm", "durum"], { GIT_AUTHOR_DATE: besGunOnce, GIT_COMMITTER_DATE: besGunOnce });
  let b = betik(Q, "oturum-baslangici.js", { source: "startup", session_id: "kb1" });
  esit("K4 güncel durum belgesinde bayat uyarısı yok", !/DİKKAT/.test(b.ek), b.ek);
  for (const n of [1, 2, 3]) { yaz(path.join(Q, "src.js"), String(n)); git(["add", "src.js"]); git(["commit", "-qm", "kod " + n]); }
  b = betik(Q, "oturum-baslangici.js", { source: "startup", session_id: "kb1" });
  esit("K4 belgeden sonra iş yapıldıysa açılış bunu söylüyor (kaç gün, kaç commit)", /DİKKAT: DEVAM\.md en son 5 gün önce güncellendi; sonrasında 3 commit var/.test(b.ek), b.ek);
  yaz(path.join(Q, "DEVAM.md"), "# DEVAM\n\n## ŞU AN / SIRADAKİ\n1. Cevaplar işleniyor.\n");
  esit("K4 belge güncellenince uyarı kalkıyor (kaydedilmemiş değişiklik de sayılır)", !/DİKKAT/.test(betik(Q, "oturum-baslangici.js", { source: "startup", session_id: "kb1" }).ek));

  const bolumAdlari = ["1) Ortam", "2) Arayüz", "3) Test", "4) Veri", "5) Yardımcılar", "6) Süreç"];
  yaz(path.join(Q, "docs", "DERSLER.md"), "# DERSLER\n\n" + bolumAdlari.map((ad, i) => `## ${ad}\n` + Array.from({ length: 12 }, (_, n) => `- **${ad[0]}${n + 1}** ${ad} dersi ${n + 1}: ` + "ayrıntı ".repeat(25)).join("\n")).join("\n\n") + "\n");
  b = betik(Q, "oturum-baslangici.js", { source: "startup", session_id: "kb2" });
  esit("K4 bölümlü ders dosyasında her bölümün son dersleri yükleniyor, bölüm adı ve ders sayısı yazıyor", bolumAdlari.every((ad) => b.ek.includes(`[${ad} · 12]`)) && /\*\*312\*\* 3\) Test dersi 12/.test(b.ek) && /\*\*412\*\*/.test(b.ek) && !/\*\*31\*\* /.test(b.ek) && /72;/.test(b.ek), b.ek.slice(b.ek.indexOf("DERSLER")));
  // çok bölümlü ders dosyası açılış özetini taşırmaz: compact notu yine yüklenir
  yaz(path.join(Q, "docs", "DERSLER.md"), "# DERSLER\n\n" + Array.from({ length: 70 }, (_, i) => `## Bölüm ${i + 1}\n- ders ${i + 1}: ` + "uzun ayrıntı ".repeat(22)).join("\n\n") + "\n");
  yaz(path.join(Q, "docs", "devir", "KORU-orkestrator.md"), "KORU NOTU: kaldığımız adım burada.\n");
  b = betik(Q, "oturum-baslangici.js", { source: "compact", session_id: "kb3" });
  esit("K4 yetmiş bölümlü ders dosyasında özet sınırda kalıyor, compact notu yükleniyor", /kaldığımız adım burada/.test(b.ek) && /bölüm daha dosyada/.test(b.ek) && b.ek.length < 14000, String(b.ek.length));
}
{
  // K5: söz denetimi büyük kayıtta sondan okur; alıntı baştaki mesajda da olsa bulunur, yoksa geri çevrilir
  const Q = klasor();
  kur(Q);
  const { kayittaAra } = require(path.join(KIT, "kancalar", "devir-kapisi.js"));
  const dolgu = JSON.stringify({ type: "assistant", message: { role: "assistant", content: [{ type: "text", text: "şğüöçıİ ".repeat(4000) }] } });
  const satirlar = [kul("Lobi ekranında oyuncu adları büyük harfle yazılsın istiyorum")];
  for (let i = 0; i < 260; i++) satirlar.push(dolgu);
  satirlar.push(kul("Bir de çıkış düğmesi sağ üstte dursun lütfen"));
  const k = kayit(Q, "k-buyuk", satirlar);
  const boyutMB = Math.round(fs.statSync(k).size / 1048576);
  const ara = (soz) => kayittaAra(k, [[soz]], 20000);
  esit(`K5 alıntı ${boyutMB} MB'lik kaydın sonundaki ve başındaki mesajda bulunuyor, olmayan alıntı bulunmuyor`, boyutMB >= 9 && ara("Bir de çıkış düğmesi sağ üstte dursun lütfen").yok.length === 0 && ara("Lobi ekranında oyuncu adları büyük harfle yazılsın istiyorum").yok.length === 0 && ara("Oyuncu adları küçük harfle yazılsın istiyorum").yok.length === 1 && ara("Oyuncu adları küçük harfle yazılsın istiyorum").tam === true);
  const yarim = kayittaAra(k, [["Lobi ekranında oyuncu adları büyük harfle yazılsın istiyorum"]], -1);
  esit("K5 süre yetmezse denetim 'tamamlanmadı' der, alıntıyı yok saymaz", yarim.tam === false && yarim.yok.length === 1);
}

for (const d of gecici) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
console.log(`\n${gecti}/${gecti + kalanlar.length} test geçti` + (kalanlar.length ? `; KALAN: ${kalanlar.join(" · ")}` : ""));
process.exit(kalanlar.length ? 1 : 0);
