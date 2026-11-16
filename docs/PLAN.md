# Inuti AI-sökningen – projektplan

Senast uppdaterad 2026-11-16. Bygger på `docs/BRIEF.md`.

## Syfte och målgrupp

En svensk webbsida man scrollar sig igenom. Den följer en enda fråga genom en AI-söktjänst, från att man skriver den till att svaret med källhänvisningar visas, och visar var det kan gå fel på vägen. Både utbildningsmaterial och portfolioprojekt för AI-Folkbildaren.

**Målgrupp:** bibliotekarier och deltagare i Vidars utbildningar om AI-assisterad informationssökning och källkritik. De har använt ChatGPT eller Perplexity men har inga tekniska förkunskaper. Sidan ska fungera på storbild i en dragning och som fristående sida man kan skicka vidare.

**Efter besöket ska besökaren kunna säga:**

1. En AI-söktjänst är en kedja av steg: frågan omformuleras, sidor hämtas, utdrag väljs ut och en text skrivs. Det är inte en modell som "googlar".
2. Tjänsten söker inte nödvändigtvis på det du skrev. Frågan omformuleras först.
3. Vilka sidor som hämtas avgörs av en rankning, inte av om sidorna har rätt.
4. Modellen får bara se utdrag ur sidorna, inte hela sidor.
5. Svaret skrivs med sannolikheter (hänvisa till *Inuti AI-hjärnan*), så texten kan gå utöver vad källan säger.
6. En källhänvisning intill ett påstående visar inte att påståendet står i källan.
7. Du kan kontrollera tre saker: att påståendet står i källan, vem som är avsändare och vad en annan sökväg ger.

## Den visuella idén

Samma partikelsystem som i *Inuti AI-hjärnan*: mörk bakgrund, glödande partiklar och en accentfärg (orange, `#ffb24a`) som följer besökarens egen fråga genom alla steg. Som i hjärnprojektets senare version är det en kameraåkning: inget innehåll scrollar, texten står som undertexter längst ner och reglagen i en smal list.

Formspråk per steg (förslag, justeras när skelettet byggs):

- **Start:** en sökruta som svarar tvärsäkert med fotnötter, framför ett lugnt partikelfält. Vid scroll löses rutan upp och partiklarna drar isär, så att man ser att bilden dolde en kedja av steg.
- **Frågan** skrivs i accentfärgen. Vid omformuleringen delas den i tre till fyra sökfrågor som flyger åt olika håll, och varje sökfråga får en egen sträng av partiklar.
- **Webben** är ett stjärnfält, hjärnprojektets galax återanvänd. Varje textbit (sida) är en punkt, placerad efter sin vektor från samma inbäddningsmodell som rankar. Sökfrågan är också en punkt, och träffarna är dess närmaste grannar: de lyses upp i rankningsordning, med likhetstalet bredvid. Det är samma bild som hjärnprojektets steg 3, och det är på riktigt: rankning efter betydelse är närhet i ett betydelserum.
- **Den lurande träffen** lyser lika starkt som de riktiga. Datum, avsändare och ton syns först när man tittar efter.
- **Utdragen** klipps ur de upplysta sidorna och samlas i ett smalt fönster mitt i bilden, modellens kontext. Resten av sidan tonas bort.
- **Svaret** skrivs fram ord för ord ovanför fönstret, och hänvisningarna kopplas på som trådar från fotnoten till sidan i stjärnfältet.
- **Kontrollen:** besökaren drar i en tråd (klickar på fotnoten). Kameran åker till källan, påståendet läggs intill källtexten, och man ser om det står där.

## Berättelsens steg

Nio scrollsteg (0 till 8), ett per lärandemål. Steg som bygger på riktiga beräkningar i webbläsaren är markerade.

| Steg | Vad besökaren ser och gör | Vad hen ska förstå | Data |
| --- | --- | --- | --- |
| 0. Svaret som bara kommer | Sökruta med färdigt svar och fotnötter. Löses upp vid scroll. | Bilden döljer stegen. | Inspelat |
| 1. Din fråga | Väljer en fråga (eller skriver en egen, se öppna frågor). | Allt börjar med en fråga. | – |
| 2. Omformuleringen | Frågan delas i flera sökfrågor. | Tjänsten söker på något annat än det du skrev. | Inspelat |
| 3. Träffarna | Textbitar rankas efter närhet till sökfrågan i ett betydelserum. | Rankning är närhet i betydelse, inte sanning. | **Live** i webbläsaren, förberäknad reserv |
| 4. Den lurande träffen | En föråldrad, satirisk eller reklamdriven sida hamnar högt. | Det som rankas högt är inte alltid rätt. | **Live** (samma rankning), handgjort korpus |
| 5. Utdragen | Sidor klipps i bitar och bara några kommer med. | Modellen ser fragment, inte hela sidor. | Handgjort korpus |
| 6. Svaret | Svaret skrivs fram, med länk till *Inuti AI-hjärnan*. | Texten skrivs med sannolikhet och kan gå utöver källan. | Inspelat |
| 7. Hänvisningen som inte stämmer | Besökaren drar i en källtråd och ser att påståendet inte står där. | En källhänvisning är inte ett bevis. | Inspelat |
| 8. Vad gör du? | Tre kontrollfrågor, och länk till AI-Folkbildaren. | Hur man kontrollerar. | – |

## Teknik

