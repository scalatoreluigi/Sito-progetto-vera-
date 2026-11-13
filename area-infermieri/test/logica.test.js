// Test delle regole in Logica.gs. Si lanciano con: node --test area-infermieri/test/*.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ctx = vm.createContext({});
for (const f of ['Config.gs', 'Logica.gs']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
}
const L = (expr) => vm.runInContext(expr, ctx);
const fn = (name) => L(name);
const STATI = L('STATI');
const d = (s) => fn('aData')(s);
const OGGI = d('2026-11-13');

function adesioneValida(extra) {
  return Object.assign({
    nome: 'Anna', cognome: 'Rossi', telefono: '+39 333 1234567', email: 'Anna@Example.it',
    numeroOpi: '12345', provinciaOpi: 'Verona', comuni: ['Garda', 'Verona'],
    prestazioni: ['Cateterismo intermittente pulito'], luogo: 'Scuola',
    giorni: ['Lunedì'], fasce: ['Pranzo (12-14)'], rc: 'Sì', scadenzaRc: '2027-06-30',
    consensoPrivacy: true, consensoContatti: true, dichiarazione: true,
  }, extra);
}
const COMUNI = ['Garda', 'Verona', 'Caprino Veronese'];

function attivo(extra) {
  return Object.assign({
    stato: STATI.attivo, verificaAlbo: true, verificaRc: true, consensoContatti: true,
    scadenzaRc: d('2027-06-30'), scadenzaRinnovo: d('2027-11-13'),
    comuni: 'Garda, Verona', prestazioni: 'Cateterismo intermittente pulito, Medicazioni',
    luogo: 'Scuola', giorni: 'Lunedì, Martedì', fasce: 'Pranzo (12-14)',
  }, extra);
}

test('aData accetta date e testi validi, rifiuta il resto', () => {
  assert.strictEqual(d('2026-02-30'), null);
  assert.strictEqual(d('13/11/2026'), null);
  assert.strictEqual(d(''), null);
  assert.strictEqual(d(new Date(2026, 10, 13, 15, 30)).getHours(), 0);
});

test('adesione completa: nessun errore, email in minuscolo, liste unite', () => {
  const { errori, record } = fn('normalizzaAdesione')(adesioneValida(), COMUNI, OGGI);
  assert.deepStrictEqual(Array.from(errori), []);
  assert.strictEqual(record.email, 'anna@example.it');
  assert.strictEqual(record.comuni, 'Garda, Verona');
});

test('i campi di una riga non contengono a capo', () => {
  const { record } = fn('normalizzaAdesione')(adesioneValida({ nome: 'Anna\nBcc: x@y.it' }), COMUNI, OGGI);
  assert.strictEqual(record.nome, 'Anna Bcc: x@y.it');
});

test('adesione senza RC, con RC scaduta o senza consensi viene rifiutata', () => {
  assert.ok(fn('normalizzaAdesione')(adesioneValida({ rc: 'No' }), COMUNI, OGGI).errori.some((e) => e.includes('RC')));
  assert.ok(fn('normalizzaAdesione')(adesioneValida({ scadenzaRc: '2026-01-01' }), COMUNI, OGGI).errori.some((e) => e.includes('scaduta')));
  const senzaConsensi = fn('normalizzaAdesione')(adesioneValida({ consensoContatti: false, dichiarazione: false }), COMUNI, OGGI);
  assert.strictEqual(senzaConsensi.errori.length, 2);
});

test('adesione: comuni o prestazioni inventati sono un errore', () => {
  const r = fn('normalizzaAdesione')(adesioneValida({ comuni: ['Garda', 'Atlantide'], prestazioni: ['Chirurgia'] }), COMUNI, OGGI);
  assert.ok(r.errori.some((e) => e.includes('comune')));
  assert.ok(r.errori.some((e) => e.includes('prestazione')));
});

