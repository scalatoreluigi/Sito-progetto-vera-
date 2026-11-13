# Infermieri per le famiglie

Mette in contatto le famiglie associate con infermieri iscritti all'albo e assicurati.
Copre i punti 1, 2 e 3 dell'ordine di sviluppo del brief: adesione con verifica, area riservata con ricerca, rinnovo annuale e sospensione automatica.
Il fondo donatori (punto 4) e il matching automatico (punto 5) non ci sono ancora.

## Perché non sta nel sito

Il sito è pubblico, e lo è anche questo repository: qualunque dato messo lì sarebbe visibile a tutti.
Per questo l'area infermieri gira su **Google Apps Script**, collegato a un **Foglio Google privato dell'associazione**:

- il foglio è il pannello di verifica: una riga per infermiere, con lo stato, le spunte di verifica e le note;
- le pagine (modulo di adesione, area famiglie, rinnovo, informativa) sono una web app servita da Google;
- le email (conferme, avvisi, rinnovi) partono dall'account dell'associazione;
- in questo repository c'è solo il codice. **Nessun dato di infermieri o famiglie deve mai finire qui.**

## Come funziona

| Chi | Cosa fa | Dove |
|---|---|---|
| Infermiere | Si iscrive: dati, albo OPI, comuni, prestazioni, orari, polizza RC, consensi | pagina `?p=adesione` |
| Associazione | Controlla albo e polizza, spunta **Verifica albo OK** e **Verifica RC OK**, mette lo stato su **Attivo** | foglio *Infermieri* |
| Associazione | Crea un codice per ogni famiglia associata | menu **Progetto Vera → Nuovo codice famiglia** |
| Famiglia | Entra con il codice e cerca per comune, prestazione, luogo, giorno e fascia oraria | pagina principale della web app |
| Sistema, ogni mattina alle 7 | Avvisa 30 giorni prima che la polizza RC scada; sospende chi ha la polizza scaduta; dopo un anno chiede la conferma dei dati, manda un promemoria dopo 20 giorni e sospende chi non conferma entro 30 | automatico |

Le regole di sicurezza sono queste:

- **Un profilo si attiva solo con entrambe le spunte di verifica e la polizza in corso.** Se manca qualcosa, il foglio rimette lo stato com'era e mostra cosa manca.
- **La ricerca ricontrolla tutto ogni volta.** Un profilo con la polizza scaduta sparisce anche se l'automatismo del mattino non è partito.
- **Le famiglie vedono solo i campi pubblici del profilo.** Note interne, verifiche e link di rinnovo restano nel foglio.
- **Le ricerche delle famiglie non vengono salvate.** Il sistema registra solo data e numero degli accessi di ogni codice: comune e prestazione cercati rivelerebbero dati sanitari del bambino.
- **Per le famiglie non si raccoglie nessun dato del bambino.** Nel foglio *Famiglie* ci sono solo il nome del referente e il codice.
- **Dal browser si possono chiamare solo le funzioni pubbliche.** Le funzioni di amministrazione si avviano solo dal menu del foglio o dagli automatismi.
- **Il modulo pubblico ha due difese.** Un campo nascosto ferma i programmi automatici e c'è un limite di 20 iscrizioni l'ora.
- **Il foglio non esegue mai come formula i testi inviati dal modulo.**

## Installazione (una volta, circa 20 minuti)

Fai tutto con l'account Google **dell'associazione** (progettoveraeisuoiamici@gmail.com), non con un account personale.

1. Crea un nuovo Foglio Google e chiamalo per esempio "Infermieri per le famiglie – RISERVATO".
   **Non condividerlo mai con "chiunque abbia il link"**: aggiungi solo i volontari che fanno le verifiche.
