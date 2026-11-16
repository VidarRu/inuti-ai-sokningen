# Inuti AI-sökningen – brief

Datum: 2026-11-16. Systerprojekt till *Inuti AI-hjärnan*.

## Läs först

Referensrepot för *Inuti AI-hjärnan* är `VidarRu/insidan-av-ai` på GitHub. Om det inte redan finns i sessionen, lägg till det (det är publikt) och klona det. Läs dess `CLAUDE.md`, `docs/PLAN.md` och `PROGRESS.md`, och titta på hur partikelsystemet, scrollskelettet och designspråket är gjorda. Återanvänd så mycket som går, i stället för att bygga om. Det nya projektet ska ligga i ett eget repo och inte i referensrepot.

## Syfte och målgrupp

En svensk webbsida man scrollar sig igenom. Den följer en enda fråga genom en AI-söktjänst, från att man skriver den till att svaret med källhänvisningar visas, och visar var det kan gå fel på vägen. Sidan är både utbildningsmaterial och ett portfolioprojekt för AI-Folkbildaren.

**Målgrupp:** bibliotekarier och deltagare i Vidars utbildningar om AI-assisterad informationssökning och källkritik. De har använt ChatGPT eller Perplexity men har inga tekniska förkunskaper. Sidan ska fungera som visningsmaterial på storbild i en dragning och som fristående sida man kan skicka vidare.

**Efter besöket ska besökaren kunna säga:**

1. En AI-söktjänst är en kedja av steg: frågan omformuleras, sidor hämtas, utdrag väljs ut och en text skrivs. Det är inte en modell som "googlar".
2. Tjänsten söker inte nödvändigtvis på det du skrev. Frågan omformuleras först.
3. Vilka sidor som hämtas avgörs av en rankning, inte av om sidorna har rätt.
4. Modellen får bara se utdrag ur sidorna, inte hela sidor.
5. Svaret skrivs med sannolikheter (hänvisa till *Inuti AI-hjärnan*), så texten kan gå utöver vad källan säger.
6. En källhänvisning intill ett påstående visar inte att påståendet står i källan.
7. Du kan kontrollera tre saker: att påståendet står i källan, vem som är avsändare och vad en annan sökväg ger.

## Den visuella idén

Samma partikelsystem som i *Inuti AI-hjärnan* byter form genom hela sidan. Använd samma mörka bakgrund, glödande partiklar och en accentfärg som följer besökarens egen fråga genom alla steg.

Förslag på formspråk (Fable får föreslå bättre):
- **Start:** den bild man brukar se, en sökruta som svarar tvärsäkert med fotnötter. Den löses upp vid scroll, och det visar att bilden döljer stegen.
- **Frågan** delas i flera sökfrågor som flyger åt olika håll.
- **Webben** är ett stjärnfält. Träffarna lyses upp efter rankning. Här kan galaxbilden från hjärnprojektet återanvändas, eftersom sökning efter betydelse är "närmaste grannar" i betydelserummet.
- **Utdragen** klipps ur sidorna och samlas i ett smalt fönster, modellens kontext.
- **Svaret** skrivs fram ord för ord, och hänvisningarna kopplas på som trådar till källorna.
- **Kontrollen:** besökaren drar själv i en tråd och ser om påståendet finns i källan.

## Berättelsens steg

Åtta scrollsteg, ett per lärandemål. Steg som bygger på riktiga beräkningar är markerade.

| Steg | Vad besökaren ser och gör | Vad hen ska förstå |
| --- | --- | --- |
| 0. Svaret som bara kommer | Sökruta med färdigt svar och fotnötter. Löses upp vid scroll. | Bilden döljer stegen. |
| 1. Din fråga | Skriver eller väljer en fråga, till exempel om något som ändrats nyligen. | Allt börjar med en fråga. |
| 2. Omformuleringen | Frågan delas i flera sökfrågor. | Tjänsten söker på något annat än det du skrev. |
| 3. Träffarna (riktig beräkning) | Små textbitar rankas efter närhet till frågan i ett betydelserum, med riktiga siffror från en liten modell i webbläsaren. | Rankning är närhet i betydelse, inte sanning. |
| 4. Den lurande träffen | En föråldrad, satirisk eller reklamdriven sida hamnar högt. | Det som rankas högt är inte alltid rätt. |
| 5. Utdragen | Sidor klipps i bitar och bara några kommer med. | Modellen ser fragment, inte hela sidor. |
| 6. Svaret | Svaret skrivs fram, med en länk till *Inuti AI-hjärnan* för hur nästa ord väljs. | Texten skrivs med sannolikhet och kan gå utöver källan. |
| 7. Hänvisningen som inte stämmer | Besökaren drar i en källtråd och ser att påståendet inte står där. | En källhänvisning är inte ett bevis. |
| 8. Vad gör du? | Tre kontrollfrågor att ta med sig, och länk till AI-Folkbildaren. | Hur man kontrollerar. |

