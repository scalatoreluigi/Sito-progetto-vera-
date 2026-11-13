// Collegamento tra le regole (Logica.gs), il foglio Google, le email e le pagine web.
// Le pagine: ?p=adesione (infermieri), ?p=rinnovo&t=... (conferma annuale), ?p=informativa, nessun parametro (famiglie).

// ---------- Pagine web ----------

function doGet(e) {
  const p = (e && e.parameter) || {};
  const pagine = { adesione: 'Adesione', rinnovo: 'Rinnovo', informativa: 'Informativa' };
  const t = HtmlService.createTemplateFromFile(pagine[p.p] || 'Famiglie');
  t.url = ScriptApp.getService().getUrl();
  t.token = String(p.t || '').replace(/[^a-f0-9-]/gi, '').slice(0, 40);
  t.ente = ENTE;
  t.clausola = CLAUSOLA_RUOLO;
  // Le liste arrivano già nella pagina; "<" è protetto perché finiscono dentro un tag <script>.
  t.opzioniJson = JSON.stringify(opzioni_()).replace(/</g, '\\u003c');
  return t.evaluate()
    .setTitle('Infermieri per le famiglie – ' + ENTE.nome)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(nome) {
  return HtmlService.createHtmlOutputFromFile(nome).getContent();
}

function opzioni_() {
  return { zone: leggiComuni_(), prestazioni: PRESTAZIONI, luoghi: LUOGHI, giorni: GIORNI, fasce: FASCE };
}

// ---------- Infermieri: adesione e rinnovo ----------

function inviaAdesione(dati) {
  // Campo nascosto: lo compilano solo i programmi automatici.
  if (dati && dati.sitoWeb) return { ok: true };
  if (!entroLimite_('adesioni', 20, 3600)) {
    return { ok: false, errori: [`Troppe iscrizioni in poco tempo. Riprova fra un'ora o scrivi a ${ENTE.email}.`] };
  }
  const oggi = oggiRoma_();
  const comuniValidi = [].concat(...leggiComuni_().map((z) => z.comuni));
  const { errori, record } = normalizzaAdesione(dati, comuniValidi, oggi);
  if (errori.length) return { ok: false, errori };

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const tab = tabellaInfermieri_();
    const doppio = tab.righe.find((r) =>
      String(r.rec.email).toLowerCase() === record.email ||
      (String(r.rec.numeroOpi) === record.numeroOpi && String(r.rec.provinciaOpi).toLowerCase() === record.provinciaOpi.toLowerCase()));
    if (doppio) {
      return { ok: false, errori: [`Risulti già iscritto. Per modificare i dati scrivi a ${ENTE.email}.`] };
    }
    Object.assign(record, {
      id: 'INF-' + Utilities.getUuid().slice(0, 8).toUpperCase(),
      dataIscrizione: new Date(),
      stato: STATI.attesa,
      verificaAlbo: false,
      verificaRc: false,
      token: Utilities.getUuid(),
    });
    tab.foglio.appendRow(tab.intestazioni.map((h) => valoreCella_(record[chiaveDi_(h)])));
    registra_('Nuova adesione', record.id, '');
  } finally {
    lock.releaseLock();
  }

  inviaEmail_(record.email, 'Abbiamo ricevuto la tua adesione',
    `Ciao ${record.nome},\n\ngrazie per esserti iscritto a "Infermieri per le famiglie".\n` +
    `Verificheremo l'iscrizione all'albo OPI e la polizza RC: ti scriveremo appena il profilo sarà attivo.\n\n` +
    `${CLAUSOLA_RUOLO}\n`);
  inviaEmail_(ENTE.email, `Nuova adesione da verificare: ${record.nome} ${record.cognome}`,
    `C'è una nuova adesione nel foglio "${FOGLI.infermieri}" (ID ${record.id}).\n` +
    `Controlla albo OPI (n. ${record.numeroOpi}, ${record.provinciaOpi}) e polizza RC, poi spunta le verifiche e cambia lo stato.\n\n` +
    SpreadsheetApp.getActive().getUrl());
  return { ok: true };
}

function datiRinnovo(token) {
  const r = trovaPerToken_(token);
  if (!r) return { ok: false };
  return { ok: true, nome: r.rec.nome, scadenzaRc: isoData_(r.rec.scadenzaRc), stato: r.rec.stato };
}