test('"Altro" richiede la descrizione', () => {
  const r = fn('normalizzaAdesione')(adesioneValida({ prestazioni: ['Altro'] }), COMUNI, OGGI);
  assert.ok(r.errori.some((e) => e.includes('Altro')));
});

test('sanifica blocca le formule nel foglio', () => {
  assert.strictEqual(fn('sanifica')('=HYPERLINK("x")'), '\'=HYPERLINK("x")');
  assert.strictEqual(fn('sanifica')('+39 333'), "'+39 333");
  assert.strictEqual(fn('sanifica')('Anna'), 'Anna');
  assert.strictEqual(fn('sanifica')('abcdef', 3), 'abc');
});

test('visibile solo se attivo, verificato, con RC e rinnovo validi', () => {
  const vis = fn('infermiereVisibile');
  assert.ok(vis(attivo(), OGGI));
  assert.ok(!vis(attivo({ stato: STATI.attesa }), OGGI));
  assert.ok(!vis(attivo({ verificaAlbo: false }), OGGI));
  assert.ok(!vis(attivo({ verificaRc: false }), OGGI));
  assert.ok(!vis(attivo({ scadenzaRc: d('2026-11-12') }), OGGI));
  assert.ok(vis(attivo({ scadenzaRc: OGGI }), OGGI), "l'ultimo giorno di copertura è ancora valido");
  // rinnovo scaduto da 30 giorni: ancora visibile; da 31: nascosto anche se l'automatismo non è partito
  assert.ok(vis(attivo({ scadenzaRinnovo: d('2026-10-14') }), OGGI));
  assert.ok(!vis(attivo({ scadenzaRinnovo: d('2026-10-13') }), OGGI));
});

test('filtri: comune, prestazione, luogo (Entrambi vale per tutti), giorno, fascia', () => {
  const filtra = fn('filtraInfermieri');
  const elenco = [attivo({ nome: 'A' }), attivo({ nome: 'B', luogo: 'Entrambi', comuni: 'Caprino Veronese' }), attivo({ nome: 'C', stato: STATI.sospeso })];
  const nomi = (f) => filtra(elenco, f, OGGI).map((r) => r.nome).join();
  assert.strictEqual(nomi({}), 'A,B');
  assert.strictEqual(nomi({ comune: 'Garda' }), 'A');
  assert.strictEqual(nomi({ luogo: 'Domicilio' }), 'B');
  assert.strictEqual(nomi({ prestazione: 'Gestione PEG' }), '');
  assert.strictEqual(nomi({ giorno: 'Martedì', fascia: 'Pranzo (12-14)' }), 'A,B');
  assert.strictEqual(nomi({ fascia: 'Sera (19-22)' }), '');
});

test('la scheda per le famiglie non contiene dati interni', () => {
  const s = fn('schedaPubblica')(attivo({ notaInterna: 'segreto', token: 'abc', prestazioni: 'Altro', altraPrestazione: 'Aerosol' }));
  assert.ok(!('notaInterna' in s) && !('token' in s) && !('verificaAlbo' in s));
  assert.deepStrictEqual(Array.from(s.prestazioni), ['Aerosol']);
});

test('attivazione bloccata senza le verifiche', () => {
  const b = fn('bloccantiAttivazione');
  assert.deepStrictEqual(Array.from(b(attivo({ stato: STATI.attesa }), OGGI)), []);
  assert.strictEqual(b(attivo({ verificaAlbo: false, verificaRc: false }), OGGI).length, 2);
  assert.strictEqual(b(attivo({ scadenzaRc: d('2026-01-01') }), OGGI).length, 1);
});

