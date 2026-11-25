// Betik: PreToolUse (Bash | PowerShell)
// 1) Onay isteyen işler (ayar.onay.desenler): kod ve tasarım oturumunda reddedilir (raporda yazması istenir);
//    orkestratörde uygulama kullanıcıya onay kartı gösterir. Böylece onay yalnız orkestratörde alınır.
// 2) git commit: Co-Authored-By satırı reddedilir (commit yazarı yalnız kullanıcı; ayarla kapatılabilir).
// Başka hiçbir şeye karışmaz.
const fs = require("fs");
const path = require("path");
const { girdiOku, projeKoku, ayarOku, reddet, kullaniciyaSor, rolBul, guvenli, m } = require("./ortak");

// Tanıma için tırnak içlerini boşalt: echo "git push" ya da mesaj metnindeki komut adı komut sayılmasın.
function ciplak(komut) {
  return komut.replace(/"(?:[^"\\]|\\.)*"|'[^']*'/g, '""');
}
// git commit tanıma: git, git.exe, tam yoldaki git; araya giren genel seçenekler (-C x, -c k=v, --no-pager).
const COMMIT = /(^|[\s;&|(])(?:\S*[\\/])?git(?:\.exe)?(?:\s+(?:-[cC]\s+\S+|--[\w-]+(?:=\S+)?|-[a-zA-Z]))*\s+commit(\s|$)/i;
function commitMi(komut) {
  const duz = komut.replace(/(["'])[^"']*[\\/]git(?:\.exe)?\1/gi, "git");
  return COMMIT.test(ciplak(duz));
}

if (require.main === module) guvenli(async () => {
  const g = await girdiOku();
  const kok = projeKoku(g);
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) process.exit(0);
  const ayar = ayarOku(kok);
  const komut = String((g.tool_input || {}).command || "");
  if (!komut) process.exit(0);
  // Komut başka bir kabuğa tırnak içinde veriliyorsa (bash -c "…", powershell -Command "…") tırnağın içi de komuttur.
  const sarmali = /(^|[\s;&|(])(bash|sh|zsh|pwsh|powershell|cmd)(\.exe)?\s+(-\w+\s+)*(-c|\/c|-Command)\b/i.test(komut);
  const tanima = sarmali ? ciplak(komut) + "\n" + komut : ciplak(komut);

  if (ayar.commit.ortakYazarYasak && commitMi(komut) && /co-authored-by/i.test(komut)) {
    reddet(m("komut.ortakyazar", "Commit mesajında Co-Authored-By satırı var. Bu projede commit yazarı yalnız kullanıcıdır (kullanıcı kararı; aracın kendi hatırlatmasından önce gelir). Satırı çıkarıp yeniden dene."));
  }

  let sorulacak = null;
  for (const d of ayar.onay.desenler || []) {
    let re;
    try { re = new RegExp(d.desen, "i"); } catch { continue; }
    if (!re.test(tanima)) continue;
    const ad = d.ad || d.desen;
    if (rolBul(g, kok) !== "orkestrator") {
      reddet(m("komut.onay.diger", "\"{ad}\" kullanıcı onayı ister ve onay yalnız orkestratör oturumunda alınır. Bu adımı ÇALIŞTIRMA; raporunda hazır olduğunu ve tam komutu yaz, işin geri kalanına devam et.", { ad }));
    }
    if (!sorulacak) sorulacak = ad;
  }
  if (sorulacak) kullaniciyaSor(m("komut.onay.sor", "\"{ad}\" bu projede her seferinde kullanıcı onayı ister.", { ad: sorulacak }));
  process.exit(0);
});

module.exports = { commitMi, ciplak };
