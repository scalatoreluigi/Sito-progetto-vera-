// Impostazioni dell'area "Infermieri per le famiglie".
// Le liste (prestazioni, fasce, ecc.) si cambiano qui; i comuni si cambiano nel foglio "Comuni".

const ENTE = {
  nome: 'Progetto Vera e i suoi amici ETS',
  nomeLegale: 'Associazione Progetto Vera e i suoi amici E.T.S.',
  codiceFiscale: '05163990236',
  sede: 'Via Tiro a Segno 9, 37013 Caprino Veronese (VR)',
  email: 'progettoveraeisuoiamici@gmail.com',
  pec: 'associazioneprogettovera@pec.it',
  sito: 'https://progettoveraeisuoiamici.it/',
};

const REGOLE = {
  anniValiditaProfilo: 1,      // ogni quanto l'infermiere deve confermare i dati
  giorniTolleranzaRinnovo: 30, // dopo la scadenza, quanti giorni per confermare prima della sospensione
  giorniPromemoriaRinnovo: 20, // dopo quanti giorni dalla richiesta di rinnovo si manda un promemoria
  giorniAvvisoRc: 30,          // quanti giorni prima della scadenza della polizza RC si manda l'avviso
  giorniRichiestaFerma: 3,     // dopo quanti giorni una richiesta non chiusa viene segnalata nel riepilogo
  richiesteOra: 30,            // massimo di richieste dal modulo in un'ora (contro lo spam)
};

const FOGLI = {
  infermieri: 'Infermieri',
  famiglie: 'Famiglie',
  comuni: 'Comuni',
  registro: 'Registro',
  richieste: 'Richieste',
  cerca: 'Cerca',
};

const STATI = {
  attesa: 'In attesa',
  attivo: 'Attivo',
  rifiutato: 'Rifiutato',
  sospeso: 'Sospeso',
};

const PRESTAZIONI = [
  'Cateterismo intermittente pulito',
  'Iniezioni sottocutanee',
  'Iniezioni intramuscolari',
  'Gestione PEG',
  'Medicazioni',
  'Altro',
];

const LUOGHI = ['Scuola', 'Domicilio', 'Entrambi'];
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const FASCE = ['Mattina (7-12)', 'Pranzo (12-14)', 'Pomeriggio (14-19)', 'Sera (19-22)'];

// Ordine delle colonne nel foglio "Infermieri". Non cambiare i nomi dopo la prima installazione.
const COLONNE = {
  id: 'ID',
  dataIscrizione: 'Data iscrizione',
  stato: 'Stato',
  nome: 'Nome',
  cognome: 'Cognome',
  telefono: 'Telefono',
  email: 'Email',
  numeroOpi: 'Numero iscrizione OPI',
  provinciaOpi: 'Provincia OPI',
  comuni: 'Comuni coperti',
  prestazioni: 'Prestazioni',
  altraPrestazione: 'Altra prestazione',
  luogo: 'Luogo',
  giorni: 'Giorni',
  fasce: 'Fasce orarie',
  rc: 'Polizza RC',
  scadenzaRc: 'Scadenza RC',
  presentazione: 'Presentazione',
  esperienzaPediatrica: 'Esperienza pediatrica',
  tariffa: 'Tariffa indicativa',
  consensoPrivacy: 'Presa visione informativa',
  consensoContatti: 'Consenso condivisione contatti',
  dichiarazione: 'Dichiarazione albo e RC',
  verificaAlbo: 'Verifica albo OK',
  verificaRc: 'Verifica RC OK',
  dataVerifica: 'Data verifica',
  verificatoDa: 'Verificato da',
  notaInterna: 'Nota interna',
  scadenzaRinnovo: 'Scadenza rinnovo',
  rinnovoRichiesto: 'Rinnovo richiesto il',
  avvisoRc: 'Avviso RC inviato il',
  motivoSospensione: 'Motivo sospensione',
  token: 'Token',
};

// Esito di una richiesta, da aggiornare a mano nel foglio "Richieste".
const ESITI = {
  daGestire: 'Da gestire',
  abbinata: 'Abbinata',
  nessuno: 'Nessun infermiere disponibile',
  annullata: 'Annullata',
};

// Il foglio "Richieste" è anonimo: niente nomi, niente telefoni, niente comune (solo la zona).
// Serve a sapere se il servizio funziona: quante richieste, quante abbinate, in quanti giorni.
const COLONNE_RICHIESTE = ['ID', 'Arrivata il', 'Zona', 'Prestazione', 'Luogo', 'Infermieri trovati', 'Esito', 'Chiusa il', 'Giorni'];

const COLONNE_FAMIGLIE = ['Codice', 'Referente', 'Attivo', 'Creato il', 'Ultimo accesso', 'Accessi', 'Note'];
const COLONNE_REGISTRO = ['Data', 'Evento', 'ID', 'Dettagli'];

// Comuni di partenza (zona Garda, Baldo e Verona). Si modificano dal foglio "Comuni".
const COMUNI_INIZIALI = {
  'Garda': ['Affi', 'Bardolino', 'Brenzone sul Garda', 'Castelnuovo del Garda', 'Cavaion Veronese',
    'Costermano sul Garda', 'Garda', 'Lazise', 'Malcesine', 'Peschiera del Garda', 'Torri del Benaco'],
  'Baldo': ['Brentino Belluno', 'Caprino Veronese', 'Dolcè', 'Ferrara di Monte Baldo',
    'Rivoli Veronese', 'San Zeno di Montagna'],
  'Verona': ['Verona'],
};

const CLAUSOLA_RUOLO = 'Progetto Vera e i suoi amici ETS mette in contatto famiglie e infermieri, ' +
  'ma non sceglie, non garantisce e non è parte della prestazione. ' +
  'Il rapporto professionale e il pagamento sono tra famiglia e infermiere.';
