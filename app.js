/* Ordem em Campo — app offline para autônomos de serviços de campo.
   Dados ficam no próprio aparelho (IndexedDB). Sem servidor, sem conta. */
'use strict';

/* ================= utilidades ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const nowISO = () => new Date().toISOString();
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const money = v => BRL.format(Number(v) || 0);
const fmtQ = n => String(Math.round((Number(n) || 0) * 1000) / 1000).replace('.', ',');
const fmtIn = n => (Number(n) || 0).toFixed(2).replace('.', ',');
function parseNum(s) {
  if (typeof s === 'number') return s;
  s = String(s ?? '').trim().replace(/[^\d,.\-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}
const pad = n => String(n).padStart(2, '0');
const localDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => localDate(new Date());
function addDays(str, n) { const [y, m, d] = str.split('-').map(Number); return localDate(new Date(y, m - 1, d + n)); }
function fmtDate(s) { if (!s) return ''; const [y, m, d] = String(s).slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
function fmtDT(s) {
  if (!s) return '';
  const d = new Date(s); if (isNaN(d)) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtWhen(s) { // data agendada em linguagem de campo
  if (!s) return '';
  const day = s.slice(0, 10), t = s.length > 10 ? s.slice(11, 16) : '';
  const hoje = todayStr();
  const lbl = day === hoje ? 'Hoje' : day === addDays(hoje, 1) ? 'Amanhã' : day === addDays(hoje, -1) ? 'Ontem' : fmtDate(day).slice(0, 5);
  return t ? `${lbl}, ${t}` : lbl;
}
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
function dayLabel(d) {
  const hoje = todayStr();
  if (d === hoje) return 'Hoje';
  if (d === addDays(hoje, 1)) return 'Amanhã';
  if (d === addDays(hoje, -1)) return 'Ontem';
  return cap(new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' }));
}
function addMinutesISO(iso, min) { // soma minutos a um 'YYYY-MM-DDTHH:MM' local e devolve no mesmo formato
  const d = new Date(iso); if (isNaN(d)) return iso;
  d.setMinutes(d.getMinutes() + min);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const onlyDigits = s => String(s || '').replace(/\D/g, '');
function fmtTel(t) {
  const d = onlyDigits(t).replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || '';
}
const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = s => semAcento(s).toLowerCase();
const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

/* ================= ícones ================= */
const P = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  orc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h5"/>',
  os: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M9 13l2 2 4-4"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  more: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  wa: '<path d="M4 20l1.3-4.1A8 8 0 1 1 8.2 18.8z"/><path d="M9.2 9c0 3.2 2.6 5.8 5.8 5.8l1-1.4-2-1-1 .7a4 4 0 0 1-2-2l.7-1-1-2z"/>',
  print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  box: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  gear: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  down: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
  up: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v3h16v-3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  pen: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M14 7l3 3"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  pix: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M8.5 12h7"/>',
  contacts: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M7.5 17a4.5 4.5 0 0 1 9 0"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  install: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 4.5 1.6 5.8 2 6.2a.6.6 0 0 1-.4 1H4.4a.6.6 0 0 1-.4-1c.4-.4 2-1.7 2-6.2z"/><path d="M10 19a2 2 0 0 0 4 0"/>'
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ================= banco local (IndexedDB) ================= */
const STORES = ['clientes', 'produtos', 'movimentos', 'orcamentos', 'os', 'cobrancas', 'fotos', 'meta'];
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('ordem-em-campo', 1);
      r.onupgradeneeded = () => { const db = r.result; for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); };
      r.onsuccess = () => { DB.db = r.result; res(); };
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('Banco bloqueado por outra aba aberta'));
    });
  },
  req(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = DB.db.transaction(store, mode); let out;
      const r = fn(t.objectStore(store));
      if (r) r.onsuccess = () => { out = r.result; };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error('abortado'));
    });
  },
  all: s => DB.req(s, 'readonly', st => st.getAll()),
  get: (s, id) => DB.req(s, 'readonly', st => st.get(id)),
  put: (s, o) => DB.req(s, 'readwrite', st => st.put(o)),
  del: (s, id) => DB.req(s, 'readwrite', st => st.delete(id)),
  clear: s => DB.req(s, 'readwrite', st => st.clear()),
  putMany(s, arr) {
    return new Promise((res, rej) => {
      const t = DB.db.transaction(s, 'readwrite'); const st = t.objectStore(s);
      for (const o of arr) st.put(o);
      t.oncomplete = () => res(); t.onerror = () => rej(t.error);
    });
  }
};

/* ================= estado em memória ================= */
const S = { clientes: {}, produtos: {}, movimentos: {}, orcamentos: {}, os: {}, cobrancas: {}, meta: {}, cfg: null };
const DEFAULT_CFG = {
  id: 'config', onboarded: false, nome: '', profissao: '', tel: '', doc: '', endereco: '', cidade: '',
  logo: '', pixTipo: 'cel', pixChave: '', pixNome: '', pixCidade: '',
  validadePadrao: 7, prazoCobranca: 0, rodape: 'Garantia de 90 dias sobre a mão de obra.',
  tema: 'auto', lastBackup: '', seq: { orc: 0, os: 0, cob: 0 },
  notif: { ativo: false, antecedenciaMin: 30 }
};
const list = store => Object.values(S[store]);

async function loadAll() {
  for (const s of STORES) {
    if (s === 'fotos') continue;
    const arr = await DB.all(s);
    S[s] = Object.fromEntries(arr.map(o => [o.id, o]));
  }
  S.cfg = Object.assign({}, DEFAULT_CFG, S.meta.config || {});
  S.cfg.seq = Object.assign({ orc: 0, os: 0, cob: 0 }, S.cfg.seq || {});
  S.cfg.notif = Object.assign({ ativo: false, antecedenciaMin: 30 }, S.cfg.notif || {});
  S.meta.config = S.cfg;
}

async function save(store, obj, { silent } = {}) {
  if (store !== 'meta') { obj.atualizadoEm = nowISO(); if (!obj.criadoEm) obj.criadoEm = obj.atualizadoEm; }
  S[store][obj.id] = obj;
  try { await DB.put(store, obj); }
  catch (e) { console.error(e); if (!silent) toast('Não foi possível salvar no aparelho. Verifique o espaço livre.'); }
  return obj;
}
async function remove(store, id) { delete S[store][id]; try { await DB.del(store, id); } catch (e) { console.error(e); } }
const saveCfg = () => save('meta', S.cfg);

function nextNum(kind) { S.cfg.seq[kind] = (S.cfg.seq[kind] || 0) + 1; saveCfg(); return S.cfg.seq[kind]; }
const numStr = n => String(n || 0).padStart(4, '0');

/* ================= fotos ================= */
const fotoCache = new Map();
async function getFoto(id) {
  if (fotoCache.has(id)) return fotoCache.get(id);
  const f = await DB.get('fotos', id).catch(() => null);
  const url = f ? f.dataUrl : '';
  fotoCache.set(id, url); return url;
}
function compressImage(file, max = 1280, q = 0.72) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Imagem inválida')); };
    img.src = url;
  });
}
async function hydratePhotos(root = document) {
  for (const img of $$('img[data-foto]', root)) {
    if (img.getAttribute('src')) continue;
    const u = await getFoto(img.dataset.foto); if (u) img.src = u;
  }
}

/* ================= cálculos ================= */
function calc(o) {
  const sub = round2((o.itens || []).reduce((a, it) => a + (Number(it.qtd) || 0) * (Number(it.preco) || 0), 0));
  const desc = Math.min(round2(Number(o.desconto) || 0), sub);
  return { sub, desc, total: round2(sub - desc) };
}
const cliente = id => (id && S.clientes[id]) || null;
const nomeCli = id => cliente(id)?.nome || (id ? 'Cliente removido' : 'Sem cliente');
const isMaterial = p => p && p.tipo === 'material';
const estoqueCritico = () => list('produtos').filter(p => isMaterial(p) && ((p.qtd || 0) < 0 || (p.minimo > 0 && (p.qtd || 0) <= p.minimo)));
const cobVencida = c => c.status === 'aberta' && c.vencimento && c.vencimento < todayStr();

/* ================= Pix (BR Code estático, padrão EMV do Banco Central) ================= */
const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
function crc16(s) {
  let crc = 0xFFFF;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
function pixKey(cfg = S.cfg) {
  const k = String(cfg.pixChave || '').trim(); if (!k) return '';
  switch (cfg.pixTipo) {
    case 'doc': return onlyDigits(k);
    case 'cel': { let d = onlyDigits(k); if (d.length <= 11) d = '55' + d; return '+' + d; }
    case 'email': return k.toLowerCase();
    default: return k;
  }
}
const pixTexto = s => semAcento(s).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
function pixPayload({ valor = 0, txid = '', chave, nome, cidade } = {}) {
  const key = chave || pixKey(); if (!key) return '';
  const mai = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  let p = tlv('00', '01') + tlv('26', mai) + tlv('52', '0000') + tlv('53', '986');
  if (valor > 0) p += tlv('54', round2(valor).toFixed(2));
  p += tlv('58', 'BR');
  p += tlv('59', (pixTexto(nome ?? (S.cfg.pixNome || S.cfg.nome)) || 'RECEBEDOR').slice(0, 25));
  p += tlv('60', (pixTexto(cidade ?? (S.cfg.pixCidade || S.cfg.cidade)) || 'BRASIL').slice(0, 15));
  const tx = String(txid).replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  p += tlv('62', tlv('05', tx));
  p += '6304';
  return p + crc16(p);
}
function qrSVG(text) {
  try { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 8, scalable: true }); }
  catch (e) { console.error(e); return ''; }
}
const PIX_TIPOS = { cel: 'Celular', doc: 'CPF/CNPJ', email: 'E-mail', aleatoria: 'Chave aleatória' };

