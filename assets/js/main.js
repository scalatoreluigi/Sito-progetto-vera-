// Il sito legge tutti i testi dai file in /content (modificabili dal pannello /admin).
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Euro all'italiana con il punto delle migliaia anche sotto i 10.000 (Intl scrive "1500,00 €").
const migliaia = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const euro = (n) => {
  const [interi, decimali] = Math.abs(Number(n) || 0).toFixed(2).split('.');
  return (Number(n) < 0 ? '−' : '') + migliaia(interi) + ',' + decimali + ' €';
};
const euroTondi = (n) => migliaia(String(Math.round(Number(n) || 0))) + ' €';
const dataIt = (d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
const paragrafi = (t) => String(t || '').split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');

async function load(name) {
  const res = await fetch(`content/${name}.json`, { cache: 'no-cache' });
  return res.json();
}

function bind(key, value) {
  document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => { el.textContent = value ?? ''; });
}

// Apre il checkout PayPal con il pulsante standard: basta l'email PayPal dell'associazione.
// Con { mensile: true } crea una donazione ricorrente ogni mese (serve un conto PayPal Business).
function paypal(settings, itemName, amount, quantity = 1, opzioni = {}) {
  if (!settings.paypal_email) {
    alert('I pagamenti PayPal non sono ancora attivi. Scrivici a ' + settings.email);
    return;
  }
  const f = document.createElement('form');
  f.method = 'post';
  f.action = 'https://www.paypal.com/cgi-bin/webscr';
  const comuni = {
    business: settings.paypal_email,
    item_name: itemName,
    currency_code: 'EUR',
    lc: 'IT',
    charset: 'utf-8',
    return: location.origin + location.pathname + '#grazie',
    cancel_return: location.origin + location.pathname + (opzioni.mensile ? '#dona' : '#shop'),
  };
  const fields = opzioni.mensile
    ? { ...comuni, cmd: '_xclick-subscriptions', a3: Number(amount).toFixed(2), p3: 1, t3: 'M', src: 1, no_note: 1, no_shipping: 1 }
    : { ...comuni, cmd: '_xclick', amount: Number(amount).toFixed(2), quantity, no_shipping: '2' };
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input');
    i.type = 'hidden'; i.name = k; i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

function renderSettings(s) {
  ['nome', 'nome_legale', 'titolo_apertura', 'titolo_evidenza', 'slogan', 'sede', 'telefono', 'causale',
    'intestatario_iban', 'cinque_per_mille', 'runts'].forEach((k) => { if (s[k] !== undefined) bind(k, s[k]); });
  document.title = s.nome;
  $('#iban').textContent = s.iban || 'IBAN in arrivo';
  $('#copia-iban').hidden = !s.iban;
  $('#copia-iban').onclick = (e) => {
    const bottone = e.currentTarget;
    const seleziona = () => {
      const r = document.createRange(); r.selectNodeContents($('#iban'));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      bottone.textContent = 'Selezionato: copia con Ctrl+C';
    };
    try { navigator.clipboard.writeText(s.iban.replace(/\s/g, '')).then(() => { bottone.textContent = 'IBAN copiato'; }, seleziona); }
    catch (err) { seleziona(); }
  };
  $('#mail').href = 'mailto:' + (s.email || s.pec);
  $('#mail').textContent = s.email || '';
  $('#mail').hidden = !s.email;
  $('#volontario').href = 'mailto:' + s.email + '?subject=' + encodeURIComponent('Voglio diventare volontario');
  $('#pec').href = 'mailto:' + s.pec;
  $('#pec').textContent = s.pec;
  $('#cf').textContent = s.codice_fiscale ? 'C.F. e P.IVA ' + s.codice_fiscale : '';
  $('#fb').href = s.facebook || '#';
  $('#fb').hidden = !s.facebook;
  $('#ig').href = s.instagram || '#';
  $('#ig').hidden = !s.instagram;
  $('#box-5x1000').hidden = !s.cinque_per_mille;
  impostaDono(s);
}

// Dono: "ogni mese" come scelta proposta (si spegne dal pannello con "PayPal mensile"), importi tondi, "Altro" libero.
function impostaDono(s) {
  const permetteMensile = s.paypal_mensile !== false;
  let mensile = permetteMensile;
  let importo = 25;
  $('#frequenza').hidden = !permetteMensile;
  if (!permetteMensile) $('#dona-intro').textContent = "Ogni donazione va alle terapie dei bambini e la trovi rendicontata in Trasparenza.";
  const valore = () => (importo === 'altro' ? Math.max(1, parseInt($('#importo-altro').value, 10) || 0) : importo);
  const aggiorna = () => { $('#invia-dono').textContent = `Dona ${euroTondi(valore())}${mensile ? ' al mese' : ''} con PayPal`; };
  const scegliFrequenza = (m) => {
    mensile = m;
    $('#freq-mese').setAttribute('aria-pressed', String(m));
    $('#freq-una').setAttribute('aria-pressed', String(!m));
    aggiorna();
  };
  $('#freq-mese').onclick = () => scegliFrequenza(true);
  $('#freq-una').onclick = () => scegliFrequenza(false);
  document.querySelectorAll('.importi button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('.importi button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      importo = b.dataset.importo === 'altro' ? 'altro' : Number(b.dataset.importo);
      $('#box-altro').hidden = importo !== 'altro';
      if (importo === 'altro') $('#importo-altro').focus();
      aggiorna();
    };
  });
  $('#importo-altro').oninput = aggiorna;
  $('#modulo-dono').onsubmit = (e) => {
    e.preventDefault();
    paypal(s, (mensile ? 'Donazione mensile – ' : 'Erogazione liberale – ') + s.nome, valore(), 1, { mensile });
  };
  aggiorna();
}