2. Nel foglio apri **Estensioni → Apps Script**.
3. In **Impostazioni progetto** (ingranaggio) spunta "Mostra il file manifest appsscript.json". Poi torna all'**Editor**.
4. Crea questi file e copia in ognuno il contenuto del file omonimo di questa cartella:
   - **Script** (pulsante + → Script): `Config`, `Logica`, `Codice`. Il file `Codice.gs` già presente va svuotato e riempito.
   - **HTML** (pulsante + → HTML): `Stile`, `Adesione`, `Famiglie`, `Rinnovo`, `Informativa`.
   - `appsscript.json`: sostituisci tutto il contenuto.
5. Salva, torna al foglio e ricarica la pagina. Compare il menu **Progetto Vera**: scegli **Installazione (solo la prima volta)**.
   Google chiede le autorizzazioni e mostra "App non verificata": è normale per uno script fatto da voi.
   Clicca **Avanzate → Vai a … (non sicura)** e poi **Consenti**.
6. In Apps Script: **Esegui il deployment → Nuovo deployment →** tipo **App web**.
   Imposta "Esegui come": **Me** e "Chi ha accesso": **Chiunque**. Poi clicca **Esegui il deployment** e copia l'indirizzo che finisce con `/exec`.
7. Sul sito apri `/admin` → **Impostazioni** e incolla l'indirizzo nel campo "Area Infermieri per le famiglie".
   La sezione compare sul sito.
8. Fai una prova completa: iscriviti con la tua email, verifica il profilo, crea un codice famiglia e cerca.
   Alla fine cancella la riga di prova.

**Quando aggiorni il codice:** incolla i file nuovi, poi vai in **Esegui il deployment → Gestisci deployment → matita → Versione: Nuova versione**. L'indirizzo resta lo stesso.

## Verificare un infermiere

1. **Albo:** controlla nome, numero e provincia sull'albo dell'OPI indicato. Gli albi sono pubblici: se l'Ordine non ha una ricerca online, chiedi all'OPI.
   Un infermiere in pensione che si è cancellato dall'albo **non** può essere attivato.
2. **Polizza RC:** chiedi per email una copia della polizza e controlla che la data di scadenza sia quella indicata nel modulo.
   Scrivi nella *Nota interna* cosa hai visto (es. "polizza vista il 15/11, scadenza ok") e poi cancella l'allegato dalla posta.
3. Spunta **Verifica albo OK** e **Verifica RC OK**, poi metti lo stato su **Attivo**. L'infermiere riceve un'email.
   Se qualcosa non va, metti **Rifiutato** e scrivi il motivo nella nota: all'infermiere arriva un messaggio generico.

Una famiglia lascia l'associazione o il suo codice gira dove non dovrebbe? Nel foglio *Famiglie* togli la spunta **Attivo**.
Un numero di accessi molto alto è un segnale che il codice è stato condiviso.

## Test

```
node --test area-infermieri/test/*.test.js
```

I test eseguono `Codice.gs` in un ambiente Google simulato (`test/gas-finto.js`) e provano le pagine in Chromium, se Playwright è installato.
Coprono iscrizione, verifica, ricerca, rinnovo, scadenze e i blocchi di sicurezza.
**Non sostituiscono la prova con un vero account Google (passo 8).**

## Cosa resta da fare (non è codice)

- **Informativa privacy:** la pagina `?p=informativa` è una bozza e lo dice in rosso. Va rivista da un consulente prima di aprire le iscrizioni.
- **DPIA:** serve una valutazione d'impatto prima di aprire l'area famiglie.
  Anche senza diagnosi, sapere che una famiglia cerca un infermiere per il cateterismo rivela un dato sanitario di un minore.
- **Account Google:** un account Gmail gratuito non dà un contratto di trattamento dati (DPA) adatto a dati di questo tipo.
  Valutate **Google Workspace for Nonprofits**, gratuito per gli enti verificati tramite TechSoup Italia: include il DPA di Google.
- **Limiti di Google su un account gratuito:** circa 100 email al giorno, e in cima alle pagine compare una scritta grigia di Google.
  Con i numeri attuali non sono un problema.
