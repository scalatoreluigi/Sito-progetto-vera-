# Sito – Progetto Vera e i suoi amici

Sito statico (HTML/CSS/JS, niente database, niente costi di hosting).
Tutti i testi stanno nei file `content/*.json` e si modificano dal pannello **/admin**, senza toccare il codice.

## 1. Mettere online il sito (una volta sola)
1. Su GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / root**.
2. Dopo un minuto il sito è su `https://scalatoreluigi.github.io/sito-progetto-vera-/`.
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

## Da completare prima di andare online
- [ ] IBAN corretto **di Progetto Vera** (non quello di Un Sorriso Solidale `…0875`, che compare negli articoli di giornale)
- [ ] Intestatario del conto e codice fiscale
- [ ] Email di contatto, link Facebook e Instagram
- [ ] Email PayPal
- [ ] Terapisti reali (nomi, foto con consenso), foto prodotti, loghi sponsor
- [ ] Sostituire i movimenti "ESEMPIO" in Trasparenza
- [ ] Privacy policy e cookie (il sito non usa cookie propri; PayPal sì, al momento del pagamento)
