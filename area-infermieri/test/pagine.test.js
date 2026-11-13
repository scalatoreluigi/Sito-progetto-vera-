// Prova le pagine in un browser vero (Chromium), collegate al Codice.gs simulato.
// Per salvare gli screenshot: ANTEPRIMA=/cartella node --test area-infermieri/test/pagine.test.js
const test = require('node:test');
const assert = require('node:assert');
const { creaAmbiente } = require('./gas-finto');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }

const ANTEPRIMA = process.env.ANTEPRIMA;

// Sostituisce google.script.run con una chiamata al finto server.
const PONTE = `
  window.google = { script: { run: (function crea(ok, ko) {
    return new Proxy({}, { get: (_, nome) => {
      if (nome === 'withSuccessHandler') return (f) => crea(f, ko);
      if (nome === 'withFailureHandler') return (f) => crea(ok, f);
      return (...arg) => window.__gas(nome, JSON.stringify(arg))
        .then((r) => ok && ok(JSON.parse(r)), (e) => ko && ko(e));
    } });
  })() } };`;

async function apri(browser, g, query, larghezza = 1100) {
  const page = await browser.newPage({ viewport: { width: larghezza, height: 900 } });
  const errori = [];
  page.on('pageerror', (e) => errori.push(e.message));
  await page.exposeFunction('__gas', (nome, arg) => JSON.stringify(g.chiama(nome, ...JSON.parse(arg))));
  await page.addInitScript(PONTE);
  await page.route('https://anteprima.test/**', (route) => {
    const p = Object.fromEntries(new URL(route.request().url()).searchParams);
    route.fulfill({ contentType: 'text/html', body: g.chiama('doGet', { parameter: p }).getContent() });
  });
  await page.goto('https://anteprima.test/' + query);
  return { page, errori };
}

test('modulo di adesione, attivazione e ricerca della famiglia nel browser', { skip: !chromium }, async () => {
  const g = creaAmbiente({ contesto: 'foglio' });
  g.chiama('installa');
  g.chiama('nuovoCodiceFamiglia');
  g.stato.contesto = 'web';
  const codice = g.fogli.Famiglie.leggi(2, 1);
  const browser = await chromium.launch();
  try {
    // 1. L'infermiera si iscrive.
    const { page, errori } = await apri(browser, g, '?p=adesione');
    await page.click('#invia');
    await page.waitForSelector('#errori:not([hidden])');
    assert.ok((await page.textContent('#errori')).includes('nome'), 'modulo vuoto: errori mostrati');
    await page.fill('#nome', 'Giulia');
    await page.fill('#cognome', 'Bianchi');
    await page.fill('#telefono', '+39 340 1112233');
    await page.fill('#email', 'giulia@example.it');
    await page.fill('#numeroOpi', '04567');
    await page.fill('#provinciaOpi', 'Verona');
    await page.click('button[data-zona="0"]'); // tutto il Garda
    await page.check('input[name=prestazioni][value="Cateterismo intermittente pulito"]');
    await page.check('input[name=prestazioni][value="Altro"]');
    await page.fill('#altraPrestazione', 'Aerosolterapia');
    await page.check('input[name=luogo][value="Entrambi"]');
    await page.check('input[name=giorni][value="Lunedì"]');
    await page.check('input[name=fasce][value="Pranzo (12-14)"]');
    await page.check('input[name=rc][value="Sì"]');
    await page.fill('#scadenzaRc', '2027-09-30');
    for (const c of ['consensoPrivacy', 'consensoContatti', 'dichiarazione']) await page.check(`input[name=${c}]`);
    if (ANTEPRIMA) await page.screenshot({ path: ANTEPRIMA + '/adesione.png', fullPage: true });
    await page.click('#invia');
    await page.waitForSelector('#fatto:not([hidden])');
    assert.deepStrictEqual(errori, []);
    const h = g.fogli.Infermieri.dati[0];
    const riga = g.fogli.Infermieri.dati[1];
    assert.strictEqual(riga[h.indexOf('Comuni coperti')].split(', ').length, 11);
    assert.strictEqual(riga[h.indexOf('Telefono')], '+39 340 1112233');

    // 2. L'associazione verifica e attiva.
    g.stato.contesto = 'foglio';
    g.modificaCella('Infermieri', 2, h.indexOf('Verifica albo OK') + 1, true);
    g.modificaCella('Infermieri', 2, h.indexOf('Verifica RC OK') + 1, true);
    g.modificaCella('Infermieri', 2, h.indexOf('Stato') + 1, 'Attivo');
    g.stato.contesto = 'web';

    // 3. La famiglia entra con il codice e cerca (anche su telefono).
    const fam = await apri(browser, g, '', 390);
    await fam.page.fill('#codice', 'AAAA-BBBB-CCCC');
    await fam.page.click('#entra');
    await fam.page.waitForSelector('#errore-codice:not([hidden])');
    await fam.page.fill('#codice', codice.toLowerCase());
    await fam.page.click('#entra');
    await fam.page.waitForSelector('#ricerca:not([hidden]) article');
    await fam.page.selectOption('#comune', 'Bardolino');
    await fam.page.selectOption('#luogo', 'Domicilio');
    await fam.page.click('#cerca');
    await fam.page.waitForFunction(() => document.querySelector('#conteggio').textContent.includes('1 infermiere'));
    const scheda = await fam.page.textContent('#risultati');
    assert.ok(scheda.includes('Giulia Bianchi') && scheda.includes('Aerosolterapia') && scheda.includes('04567'));
    assert.strictEqual(await fam.page.getAttribute('#risultati a[href^="tel:"]', 'href'), 'tel:+393401112233');
    const larghezza = await fam.page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(larghezza <= 390, 'niente scorrimento orizzontale su telefono');
    if (ANTEPRIMA) await fam.page.screenshot({ path: ANTEPRIMA + '/famiglie.png', fullPage: true });
    await fam.page.selectOption('#comune', 'Verona');
    await fam.page.click('#cerca');
    await fam.page.waitForFunction(() => document.querySelector('#conteggio').textContent.startsWith('Nessun'));
    assert.deepStrictEqual(fam.errori, []);

    // 4. Rinnovo e informativa.
    const token = g.fogli.Infermieri.leggi(2, h.indexOf('Token') + 1);
    const rin = await apri(browser, g, '?p=rinnovo&t=' + token, 390);
    await rin.page.waitForSelector('#modulo:not([hidden])');
    assert.strictEqual(await rin.page.inputValue('#scadenzaRc'), '2027-09-30');
    await rin.page.check('input[name=confermaAlbo]');
    await rin.page.check('input[name=confermaContatti]');
    if (ANTEPRIMA) await rin.page.screenshot({ path: ANTEPRIMA + '/rinnovo.png', fullPage: true });
    await rin.page.click('#invia');
    await rin.page.waitForSelector('#fatto:not([hidden])');
    assert.ok((await rin.page.textContent('#fatto')).includes('un altro anno'));
    const inf = await apri(browser, g, '?p=informativa', 390);
    assert.ok((await inf.page.textContent('body')).includes('05163990236'));
    if (ANTEPRIMA) await inf.page.screenshot({ path: ANTEPRIMA + '/informativa.png', fullPage: true });
    assert.deepStrictEqual(rin.errori.concat(inf.errori), []);
  } finally {
    await browser.close();
  }
});
