# Status

Senast uppdaterad 2026-11-17 (steg 3, partikelskelettet, klart).

## Klart

- **Projektet är uppsatt** (2026-11-16): Vite, Three.js och Transformers.js installerade. `CLAUDE.md`, `docs/PLAN.md` och den här filen. Vidars brief ligger oförändrad i `docs/BRIEF.md`. Referensrepot `VidarRu/insidan-av-ai` är läst: partikelsystemet (`src/scene/stage.js`, `shapes.js`), scrollskelettet (`src/main.js`) och designspråket (`src/style.css`) ska återanvändas i steg 3.
- **Steg 1, teknisk spik.** En flerspråkig inbäddningsmodell rankar ett svenskt provkorpus i webbläsaren. Testsidan är `/spik.html` (ingen grafik).
  - **Modellval:** `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, int8-ONNX (118 MB + 17 MB tokeniserare). Jämförd mot `Xenova/multilingual-e5-small` med `scripts/jamfor_modeller.mjs` på 22 textbitar och 6 frågor. Båda gav rätt första träff på 6 av 6 frågor och räknade på cirka 5–10 ms per text i Node. MiniLM valdes för att dess likhetstal sprids mer (−0,18 till 0,78 mellan slumpvisa par, mot 0,67 till 0,91 för e5), vilket gör rankningen synlig i bilden. KBLab:s svenska sentence-bert har ingen färdig ONNX-export och valdes bort.
  - **I webbläsaren** (Chromium utan grafikkort, WebAssembly med 4 trådar): modellen startade på 5,0 s från lokala filer, och 22 textbitar plus frågan bäddades in och rankades på 1,2–1,7 s. Likhetstalen stämmer med Node-körningen på andra decimalen. Slutsats för steg 4: bädda in korpuset en gång när modellen startat, och räkna bara om frågan när den ändras.
  - **Spiken visar redan lärandemål 3 och 4:** för frågan "Hur hög är kommunalskatten i Västervik?" rankas en påhittad sida från 2015 högst (0,73) före beslutet från i år (0,41), och för bibliotekets öppettider rankas den engelska sidan högst. Rankningen följer betydelsen, inte datumet, språket eller sanningen.
  - **Teknik:** worker och klient i `src/sok/`. ONNX Runtimes wasm-filer kopieras till `public/ort/` av `scripts/copy-ort.mjs` (efter `npm install`), så att inget hämtas från jsDelivr. Två fallgropar som är lösta: Node's `fetch` går inte genom byggmiljöns proxy (modellfilerna hämtas med curl till `.cache/hf/`), och Transformers.js hoppar över lokala filer om `env.localModelPath` är en hel adress i stället för en sökväg.

- **Mall för inspelningar** (2026-11-16): `docs/INSPELNING.md` beskriver hur Vidar spelar in en körning. Ifyllda mallar läggs i `inspelningar/`, och `scripts/inspelning_till_json.mjs` gör om dem till `public/data/inspelningar.json` (provkört på ett påhittat exempel, sedan borttaget). Skriptet varnar om meningen vid en hänvisning inte finns ordagrant i svaret.

- **Steg 3, partikelskelett och scroll** (2026-11-17). Hela sidan går att scrolla igenom, nio scener (0–8), med platshållartexter märkta [Platshållare]. Hjärnprojektets system är återanvänt: shadern, kamerablandningen, vridningen (dra, piltangenter, dubbelklick), helskärm, paus, etiketter i 3D, stegprickarna, undertexterna och listen. 24 000 partiklar (hjärnan har 64 000, här finns ingen bit-per-partikel att motivera fler).
  - **Formerna** (`src/scene/shapes.js`): fält (scen 0, bakom den påhittade sökrutan som löses upp vid scroll), klot (1, frågan står mitt i), fyra strängar (2, en sökfråga vid varje spets), stjärnfält (3–4, sidorna på sina PCA-platser, frågan orange, träffarna vita med linjer och likhetstal), fönster (5, utdragen flyger in i takt med scrollen), ström (6, svaret skrivs ord för ord med fotnötter), stjärnfältet på håll (7–8, orange trådar från svaret till källorna, dra i en tråd så åker kameran dit och påståendet läggs intill källtexten med domen "står i källan / står inte / delvis").
  - **Datan**: `scripts/forberakna_korpus.mjs` räknar korpusets vektorer, likheterna och 3D-platserna med samma modell i Node → `public/data/korpus_forberaknat.json` (94 kB). Sidan visar detta utan modellen. `public/data/inspelningar.json` läses om den finns; annars byggs tydligt märkta platshållare för sökfrågor, svar och kontroll.
  - **Provat** i Chromium utan grafikkort, 1280 × 720 och iPhone-bredd: alla scener, inga fel i konsolen. Inte provat: riktig dator med grafikkort, skärmläsare, minskad rörelse.
  - **Kända brister** (finputs, steg 6): etiketterna i stjärnfältet går utanför kanten på mobil; scen 0:s fält är dämpat; den egna frågan är avstängd tills modellen är inkopplad; i scen 7 kopplas en inspelnings hänvisningar till de högst rankade sidorna i ordning, inte till rätt sida via adressen (görs när inspelningarna finns).

## Nästa steg

1. **Steg 2, lägg in Vidars inspelningar.** Vidar har gjort dem (2026-11-17) men de är inte inlagda. Fyll i `inspelningar/*.txt` enligt `docs/INSPELNING.md`, kör `node scripts/inspelning_till_json.mjs`. Byt sedan korpusets platshållartexter mot utdragen ur inspelningarna (lägg till fälten `url`, `fetched` och `lure: true` på de lurande), kör `node scripts/forberakna_korpus.mjs` igen, och koppla hänvisningarna i scen 7 till rätt sida via adressen (`buildAnswer` i `src/main.js`). Scen 0:s påhittade svar byts mot det inspelade.
2. **Steg 4, koppla in modellen.** Workern och klienten finns (`src/sok/`). Att göra i `src/main.js`: knappen "Starta modellen", bädda in korpuset en gång (eller använd `vectors` i det förberäknade), ranka en egen fråga live, lägg frågans punkt med PCA-komponenterna (spara `mean` och `comps` i det förberäknade), och visa "räknas i din webbläsare" i stället för "förberäknat". På mobil: bara förberäknat.
3. **Steg 5, texter** (alla [Platshållare]) och **steg 6, finputs**.

## Beslut

- **Fyra exempelfrågor** (Vidar, 2026-11-16): julöppettider på Västerviks stadsbibliotek, bästa appen för gratis e-böcker, regler för elsparkcyklar, och i reserv månadskort på bussen i Kalmar län. Motiven står i `docs/PLAN.md`. Spikens korpus (`public/data/korpus.json`) har nu dessa fyra frågor och platshållartexter; MiniLM rankar rätt bit först på alla fyra, och fjolårets jultider rankas före årets vanliga tider (0,76 mot 0,68).

- Modell: `Xenova/paraphrase-multilingual-MiniLM-L12-v2` int8 (se ovan). Går att byta i `src/sok/config.js`.
- WebGPU används inte. Modellen är liten nog för WebAssembly, och det sparar en felkälla.
- Transformers.js används som helhet (till skillnad från hjärnprojektet), eftersom inbäddning är ett vanligt fall för det och koden blir kort.

## Öppna frågor

- **Inspelningen av steg 2, 6 och 7.** Vem kör frågorna i en AI-söktjänst och hur sparas svaren? Sidan får inte peka ut tjänsten.
- **Fri fråga eller förvalda.** Se `docs/PLAN.md`.
- **Likhetstalen i bilden.** MiniLM ger ibland negativa tal för orelaterade par. Ska bilden visa talet rakt av, eller en skala från 0 till 1?
- **Laddtiden.** 135 MB första gången. Hjärnprojektet laddar 259 MB, så det är en förbättring, men på en bibliotekdator kan det ändå ta en minut. Förberäknade vektorer gör att sidan fungerar under tiden.
- Från briefen: namn och adress, steg 8 och lekmannastrategierna.

## Bra att veta för nästa session

- Molnmiljön heter `inuti-ai-sokningen` och når Hugging Face (samma värdar som hjärnprojektets miljö). Node's `fetch` går inte genom proxyn, så modellfiler till Node-skript hämtas med curl till `.cache/hf/` (se `scripts/jamfor_modeller.mjs`).
- Starta med `npm install` och `npm run dev`, öppna `/spik.html`. Sidan hämtar modellen från Hugging Face. Lokala filer: lägg dem i `public/models/Xenova/paraphrase-multilingual-MiniLM-L12-v2/` (config.json, tokenizer.json, tokenizer_config.json, onnx/model_quantized.onnx) och skriv `VITE_MODEL_BASE=/models/` i `.env.local`.
- Playwright finns förinstallerat i byggmiljön (`/opt/node-tools/node_modules/playwright`). Testskriptet från spiken: ladda `/spik.html`, vänta på `window.__ranked`, läs `#status` och `#out`.
- Referensrepot klonas med `git clone --depth 1 https://github.com/VidarRu/insidan-av-ai`.
