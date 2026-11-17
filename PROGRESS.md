# Status

Senast uppdaterad 2026-11-17 (steg 2, inspelningarna, inlagda).

## Klart

- **Projektet är uppsatt** (2026-11-16): Vite, Three.js och Transformers.js installerade. `CLAUDE.md`, `docs/PLAN.md` och den här filen. Vidars brief ligger oförändrad i `docs/BRIEF.md`. Referensrepot `VidarRu/insidan-av-ai` är läst: partikelsystemet (`src/scene/stage.js`, `shapes.js`), scrollskelettet (`src/main.js`) och designspråket (`src/style.css`) ska återanvändas i steg 3.
- **Steg 1, teknisk spik.** En flerspråkig inbäddningsmodell rankar ett svenskt provkorpus i webbläsaren. Testsidan är `/spik.html` (ingen grafik).
  - **Modellval:** `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, int8-ONNX (118 MB + 17 MB tokeniserare). Jämförd mot `Xenova/multilingual-e5-small` med `scripts/jamfor_modeller.mjs` på 22 textbitar och 6 frågor. Båda gav rätt första träff på 6 av 6 frågor och räknade på cirka 5–10 ms per text i Node. MiniLM valdes för att dess likhetstal sprids mer (−0,18 till 0,78 mellan slumpvisa par, mot 0,67 till 0,91 för e5), vilket gör rankningen synlig i bilden. KBLab:s svenska sentence-bert har ingen färdig ONNX-export och valdes bort.
  - **I webbläsaren** (Chromium utan grafikkort, WebAssembly med 4 trådar): modellen startade på 5,0 s från lokala filer, och 22 textbitar plus frågan bäddades in och rankades på 1,2–1,7 s. Likhetstalen stämmer med Node-körningen på andra decimalen. Slutsats för steg 4: bädda in korpuset en gång när modellen startat, och räkna bara om frågan när den ändras.
  - **Spiken visar redan lärandemål 3 och 4:** för frågan "Hur hög är kommunalskatten i Västervik?" rankas en påhittad sida från 2015 högst (0,73) före beslutet från i år (0,41), och för bibliotekets öppettider rankas den engelska sidan högst. Rankningen följer betydelsen, inte datumet, språket eller sanningen.
  - **Teknik:** worker och klient i `src/sok/`. ONNX Runtimes wasm-filer kopieras till `public/ort/` av `scripts/copy-ort.mjs` (efter `npm install`), så att inget hämtas från jsDelivr. Två fallgropar som är lösta: Node's `fetch` går inte genom byggmiljöns proxy (modellfilerna hämtas med curl till `.cache/hf/`), och Transformers.js hoppar över lokala filer om `env.localModelPath` är en hel adress i stället för en sökväg.

- **Mall för inspelningar** (2026-11-16): `docs/INSPELNING.md` beskriver hur en körning spelas in.

- **Steg 3, partikelskelett och scroll** (2026-11-17). Hela sidan går att scrolla igenom, nio scener (0–8), med platshållartexter märkta [Platshållare]. Hjärnprojektets system är återanvänt: shadern, kamerablandningen, vridningen (dra, piltangenter, dubbelklick), helskärm, paus, etiketter i 3D, stegprickarna, undertexterna och listen. 24 000 partiklar (hjärnan har 64 000, här finns ingen bit-per-partikel att motivera fler).
  - **Formerna** (`src/scene/shapes.js`): fält (scen 0, bakom den påhittade sökrutan som löses upp vid scroll), klot (1, frågan står mitt i), fyra strängar (2, en sökfråga vid varje spets), stjärnfält (3–4, sidorna på sina PCA-platser, frågan orange, träffarna vita med linjer och likhetstal), fönster (5, utdragen flyger in i takt med scrollen), ström (6, svaret skrivs ord för ord med fotnötter), stjärnfältet på håll (7–8, orange trådar från svaret till källorna, dra i en tråd så åker kameran dit och påståendet läggs intill källtexten med domen "står i källan / står inte / delvis").
  - **Datan**: `scripts/forberakna_korpus.mjs` räknar korpusets vektorer, likheterna och 3D-platserna med samma modell i Node → `public/data/korpus_forberaknat.json` (94 kB). Sidan visar detta utan modellen. `public/data/inspelningar.json` läses om den finns; annars byggs tydligt märkta platshållare för sökfrågor, svar och kontroll.
  - **Provat** i Chromium utan grafikkort, 1280 × 720 och iPhone-bredd: alla scener, inga fel i konsolen. Inte provat: riktig dator med grafikkort, skärmläsare, minskad rörelse.
  - **Kända brister** (finputs, steg 6): etiketterna i stjärnfältet går utanför kanten på mobil; på mobil ligger knappen Helskärm över överkanten av svarsrutan i steg 6; scen 0:s fält är dämpat; den egna frågan är avstängd tills modellen är inkopplad.

- **Steg 2, inspelningarna inlagda** (2026-11-17). Åtta körningar: de fyra frågorna i två AI-söktjänster, inspelade 2026-11-16 i Vidars webbläsare (inloggat, gratisversioner med webbsökning). På sidan heter de **Tjänst A** och **Tjänst B**; namnen finns bara i rådatan och kommer inte med i den publika JSON-filen.
  - **Rådata** `inspelningar/2026-11-16.md` (oförändrad), **kurering** `inspelningar/kurering.json` (vilken sida varje hänvisning går till, vilka meningar som är kontrollerade, med dom och notering ur KONTROLL). `scripts/inspelning_till_json.mjs` är omskrivet: det läser frågan, tiden, sökfrågorna och svaret ordagrant ur rådatan och stoppar om en kontrollerad mening inte står ordagrant i svaret eller om ett utdrag märkt ordagrant inte står i rådatan. Arbetsgången står i `docs/INSPELNING.md`.
  - **Korpuset** (`public/data/korpus.json`) har nu 11 riktiga utdrag med adress, datum och avsändare, och 8 handskrivna fyllnadstexter (märkta `kind: fyllnad`). Alla platshållare med påhittade siffror (busspriser, kommunalskatt, gamla öppettider) är borta. Lurande: fjolårets jultider (död länk, julen 2025) och en amerikansk topplista från 2021 för e-boksappar. Från kommersiella sidor finns bara korta citat (`rights: citat`).
  - **Förberäknat igen.** Rankningen med de riktiga utdragen: årets jultider 0,75, fjolårets 0,70 (alltså tvåa, inte etta som med platshållarna). E-böcker: datortidningens artikel 0,76, den amerikanska topplistan 0,48 (tvåa). Elsparkcyklar: tre myndighetssidor 0,56–0,59. Busskort: ordinarie priser och halveringen 0,69 båda.
  - **Sidan**: knappar för Tjänst A/B i steg 2, 6 och 7 (valet följer med när frågan byts). Steg 0 visar början av ett inspelat svar. Steg 2 visar de sökfrågor som visades och "visas inte" vid resten av strängarna. Steg 4 visar varför den lurande träffen lurar. Steg 5 visar adress och datum. Steg 6 visar svaret ordagrant med tabeller och listor, i en ruta som går att scrolla, och noteringar (t.ex. att ett stycke kom från kontots sparade uppgifter). Steg 7: en knapp per hänvisning; trådarna går till rätt sida via adressen, och kontrollen visar alla kontrollerade meningar vid hänvisningen med dom, notering och källtexten.
  - **Provat** i Chromium utan grafikkort, 1280 × 800 och iPhone 13: steg 0, 2, 4, 5, 6 och 7, fråga 1 och 4, båda tjänsterna. Inga fel i konsolen.

## Nästa steg

1. **Vidar kopierar citaten från de kommersiella sidorna** (två till fyra meningar var), enligt fältet `pending` i `public/data/korpus.json`: HP-sidans ingress och punkt 1 plus raden "Disclosure", och resten av PCforAllas stycke "Libris: Låna på biblioteket". Lägg in dem i `text`, ta bort `pending`, och kör `node scripts/forberakna_korpus.mjs` och `node scripts/inspelning_till_json.mjs`.
2. **Steg 4, koppla in modellen.** Workern och klienten finns (`src/sok/`). Att göra i `src/main.js`: knappen "Starta modellen", bädda in korpuset en gång (eller använd `vectors` i det förberäknade), ranka en egen fråga live, lägg frågans punkt med PCA-komponenterna (spara `mean` och `comps` i det förberäknade), och visa "räknas i din webbläsare" i stället för "förberäknat". På mobil: bara förberäknat.
3. **Steg 5, texter** (alla [Platshållare]) och **steg 6, finputs**.

## Beslut

- **Fyra exempelfrågor** (Vidar, 2026-11-16): julöppettider på Västerviks stadsbibliotek, bästa appen för gratis e-böcker, regler för elsparkcyklar, och månadskort på bussen i Kalmar län. Motiven står i `docs/PLAN.md`. Alla fyra är inspelade.
- **Två tjänster, Tjänst A och Tjänst B** (2026-11-17). Båda körningarna per fråga visas, och besökaren byter mellan dem. Felen fördelar sig på båda, och elsparkcykelfrågan i Tjänst B är exemplet där hänvisningarna stämmer i allt som kontrollerades.
- **Svaren visas ordagrant**, med hänvisningsmärkena som de stod (`[1]`, `[transportstyrelsen]`, `[play.google +1]`). Undantag: Tjänst B:s elsparkcykelsvar var för långt och spelades bara in som huvudpunkter; sidan säger att det är sammanfattat.

- Modell: `Xenova/paraphrase-multilingual-MiniLM-L12-v2` int8 (se ovan). Går att byta i `src/sok/config.js`.
- WebGPU används inte. Modellen är liten nog för WebAssembly, och det sparar en felkälla.
- Transformers.js används som helhet (till skillnad från hjärnprojektet), eftersom inbäddning är ett vanligt fall för det och koden blir kort.

## Öppna frågor

- **Lärandemål 2 stöds inte av inspelningarna.** Ingen omformulering syntes: Tjänst A visade i alla fyra frågorna en enda sökfråga, ordagrant samma som frågan (inget årtal för "nu"), och Tjänst B visade inga sökfrågor alls. Antingen sker omformuleringen dolt, eller så görs den inte i gratisläget. Vidar behöver välja: spela in i ett läge som visar sökfrågorna (till exempel ett djupsökningsläge), eller skriva om steg 2 till att man oftast inte kan se vad tjänsten söker på. Sidan visar i dag ärligt det som syntes, med "visas inte" vid de tomma strängarna, men undertexterna i steg 2 (platshållare) påstår fortfarande att frågan delas upp.
- **Elsparkcykelfrågan har ingen lurande träff** i korpuset. Inspelningarna gav ingen (en återförsäljare fanns i källistan men citerades inte och har ingen sparad text). Steg 4 säger då att ingen av de högst rankade sidorna är märkt som lurande. Behövs en, får den spelas in.
- **Busskortsfrågan:** om halveringen fortfarande gällde 2026-11-16 är inte kontrollerat. Kalmar länstrafiks prissida visade bara ordinarie priser.
- **Inloggat.** Personliga inställningar kan ha påverkat svaren; i fråga 4 tog Tjänst B in pendling Västervik–Kalmar från kontot. Sidan säger det vid svaret. Kanske värt en rad i "Så här är det egentligen", eller ett skäl att spela in utloggat nästa gång.
- **Fri fråga eller förvalda.** Se `docs/PLAN.md`.
- **Likhetstalen i bilden.** MiniLM ger ibland negativa tal för orelaterade par. Ska bilden visa talet rakt av, eller en skala från 0 till 1?
- **Laddtiden.** 135 MB första gången. Hjärnprojektet laddar 259 MB, så det är en förbättring, men på en bibliotekdator kan det ändå ta en minut. Förberäknade vektorer gör att sidan fungerar under tiden.
- Från briefen: namn och adress, steg 8 och lekmannastrategierna.

## Bra att veta för nästa session

- Molnmiljön heter `inuti-ai-sokningen` och når Hugging Face (samma värdar som hjärnprojektets miljö). Node's `fetch` går inte genom proxyn, så modellfiler till Node-skript hämtas med curl till `.cache/hf/` (se `scripts/jamfor_modeller.mjs`).
- Starta med `npm install` och `npm run dev`, öppna `/spik.html`. Sidan hämtar modellen från Hugging Face. Lokala filer: lägg dem i `public/models/Xenova/paraphrase-multilingual-MiniLM-L12-v2/` (config.json, tokenizer.json, tokenizer_config.json, onnx/model_quantized.onnx) och skriv `VITE_MODEL_BASE=/models/` i `.env.local`.
- Playwright finns förinstallerat i byggmiljön (`/opt/node-tools/node_modules/playwright`). Testskriptet från spiken: ladda `/spik.html`, vänta på `window.__ranked`, läs `#status` och `#out`.
- Referensrepot klonas med `git clone --depth 1 https://github.com/VidarRu/insidan-av-ai`.
