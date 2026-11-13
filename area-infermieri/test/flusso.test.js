// Flussi completi su Codice.gs, con l'ambiente Google simulato (test/gas-finto.js).
const test = require('node:test');
const assert = require('node:assert');
const { creaAmbiente } = require('./gas-finto');

function adesione(extra) {
  return Object.assign({
    nome: 'Anna', cognome: 'Rossi', telefono: '045 1234567', email: 'anna@example.it',
    numeroOpi: '01234', provinciaOpi: 'Verona', comuni: ['Garda', 'Caprino Veronese'],
    prestazioni: ['Cateterismo intermittente pulito'], luogo: 'Scuola',
    giorni: ['Lunedì', 'Mercoledì'], fasce: ['Pranzo (12-14)'], rc: 'Sì', scadenzaRc: '2027-06-30',
    consensoPrivacy: true, consensoContatti: true, dichiarazione: true, presentazione: '=IMPORTXML("x")',
  }, extra);
}

// Prepara un ambiente installato, con un'adesione e un codice famiglia.
function preparato() {
  const g = creaAmbiente({ contesto: 'foglio' });
  g.chiama('installa');
  g.stato.contesto = 'web';
  assert.strictEqual(g.chiama('inviaAdesione', adesione()).ok, true);
  g.stato.contesto = 'foglio';
  g.chiama('nuovoCodiceFamiglia');
  g.stato.contesto = 'web';
  const codice = g.fogli.Famiglie.leggi(2, 1);
  const col = (nome) => g.fogli.Infermieri.leggi(1, 1) && g.fogli.Infermieri.dati[0].indexOf(nome) + 1;
  return { g, codice, col };
}

const attiva = ({ g, col }) => {
  g.stato.contesto = 'foglio';
  g.modificaCella('Infermieri', 2, col('Verifica albo OK'), true);
  g.modificaCella('Infermieri', 2, col('Verifica RC OK'), true);
  g.modificaCella('Infermieri', 2, col('Stato'), 'Attivo');
  g.stato.contesto = 'web';
};

test("l'adesione finisce nella riga 2, in attesa, senza formule e con lo zero iniziale", () => {
  const { g, col } = preparato();
  const f = g.fogli.Infermieri;
  assert.strictEqual(f.getLastRow(), 2);
  assert.strictEqual(f.leggi(2, col('Stato')), 'In attesa');
  assert.strictEqual(f.leggi(2, col('Telefono')), '045 1234567');
  assert.strictEqual(f.leggi(2, col('Numero iscrizione OPI')), '01234');
  assert.strictEqual(f.leggi(2, col('Presentazione')), '=IMPORTXML("x")'); // salvato come testo, non come formula
  assert.ok(g.email.some((m) => m.to === 'anna@example.it'));
  assert.ok(g.email.some((m) => m.to === 'progettoveraeisuoiamici@gmail.com' && m.subject.includes('da verificare')));
});

test('iscrizione doppia, honeypot e limite orario', () => {
  const { g } = preparato();
  assert.strictEqual(g.chiama('inviaAdesione', adesione()).ok, false);
  assert.strictEqual(g.chiama('inviaAdesione', adesione({ email: 'altra@example.it' })).ok, false, 'stesso numero OPI');
  const prima = g.fogli.Infermieri.getLastRow();
  assert.strictEqual(g.chiama('inviaAdesione', adesione({ email: 'bot@x.it', numeroOpi: '9', sitoWeb: 'spam' })).ok, true);
  assert.strictEqual(g.fogli.Infermieri.getLastRow(), prima, 'il bot non viene salvato');
  let bloccato = false;
  for (let k = 0; k < 25; k++) {
    const r = g.chiama('inviaAdesione', adesione({ email: `n${k}@x.it`, numeroOpi: String(1000 + k) }));
    if (!r.ok && r.errori[0].includes('Troppe')) bloccato = true;
  }
  assert.ok(bloccato);
});