- **Stack:** Vite och Three.js, scrollstyrd kamera, Transformers.js i en Web Worker med WebAssembly. Samma upplägg som hjärnprojektet, men hjärnprojektet använder `onnxruntime-web` och `@huggingface/tokenizers` direkt. Här räcker Transformers.js, eftersom inbäddning är ett vanligt användningsfall för det.
- **Modell (vald i spiken 2026-11-16):** `Xenova/paraphrase-multilingual-MiniLM-L12-v2` som int8-ONNX, 118 MB plus 17 MB tokeniserare. Jämförd med `Xenova/multilingual-e5-small` (lika stor och lika snabb, rankar lika rätt, men dess likhetstal ligger hopträngda mellan 0,67 och 0,91, medan MiniLM sprider dem mellan −0,2 och 0,8, vilket syns bättre i bilden). Svensk-specifika modeller som KBLab:s sentence-bert saknar färdig ONNX-export. Uppmätt: cirka 10 ms per text i Node, 1,2–1,7 s för 23 texter i webbläsaren (WebAssembly, 4 trådar, ingen WebGPU). Korpuset ska därför bäddas in en gång när modellen startat, och bara frågan räknas om när besökaren ändrar den.
- **ONNX Runtimes WebAssembly-filer** serveras från sidan själv (`scripts/copy-ort.mjs`, körs efter `npm install`), inte från jsDelivr. Sidhuvudena i `vite.config.js` och `vercel.json` ger flera trådar.
- **Modellfilerna** hämtas från Hugging Face (Xenovas konto) och sparas i webbläsarens cache. Under utveckling går det att köra med lokala filer, se `src/sok/config.js`.
- **Korpuset** är handskrivet, litet (ett tjugotal textbitar) och ligger i `public/data/korpus.json`. Det ska innehålla rätt svar, föråldrade sidor, satir och reklam för varje exempelfråga. Textbitarnas vektorer förberäknas också (samma modell, i Node) så att steg 3 fungerar utan modellen.
- **Steg 2, 6 och 7 är förinspelade.** Verkliga körningar i en AI-söktjänst sparas som JSON med datum. Sidan säger öppet att de är inspelade. Besökaren ska inte kunna tro att allt körs live. Inspelningen måste göras av Vidar eller i en miljö med tillgång till tjänsten, se `PROGRESS.md`.
- **Förenklingen redovisas.** Kommersiella tjänster gör stegen olika och redovisar inte allt. Sidan visar en generisk förenklad kedja och säger det tydligt. Ingen enskild tjänst pekas ut.
- **Robusthet:** sidan fungerar utan modellen. På mobil och svaga datorer visas bara de förberäknade exemplen.

## Krav (samma som i hjärnprojektet)

- Varje steg har en fällbar ruta, "Så här är det egentligen".
- Inget förmänskligande språk: "räknar fram", "hämtar", "ger hög sannolikhet", aldrig "förstår", "tänker", "vet".
- Lärandemålen får inte förenklas till "AI hittar alltid på". Steg 7 ska också säga att hänvisningar ofta stämmer men att det är det man ska kontrollera.
- WCAG 2.1 AA, tangentbordsnavigering, textbeskrivning per steg och ett lugnt läge vid minskad rörelse.
- Fakta i rutorna granskas av en fristående AI-session som inte har byggt sidan, och helst också av en människa.
- Licens: CC BY 4.0 för texterna och MIT för koden.

## Arbetsordning

Det svåra och visuellt avgörande först, texterna sist.

1. **Teknisk spik (Fable).** Klar 2026-11-16. Se `spik.html` och `scripts/jamfor_modeller.mjs`.
2. **Förinspelad data (Fable).** Verkliga körningar för två eller tre svenska exempelfrågor, sparade som JSON med datum. Kräver tillgång till en AI-söktjänst, se öppna frågor.
3. **Partikelskelett och scroll (Fable).** Återanvänd hjärnprojektets `stage.js`, `shapes.js`, scrollkoden i `main.js` och `style.css`. Texterna är platshållare.
4. **Koppla in steg 3 på riktigt (Fable).**
5. **Texter och rutor (Opus).**
6. **Finputs (Opus):** mobil, tillgänglighet, prestanda.
7. **Granskning (fristående session).**
8. **Publicering på Vercel,** och länk från aifolkbildaren.se.

Uppdatera `PROGRESS.md` och committa efter varje steg.

## Öppna frågor

- [ ] Fri fråga eller förvalda frågor? En fri fråga kräver att korpuset räcker. Förvalda frågor är säkrare för en dragning. Förslag: förvalda frågor i grunden, och en fri fråga som bara rankar samma korpus (med en tydlig notis om att korpuset är litet och handgjort).
- [ ] Ska steg 8 ta in Vidars lekmannastrategier för verifiering? De hänger ihop med hans planerade uppdragsgenerator.
- [ ] Namn och adress: *Inuti AI-sökningen*, och var ska den ligga i förhållande till *Inuti AI-hjärnan*?
- [ ] Vilka exempelfrågor? Svenska, gärna lokala, med ett svar som kan ha ändrats nyligen. Spikens provkorpus använder Västervik: bibliotekets öppettider, kommunalskatten och tåget på Tjustbanen. Textbitarna där är påhittade och måste bytas mot riktiga, daterade utdrag.
- [ ] Hur spelas steg 2, 6 och 7 in? Byggmiljön når inte AI-söktjänsterna. Vidar kör frågorna själv och sparar svaren, eller så får en miljö tillgång till en tjänst med öppet API.