/* ================= calendário do celular (.ics) ================= */
// Complementa os lembretes do app: um evento no Calendário do sistema notifica mesmo com o app fechado.
function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
function icsDate(iso) { const d = new Date(iso); if (isNaN(d)) return ''; return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`; }
function buildICS(events) {
  const now = icsDate(nowISO());
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Ordem em Campo//PT-BR', 'CALSCALE:GREGORIAN'];
  for (const e of events) {
    lines.push('BEGIN:VEVENT', 'UID:' + e.id + '@ordememcampo.app', 'DTSTAMP:' + now,
      'DTSTART:' + icsDate(e.start), 'DTEND:' + icsDate(e.end), 'SUMMARY:' + icsEscape(e.title));
    if (e.desc) lines.push('DESCRIPTION:' + icsEscape(e.desc));
    if (e.loc) lines.push('LOCATION:' + icsEscape(e.loc));
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEscape(e.title), 'TRIGGER:-PT15M', 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
async function exportICS(events, filename) {
  if (!events.length) { toast('Nada agendado para exportar'); return; }
  const blob = new Blob([buildICS(events)], { type: 'text/calendar' });
  if (navigator.canShare) {
    const file = new File([blob], filename, { type: 'text/calendar' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Agenda' }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function osToEvent(o) {
  return { id: o.id, start: o.agendadaPara, end: addMinutesISO(o.agendadaPara, 60), title: 'OS ' + numStr(o.numero) + ' · ' + nomeCli(o.clienteId), desc: o.descricao, loc: o.endereco };
}

/* ================= WhatsApp ================= */
function waNumber(tel) { let d = onlyDigits(tel).replace(/^0+/, ''); if (d && d.length <= 11) d = '55' + d; return d; }
function openWhatsApp(tel, text) {
  const d = waNumber(tel); const q = 'text=' + encodeURIComponent(text);
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // No celular o esquema whatsapp:// abre o app mesmo sem internet; a mensagem sai quando a rede voltar.
  const url = mobile ? `whatsapp://send?${d ? 'phone=' + d + '&' : ''}${q}` : `https://wa.me/${d}?${q}`;
  const a = document.createElement('a'); a.href = url; a.rel = 'noopener'; if (!mobile) a.target = '_blank';
  document.body.appendChild(a); a.click(); a.remove();
}
function assinaturaTxt() {
  const c = S.cfg; const l = [c.nome, c.profissao].filter(Boolean).join(' · ');
  return [l, c.tel ? fmtTel(c.tel) : ''].filter(Boolean).join('\n');
}
function itensTxt(o) {
  return (o.itens || []).map(it => `• ${fmtQ(it.qtd)} ${it.unidade || 'un'} × ${it.descricao || 'Item'} — ${money(it.qtd * it.preco)}`).join('\n');
}
function msgOrcamento(o) {
  const c = cliente(o.clienteId); const t = calc(o);
  const venc = addDays((o.criadoEm || nowISO()).slice(0, 10), Number(o.validadeDias) || 0);
  return [
    `Olá${c ? ', ' + c.nome.split(' ')[0] : ''}! Segue o orçamento nº ${numStr(o.numero)}:`, '',
    itensTxt(o), '',
    t.desc > 0 ? `Subtotal: ${money(t.sub)}\nDesconto: − ${money(t.desc)}` : '',
    `*Total: ${money(t.total)}*`,
    o.validadeDias ? `Válido até ${fmtDate(venc)}.` : '',
    o.obs ? `\n${o.obs}` : '', '',
    'Para aprovar, é só responder esta mensagem.', '',
    assinaturaTxt()
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function msgCobranca(cb) {
  const c = cliente(cb.clienteId); const pix = pixPayload({ valor: cb.valor, txid: 'COB' + numStr(cb.numero) });
  const venc = cb.vencimento ? (cobVencida(cb) ? `Venceu em ${fmtDate(cb.vencimento)}` : `Vencimento: ${fmtDate(cb.vencimento)}`) : '';
  return [
    `Olá${c ? ', ' + c.nome.split(' ')[0] : ''}! Segue a cobrança${cb.descricao ? ' referente a ' + cb.descricao : ''}.`, '',
    `*Valor: ${money(cb.valor)}*`, venc, '',
    pix ? 'Pague com Pix *copia e cola* (copie o código abaixo no app do banco):' : '',
    pix, pix ? '' : '',
    S.cfg.pixChave ? `Ou use a chave Pix (${PIX_TIPOS[S.cfg.pixTipo] || 'chave'}): ${S.cfg.pixChave}` : '',
    '', 'Obrigado pela preferência!', assinaturaTxt()
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function msgOS(o) {
  const c = cliente(o.clienteId); const nome = c ? ', ' + c.nome.split(' ')[0] : '';
  if (o.status === 'concluida') {
    const t = calc(o);
    return [`Olá${nome}! Serviço da OS nº ${numStr(o.numero)} concluído.`, '',
      o.itens?.length ? itensTxt(o) : '', o.itens?.length ? `*Total: ${money(t.total)}*` : '',
      o.laudo ? `\nLaudo técnico:\n${o.laudo}` : '', S.cfg.rodape ? `\n${S.cfg.rodape}` : '', '', assinaturaTxt()]
      .join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  if (o.agendadaPara) {
    return [`Olá${nome}! Confirmando o atendimento${o.descricao ? ' (' + o.descricao.split('\n')[0] + ')' : ''}:`, '',
      `Data: ${fmtDate(o.agendadaPara)}${o.agendadaPara.length > 10 ? ' às ' + o.agendadaPara.slice(11, 16) : ''}`,
      o.endereco ? `Local: ${o.endereco}` : '', '', 'Se precisar remarcar, é só avisar por aqui.', '', assinaturaTxt()]
      .join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  return [`Olá${nome}! Sobre a OS nº ${numStr(o.numero)}: status atual — ${OS_ST[o.status]?.l || o.status}.`, '', assinaturaTxt()].join('\n').trim();
}

/* ================= status ================= */
const ORC_ST = {
  rascunho: { l: 'Rascunho', c: '' }, enviado: { l: 'Enviado', c: 'p-info' },
  aprovado: { l: 'Aprovado', c: 'p-ok' }, recusado: { l: 'Recusado', c: 'p-crit' }
};
const OS_ST = {
  pendente: { l: 'Pendente', c: '' }, agendada: { l: 'Agendada', c: 'p-info' },
  andamento: { l: 'Em andamento', c: 'p-warn' }, aguardando: { l: 'Aguardando peça', c: 'p-crit' },
  concluida: { l: 'Concluída', c: 'p-ok' }, cancelada: { l: 'Cancelada', c: '' }
};
const pill = (st, map) => { const s = map[st] || { l: st, c: '' }; return `<span class="pill ${s.c}">${esc(s.l)}</span>`; };
function cobPill(c) {
  if (c.status === 'paga') return '<span class="pill p-ok">Paga</span>';
  if (cobVencida(c)) return '<span class="pill p-crit">Vencida</span>';
  return '<span class="pill p-warn">Em aberto</span>';
}

/* ================= interface: toast, folhas, confirmação ================= */
let toastTimer;
function toast(msg, ms = 2800, action) {
  $('.toast')?.remove(); clearTimeout(toastTimer);
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = esc(msg) + (action ? ` <button class="btn sm primary" style="margin-left:10px">${esc(action.label)}</button>` : '');
  if (action) t.querySelector('button').onclick = () => { t.remove(); action.fn(); };
  document.body.appendChild(t); toastTimer = setTimeout(() => t.remove(), action ? 9000 : ms);
}
let sheetClose = null;
function openSheet(title, html, { onMount, onClose } = {}) {
  closeSheet();
  const layer = $('#layer');
  layer.innerHTML = `<div class="scrim" data-scrim><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-h"><h2>${esc(title)}</h2><button class="iconbtn" data-act="closeSheet" aria-label="Fechar">${icon('x')}</button></div>
    <div class="sheet-b">${html}</div></div></div>`;
  sheetClose = onClose || null;
  $('[data-scrim]').addEventListener('click', e => { if (e.target.dataset.scrim !== undefined) closeSheet(); });
  onMount && onMount($('.sheet'));
}
function closeSheet() { const had = $('#layer').innerHTML; $('#layer').innerHTML = ''; if (had && sheetClose) { const f = sheetClose; sheetClose = null; f(); } }
function confirmSheet(msg, { ok = 'Confirmar', danger = false, title = 'Confirmar' } = {}) {
  return new Promise(res => {
    let done = false;
    openSheet(title, `<p style="margin:0 0 16px;font-size:17px">${msg}</p>
      <div class="btn-grid"><button class="btn" id="cfNo">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cfOk">${esc(ok)}</button></div>`,
      { onClose: () => { if (!done) res(false); } });
    $('#cfNo').onclick = () => { done = true; closeSheet(); res(false); };
    $('#cfOk').onclick = () => { done = true; closeSheet(); res(true); };
  });
}
async function copyText(t, okMsg = 'Copiado') {
  try { await navigator.clipboard.writeText(t); toast(okMsg); }
  catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast(okMsg); } catch { toast('Selecione o texto e copie manualmente'); } ta.remove(); }
}
function applyTheme() {
  const t = S.cfg?.tema || 'auto';
  if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t === 'escuro' ? 'dark' : 'light');
  const dark = t === 'escuro' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name=theme-color]').setAttribute('content', dark ? '#0A1A12' : '#16382A');
}
/* ================= roteador e casca ================= */
const TABS = [
  { id: 'inicio', h: '#/inicio', l: 'Início', i: 'home' },
  { id: 'orc', h: '#/orcamentos', l: 'Orçamentos', i: 'orc' },
  { id: 'os', h: '#/os', l: 'Serviços', i: 'os' },
  { id: 'cli', h: '#/clientes', l: 'Clientes', i: 'users' },
  { id: 'mais', h: '#/mais', l: 'Mais', i: 'more' }
];
const UI = { orcF: 'todos', osF: 'abertas', cobF: 'abertas', estF: 'material', agendaF: '7', q: {} };
let CUR = null;           // documento em edição: {store, id}
const NEW_IDS = new Set(); // documentos recém-criados (apagados se saírem vazios)
let navDepth = 0, lastHash = '';
let LIST = null;          // renderizador de lista com busca

const ROUTES = [
  [/^#\/inicio$/, vInicio], [/^#\/orcamentos$/, vOrcList], [/^#\/orcamento\/([\w-]+)$/, vOrc],
  [/^#\/os$/, vOSList], [/^#\/os\/([\w-]+)$/, vOS], [/^#\/clientes$/, vCliList], [/^#\/cliente\/([\w-]+)$/, vCli],
  [/^#\/estoque$/, vEstoque], [/^#\/produto\/([\w-]+)$/, vProduto], [/^#\/cobrancas$/, vCobList], [/^#\/cobranca\/([\w-]+)$/, vCob],
  [/^#\/agenda$/, vAgenda],
  [/^#\/mais$/, vMais], [/^#\/config$/, vConfig], [/^#\/backup$/, vBackup], [/^#\/doc\/(orc|os|cob)\/([\w-]+)$/, vDoc]
];

const isEmptyDoc = (store, o) => !o || (store === 'orcamentos' && !o.clienteId && !o.itens.length && !o.obs)
  || (store === 'os' && !o.clienteId && !o.itens.length && !o.descricao && !o.fotos.antes.length && !o.fotos.depois.length)
  || (store === 'cobrancas' && !o.clienteId && !o.valor && !o.descricao)
  || (store === 'clientes' && !o.nome && !o.tel)
  || (store === 'produtos' && !o.nome);
const SEQ_OF = { orcamentos: 'orc', os: 'os', cobrancas: 'cob' };

function leaveCurrent(nextHash) {
  if (!CUR) return;
  flush();
  const { store, id } = CUR; const o = S[store][id];
  const stillHere = nextHash && nextHash.includes(id) && !nextHash.startsWith('#/doc/');
  if (!stillHere && NEW_IDS.has(id) && isEmptyDoc(store, o)) {
    const k = SEQ_OF[store];
    if (k && o && o.numero === S.cfg.seq[k]) { S.cfg.seq[k]--; saveCfg(); }
    remove(store, id);
  }
  if (!stillHere) NEW_IDS.delete(id);
  CUR = null;
}

function render(keepScroll) {
  const h = location.hash || '#/inicio';
  if (h !== lastHash) { leaveCurrent(h); }
  const y = keepScroll ? scrollY : 0;
  $('#layer').innerHTML = ''; sheetClose = null;
  document.body.classList.remove('show-doc');
  let r = null;
  for (const [re, fn] of ROUTES) { const m = h.match(re); if (m) { r = fn(...m.slice(1)); break; } }
  if (!r) { location.replace('#/inicio'); return; }
  if (r.redirect) { location.replace(r.redirect); return; }
  lastHash = h;
  document.title = r.title === 'Início' ? 'Ordem em Campo' : r.title + ' · Ordem em Campo';
  $('#title').textContent = r.title;
  $('#backBtn').hidden = !r.back; $('#backBtn').dataset.parent = r.back || '';
  const crit = estoqueCritico().length;
  $('#tabbar').innerHTML = TABS.map(t => `<a href="${t.h}" class="${t.id === r.tab ? 'on' : ''}" ${t.id === r.tab ? 'aria-current="page"' : ''}>${icon(t.i)}<span>${t.l}</span>${t.id === 'mais' && crit ? `<span class="badge-dot">${crit}</span>` : ''}</a>`).join('');
  if (r.doc) return;
  $('#view').innerHTML = r.html;
  r.after && r.after();
  hydratePhotos($('#view'));
  scrollTo(0, y);
}
const rerender = () => render(true);
function go(h) { navDepth++; location.hash = h; }
function goBack() {
  const parent = $('#backBtn').dataset.parent || '#/inicio';
  if (navDepth > 0) { navDepth--; history.back(); } else location.replace(parent);
}

/* autosave do documento aberto */
let saveTimer = null;
const curObj = () => CUR && S[CUR.store][CUR.id];
function touch() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 350); }
function flush() { if (!saveTimer) return; clearTimeout(saveTimer); saveTimer = null; const o = curObj(); if (o) save(CUR.store, o); }

/* ================= pedaços reutilizáveis ================= */
const searchBox = (ph, key) => `<div class="search">${icon('search')}<input class="inp" type="search" placeholder="${esc(ph)}" data-search="${key}" value="${esc(UI.q[key] || '')}" aria-label="${esc(ph)}"></div>`;
const matchQ = (key, ...fields) => { const q = norm(UI.q[key] || '').trim(); if (!q) return true; return fields.some(f => norm(f).includes(q)); };
function chips(items, cur, act) {
  return `<div class="chips" role="tablist">${items.map(([v, l]) => `<button class="chip ${v === cur ? 'on' : ''}" role="tab" aria-selected="${v === cur}" data-act="${act}" data-v="${v}">${esc(l)}</button>`).join('')}</div>`;
}
function clienteBlock(o) {
  const c = cliente(o.clienteId);
  if (!c) return `<button class="btn primary block" data-act="pickCliente">${icon('users')} Escolher cliente</button>`;
  return `<div class="card row">
    <div class="grow"><div style="font-weight:750;font-size:17px">${esc(c.nome)}</div>
      <div class="muted small">${esc(fmtTel(c.tel) || 'Sem telefone')}${c.endereco ? ' · ' + esc(c.endereco) : ''}</div></div>
    <button class="btn sm" data-act="pickCliente">Trocar</button></div>`;
}
function itemsHTML(o) {
  if (!o.itens.length) return `<div class="empty small"><b>Nenhum item ainda</b>Toque em “Do catálogo” para somar serviços e materiais.</div>`;
  return o.itens.map((it, i) => {
    const p = it.produtoId && S.produtos[it.produtoId];
    const est = isMaterial(p) ? ` · estoque ${fmtQ(p.qtd)} ${esc(p.unidade || '')}` : '';
    return `<div class="item">
      <div class="desc"><span class="tag">${it.tipo === 'material' ? 'Material' : 'Serviço'}${est}</span>
        <input class="inp" data-it="${i}" data-k="descricao" value="${esc(it.descricao)}" placeholder="Descrição do item" aria-label="Descrição do item ${i + 1}"></div>
      <button class="iconbtn rm" data-act="rmItem" data-i="${i}" aria-label="Remover item">${icon('trash')}</button>
      <div class="nums">
        <label class="f">Qtd (${esc(it.unidade || 'un')})<input class="inp num" inputmode="decimal" data-it="${i}" data-k="qtd" value="${fmtQ(it.qtd)}"></label>
        <label class="f">Valor unit. (R$)<input class="inp num" inputmode="decimal" data-it="${i}" data-k="preco" value="${fmtIn(it.preco)}"></label>
        <div class="sub money" id="sub-${i}">${money(it.qtd * it.preco)}</div>
      </div></div>`;
  }).join('');
}
function totalsHTML(o) {
  const t = calc(o);
  return `<div class="totals">
    <span class="muted">Subtotal</span><span class="money" id="tot-sub">${money(t.sub)}</span>
    <span class="muted">Desconto</span><span class="money" id="tot-desc">− ${money(t.desc)}</span>
    <span style="font-weight:750;align-self:end">Total</span><span class="money grand" id="tot-total">${money(t.total)}</span></div>`;
}
function updateTotals() {
  const o = curObj(); if (!o || !o.itens) return; const t = calc(o);
  o.itens.forEach((it, i) => { const e = $('#sub-' + i); if (e) e.textContent = money(it.qtd * it.preco); });
  const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  set('#tot-sub', money(t.sub)); set('#tot-desc', '− ' + money(t.desc)); set('#tot-total', money(t.total)); set('#sticky-total', money(t.total));
}
function itemsSection(o) {
  return `<div class="sec-title">Itens <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:600">${plural(o.itens.length, 'item', 'itens')}</span></div>
  <div class="card"><div class="items" id="items">${itemsHTML(o)}</div>
    <div class="btn-grid" style="margin-top:12px"><button class="btn primary" data-act="pickItem">${icon('plus')} Do catálogo</button>
    <button class="btn" data-act="addAvulso">${icon('pen')} Item avulso</button></div></div>
  <div class="sec-title">Totais</div>
  <div class="card form">
    <label class="f">Desconto (R$)<input class="inp num" inputmode="decimal" data-f="desconto" data-type="num" data-live="1" value="${fmtIn(o.desconto)}"></label>
    ${totalsHTML(o)}</div>
  <div class="sticky-total"><span>Total</span><b class="money" id="sticky-total">${money(calc(o).total)}</b></div>`;
}

/* ================= INÍCIO ================= */
function vInicio() {
  const c = S.cfg;
  if (!c.onboarded) return { title: 'Bem-vindo', tab: 'inicio', html: onboardingHTML() };
  const hoje = todayStr();
  const osAbertas = list('os').filter(o => !['concluida', 'cancelada'].includes(o.status));
  const osHoje = osAbertas.filter(o => (o.agendadaPara || '').startsWith(hoje));
  const orcAguard = list('orcamentos').filter(o => o.status === 'enviado');
  const cobAb = list('cobrancas').filter(x => x.status === 'aberta');
  const venc = cobAb.filter(cobVencida);
  const crit = estoqueCritico();
  const aReceber = cobAb.reduce((a, x) => a + (Number(x.valor) || 0), 0);
  const prox = osAbertas.slice().sort((a, b) => (a.agendadaPara || '9999').localeCompare(b.agendadaPara || '9999')).slice(0, 5);
  const temDados = list('clientes').length + list('orcamentos').length + list('os').length > 0;
  const semBackup = temDados && (!c.lastBackup || (Date.now() - new Date(c.lastBackup)) > 7 * 864e5);
  const semPix = !c.pixChave;
  const semLogo = temDados && !c.logo;
  return {
    title: 'Início', tab: 'inicio', html: `
    <div class="row" style="margin:2px 2px 14px">
      ${c.logo ? `<img src="${c.logo}" alt="Logo" style="width:52px;height:52px;border-radius:12px;object-fit:contain;background:#fff;border:1px solid var(--line);flex:none">` : ''}
      <div class="grow">
      <div style="font-size:24px;font-weight:800;letter-spacing:-.02em">${saudacao()}${c.nome ? ', ' + esc(c.nome.split(' ')[0]) : ''}</div>
      <div class="muted">${esc(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))}</div></div></div>
    <div class="big-actions">
      <button class="btn primary" data-act="newOrc">${icon('orc')} Novo orçamento</button>
      <button class="btn dark" data-act="newOS">${icon('os')} Nova OS</button>
    </div>
    <div class="sec-title">Resumo</div>
    <div class="tiles">
      <a class="tile" href="#/os"><span class="k">Serviços abertos</span><span class="n num">${osAbertas.length}</span><span class="d">${osHoje.length ? plural(osHoje.length, 'para hoje', 'para hoje') : 'nenhum para hoje'}</span></a>
      <a class="tile" href="#/orcamentos" data-act="filtroOrc" data-v="enviado"><span class="k">Orçamentos aguardando</span><span class="n num">${orcAguard.length}</span><span class="d money">${money(orcAguard.reduce((a, o) => a + calc(o).total, 0))}</span></a>
      <a class="tile ${venc.length ? 'alert' : ''}" href="#/cobrancas"><span class="k">A receber</span><span class="n money" style="font-size:22px">${money(aReceber)}</span><span class="d" ${venc.length ? 'style="color:var(--crit);font-weight:700"' : ''}>${venc.length ? plural(venc.length, 'cobrança vencida', 'cobranças vencidas') : plural(cobAb.length, 'cobrança em aberto', 'cobranças em aberto')}</span></a>
      <a class="tile ${crit.length ? 'warn' : ''}" href="#/estoque"><span class="k">Estoque baixo</span><span class="n num">${crit.length}</span><span class="d">${crit.length ? esc(crit.slice(0, 2).map(p => p.nome).join(', ')) : 'tudo em ordem'}</span></a>
    </div>
    ${semPix || semLogo || semBackup ? '<div class="sec-title">Atenção</div><div class="stack">' : ''}
    ${semLogo ? `<a class="banner info" href="#/config" style="text-decoration:none">${icon('camera')}<div><b>Coloque a logo da sua empresa</b><br>Ela aparece aqui no Início e no cabeçalho dos orçamentos e OS em PDF.</div></a>` : ''}
    ${semPix ? `<a class="banner info" href="#/config" style="text-decoration:none">${icon('pix')}<div><b>Cadastre sua chave Pix</b><br>Assim as cobranças já saem com o código Pix copia e cola.</div></a>` : ''}
    ${semBackup ? `<a class="banner warn" href="#/backup" style="text-decoration:none">${icon('alert')}<div><b>Faça uma cópia de segurança</b><br>Seus dados ficam só neste celular. ${c.lastBackup ? 'Último backup em ' + fmtDate(c.lastBackup) + '.' : 'Nenhum backup feito ainda.'}</div></a>` : ''}
    ${semPix || semLogo || semBackup ? '</div>' : ''}
    <div class="sec-title">Próximos serviços <a href="#/agenda">Ver agenda</a></div>
    ${prox.length ? `<div class="list">${prox.map(osRow).join('')}</div>` : `<div class="card empty"><b>Agenda livre</b>Crie uma OS ou aprove um orçamento.</div>`}
    <div class="sec-title">Atalhos</div>
    <div class="btn-grid">
      <button class="btn" data-act="newCob">${icon('cash')} Nova cobrança</button>
      <button class="btn" data-act="newCli">${icon('users')} Novo cliente</button>
    </div>`
  };
}
function saudacao() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
function onboardingHTML() {
  return `<div class="stack">
    <div class="card" style="background:var(--brand);color:var(--brand-ink);border:0">
      <div style="font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.15">Seu escritório no bolso.</div>
      <p style="margin:8px 0 0;opacity:.9">Orçamento em menos de um minuto, OS com fotos e assinatura, estoque e cobrança Pix pelo WhatsApp. Funciona sem internet: tudo fica guardado neste aparelho.</p>
    </div>
    <div class="card form">
      <label class="f">Seu nome ou nome da empresa<input class="inp" id="obNome" autocomplete="name" placeholder="Ex.: João Eletricista"></label>
      <label class="f">Sua profissão<input class="inp" id="obProf" placeholder="Ex.: Eletricista, Encanador, Refrigeração"></label>
      <label class="f">Seu WhatsApp<input class="inp" id="obTel" inputmode="tel" autocomplete="tel" placeholder="(18) 99999-9999"></label>
      <button class="btn primary block" data-act="obStart" data-ex="0">Começar</button>
      <button class="btn block" data-act="obStart" data-ex="1">Começar com dados de exemplo</button>
      <p class="hint" style="margin:0">Os exemplos vêm marcados e podem ser apagados depois em Mais › Backup e dados.</p>
    </div></div>`;
}

/* ================= ORÇAMENTOS ================= */
function orcRow(o) {
  const t = calc(o);
  return `<a class="li" href="#/orcamento/${o.id}" data-nav>
    <div class="grow"><div class="t">Nº ${numStr(o.numero)} · ${esc(nomeCli(o.clienteId))}</div>
    <div class="s">${fmtDate(o.criadoEm)} · ${plural(o.itens.length, 'item', 'itens')}${o.itens[0] ? ' · ' + esc(o.itens[0].descricao) : ''}</div></div>
    <div class="v"><span class="money">${money(t.total)}</span><small>${pill(o.status, ORC_ST)}</small></div></a>`;
}
function vOrcList() {
  const F = [['todos', 'Todos'], ['rascunho', 'Rascunhos'], ['enviado', 'Enviados'], ['aprovado', 'Aprovados'], ['recusado', 'Recusados']];
  LIST = () => {
    const arr = list('orcamentos').filter(o => (UI.orcF === 'todos' || o.status === UI.orcF) && matchQ('orc', nomeCli(o.clienteId), numStr(o.numero), ...o.itens.map(i => i.descricao)))
      .sort((a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || ''));
    return arr.length ? `<div class="list">${arr.map(orcRow).join('')}</div>` : `<div class="card empty"><b>Nenhum orçamento aqui</b>Toque em “Novo orçamento” para criar o primeiro.</div>`;
  };
  return {
    title: 'Orçamentos', tab: 'orc', html: `<div class="stack">
    <button class="btn primary block" data-act="newOrc">${icon('plus')} Novo orçamento</button>
    ${searchBox('Buscar por cliente, número ou item', 'orc')}
    ${chips(F, UI.orcF, 'fOrc')}
    <div id="lst">${LIST()}</div></div>`
  };
}
function newDoc(store, extra = {}) {
  const base = { id: uid(), criadoEm: nowISO(), clienteId: null };
  let o;
  if (store === 'orcamentos') o = { ...base, numero: nextNum('orc'), status: 'rascunho', itens: [], desconto: 0, validadeDias: Number(S.cfg.validadePadrao) || 7, obs: '', osId: null };
  if (store === 'os') o = { ...base, numero: nextNum('os'), status: 'pendente', itens: [], desconto: 0, descricao: '', endereco: '', agendadaPara: '', laudo: '', fotos: { antes: [], depois: [] }, assinatura: '', assinadoPor: '', geo: null, estoqueBaixado: false, cobrancaId: null, orcamentoId: null, notif: { lembrete: false, hora: false } };
  if (store === 'cobrancas') o = { ...base, numero: nextNum('cob'), status: 'aberta', valor: 0, vencimento: addDays(todayStr(), Number(S.cfg.prazoCobranca) || 0), descricao: '', osId: null, forma: '', pagaEm: '' };
  if (store === 'clientes') o = { id: uid(), criadoEm: nowISO(), nome: '', tel: '', email: '', doc: '', endereco: '', obs: '' };
  if (store === 'produtos') o = { id: uid(), criadoEm: nowISO(), tipo: 'material', nome: '', unidade: 'un', qtd: 0, minimo: 0, custo: 0, preco: 0 };
  Object.assign(o, extra);
  if (o.clienteId && store === 'os' && !o.endereco) o.endereco = cliente(o.clienteId)?.endereco || '';
  S[store][o.id] = o; save(store, o); NEW_IDS.add(o.id);
  return o;
}
function vOrc(id) {
  const o = S.orcamentos[id]; if (!o) return { redirect: '#/orcamentos' };
  CUR = { store: 'orcamentos', id };
  const os = o.osId && S.os[o.osId];
  const venc = addDays((o.criadoEm || nowISO()).slice(0, 10), Number(o.validadeDias) || 0);
  return {
    title: 'Orçamento ' + numStr(o.numero), tab: 'orc', back: '#/orcamentos', html: `
    <div class="row" style="margin-bottom:12px">${pill(o.status, ORC_ST)}<span class="muted small grow">Criado em ${fmtDate(o.criadoEm)}${o.enviadoEm ? ' · enviado ' + fmtDT(o.enviadoEm) : ''}</span></div>
    <div class="sec-title">Cliente</div>${clienteBlock(o)}
    ${itemsSection(o)}
    <div class="sec-title">Condições</div>
    <div class="card form">
      <label class="f">Validade (dias)<input class="inp num" inputmode="numeric" data-f="validadeDias" data-type="num" value="${esc(o.validadeDias)}"><span class="hint">Vale até ${fmtDate(venc)}</span></label>
      <label class="f">Observações para o cliente<textarea class="inp" data-f="obs" placeholder="Prazo de execução, forma de pagamento, garantia…">${esc(o.obs)}</textarea></label>
    </div>
    <div class="sec-title">Enviar e decidir</div>
    <div class="btn-grid">
      <button class="btn wa full" data-act="waOrc">${icon('wa')} Enviar no WhatsApp</button>
      <button class="btn" data-act="doc" data-k="orc">${icon('print')} PDF</button>
      <button class="btn" data-act="dupOrc">${icon('copy')} Duplicar</button>
      ${os ? `<a class="btn dark full" href="#/os/${os.id}" data-nav>${icon('os')} Ver OS nº ${numStr(os.numero)}</a>`
        : `<button class="btn primary full" data-act="aprovarOrc">${icon('check')} Cliente aprovou → gerar OS</button>`}
      ${o.status !== 'recusado' && !os ? `<button class="btn" data-act="recusarOrc">Recusado</button>` : ''}
      <button class="btn danger" data-act="delDoc">${icon('trash')} Excluir</button>
    </div>`
  };
}

/* ================= ORDENS DE SERVIÇO ================= */
function osRow(o) {
  const t = calc(o);
  return `<a class="li" href="#/os/${o.id}" data-nav>
    <div class="grow"><div class="t">OS ${numStr(o.numero)} · ${esc(nomeCli(o.clienteId))}</div>
    <div class="s">${o.agendadaPara ? `<b style="color:var(--ink)">${esc(fmtWhen(o.agendadaPara))}</b> · ` : ''}${esc((o.descricao || o.itens[0]?.descricao || 'Sem descrição').split('\n')[0])}</div></div>
    <div class="v">${t.total ? `<span class="money">${money(t.total)}</span>` : ''}<small>${pill(o.status, OS_ST)}</small></div></a>`;
}
function vOSList() {
  const F = [['abertas', 'Abertas'], ['hoje', 'Hoje'], ['pendente', 'Pendentes'], ['agendada', 'Agendadas'], ['andamento', 'Em andamento'], ['aguardando', 'Aguard. peça'], ['concluida', 'Concluídas'], ['todas', 'Todas']];
  LIST = () => {
    const hoje = todayStr();
    const arr = list('os').filter(o => {
      const f = UI.osF;
      const ok = f === 'todas' || (f === 'abertas' ? !['concluida', 'cancelada'].includes(o.status) : f === 'hoje' ? (o.agendadaPara || '').startsWith(hoje) : o.status === f);
      return ok && matchQ('os', nomeCli(o.clienteId), numStr(o.numero), o.descricao, o.endereco);
    }).sort((a, b) => UI.osF === 'concluida' || UI.osF === 'todas'
      ? (b.criadoEm || '').localeCompare(a.criadoEm || '')
      : (a.agendadaPara || '9999').localeCompare(b.agendadaPara || '9999'));
    return arr.length ? `<div class="list">${arr.map(osRow).join('')}</div>` : `<div class="card empty"><b>Nenhuma OS aqui</b>Crie uma OS ou aprove um orçamento.</div>`;
  };
  return {
    title: 'Ordens de serviço', tab: 'os', html: `<div class="stack">
    <button class="btn primary block" data-act="newOS">${icon('plus')} Nova ordem de serviço</button>
    ${searchBox('Buscar por cliente, número ou endereço', 'os')}
    ${chips(F, UI.osF, 'fOS')}
    <div id="lst">${LIST()}</div></div>`
  };
}
function photosHTML(o, k) {
  return `<div class="photos">${o.fotos[k].map((fid, i) => `<div class="ph"><img data-foto="${fid}" alt="Foto ${k} ${i + 1}" data-act="viewFoto"><button data-act="rmFoto" data-k="${k}" data-i="${i}" aria-label="Remover foto">×</button></div>`).join('')}
    <label class="ph add">${icon('camera')}<span>Adicionar</span><input type="file" accept="image/*" multiple hidden data-photo="${k}"></label></div>`;
}
function vOS(id) {
  const o = S.os[id]; if (!o) return { redirect: '#/os' };
  CUR = { store: 'os', id };
  const cob = o.cobrancaId && S.cobrancas[o.cobrancaId];
  const orc = o.orcamentoId && S.orcamentos[o.orcamentoId];
  const concl = o.status === 'concluida';
  return {
    title: 'OS ' + numStr(o.numero), tab: 'os', back: '#/os', html: `
    <div class="row" style="margin-bottom:12px">${pill(o.status, OS_ST)}<span class="muted small grow">Aberta em ${fmtDate(o.criadoEm)}${orc ? ` · <a href="#/orcamento/${orc.id}" data-nav>orçamento ${numStr(orc.numero)}</a>` : ''}${concl && o.concluidaEm ? ' · concluída ' + fmtDT(o.concluidaEm) : ''}</span></div>
    <div class="sec-title">Cliente</div>${clienteBlock(o)}
    <div class="sec-title">Situação</div>
    <div class="status-grid">${Object.entries(OS_ST).map(([k, v]) => `<button class="chip ${o.status === k ? 'on' : ''}" data-act="setStatus" data-v="${k}">${esc(v.l)}</button>`).join('')}</div>
    <div class="sec-title">Atendimento</div>
    <div class="card form">
      <label class="f">Data e hora agendada<input class="inp" type="datetime-local" data-f="agendadaPara" value="${esc(o.agendadaPara)}"></label>
      <label class="f">Endereço do serviço<input class="inp" data-f="endereco" value="${esc(o.endereco)}" placeholder="Rua, número, bairro"></label>
      <div class="row wrap">
        <button class="btn sm" data-act="gps">${icon('pin')} ${o.geo ? 'Atualizar localização' : 'Registrar localização (GPS)'}</button>
        ${o.geo ? `<a class="btn sm ghost" target="_blank" rel="noopener" href="https://maps.google.com/?q=${o.geo.lat},${o.geo.lng}">Abrir no mapa</a>` : ''}
      </div>
      ${o.geo ? `<span class="hint num">${o.geo.lat.toFixed(5)}, ${o.geo.lng.toFixed(5)} · precisão ${Math.round(o.geo.acc)} m · ${fmtDT(o.geo.em)}</span>` : ''}
      <label class="f">Problema relatado / o que fazer<textarea class="inp" data-f="descricao" placeholder="Ex.: disjuntor desarmando quando liga o chuveiro">${esc(o.descricao)}</textarea></label>
      ${o.agendadaPara ? `<button class="btn sm" data-act="exportOSIcs" data-id="${o.id}">${icon('calendar')} Adicionar ao calendário do celular</button>` : ''}
    </div>
    ${itemsSection(o)}
    ${o.estoqueBaixado ? `<p class="hint">Materiais já baixados do estoque na conclusão. Itens incluídos depois não mexem no estoque.</p>` : ''}
    <div class="sec-title">Fotos antes</div>${photosHTML(o, 'antes')}
    <div class="sec-title">Fotos depois</div>${photosHTML(o, 'depois')}
    <div class="sec-title">Laudo técnico</div>
    <div class="card"><textarea class="inp" data-f="laudo" placeholder="O que foi encontrado, o que foi feito, recomendações">${esc(o.laudo)}</textarea></div>
    <div class="sec-title">Assinatura do cliente</div>
    <div class="card">${o.assinatura
      ? `<img class="sig-img" src="${o.assinatura}" alt="Assinatura do cliente"><div class="row" style="margin-top:8px"><span class="muted small grow">${esc(o.assinadoPor || '')} ${o.assinadoEm ? '· ' + fmtDT(o.assinadoEm) : ''}</span><button class="btn sm" data-act="sign">Refazer</button></div>`
      : `<button class="btn block" data-act="sign">${icon('pen')} Coletar assinatura na tela</button>`}</div>
    <div class="sec-title">Ações</div>
    <div class="btn-grid">
      ${concl ? '' : `<button class="btn primary full" data-act="concluirOS">${icon('check')} Concluir serviço</button>`}
      <button class="btn wa full" data-act="waOS">${icon('wa')} ${concl ? 'Enviar resumo ao cliente' : o.agendadaPara ? 'Confirmar horário no WhatsApp' : 'Avisar cliente no WhatsApp'}</button>
      <button class="btn" data-act="doc" data-k="os">${icon('print')} PDF da OS</button>
      ${cob ? `<a class="btn" href="#/cobranca/${cob.id}" data-nav>${icon('cash')} Cobrança</a>` : `<button class="btn" data-act="cobDaOS">${icon('cash')} Gerar cobrança</button>`}
      <button class="btn danger full" data-act="delDoc">${icon('trash')} Excluir OS</button>
    </div>`
  };
}
/* ================= CLIENTES ================= */
function vCliList() {
  LIST = () => {
    const arr = list('clientes').filter(c => matchQ('cli', c.nome, c.tel, c.endereco, c.doc)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    return arr.length ? `<div class="list">${arr.map(c => {
      const ab = list('cobrancas').filter(x => x.clienteId === c.id && x.status === 'aberta').reduce((a, x) => a + (Number(x.valor) || 0), 0);
      return `<a class="li" href="#/cliente/${c.id}" data-nav><div class="grow"><div class="t">${esc(c.nome || 'Sem nome')}</div>
        <div class="s">${esc(fmtTel(c.tel) || 'Sem telefone')}${c.endereco ? ' · ' + esc(c.endereco) : ''}</div></div>
        ${ab ? `<div class="v"><span class="money" style="color:var(--warn)">${money(ab)}</span><small>em aberto</small></div>` : icon('chev').replace('<svg', '<svg width="20" height="20" style="color:var(--muted)"')}</a>`;
    }).join('')}</div>` : `<div class="card empty"><b>Nenhum cliente encontrado</b>Cadastre pelo botão acima ou direto ao criar um orçamento.</div>`;
  };
  return {
    title: 'Clientes', tab: 'cli', html: `<div class="stack">
    <button class="btn primary block" data-act="newCli">${icon('plus')} Novo cliente</button>
    ${searchBox('Buscar por nome, telefone ou endereço', 'cli')}
    <div id="lst">${LIST()}</div></div>`
  };
}
function vCli(id) {
  const c = S.clientes[id]; if (!c) return { redirect: '#/clientes' };
  CUR = { store: 'clientes', id };
  const orcs = list('orcamentos').filter(o => o.clienteId === id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const oss = list('os').filter(o => o.clienteId === id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const cobs = list('cobrancas').filter(o => o.clienteId === id);
  const pago = cobs.filter(x => x.status === 'paga').reduce((a, x) => a + (+x.valor || 0), 0);
  const aberto = cobs.filter(x => x.status === 'aberta').reduce((a, x) => a + (+x.valor || 0), 0);
  const telDig = onlyDigits(c.tel);
  return {
    title: c.nome || 'Novo cliente', tab: 'cli', back: '#/clientes', html: `
    <div class="card form">
      <label class="f">Nome<input class="inp" data-f="nome" value="${esc(c.nome)}" placeholder="Nome do cliente ou empresa" autocomplete="off"></label>
      <label class="f">WhatsApp / telefone<input class="inp" data-f="tel" inputmode="tel" value="${esc(c.tel)}" placeholder="(18) 99999-9999"></label>
      <label class="f">Endereço<input class="inp" data-f="endereco" value="${esc(c.endereco)}" placeholder="Rua, número, bairro, cidade"></label>
      <div class="two">
        <label class="f">CPF/CNPJ<input class="inp" data-f="doc" inputmode="numeric" value="${esc(c.doc)}"></label>
        <label class="f">E-mail<input class="inp" data-f="email" type="email" value="${esc(c.email)}"></label>
      </div>
      <label class="f">Observações<textarea class="inp" data-f="obs" placeholder="Ponto de referência, portão, cachorro…">${esc(c.obs)}</textarea></label>
      ${'contacts' in navigator && 'ContactsManager' in window ? `<button class="btn" data-act="fromContacts">${icon('contacts')} Preencher com contato do celular</button>` : ''}
    </div>
    <div class="sec-title">Ações</div>
    <div class="btn-grid">
      <button class="btn wa" data-act="waCli" ${telDig ? '' : 'disabled'}>${icon('wa')} WhatsApp</button>
      <a class="btn" href="tel:${telDig}" ${telDig ? '' : 'aria-disabled="true" style="opacity:.45;pointer-events:none"'}>${icon('phone')} Ligar</a>
      <button class="btn primary" data-act="newOrc" data-cli="${id}">${icon('orc')} Orçamento</button>
      <button class="btn dark" data-act="newOS" data-cli="${id}">${icon('os')} Nova OS</button>
    </div>
    <div class="sec-title">Financeiro</div>
    <div class="tiles"><div class="tile"><span class="k">Já pagou</span><span class="n money" style="font-size:22px">${money(pago)}</span></div>
      <div class="tile ${aberto ? 'warn' : ''}"><span class="k">Em aberto</span><span class="n money" style="font-size:22px">${money(aberto)}</span></div></div>
    <div class="sec-title">Ordens de serviço</div>
    ${oss.length ? `<div class="list">${oss.map(osRow).join('')}</div>` : '<div class="card empty small">Nenhuma OS para este cliente.</div>'}
    <div class="sec-title">Orçamentos</div>
    ${orcs.length ? `<div class="list">${orcs.map(orcRow).join('')}</div>` : '<div class="card empty small">Nenhum orçamento para este cliente.</div>'}
    <div style="margin-top:22px"><button class="btn danger block" data-act="delDoc">${icon('trash')} Excluir cliente</button></div>`
  };
}

/* ================= ESTOQUE E CATÁLOGO ================= */
function prodRow(p) {
  const crit = isMaterial(p) && ((p.qtd || 0) < 0 || (p.minimo > 0 && p.qtd <= p.minimo));
  return `<a class="li" href="#/produto/${p.id}" data-nav><div class="grow"><div class="t">${esc(p.nome || 'Sem nome')}</div>
    <div class="s">${isMaterial(p) ? `<span class="num">${fmtQ(p.qtd)} ${esc(p.unidade)}</span>${p.minimo ? ' · mínimo ' + fmtQ(p.minimo) : ''}` : 'Serviço'}</div></div>
    <div class="v"><span class="money">${money(p.preco)}</span><small>${crit ? `<span class="pill ${p.qtd < 0 ? 'p-crit' : 'p-warn'}">${p.qtd < 0 ? 'Negativo' : 'Repor'}</span>` : isMaterial(p) ? esc('por ' + p.unidade) : ''}</small></div></a>`;
}
function vEstoque() {
  LIST = () => {
    const arr = list('produtos').filter(p => (UI.estF === 'critico' ? estoqueCritico().includes(p) : p.tipo === UI.estF) && matchQ('est', p.nome))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
    return arr.length ? `<div class="list">${arr.map(prodRow).join('')}</div>` : `<div class="card empty"><b>Nada por aqui</b>${UI.estF === 'critico' ? 'Nenhum material abaixo do mínimo.' : 'Cadastre para usar nos orçamentos com um toque.'}</div>`;
  };
  const crit = estoqueCritico();
  const valorEst = list('produtos').filter(isMaterial).reduce((a, p) => a + Math.max(0, p.qtd || 0) * (p.custo || 0), 0);
  return {
    title: 'Estoque e catálogo', tab: 'mais', back: '#/mais', html: `<div class="stack">
    <div class="tiles"><div class="tile"><span class="k">Valor em estoque (custo)</span><span class="n money" style="font-size:22px">${money(valorEst)}</span></div>
    <button class="tile ${crit.length ? 'warn' : ''}" data-act="fEst" data-v="critico" style="text-align:left;font:inherit;cursor:pointer"><span class="k">Abaixo do mínimo</span><span class="n num">${crit.length}</span><span class="d">toque para ver</span></button></div>
    ${chips([['material', 'Materiais'], ['servico', 'Serviços'], ['critico', 'Repor']], UI.estF, 'fEst')}
    <button class="btn primary block" data-act="newProd">${icon('plus')} ${UI.estF === 'servico' ? 'Novo serviço' : 'Novo material'}</button>
    ${searchBox('Buscar', 'est')}
    <div id="lst">${LIST()}</div></div>`
  };
}
function vProduto(id) {
  const p = S.produtos[id]; if (!p) return { redirect: '#/estoque' };
  CUR = { store: 'produtos', id };
  const movs = list('movimentos').filter(m => m.produtoId === id).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 40);
  const mat = isMaterial(p);
  return {
    title: p.nome || (mat ? 'Novo material' : 'Novo serviço'), tab: 'mais', back: '#/estoque', html: `
    ${mat ? `<div class="card row" style="margin-bottom:12px"><div class="grow"><div class="muted small">Em estoque</div>
      <div style="font-size:34px;font-weight:850;letter-spacing:-.02em" class="num ${p.qtd < 0 ? '' : ''}">${fmtQ(p.qtd)} <span style="font-size:18px" class="muted">${esc(p.unidade)}</span></div>
      ${p.qtd < 0 ? '<span class="pill p-crit">Estoque negativo — lance a entrada</span>' : p.minimo > 0 && p.qtd <= p.minimo ? '<span class="pill p-warn">Abaixo do mínimo</span>' : ''}</div></div>
      <div class="btn-grid" style="margin-bottom:6px"><button class="btn primary" data-act="mov" data-v="entrada">${icon('down')} Entrada</button>
      <button class="btn" data-act="mov" data-v="saida">${icon('up')} Saída</button>
      <button class="btn full" data-act="mov" data-v="ajuste">Ajustar contagem</button></div>` : ''}
    <div class="sec-title">Cadastro</div>
    <div class="card form">
      <label class="f">Nome<input class="inp" data-f="nome" value="${esc(p.nome)}" placeholder="${mat ? 'Ex.: Cabo flexível 2,5 mm²' : 'Ex.: Instalação de tomada'}"></label>
      <label class="f">Tipo<select class="inp" data-f="tipo" data-rerender="1"><option value="material" ${mat ? 'selected' : ''}>Material (controla estoque)</option><option value="servico" ${!mat ? 'selected' : ''}>Serviço / mão de obra</option></select></label>
      <div class="two">
        <label class="f">Preço de venda (R$)<input class="inp num" inputmode="decimal" data-f="preco" data-type="num" value="${fmtIn(p.preco)}"></label>
        <label class="f">Unidade<input class="inp" data-f="unidade" value="${esc(p.unidade)}" list="unidades" placeholder="un, m, kg, h"></label>
      </div>
      ${mat ? `<div class="two">
        <label class="f">Custo (R$)<input class="inp num" inputmode="decimal" data-f="custo" data-type="num" value="${fmtIn(p.custo)}"></label>
        <label class="f">Estoque mínimo<input class="inp num" inputmode="decimal" data-f="minimo" data-type="num" value="${fmtQ(p.minimo)}"></label></div>` : ''}
      <datalist id="unidades"><option value="un"><option value="m"><option value="m²"><option value="kg"><option value="L"><option value="h"><option value="pç"><option value="cx"><option value="rolo"><option value="serviço"></datalist>
    </div>
    ${mat ? `<div class="sec-title">Movimentações</div>
    ${movs.length ? `<div class="list">${movs.map(m => `<div class="li" style="cursor:default"><div class="grow"><div class="t">${m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Ajuste'}${m.osId && S.os[m.osId] ? ' · OS ' + numStr(S.os[m.osId].numero) : ''}</div>
      <div class="s">${fmtDT(m.data)}${m.motivo ? ' · ' + esc(m.motivo) : ''}</div></div>
      <div class="v num" style="color:${m.qtd < 0 ? 'var(--crit)' : 'var(--ok)'}">${m.qtd > 0 ? '+' : ''}${fmtQ(m.qtd)}</div></div>`).join('')}</div>` : '<div class="card empty small">Nenhuma movimentação ainda.</div>'}` : ''}
    <div style="margin-top:22px"><button class="btn danger block" data-act="delDoc">${icon('trash')} Excluir do catálogo</button></div>`
  };
}
async function movimentar(p, tipo, qtd, motivo, osId) {
  const m = { id: uid(), produtoId: p.id, tipo, qtd, motivo: motivo || '', osId: osId || null, data: nowISO() };
  p.qtd = round2((p.qtd || 0) + qtd); // qtd já vem com sinal
  await save('movimentos', m, { silent: true }); await save('produtos', p);
}

/* ================= COBRANÇAS ================= */
function cobRow(c) {
  return `<a class="li" href="#/cobranca/${c.id}" data-nav><div class="grow"><div class="t">${esc(nomeCli(c.clienteId))}</div>
    <div class="s">Nº ${numStr(c.numero)} · ${c.status === 'paga' ? 'paga em ' + fmtDate(c.pagaEm) : 'vence ' + fmtDate(c.vencimento)}${c.descricao ? ' · ' + esc(c.descricao) : ''}</div></div>
    <div class="v"><span class="money">${money(c.valor)}</span><small>${cobPill(c)}</small></div></a>`;
}
function vCobList() {
  const all = list('cobrancas');
  const ab = all.filter(c => c.status === 'aberta'); const venc = ab.filter(cobVencida);
  const mes = todayStr().slice(0, 7);
  const recMes = all.filter(c => c.status === 'paga' && (c.pagaEm || '').startsWith(mes)).reduce((a, c) => a + (+c.valor || 0), 0);
  LIST = () => {
    const f = UI.cobF;
    const arr = all.filter(c => (f === 'todas' || (f === 'abertas' ? c.status === 'aberta' : f === 'vencidas' ? cobVencida(c) : c.status === 'paga')) && matchQ('cob', nomeCli(c.clienteId), c.descricao, numStr(c.numero)))
      .sort((a, b) => f === 'pagas' ? (b.pagaEm || '').localeCompare(a.pagaEm || '') : (a.vencimento || '').localeCompare(b.vencimento || ''));
    return arr.length ? `<div class="list">${arr.map(cobRow).join('')}</div>` : `<div class="card empty"><b>Nenhuma cobrança aqui</b>Ao concluir uma OS a cobrança é criada sozinha.</div>`;
  };
  return {
    title: 'Cobranças', tab: 'mais', back: '#/mais', html: `<div class="stack">
    <div class="tiles">
      <div class="tile"><span class="k">A receber</span><span class="n money" style="font-size:22px">${money(ab.reduce((a, c) => a + (+c.valor || 0), 0))}</span><span class="d">${plural(ab.length, 'cobrança', 'cobranças')}</span></div>
      <div class="tile ${venc.length ? 'alert' : ''}"><span class="k">Vencido</span><span class="n money" style="font-size:22px">${money(venc.reduce((a, c) => a + (+c.valor || 0), 0))}</span><span class="d">${plural(venc.length, 'cobrança', 'cobranças')}</span></div>
      <div class="tile" style="grid-column:1/-1;min-height:0"><span class="k">Recebido este mês</span><span class="n money" style="font-size:22px;color:var(--ok)">${money(recMes)}</span></div>
    </div>
    <button class="btn primary block" data-act="newCob">${icon('plus')} Nova cobrança</button>
    ${searchBox('Buscar por cliente ou descrição', 'cob')}
    ${chips([['abertas', 'Em aberto'], ['vencidas', 'Vencidas'], ['pagas', 'Pagas'], ['todas', 'Todas']], UI.cobF, 'fCob')}
    <div id="lst">${LIST()}</div></div>`
  };
}
function vCob(id) {
  const c = S.cobrancas[id]; if (!c) return { redirect: '#/cobrancas' };
  CUR = { store: 'cobrancas', id };
  const os = c.osId && S.os[c.osId];
  return {
    title: 'Cobrança ' + numStr(c.numero), tab: 'mais', back: '#/cobrancas', html: `
    <div class="row" style="margin-bottom:12px">${cobPill(c)}<span class="muted small grow">${os ? `Da <a href="#/os/${os.id}" data-nav>OS ${numStr(os.numero)}</a> · ` : ''}criada ${fmtDate(c.criadoEm)}${c.enviadaEm ? ' · enviada ' + fmtDT(c.enviadaEm) : ''}</span></div>
    <div class="sec-title">Cliente</div>${clienteBlock(c)}
    <div class="sec-title">Valores</div>
    <div class="card form">
      <div class="two"><label class="f">Valor (R$)<input class="inp num" inputmode="decimal" data-f="valor" data-type="num" value="${fmtIn(c.valor)}"></label>
      <label class="f">Vencimento<input class="inp" type="date" data-f="vencimento" value="${esc(c.vencimento)}"></label></div>
      <label class="f">Referente a<input class="inp" data-f="descricao" value="${esc(c.descricao)}" placeholder="Ex.: troca do quadro de distribuição"></label>
    </div>
    <div class="sec-title">Pix</div>
    <div class="card stack" id="pixCard">${pixCardHTML(c)}</div>
    <div class="sec-title">Ações</div>
    <div class="btn-grid">
      <button class="btn wa full" data-act="waCob">${icon('wa')} Enviar cobrança no WhatsApp</button>
      <button class="btn full" data-act="waPixSo">${icon('pix')} Enviar só o código Pix (2ª mensagem)</button>
      ${c.status === 'aberta' ? `<button class="btn primary full" data-act="pagarCob">${icon('check')} Marcar como paga</button>`
        : `<div class="card full"><b>Paga em ${fmtDate(c.pagaEm)}</b>${c.forma ? ' · ' + esc(c.forma) : ''}</div><button class="btn full" data-act="reabrirCob">Reabrir cobrança</button>`}
      <button class="btn" data-act="doc" data-k="cob">${icon('print')} Recibo / PDF</button>
      <button class="btn danger" data-act="delDoc">${icon('trash')} Excluir</button>
    </div>`
  };
}

function pixCardHTML(c) {
  const pix = c.valor > 0 ? pixPayload({ valor: c.valor, txid: 'COB' + numStr(c.numero) }) : '';
  if (pix) return `<div class="qr" aria-label="QR Code Pix">${qrSVG(pix)}</div>
      <div class="code" id="pixCode">${esc(pix)}</div>
      <button class="btn block" data-act="copyPix">${icon('copy')} Copiar Pix copia e cola</button>
      <p class="hint" style="margin:0">Mostre o QR para o cliente pagar na hora ou envie pelo WhatsApp. Confira o nome do recebedor no app do banco antes de confirmar.</p>`;
  if (S.cfg.pixChave) return '<div class="muted">Informe o valor para gerar o código Pix.</div>';
  return `<div class="banner info">${icon('pix')}<div>Cadastre sua chave Pix em <a href="#/config" data-nav>Meus dados</a> para gerar QR Code e copia e cola.</div></div>`;
}
function pixTestHTML() {
  const pix = pixKey() ? pixPayload({ valor: 1, txid: 'TESTE' }) : '';
  if (!pix) return '<p class="hint" style="margin:0">Preencha a chave para testar o QR Code.</p>';
  return `<details><summary class="small" style="cursor:pointer;font-weight:650">Testar: gerar Pix de R$ 1,00 para mim mesmo</summary>
        <div class="stack" style="margin-top:10px"><div class="qr">${qrSVG(pix)}</div><p class="hint" style="margin:0">Leia com o app do seu banco. Se aparecer seu nome e R$ 1,00, está tudo certo (não precisa pagar).</p></div></details>`;
}

/* ================= AGENDA ================= */
function agendaRow(o) {
  const hora = o.agendadaPara.length > 10 ? o.agendadaPara.slice(11, 16) : '--:--';
  return `<a class="li" href="#/os/${o.id}" data-nav><span class="agenda-time num">${esc(hora)}</span>
    <div class="grow"><div class="t">${esc(nomeCli(o.clienteId))}</div>
    <div class="s">${esc((o.descricao || o.itens[0]?.descricao || 'Sem descrição').split('\n')[0])}${o.endereco ? ' · ' + esc(o.endereco) : ''}</div></div>
    ${pill(o.status, OS_ST)}</a>`;
}
function notifCard() {
  const supported = 'Notification' in window;
  const perm = supported ? Notification.permission : 'unsupported';
  const cfg = S.cfg.notif;
  return `<div class="card form">
    <div class="row"><div class="grow"><div style="font-weight:700">Lembretes automáticos</div>
      <div class="muted small">Avisa no celular no horário de cada serviço, enquanto o app estiver aberto ou instalado.</div></div>
      ${supported && perm === 'granted' ? `<button class="chip ${cfg.ativo ? 'on' : ''}" data-act="toggleNotif" style="min-height:38px">${cfg.ativo ? 'Ativado' : 'Desativado'}</button>` : ''}</div>
    ${!supported ? `<div class="banner warn">${icon('alert')}<div>Este navegador não aceita notificações. Use a exportação para o calendário abaixo — ela funciona sempre.</div></div>`
      : perm === 'denied' ? `<div class="banner warn">${icon('alert')}<div>As notificações estão bloqueadas para este site. Ative em Configurações do navegador › Site › Notificações.</div></div>`
      : perm === 'default' ? `<button class="btn" data-act="pedirNotif">${icon('bell')} Permitir notificações no navegador</button>`
      : `<label class="f">Avisar com antecedência de<select class="inp" data-notifcfg="1">
          ${[[0, 'No horário'], [15, '15 minutos antes'], [30, '30 minutos antes'], [60, '1 hora antes'], [120, '2 horas antes'], [1440, '1 dia antes']]
            .map(([v, l]) => `<option value="${v}" ${Number(cfg.antecedenciaMin) === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></label>`}
  </div>`;
}
function vAgenda() {
  const F = [['7', '7 dias'], ['30', '30 dias'], ['todos', 'Todos']];
  const hoje = todayStr();
  const aberto = o => !['concluida', 'cancelada'].includes(o.status);
  const comData = list('os').filter(o => aberto(o) && o.agendadaPara);
  const atrasados = comData.filter(o => o.agendadaPara.slice(0, 10) < hoje).sort((a, b) => a.agendadaPara.localeCompare(b.agendadaPara));
  const limite = UI.agendaF === 'todos' ? null : addDays(hoje, Number(UI.agendaF));
  const futuros = comData.filter(o => o.agendadaPara.slice(0, 10) >= hoje && (!limite || o.agendadaPara.slice(0, 10) <= limite)).sort((a, b) => a.agendadaPara.localeCompare(b.agendadaPara));
  const groups = [];
  for (const o of futuros) { const d = o.agendadaPara.slice(0, 10); let g = groups.find(x => x.d === d); if (!g) { g = { d, items: [] }; groups.push(g); } g.items.push(o); }
  return {
    title: 'Agenda', tab: 'mais', back: '#/mais', html: `<div class="stack">
    ${notifCard()}
    <button class="btn block" data-act="exportAgenda">${icon('calendar')} Exportar agenda para o Calendário do celular</button>
    <p class="hint" style="margin:0">Abre no Google Agenda, Apple Calendário etc. Os avisos passam a vir do sistema — funcionam mesmo com o app fechado.</p>
    ${chips(F, UI.agendaF, 'fAgenda')}
    ${atrasados.length ? `<div class="sec-title" style="color:var(--crit)">Atrasados</div><div class="list">${atrasados.map(agendaRow).join('')}</div>` : ''}
    ${groups.length ? groups.map(g => `<div class="sec-title">${esc(dayLabel(g.d))}</div><div class="list">${g.items.map(agendaRow).join('')}</div>`).join('')
      : !atrasados.length ? `<div class="card empty"><b>Nada agendado</b>Defina data e hora numa OS para ela aparecer aqui.</div>` : ''}
    </div>`
  };
}

/* ================= MAIS / CONFIG / BACKUP ================= */
let installPrompt = null;
function vMais() {
  const crit = estoqueCritico().length; const venc = list('cobrancas').filter(cobVencida).length;
  const li = (h, i, t, s, extra = '') => `<a class="li" href="${h}" data-nav><span style="width:40px;height:40px;border-radius:10px;background:var(--surface-2);display:grid;place-items:center;flex:none">${icon(i).replace('<svg', '<svg width="22" height="22"')}</span><div class="grow"><div class="t">${t}</div><div class="s">${s}</div></div>${extra}</a>`;
  return {
    title: 'Mais', tab: 'mais', html: `
    <div class="list">
      ${li('#/agenda', 'calendar', 'Agenda', S.cfg.notif.ativo ? 'Lembretes ativados' : 'Próximos atendimentos e lembretes')}
      ${li('#/cobrancas', 'cash', 'Cobranças', 'Pix, vencimentos, recebidos', venc ? `<span class="pill p-crit">${venc} vencida${venc > 1 ? 's' : ''}</span>` : '')}
      ${li('#/estoque', 'box', 'Estoque e catálogo', 'Materiais, serviços e preços', crit ? `<span class="pill p-warn">${crit} repor</span>` : '')}
    </div>
    <div class="sec-title">Configurações</div>
    <div class="list">
      ${li('#/config', 'gear', 'Meus dados, logo e Pix', 'Aparece nos PDFs e nas mensagens')}
      ${li('#/backup', 'down', 'Backup e dados', S.cfg.lastBackup ? 'Último backup ' + fmtDate(S.cfg.lastBackup) : 'Nenhum backup feito')}
    </div>
    <div class="sec-title">Aparência</div>
    ${chips([['auto', 'Automático'], ['claro', 'Claro'], ['escuro', 'Escuro']], S.cfg.tema, 'tema')}
    <p class="hint">No sol forte, use o tema Claro com o brilho da tela no máximo.</p>
    ${installPrompt ? `<button class="btn primary block" data-act="install" style="margin-top:14px">${icon('install')} Instalar na tela inicial</button>` : ''}
    <p class="hint" style="margin-top:22px;text-align:center">Ordem em Campo · versão ${APP_VERSION}<br>Seus dados ficam só neste aparelho. Faça backup com frequência.</p>`
  };
}
function vConfig() {
  const c = S.cfg; CUR = { store: 'meta', id: 'config' };
  return {
    title: 'Meus dados', tab: 'mais', back: '#/mais', html: `
    <div class="sec-title">Identificação</div>
    <div class="card form">
      <div class="row"><div style="width:84px;height:84px;border-radius:12px;border:2px dashed var(--line-strong);display:grid;place-items:center;overflow:hidden;flex:none;background:#fff">
        ${c.logo ? `<img src="${c.logo}" alt="Logo" style="width:100%;height:100%;object-fit:contain">` : '<span class="muted small">Logo</span>'}</div>
        <div class="stack grow" style="gap:8px"><label class="btn sm">${icon('camera')} ${c.logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/*" hidden data-logo="1"></label>
        ${c.logo ? '<button class="btn sm ghost" data-act="rmLogo">Remover logo</button>' : '<span class="hint">Aparece no Início e no cabeçalho dos PDFs de orçamento, OS e cobrança.</span>'}</div></div>
      <label class="f">Nome ou empresa<input class="inp" data-f="nome" value="${esc(c.nome)}"></label>
      <label class="f">Profissão / especialidade<input class="inp" data-f="profissao" value="${esc(c.profissao)}" placeholder="Eletricista residencial e predial"></label>
      <div class="two"><label class="f">WhatsApp<input class="inp" data-f="tel" inputmode="tel" value="${esc(c.tel)}"></label>
      <label class="f">CPF/CNPJ<input class="inp" data-f="doc" inputmode="numeric" value="${esc(c.doc)}"></label></div>
      <div class="two"><label class="f">Endereço<input class="inp" data-f="endereco" value="${esc(c.endereco)}"></label>
      <label class="f">Cidade/UF<input class="inp" data-f="cidade" value="${esc(c.cidade)}" placeholder="Presidente Epitácio/SP"></label></div>
    </div>
    <div class="sec-title">Pix para cobranças</div>
    <div class="card form">
      <div class="two"><label class="f">Tipo de chave<select class="inp" data-f="pixTipo">${Object.entries(PIX_TIPOS).map(([k, v]) => `<option value="${k}" ${c.pixTipo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Chave Pix<input class="inp" data-f="pixChave" value="${esc(c.pixChave)}" autocomplete="off"></label></div>
      <div class="two"><label class="f">Nome do recebedor<input class="inp" data-f="pixNome" value="${esc(c.pixNome)}" placeholder="Como aparece no banco"><span class="hint">Até 25 letras, sem acento.</span></label>
      <label class="f">Cidade do recebedor<input class="inp" data-f="pixCidade" value="${esc(c.pixCidade)}" placeholder="PRESIDENTE EPITACIO"><span class="hint">Até 15 letras.</span></label></div>
      <div id="pixTest">${pixTestHTML()}</div>
    </div>
    <div class="sec-title">Padrões</div>
    <div class="card form">
      <div class="two"><label class="f">Validade do orçamento (dias)<input class="inp num" inputmode="numeric" data-f="validadePadrao" data-type="num" value="${esc(c.validadePadrao)}"></label>
      <label class="f">Prazo da cobrança (dias)<input class="inp num" inputmode="numeric" data-f="prazoCobranca" data-type="num" value="${esc(c.prazoCobranca)}"><span class="hint">0 = vence no dia do serviço</span></label></div>
      <label class="f">Texto de garantia / rodapé<textarea class="inp" data-f="rodape">${esc(c.rodape)}</textarea></label>
    </div>`
  };
}
function vBackup() {
  const ex = STORES.filter(s => s !== 'meta' && s !== 'fotos').reduce((a, s) => a + list(s).filter(o => o.exemplo).length, 0);
  return {
    title: 'Backup e dados', tab: 'mais', back: '#/mais', html: `
    <div class="banner info">${icon('info')}<div>Tudo o que você cadastra fica guardado <b>só neste celular</b>, por isso funciona sem internet. Se o celular quebrar ou for trocado, só o backup recupera os dados.</div></div>
    <div class="sec-title">Fazer backup</div>
    <div class="card stack">
      <div class="muted small">Último backup: <b style="color:var(--ink)">${S.cfg.lastBackup ? fmtDT(S.cfg.lastBackup) : 'nunca'}</b></div>
      ${navigator.canShare ? `<button class="btn primary block" data-act="backup" data-v="share">${icon('up')} Enviar backup (Drive, WhatsApp, e-mail)</button>` : ''}
      <button class="btn block ${navigator.canShare ? '' : 'primary'}" data-act="backup" data-v="file">${icon('down')} Salvar arquivo de backup</button>
      <p class="hint" style="margin:0">Dica: envie o backup para você mesmo no WhatsApp ou para o Google Drive uma vez por semana.</p>
    </div>
    <div class="sec-title">Restaurar</div>
    <div class="card stack">
      <label class="btn block">${icon('up')} Restaurar de um arquivo<input type="file" accept=".json,application/json" hidden data-restore="1"></label>
      <p class="hint" style="margin:0">Substitui todos os dados deste aparelho pelos do arquivo.</p>
    </div>
    <div class="sec-title">Armazenamento</div>
    <div class="card"><div id="storageInfo" class="small muted">Calculando…</div></div>
    ${ex ? `<div class="sec-title">Dados de exemplo</div><button class="btn block" data-act="rmExemplos">Apagar ${plural(ex, 'registro de exemplo', 'registros de exemplo')}</button>` : ''}
    <div class="sec-title">Zona de perigo</div>
    <button class="btn danger block" data-act="wipe">${icon('trash')} Apagar todos os dados deste aparelho</button>`,
    after: async () => {
      let t = '';
      try {
        const persist = navigator.storage?.persisted ? await navigator.storage.persisted() : false;
        const est = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
        if (est) t += `Usando ${(est.usage / 1048576).toFixed(1)} MB${est.quota ? ' de ' + Math.round(est.quota / 1048576).toLocaleString('pt-BR') + ' MB disponíveis' : ''}. `;
        t += persist ? 'Armazenamento protegido: o navegador não apaga os dados sozinho.' : 'Armazenamento comum. Instale o app na tela inicial para proteger os dados.';
      } catch { t = 'Não foi possível consultar o armazenamento.'; }
      const e = $('#storageInfo'); if (e) e.textContent = t;
    }
  };
}

/* ================= DOCUMENTO (PDF / impressão) ================= */
function docHeader(tipo, numero, data) {
  const c = S.cfg;
  return `<div class="doc-h">${c.logo ? `<img src="${c.logo}" alt="">` : ''}
    <div class="who"><b>${esc(c.nome || 'Seu nome')}</b>${esc(c.profissao || '')}<br>${[fmtTel(c.tel), c.doc ? 'CPF/CNPJ ' + esc(c.doc) : ''].filter(Boolean).join(' · ')}<br>${esc([c.endereco, c.cidade].filter(Boolean).join(' · '))}</div>
    <div class="id"><b>${tipo}</b><div class="nro">Nº ${numStr(numero)}</div>${fmtDate(data)}</div></div>`;
}
function docCliente(id, extra = '') {
  const c = cliente(id);
  return `<h3>Cliente</h3><div><b>${esc(c?.nome || '—')}</b>${c?.doc ? ' · CPF/CNPJ ' + esc(c.doc) : ''}<br>${esc(fmtTel(c?.tel))}${c?.endereco ? ' · ' + esc(c.endereco) : ''}${extra}</div>`;
}
function docItens(o) {
  const t = calc(o);
  if (!o.itens.length) return '';
  return `<h3>Itens</h3><table><thead><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Unit.</th><th class="r">Total</th></tr></thead><tbody>
    ${o.itens.map(it => `<tr><td>${esc(it.descricao)}</td><td class="r">${fmtQ(it.qtd)} ${esc(it.unidade || '')}</td><td class="r">${money(it.preco)}</td><td class="r">${money(it.qtd * it.preco)}</td></tr>`).join('')}
    </tbody></table><div class="tot">${t.desc ? `<div><span>Subtotal</span><span>${money(t.sub)}</span></div><div><span>Desconto</span><span>− ${money(t.desc)}</span></div>` : ''}<div class="g"><span>Total</span><span>${money(t.total)}</span></div></div>`;
}
function docPix(valor, txid) {
  const p = valor > 0 ? pixPayload({ valor, txid }) : ''; if (!p) return '';
  return `<div class="pixbox"><div class="qr">${qrSVG(p)}</div><div><b>Pague com Pix</b><br>Chave (${PIX_TIPOS[S.cfg.pixTipo]}): ${esc(S.cfg.pixChave)}<br>Valor: ${money(valor)}<div style="font-family:var(--mono);font-size:9px;word-break:break-all;margin-top:6px;color:#555">${esc(p)}</div></div></div>`;
}
function vDoc(kind, id) {
  const store = { orc: 'orcamentos', os: 'os', cob: 'cobrancas' }[kind];
  const o = S[store][id]; if (!o) return { redirect: '#/inicio' };
  let body = '';
  if (kind === 'orc') {
    const venc = addDays(o.criadoEm.slice(0, 10), Number(o.validadeDias) || 0);
    body = docHeader('Orçamento', o.numero, o.criadoEm) + docCliente(o.clienteId) + docItens(o)
      + (o.obs ? `<h3>Observações</h3><div style="white-space:pre-wrap">${esc(o.obs)}</div>` : '')
      + `<h3>Validade</h3><div>Proposta válida até ${fmtDate(venc)}.</div>`
      + `<div class="sign"><div>${esc(S.cfg.nome)}</div><div>De acordo — ${esc(nomeCli(o.clienteId))}</div></div>`;
  } else if (kind === 'os') {
    const cob = o.cobrancaId && S.cobrancas[o.cobrancaId];
    const fotos = k => o.fotos[k].length ? `<h3>Fotos ${k}</h3><div class="photos-doc">${o.fotos[k].map(f => `<img data-foto="${f}" alt="">`).join('')}</div>` : '';
    body = docHeader('Ordem de serviço', o.numero, o.criadoEm)
      + docCliente(o.clienteId, o.endereco ? `<br>Local do serviço: ${esc(o.endereco)}` : '')
      + `<h3>Situação</h3><div>${esc(OS_ST[o.status]?.l)}${o.agendadaPara ? ' · agendada para ' + fmtDate(o.agendadaPara) + (o.agendadaPara.length > 10 ? ' ' + o.agendadaPara.slice(11, 16) : '') : ''}${o.concluidaEm ? ' · concluída em ' + fmtDT(o.concluidaEm) : ''}${o.geo ? ` · GPS ${o.geo.lat.toFixed(5)}, ${o.geo.lng.toFixed(5)}` : ''}</div>`
      + (o.descricao ? `<h3>Problema relatado</h3><div style="white-space:pre-wrap">${esc(o.descricao)}</div>` : '')
      + docItens(o)
      + (o.laudo ? `<h3>Laudo técnico</h3><div style="white-space:pre-wrap">${esc(o.laudo)}</div>` : '')
      + fotos('antes') + fotos('depois')
      + (cob && cob.status === 'aberta' ? docPix(cob.valor, 'COB' + numStr(cob.numero)) : '')
      + `<div class="sign"><div>${esc(S.cfg.nome)}</div><div>${o.assinatura ? `<img src="${o.assinatura}" alt="">` : ''}${esc(o.assinadoPor || nomeCli(o.clienteId))}</div></div>`;
  } else {
    const paga = o.status === 'paga';
    body = docHeader(paga ? 'Recibo' : 'Cobrança', o.numero, paga ? o.pagaEm : o.criadoEm) + docCliente(o.clienteId)
      + `<h3>${paga ? 'Declaração' : 'Valor'}</h3><div style="font-size:15px">${paga
        ? `Recebi de <b>${esc(nomeCli(o.clienteId))}</b> a quantia de <b>${money(o.valor)}</b>${o.descricao ? ', referente a ' + esc(o.descricao) : ''}${o.forma ? ', pago via ' + esc(o.forma) : ''}, em ${fmtDate(o.pagaEm)}.`
        : `<b>${money(o.valor)}</b>${o.descricao ? ' — referente a ' + esc(o.descricao) : ''}<br>Vencimento: ${fmtDate(o.vencimento)}`}</div>`
      + (paga ? '' : docPix(o.valor, 'COB' + numStr(o.numero)))
      + `<div class="sign"><div>${esc(S.cfg.nome)}${S.cfg.doc ? '<br>CPF/CNPJ ' + esc(S.cfg.doc) : ''}</div></div>`;
  }
  body += S.cfg.rodape ? `<div class="foot">${esc(S.cfg.rodape)}</div>` : '';
  document.body.classList.add('show-doc');
  $('#doc').innerHTML = `<div class="doc-bar">
      <button class="btn" data-act="docBack">← Voltar</button>
      <button class="btn primary" data-act="print">${icon('print')} Salvar PDF / Imprimir</button></div>
    <p class="hint" style="max-width:800px;margin:0 auto 10px">No celular: toque em <b>Salvar PDF</b>, escolha “Salvar como PDF” como impressora e depois compartilhe o arquivo no WhatsApp.</p>
    <div class="doc">${body}</div>`;
  hydratePhotos($('#doc'));
  return { title: 'Documento', tab: kind === 'orc' ? 'orc' : kind === 'os' ? 'os' : 'mais', doc: true };
}
/* ================= folhas de seleção ================= */
function pickClienteSheet() {
  const o = curObj(); if (!o) return;
  const body = () => {
    const q = norm(UI.q.pickCli || '');
    const arr = list('clientes').filter(c => !q || norm(c.nome + ' ' + c.tel).includes(q)).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')).slice(0, 60);
    return arr.length ? `<div class="list">${arr.map(c => `<button class="li" data-act="setCliente" data-id="${c.id}"><div class="grow"><div class="t">${esc(c.nome)}</div><div class="s">${esc(fmtTel(c.tel) || 'Sem telefone')}</div></div></button>`).join('')}</div>`
      : `<div class="empty small">Nenhum cliente com esse nome. Cadastre abaixo.</div>`;
  };
  openSheet('Cliente', `<div class="stack">
    ${searchBox('Buscar cliente', 'pickCli')}
    <div id="pickLst">${body()}</div>
    <div class="sec-title" style="margin-top:8px">Cadastrar novo</div>
    <div class="card form">
      <label class="f">Nome<input class="inp" id="qcNome" placeholder="Nome do cliente"></label>
      <label class="f">WhatsApp<input class="inp" id="qcTel" inputmode="tel" placeholder="(18) 99999-9999"></label>
      ${'contacts' in navigator && 'ContactsManager' in window ? `<button class="btn" data-act="qcContacts">${icon('contacts')} Buscar nos contatos</button>` : ''}
      <button class="btn primary" data-act="qcSave">Cadastrar e usar</button>
    </div></div>`, { onMount: () => { LIST_SHEET = body; setTimeout(() => $('[data-search=pickCli]')?.focus(), 60); } });
}
let LIST_SHEET = null;
function pickItemSheet() {
  const o = curObj(); if (!o) return;
  let added = 0;
  const body = () => {
    const q = norm(UI.q.pickIt || '');
    const arr = list('produtos').filter(p => !q || norm(p.nome).includes(q))
      .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === 'servico' ? -1 : 1) || (a.nome || '').localeCompare(b.nome || '', 'pt-BR')).slice(0, 80);
    return arr.length ? `<div class="list">${arr.map(p => {
      const n = o.itens.filter(i => i.produtoId === p.id).reduce((a, i) => a + i.qtd, 0);
      return `<button class="li" data-act="addProd" data-id="${p.id}"><div class="grow"><div class="t">${esc(p.nome)}</div>
      <div class="s">${isMaterial(p) ? `Material · estoque ${fmtQ(p.qtd)} ${esc(p.unidade)}` : 'Serviço'}</div></div>
      <div class="v"><span class="money">${money(p.preco)}</span><small>${n ? `<span class="pill p-ok">${fmtQ(n)} no orçamento</span>` : '+ adicionar'}</small></div></button>`;
    }).join('')}</div>` : `<div class="empty small">Nada encontrado no catálogo. Cadastre abaixo.</div>`;
  };
  openSheet('Adicionar do catálogo', `<div class="stack">
    ${searchBox('Buscar serviço ou material', 'pickIt')}
    <div id="pickLst">${body()}</div>
    <div class="sec-title" style="margin-top:8px">Novo no catálogo</div>
    <div class="card form">
      <label class="f">Nome<input class="inp" id="qpNome" placeholder="Ex.: Instalação de ventilador de teto"></label>
      <div class="two"><label class="f">Preço (R$)<input class="inp" id="qpPreco" inputmode="decimal" placeholder="0,00"></label>
      <label class="f">Tipo<select class="inp" id="qpTipo"><option value="servico">Serviço</option><option value="material">Material</option></select></label></div>
      <button class="btn" data-act="qpSave">Cadastrar e adicionar</button>
    </div>
    <button class="btn primary block" data-act="closeSheet" id="pickDone">Pronto</button></div>`,
    { onMount: () => { LIST_SHEET = body; }, onClose: () => rerender() });
  pickItemSheet.bump = () => { added++; const b = $('#pickDone'); if (b) b.textContent = `Pronto (${added} adicionado${added > 1 ? 's' : ''})`; };
}
function addItemFromProd(p, o) {
  const ex = o.itens.find(i => i.produtoId === p.id);
  if (ex) ex.qtd = round2(ex.qtd + 1);
  else o.itens.push({ id: uid(), produtoId: p.id, descricao: p.nome, qtd: 1, unidade: p.unidade || (isMaterial(p) ? 'un' : 'serviço'), preco: Number(p.preco) || 0, tipo: p.tipo });
  save(CUR.store, o);
}
function signSheet() {
  const o = curObj();
  openSheet('Assinatura do cliente', `<div class="stack">
    <p class="muted small" style="margin:0">Peça para o cliente assinar com o dedo no quadro abaixo.</p>
    <canvas class="sig-pad" id="sigPad" aria-label="Área de assinatura"></canvas>
    <label class="f">Nome de quem assinou<input class="inp" id="sigNome" value="${esc(o.assinadoPor || cliente(o.clienteId)?.nome || '')}"></label>
    <div class="btn-grid"><button class="btn" id="sigClear">Limpar</button><button class="btn primary" id="sigOk">${icon('check')} Salvar assinatura</button></div></div>`, {
    onMount: () => {
      const cv = $('#sigPad'); const r = cv.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B1A33';
      let drawing = false, last = null, dirty = false;
      const pt = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
      cv.addEventListener('pointerdown', e => { drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, 1.2, 0, 7); ctx.fillStyle = ctx.strokeStyle; ctx.fill(); dirty = true; });
      cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; });
      const end = () => { drawing = false; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      $('#sigClear').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; };
      $('#sigOk').onclick = () => {
        if (!dirty) { toast('O quadro está em branco'); return; }
        o.assinatura = cv.toDataURL('image/png'); o.assinadoPor = $('#sigNome').value.trim(); o.assinadoEm = nowISO();
        save('os', o); closeSheet(); rerender(); toast('Assinatura salva');
      };
    }
  });
}
function movSheet(p, tipo) {
  const t = { entrada: 'Entrada no estoque', saida: 'Saída do estoque', ajuste: 'Ajustar contagem' }[tipo];
  openSheet(t, `<div class="form">
    <label class="f">${tipo === 'ajuste' ? 'Quantidade contada agora' : 'Quantidade'} (${esc(p.unidade)})<input class="inp num" id="mvQ" inputmode="decimal" ${tipo === 'ajuste' ? `value="${fmtQ(p.qtd)}"` : ''} placeholder="0"></label>
    ${tipo === 'entrada' ? `<label class="f">Custo unitário (R$)<input class="inp num" id="mvC" inputmode="decimal" value="${fmtIn(p.custo)}"></label>` : ''}
    <label class="f">Motivo (opcional)<input class="inp" id="mvM" placeholder="${tipo === 'entrada' ? 'Compra na loja X' : tipo === 'saida' ? 'Uso avulso, perda…' : 'Contagem de estoque'}"></label>
    <button class="btn primary block" id="mvOk">${icon('check')} Confirmar</button></div>`, {
    onMount: () => {
      setTimeout(() => $('#mvQ').focus(), 60);
      $('#mvOk').onclick = async () => {
        const q = parseNum($('#mvQ').value);
        if (tipo !== 'ajuste' && q <= 0) { toast('Informe uma quantidade maior que zero'); return; }
        const delta = tipo === 'entrada' ? q : tipo === 'saida' ? -q : round2(q - (p.qtd || 0));
        if (tipo === 'entrada' && $('#mvC')) p.custo = parseNum($('#mvC').value);
        if (delta === 0) { closeSheet(); return; }
        await movimentar(p, tipo, delta, $('#mvM').value.trim());
        closeSheet(); rerender(); toast('Estoque atualizado');
      };
    }
  });
}
function pagarSheet(c) {
  openSheet('Marcar como paga', `<div class="form">
    <div style="font-size:26px;font-weight:850" class="money">${money(c.valor)}</div>
    <label class="f">Data do pagamento<input class="inp" type="date" id="pgD" value="${todayStr()}"></label>
    <div class="f" style="font-size:14px;font-weight:650">Forma de pagamento</div>
    <div class="status-grid" id="pgF">${['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto'].map((f, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-v="${f}" type="button">${f}</button>`).join('')}</div>
    <button class="btn primary block" id="pgOk">${icon('check')} Confirmar pagamento</button></div>`, {
    onMount: () => {
      $('#pgF').onclick = e => { const b = e.target.closest('.chip'); if (!b) return; $$('#pgF .chip').forEach(x => x.classList.toggle('on', x === b)); };
      $('#pgOk').onclick = () => {
        c.status = 'paga'; c.pagaEm = $('#pgD').value || todayStr(); c.forma = $('#pgF .chip.on')?.dataset.v || '';
        save('cobrancas', c); closeSheet(); rerender(); toast('Pagamento registrado');
      };
    }
  });
}

/* ================= regras de negócio ================= */
function aprovarOrcamento(o) {
  if (o.osId && S.os[o.osId]) return S.os[o.osId]; // idempotente
  const os = newDoc('os', {
    clienteId: o.clienteId, orcamentoId: o.id, desconto: o.desconto || 0,
    itens: o.itens.map(i => ({ ...i, id: uid() })),
    descricao: '', endereco: cliente(o.clienteId)?.endereco || ''
  });
  NEW_IDS.delete(os.id);
  o.status = 'aprovado'; o.osId = os.id; o.aprovadoEm = nowISO(); save('orcamentos', o);
  return os;
}
async function concluirOS(o) {
  flush();
  const avisos = []; let baixados = 0;
  if (!o.estoqueBaixado) {
    for (const it of o.itens) {
      const p = it.produtoId && S.produtos[it.produtoId];
      if (!isMaterial(p) || !(it.qtd > 0)) continue;
      await movimentar(p, 'saida', -it.qtd, 'Baixa automática OS ' + numStr(o.numero), o.id);
      baixados++;
      if (p.qtd < 0) avisos.push(`${p.nome} ficou negativo (${fmtQ(p.qtd)} ${p.unidade})`);
      else if (p.minimo > 0 && p.qtd <= p.minimo) avisos.push(`${p.nome} abaixo do mínimo (${fmtQ(p.qtd)} ${p.unidade})`);
    }
    o.estoqueBaixado = true;
  }
  o.status = 'concluida'; o.concluidaEm = nowISO();
  const total = calc(o).total; let cob = o.cobrancaId && S.cobrancas[o.cobrancaId];
  if (!cob && total > 0) {
    cob = newDoc('cobrancas', { clienteId: o.clienteId, osId: o.id, valor: total, descricao: 'OS ' + numStr(o.numero) + (o.descricao ? ' — ' + o.descricao.split('\n')[0].slice(0, 60) : '') });
    NEW_IDS.delete(cob.id); o.cobrancaId = cob.id;
  }
  await save('os', o);
  rerender();
  openSheet('Serviço concluído', `<div class="stack">
    <div class="banner info" style="background:var(--ok-bg)">${icon('check')}<div><b>OS ${numStr(o.numero)} concluída.</b><br>${baixados ? plural(baixados, 'material baixado', 'materiais baixados') + ' do estoque.' : 'Nenhum material do estoque nesta OS.'}</div></div>
    ${avisos.length ? `<div class="banner warn">${icon('alert')}<div>${avisos.map(esc).join('<br>')}</div></div>` : ''}
    ${cob ? `<div class="card row"><div class="grow"><div class="muted small">Cobrança nº ${numStr(cob.numero)}</div><div style="font-size:24px;font-weight:850" class="money">${money(cob.valor)}</div></div></div>
      <button class="btn wa block" data-act="waCobId" data-id="${cob.id}">${icon('wa')} Enviar cobrança com Pix</button>
      <a class="btn block" href="#/cobranca/${cob.id}" data-nav>Ver cobrança</a>` : ''}
    <button class="btn block ${cob ? 'ghost' : 'primary'}" data-act="closeSheet">Fechar</button></div>`);
}
function sendCobranca(cb) {
  if (!(cb.valor > 0)) { toast('Informe o valor da cobrança'); return; }
  flush();
  openWhatsApp(cliente(cb.clienteId)?.tel, msgCobranca(cb));
  cb.enviadaEm = nowISO(); save('cobrancas', cb);
}
async function exportBackup(mode) {
  const data = { app: 'ordem-em-campo', versao: 1, exportadoEm: nowISO() };
  for (const s of STORES) data[s] = await DB.all(s);
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const name = `ordem-em-campo-backup-${todayStr()}.json`;
  const mark = () => { S.cfg.lastBackup = nowISO(); saveCfg(); rerender(); toast('Backup pronto'); };
  if (mode === 'share' && navigator.canShare) {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Backup Ordem em Campo' }); mark(); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); mark();
}
async function restoreBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { toast('Arquivo inválido: não é um backup do Ordem em Campo'); return; }
  if (data.app !== 'ordem-em-campo') { toast('Este arquivo não é um backup do Ordem em Campo'); return; }
  const n = (data.clientes || []).length, m = (data.os || []).length;
  if (!await confirmSheet(`Restaurar o backup de <b>${fmtDT(data.exportadoEm)}</b> com ${plural(n, 'cliente', 'clientes')} e ${plural(m, 'OS', 'OS')}? Os dados atuais deste aparelho serão substituídos.`, { ok: 'Restaurar', danger: true, title: 'Restaurar backup' })) return;
  for (const s of STORES) { await DB.clear(s); if (Array.isArray(data[s]) && data[s].length) await DB.putMany(s, data[s]); }
  fotoCache.clear(); await loadAll(); applyTheme(); toast('Backup restaurado'); location.replace('#/inicio'); render();
}

/* ================= ações (cliques) ================= */
const ACT = {
  closeSheet: () => closeSheet(),
  async obStart(el) {
    const c = S.cfg; c.nome = $('#obNome').value.trim(); c.profissao = $('#obProf').value.trim(); c.tel = $('#obTel').value.trim();
    c.pixNome = c.pixNome || pixTexto(c.nome).slice(0, 25);
    c.onboarded = true; await saveCfg();
    if (el.dataset.ex === '1') await seedExemplos();
    render();
  },
  newOrc(el) { const o = newDoc('orcamentos', { clienteId: el.dataset.cli || null }); go('#/orcamento/' + o.id); },
  newOS(el) { const o = newDoc('os', { clienteId: el.dataset.cli || null }); go('#/os/' + o.id); },
  newCob() { const o = newDoc('cobrancas'); go('#/cobranca/' + o.id); },
  newCli() { const o = newDoc('clientes'); go('#/cliente/' + o.id); },
  newProd() { const o = newDoc('produtos', { tipo: UI.estF === 'servico' ? 'servico' : 'material', unidade: UI.estF === 'servico' ? 'serviço' : 'un' }); go('#/produto/' + o.id); },
  fOrc(el) { UI.orcF = el.dataset.v; rerender(); },
  filtroOrc(el) { UI.orcF = el.dataset.v; },
  fOS(el) { UI.osF = el.dataset.v; rerender(); },
  fCob(el) { UI.cobF = el.dataset.v; rerender(); },
  fEst(el) { UI.estF = el.dataset.v; rerender(); },
  tema(el) { S.cfg.tema = el.dataset.v; saveCfg(); applyTheme(); rerender(); },
  pickCliente: () => pickClienteSheet(),
  setCliente(el) {
    const o = curObj(); o.clienteId = el.dataset.id;
    if (CUR.store === 'os' && !o.endereco) o.endereco = cliente(o.clienteId)?.endereco || '';
    save(CUR.store, o); closeSheet(); rerender();
  },
  async qcContacts() {
    try { const [c] = await navigator.contacts.select(['name', 'tel'], { multiple: false }); if (!c) return; $('#qcNome').value = (c.name || [])[0] || ''; $('#qcTel').value = (c.tel || [])[0] || ''; }
    catch { toast('Não foi possível abrir os contatos'); }
  },
  qcSave() {
    const nome = $('#qcNome').value.trim(); if (!nome) { toast('Digite o nome do cliente'); $('#qcNome').focus(); return; }
    const c = { id: uid(), criadoEm: nowISO(), nome, tel: $('#qcTel').value.trim(), email: '', doc: '', endereco: '', obs: '' };
    save('clientes', c); ACT.setCliente({ dataset: { id: c.id } }); toast('Cliente cadastrado');
  },
  async fromContacts() {
    try {
      const [c] = await navigator.contacts.select(['name', 'tel', 'address', 'email'], { multiple: false }); if (!c) return;
      const o = curObj(); o.nome = o.nome || (c.name || [])[0] || ''; o.tel = (c.tel || [])[0] || o.tel; o.email = o.email || (c.email || [])[0] || '';
      const ad = (c.address || [])[0]; if (ad && !o.endereco) o.endereco = [ad.addressLine?.join(' '), ad.city].filter(Boolean).join(', ');
      save('clientes', o); rerender();
    } catch { toast('Não foi possível abrir os contatos'); }
  },
  pickItem: () => pickItemSheet(),
  addProd(el) { const o = curObj(); addItemFromProd(S.produtos[el.dataset.id], o); pickItemSheet.bump?.(); $('#pickLst').innerHTML = LIST_SHEET(); },
  qpSave() {
    const nome = $('#qpNome').value.trim(); if (!nome) { toast('Digite o nome'); return; }
    const tipo = $('#qpTipo').value;
    const p = { id: uid(), criadoEm: nowISO(), tipo, nome, unidade: tipo === 'material' ? 'un' : 'serviço', qtd: 0, minimo: 0, custo: 0, preco: parseNum($('#qpPreco').value) };
    save('produtos', p); addItemFromProd(p, curObj()); pickItemSheet.bump?.();
    $('#qpNome').value = ''; $('#qpPreco').value = ''; $('#pickLst').innerHTML = LIST_SHEET(); toast('Cadastrado e adicionado');
  },
  addAvulso() {
    const o = curObj(); o.itens.push({ id: uid(), produtoId: null, descricao: '', qtd: 1, unidade: 'un', preco: 0, tipo: 'servico' });
    save(CUR.store, o); rerender();
    const inputs = $$('#items [data-k=descricao]'); inputs[inputs.length - 1]?.focus();
  },
  rmItem(el) { const o = curObj(); o.itens.splice(+el.dataset.i, 1); save(CUR.store, o); rerender(); },
  waOrc() {
    const o = curObj(); flush();
    if (!o.itens.length) { toast('Adicione pelo menos um item'); return; }
    openWhatsApp(cliente(o.clienteId)?.tel, msgOrcamento(o));
    if (o.status === 'rascunho') o.status = 'enviado'; o.enviadoEm = nowISO(); save('orcamentos', o);
    setTimeout(rerender, 400);
  },
  dupOrc() {
    const o = curObj(); flush();
    const n = newDoc('orcamentos', { clienteId: null, itens: o.itens.map(i => ({ ...i, id: uid() })), desconto: o.desconto, obs: o.obs, validadeDias: o.validadeDias });
    go('#/orcamento/' + n.id); toast('Cópia criada. Escolha o cliente.');
  },
  aprovarOrc() {
    const o = curObj(); flush();
    if (!o.clienteId) { toast('Escolha o cliente antes de aprovar'); return; }
    const os = aprovarOrcamento(o); toast('OS nº ' + numStr(os.numero) + ' criada'); go('#/os/' + os.id);
  },
  recusarOrc() { const o = curObj(); o.status = 'recusado'; save('orcamentos', o); rerender(); },
  async delDoc() {
    const { store, id } = CUR; const o = curObj();
    const nome = { orcamentos: 'este orçamento', os: 'esta OS', cobrancas: 'esta cobrança', clientes: 'este cliente', produtos: 'este item do catálogo' }[store];
    let extra = '';
    if (store === 'clientes') { const n = list('os').filter(x => x.clienteId === id).length + list('orcamentos').filter(x => x.clienteId === id).length; if (n) extra = ` Os ${n} documentos dele continuam salvos, mas sem o cadastro.`; }
    if (store === 'os' && o.estoqueBaixado) extra = ' Os materiais já baixados não voltam para o estoque automaticamente.';
    if (!await confirmSheet(`Excluir ${nome}?${extra} Não dá para desfazer.`, { ok: 'Excluir', danger: true, title: 'Excluir' })) return;
    if (store === 'os') { for (const f of [...o.fotos.antes, ...o.fotos.depois]) await DB.del('fotos', f).catch(() => { }); const orc = o.orcamentoId && S.orcamentos[o.orcamentoId]; if (orc) { orc.osId = null; orc.status = 'enviado'; save('orcamentos', orc); } }
    if (store === 'orcamentos' && o.osId && S.os[o.osId]) { S.os[o.osId].orcamentoId = null; save('os', S.os[o.osId]); }
    if (store === 'cobrancas' && o.osId && S.os[o.osId]) { S.os[o.osId].cobrancaId = null; save('os', S.os[o.osId]); }
    CUR = null; NEW_IDS.delete(id); await remove(store, id); toast('Excluído');
    const back = { orcamentos: '#/orcamentos', os: '#/os', cobrancas: '#/cobrancas', clientes: '#/clientes', produtos: '#/estoque' }[store];
    if (navDepth > 0) { navDepth--; history.back(); } else location.replace(back);
  },
  setStatus(el) {
    const o = curObj(); const v = el.dataset.v;
    if (v === 'concluida') { if (o.status !== 'concluida') concluirOS(o); return; }
    o.status = v; if (v === 'agendada' && !o.agendadaPara) toast('Informe a data e hora do agendamento');
    save('os', o); rerender();
  },
  concluirOS() { concluirOS(curObj()); },
  waOS() { const o = curObj(); flush(); openWhatsApp(cliente(o.clienteId)?.tel, msgOS(o)); },
  cobDaOS() {
    const o = curObj(); flush(); const t = calc(o).total;
    const cb = newDoc('cobrancas', { clienteId: o.clienteId, osId: o.id, valor: t, descricao: 'OS ' + numStr(o.numero) });
    NEW_IDS.delete(cb.id); o.cobrancaId = cb.id; save('os', o); go('#/cobranca/' + cb.id);
  },
  gps(el) {
    if (!navigator.geolocation) { toast('Este aparelho não informa localização'); return; }
    const o = curObj(); el.disabled = true; el.lastChild.textContent = ' Buscando sinal de GPS…';
    navigator.geolocation.getCurrentPosition(pos => {
      o.geo = { lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy, em: nowISO() };
      save('os', o); rerender(); toast('Localização registrada');
    }, err => {
      el.disabled = false; el.lastChild.textContent = ' Tentar de novo';
      toast(err.code === 1 ? 'Permita o acesso à localização nas configurações do navegador' : 'Sem sinal de GPS agora. Tente em área aberta.');
    }, { enableHighAccuracy: true, timeout: 25000, maximumAge: 60000 });
  },
  sign: () => signSheet(),
  rmFoto(el) {
    const o = curObj(); const k = el.dataset.k; const [fid] = o.fotos[k].splice(+el.dataset.i, 1);
    DB.del('fotos', fid).catch(() => { }); fotoCache.delete(fid); save('os', o); rerender();
  },
  viewFoto(el) {
    openSheet('Foto', `<img src="${el.src}" alt="" style="width:100%;border-radius:10px">`);
  },
  doc(el) { flush(); navDepth++; location.hash = `#/doc/${el.dataset.k}/${CUR.id}`; },
  docBack() { if (navDepth > 0) { navDepth--; history.back(); } else location.replace('#/inicio'); },
  print() { window.print(); },
  waCli() { const c = curObj(); flush(); openWhatsApp(c.tel, `Olá, ${c.nome.split(' ')[0]}! Aqui é ${S.cfg.nome || ''}.`); },
  waCob() { sendCobranca(curObj()); setTimeout(rerender, 400); },
  waCobId(el) { sendCobranca(S.cobrancas[el.dataset.id]); },
  waPixSo() { const c = curObj(); openWhatsApp(cliente(c.clienteId)?.tel, pixPayload({ valor: c.valor, txid: 'COB' + numStr(c.numero) })); },
  copyPix() { copyText($('#pixCode').textContent, 'Código Pix copiado'); },
  pagarCob() { flush(); pagarSheet(curObj()); },
  reabrirCob() { const c = curObj(); c.status = 'aberta'; c.pagaEm = ''; c.forma = ''; save('cobrancas', c); rerender(); },
  mov(el) { flush(); movSheet(curObj(), el.dataset.v); },
  rmLogo() { S.cfg.logo = ''; saveCfg(); rerender(); },
  backup(el) { exportBackup(el.dataset.v); },
  async rmExemplos() {
    if (!await confirmSheet('Apagar todos os registros de exemplo? O que você cadastrou continua.', { ok: 'Apagar exemplos', danger: true })) return;
    for (const s of ['clientes', 'produtos', 'movimentos', 'orcamentos', 'os', 'cobrancas']) for (const o of list(s)) if (o.exemplo) await remove(s, o.id);
    toast('Exemplos apagados'); rerender();
  },
  async wipe() {
    if (!await confirmSheet('Apagar <b>todos</b> os clientes, orçamentos, OS, estoque e cobranças deste aparelho? Faça um backup antes.', { ok: 'Apagar tudo', danger: true, title: 'Apagar tudo' })) return;
    for (const s of STORES) await DB.clear(s);
    fotoCache.clear(); await loadAll(); applyTheme(); location.replace('#/inicio'); render(); toast('Dados apagados');
  },
  async install() { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice.catch(() => { }); installPrompt = null; rerender(); },
  fAgenda(el) { UI.agendaF = el.dataset.v; rerender(); },
  pedirNotif() {
    if (!('Notification' in window)) { toast('Este navegador não aceita notificações'); return; }
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') { S.cfg.notif.ativo = true; saveCfg(); toast('Notificações ativadas'); checkAgenda(); }
      else toast('Permissão não concedida');
      rerender();
    });
  },
  toggleNotif() {
    const c = S.cfg.notif;
    if (!c.ativo && (!('Notification' in window) || Notification.permission !== 'granted')) { ACT.pedirNotif(); return; }
    c.ativo = !c.ativo; saveCfg(); rerender();
    if (c.ativo) checkAgenda();
  },
  exportAgenda() {
    const evs = list('os').filter(o => !['concluida', 'cancelada'].includes(o.status) && o.agendadaPara).map(osToEvent);
    exportICS(evs, 'agenda-ordem-em-campo.ics');
  },
  exportOSIcs(el) {
    const o = S.os[el.dataset.id]; if (!o || !o.agendadaPara) { toast('Defina data e hora antes'); return; }
    exportICS([osToEvent(o)], 'os-' + numStr(o.numero) + '.ics');
  }
};

/* ================= eventos globais ================= */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#/"]'); if (a) navDepth++;
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName !== 'A') e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.search !== undefined) {
    UI.q[el.dataset.search] = el.value;
    if (el.closest('.sheet')) { const l = $('#pickLst'); if (l && LIST_SHEET) l.innerHTML = LIST_SHEET(); }
    else { const l = $('#lst'); if (l && LIST) l.innerHTML = LIST(); }
    return;
  }
  const o = curObj(); if (!o) return;
  if (el.dataset.f) {
    let v = el.value; if (el.dataset.type === 'num') v = parseNum(v);
    o[el.dataset.f] = v; touch();
    if (el.dataset.live) updateTotals();
    if (CUR.store === 'meta') { flush(); }
    if (CUR.store === 'os' && el.dataset.f === 'agendadaPara') o.notif = { lembrete: false, hora: false };
    if (CUR.store === 'clientes' && el.dataset.f === 'nome') $('#title').textContent = v || 'Novo cliente';
    if (CUR.store === 'produtos' && el.dataset.f === 'nome') $('#title').textContent = v || 'Novo item';
  } else if (el.dataset.it !== undefined) {
    const it = o.itens[+el.dataset.it]; if (!it) return;
    it[el.dataset.k] = el.dataset.k === 'descricao' ? el.value : parseNum(el.value);
    touch(); updateTotals();
  }
});
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.rerender) { flush(); rerender(); return; }
  if (el.dataset.notifcfg) { S.cfg.notif.antecedenciaMin = Number(el.value); saveCfg(); return; }
  // atualiza só o bloco do Pix, sem redesenhar a tela (não rouba o toque do próximo botão)
  if (el.dataset.f && CUR?.store === 'meta' && ['pixTipo', 'pixChave', 'pixNome', 'pixCidade', 'nome', 'cidade'].includes(el.dataset.f)) { flush(); const b = $('#pixTest'); if (b) b.innerHTML = pixTestHTML(); return; }
  if (el.dataset.f && CUR?.store === 'cobrancas' && el.dataset.f === 'valor') { flush(); const b = $('#pixCard'); if (b) b.innerHTML = pixCardHTML(curObj()); return; }
  if (el.dataset.f && CUR?.store === 'os' && el.dataset.f === 'agendadaPara') { flush(); rerender(); return; }
  if (el.dataset.photo) {
    const o = curObj(); const files = Array.from(el.files || []); if (!files.length) return;
    toast(files.length > 1 ? `Salvando ${files.length} fotos…` : 'Salvando foto…', 1500);
    for (const f of files) {
      try { const dataUrl = await compressImage(f); const id = uid(); await DB.put('fotos', { id, dataUrl, criadoEm: nowISO() }); fotoCache.set(id, dataUrl); o.fotos[el.dataset.photo].push(id); }
      catch { toast('Não foi possível ler uma das fotos'); }
    }
    await save('os', o); rerender(); return;
  }
  if (el.dataset.logo) { const f = el.files?.[0]; if (!f) return; try { S.cfg.logo = await compressImage(f, 400, 0.85); await saveCfg(); rerender(); } catch { toast('Imagem inválida'); } return; }
  if (el.dataset.restore) { const f = el.files?.[0]; if (f) restoreBackup(f); el.value = ''; }
});
document.addEventListener('focusout', e => {
  const el = e.target;
  if (el.dataset.it !== undefined && el.dataset.k !== 'descricao') { const o = curObj(); const it = o?.itens[+el.dataset.it]; if (it) el.value = el.dataset.k === 'qtd' ? fmtQ(it.qtd) : fmtIn(it.preco); }
  if (el.dataset.type === 'num' && el.dataset.f && el.dataset.f !== 'validadeDias' && el.dataset.f !== 'validadePadrao' && el.dataset.f !== 'prazoCobranca') { const o = curObj(); if (o && el.dataset.f !== 'minimo') el.value = fmtIn(o[el.dataset.f]); }
  flush();
});
$('#backBtn').addEventListener('click', goBack);
window.addEventListener('hashchange', () => render());
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else checkAgenda(); });

