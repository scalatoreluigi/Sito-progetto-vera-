# Sito – Progetto Vera e i suoi amici

Sito statico (HTML/CSS/JS, niente database, niente costi di hosting).
Tutti i testi stanno nei file `content/*.json` e si modificano dal pannello **/admin**, senza toccare il codice.

## 1. Mettere online il sito su progettoveraeisuoiamici.it (una volta sola)
Il sito è servito da GitHub Pages; il dominio (registrato su OVH) punta lì. L'hosting OVH resta per la posta del dominio.

**Su GitHub** (repository → Settings → Pages):
1. Source: *Deploy from a branch* → `main` / `/ (root)` → Save.
2. Custom domain: `progettoveraeisuoiamici.it` (già scritto nel file `CNAME`) → Save.
3. Quando il controllo DNS diventa verde, spunta **Enforce HTTPS**.

**Su OVH** (Web Cloud → Nomi di dominio → progettoveraeisuoiamici.it → Zona DNS):
- elimina i record `A` e `AAAA` di `progettoveraeisuoiamici.it` e di `www` che puntano all'hosting OVH (178.32.137.139 e 2001:41d0:301:11::29);
- aggiungi 4 record `A` per il dominio senza prefisso: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`;
- aggiungi `www` come `CNAME` verso `scalatoreluigi.github.io.` (con il punto finale);
- **non toccare** i record `MX` e `TXT` (servono alla posta).

Il cambio si propaga in qualche ora (al massimo 24-48).

## Sito in costruzione e sezioni da pubblicare
In **Impostazioni** del pannello:
- **"Il sito è in costruzione"** mostra l'avviso con i link a Instagram e Facebook;
- **"Sezioni pubblicate"** ha un interruttore per ogni sezione: i visitatori vedono solo quelle accese.

Per rivedere tutto prima di pubblicare, apri il sito con `?anteprima` alla fine dell'indirizzo (es. `https://progettoveraeisuoiamici.it/?anteprima`).
Le sezioni spente compaiono con un bordo tratteggiato. Non è una protezione: chi conosce il trucco le vede, quindi non metterci nulla di riservato.

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
