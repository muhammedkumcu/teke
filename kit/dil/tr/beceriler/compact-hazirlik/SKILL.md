---
name: compact-hazirlik
description: Oturumun bağlamı dolmadan önceki hazırlık. KORU dosyasını yazar ve compact isteğini iletir. "[teke bağlam]" satırı compact eşiğini bildirdiğinde ya da büyük bir işe girmeden önce kullan.
---

1. Yarım işi güvenli bir durma noktasına getir (yarım düzenleme bırakma).
2. Orkestratörsen: `node .claude/teke/araclar/ders-tara.js` ile ders taraması yap (adımlar `is-kapat` becerisinin ders taraması maddesinde) ve `DEVAM.md`'yi güncelle. Konuşmada sorulup cevaplanmamış her soru, beklenen her onay ve karşılık görmemiş her önerin "Bekleyenler" bölümüne girsin: compact sonrası konuşma kısalır, listede olmayan soru kaybolur.
3. Devir klasöründe `KORU-<rol>.md` dosyasını SIFIRDAN yaz (rol: `orkestrator`, `kod` ya da `tasarim`). Tarihli, kısa, yalnız dosyalarda OLMAYAN bağlam:
   - verilmiş ama henüz belgeye girmemiş kararlar ve gerekçeleri,
   - yarım işin tam yeri ve sonraki TEK adım,
   - kullanıcının verdiği hedef sayılar ve sözler (aynen),
   - bu oturumda yapılan hatalar ve kullanıcının düzeltmeleri,
   - kod ya da tasarım oturumuysan: orkestratöre gönderdiğin ve cevabını beklediğin `SORU:` mesajları (soru metniyle),
   - tasarım oturumuysan: beğenilen ve reddedilen örnekler, nedenleriyle,
   - yüklü skill'ler.
   Belgelerde zaten yazan şey tekrar edilmez.
4. İste:
   - Orkestratörsen yanıtının İLK satırı: "Bu oturumda `/compact` yaz, sonra `devam` yaz." Başka metin kopyalatma.
   - Kod ya da tasarım oturumuysan: raporunu yaz ve orkestratöre `RAPOR: <ad> kısmen` mesajında `COMPACT GEREK` de; dur.
5. Compact sonrası: bağlama kendiliğinden eklenen "[teke]" özetini ve KORU içeriğini oku, tarifte yazan skill'leri yeniden yükle, orkestratörsen bekleyenler listesini kullanıcıya iki grupta göster (kod ya da tasarım oturumuysan cevabı gelmemiş sorunu orkestratöre yeniden gönder), kaldığın tek adımdan sür.