function renderChiSiamo(c) {
  bind('chi.titolo', c.titolo);
  bind('chi.passi_titolo', c.passi_titolo || 'Come funziona');
  $('#storia').innerHTML = paragrafi(c.storia);
  $('#numeri').innerHTML = (c.numeri || []).map((n) =>
    `<p class="numero"><b>${esc(n.valore)}</b><span>${esc(n.etichetta)}</span></p>`).join('');
  $('#direttivo').innerHTML = (c.direttivo || []).map((p) =>
    `<li><strong>${esc(p.nome)}</strong><span class="etichetta">${esc(p.ruolo)}</span></li>`).join('');
  $('#amici').innerHTML = (c.amici || []).map((a) => `
    <li><strong>${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.nome)}</a>` : esc(a.nome)}</strong>
      <p>${esc(a.descrizione)}</p></li>`).join('');
  $('#passi').innerHTML = (c.passi || []).map((p) => `<li><h3>${esc(p.titolo)}</h3><p>${esc(p.testo)}</p></li>`).join('');
}

function renderTerapie(t) {
  $('#lista-terapie').innerHTML = (t.terapie || []).map((x) => `
    <div class="metodo">
      ${x.immagine ? `<img src="${esc(x.immagine)}" alt="" loading="lazy">` : ''}
      <h3>${esc(x.nome)}</h3>
      <p>${esc(x.descrizione)}</p>
    </div>`).join('');
  // Come i post Instagram: foto grande, nome in evidenza, descrizione sotto.
  // Senza foto (o senza consenso) al posto della foto c'è l'elefantino del logo.
  $('#lista-terapisti').innerHTML = (t.terapisti || []).map((x) => `
    <figure class="post">
      <p class="intestazione">Terapisti invitati</p>
      ${x.foto && x.consenso_foto
        ? `<img class="foto" src="${esc(x.foto)}" alt="${esc(x.nome)}" loading="lazy">`
        : '<div class="foto-vuota"><img src="images/elefante-destra.png" alt=""></div>'}
      <figcaption>
        <h3>${esc(x.nome)}</h3>
        <span class="etichetta">${esc(x.ruolo)}${x.provenienza ? ' · ' + esc(x.provenienza) : ''}</span>
        <p>${esc(x.descrizione)}</p>
        ${x.link ? `<p><a href="${esc(x.link)}" target="_blank" rel="noopener">Scopri di più</a></p>` : ''}
      </figcaption>
    </figure>`).join('');
}

// Mostra solo le foto per cui c'è il consenso scritto.
function renderGalleria(g) {
  const foto = (g.foto || []).filter((f) => f.immagine && f.consenso_scritto);
  $('#galleria').hidden = !foto.length;
  $('#foto').innerHTML = foto.map((f) => `
    <figure><img src="${esc(f.immagine)}" alt="${esc(f.didascalia)}" loading="lazy"><figcaption>${esc(f.didascalia)}</figcaption></figure>`).join('');
}

function renderTrasparenza(t) {
  $('#nota-trasparenza').textContent = t.nota || '';
  const movimenti = (t.movimenti || []).slice().sort((a, b) => b.data.localeCompare(a.data));
  const anni = [...new Set(movimenti.map((m) => m.data.slice(0, 4)))];
  $('#anno').innerHTML = '<option value="">Tutti</option>' + anni.map((a) => `<option>${a}</option>`).join('');

  const draw = () => {
    const anno = $('#anno').value;
    const lista = movimenti.filter((m) => !anno || m.data.startsWith(anno));
    const entrate = lista.filter((m) => m.tipo === 'entrata');
    const uscite = lista.filter((m) => m.tipo === 'uscita');
    const somma = (l) => l.reduce((s, m) => s + Number(m.importo), 0);
    const conRicevuta = uscite.filter((m) => m.documento).length;
    $('#tot-uscite').textContent = euroTondi(somma(uscite));
    $('#nota-uscite').textContent = `${uscite.length} ${uscite.length === 1 ? 'uscita' : 'uscite'}${anno ? ' nel ' + anno : ''}`;
    $('#tot-entrate').textContent = euroTondi(somma(entrate));
    $('#nota-entrate').textContent = `${entrate.length} ${entrate.length === 1 ? 'entrata' : 'entrate'}${anno ? ' nel ' + anno : ''}`;
    $('#saldo').textContent = euroTondi(somma(entrate) - somma(uscite));
    $('#ricevute').textContent = uscite.length ? Math.round((conRicevuta / uscite.length) * 100) + '%' : '–';
    $('#movimenti').innerHTML = lista.map((m) => `
      <tr>
        <td>${dataIt(m.data)}</td>
        <td>${esc(m.descrizione)}</td>
        <td class="cifra ${m.tipo === 'entrata' ? 'entrata' : 'uscita'}">${m.tipo === 'entrata' ? '+' : '−'}${euro(m.importo)}</td>
        <td>${m.documento ? `<a href="${esc(m.documento)}" target="_blank" rel="noopener">Vedi</a>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="4">Nessun movimento.</td></tr>';
  };
  $('#anno').onchange = draw;
  draw();
}

function renderSponsor(s) {
  const ordine = { oro: 0, argento: 1, bronzo: 2 };
  const lista = (s.sponsor || []).slice().sort((a, b) => (ordine[a.livello] ?? 3) - (ordine[b.livello] ?? 3));
  $('#lista-sponsor').innerHTML = lista.map((x) => {
    const inner = `${x.logo ? `<img src="${esc(x.logo)}" alt="${esc(x.nome)}" loading="lazy">` : `<h3>${esc(x.nome)}</h3>`}
      ${x.descrizione ? `<p>${esc(x.descrizione)}</p>` : ''}`;
    return x.sito
      ? `<a class="sponsor-scheda ${esc(x.livello)}" href="${esc(x.sito)}" target="_blank" rel="noopener">${inner}</a>`
      : `<div class="sponsor-scheda ${esc(x.livello)}">${inner}</div>`;
  }).join('');
}

function renderShop(shop, settings) {
  $('#nota-shop').textContent = shop.nota || '';
  const prodotti = shop.prodotti || [];
  $('#prodotti').innerHTML = prodotti.map((p, i) => {
    const varianti = String(p.varianti || '').split(',').map((v) => v.trim()).filter(Boolean);
    return `
    <div class="prodotto">
      <div class="immagine">${p.immagine
        ? `<img src="${esc(p.immagine)}" alt="${esc(p.nome)}" loading="lazy">`
        : '<img class="segnaposto" src="images/elefante-destra.png" alt="">'}</div>
      <h3>${esc(p.nome)}</h3>
      <p>${esc(p.descrizione)}</p>
      <p class="prezzo">${euro(p.prezzo)}</p>
      <div class="riga-acquisto">
        ${varianti.length ? `<select data-variante="${i}" aria-label="Variante di ${esc(p.nome)}">${varianti.map((v) => `<option>${esc(v)}</option>`).join('')}</select>` : ''}
        <input type="number" min="1" value="1" data-qta="${i}" aria-label="Quantità di ${esc(p.nome)}">
        <button class="btn" type="button" data-compra="${i}" ${p.disponibile === false ? 'disabled' : ''}>
          ${p.disponibile === false ? 'Esaurito' : 'Acquista con PayPal'}
        </button>
      </div>
    </div>`;
  }).join('');
  $('#prodotti').onclick = (e) => {
    const i = e.target.closest('[data-compra]')?.dataset.compra;
    if (i === undefined) return;
    const p = prodotti[i];
    const variante = document.querySelector(`[data-variante="${i}"]`)?.value;
    const qta = Math.max(1, parseInt(document.querySelector(`[data-qta="${i}"]`).value, 10) || 1);
    paypal(settings, p.nome + (variante ? ` (${variante})` : ''), p.prezzo, qta);
  };
}

// La sezione compare solo quando nel pannello è inserito l'indirizzo dell'area (vedi area-infermieri/LEGGIMI.md).
function renderInfermieri(s) {
  const url = /^https:\/\//.test(s.url_area_infermieri || '') ? s.url_area_infermieri : '';
  $('#infermieri').hidden = !url;
  if (!url) return;
  $('#link-adesione').href = url + '?p=adesione';
  $('#link-famiglie').href = url;
}

// Prossima settimana di terapia. Le cifre si aggiornano dal pannello (Raccolta in corso).
// Se non vengono aggiornate da più di GIORNI_VALIDITA_RACCOLTA giorni, la barra sparisce: meglio nessun numero che un numero vecchio.
const GIORNI_VALIDITA_RACCOLTA = 30;

function statoRaccolta(r, oggi = new Date()) {
  const obiettivo = Number(r.obiettivo) || 0;
  const raccolto = Math.max(0, Number(r.raccolto) || 0);
  const aggiornato = r.aggiornato_il ? new Date(r.aggiornato_il + 'T12:00:00') : null;
  const giorni = aggiornato ? Math.floor((oggi - aggiornato) / 86400000) : Infinity;
  return {
    obiettivo,
    raccolto,
    quota: obiettivo ? Math.min(100, Math.round((raccolto / obiettivo) * 100)) : 0,
    mancano: Math.max(0, obiettivo - raccolto),
    vecchia: !(giorni <= GIORNI_VALIDITA_RACCOLTA),
    aggiornato,
  };
}

function renderRaccolta(r) {
  const s = statoRaccolta(r);
  const esempio = r.esempio ? ' <span class="esempio">esempio</span>' : '';
  $('#raccolta-titolo').innerHTML = esc(r.titolo) + esempio;
  $('#raccolta-etichette').innerHTML = (r.etichette || []).map((e) => `<span>${esc(e)}</span>`).join('');
  $('#raccolta-raccolto').textContent = euroTondi(s.raccolto);
  $('#raccolta-di').innerHTML = s.mancano
    ? `su ${euroTondi(s.obiettivo)} · mancano <strong>${euroTondi(s.mancano)}</strong>`
    : `su ${euroTondi(s.obiettivo)} · <strong>obiettivo raggiunto, grazie!</strong>`;
  $('#raccolta-pista').style.setProperty('--quota', s.quota + '%');
  $('#raccolta-pista').setAttribute('aria-label', `Raccolto il ${s.quota} per cento dell'obiettivo`);
  $('#raccolta-data').textContent = s.aggiornato ? 'Aggiornato il ' + s.aggiornato.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  $('#raccolta-numeri').hidden = s.vecchia;
  $('#raccolta-ferma').hidden = !s.vecchia;
  $('#raccolta-nota').textContent = r.nota || '';
  $('#raccolta-voci').innerHTML = (r.voci || []).map((v) =>
    `<li><span>${esc(v.descrizione)}</span><span>${euroTondi(Number(v.importo) || 0)}</span></li>`).join('');
}

// Sezioni da pubblicare una alla volta (Impostazioni → Sezioni pubblicate nel pannello).
// Con ?anteprima nell'indirizzo si vedono anche quelle non pubblicate, segnate con un bordo tratteggiato.
// Non è una protezione: i testi sono comunque nei file del sito.
const SEZIONI = {
  chi_siamo: 'chi-siamo', come_funziona: 'come-funziona', terapie: 'terapie', galleria: 'galleria', trasparenza: 'trasparenza',
  sponsor: 'sponsor', shop: 'shop', infermieri: 'infermieri', raccolta: 'raccolta', dona: 'dona',
};

function modalitaAnteprima() {
  let attiva = /[?&#]anteprima\b/.test(location.search + location.hash);
  const pubblico = /[?&#]pubblico\b/.test(location.search + location.hash);
  try {
    if (pubblico) { sessionStorage.removeItem('anteprima'); return false; }
    if (attiva) sessionStorage.setItem('anteprima', '1');
    else attiva = sessionStorage.getItem('anteprima') === '1';
  } catch (e) { /* senza memoria del browser vale solo l'indirizzo */ }
  return attiva;
}

function applicaSezioni(s) {
  const anteprima = modalitaAnteprima();
  const pubblicata = (k) => !s.sezioni || s.sezioni[k] !== false;
  $('#banda-anteprima').hidden = !anteprima;
  for (const [chiave, id] of Object.entries(SEZIONI)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (pubblicata(chiave)) continue;
    if (anteprima) el.classList.add('bozza');
    else el.hidden = true;
  }
  // Menu e pulsanti portano solo a sezioni visibili.
  document.querySelectorAll('.nav a[href^="#"], #cta-sito a[href^="#"]').forEach((a) => {
    const destinazione = document.getElementById(a.getAttribute('href').slice(1));
    a.hidden = !destinazione || destinazione.hidden;
  });
  const voci = Array.from(document.querySelectorAll('.nav a')).filter((a) => !a.hidden);
  $('.menu-btn').hidden = !voci.length;
  $('#cta-sito').hidden = !Array.from(document.querySelectorAll('#cta-sito a')).some((a) => !a.hidden);

  $('#avviso-costruzione').hidden = !s.in_costruzione;
  $('#cta-instagram').hidden = !s.instagram;
  $('#cta-instagram').href = s.instagram || '#';
  $('#cta-facebook').hidden = !s.facebook;
  $('#cta-facebook').href = s.facebook || '#';
}

async function init() {
  $('.menu-btn').onclick = () => {
    const open = $('.nav').classList.toggle('open');
    $('.menu-btn').setAttribute('aria-expanded', String(open));
  };
  document.querySelectorAll('.nav a').forEach((a) => { a.onclick = () => $('.nav').classList.remove('open'); });

  const [settings, chi, terapie, galleria, trasparenza, sponsor, shop, raccolta] = await Promise.all(
    ['impostazioni', 'chi-siamo', 'terapie', 'galleria', 'trasparenza', 'sponsor', 'shop', 'raccolta'].map(load)
  );
  renderSettings(settings);
  renderChiSiamo(chi);
  renderTerapie(terapie);
  renderGalleria(galleria);
  renderTrasparenza(trasparenza);
  renderSponsor(sponsor);
  renderShop(shop, settings);
  renderRaccolta(raccolta);
  renderInfermieri(settings);
  applicaSezioni(settings);

  if (location.hash === '#grazie') alert('Grazie di cuore! Il pagamento è andato a buon fine: ti contatteremo a breve.');
}

init();