test('le famiglie non vedono nulla finché il profilo non è verificato e attivo', () => {
  const ctx = preparato();
  const { g, codice, col } = ctx;
  assert.strictEqual(g.chiama('accediFamiglia', 'SBAGLIATO-0000').ok, false);
  assert.strictEqual(g.chiama('cercaInfermieri', codice, {}).risultati.length, 0);

  // Attivazione senza le spunte di verifica: bloccata e stato ripristinato.
  g.stato.contesto = 'foglio';
  g.modificaCella('Infermieri', 2, col('Stato'), 'Attivo');
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Stato')), 'In attesa');
  assert.ok(g.avvisi.some((a) => a.includes('Non posso attivare')));

  attiva(ctx);
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Verificato da')), 'volontario@esempio.it');
  assert.ok(g.email.some((m) => m.subject === 'Il tuo profilo è attivo'));
  const r = g.chiama('cercaInfermieri', codice.toLowerCase().replace(/-/g, ' '), { comune: 'Garda', luogo: 'Scuola' });
  assert.strictEqual(r.risultati.length, 1);
  assert.strictEqual(r.risultati[0].telefono, '045 1234567');
  assert.ok(!('token' in r.risultati[0]) && !('notaInterna' in r.risultati[0]));
  assert.strictEqual(g.chiama('cercaInfermieri', codice, { comune: 'Verona' }).risultati.length, 0);
  assert.strictEqual(g.chiama('cercaInfermieri', codice, { luogo: 'Domicilio' }).risultati.length, 0);

  // Le ricerche non vengono registrate, solo l'accesso.
  const registro = JSON.stringify(g.fogli.Registro.dati);
  assert.ok(!registro.includes('Garda') && !registro.includes('Domicilio'));
  assert.strictEqual(g.fogli.Famiglie.leggi(2, 6), 4);

  // Codice disattivato: niente più accesso.
  g.fogli.Famiglie.scrivi(2, 3, false);
  assert.strictEqual(g.chiama('cercaInfermieri', codice, {}).ok, false);
});

test('dalla web app non si possono lanciare le funzioni di amministrazione né leggere i dati', () => {
  const { g } = preparato();
  for (const f of ['installa', 'nuovoCodiceFamiglia', 'mostraIndirizzi', 'controlliGiornalieri', 'onOpen']) {
    assert.throws(() => g.chiama(f), /getUi/, f);
  }
  assert.throws(() => g.chiama('controlliGiornalieri', { triggerUid: '123' }), /getUi/, 'uid inventato');
  assert.throws(() => g.chiama('alModificare', { range: {} }));
  // Le funzioni interne finiscono con "_": Apps Script non le espone a google.script.run.
  const pubbliche = Object.keys(g.ctx).filter((k) => typeof g.ctx[k] === 'function' && !k.endsWith('_'));
  const logica = ['aData', 'aggiungiGiorni', 'aggiungiAnni', 'formatoData', 'aLista', 'vero', 'pulisci', 'sanifica',
    'normalizzaAdesione', 'infermiereVisibile', 'copreLuogo', 'filtraInfermieri', 'schedaPubblica', 'bloccantiAttivazione',
    'azioneGiornaliera', 'applicaRinnovo', 'codiceDaUuid', 'normalizzaCodice'];
  assert.deepStrictEqual(pubbliche.filter((k) => logica.indexOf(k) === -1 && !/^[A-Z]/.test(k)).sort(), [
    'accediFamiglia', 'alModificare', 'cercaInfermieri', 'controlliGiornalieri', 'datiRinnovo', 'doGet', 'include',
    'installa', 'inviaAdesione', 'inviaRinnovo', 'mostraIndirizzi', 'nuovoCodiceFamiglia', 'onOpen']);
});