test('controlli giornalieri', () => {
  const az = (extra, oggi) => { const a = fn('azioneGiornaliera')(attivo(extra), oggi || OGGI); return a && a.tipo + (a.motivo ? ':' + a.motivo : ''); };
  assert.strictEqual(az({}), null);
  assert.strictEqual(fn('azioneGiornaliera')(attivo({ stato: STATI.sospeso, scadenzaRc: d('2020-01-01') }), OGGI), null);
  assert.strictEqual(az({ scadenzaRc: d('2026-11-12') }), 'sospendi:Polizza RC scaduta');
  // RC in scadenza fra 30 giorni: avviso, una volta sola
  assert.strictEqual(az({ scadenzaRc: d('2026-12-13') }), 'avvisoRc');
  assert.strictEqual(az({ scadenzaRc: d('2026-12-14') }), null);
  assert.strictEqual(az({ scadenzaRc: d('2026-12-13'), avvisoRc: OGGI }), null);
  // nuova polizza dopo un avviso vecchio: si avvisa di nuovo alla nuova scadenza
  assert.strictEqual(az({ scadenzaRc: d('2026-12-13'), avvisoRc: d('2025-12-13') }), 'avvisoRc');
  // rinnovo annuale: richiesta alla scadenza, promemoria dopo 20 giorni, sospensione dopo 30
  assert.strictEqual(az({ scadenzaRinnovo: OGGI }), 'richiediRinnovo');
  assert.strictEqual(az({ scadenzaRinnovo: OGGI, rinnovoRichiesto: OGGI }), null);
  assert.strictEqual(az({ scadenzaRinnovo: d('2026-10-24'), rinnovoRichiesto: d('2026-10-24') }), 'promemoriaRinnovo');
  assert.strictEqual(az({ scadenzaRinnovo: d('2026-10-14'), rinnovoRichiesto: d('2026-10-14') }), null);
  assert.strictEqual(az({ scadenzaRinnovo: d('2026-10-13'), rinnovoRichiesto: d('2026-10-13') }), 'sospendi:Rinnovo annuale non confermato');
  // l'automatismo era fermo da mesi: si sospende subito, senza mandare prima la richiesta
  assert.strictEqual(az({ scadenzaRinnovo: d('2026-01-01') }), 'sospendi:Rinnovo annuale non confermato');
});

test('rinnovo: stessa polizza resta attivo, polizza nuova torna da verificare', () => {
  const rinnova = fn('applicaRinnovo');
  const ok = { confermaAlbo: true, confermaContatti: true, scadenzaRc: '2027-06-30' };
  const stessa = rinnova(attivo(), ok, OGGI);
  assert.deepStrictEqual(Array.from(stessa.errori), []);
  assert.ok(!('stato' in stessa.modifiche));
  assert.strictEqual(fn('formatoData')(stessa.modifiche.scadenzaRinnovo), '13/11/2027');

  const nuova = rinnova(attivo(), Object.assign({}, ok, { scadenzaRc: '2027-12-31' }), OGGI);
  assert.strictEqual(nuova.modifiche.stato, STATI.attesa);
  assert.strictEqual(nuova.modifiche.verificaRc, false);

  const daSospeso = rinnova(attivo({ stato: STATI.sospeso }), ok, OGGI);
  assert.strictEqual(daSospeso.modifiche.stato, STATI.attesa);

  assert.strictEqual(rinnova(attivo(), { disponibile: 'no' }, OGGI).modifiche.stato, STATI.sospeso);
  assert.strictEqual(rinnova(attivo(), { confermaAlbo: false, scadenzaRc: '2025-01-01' }, OGGI).errori.length, 3);
});

test('codici famiglia: formato, casualità, normalizzazione', () => {
  const crea = fn('codiceDaUuid');
  const codici = new Set();
  for (let k = 0; k < 2000; k++) codici.add(crea(crypto.randomUUID()));
  assert.strictEqual(codici.size, 2000);
  for (const c of codici) assert.match(c, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  assert.strictEqual(fn('normalizzaCodice')(' abcd efgh-jkmn '), 'ABCD-EFGH-JKMN');
  assert.strictEqual(fn('normalizzaCodice')('abc'), '');
});