/* ================= lembretes / notificações da agenda ================= */
async function fireNotif(o, atNow) {
  const hora = o.agendadaPara.length > 10 ? o.agendadaPara.slice(11, 16) : '';
  const title = (atNow ? 'Agora: ' : 'Em breve: ') + nomeCli(o.clienteId);
  const body = (atNow ? `Serviço agendado para agora${hora ? ' (' + hora + ')' : ''}` : `Serviço às ${hora}`) + (o.endereco ? ' · ' + o.endereco : '');
  const opts = { body, tag: 'os-' + o.id + (atNow ? '-hora' : '-lembrete'), icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 80, 200], data: { osId: o.id } };
  try { if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.ready; await reg.showNotification(title, opts); return; } }
  catch (e) { console.warn(e); }
  try { new Notification(title, opts); } catch (e) { console.warn(e); }
}
function checkAgenda() {
  if (!S.cfg?.notif?.ativo || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now(); const lead = Number(S.cfg.notif.antecedenciaMin) || 0;
  for (const o of list('os')) {
    if (['concluida', 'cancelada'].includes(o.status) || !o.agendadaPara) continue;
    const t = new Date(o.agendadaPara).getTime(); if (!t) continue;
    o.notif = o.notif || { lembrete: false, hora: false };
    if (lead > 0 && !o.notif.lembrete && now >= t - lead * 60000 && now < t) { o.notif.lembrete = true; save('os', o, { silent: true }); fireNotif(o, false); }
    if (!o.notif.hora && now >= t && now < t + 15 * 60000) { o.notif.hora = true; save('os', o, { silent: true }); fireNotif(o, true); }
  }
}
navigator.serviceWorker?.addEventListener('message', e => { if (e.data?.type === 'nav' && e.data.hash) location.hash = e.data.hash; });
function updateNet() { const on = navigator.onLine; const n = $('#net'); n.classList.toggle('off', !on); n.lastChild.textContent = on ? 'Online' : 'Offline'; n.title = on ? 'Conectado' : 'Sem internet: tudo continua funcionando e fica salvo no aparelho'; }
window.addEventListener('online', updateNet); window.addEventListener('offline', updateNet);
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (location.hash === '#/mais') rerender(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

/* ================= dados de exemplo ================= */
async function seedExemplos() {
  const X = { exemplo: true };
  const cli = [
    { nome: 'Maria Aparecida Souza', tel: '(18) 90000-0101', endereco: 'Rua das Palmeiras, 120 – Centro' },
    { nome: 'Condomínio Solar das Águas', tel: '(18) 90000-0202', endereco: 'Av. Beira Rio, 800 – bloco B' },
    { nome: 'Padaria Pão de Mel', tel: '(18) 90000-0303', endereco: 'Rua São Paulo, 45 – Vila Maria' }
  ].map(c => ({ id: uid(), criadoEm: nowISO(), email: '', doc: '', obs: '', ...c, ...X }));
  const prod = [
    ['servico', 'Visita técnica / diagnóstico', 'serviço', 0, 0, 0, 80],
    ['servico', 'Instalação de tomada ou interruptor', 'un', 0, 0, 0, 45],
    ['servico', 'Instalação de chuveiro elétrico', 'un', 0, 0, 0, 120],
    ['servico', 'Troca de disjuntor', 'un', 0, 0, 0, 90],
    ['servico', 'Limpeza de ar-condicionado split', 'un', 0, 0, 0, 180],
    ['material', 'Cabo flexível 2,5 mm²', 'm', 50, 20, 2.9, 4.5],
    ['material', 'Disjuntor bipolar 32 A', 'un', 3, 2, 38, 58],
    ['material', 'Tomada 2P+T 20 A', 'un', 12, 5, 11, 18.9],
    ['material', 'Fita isolante 20 m', 'un', 1, 3, 5.5, 9],
    ['material', 'Gás refrigerante R-410A', 'kg', 2, 1, 85, 120]
  ].map(([tipo, nome, unidade, qtd, minimo, custo, preco]) => ({ id: uid(), criadoEm: nowISO(), tipo, nome, unidade, qtd, minimo, custo, preco, ...X }));
  for (const c of cli) await save('clientes', c);
  for (const p of prod) await save('produtos', p);
  const it = (p, q) => ({ id: uid(), produtoId: p.id, descricao: p.nome, qtd: q, unidade: p.unidade, preco: p.preco, tipo: p.tipo });
  const orc = newDoc('orcamentos', { clienteId: cli[2].id, status: 'enviado', enviadoEm: nowISO(), itens: [it(prod[1], 4), it(prod[7], 4), it(prod[5], 15)], obs: 'Execução em 1 dia. Pagamento na conclusão.', ...X });
  const os1 = newDoc('os', { clienteId: cli[0].id, status: 'agendada', agendadaPara: addDays(todayStr(), 1) + 'T09:00', endereco: cli[0].endereco, descricao: 'Chuveiro desarmando o disjuntor', itens: [it(prod[0], 1), it(prod[3], 1), it(prod[6], 1)], ...X });
  const os2 = newDoc('os', { clienteId: cli[1].id, status: 'andamento', agendadaPara: todayStr() + 'T14:00', endereco: cli[1].endereco, descricao: 'Limpeza dos splits da portaria', itens: [it(prod[4], 2)], ...X });
  const cob = newDoc('cobrancas', { clienteId: cli[1].id, valor: 360, vencimento: addDays(todayStr(), -3), descricao: 'Manutenção preventiva de agosto', ...X });
  for (const d of [orc, os1, os2, cob]) NEW_IDS.delete(d.id);
}

/* ================= inicialização ================= */
const APP_VERSION = '1.0.0';
async function boot() {
  updateNet();
  try { await DB.open(); await loadAll(); }
  catch (e) {
    console.error(e);
    $('#view').innerHTML = `<div class="banner warn">${icon('alert')}<div><b>Não foi possível abrir o banco de dados do aparelho.</b><br>Saia da navegação anônima ou libere o armazenamento para este site e abra de novo.</div></div>`;
    return;
  }
  applyTheme();
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) navigator.storage.persist(); } catch { }
  render();
  checkAgenda();
  setInterval(checkAgenda, 30000);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing; if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller)
            toast('Nova versão do app disponível', 0, { label: 'Atualizar', fn: () => { flush(); location.reload(); } });
        });
      });
    }).catch(err => console.warn('Service worker não registrado', err));
  }
}
boot();