function inviaRinnovo(token, dati) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let r, esito;
  try {
    r = trovaPerToken_(token);
    if (!r) return { ok: false, errori: ['Link non valido o scaduto.'] };
    esito = applicaRinnovo(r.rec, dati, oggiRoma_());
    if (esito.errori.length) return { ok: false, errori: esito.errori };
    scriviCampi_(r.tab, r.riga, esito.modifiche);
    registra_(esito.evento, r.rec.id, '');
  } finally {
    lock.releaseLock();
  }
  if (esito.modifiche.stato === STATI.attesa) {
    inviaEmail_(ENTE.email, `Rinnovo da verificare: ${r.rec.nome} ${r.rec.cognome}`,
      `${r.rec.nome} ${r.rec.cognome} (${r.rec.id}) ha confermato i dati. Polizza RC nuova o profilo sospeso: ` +
      `controlla e rimetti lo stato su "${STATI.attivo}".\n\n${SpreadsheetApp.getActive().getUrl()}`);
  }
  return { ok: true, stato: esito.modifiche.stato || r.rec.stato };
}

// ---------- Famiglie: accesso con codice e ricerca ----------

function accediFamiglia(codice) {
  const fam = verificaFamiglia_(codice);
  if (!fam) return { ok: false };
  return { ok: true, opzioni: opzioni_() };
}

function cercaInfermieri(codice, filtri) {
  const fam = verificaFamiglia_(codice);
  if (!fam) return { ok: false };
  const f = filtri || {};
  const pulito = {
    comune: pulisci(f.comune, 60),
    prestazione: PRESTAZIONI.indexOf(f.prestazione) !== -1 ? f.prestazione : '',
    luogo: f.luogo === 'Scuola' || f.luogo === 'Domicilio' ? f.luogo : '',
    giorno: GIORNI.indexOf(f.giorno) !== -1 ? f.giorno : '',
    fascia: FASCE.indexOf(f.fascia) !== -1 ? f.fascia : '',
  };
  // Si registra solo l'accesso, non cosa si è cercato: la ricerca rivela bisogni sanitari del bambino.
  const fogli = SpreadsheetApp.getActive().getSheetByName(FOGLI.famiglie);
  const h = COLONNE_FAMIGLIE;
  fogli.getRange(fam.riga, h.indexOf('Ultimo accesso') + 1).setValue(new Date());
  fogli.getRange(fam.riga, h.indexOf('Accessi') + 1).setValue((Number(fam.valori[h.indexOf('Accessi')]) || 0) + 1);

  const elenco = tabellaInfermieri_().righe.map((r) => r.rec);
  const risultati = filtraInfermieri(elenco, pulito, oggiRoma_()).map(schedaPubblica);
  risultati.sort((a, b) => a.cognome.localeCompare(b.cognome, 'it'));
  return { ok: true, risultati };
}

function verificaFamiglia_(codice) {
  const c = normalizzaCodice(codice);
  if (!c) { Utilities.sleep(800); return null; }
  const foglio = SpreadsheetApp.getActive().getSheetByName(FOGLI.famiglie);
  const valori = foglio.getDataRange().getValues();
  const h = COLONNE_FAMIGLIE;
  for (let k = 1; k < valori.length; k++) {
    if (valori[k][h.indexOf('Codice')] === c && vero(valori[k][h.indexOf('Attivo')])) {
      return { riga: k + 1, valori: valori[k] };
    }
  }
  Utilities.sleep(800); // rallenta chi prova codici a caso
  return null;
}

// ---------- Pannello dell'associazione (dentro il foglio) ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Progetto Vera')
    .addItem('Nuovo codice famiglia', 'nuovoCodiceFamiglia')
    .addItem('Esegui ora i controlli giornalieri', 'controlliGiornalieri')
    .addItem('Mostra gli indirizzi delle pagine', 'mostraIndirizzi')
    .addSeparator()
    .addItem('Installazione (solo la prima volta)', 'installa')
    .addToUi();
}

