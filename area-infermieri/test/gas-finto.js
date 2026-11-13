// Ambiente Google Apps Script simulato: fogli in memoria, email catturate, data di "oggi" impostabile.
// Serve ai test per eseguire il vero Codice.gs senza un account Google.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const CARTELLA = path.join(__dirname, '..');

class Intervallo {
  constructor(foglio, riga, col, righe = 1, colonne = 1) {
    Object.assign(this, { foglio, riga, col, righe, colonne });
  }
  setValue(v) { this.foglio.scrivi(this.riga, this.col, v); return this; }
  getValue() { return this.foglio.leggi(this.riga, this.col); }
  setValues(m) { m.forEach((r, i) => r.forEach((v, j) => this.foglio.scrivi(this.riga + i, this.col + j, v))); return this; }
  getRow() { return this.riga; }
  getColumn() { return this.col; }
  getNumRows() { return this.righe; }
  getSheet() { return this.foglio; }
  getValues() {
    const out = [];
    for (let i = 0; i < this.righe; i++) {
      const r = [];
      for (let j = 0; j < this.colonne; j++) r.push(this.foglio.leggi(this.riga + i, this.col + j));
      out.push(r);
    }
    return out;
  }
  // Come in Fogli: la convalida e i formati non contano come contenuto; insertCheckboxes invece scrive FALSE.
  setDataValidation() { return this; }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
  insertCheckboxes() {
    for (let i = 0; i < this.righe; i++) this.foglio.scrivi(this.riga + i, this.col, false);
    return this;
  }
}

class Foglio {
  constructor(nome) { this.nome = nome; this.dati = []; }
  getName() { return this.nome; }
  scrivi(r, c, v) {
    while (this.dati.length < r) this.dati.push([]);
    const riga = this.dati[r - 1];
    while (riga.length < c) riga.push('');
    // Fogli toglie l'apostrofo iniziale (serve solo a forzare il testo) e converte i numeri.
    if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
    else if (typeof v === 'string' && /^\d+$/.test(v)) v = Number(v);
    else if (typeof v === 'string' && /^[=+\-@]/.test(v)) throw new Error('Formula scritta nel foglio: ' + v);
    riga[c - 1] = v;
  }
  leggi(r, c) { const riga = this.dati[r - 1] || []; return riga[c - 1] === undefined ? '' : riga[c - 1]; }
  getLastRow() {
    for (let r = this.dati.length; r > 0; r--) if (this.dati[r - 1].some((v) => v !== '' && v !== undefined)) return r;
    return 0;
  }
  getMaxRows() { return 1000; }
  getRange(r, c, n, m) { return new Intervallo(this, r, c, n, m); }
  getDataRange() {
    const righe = this.getLastRow();
    const colonne = Math.max(1, ...this.dati.slice(0, righe).map((r) => r.length));
    return new Intervallo(this, 1, 1, Math.max(righe, 1), colonne);
  }
  appendRow(valori) { const r = this.getLastRow() + 1; valori.forEach((v, j) => this.scrivi(r, j + 1, v)); }
  setFrozenRows() {}
  hideColumns() {}
  setConditionalFormatRules() {}
}

