# Sito – Progetto Vera e i suoi amici

Sito statico (HTML/CSS/JS, niente database, niente costi di hosting).
Tutti i testi stanno nei file `content/*.json` e si modificano dal pannello **/admin**, senza toccare il codice.

## 1. Mettere online il sito (una volta sola)
1. Su GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
2. Dopo un minuto il sito è su `https://scalatoreluigi.github.io/Sito-progetto-vera-/`.
3. (Consigliato) compra un dominio tipo `progettovera.it` (~10 €/anno) e collegalo in Settings → Pages → Custom domain.

## 2. Gestire i contenuti
1. Vai su `https://<indirizzo-del-sito>/admin/`.
2. Accedi con GitHub (la prima volta: "Sign in with token" usando un *Personal access token* di GitHub con permesso "Contents: read and write" su questo repository).
3. Modifica la sezione che ti serve e premi **Salva**: il sito si aggiorna da solo in 1–2 minuti.

Sezioni del pannello:
| Sezione | Cosa ci metti |
|---|---|
| ⚙️ Impostazioni | email, telefono, link Facebook/Instagram, **IBAN**, email PayPal, 5×1000 |
| 👨‍👩‍👧 Chi siamo | storia, numeri, associazioni amiche |
| 🩺 Terapie e terapisti | descrizione terapie, schede dei terapisti con foto |
| 📊 Trasparenza | ogni entrata/uscita: i totali e la barra si calcolano da soli |
| 🤝 Sponsor | logo, link, livello (oro/argento/bronzo: l'ordine è automatico) |
| 🛍️ Shop | prodotti, prezzo, foto, varianti (taglie), disponibile/esaurito |

## 3. PayPal
Basta inserire in Impostazioni l'**email del conto PayPal** (meglio un conto Business intestato all'associazione).
Finché è vuota, i pulsanti mostrano un avviso invece di pagare. Ogni ordine ti arriva via email da PayPal con nome, indirizzo e prodotto.

## Area "Infermieri per le famiglie"
È nella cartella `area-infermieri/`. Funziona con un Foglio Google privato e Google Apps Script, perché i dati non possono stare in questo repository pubblico.
Le famiglie chiedono un infermiere con un modulo, l'associazione riceve un'email con i contatti adatti e richiama. Installazione e uso: `area-infermieri/LEGGIMI.md`. Finché nel pannello non inserisci l'indirizzo dell'area, la sezione resta nascosta sul sito.

## Dati ufficiali (fonte: RUNTS, verificati il 26/10/2026)
- Denominazione: Associazione Progetto Vera e i suoi amici E.T.S. – sezione "Altri enti del Terzo Settore", ente non commerciale
- C.F. e P.IVA 05163990236 – repertorio RUNTS n. 166318 – iscritta dal 15/05/2026 – accreditata al 5×1000
- Sede: Via Tiro a Segno 9, 37013 Caprino Veronese (VR) – PEC associazioneprogettovera@pec.it
- Direttivo (nomina 19/11/2025): Simone Scala (presidente), Mariateresa Burato (vicepresidente), Nicola Cobelli
- Instagram: @progetto_vera

## Privacy e foto
Foto di terapisti e della galleria compaiono **solo** se nel pannello è spuntata la casella del consenso scritto.
Le ricevute in Trasparenza vanno oscurate (nomi, diagnosi) prima del caricamento.

## Da completare prima di andare online
- [x] IBAN, email, Facebook, PayPal inseriti (26/10/2026)
- [ ] Terapisti reali, foto prodotti, loghi sponsor
- [ ] Sostituire i movimenti "ESEMPIO" in Trasparenza
- [ ] Privacy policy (dati dei donatori e degli ordini)