function installa() {
  soloDalFoglio_();
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone('Europe/Rome');

  const inf = foglio_(ss, FOGLI.infermieri, Object.values(COLONNE));
  const col = (chiave) => Object.keys(COLONNE).indexOf(chiave) + 1;
  const righe = inf.getMaxRows() - 1;
  inf.getRange(2, col('stato'), righe).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(Object.values(STATI), true).setAllowInvalid(false).build());
  // Caselle come convalida, non con insertCheckboxes: quella scrive FALSO in ogni riga e appendRow
  // aggiungerebbe le nuove iscrizioni dopo la riga 1000.
  const casella = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  for (const c of ['verificaAlbo', 'verificaRc', 'consensoPrivacy', 'consensoContatti', 'dichiarazione']) {
    inf.getRange(2, col(c), righe).setDataValidation(casella);
  }
  for (const c of ['dataIscrizione', 'scadenzaRc', 'dataVerifica', 'scadenzaRinnovo', 'rinnovoRichiesto', 'avvisoRc']) {
    inf.getRange(2, col(c), righe).setNumberFormat('dd/mm/yyyy');
  }
  inf.hideColumns(col('token'));
  const colori = { [STATI.attesa]: '#fff3c4', [STATI.attivo]: '#d7f0dd', [STATI.rifiutato]: '#f3d6d6', [STATI.sospeso]: '#e3e3e3' };
  const area = inf.getRange(2, col('stato'), righe);
  inf.setConditionalFormatRules(Object.keys(colori).map((s) =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(colori[s]).setRanges([area]).build()));

  const fam = foglio_(ss, FOGLI.famiglie, COLONNE_FAMIGLIE);
  fam.getRange(2, COLONNE_FAMIGLIE.indexOf('Attivo') + 1, fam.getMaxRows() - 1).setDataValidation(casella);

  const com = foglio_(ss, FOGLI.comuni, ['Zona', 'Comune']);
  if (com.getLastRow() < 2) {
    const righeComuni = [];
    Object.keys(COMUNI_INIZIALI).forEach((z) => COMUNI_INIZIALI[z].forEach((c) => righeComuni.push([z, c])));
    com.getRange(2, 1, righeComuni.length, 2).setValues(righeComuni);
  }
  foglio_(ss, FOGLI.registro, COLONNE_REGISTRO);

  // Automatismi: controllo ogni mattina e reazione ai cambi di stato.
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('controlliGiornalieri').timeBased().everyDays(1).atHour(7).inTimezone('Europe/Rome').create();
  ScriptApp.newTrigger('alModificare').forSpreadsheet(ss).onEdit().create();

  SpreadsheetApp.getUi().alert('Installazione completata.\n\nOra pubblica le pagine: Esegui il deployment → Nuovo deployment → App web ' +
    '(Esegui come: Me; Chi ha accesso: Chiunque). Poi usa il menu "Mostra gli indirizzi delle pagine".');
}

function foglio_(ss, nome, intestazioni) {
  const f = ss.getSheetByName(nome) || ss.insertSheet(nome);
  if (f.getLastRow() === 0) {
    f.getRange(1, 1, 1, intestazioni.length).setValues([intestazioni]).setFontWeight('bold');
    f.setFrozenRows(1);
  }
  return f;
}

// Reagisce quando l'associazione cambia lo stato di un infermiere.
function alModificare(e) {
  const r = e.range;
  if (r.getSheet().getName() !== FOGLI.infermieri || r.getRow() < 2 || r.getNumRows() > 1) return;
  const tab = tabellaInfermieri_();
  if (tab.intestazioni[r.getColumn() - 1] !== COLONNE.stato) return;
  const riga = tab.righe.find((x) => x.riga === r.getRow());
  if (!riga) return;
  const rec = riga.rec;
  const nuovo = String(e.value || '');
  const oggi = oggiRoma_();
  const ui = SpreadsheetApp.getActive();

  if (nuovo === STATI.attivo) {
    const mancanze = bloccantiAttivazione(rec, oggi);
    if (mancanze.length) {
      r.setValue(e.oldValue || STATI.attesa);
      ui.toast('Non posso attivare il profilo: ' + mancanze.join('; ') + '.', 'Attivazione bloccata', 15);
      return;
    }
    const rinnovo = aData(rec.scadenzaRinnovo);
    scriviCampi_(tab, riga.riga, {
      dataVerifica: new Date(),
      verificatoDa: (e.user && e.user.getEmail()) || Session.getActiveUser().getEmail() || '',
      scadenzaRinnovo: rinnovo && rinnovo > oggi ? rinnovo : aggiungiAnni(oggi, REGOLE.anniValiditaProfilo),
      motivoSospensione: '',
    });
    inviaEmail_(rec.email, 'Il tuo profilo è attivo',
      `Ciao ${rec.nome},\n\nabbiamo verificato iscrizione all'albo e polizza RC: il tuo profilo ora è visibile alle famiglie associate.\n` +
      `Ogni anno ti chiederemo di confermare i dati. Se vuoi ritirarti prima, scrivi a ${ENTE.email}.\n\n${CLAUSOLA_RUOLO}\n`);
  } else if (nuovo === STATI.rifiutato) {
    inviaEmail_(rec.email, 'La tua adesione',
      `Ciao ${rec.nome},\n\nal momento non possiamo attivare il tuo profilo. Per informazioni scrivi a ${ENTE.email}.\n`);
  } else if (nuovo === STATI.sospeso && !rec.motivoSospensione) {
    scriviCampi_(tab, riga.riga, { motivoSospensione: "Sospeso dall'associazione" });
  }
  registra_('Stato: ' + (e.oldValue || '') + ' → ' + nuovo, rec.id, '');
}

