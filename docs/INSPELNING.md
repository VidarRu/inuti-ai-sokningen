# Så spelas en körning in

Steg 2, 6 och 7 på sidan bygger på verkliga körningar i en AI-söktjänst. Byggmiljön når inga sådana tjänster, så Vidar kör frågan själv och fyller i mallen nedan. En fil per körning, sparad som `inspelningar/<kort-namn>.txt` (till exempel `inspelningar/kommunalskatt.txt`). Skriptet `scripts/inspelning_till_json.mjs` gör sedan om alla filer till `public/data/inspelningar.json`.

Två eller tre frågor räcker. Välj frågor med ett svar som kan ha ändrats nyligen, så att steg 4 (den lurande träffen) och steg 7 (hänvisningen som inte stämmer) har något att visa.

## Mallen

Kopiera allt nedanför strecket. Rubrikerna i versaler måste stå kvar precis så, med kolon. Raderna med … byts ut.

---

```
FRÅGA: …
TJÄNST OCH LÄGE: … (t.ex. gratisversion, utloggad)
DATUM OCH TID: 2026-11-17 10:15
SÖKFRÅGOR SOM VISADES:
- …
SVAR (ordagrant):
…
HÄNVISNINGAR:
[1] URL – meningen hänvisningen sitter vid
KONTROLL:
[1] står i källan / står inte / delvis – kort notering
UTDRAG TILL KORPUSET:
URL, hämtad 2026-11-17: "…"
```

## Vad som ska stå i varje del

- **FRÅGA:** exakt det du skrev i sökrutan.
- **TJÄNST OCH LÄGE:** vilken tjänst, och om du var inloggad, vilken version och eventuellt läge (snabb, djup). Sparas i datan men visas inte på sidan. Sidan pekar inte ut någon tjänst.
- **DATUM OCH TID:** när körningen gjordes. Visas på sidan intill det inspelade svaret.
- **SÖKFRÅGOR SOM VISADES:** de omformulerade sökfrågor tjänsten visade medan den arbetade, en per rad med `- ` först. Visade den inga, skriv `- (inga visades)`. Detta blir steg 2.
- **SVAR (ordagrant):** hela svaret, klistrat rakt av, med fotnotsmarkeringarna kvar som `[1]`, `[2]` och så vidare. Flera stycken går bra. Detta blir steg 6.
- **HÄNVISNINGAR:** en rad per källa. Numret i hakparentes, adressen, ett tankstreck och den mening i svaret som hänvisningen sitter vid (ordagrant, så att skriptet hittar den).
- **KONTROLL:** samma nummer. Skriv `står i källan`, `står inte` eller `delvis`, sedan ett tankstreck och en kort notering om vad källan faktiskt säger. Detta blir steg 7, så minst en hänvisning som inte stämmer helt är värdefull, men skriv sanningen även om alla stämmer.
- **UTDRAG TILL KORPUSET:** de textstycken ur källorna som sidan ska klippa ut i steg 5, ett per rad: adressen, kommatecken, `hämtad` och datum, kolon, och själva texten inom citattecken. Ta med en bit som ger rätt svar och gärna en föråldrad, satirisk eller reklamdriven sida som rankas högt. Högst ett par meningar per utdrag.

## Att tänka på

- Klistra in ordagrant. Rätta inte stavfel i svaret.
- Ta gärna en skärmdump också, för din egen del. Den läggs inte i Git.
- Om tjänsten visar steg som inte passar i mallen (till exempel vilka sidor den läste innan den valde), skriv dem under en egen rubrik `ÖVRIGT:` sist i filen. Skriptet sparar texten som den är.