test("un anno dopo: richiesta di rinnovo, promemoria, sospensione, riattivazione", () => {
  const ctx = preparato();
  const { g, codice, col } = ctx;
  attiva(ctx);
  const token = g.fogli.Infermieri.leggi(2, col('Token'));
  const giro = (giorno) => { g.vaiAl(giorno); g.email.length = 0; g.chiama('controlliGiornalieri', { triggerUid: g.trigger[0].id }); return g.email.map((m) => m.subject); };

  assert.deepStrictEqual(giro('2026-11-14'), []);
  assert.ok(giro('2027-06-01').some((s) => s.includes('polizza RC sta per scadere')));
  assert.deepStrictEqual(giro('2027-06-02'), [], 'avviso RC una volta sola');

  // L'infermiera aggiorna la polizza dal link: torna "In attesa" finché l'associazione non ricontrolla.
  assert.strictEqual(g.chiama('datiRinnovo', token).nome, 'Anna');
  assert.strictEqual(g.chiama('datiRinnovo', 'x').ok, false);
  const r = g.chiama('inviaRinnovo', token, { confermaAlbo: true, confermaContatti: true, scadenzaRc: '2028-06-30' });
  assert.strictEqual(r.stato, 'In attesa');
  assert.strictEqual(g.chiama('cercaInfermieri', codice, {}).risultati.length, 0);
  attiva(ctx);
  assert.strictEqual(g.chiama('cercaInfermieri', codice, {}).risultati.length, 1);

  // Scadenza annuale: la conferma del 2 giugno 2027 sposta la scadenza al 2 giugno 2028.
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Scadenza rinnovo')).getDate(), 2);
  assert.ok(giro('2028-06-01').some((s) => s.includes('polizza RC sta per scadere')), 'prima la polizza');
  const richiesta = giro('2028-06-02');
  assert.ok(richiesta.some((s) => s.startsWith('conferma i tuoi dati')), JSON.stringify(richiesta));
  assert.ok(giro('2028-06-22').some((s) => s.startsWith('Promemoria')));
  assert.deepStrictEqual(giro('2028-06-23'), []);
  assert.deepStrictEqual(giro('2028-06-30'), [], "la polizza scade oggi: ultimo giorno valido");
  const sospensione = giro('2028-07-01');
  assert.ok(sospensione.includes('Il tuo profilo è sospeso'));
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Stato')), 'Sospeso');
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Motivo sospensione')), 'Polizza RC scaduta', 'la polizza scade prima del termine di rinnovo');
  assert.strictEqual(g.chiama('cercaInfermieri', codice, {}).risultati.length, 0);
});

test('polizza scaduta: sospensione automatica anche senza avviso', () => {
  const ctx = preparato();
  const { g, codice, col } = ctx;
  attiva(ctx);
  g.vaiAl('2027-07-01');
  // Anche prima che giri l'automatismo, la ricerca nasconde già il profilo.
  assert.strictEqual(g.chiama('cercaInfermieri', codice, {}).risultati.length, 0);
  g.chiama('controlliGiornalieri', { triggerUid: g.trigger[0].id });
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Motivo sospensione')), 'Polizza RC scaduta');
});

test("ritiro dell'infermiere dal link di rinnovo", () => {
  const ctx = preparato();
  const { g, col } = ctx;
  attiva(ctx);
  const token = g.fogli.Infermieri.leggi(2, col('Token'));
  assert.strictEqual(g.chiama('inviaRinnovo', token, { disponibile: 'no' }).stato, 'Sospeso');
  assert.strictEqual(g.fogli.Infermieri.leggi(2, col('Motivo sospensione')), "Ritirato dall'infermiere");
});

test('le pagine si generano e il token nella pagina di rinnovo è ripulito', () => {
  const { g } = preparato();
  for (const p of ['adesione', 'rinnovo', 'informativa', undefined]) {
    const html = g.chiama('doGet', { parameter: { p, t: 'abc"</script><b>' } }).getContent();
    assert.ok(html.includes('Progetto Vera'), p);
    assert.ok(!html.includes('</script><b>'), p);
  }
});