function controlliGiornalieri(e) {
  if (!avviatoDaAutomatismo_(e)) soloDalFoglio_();
  const oggi = oggiRoma_();
  const tab = tabellaInfermieri_();
  const url = ScriptApp.getService().getUrl();
  const riepilogo = [];

  tab.righe.forEach(({ riga, rec }) => {
    const azione = azioneGiornaliera(rec, oggi);
    if (!azione) return;
    const link = `${url}?p=rinnovo&t=${rec.token}`;
    if (azione.tipo === 'sospendi') {
      scriviCampi_(tab, riga, { stato: STATI.sospeso, motivoSospensione: azione.motivo });
      inviaEmail_(rec.email, 'Il tuo profilo è sospeso',
        `Ciao ${rec.nome},\n\nil tuo profilo non è più visibile alle famiglie: ${azione.motivo.toLowerCase()}.\n` +
        `Per riattivarlo conferma i dati qui:\n${link}\n`);
      riepilogo.push(`Sospeso ${rec.nome} ${rec.cognome} (${rec.id}): ${azione.motivo}`);
    } else if (azione.tipo === 'richiediRinnovo' || azione.tipo === 'promemoriaRinnovo') {
      const promemoria = azione.tipo === 'promemoriaRinnovo';
      const limite = formatoData(aggiungiGiorni(aData(rec.scadenzaRinnovo), REGOLE.giorniTolleranzaRinnovo));
      if (!promemoria) scriviCampi_(tab, riga, { rinnovoRichiesto: oggi });
      inviaEmail_(rec.email, (promemoria ? 'Promemoria: ' : '') + 'conferma i tuoi dati per restare visibile alle famiglie',
        `Ciao ${rec.nome},\n\nè passato un anno: conferma disponibilità, iscrizione all'albo OPI e polizza RC entro il ${limite}.\n` +
        `Bastano due minuti:\n${link}\n\nSenza conferma il profilo verrà sospeso.\n`);
      riepilogo.push(`${promemoria ? 'Promemoria rinnovo' : 'Richiesto rinnovo'} a ${rec.nome} ${rec.cognome} (${rec.id})`);
    } else if (azione.tipo === 'avvisoRc') {
      scriviCampi_(tab, riga, { avvisoRc: oggi });
      inviaEmail_(rec.email, 'La tua polizza RC sta per scadere',
        `Ciao ${rec.nome},\n\nla polizza RC che ci hai indicato scade il ${formatoData(rec.scadenzaRc)}.\n` +
        `Quando la rinnovi aggiorna la data qui, altrimenti il profilo verrà sospeso:\n${link}\n`);
      riepilogo.push(`Avviso scadenza RC a ${rec.nome} ${rec.cognome} (${rec.id})`);
    }
    registra_(azione.tipo, rec.id, azione.motivo || '');
  });

  if (riepilogo.length) {
    inviaEmail_(ENTE.email, 'Infermieri per le famiglie: controlli di oggi', riepilogo.join('\n') + '\n\n' + SpreadsheetApp.getActive().getUrl());
  }
}

function nuovoCodiceFamiglia() {
  soloDalFoglio_();
  const ui = SpreadsheetApp.getUi();
  const risposta = ui.prompt('Nuovo codice famiglia',
    'Nome del referente (solo per riconoscerlo: niente nome del bambino né diagnosi):', ui.ButtonSet.OK_CANCEL);
  if (risposta.getSelectedButton() !== ui.Button.OK) return;
  const foglioFam = SpreadsheetApp.getActive().getSheetByName(FOGLI.famiglie);
  const esistenti = foglioFam.getDataRange().getValues().map((r) => r[0]);
  let codice;
  do { codice = codiceDaUuid(Utilities.getUuid()); } while (esistenti.indexOf(codice) !== -1);
  foglioFam.appendRow([valoreCella_(codice), sanifica(risposta.getResponseText(), 80), true, new Date(), '', 0, '']);
  registra_('Nuovo codice famiglia', codice.slice(0, 4) + '-…', '');
  ui.alert(`Codice per la famiglia:\n\n${codice}\n\nPagina di accesso:\n${ScriptApp.getService().getUrl()}\n\n` +
    'Consegnalo a mano o per messaggio privato. Per bloccarlo togli la spunta "Attivo".');
}