## Teknik

- Statisk webbplats med Vite och Three.js, scrollstyrd animation och Transformers.js i en Web Worker. Samma stack som *Inuti AI-hjärnan*.
- **Steg 3 körs på riktigt:** en liten flerspråkig inbäddningsmodell rankar ett litet, handgjort svenskt textkorpus i webbläsaren. Modellval ska provas i den tekniska spiken (svenska ska fungera hyggligt, laddtiden ska vara rimlig).
- **Steg 2, 6 och 7 är förinspelade.** De bygger på verkliga körningar som sparas som data, med datum. Sidan ska säga öppet att de är inspelade. Besökaren ska inte kunna tro att allt körs live.
- **Förenklingen ska redovisas.** Kommersiella tjänster gör stegen olika och redovisar inte allt. Sidan visar en generisk förenklad kedja och ska säga det tydligt. Peka inte ut någon enskild tjänst som exempel på felen.
- **Robusthet:** sidan ska fungera utan att modellen laddats. På mobil och svaga bibliotekdatorer visas bara de förberäknade exemplen.

## Krav (samma som i hjärnprojektet)

- Varje steg har en fällbar ruta, "Så här är det egentligen".
- Inget förmänskligande språk: skriv "räknar fram", "hämtar" och "ger hög sannolikhet", aldrig "förstår", "tänker" eller "vet".
- Lärandemålen får inte förenklas till "AI hittar alltid på". Steg 7 ska också säga att hänvisningar ofta stämmer men att det är det man ska kontrollera.
- WCAG 2.1 AA, tangentbordsnavigering, textbeskrivning per steg och ett lugnt läge när besökaren valt minskad rörelse.
- Fakta i rutorna granskas av en fristående AI-session som inte har byggt sidan, och helst också av en människa.
- Licens: CC BY 4.0 för texterna och MIT för koden, som i hjärnprojektet.

## Arbetsordning

Fable-krediterna går ut, så det svåra och visuellt avgörande görs först och texterna sist.

1. **Teknisk spik (Fable):** få inbäddningsmodellen att rangordna korpuset i en enkel testsida. Ingen grafik ännu.
2. **Förinspelad data (Fable):** spela in verkliga körningar för två eller tre svenska exempelfrågor och spara dem som JSON med datum.
3. **Partikelskelett och scroll (Fable):** återanvänd hjärnprojektets system. Texterna är platshållare.
4. **Koppla in steg 3 på riktigt (Fable).**
5. **Texter och rutor (Opus).**
6. **Finputs (Opus):** mobil, tillgänglighet, prestanda.
7. **Granskning (fristående session).**
8. **Publicering på Vercel,** och länka från aifolkbildaren.se.

Uppdatera `PROGRESS.md` och committa efter varje steg, så att en ny session eller en annan modell kan fortsätta.

## Öppna frågor

- [ ] Fri fråga eller förvalda frågor? En fri fråga kräver att korpuset räcker. Förvalda frågor är säkrare för en dragning.
- [ ] Ska steg 8 ta in Vidars lekmannastrategier för verifiering? De hänger ihop med hans planerade uppdragsgenerator.
- [ ] Namn och adress: *Inuti AI-sökningen*, och var ska den ligga i förhållande till *Inuti AI-hjärnan*?
- [ ] Vilka exempelfrågor? De ska vara svenska och gärna lokala, och ha ett svar som kan ha ändrats nyligen så att steg 4 och 7 har något att visa.
