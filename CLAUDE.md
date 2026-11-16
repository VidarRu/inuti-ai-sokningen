# Inuti AI-sökningen

En svensk webbsida man scrollar sig igenom. Den följer en enda fråga genom en AI-söktjänst, från att man skriver den till att svaret med källhänvisningar visas, och visar var det kan gå fel på vägen. Systerprojekt till *Inuti AI-hjärnan* (`VidarRu/insidan-av-ai`), som är referens för partikelsystem, scrollskelett och designspråk. Målgrupp: bibliotekarier och deltagare i Vidars utbildningar, utan teknisk bakgrund.

## Läs först

- `PROGRESS.md`: var projektet står. Läs den i början av varje session.
- `docs/PLAN.md`: hela planen. Läs bara avsnittet för steget du arbetar med.
- `docs/BRIEF.md`: Vidars ursprungliga brief (2026-11-16), oförändrad.
- Referensrepot `VidarRu/insidan-av-ai` är publikt. Klona det vid behov och läs `src/scene/stage.js`, `src/scene/shapes.js`, `src/main.js` och `src/style.css`. Återanvänd, bygg inte om.

## Stack

- Vite och Three.js, ett partikelsystem som byter form genom hela sidan (från hjärnprojektet).
- Scrollstyrd kamera med egen kod (ingen GSAP), som i hjärnprojektet.
- Transformers.js i en Web Worker med WebAssembly. Modell: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, int8 (118 MB), se `src/sok/config.js`. Den rankar ett litet svenskt textkorpus i webbläsaren (steg 3).
- Steg 2, 6 och 7 är förinspelade körningar sparade som JSON med datum i `public/data/`. Sidan säger öppet att de är inspelade.
- Statisk sida på Vercel. Ingen server, inga API-nycklar.

## Regler som alltid gäller

- All text på svenska, för lekmän. Inget förmänskligande språk: skriv "räknar fram", "hämtar", "ger hög sannolikhet", aldrig "förstår", "tänker", "vet".
- Varje steg har en fällbar ruta, "Så här är det egentligen".
- Sidan visar en generisk förenklad kedja och säger det tydligt. Peka inte ut någon enskild tjänst som exempel på felen.
- Lärandemålen får inte förenklas till "AI hittar alltid på". Steg 7 ska säga att hänvisningar ofta stämmer, men att det är det man ska kontrollera.
- Hitta aldrig på siffror. Siffror på sidan är antingen uträknade live, förberäknade med samma modell, eller inspelade med datum.
- Sidan fungerar utan att modellen laddats. På mobil och svaga datorer visas bara förberäknade exempel.
- WCAG 2.1 AA: tangentbord, textbeskrivning per steg, lugnt läge vid minskad rörelse.
- Modellvikter och andra stora filer läggs aldrig i Git.
- Licens: CC BY 4.0 för texterna, MIT för koden.

## Arbetssätt

- Ett steg i taget enligt arbetsordningen i `docs/PLAN.md`. Det visuellt avgörande först, texterna sist.
- När ett steg är klart: uppdatera `PROGRESS.md` (klart, nästa steg, öppna frågor) och committa.
- Vidar är inte utvecklare. Förklara terminalkommandon och Git-steg i klarspråk, ett i taget, och säg vad han ska titta efter i webbläsaren.