function mostraIndirizzi() {
  soloDalFoglio_();
  const url = ScriptApp.getService().getUrl();
  if (!url) {
    SpreadsheetApp.getUi().alert('Le pagine non sono ancora pubblicate: Esegui il deployment → Nuovo deployment → App web.');
    return;
  }
  SpreadsheetApp.getUi().alert(`Area famiglie:\n${url}\n\nAdesione infermieri:\n${url}?p=adesione\n\n` +
    'Copia l\'indirizzo dell\'area famiglie nel pannello del sito (Impostazioni → Area infermieri).');
}

// ---------- Utilità ----------

// Le funzioni pubbliche di una web app si possono richiamare dal browser di chiunque:
// quelle di amministrazione partono solo dal menu del foglio o da un automatismo installato.
function soloDalFoglio_() {
  SpreadsheetApp.getUi(); // fuori dal foglio (cioè dalla web app) genera un errore e si ferma tutto
}

function avviatoDaAutomatismo_(e) {
  if (!e || !e.triggerUid) return false;
  return ScriptApp.getProjectTriggers().some((t) => t.getUniqueId() === String(e.triggerUid));
}

// Limite di richieste per tutta la web app (es. 20 adesioni l'ora), contro chi invia moduli in massa.
function entroLimite_(chiave, massimo, secondi) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const n = Number(cache.get(chiave) || 0);
    if (n >= massimo) return false;
    cache.put(chiave, String(n + 1), secondi);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function oggiRoma_() {
  const s = Utilities.formatDate(new Date(), 'Europe/Rome', 'yyyy-MM-dd');
  return aData(s);
}

function isoData_(v) {
  const d = aData(v);
  return d ? Utilities.formatDate(d, 'Europe/Rome', 'yyyy-MM-dd') : '';
}

function chiaveDi_(intestazione) {
  return Object.keys(COLONNE).find((k) => COLONNE[k] === intestazione);
}

function valoreCella_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') return v;
  // Telefoni e numeri OPI restano testo: altrimenti il foglio li converte e toglie lo zero iniziale.
  return /^\d/.test(v) ? "'" + v : sanifica(v);
}

function tabellaInfermieri_() {
  const f = SpreadsheetApp.getActive().getSheetByName(FOGLI.infermieri);
  const valori = f.getDataRange().getValues();
  const intestazioni = valori[0].map(String);
  const righe = [];
  for (let k = 1; k < valori.length; k++) {
    if (!valori[k].some((x) => x !== '' && x !== false)) continue;
    const rec = {};
    intestazioni.forEach((h, c) => { const chiave = chiaveDi_(h); if (chiave) rec[chiave] = valori[k][c]; });
    righe.push({ riga: k + 1, rec });
  }
  return { foglio: f, intestazioni, righe };
}

function scriviCampi_(tab, riga, modifiche) {
  Object.keys(modifiche).forEach((chiave) => {
    const c = tab.intestazioni.indexOf(COLONNE[chiave]);
    if (c !== -1) tab.foglio.getRange(riga, c + 1).setValue(valoreCella_(modifiche[chiave]));
  });
}

function trovaPerToken_(token) {
  const t = String(token || '');
  if (t.length < 30) return null;
  const tab = tabellaInfermieri_();
  const r = tab.righe.find((x) => x.rec.token === t);
  return r ? { tab, riga: r.riga, rec: r.rec } : null;
}

function leggiComuni_() {
  const f = SpreadsheetApp.getActive().getSheetByName(FOGLI.comuni);
  const zone = {};
  f.getDataRange().getValues().slice(1).forEach(([zona, comune]) => {
    if (!zona || !comune) return;
    (zone[zona] = zone[zona] || []).push(String(comune).trim());
  });
  return Object.keys(zone).map((z) => ({ zona: z, comuni: zone[z].sort((a, b) => a.localeCompare(b, 'it')) }));
}

function registra_(evento, id, dettagli) {
  SpreadsheetApp.getActive().getSheetByName(FOGLI.registro).appendRow([new Date(), evento, id, sanifica(dettagli, 300)]);
}

function inviaEmail_(a, oggetto, testo) {
  MailApp.sendEmail({ to: a, subject: oggetto, body: testo + `\n—\n${ENTE.nomeLegale}\n${ENTE.email}`, name: ENTE.nome });
}
