# Infermieri per le famiglie

Mette in contatto le famiglie associate con infermieri iscritti all'albo e assicurati.
**L'associazione fa da ponte, a mano.** Il sistema fa il lavoro noioso: verifiche, scadenze, ricerca dell'infermiere adatto e numeri del servizio.

## Come funziona

1. **L'infermiere si iscrive** dal modulo. L'associazione lo verifica una volta sola (10 minuti, vedi sotto).
2. **La famiglia compila "Chiedi un infermiere"** (1 minuto, anche dal telefono): comune, prestazione, scuola o casa, orari.
3. **All'associazione arriva un'email con la richiesta e con i contatti degli infermieri adatti**, già verificati e attivi, i più adatti per primi.
4. **Un volontario chiama la famiglia** (o le scrive su WhatsApp) e le passa 1-3 contatti. Poi segna l'esito nel foglio *Richieste* e cancella l'email.

La famiglia non riceve i contatti in automatico, per scelta: il volontario controlla che sia una famiglia associata e la consiglia.
Le richieste fatte a voce si gestiscono dal foglio *Cerca*: si scelgono comune, prestazione e luogo, e i risultati compaiono da soli.

## Il lavoro del volontario

Una persona di riferimento, circa un'ora a settimana.

| Quando | Cosa |
|---|---|
| Arriva l'email "Nuova adesione da verificare" | Verifica albo e polizza, spunta le due caselle, stato **Attivo** |
| Arriva l'email "Richiesta infermiere R-…" | Chiama la famiglia, passa i contatti, nel foglio *Richieste* cambia l'**Esito**, cancella l'email |
| Ogni mattina, solo se c'è qualcosa da fare | Riepilogo: richieste ferme da 3 giorni, profili sospesi, rinnovi richiesti |
| Una volta al mese | Menu **Progetto Vera → Numeri del servizio**: richieste arrivate, abbinate, in quanti giorni, senza infermiere |

Il resto è automatico:
- avviso all'infermiere 30 giorni prima che scada la polizza RC;
- sospensione se la polizza è scaduta;
- dopo un anno, richiesta di confermare i dati, promemoria dopo 20 giorni e sospensione se non conferma entro 30.

**Se "Senza infermiere disponibile" cresce, il problema non è lo strumento: mancano infermieri in quella zona.**
Il foglio *Richieste* mostra la zona: lì va concentrato il reclutamento (OPI Verona, cooperative, passaparola).

## Regole di sicurezza già dentro lo strumento

- **Attivazione:** un profilo si attiva solo con **Verifica albo OK**, **Verifica RC OK** e polizza in corso. Se manca qualcosa, il foglio annulla il cambio di stato.
- **Controllo continuo:** profili scaduti o sospesi spariscono subito dalle email, dal foglio *Cerca* e dall'area con codice, anche se l'automatismo del mattino non è partito.
- **Foglio *Richieste* anonimo:** niente nomi, telefoni o note, e solo la zona invece del comune. Nell'oggetto delle email non compare la prestazione.
- **Consenso esplicito:** la famiglia lo dà per un dato che riguarda la salute del bambino. Non si chiedono mai né il nome del bambino né la diagnosi.
- **Funzioni bloccate:** dal browser nessuno può avviare le funzioni di amministrazione o leggere il foglio.
- **Modulo protetto:**
  - un campo nascosto ferma i programmi automatici;
  - c'è un limite di iscrizioni e di richieste all'ora;
  - i testi inviati non diventano mai formule nel foglio.

## Installazione (una volta, circa 20 minuti)

Fai tutto con l'account Google **dell'associazione** (progettoveraeisuoiamici@gmail.com), non con un account personale.

1. Crea un nuovo Foglio Google e chiamalo per esempio "Infermieri per le famiglie – RISERVATO".
   **Non condividerlo mai con "chiunque abbia il link"**: aggiungi solo i volontari che se ne occupano.
2. Nel foglio apri **Estensioni → Apps Script**.
3. In **Impostazioni progetto** (ingranaggio) spunta "Mostra il file manifest appsscript.json". Poi torna all'**Editor**.
4. Crea questi file e copia in ognuno il contenuto del file omonimo di questa cartella:
   - **Script** (pulsante + → Script): `Config`, `Logica`, `Codice`. Il file `Codice.gs` già presente va svuotato e riempito.
   - **HTML** (pulsante + → HTML): `Stile`, `Richiesta`, `Adesione`, `Rinnovo`, `Informativa`, `Famiglie`.
   - `appsscript.json`: sostituisci tutto il contenuto.
