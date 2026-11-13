// Il sito legge tutti i testi dai file in /content (modificabili dal pannello /admin).
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);
const dataIt = (d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
const paragrafi = (t) => String(t || '').split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join('');

async function load(name) {
  const res = await fetch(`content/${name}.json`, { cache: 'no-cache' });
  return res.json();
}

function bind(key, value) {
  document.querySelectorAll(`[data-bind="${key}"]`).forEach((el) => { el.textContent = value ?? ''; });
}

// Apre il checkout PayPal (pulsante "Acquista ora" standard: basta l'email PayPal dell'associazione).
function paypal(settings, itemName, amount, quantity = 1) {
  if (!settings.paypal_email) {
    alert('I pagamenti PayPal non sono ancora attivi. Scrivici a ' + settings.email);
    return;
  }
  const f = document.createElement('form');
  f.method = 'post';
  f.action = 'https://www.paypal.com/cgi-bin/webscr';
  const fields = {
    cmd: '_xclick',
    business: settings.paypal_email,
    item_name: itemName,
    amount: Number(amount).toFixed(2),
    quantity,
    currency_code: 'EUR',
    lc: 'IT',
    no_shipping: '2',
    charset: 'utf-8',
    return: location.origin + location.pathname + '#grazie',
    cancel_return: location.origin + location.pathname + '#shop',
  };
  for (const [k, v] of Object.entries(fields)) {
    const i = document.createElement('input');
    i.type = 'hidden'; i.name = k; i.value = v;
    f.appendChild(i);
  }
  document.body.appendChild(f);
  f.submit();
}

function renderSettings(s) {
  ['nome', 'nome_legale', 'slogan', 'sede', 'telefono', 'causale', 'intestatario_iban', 'cinque_per_mille', 'runts'].forEach((k) => bind(k, s[k]));
  document.title = s.nome;
  $('#iban').textContent = s.iban || 'IBAN in arrivo';
  $('#copia-iban').hidden = !s.iban;
  $('#copia-iban').onclick = () => navigator.clipboard?.writeText(s.iban.replace(/\s/g, '')).then(() => { $('#copia-iban').textContent = 'Copiato!'; });
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
  $('#dona-paypal').onsubmit = (e) => {
    e.preventDefault();
    paypal(s, 'Erogazione liberale – ' + s.nome, $('#importo-dono').value);
  };
}

function renderChiSiamo(c) {
  bind('chi.titolo', c.titolo);
  $('#storia').innerHTML = paragrafi(c.storia);
  $('#numeri').innerHTML = (c.numeri || []).map((n) => `
    <div class="stat"><span class="stat-num">${esc(n.valore)}</span><span class="stat-label">${esc(n.etichetta)}</span></div>`).join('');
  $('#direttivo').innerHTML = (c.direttivo || []).map((p) => `
    <div class="card"><span class="tag">${esc(p.ruolo)}</span><h3>${esc(p.nome)}</h3></div>`).join('');
  $('#amici').innerHTML = (c.amici || []).map((a) => `
    <div class="card">
      <h3>${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.nome)}</a>` : esc(a.nome)}</h3>
      <p class="muted">${esc(a.descrizione)}</p>
    </div>`).join('');
}

function renderTerapie(t) {
  $('#lista-terapie').innerHTML = (t.terapie || []).map((x) => `
    <div class="card">
      ${x.immagine ? `<img src="${esc(x.immagine)}" alt="">` : ''}
      <h3>${esc(x.nome)}</h3>
      <p class="muted">${esc(x.descrizione)}</p>
    </div>`).join('');
  $('#lista-terapisti').innerHTML = (t.terapisti || []).map((x) => `
    <div class="card">
      ${x.foto && x.consenso_foto ? `<img class="foto" src="${esc(x.foto)}" alt="${esc(x.nome)}">` : ''}
      <span class="tag">${esc(x.ruolo)}${x.provenienza ? ' · ' + esc(x.provenienza) : ''}</span>
      <h3>${esc(x.nome)}</h3>
      <p class="muted">${esc(x.descrizione)}</p>
      ${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">Scopri di più</a>` : ''}
    </div>`).join('');
}

// Mostra solo le foto per cui c'è il consenso scritto.
function renderGalleria(g) {
  const foto = (g.foto || []).filter((f) => f.immagine && f.consenso_scritto);
  $('#galleria').hidden = !foto.length;
  $('#foto').innerHTML = foto.map((f) => `
    <figure class="card"><img src="${esc(f.immagine)}" alt="${esc(f.didascalia)}"><figcaption class="small muted">${esc(f.didascalia)}</figcaption></figure>`).join('');
}

function renderTrasparenza(t) {
  $('#nota-trasparenza').textContent = t.nota || '';
  const movimenti = (t.movimenti || []).slice().sort((a, b) => b.data.localeCompare(a.data));
  const anni = [...new Set(movimenti.map((m) => m.data.slice(0, 4)))];
  $('#anno').innerHTML = '<option value="">Tutti</option>' + anni.map((a) => `<option>${a}</option>`).join('');

  const draw = () => {
    const anno = $('#anno').value;
    const lista = movimenti.filter((m) => !anno || m.data.startsWith(anno));
    const entrate = lista.filter((m) => m.tipo === 'entrata').reduce((s, m) => s + Number(m.importo), 0);
    const uscite = lista.filter((m) => m.tipo === 'uscita').reduce((s, m) => s + Number(m.importo), 0);
    $('#tot-entrate').textContent = euro(entrate);
    $('#tot-uscite').textContent = euro(uscite);
    $('#saldo').textContent = euro(entrate - uscite);
    const pct = entrate ? Math.min(100, Math.round((uscite / entrate) * 100)) : 0;
    $('#bar-fill').style.width = pct + '%';
    $('#bar-label').textContent = entrate ? `Il ${pct}% dei fondi raccolti è già stato speso in terapie.` : '';
    $('#movimenti').innerHTML = lista.map((m) => `
      <tr>
        <td>${dataIt(m.data)}</td>
        <td>${esc(m.descrizione)}</td>
        <td class="num ${m.tipo === 'entrata' ? 'pos' : 'neg'}">${m.tipo === 'entrata' ? '+' : '−'}${euro(m.importo)}</td>
        <td>${m.documento ? `<a href="${esc(m.documento)}" target="_blank" rel="noopener">Vedi</a>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="4" class="muted">Nessun movimento.</td></tr>';
  };
  $('#anno').onchange = draw;
  draw();
}

function renderSponsor(s) {
  const ordine = { oro: 0, argento: 1, bronzo: 2 };
  const lista = (s.sponsor || []).slice().sort((a, b) => (ordine[a.livello] ?? 3) - (ordine[b.livello] ?? 3));
  $('#lista-sponsor').innerHTML = lista.map((x) => {
    const inner = `${x.logo ? `<img src="${esc(x.logo)}" alt="${esc(x.nome)}">` : `<h3>${esc(x.nome)}</h3>`}
      <p class="muted small">${esc(x.descrizione)}</p>`;
    return `<div class="card ${esc(x.livello)}">${x.sito ? `<a href="${esc(x.sito)}" target="_blank" rel="noopener">${inner}</a>` : inner}</div>`;
  }).join('');
}

function renderShop(shop, settings) {
  $('#nota-shop').textContent = shop.nota || '';
  const prodotti = shop.prodotti || [];
  $('#prodotti').innerHTML = prodotti.map((p, i) => {
    const varianti = String(p.varianti || '').split(',').map((v) => v.trim()).filter(Boolean);
    return `
    <div class="card">
      ${p.immagine ? `<img src="${esc(p.immagine)}" alt="${esc(p.nome)}">` : ''}
      <h3>${esc(p.nome)}</h3>
      <p class="muted">${esc(p.descrizione)}</p>
      <p class="price">${euro(p.prezzo)}</p>
      <div class="row">
        ${varianti.length ? `<select data-variante="${i}" aria-label="Variante">${varianti.map((v) => `<option>${esc(v)}</option>`).join('')}</select>` : ''}
        <input type="number" min="1" value="1" data-qta="${i}" aria-label="Quantità">
        <button class="btn btn-small" data-compra="${i}" ${p.disponibile === false ? 'disabled' : ''}>
          ${p.disponibile === false ? 'Esaurito' : 'Acquista con PayPal'}
        </button>
      </div>
    </div>`;
  }).join('');
  $('#prodotti').onclick = (e) => {
    const i = e.target.dataset.compra;
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
  $('.link-infermieri').hidden = !url;
  if (!url) return;
  $('#link-adesione').href = url + '?p=adesione';
  $('#link-famiglie').href = url;
}

async function init() {
  $('.menu-btn').onclick = () => {
    const open = $('.nav').classList.toggle('open');
    $('.menu-btn').setAttribute('aria-expanded', open);
  };
  document.querySelectorAll('.nav a').forEach((a) => { a.onclick = () => $('.nav').classList.remove('open'); });

  const [settings, chi, terapie, galleria, trasparenza, sponsor, shop] = await Promise.all(
    ['impostazioni', 'chi-siamo', 'terapie', 'galleria', 'trasparenza', 'sponsor', 'shop'].map(load)
  );
  renderSettings(settings);
  renderChiSiamo(chi);
  renderTerapie(terapie);
  renderGalleria(galleria);
  renderTrasparenza(trasparenza);
  renderSponsor(sponsor);
  renderShop(shop, settings);
  renderInfermieri(settings);

  if (location.hash === '#grazie') alert('Grazie di cuore! Il pagamento è andato a buon fine: ti contatteremo a breve.');
}

init();