function creaAmbiente({ oggi = '2026-11-13', contesto = 'web' } = {}) {
  const fogli = {};
  const email = [];
  const avvisi = [];
  const trigger = [];
  let ora = new Date(oggi + 'T10:00:00+01:00').getTime();
  const stato = { contesto };

  const RealDate = Date;
  class DataFinta extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(ora); }
    static now() { return ora; }
  }

  const foglioDiCalcolo = {
    getSheetByName: (n) => fogli[n] || null,
    insertSheet: (n) => (fogli[n] = new Foglio(n)),
    setSpreadsheetTimeZone() {},
    getUrl: () => 'https://docs.google.com/spreadsheets/d/FINTO',
    toast: (m) => avvisi.push(m),
  };
  const ui = {
    alert: (m) => avvisi.push(m),
    prompt: () => ({ getSelectedButton: () => 'OK', getResponseText: () => stato.rispostaPrompt || 'Referente prova' }),
    ButtonSet: { OK_CANCEL: 1 },
    Button: { OK: 'OK' },
    createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }),
  };
  const builderRegola = () => {
    const b = new Proxy({}, { get: (_, k) => (k === 'build' ? () => ({}) : () => b) });
    return b;
  };

  const globali = {
    Date: DataFinta,
    console,
    SpreadsheetApp: {
      getActive: () => foglioDiCalcolo,
      getUi: () => {
        if (stato.contesto !== 'foglio') throw new Error('Cannot call SpreadsheetApp.getUi() from this context.');
        return ui;
      },
      newDataValidation: builderRegola,
      newConditionalFormatRule: builderRegola,
    },
    MailApp: { sendEmail: (m) => email.push(m) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      sleep() {},
      formatDate: (d, tz, formato) => {
        const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
          .formatToParts(d).reduce((o, x) => ((o[x.type] = x.value), o), {});
        if (formato !== 'yyyy-MM-dd') throw new Error('formato non simulato: ' + formato);
        return `${p.year}-${p.month}-${p.day}`;
      },
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: (() => {
      const m = new Map();
      return { getScriptCache: () => ({ get: (k) => (m.has(k) ? m.get(k) : null), put: (k, v) => m.set(k, v) }) };
    })(),
    Session: { getActiveUser: () => ({ getEmail: () => (stato.contesto === 'foglio' ? 'volontario@esempio.it' : '') }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/FINTO/exec' }),
      getProjectTriggers: () => trigger.slice(),
      deleteTrigger: (t) => trigger.splice(trigger.indexOf(t), 1),
      newTrigger: (funzione) => {
        const t = { funzione, id: String(Math.floor(Math.random() * 1e12)), getUniqueId() { return this.id; } };
        const b = new Proxy({}, { get: (_, k) => (k === 'create' ? () => (trigger.push(t), t) : () => b) });
        return b;
      },
    },
    HtmlService: {
      createHtmlOutputFromFile: (nome) => ({ getContent: () => fs.readFileSync(path.join(CARTELLA, nome + '.html'), 'utf8') }),
      createTemplateFromFile: (nome) => {
        const t = {
          evaluate() {
            const html = renderizza(fs.readFileSync(path.join(CARTELLA, nome + '.html'), 'utf8'), t, ctx);
            const out = { getContent: () => html, setTitle: () => out, addMetaTag: () => out };
            return out;
          },
        };
        return t;
      },
    },
  };

  const ctx = vm.createContext(globali);
  for (const f of ['Config.gs', 'Logica.gs', 'Codice.gs']) {
    vm.runInContext(fs.readFileSync(path.join(CARTELLA, f), 'utf8'), ctx, { filename: f });
  }

  return {
    ctx,
    fogli,
    email,
    avvisi,
    trigger,
    stato,
    chiama: (nome, ...arg) => vm.runInContext(nome, ctx)(...arg),
    // Simula il passaggio a un altro giorno.
    vaiAl: (giorno) => { ora = new RealDate(giorno + 'T10:00:00+01:00').getTime(); },
    // Simula una modifica fatta a mano nel foglio (fa partire alModificare come il vero automatismo).
    modificaCella: (nomeFoglio, riga, col, valore) => {
      const f = fogli[nomeFoglio];
      const vecchio = f.leggi(riga, col);
      f.scrivi(riga, col, valore);
      vm.runInContext('alModificare', ctx)({ range: f.getRange(riga, col), value: valore, oldValue: vecchio, user: null });
    },
  };
}

// Motore minimo dei template di Apps Script: <?!= raw ?>, <?= con escape ?>.
function renderizza(sorgente, variabili, ctx) {
  const escape = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return sorgente.replace(/<\?(!?)=\s*([\s\S]*?)\s*\?>/g, (_, raw, espr) => {
    const fn = vm.runInContext(`(function (v) { with (v) { return (${espr}); } })`, ctx);
    const valore = fn(Object.assign(Object.create(null), { include: vm.runInContext('include', ctx) }, variabili));
    return raw ? String(valore) : escape(valore);
  });
}

module.exports = { creaAmbiente };
