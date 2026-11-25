// Betik: SessionStart (startup | resume | clear | compact)
// Amaç: oturum her açıldığında ve her compact sonrasında kaldığımız yeri kendiliğinden yüklemek.
// Kullanıcının compact sonrası metin yapıştırmasına gerek kalmaz. Çıktı olgu olarak yazılır ve 16.000 karakteri geçmez.
const fs = require("fs");
const path = require("path");
const { girdiOku, projeKoku, ayarOku, baglamEkle, guvenli, oku, belgeYolu, belgeAdi, devirKlasoru, rolAyrinti, durumOku, durumYaz, jsonDene, durumBolumu, koruDosyasi, paket, paketAdi, m, TARIF_DEGIL, KAPANDI_SATIRI } = require("./ortak");

// Belgenin yaşı: son güncellendiği zamandan bugüne gün sayısı ve o zamandan sonra atılan commit sayısı.
// Belge git'te ve değişmemişse son commit'i, değilse (kaydedilmemiş ya da git dışı) dosya zamanı esas alınır.
function belgeYasi(kok, goreliYol) {
  try {
    const { execFileSync } = require("child_process");
    const git = (a) => execFileSync("git", a, { cwd: kok, stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).toString().trim();
    const kirli = git(["status", "--porcelain", "--", goreliYol]);
    const son = kirli ? "" : git(["log", "-1", "--format=%H %ct", "--", goreliYol]);
    let zaman, commit;
    if (son) {
      const [kimlik, t] = son.split(" ");
      zaman = Number(t) * 1000;
      commit = Number(git(["rev-list", "--count", `${kimlik}..HEAD`]));
    } else {
      zaman = fs.statSync(path.join(kok, goreliYol)).mtimeMs;
      commit = Number(git(["rev-list", "--count", `--since=${Math.floor(zaman / 1000) + 1}`, "HEAD"]));
    }
    return { gun: Math.floor((Date.now() - zaman) / 86400000), commit: commit || 0 };
  } catch { return null; }
}

guvenli(async () => {
  const g = await girdiOku();
  const kok = projeKoku(g);
  if (!fs.existsSync(path.join(kok, ".claude", "teke", "ayar.json"))) process.exit(0);
  const ayar = ayarOku(kok);
  const P = paket(kok);
  const ROL_ADI = P.rolAdlari;
  const kirpildi = () => m("kirpildi", "\n…(kırpıldı; dosyanın kendisini oku)");
  const kaynak = g.source || "startup";
  const ra = rolAyrinti(g, kok);
  const rol = ra.rol;
  // Rol varsayımsa kalıcı yazılmaz. İki durumda varsayımdır:
  //  - yeni açılan ya da clear edilen oturumda henüz mesaj yoktur, rol ilk mesajla belli olur;
  //  - kit kurulmadan önce açılmış ve compact edilmiş oturumun ilk mesajı görülemez: oturum rolünü kendisi kaydeder.
  // (Kayıtta hiç mesaj yokken compact ya da resume gelirse oturum, eskisi gibi, kullanıcının konuştuğu oturum sayılır.)
  const bos = !!(ra.ilk && ra.ilk.yok);
  if (ra.kaynak === "varsayim" && bos && kaynak !== "startup" && kaynak !== "clear") ra.kaynak = "kayit";
  const belirsiz = ra.kaynak === "varsayim";
  const yeni = belirsiz && bos;
  if (g.session_id) {
    const d = durumOku(kok, g.session_id);
    if (!d.rol && !belirsiz) { d.rol = rol; d.rolKaynak = ra.kaynak; }
    if (g.transcript_path) d.kayit = g.transcript_path;
    if (kaynak === "compact" || kaynak === "clear") d.sonBant = 0;
    if (belirsiz && !yeni) d.rolSoruldu = true; // aşağıda söyleniyor: mesaj betiği yinelemesin
    durumYaz(kok, g.session_id, d);
  }
  const p = [];
  const surum = (oku(path.join(kok, ".claude", "teke", "SURUM")) || "?").trim();
  p.push(m("ac.giris", "[teke] Bu projede Teke kurulu (sürüm {surum}). Bu oturumun rolü: {rol}{belirsiz}. Çalışma düzeni: .claude/rules/teke.md. Oturum kaynağı: {kaynak}.", {
    surum, rol: ROL_ADI[rol], kaynak,
    belirsiz: !belirsiz ? "" : yeni
      ? m("ac.belirsiz", " (ilk mesajda `ROL: kod` ya da `ROL: tasarım` satırı gelirse o rol geçerlidir)")
      : m("ac.belirsiz.eski", " (VARSAYIM: bu oturumun ilk mesajı görülemiyor, rolü kayıtlı değil. Hangi oturum olduğunu biliyorsun; rolünü bir kez kaydet: node .claude/teke/araclar/rol.js {id} orkestrator   — kod oturumuysan sona kod, tasarım oturumuysan tasarim yaz)", { id: g.session_id || "<oturum>" }),
  }));
  if (ayar._bozuk) p.push(m("ac.bozuk", "UYARI: .claude/teke/ayar.json okunamıyor (bozuk JSON); varsayılan değerlerle çalışılıyor. Kullanıcıya söyle ve dosyayı düzelt."));

  if (rol === "orkestrator") {
    const r = ayar.roller || {};
    const ot = jsonDene(path.join(kok, ".claude", "teke", "oturumlar.json"), {});
    const ING = { kod: "code", tasarim: "design" }; // oturumlar.json her iki dildeki anahtarla okunur
    const satir = ["kod", "tasarim"].map((k) => {
      const o = ot[k] || ot[ING[k]];
      const v = r[k] ? `${r[k].model}/${r[k].efor}` : "";
      return o && o.id
        ? `${ROL_ADI[k]}: ${o.id} (${o.model || "?"}/${o.efor || o.effort || "?"})`
        : m("ac.oturum.yok", "{rol}: henüz açılmadı (açılış değeri {deger}; eforu işe göre sen seçersin)", { rol: ROL_ADI[k], deger: v });
    });
    p.push(m("ac.oturumlar", "Oturumlar (.claude/teke/oturumlar.json): {satir}. Yardımcı modelleri: tarama {isci}, yargı {hakem}.", { satir: satir.join(" · "), isci: r.ajanIsci, hakem: r.ajanHakem }) +
      (ayar.ajan.yasakModeller.length ? m("ac.yasak", " Yardımcıda yasak model: {liste}.", { liste: ayar.ajan.yasakModeller.join(", ") }) : ""));
  }

  // belge yolları bu dilin varsayılanından farklıysa bildir
  const adlar = ["CLAUDE.md", "DEVAM.md", "docs/KARARLAR.md", "docs/DERSLER.md"];
  const farkli = adlar.map((a) => [paketAdi(a), belgeAdi(kok, ayar, a)]).filter(([a, b]) => a !== b);
  const dk = path.relative(kok, devirKlasoru(kok, ayar)).replace(/\\/g, "/");
  if (farkli.length || dk !== P.devirKlasoru) {
    p.push(m("ac.yollar", "Bu projede belge yolları varsayılandan farklı; kurallarda geçen adlar şöyle okunur: {liste}.", {
      liste: farkli.map(([a, b]) => `${a} → ${b}`).join(" · ") + (dk !== P.devirKlasoru ? `${farkli.length ? " · " : ""}${P.devirKlasoru}/ → ${dk}/` : ""),
    }));
  }
  if (ayar.gitDisi) p.push(m("ac.gitdisi", "Kurulum git dışı (başkasının deposu): kit dosyaları ve kayıtlar yerelde kalır; deponun kendi kurallarına ve commit biçimine uyulur, depoya kit izi bırakılmaz."));

  const devamAdi = belgeAdi(kok, ayar, "DEVAM.md");
  const devam = oku(belgeYolu(kok, ayar, "DEVAM.md"));
  if (devam) {
    const suAn = durumBolumu(devam, "suAn", 2800);
    const acik = durumBolumu(devam, "bekleyen", 2400);
    const hedef = durumBolumu(devam, "hedef", 1000);
    const harita = durumBolumu(devam, "harita", 1500);
    // Belge bayat olabilir: betik içeriğin doğruluğunu bilemez, ama belgeden sonra ne kadar iş yapıldığını sayabilir.
    const yas = belgeYasi(kok, devamAdi);
    if (yas && (yas.commit >= 10 || (yas.commit >= 1 && yas.gun >= 2))) {
      p.push(m("ac.devam.bayat", "DİKKAT: {ad} en son {zaman} güncellendi; sonrasında {n} commit var. Aşağıdaki durum bayat olabilir: olgu sayma, son commit'lerle karşılaştır ve belgeyi güncelle.", {
        ad: devamAdi, n: yas.commit, zaman: yas.gun < 1 ? m("ac.bugun", "bugün") : m("ac.yas.gun", "{n} gün önce", { n: yas.gun }),
      }));
    }
    if (suAn || acik) {
      if (suAn) p.push(m("ac.suan", "{ad} — şu an / sıradaki:", { ad: devamAdi }) + "\n" + suAn);
      if (acik) p.push(m("ac.bekleyen", "{ad} — bekleyenler (kullanıcıdan beklenen her şey; \"devam\" denince, iş kapanışında ve compact sonrasında gösterilir):", { ad: devamAdi }) + "\n" + acik);
      if (hedef) p.push(m("ac.hedef", "{ad} — hedefler ve sayılar:", { ad: devamAdi }) + "\n" + hedef);
      if (harita) p.push(m("ac.harita", "{ad} — belge haritası:", { ad: devamAdi }) + "\n" + harita);
    } else {
      p.push(m("ac.devam.basi", "{ad} (başı):", { ad: devamAdi }) + "\n" + (devam.length > 2800 ? devam.slice(0, 2800) + kirpildi() : devam));
    }
  } else if (rol === "orkestrator") {
    p.push(m("ac.devam.yok", "Durum dosyası ({ad}) henüz yok.", { ad: devamAdi }));
  }

  // dersler: yazılan ders okunmazsa işe yaramaz. Her açılışta bütün derslerin başı yüklenir (her biri en çok 220 karakter).
  // Sıra projeden projeye değiştiği için (en yeni başta ya da sonda) çok uzarsa baştan ve sondan alınır.
  // Ders satırı: madde imiyle ya da kalın başlıkla başlayan satır.
  const dersAdi = belgeAdi(kok, ayar, "docs/DERSLER.md");
  // Dosya konuya göre bölümlüyse (## başlıklar) kısaltma bölüm bölüm yapılır: baştan ve sondan almak, ortadaki
  // bölümlerin (arayüz, test, veri…) hiç yüklenmemesi demektir.
  const dersBolumleri = [];
  let dersBolumu = { baslik: "", dersler: [] };
  for (const ham of (oku(belgeYolu(kok, ayar, "docs/DERSLER.md")) || "").split(/\r?\n/)) {
    const s = ham.trim();
    const b = s.match(/^#{2,3}\s+(.+)$/);
    if (b) { if (dersBolumu.dersler.length) dersBolumleri.push(dersBolumu); dersBolumu = { baslik: b[1].trim(), dersler: [] }; continue; }
    if (/^([-*]\s+\S|\*\*\S)/.test(s)) dersBolumu.dersler.push(s.length > 220 ? s.slice(0, 220) + "…" : s);
  }
  if (dersBolumu.dersler.length) dersBolumleri.push(dersBolumu);
  const kisa = dersBolumleri.flatMap((b) => b.dersler);
  if (kisa.length) {
    let sec = kisa;
    if (kisa.join("\n").length > 4000) {
      if (dersBolumleri.length >= 2) {
        // Her bölümün son dersleri (bölüm içinde yeni ders sona eklenir) ve bölümün toplam ders sayısı.
        const al = (k) => dersBolumleri.flatMap((b) => [`[${b.baslik || "…"} · ${b.dersler.length}]`, ...b.dersler.slice(-k)]);
        let k = Math.max(1, Math.floor(18 / dersBolumleri.length));
        sec = al(k);
        while (k > 1 && sec.join("\n").length > 5000) sec = al(--k);
        // Bölüm çok fazlaysa birer ders bile sığmaz: sığan bölümler alınır, kalanı sayıyla söylenir.
        if (sec.join("\n").length > 5000) {
          const sigan = [];
          let uzunluk = 0, alinan = 0;
          for (const b of dersBolumleri) {
            const parca = [`[${b.baslik || "…"} · ${b.dersler.length}]`, ...b.dersler.slice(-1)];
            uzunluk += parca.join("\n").length + 1;
            if (uzunluk > 5000) break;
            sigan.push(...parca);
            alinan++;
          }
          sec = [...sigan, m("ac.ders.bolum.fazla", "…({n} bölüm daha dosyada)", { n: dersBolumleri.length - alinan })];
        }
        sec.unshift(m("ac.ders.bolumlu", "(dosya uzun: her bölümden son {k} ders alındı; köşeli ayraçta bölümün adı ve toplam ders sayısı yazar)", { k }));
      } else {
        sec = [...kisa.slice(0, 9), m("ac.ders.fazla", "…({n} ders daha dosyada)", { n: kisa.length - 18 }), ...kisa.slice(-9)];
      }
    }
    p.push(m("ac.dersler", "{ad} — bu projenin dersleri ({n}; uzun olan kısaltıldı, işini ilgilendirenin tamamını dosyadan oku):", { ad: dersAdi, n: kisa.length }) + "\n" + sec.join("\n"));
  }

  // KORU: compact, clear ya da yeniden açılış sonrası içeriği yüklenir
  const klasor = devirKlasoru(kok, ayar);
  const koru = koruDosyasi(kok, ayar, rol); // kurulum dilindeki adla, yoksa öteki dildeki adla
  if (belirsiz && !yeni && kaynak !== "startup") {
    // Rolü bilinmeyen oturuma başka rolün notu yüklenmez: var olan notlar sayılır, kendi rolününkini oturum okur.
    const notlar = ["orkestrator", "kod", "tasarim"].map((r) => koruDosyasi(kok, ayar, r)).filter(Boolean).map((k) => `${dk}/${k.ad}`);
    if (notlar.length) p.push(m("ac.koru.rolsuz", "Compact notları: {liste}. Rolün kayıtlı olmadığı için hiçbiri yüklenmedi; kendi rolününkini şimdi oku.", { liste: notlar.join(", ") }));
  } else if (koru) {
    const koruAd = koru.ad, koruYol = koru.yol;
    const dkGecen = Math.round((Date.now() - fs.statSync(koruYol).mtimeMs) / 60000);
    const yas = dkGecen < 120 ? m("ac.yas.dk", "{n} dk önce", { n: dkGecen }) : dkGecen < 2880 ? m("ac.yas.saat", "{n} saat önce", { n: Math.round(dkGecen / 60) }) : m("ac.yas.gun", "{n} gün önce", { n: Math.round(dkGecen / 1440) });
    if (kaynak !== "startup" && !belirsiz) { // rolü belli olmayan oturuma başka rolün notu yüklenmez
      const ic = (oku(koruYol) || "").trim();
      p.push(m("ac.koru.icerik", "{yol} ({yas} yazıldı{eski}):", { yol: `${dk}/${koruAd}`, yas, eski: dkGecen > 2880 ? m("ac.koru.eski", "; eski olabilir, güncelliğini doğrula") : "" }) + "\n" + (ic.length > 8000 ? ic.slice(0, 8000) + kirpildi() : ic));
    } else {
      p.push(m("ac.koru.var", "{yol} var ({yas} yazıldı); önceki oturumdan kalan bağlam gerekiyorsa oku.", { yol: `${dk}/${koruAd}`, yas }));
    }
  }
  if (kaynak === "compact") p.push(m("ac.compact", "Compact sonrası: iş tarifinde yazan skill'leri yeniden yükle; bekleyenler listesini kullanıcıya iki grupta göster (işi durduranlar, durdurmayanlar); sonra kaldığın tek adımdan sür."));

  // süren iş tarifleri
  if (fs.existsSync(klasor)) {
    const acik = fs.readdirSync(klasor).filter((f) => f.endsWith(".md") && !TARIF_DEGIL.test(f)).filter((f) => !KAPANDI_SATIRI.test(oku(path.join(klasor, f)) || ""));
    if (acik.length) p.push(m("ac.tarifler", "Süren iş tarifleri: {liste}.", { liste: acik.slice(0, 12).map((f) => `${dk}/${f}`).join(", ") + (acik.length > 12 ? ` (+${acik.length - 12})` : "") }));
  }

  // Depo durumu: kirli ağaç varsa işe başlamadan önce ne olduğu anlaşılmalı.
  try {
    const { execFileSync } = require("child_process");
    // Yalnız sondaki boşluk atılır: "git status" satırı boşlukla başlayabilir (" M dosya").
    const git = (a) => execFileSync("git", a, { cwd: kok, stdio: ["ignore", "pipe", "ignore"], timeout: 5000 }).toString().replace(/\s+$/, "");
    const dene = (a, yoksa) => { try { return git(a); } catch { return yoksa; } };
    const kirli = git(["status", "--porcelain"]).split(/\r?\n/).filter(Boolean); // git deposu değilse burada biter
    const son = dene(["log", "-1", "--format=%h %s"], "");
    p.push(m("ac.depo", "Depo: dal {dal}, {son}", { dal: dene(["rev-parse", "--abbrev-ref", "HEAD"], "?"), son: son ? m("ac.depo.son", "son commit \"{c}\"", { c: son.slice(0, 90) }) : m("ac.depo.commityok", "henüz commit yok") }) +
      (kirli.length
        ? m("ac.depo.kirli", "; {n} dosyada kaydedilmemiş değişiklik var ({liste}): kimin olduğunu anlamadan üzerine çalışma.", { n: kirli.length, liste: kirli.slice(0, 4).map((x) => x.slice(3)).join(", ") + (kirli.length > 4 ? ", …" : "") })
        : m("ac.depo.temiz", "; çalışma ağacı temiz.")));
  } catch {}

  // Yeni açılan ve rolü henüz belli olmayan oturuma bakım ve ders haberi verilmez (kod ya da tasarım oturumu olabilir).
  if (rol === "orkestrator" && !belirsiz) {
    try {
      const { denetle } = require(path.join(__dirname, "..", "araclar", "bakim.js"));
      const h = denetle(kok, ayar).haberler;
      if (h.length) p.push(m("ac.bakim", "Bakım haberi ({n}); uygun bir iş arasında ele al, kullanıcıya yük etme:", { n: h.length }) + "\n- " + h.slice(0, 6).join("\n- "));
    } catch {}
    const d = durumOku(kok, g.session_id);
    if ((d.mesajSayisi || 0) >= 8 && kaynak === "compact") p.push(m("ac.derstara", "Son ders taramasından beri {n} kullanıcı mesajı var: node .claude/teke/araclar/ders-tara.js", { n: d.mesajSayisi }));
    if (ayar.kitKaynagi) {
      const k = (oku(path.join(ayar.kitKaynagi, "SURUM")) || "").trim();
      if (k && k !== surum) p.push(m("ac.surum", "Kit kaynağında başka sürüm var ({surum}); kullanıcıya bir kez söylenebilir (güncellemek için kit kaynağındaki {belge} okunur ve uygulanır).", { surum: k, belge: P.kurulumBelgesi }));
    }
  }

  let metin = p.join("\n\n");
  if (metin.length > 16000) metin = metin.slice(0, 16000) + m("ac.kirpildi", "\n…(kırpıldı)");
  baglamEkle("SessionStart", metin);
});
