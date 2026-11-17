# Så spelas en körning in

Steg 0, 2, 6 och 7 på sidan bygger på verkliga körningar i AI-söktjänster. Byggmiljön når inga sådana tjänster, så körningarna görs i Vidars webbläsare.

## Så gick det till 2026-11-16 (och så gör vi nästa gång)

1. Körningarna spelades in i en enda Markdown-fil, `inspelningar/2026-11-16.md`: en rubrik `## Fråga N, körning X` per körning och fälten nedan i ett kodblock. Filen läggs in oförändrad. Den är rådatan, och tjänsternas namn står bara där.
2. En kodsession skriver `inspelningar/kurering.json`: etiketten (Tjänst A eller B), vilken sida i korpuset varje hänvisning går till, och vilka meningar i svaret som är kontrollerade, med dom och notering hämtade ur KONTROLL.
3. Utdragen läggs i `public/data/korpus.json` med `url`, `fetched`, `sender` och vid behov `lure: true` och `lureNote`. Kör `node scripts/forberakna_korpus.mjs`.
4. Kör `node scripts/inspelning_till_json.mjs`. Det läser frågan, tiden, sökfrågorna och svaret ordagrant ur rådatan, slår ihop med kureringen och skriver `public/data/inspelningar.json`. Det stoppar om en kontrollerad mening inte står ordagrant i svaret, om en hänvisning pekar på en sida som saknas, eller om ett utdrag märkt `verbatim: true` inte står ordagrant i rådatan.

Mallen nedan gäller fortfarande för fälten i varje kodblock.

Två eller tre frågor räcker. Välj frågor med ett svar som kan ha ändrats nyligen, så att steg 4 (den lurande träffen) och steg 7 (hänvisningen som inte stämmer) har något att visa.

## Mallen

Kopiera allt nedanför strecket in i ett kodblock under rubriken för körningen. Rubrikerna i versaler måste stå kvar precis så, med kolon. Raderna med … byts ut.

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
- **HÄNVISNINGAR:** en rad per källa. Märket som det stod i svaret (`[1]` eller `[transportstyrelsen]`), adressen, ett tankstreck och vad hänvisningen sitter vid.
- **KONTROLL:** samma nummer. Skriv `står i källan`, `står inte` eller `delvis`, sedan ett tankstreck och en kort notering om vad källan faktiskt säger. Detta blir steg 7, så minst en hänvisning som inte stämmer helt är värdefull, men skriv sanningen även om alla stämmer.
- **UTDRAG TILL KORPUSET:** de textstycken ur källorna som sidan ska klippa ut i steg 5: adressen, `hämtad` och datum, och själva texten inom citattecken. Ta med en bit som ger rätt svar och gärna en föråldrad, satirisk eller reklamdriven sida som rankas högt. Myndigheters och kommuners texter kan återges ordagrant. Från kommersiella sidor bara korta citat, två till fyra meningar; de märks inte CC BY.

## Att tänka på

- Klistra in ordagrant. Rätta inte stavfel i svaret.
- Ta gärna en skärmdump också, för din egen del. Den läggs inte i Git.
- Om tjänsten visar steg som inte passar i mallen (till exempel vilka sidor den läste innan den valde), skriv dem under en egen rubrik i versaler, till exempel `ÖVRIGT:`.
- Spela gärna in utloggad nästa gång. 2026-11-16 var kontot inloggat, och i fråga 4 tog en tjänst in uppgifter från kontot (pendling Västervik–Kalmar) som inte stod i frågan.
