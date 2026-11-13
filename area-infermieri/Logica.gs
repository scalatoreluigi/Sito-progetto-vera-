// Regole pure: niente accesso a Fogli o email, così si possono testare (vedi test/logica.test.js).
// Un "record" è un oggetto con le chiavi di COLONNE (es. rec.stato, rec.scadenzaRc).

const MS_GIORNO = 24 * 60 * 60 * 1000;

// Converte Date o testo "AAAA-MM-GG" in una Date a mezzanotte; null se vuoto o non valido.
function aData(v) {
  if (v === null || v === undefined || v === '') return null;
  let d;
  if (v instanceof Date || Object.prototype.toString.call(v) === '[object Date]') {
    d = new Date(v.getFullYear(), v.getMonth(), v.getDate());
  } else {
    const m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getMonth() !== Number(m[2]) - 1) return null;
  }
  return isNaN(d.getTime()) ? null : d;
}

function aggiungiGiorni(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function aggiungiAnni(d, n) {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
}

function formatoData(d) {
  d = aData(d);
  if (!d) return '';
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Liste salvate nel foglio come "a, b, c".
function aLista(v) {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function vero(v) {
  return v === true || v === 'TRUE' || v === 'Sì' || v === 'si' || v === 'sì';
}

// Testo libero dal modulo: senza caratteri di controllo, tagliato alla lunghezza massima.
function pulisci(v, max) {
  let s = String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}

// Da usare al momento di scrivere nel foglio: impedisce che un testo venga eseguito come formula.
function sanifica(v, max) {
  const s = pulisci(v, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// Controlla i dati del modulo di adesione. Restituisce { errori, record }.
function normalizzaAdesione(input, comuniValidi, oggi) {
  const errori = [];
  const i = input || {};
  const r = {};

  const obbligatorio = (chiave, etichetta, max) => {
    // Campi di una riga: niente a capo (finiscono anche nell'oggetto delle email).
    r[chiave] = pulisci(String(i[chiave] === undefined || i[chiave] === null ? '' : i[chiave]).replace(/\s+/g, ' '), max);
    if (!r[chiave]) errori.push(`${etichetta} è obbligatorio.`);
  };
  obbligatorio('nome', 'Il nome', 60);
  obbligatorio('cognome', 'Il cognome', 60);
  obbligatorio('telefono', 'Il telefono', 30);
  obbligatorio('email', "L'email", 120);
  obbligatorio('numeroOpi', 'Il numero di iscrizione OPI', 20);
  obbligatorio('provinciaOpi', "La provincia dell'Ordine", 40);

  if (r.telefono && !/^[+\d][\d\s./-]{5,}$/.test(r.telefono)) errori.push('Il telefono non è valido.');
  r.email = r.email.toLowerCase();
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errori.push("L'email non è valida.");
  if (r.numeroOpi && !/^[A-Za-z0-9/-]{1,20}$/.test(r.numeroOpi)) errori.push('Il numero OPI contiene caratteri non validi.');

  const scelta = (chiave, ammessi, etichetta) => {
    const lista = aLista(i[chiave]);
    const validi = lista.filter((x) => ammessi.indexOf(x) !== -1);
    if (!validi.length) errori.push(`Seleziona almeno ${etichetta}.`);
    if (validi.length !== lista.length) errori.push(`Una delle scelte in "${etichetta}" non è valida.`);
    r[chiave] = validi.join(', ');
  };
  scelta('comuni', comuniValidi, 'un comune');
  scelta('prestazioni', PRESTAZIONI, 'una prestazione');
  scelta('giorni', GIORNI, 'un giorno');
  scelta('fasce', FASCE, 'una fascia oraria');

  r.altraPrestazione = pulisci(i.altraPrestazione, 200);
  if (aLista(r.prestazioni).indexOf('Altro') !== -1 && !r.altraPrestazione) {
    errori.push('Descrivi la prestazione "Altro".');
  }

  r.luogo = LUOGHI.indexOf(i.luogo) !== -1 ? i.luogo : '';
  if (!r.luogo) errori.push('Indica il luogo: scuola, domicilio o entrambi.');

  // La polizza RC è obbligatoria (Legge 24/2017, "Gelli-Bianco"): senza non ci si può iscrivere.
  r.rc = vero(i.rc) ? 'Sì' : 'No';
  const scadenza = aData(i.scadenzaRc);
  if (r.rc !== 'Sì') {
    errori.push("La polizza RC professionale è obbligatoria per iscriversi.");
  } else if (!scadenza) {
    errori.push('Indica la data di scadenza della polizza RC.');
  } else if (scadenza < oggi) {
    errori.push('La polizza RC risulta già scaduta.');
  }
  r.scadenzaRc = scadenza;

  r.presentazione = pulisci(i.presentazione, 600);
  r.esperienzaPediatrica = pulisci(i.esperienzaPediatrica, 300);
  r.tariffa = pulisci(i.tariffa, 80);

  r.consensoPrivacy = vero(i.consensoPrivacy);
  r.consensoContatti = vero(i.consensoContatti);
  r.dichiarazione = vero(i.dichiarazione);
  if (!r.consensoPrivacy) errori.push("Devi dichiarare di aver letto l'informativa privacy.");
  if (!r.consensoContatti) errori.push('Serve il consenso alla condivisione dei contatti con le famiglie associate.');
  if (!r.dichiarazione) errori.push("Devi dichiarare di essere iscritto all'albo OPI e assicurato.");

  return { errori, record: r };
}

// Il profilo compare nella ricerca solo se tutte le condizioni sono vere oggi.
// Il controllo si ripete a ogni ricerca: se un automatismo non è partito, i dati scaduti restano comunque nascosti.
function infermiereVisibile(rec, oggi) {
  if (rec.stato !== STATI.attivo) return false;
  if (!vero(rec.verificaAlbo) || !vero(rec.verificaRc) || !vero(rec.consensoContatti)) return false;
  const rc = aData(rec.scadenzaRc);
  if (!rc || rc < oggi) return false;
  const rinnovo = aData(rec.scadenzaRinnovo);
  if (!rinnovo || aggiungiGiorni(rinnovo, REGOLE.giorniTolleranzaRinnovo) < oggi) return false;
  return true;
}

function copreLuogo(luogoInfermiere, richiesto) {
  if (!richiesto) return true;
  return luogoInfermiere === 'Entrambi' || luogoInfermiere === richiesto;
}

function filtraInfermieri(elenco, filtri, oggi) {
  const f = filtri || {};
  return elenco.filter((rec) =>
    infermiereVisibile(rec, oggi) &&
    (!f.comune || aLista(rec.comuni).indexOf(f.comune) !== -1) &&
    (!f.prestazione || aLista(rec.prestazioni).indexOf(f.prestazione) !== -1) &&
    copreLuogo(rec.luogo, f.luogo) &&
    (!f.giorno || aLista(rec.giorni).indexOf(f.giorno) !== -1) &&
    (!f.fascia || aLista(rec.fasce).indexOf(f.fascia) !== -1)
  );
}

// Solo i campi che una famiglia può vedere.
function schedaPubblica(rec) {
  const testo = (v) => String(v === undefined || v === null ? '' : v);
  return {
    nome: testo(rec.nome),
    cognome: testo(rec.cognome),
    telefono: testo(rec.telefono),
    email: testo(rec.email),
    numeroOpi: testo(rec.numeroOpi),
    provinciaOpi: testo(rec.provinciaOpi),
    prestazioni: aLista(rec.prestazioni).filter((p) => p !== 'Altro').concat(rec.altraPrestazione ? [rec.altraPrestazione] : []),
    luogo: rec.luogo,
    comuni: aLista(rec.comuni),
    giorni: aLista(rec.giorni),
    fasce: aLista(rec.fasce),
    presentazione: rec.presentazione || '',
    esperienzaPediatrica: rec.esperienzaPediatrica || '',
    tariffa: rec.tariffa || '',
  };
}

// Cosa manca per poter attivare un profilo. Lista vuota = si può attivare.
function bloccantiAttivazione(rec, oggi) {
  const mancanze = [];
  if (!vero(rec.verificaAlbo)) mancanze.push("spunta \"Verifica albo OK\" dopo aver controllato l'iscrizione all'albo OPI");
  if (!vero(rec.verificaRc)) mancanze.push('spunta "Verifica RC OK" dopo aver controllato la polizza');
  if (!vero(rec.consensoContatti)) mancanze.push('manca il consenso alla condivisione dei contatti');
  const rc = aData(rec.scadenzaRc);
  if (!rc || rc < oggi) mancanze.push('la polizza RC è scaduta o senza data');
  return mancanze;
}

// Cosa fare oggi per un profilo attivo. Restituisce al massimo un'azione, la più urgente.
function azioneGiornaliera(rec, oggi) {
  if (rec.stato !== STATI.attivo) return null;
  const rc = aData(rec.scadenzaRc);
  if (!rc || rc < oggi) return { tipo: 'sospendi', motivo: 'Polizza RC scaduta' };

  const rinnovo = aData(rec.scadenzaRinnovo);
  if (rinnovo) {
    if (aggiungiGiorni(rinnovo, REGOLE.giorniTolleranzaRinnovo) < oggi) {
      return { tipo: 'sospendi', motivo: 'Rinnovo annuale non confermato' };
    }
    const richiesto = aData(rec.rinnovoRichiesto);
    if (rinnovo <= oggi && (!richiesto || richiesto < rinnovo)) {
      return { tipo: 'richiediRinnovo' };
    }
    if (richiesto && oggi.getTime() === aggiungiGiorni(richiesto, REGOLE.giorniPromemoriaRinnovo).getTime()) {
      return { tipo: 'promemoriaRinnovo' };
    }
  }

  const avvisato = aData(rec.avvisoRc);
  if (aggiungiGiorni(oggi, REGOLE.giorniAvvisoRc) >= rc && (!avvisato || avvisato < aggiungiGiorni(rc, -REGOLE.giorniAvvisoRc - 1))) {
    return { tipo: 'avvisoRc' };
  }
  return null;
}

// Applica la conferma annuale inviata dall'infermiere. Restituisce { errori, modifiche, evento }.
function applicaRinnovo(rec, input, oggi) {
  const i = input || {};
  if (i.disponibile === 'no') {
    return {
      errori: [],
      modifiche: { stato: STATI.sospeso, motivoSospensione: "Ritirato dall'infermiere", rinnovoRichiesto: '' },
      evento: 'Ritiro',
    };
  }
  const errori = [];
  if (!vero(i.confermaAlbo)) errori.push("Devi confermare di essere ancora iscritto all'albo OPI.");
  if (!vero(i.confermaContatti)) errori.push('Devi confermare il consenso alla condivisione dei contatti.');
  const rc = aData(i.scadenzaRc);
  if (!rc) errori.push('Indica la data di scadenza della polizza RC.');
  else if (rc < oggi) errori.push('La polizza RC indicata è scaduta.');
  if (errori.length) return { errori, modifiche: {}, evento: '' };

  const vecchiaRc = aData(rec.scadenzaRc);
  const rcCambiata = !vecchiaRc || vecchiaRc.getTime() !== rc.getTime();
  const modifiche = {
    scadenzaRc: rc,
    scadenzaRinnovo: aggiungiAnni(oggi, REGOLE.anniValiditaProfilo),
    rinnovoRichiesto: '',
    consensoContatti: true,
  };
  // Una polizza nuova o un profilo sospeso tornano all'associazione per un nuovo controllo.
  if (rcCambiata) modifiche.verificaRc = false;
  if (rcCambiata || rec.stato !== STATI.attivo) {
    modifiche.stato = STATI.attesa;
    modifiche.motivoSospensione = '';
  }
  return { errori, modifiche, evento: modifiche.stato === STATI.attesa ? 'Rinnovo da verificare' : 'Rinnovo confermato' };
}

// Codice d'accesso per una famiglia: 12 caratteri (circa 60 bit casuali), senza lettere che si confondono.
function codiceDaUuid(uuid) {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Nell'UUID v4 le cifre 13 e 17 non sono casuali (versione e variante): si scartano.
  const hex = String(uuid).replace(/[^0-9a-f]/gi, '').split('').filter((_, k) => k !== 12 && k !== 16).join('');
  if (hex.length < 15) throw new Error('UUID non valido');
  let bit = '';
  for (const c of hex) bit += parseInt(c, 16).toString(2).padStart(4, '0');
  let codice = '';
  for (let k = 0; k < 12; k++) codice += alfabeto[parseInt(bit.substr(k * 5, 5), 2)];
  return codice.slice(0, 4) + '-' + codice.slice(4, 8) + '-' + codice.slice(8);
}

function normalizzaCodice(c) {
  const s = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 12 ? s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8) : '';
}

// ---------- Richieste delle famiglie (modulo "Chiedi un infermiere") ----------

function giorniTra(da, a) {
  return Math.round((aData(a) - aData(da)) / MS_GIORNO);
}

function zonaDi(comune, zone) {
  const z = (zone || []).find((x) => x.comuni.indexOf(comune) !== -1);
  return z ? z.zona : '';
}

// Controlla la richiesta di una famiglia. Restituisce { errori, richiesta }.
function normalizzaRichiesta(input, zone, oggi) {
  const i = input || {};
  const errori = [];
  const riga = (v, max) => pulisci(String(v === undefined || v === null ? '' : v).replace(/\s+/g, ' '), max);
  const r = {
    referente: riga(i.referente, 60),
    telefono: riga(i.telefono, 30),
    email: riga(i.email, 120).toLowerCase(),
    comune: riga(i.comune, 60),
    prestazioni: aLista(i.prestazioni).filter((p) => PRESTAZIONI.indexOf(p) !== -1),
    altraPrestazione: riga(i.altraPrestazione, 200),
    luogo: LUOGHI.indexOf(i.luogo) !== -1 ? i.luogo : '',
    giorni: aLista(i.giorni).filter((g) => GIORNI.indexOf(g) !== -1),
    fasce: aLista(i.fasce).filter((f) => FASCE.indexOf(f) !== -1),
    note: pulisci(i.note, 300),
    consenso: vero(i.consenso),
  };
  if (!r.referente) errori.push('Scrivi il tuo nome.');
  if (!/^[+\d][\d\s./-]{5,}$/.test(r.telefono)) errori.push('Scrivi un numero di telefono valido: ti richiamiamo lì.');
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errori.push("L'email non è valida (puoi anche lasciarla vuota).");
  r.zona = zonaDi(r.comune, zone);
  if (!r.zona) errori.push('Scegli il comune.');
  if (!r.prestazioni.length) errori.push('Scegli almeno una prestazione.');
  if (r.prestazioni.indexOf('Altro') !== -1 && !r.altraPrestazione) errori.push('Descrivi la prestazione "Altro".');
  if (!r.luogo) errori.push('Indica se serve a scuola, a casa o in entrambi.');
  if (!r.consenso) errori.push("Serve il consenso: senza non possiamo usare questi dati per cercarti un infermiere.");
  r.arrivata = oggi;
  return { errori, richiesta: r };
}

// Infermieri adatti a una richiesta: verificati, nel comune, nel luogo, con almeno una prestazione richiesta.
// I primi sono quelli che coprono più prestazioni e più fasce orarie tra quelle chieste.
function infermieriPerRichiesta(elenco, richiesta, oggi) {
  const richieste = richiesta.prestazioni.filter((p) => p !== 'Altro');
  const conPunteggio = elenco
    .filter((rec) => infermiereVisibile(rec, oggi) && aLista(rec.comuni).indexOf(richiesta.comune) !== -1)
    .filter((rec) => richiesta.luogo === 'Entrambi' || copreLuogo(rec.luogo, richiesta.luogo))
    .map((rec) => {
      const offerte = aLista(rec.prestazioni);
      const prestazioni = richieste.filter((p) => offerte.indexOf(p) !== -1).length;
      const fasce = richiesta.fasce.filter((f) => aLista(rec.fasce).indexOf(f) !== -1).length;
      return { rec, prestazioni, fasce };
    })
    .filter((x) => !richieste.length || x.prestazioni > 0);
  conPunteggio.sort((a, b) => b.prestazioni - a.prestazioni || b.fasce - a.fasce || String(a.rec.cognome).localeCompare(String(b.rec.cognome)));
  return conPunteggio.map((x) => x.rec);
}

// I numeri che dicono se il servizio funziona, sulle richieste arrivate negli ultimi `giorni`.
function riepilogoRichieste(righe, oggi, giorni) {
  const da = aggiungiGiorni(oggi, -giorni);
  const periodo = righe.filter((r) => aData(r.arrivata) && aData(r.arrivata) > da);
  const abbinate = periodo.filter((r) => r.esito === ESITI.abbinata);
  const tempi = abbinate.map((r) => giorniTra(r.arrivata, r.chiusa)).filter((n) => !isNaN(n));
  return {
    arrivate: periodo.length,
    abbinate: abbinate.length,
    nessuno: periodo.filter((r) => r.esito === ESITI.nessuno).length,
    aperte: periodo.filter((r) => !r.esito || r.esito === ESITI.daGestire).length,
    giorniMedi: tempi.length ? Math.round((tempi.reduce((s, n) => s + n, 0) / tempi.length) * 10) / 10 : null,
  };
}

// Richieste ancora da gestire dopo REGOLE.giorniRichiestaFerma giorni.
function richiesteFerme(righe, oggi) {
  return righe.filter((r) => (!r.esito || r.esito === ESITI.daGestire) && aData(r.arrivata) &&
    giorniTra(r.arrivata, oggi) >= REGOLE.giorniRichiestaFerma);
}
