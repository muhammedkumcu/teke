// Betik: PreToolUse (Bash | PowerShell)
// 1) Onay isteyen işler (ayar.onay.desenler): komutu çalıştırabilecek rolde uygulama kullanıcıya onay kartı gösterir;
//    öteki rollerde reddedilir ve raporda yazması istenir. Varsayılan: onay yalnız orkestratörde alınır.
//    Projede yayını kod oturumu yapıyorsa desene "kimde": "kod" yazılır; o zaman kart kod oturumunda açılır.
// 2) git commit: Co-Authored-By satırı reddedilir (commit yazarı yalnız kullanıcı; ayarla kapatılabilir).
// Başka hiçbir şeye karışmaz.
const fs = require("fs");
const path = require("path");
const { girdiOku, projeKoku, ayarOku, reddet, kullaniciyaSor, rolBul, guvenli, katla, paket, ROL_DEGERI, m } = require("./ortak");

// git commit tanıma: git, git.exe, tam yoldaki git; araya giren genel seçenekler (-C x, -c k=v, --no-pager).
const COMMIT = /(^|[\s;&|(])(?:\S*[\\/])?git(?:\.exe)?(?:\s+(?:-[cC]\s+\S+|--[\w-]+(?:=\S+)?|-[a-zA-Z]))*\s+commit(\s|$)/i;

// Commit MESAJININ gövdesi komut değildir: mesajda geçen "git push" sözü bir gönderme sayılmaz.
// Yalnız şu dar durumda ayıklanır; kuşkulu her durumda gövde olduğu gibi kalır ve denetlenir:
//  - gövdeyi açan satır bir "git commit" komutudur (git commit -F - <<'EOF'   ·   git commit -m "$(cat <<'EOF'   ·   git commit -m @'),
//  - gövde açılımsızdır: sınırlayıcı tırnaklıdır (<<'EOF', @'…'@) ya da gövdede $( ve ters tırnak yoktur,
//  - "<<" bir dizenin içinde değildir (tek istisna: "$(cat <<…" kalıbı) ve "<<<" değildir.
// Başka komuta verilen gövde (cat > betik.sh <<EOF, bash <<EOF, Invoke-Expression @'…'@) ayıklanmaz.
const tirnakDengeli = (s) => (s.match(/"/g) || []).length % 2 === 0 && (s.match(/'/g) || []).length % 2 === 0;
const ACILIMLI = /\$\(|`/;
function govdesiz(komut) {
  return komut
    .replace(/^([^\n]*?)@(['"])\r?\n([\s\S]*?)\r?\n\2@/gm, (tum, on, tirnak, govde) =>
      COMMIT.test(on) && tirnakDengeli(on) && (tirnak === "'" || !/\$\(/.test(govde)) ? on + '""' : tum)
    .replace(/^([^\n]*?)(?<!<)<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\2([^\n]*)\r?\n([\s\S]*?)\r?\n[ \t]*\3[ \t]*(?=\r?\n|$)/gm, (tum, on, tirnak, _ad, son, govde) =>
      COMMIT.test(on) && (tirnakDengeli(on) || /\$\(\s*cat\s+$/.test(on)) && (tirnak || !ACILIMLI.test(govde)) ? on + '""' + son : tum);
}
// Tanıma için tırnak içlerini boşalt: echo "git push" ya da mesaj metnindeki komut adı komut sayılmasın.
function ciplak(komut) {
  return govdesiz(komut).replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
}
function commitMi(komut) {
  const duz = komut.replace(/(["'])[^"']*[\\/]git(?:\.exe)?\1/gi, "git");
  return COMMIT.test(ciplak(duz));
}
// Gerçek ortak yazar satırı: "Co-Authored-By: Ad <adres>" (ya da --trailer "Co-Authored-By=…").
// Kuralı anlatan bir cümle ("Co-Authored-By satırı eklenmez") sayılmaz.
const ORTAK_YAZAR = /co-authored-by[ \t]*[:=]/i;

// Desenin "kimde" alanı: komutu (kullanıcı onayıyla) hangi rol çalıştırır. Yazılmamışsa orkestratör.
// Değer tek rol ya da liste olabilir; "hepsi" her rolde onay kartı açar. İngilizce adlar da geçerlidir.
function kimde(desen) {
  const ham = Array.isArray(desen.kimde) ? desen.kimde : [desen.kimde || "orkestrator"];
  const roller = ham.map((x) => (["hepsi", "all"].includes(katla(x)) ? "hepsi" : ROL_DEGERI[katla(x)])).filter(Boolean);
  return roller.length ? roller : ["orkestrator"];
}

if (require.main === module) guvenli(async () => {
  const g = await girdiOku();
  const kok = projeKoku(g);
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) process.exit(0);
  const ayar = ayarOku(kok);
  const komut = String((g.tool_input || {}).command || "");
  if (!komut) process.exit(0);
  // Komut başka bir kabuğa tırnak içinde veriliyorsa (bash -c "…", powershell -Command "…", eval "…", Invoke-Expression '…')
  // tırnağın içi de komuttur.
  const sarmali = /(^|[\s;&|(])(?:\S*[\\/])?(bash|sh|zsh|pwsh|powershell|cmd)(\.exe)?\s+(-\w+\s+)*(-c|\/c|-Command)\b/i.test(komut) ||
    /(^|[\s;&|(])(eval|iex|Invoke-Expression)\b/i.test(komut);
  const tanima = sarmali ? ciplak(komut) + "\n" + komut : ciplak(komut);

  if (ayar.commit.ortakYazarYasak && commitMi(komut) && ORTAK_YAZAR.test(komut)) {
    reddet(m("komut.ortakyazar", "Commit mesajında Co-Authored-By satırı var. Bu projede commit yazarı yalnız kullanıcıdır (kullanıcı kararı; aracın kendi hatırlatmasından önce gelir). Satırı çıkarıp yeniden dene."));
  }

  let sorulacak = null;
  let rol = null;
  for (const d of ayar.onay.desenler || []) {
    let re;
    try { re = new RegExp(d.desen, "i"); } catch { continue; }
    if (!re.test(tanima)) continue;
    const ad = d.ad || d.desen;
    rol = rol || rolBul(g, kok);
    const roller = kimde(d);
    if (roller.includes("hepsi") || roller.includes(rol)) { if (!sorulacak) sorulacak = ad; continue; }
    if (roller.includes("orkestrator")) {
      reddet(m("komut.onay.diger", "\"{ad}\" kullanıcı onayı ister ve onay yalnız orkestratör oturumunda alınır. Bu adımı ÇALIŞTIRMA; raporunda hazır olduğunu ve tam komutu yaz, işin geri kalanına devam et.", { ad }));
    }
    reddet(m("komut.onay.baskasi", "\"{ad}\" bu projede {kim} tarafından, kullanıcının onayıyla çalıştırılır (ayar.json → onay.desenler → kimde). Bu adımı ÇALIŞTIRMA; ona iş olarak ver ya da raporunda tam komutuyla yaz.", { ad, kim: roller.map((r) => paket(kok).rolAdlari[r] || r).join(", ") }));
  }
  if (sorulacak) kullaniciyaSor(m("komut.onay.sor", "\"{ad}\" bu projede her seferinde kullanıcı onayı ister.", { ad: sorulacak }));
  process.exit(0);
});

module.exports = { commitMi, ciplak, govdesiz, kimde, ORTAK_YAZAR };