5. Salva, torna al foglio e ricarica. Compare il menu **Progetto Vera**: scegli **Installazione (solo la prima volta)**.
   Google mostra "App non verificata": è normale per uno script fatto da voi.
   Clicca **Avanzate → Vai a … (non sicura)** e poi **Consenti**.
6. In Apps Script: **Esegui il deployment → Nuovo deployment →** tipo **App web**.
   Imposta "Esegui come": **Me** e "Chi ha accesso": **Chiunque**. Poi clicca **Esegui il deployment** e copia l'indirizzo che finisce con `/exec`.
7. Sul sito apri `/admin` → **Impostazioni** e incolla l'indirizzo nel campo "Area Infermieri per le famiglie".
   La sezione compare sul sito con i due pulsanti "Iscriviti" e "Chiedi un infermiere".
8. **Prova completa, prima di dirlo a chiunque:**
   1. iscriviti con la tua email;
   2. verifica il profilo e mettilo **Attivo**;
   3. fai una richiesta per un comune che hai scelto;
   4. controlla che l'email arrivi con il tuo profilo dentro;
   5. chiudi la richiesta come "Annullata";
   6. cancella la riga di prova dal foglio *Infermieri*.

**Quando aggiorni il codice:** incolla i file nuovi, poi vai in **Esegui il deployment → Gestisci deployment → matita → Versione: Nuova versione**. L'indirizzo resta lo stesso.

## Verificare un infermiere

1. **Albo:** controlla nome, numero e provincia sull'albo dell'OPI indicato. Gli albi sono pubblici: se l'Ordine non ha una ricerca online, chiedi all'OPI.
   Chi si è cancellato dall'albo, anche se in pensione, **non** può essere attivato.
2. **Polizza RC:** chiedi per email una copia della polizza e controlla la data di scadenza.
   Scrivi nella *Nota interna* cosa hai visto (es. "polizza vista il 15/11, ok") e poi cancella l'allegato dalla posta.
3. Spunta **Verifica albo OK** e **Verifica RC OK**, poi metti lo stato su **Attivo**. L'infermiere riceve un'email.
   Se qualcosa non va, metti **Rifiutato** e scrivi il motivo nella nota: all'infermiere arriva un messaggio generico.

## Area famiglie con codice (facoltativa, spenta)

C'è anche una pagina (`…/exec?p=area`) in cui una famiglia con un codice personale cerca da sola gli infermieri.
**Non usatela per partire.** Ogni codice dato espone i contatti di tutti gli infermieri, e la DPIA diventa necessaria.
Accendetela solo se le richieste diventano troppe da gestire a mano (per esempio più di 5 a settimana): basta creare i codici dal menu.

## Test

```
node --test area-infermieri/test/*.test.js
```

I test eseguono `Codice.gs` in un ambiente Google simulato (`test/gas-finto.js`) e provano le pagine in Chromium, se Playwright è installato.
Coprono adesione, verifica, richiesta, foglio *Cerca*, scadenze, numeri del servizio e blocchi di sicurezza.
**Non sostituiscono la prova con un vero account Google (passo 8).**

## Da fare una volta per essere a posto

1. **Consulenza gratuita al CSV di Verona** (Centro Servizi Volontariato, offre consulenze agli enti del terzo settore). Fatevi rivedere:
   - l'informativa privacy, che ora è una bozza;
   - questo schema di funzionamento;
   - la domanda: con il modello manuale serve la DPIA?
2. **Delibera del direttivo:**
   - si attiva il servizio di contatto;
   - l'associazione non partecipa alla prestazione e non incassa nulla;
   - si nomina il volontario di riferimento.
   - Il presidente, genitore beneficiario, si astiene: va scritto nel verbale.
3. **Assicuratore dell'associazione:** chiedete se la polizza RC copre l'attività di messa in contatto.
4. **Foglio per le famiglie:** un infermiere esterno può entrare a scuola solo con l'autorizzazione del dirigente scolastico. Prima di pagare privatamente, chiedete alla ULSS 9 cosa copre già.
5. **I soldi non passano mai dall'associazione**, finché non c'è il fondo con regole scritte e approvate.
6. **Consigliato, non bloccante:** Google Workspace for Nonprofits, gratuito tramite TechSoup Italia, che include il contratto di trattamento dati di Google.
