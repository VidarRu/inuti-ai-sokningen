# Status

Senast uppdaterad 2026-11-16 (teknisk spik klar).

## Klart

- **Projektet är uppsatt** (2026-11-16): Vite, Three.js och Transformers.js installerade. `CLAUDE.md`, `docs/PLAN.md` och den här filen. Vidars brief ligger oförändrad i `docs/BRIEF.md`. Referensrepot `VidarRu/insidan-av-ai` är läst: partikelsystemet (`src/scene/stage.js`, `shapes.js`), scrollskelettet (`src/main.js`) och designspråket (`src/style.css`) ska återanvändas i steg 3.
- **Steg 1, teknisk spik.** En flerspråkig inbäddningsmodell rankar ett svenskt provkorpus i webbläsaren. Testsidan är `/spik.html` (ingen grafik).
  - **Modellval:** `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, int8-ONNX (118 MB + 17 MB tokeniserare). Jämförd mot `Xenova/multilingual-e5-small` med `scripts/jamfor_modeller.mjs` på 22 textbitar och 6 frågor. Båda gav rätt första träff på 6 av 6 frågor och räknade på cirka 5–10 ms per text i Node. MiniLM valdes för att dess likhetstal sprids mer (−0,18 till 0,78 mellan slumpvisa par, mot 0,67 till 0,91 för e5), vilket gör rankningen synlig i bilden. KBLab:s svenska sentence-bert har ingen färdig ONNX-export och valdes bort.
  - **I webbläsaren** (Chromium utan grafikkort, WebAssembly med 4 trådar): modellen startade på 5,0 s från lokala filer, och 22 textbitar plus frågan bäddades in och rankades på 1,2–1,7 s. Likhetstalen stämmer med Node-körningen på andra decimalen. Slutsats för steg 4: bädda in korpuset en gång när modellen startat, och räkna bara om frågan när den ändras.
  - **Spiken visar redan lärandemål 3 och 4:** för frågan "Hur hög är kommunalskatten i Västervik?" rankas en påhittad sida från 2015 högst (0,73) före beslutet från i år (0,41), och för bibliotekets öppettider rankas den engelska sidan högst. Rankningen följer betydelsen, inte datumet, språket eller sanningen.
  - **Teknik:** worker och klient i `src/sok/`. ONNX Runtimes wasm-filer kopieras till `public/ort/` av `scripts/copy-ort.mjs` (efter `npm install`), så att inget hämtas från jsDelivr. Två fallgropar som är lösta: Node's `fetch` går inte genom byggmiljöns proxy (modellfilerna hämtas med curl till `.cache/hf/`), och Transformers.js hoppar över lokala filer om `env.localModelPath` är en hel adress i stället för en sökväg.

- **Mall för inspelningar** (2026-11-16): `docs/INSPELNING.md` beskriver hur Vidar spelar in en körning. Ifyllda mallar läggs i `inspelningar/`, och `scripts/inspelning_till_json.mjs` gör om dem till `public/data/inspelningar.json` (provkört på ett påhittat exempel, sedan borttaget). Skriptet varnar om meningen vid en hänvisning inte finns ordagrant i svaret.

## Nästa steg

1. **Vidar spelar in de tre (fyra) frågorna** enligt `docs/INSPELNING.md`.
2. **Steg 2, förinspelad data.** Riktiga körningar i en AI-söktjänst för två eller tre frågor, sparade med datum i `public/data/`. Kan inte göras från byggmiljön (den når inte tjänsterna). Samtidigt: byt spikens påhittade textbitar mot riktiga, daterade utdrag, och förberäkna deras vektorer med samma modell i Node (`scripts/`), så att steg 3 fungerar utan modellen.
3. **Steg 3, partikelskelett och scroll.** Kopiera `stage.js`, `shapes.js`, scrollkoden och `style.css` från hjärnprojektet och byt ut formerna: sökruta som löses upp, frågan som delas, stjärnfält med sökfrågan och träffarna som grannar, kontextfönstret, svaret med trådar.
4. **Steg 4, koppla in modellen** i stjärnfältet.

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
