'use strict';

const APP = {
  page: 'home',
  password: 'SG393',
  keys: {
    session: 'sst_prime_session_v3',
    remember: 'sst_prime_remember_v3',
    theme: 'sst_prime_theme_v3',
    favorites: 'sst_prime_favorites_v3',
    epiView: 'sst_prime_epi_view_v3',
  },
  filters: { epi: '', category: '', risco: '', empresa: '', w2h: '', nr: '', painel: '' },
  favoriteOnly: false,
  epiView: 'grid',
  currentEpi: null,
  commandItems: [],
  commandIndex: 0,
  rendered: false,
};

const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
const txt = value => String(value ?? '');
const normalize = value => txt(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const icon = id => `<svg aria-hidden="true"><use href="#${id}"></use></svg>`;
const debounce = (fn, wait = 160) => { let timer; return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), wait); }; };
const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" rx="28" fill="#f5f7f6"/><path d="M210 255l70-70 50 50 35-35 70 70" fill="none" stroke="#9bb0a3" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="390" cy="135" r="28" fill="#dce7df"/><text x="300" y="330" text-anchor="middle" font-family="Arial" font-size="24" fill="#64756a">Imagem indisponível</text></svg>');

function safeArray(value) { return Array.isArray(value) ? value : []; }
function dataReady() { return typeof DATA !== 'undefined' && DATA && typeof DATA === 'object'; }

function toast(title, description = '', type = 'success') {
  const stack = $('#toastStack');
  if (!stack) return;
  const node = document.createElement('article');
  node.className = `toast ${type}`;
  node.innerHTML = `<span class="toast-icon">${type === 'error' ? '!' : icon('i-check')}</span><div><b></b><small></small></div><button type="button" aria-label="Fechar">×</button>`;
  $('b', node).textContent = title;
  $('small', node).textContent = description;
  $('button', node).addEventListener('click', () => node.remove());
  stack.appendChild(node);
  setTimeout(() => node.remove(), 3600);
}

window.sstToast = toast;

async function copyText(value) {
  const content = txt(value).trim();
  if (!content) throw new Error('empty');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(content);
  const area = document.createElement('textarea');
  area.value = content;
  area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
  document.body.appendChild(area);
  area.select();
  const success = document.execCommand('copy');
  area.remove();
  if (!success) throw new Error('copy');
}

function getTheme() {
  const stored = localStorage.getItem(APP.keys.theme);
  if (stored === 'dark' || stored === 'light') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(APP.keys.theme, theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#07110c' : '#f3f7f5');
}

function boot() {
  applyTheme(getTheme());
  const hasAccess = sessionStorage.getItem(APP.keys.session) === 'ok' || localStorage.getItem(APP.keys.remember) === 'ok';
  setTimeout(() => {
    $('#bootScreen')?.classList.add('hide');
    setTimeout(() => {
      $('#bootScreen')?.remove();
      hasAccess ? showApp(false) : showAuth();
    }, 500);
  }, 850);
}

function showAuth() {
  document.body.classList.remove('logged-in');
  $('#authScreen').hidden = false;
  $('#appShell').hidden = true;
  closeSidebar();
  if (matchMedia('(min-width: 761px)').matches) setTimeout(() => $('#loginPass')?.focus(), 120);
}

function showApp(welcome = true) {
  if (!dataReady()) {
    showAuth();
    toast('Base de dados não encontrada', 'Confira se js/data.js está na pasta correta.', 'error');
    return;
  }
  document.body.classList.add('logged-in');
  $('#authScreen').hidden = true;
  $('#appShell').hidden = false;
  if (!APP.rendered) {
    renderEverything();
    APP.rendered = true;
  }
  openPage(APP.page, false);
  updateClock();
  if (!APP.clockTimer) APP.clockTimer = setInterval(updateClock, 1000);
  if (welcome) toast('Acesso liberado', 'Bem-vindo à Central SST Prime.');
}

function bindAuth() {
  $('#loginForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const user = $('#loginUser')?.value.trim() || 'Técnico Administrador';
    const pass = $('#loginPass')?.value || '';
    const message = $('#loginError');
    if (pass !== APP.password) {
      message.textContent = 'Senha incorreta. Tente novamente.';
      $('#loginPass').value = '';
      $('#loginPass')?.focus();
      return;
    }
    message.textContent = '';
    sessionStorage.setItem(APP.keys.session, 'ok');
    if ($('#rememberLogin')?.checked) localStorage.setItem(APP.keys.remember, 'ok');
    showApp(false);
    toast(`Olá, ${user}`, 'Sua central está pronta para uso.');
  });
  $('#hintButton')?.addEventListener('click', () => {
    $('#loginError').textContent = 'Dica: a senha padrão é SG393.';
  });
  $('#passwordToggle')?.addEventListener('click', event => {
    const input = $('#loginPass');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? '🙈' : '👁';
    event.currentTarget.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

const pageMeta = {
  home: ['VISÃO GERAL', () => `${greeting()}, Gestor`],
  epis: ['CATÁLOGO TÉCNICO', 'Equipamentos de proteção'],
  riscos: ['AVALIAÇÕES', 'Riscos e conclusões'],
  empresas: ['MAPEAMENTO', 'Empresas e exposições'],
  frases: ['AUTOMAÇÃO', 'Gerador de frases'],
  w2h: ['PLANO DE AÇÃO', 'Metodologia 5W2H'],
  nrs: ['NORMAS', 'Normas regulamentadoras'],
  painel: ['RECURSOS', 'Painel técnico'],
  conversor: ['DOCUMENTOS', 'Conversor Word e PDF'],
};

function openPage(page, smooth = true) {
  const target = document.getElementById(page);
  if (!target) return;
  APP.page = page;
  $$('.page').forEach(item => item.classList.toggle('active', item.id === page));
  $$('.nav-btn').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  const [eyebrow, title] = pageMeta[page] || ['SST PRIME', 'Central Técnica'];
  $('#pageEyebrow').textContent = eyebrow;
  $('#pageTitle').textContent = typeof title === 'function' ? title() : title;
  const content = $('#mainContent');
  if (content) content.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
  closeSidebar();
}

function updateClock() {
  const now = new Date();
  $('#clockPill').textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  $('#clockText').textContent = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  if (APP.page === 'home') $('#pageTitle').textContent = `${greeting()}, Gestor`;
}

function openSidebar() { $('#sidebar')?.classList.add('open'); $('#sidebarScrim')?.classList.add('show'); }
function closeSidebar() { $('#sidebar')?.classList.remove('open'); $('#sidebarScrim')?.classList.remove('show'); }

function bindNavigation() {
  $$('.nav-btn, .brand, [data-jump]').forEach(button => button.addEventListener('click', () => openPage(button.dataset.page || button.dataset.jump)));
  $$('[data-scroll]').forEach(button => button.addEventListener('click', () => {
    const selector = button.dataset.scroll;
    openPage('home');
    setTimeout(() => $(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
  }));
  $('#menuToggle')?.addEventListener('click', openSidebar);
  $('#sidebarScrim')?.addEventListener('click', closeSidebar);
  $('#themeToggle')?.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#logoutButton')?.addEventListener('click', () => {
    sessionStorage.removeItem(APP.keys.session);
    localStorage.removeItem(APP.keys.remember);
    toast('Sessão encerrada', 'Você saiu da plataforma.');
    showAuth();
  });
  $('#floatingMascot')?.addEventListener('click', () => openPage('home'));
}

function renderEverything() {
  renderCounters();
  populateCategories();
  renderEpis();
  renderRiscos();
  renderEmpresas();
  renderW2H();
  renderNRs();
  renderPainel();
  renderAlerts();
  buildCommandIndex();
}

function createKpi(title, value, description, iconId, accent, soft) {
  const card = document.createElement('article');
  card.className = 'kpi-card';
  card.style.setProperty('--accent', accent);
  card.style.setProperty('--accent-soft', soft);
  card.innerHTML = `<div class="kpi-top"><span class="kpi-icon">${icon(iconId)}</span><small>BASE ATUAL</small></div><strong>${value}</strong><p>${title} • ${description}</p>`;
  return card;
}
function renderCounters() {
  const epis = safeArray(DATA.epis).length;
  const riscos = safeArray(DATA.riscos).length;
  const empresas = safeArray(DATA.empresas).length;
  const nrs = safeArray(DATA.nrs).length;
  const cards = [
    ['EPIs', epis, 'itens cadastrados', 'i-helmet', 'var(--green)', 'var(--green-3)'],
    ['Riscos', riscos, 'avaliações técnicas', 'i-alert', 'var(--orange)', 'rgba(239,139,58,.13)'],
    ['Empresas', empresas, 'mapeamentos ativos', 'i-building', 'var(--blue)', 'rgba(60,127,240,.12)'],
    ['NRs', nrs, 'normas disponíveis', 'i-book', 'var(--purple)', 'rgba(138,98,223,.13)'],
  ];
  const grid = $('#kpiGrid');
  grid.replaceChildren(...cards.map(args => createKpi(...args)));
  $('#heroEpiCount').textContent = epis;
  $('#epiTotalHeading').textContent = epis;
}

function categoryIcon(category) { return txt(category).trim().split(/\s+/)[0] || '🦺'; }
function categoryName(category) { return txt(category).replace(/^\S+\s*/, '').trim() || txt(category); }
function getFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem(APP.keys.favorites) || '[]').map(txt)); }
  catch { return new Set(); }
}
function saveFavorites(set) { localStorage.setItem(APP.keys.favorites, JSON.stringify([...set])); }
function toggleFavorite(item) {
  const favorites = getFavorites();
  const id = txt(item.ca);
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveFavorites(favorites);
  renderEpis();
  updateModalFavorite();
}

function populateCategories() {
  const select = $('#categorySelect');
  if (!select) return;
  const groups = new Map();
  safeArray(DATA.epis).forEach(item => groups.set(item.categoria, (groups.get(item.categoria) || 0) + 1));
  const fragment = document.createDocumentFragment();
  [...groups.entries()].sort((a, b) => categoryName(a[0]).localeCompare(categoryName(b[0]), 'pt-BR')).forEach(([category, count]) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = `${category} — ${count}`;
    fragment.appendChild(option);
  });
  select.appendChild(fragment);
  APP.epiView = localStorage.getItem(APP.keys.epiView) || 'grid';
  updateViewButton();
}

function createEpiCard(item, favorites) {
  const card = document.createElement('article');
  card.className = 'epi-card';
  const favorite = favorites.has(txt(item.ca));
  card.innerHTML = `
    <div class="epi-image"><img alt="" loading="lazy" decoding="async"></div>
    <div class="epi-meta"><span class="category-chip"></span><span class="ca-chip"></span></div>
    <h3></h3>
    <div class="epi-actions">
      <button class="card-button primary" type="button">Detalhes ${icon('i-arrow')}</button>
      <button class="card-button copy-card" type="button" aria-label="Copiar CA">${icon('i-copy')}</button>
      <button class="card-button favorite-card ${favorite ? 'active' : ''}" type="button" aria-label="${favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${icon('i-star')}</button>
    </div>`;
  const image = $('img', card);
  image.src = item.imagem || FALLBACK_IMAGE;
  image.alt = item.nome || 'Equipamento de proteção individual';
  image.addEventListener('error', () => { image.src = FALLBACK_IMAGE; }, { once: true });
  $('.category-chip', card).textContent = `${categoryIcon(item.categoria)} ${categoryName(item.categoria)}`;
  $('.ca-chip', card).textContent = `CA ${item.ca || 'N/I'}`;
  $('h3', card).textContent = item.nome || 'EPI sem nome';
  $('.primary', card).addEventListener('click', () => openEpiModal(item));
  $('.copy-card', card).addEventListener('click', async () => {
    try { await copyText(item.ca); toast('CA copiado', `CA ${item.ca}`); }
    catch { toast('Não foi possível copiar', 'O CA não está disponível.', 'error'); }
  });
  $('.favorite-card', card).addEventListener('click', () => toggleFavorite(item));
  return card;
}

function renderEpis() {
  const query = normalize(APP.filters.epi);
  const favorites = getFavorites();
  const items = safeArray(DATA.epis).filter(item => {
    const matchesText = !query || normalize(`${item.nome} ${item.ca} ${item.categoria}`).includes(query);
    const matchesCategory = !APP.filters.category || item.categoria === APP.filters.category;
    const matchesFavorite = !APP.favoriteOnly || favorites.has(txt(item.ca));
    return matchesText && matchesCategory && matchesFavorite;
  });
  const grid = $('#epiList');
  grid.classList.toggle('compact', APP.epiView === 'compact');
  const fragment = document.createDocumentFragment();
  items.forEach(item => fragment.appendChild(createEpiCard(item, favorites)));
  grid.replaceChildren(fragment);
  $('#epiCount').textContent = items.length;
  $('#epiEmpty').classList.toggle('show', items.length === 0);
}

function updateViewButton() {
  const label = $('#viewToggle span');
  if (label) label.textContent = APP.epiView === 'grid' ? 'Compacto' : 'Cards';
  $('#viewToggle')?.classList.toggle('active', APP.epiView === 'compact');
}

function bindEpiFilters() {
  $('#searchEpi')?.addEventListener('input', debounce(event => { APP.filters.epi = event.target.value; renderEpis(); }));
  $('#categorySelect')?.addEventListener('change', event => { APP.filters.category = event.target.value; renderEpis(); });
  $('#favoriteFilterBtn')?.addEventListener('click', event => {
    APP.favoriteOnly = !APP.favoriteOnly;
    event.currentTarget.classList.toggle('active', APP.favoriteOnly);
    event.currentTarget.setAttribute('aria-pressed', String(APP.favoriteOnly));
    renderEpis();
  });
  $('#viewToggle')?.addEventListener('click', () => {
    APP.epiView = APP.epiView === 'grid' ? 'compact' : 'grid';
    localStorage.setItem(APP.keys.epiView, APP.epiView);
    updateViewButton();
    renderEpis();
  });
  $('#clearEpiFilters')?.addEventListener('click', () => {
    APP.filters.epi = '';
    APP.filters.category = '';
    APP.favoriteOnly = false;
    $('#searchEpi').value = '';
    $('#categorySelect').value = '';
    $('#favoriteFilterBtn').classList.remove('active');
    $('#favoriteFilterBtn').setAttribute('aria-pressed', 'false');
    renderEpis();
    toast('Filtros removidos', 'Todos os EPIs estão visíveis novamente.');
  });
}

function createInfoCard(meta, title, description, copyValue) {
  const card = document.createElement('article');
  card.className = 'info-card';
  card.innerHTML = `<span class="tag"></span><h3></h3><p></p><footer><button class="copy-button" type="button">${icon('i-copy')} Copiar conteúdo</button></footer>`;
  $('.tag', card).textContent = meta;
  $('h3', card).textContent = title || 'Sem título';
  $('p', card).textContent = description || '';
  $('.copy-button', card).addEventListener('click', async () => {
    try { await copyText(copyValue || description || title); toast('Conteúdo copiado', 'Pronto para colar onde precisar.'); }
    catch { toast('Não foi possível copiar', 'Nenhum conteúdo disponível.', 'error'); }
  });
  return card;
}

function genericRender({ items, query, haystack, target, empty, factory }) {
  const q = normalize(query);
  const filtered = safeArray(items).filter(item => !q || normalize(haystack(item)).includes(q));
  const fragment = document.createDocumentFragment();
  filtered.forEach((item, index) => fragment.appendChild(factory(item, index)));
  $(target)?.replaceChildren(fragment);
  $(empty)?.classList.toggle('show', filtered.length === 0);
}

function renderRiscos() {
  genericRender({ items: DATA.riscos, query: APP.filters.risco, haystack: i => `${i.tipo} ${i.titulo} ${i.texto}`, target: '#riskList', empty: '#riskEmpty', factory: i => createInfoCard(i.tipo, i.titulo, i.texto, `${i.titulo}\n\n${i.texto}`) });
}
function renderEmpresas() {
  genericRender({
    items: DATA.empresas, query: APP.filters.empresa, haystack: i => `${i.nome} ${i.risco} ${i.setor}`, target: '#empresaList', empty: '#empresaEmpty',
    factory: i => {
      const card = document.createElement('article');
      card.className = 'info-card company-card';
      card.innerHTML = `<span class="company-icon"></span><div class="company-risk"></div><h3></h3><p class="company-sector"><b>Setor:</b> <span></span></p><footer><button class="copy-button" type="button">${icon('i-copy')} Copiar empresa</button></footer>`;
      $('.company-icon', card).textContent = i.emoji || '🏢';
      $('.company-risk', card).textContent = i.risco || 'RISCO NÃO INFORMADO';
      $('h3', card).textContent = i.nome || 'Empresa não informada';
      $('.company-sector span', card).textContent = i.setor || 'Não informado';
      $('.copy-button', card).addEventListener('click', async () => { try { await copyText(`${i.nome} — ${i.risco} — ${i.setor}`); toast('Empresa copiada', i.nome); } catch { toast('Erro ao copiar', '', 'error'); } });
      return card;
    }
  });
}
function formatW2HText(item) {
  return txt(item.texto).trim();
}

function renderW2H() {
  genericRender({
    items: DATA.w2h, query: APP.filters.w2h, haystack: i => `${i.titulo} ${i.texto}`, target: '#w2hList', empty: '#w2hEmpty',
    factory: (i, index) => {
      const step = String(index + 1).padStart(2, '0');
      const card = document.createElement('article');
      card.className = 'timeline-card';
      card.dataset.index = step;
      card.innerHTML = `<span>ETAPA ${step}</span><h3></h3><p></p><footer><button class="timeline-copy-button" type="button" aria-label="Copiar conteúdo da etapa ${step}">${icon('i-copy')}<span>Copiar conteúdo</span></button></footer>`;
      $('h3', card).textContent = i.titulo;
      $('p', card).textContent = i.texto;
      $('.timeline-copy-button', card).addEventListener('click', async event => {
        const button = event.currentTarget;
        try {
          await copyText(formatW2HText(i));
          button.classList.add('copied');
          button.querySelector('span').textContent = 'Copiado!';
          toast('Conteúdo copiado', `“${formatW2HText(i)}” está pronto para colar.`);
          setTimeout(() => {
            button.classList.remove('copied');
            button.querySelector('span').textContent = 'Copiar conteúdo';
          }, 1600);
        } catch {
          toast('Não foi possível copiar', 'Tente novamente.', 'error');
        }
      });
      return card;
    }
  });
}

async function copyFullW2H() {
  const items = safeArray(DATA.w2h);
  if (!items.length) {
    toast('Nada para copiar', 'O plano 5W2H está vazio.', 'error');
    return;
  }
  const content = items.map(formatW2HText).filter(Boolean).join('\n');
  try {
    await copyText(content);
    toast('Conteúdos copiados', `${items.length} textos foram copiados.`);
  } catch {
    toast('Não foi possível copiar', 'Tente novamente.', 'error');
  }
}
function renderNRs() {
  genericRender({
    items: DATA.nrs, query: APP.filters.nr, haystack: i => `${i.codigo} ${i.nome}`, target: '#nrList', empty: '#nrEmpty',
    factory: i => {
      const card = document.createElement('article');
      card.className = 'nr-card';
      card.innerHTML = `<div class="nr-number"></div><h3></h3><a target="_blank" rel="noopener noreferrer">Abrir norma ${icon('i-external')}</a>`;
      $('.nr-number', card).textContent = i.codigo;
      $('h3', card).textContent = i.nome;
      $('a', card).href = i.link || '#';
      if (!i.link) { $('a', card).removeAttribute('href'); $('a', card).textContent = 'Link indisponível'; }
      return card;
    }
  });
}
function splitResourceTitle(title) {
  const value = txt(title).trim();
  const parts = value.split(/\s+/);
  const first = parts[0] || '📁';
  return { emoji: /[\p{Extended_Pictographic}]/u.test(first) ? first : '📁', name: /[\p{Extended_Pictographic}]/u.test(first) ? parts.slice(1).join(' ') : value };
}
function renderPainel() {
  genericRender({
    items: DATA.painel, query: APP.filters.painel, haystack: i => `${i.titulo} ${i.desc}`, target: '#painelList', empty: '#painelEmpty',
    factory: i => {
      const parsed = splitResourceTitle(i.titulo);
      const card = document.createElement('article');
      card.className = 'resource-card';
      card.innerHTML = `<span class="resource-icon"></span><h3></h3><p></p><a target="_blank" rel="noopener noreferrer"><span>Acessar recurso</span>${icon('i-arrow')}</a>`;
      $('.resource-icon', card).textContent = parsed.emoji;
      $('h3', card).textContent = parsed.name || i.titulo;
      $('p', card).textContent = i.desc || '';
      $('a', card).href = i.link || '#';
      if (!i.link) { $('a', card).removeAttribute('href'); $('a span', card).textContent = 'Link indisponível'; }
      return card;
    }
  });
}
function renderAlerts() {
  const box = $('#homeAlerts');
  const fragment = document.createDocumentFragment();
  safeArray(DATA.alertas).slice(0, 5).forEach(alert => {
    const item = document.createElement('div');
    item.className = 'status-item';
    item.innerHTML = '<i></i><span></span>';
    $('span', item).textContent = alert;
    fragment.appendChild(item);
  });
  box.replaceChildren(fragment);
}

function bindSearches() {
  $('#copyW2HAll')?.addEventListener('click', copyFullW2H);
  const mappings = [
    ['#searchRisco', 'risco', renderRiscos],
    ['#searchEmpresa', 'empresa', renderEmpresas],
    ['#searchW2H', 'w2h', renderW2H],
    ['#searchNR', 'nr', renderNRs],
    ['#searchPainel', 'painel', renderPainel],
  ];
  mappings.forEach(([selector, key, renderer]) => $(selector)?.addEventListener('input', debounce(event => { APP.filters[key] = event.target.value; renderer(); })));
}

function bindGenerator() {
  const date = $('#dataInput');
  if (date && !date.value) date.value = new Date().toISOString().slice(0, 10);
  $('#gerarFrasesBtn')?.addEventListener('click', () => {
    const company = $('#empresaInput').value.trim() || 'EMPRESA';
    const selectedDate = date.value || new Date().toISOString().slice(0, 10);
    const names = $('#nomesInput').value.split(/\r?\n/).map(name => name.trim()).filter(Boolean);
    if (!names.length) { toast('Insira pelo menos um nome', 'Use um nome por linha.', 'error'); return; }
    const result = names.map(name => `${name}, ${company}, , , ${selectedDate}`).join('\n');
    $('#frasesResultado').value = result;
    $('#frasesCount').textContent = `${names.length} ${names.length === 1 ? 'linha gerada' : 'linhas geradas'}`;
    toast('Frases geradas', `${names.length} linhas prontas para copiar.`);
  });
  $('#copiarFrasesBtn')?.addEventListener('click', async () => {
    try { await copyText($('#frasesResultado').value); toast('Resultado copiado', 'Todas as linhas foram copiadas.'); }
    catch { toast('Nada para copiar', 'Gere as frases primeiro.', 'error'); }
  });
  $('#limparFrasesBtn')?.addEventListener('click', () => {
    $('#empresaInput').value = '';
    $('#nomesInput').value = '';
    $('#frasesResultado').value = '';
    $('#frasesCount').textContent = '0 linhas geradas';
    toast('Campos limpos', 'O gerador está pronto para uma nova lista.');
  });
}

function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function hideModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  if (!$('.modal.show')) document.body.classList.remove('modal-open');
  if (id === 'epiModal') APP.currentEpi = null;
}
function bindModals() {
  $$('[data-close]').forEach(button => button.addEventListener('click', () => hideModal(button.dataset.close)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideModal('epiModal');
      hideModal('commandModal');
      closeSidebar();
    }
  });
}
function openEpiModal(item) {
  APP.currentEpi = item;
  const image = $('#epiModalImg');
  image.src = item.imagem || FALLBACK_IMAGE;
  image.alt = item.nome || 'EPI';
  image.onerror = () => { image.src = FALLBACK_IMAGE; };
  $('#epiModalCategory').textContent = `${categoryIcon(item.categoria)} ${categoryName(item.categoria)}`;
  $('#epiModalTitle').textContent = item.nome || 'Equipamento de proteção';
  $('#epiModalCA').textContent = `CA ${item.ca || 'N/I'}`;
  updateModalFavorite();
  showModal('epiModal');
  setTimeout(() => $('[data-close="epiModal"]')?.focus(), 60);
}
function updateModalFavorite() {
  const button = $('#toggleModalFavorite');
  if (!button || !APP.currentEpi) return;
  const favorite = getFavorites().has(txt(APP.currentEpi.ca));
  button.classList.toggle('active', favorite);
  button.innerHTML = `${icon('i-star')} ${favorite ? 'Remover favorito' : 'Favoritar'}`;
}
function bindEpiModal() {
  $('#copyModalCA')?.addEventListener('click', async () => {
    try { await copyText(APP.currentEpi?.ca); toast('CA copiado', `CA ${APP.currentEpi?.ca}`); }
    catch { toast('Não foi possível copiar', '', 'error'); }
  });
  $('#copyModalFull')?.addEventListener('click', async () => {
    try { await copyText(`${APP.currentEpi?.nome} — CA ${APP.currentEpi?.ca || 'N/I'}`); toast('Informações copiadas', 'Nome e CA foram copiados.'); }
    catch { toast('Não foi possível copiar', '', 'error'); }
  });
  $('#toggleModalFavorite')?.addEventListener('click', () => APP.currentEpi && toggleFavorite(APP.currentEpi));
}

function buildCommandIndex() {
  APP.commandItems = [
    ...safeArray(DATA.epis).map(item => ({ type: 'EPI', icon: categoryIcon(item.categoria), title: item.nome, subtitle: `CA ${item.ca} • ${categoryName(item.categoria)}`, page: 'epis', action: () => openEpiModal(item), search: `${item.nome} ${item.ca} ${item.categoria}` })),
    ...safeArray(DATA.nrs).map(item => ({ type: 'NR', icon: '📚', title: `${item.codigo} — ${item.nome}`, subtitle: 'Norma regulamentadora', page: 'nrs', action: () => item.link && window.open(item.link, '_blank', 'noopener,noreferrer'), search: `${item.codigo} ${item.nome}` })),
    ...safeArray(DATA.empresas).map(item => ({ type: 'EMPRESA', icon: item.emoji || '🏢', title: item.nome, subtitle: `${item.risco} • ${item.setor}`, page: 'empresas', search: `${item.nome} ${item.risco} ${item.setor}` })),
    ...safeArray(DATA.painel).map(item => ({ type: 'RECURSO', icon: splitResourceTitle(item.titulo).emoji, title: splitResourceTitle(item.titulo).name, subtitle: item.desc, page: 'painel', action: () => item.link && window.open(item.link, '_blank', 'noopener,noreferrer'), search: `${item.titulo} ${item.desc}` })),
    { type: 'PÁGINA', icon: '⚠️', title: 'Riscos e conclusões', subtitle: 'Abrir avaliações técnicas', page: 'riscos', search: 'riscos avaliações pgr ltcat' },
    { type: 'PÁGINA', icon: '🧠', title: 'Plano 5W2H', subtitle: 'Abrir plano de ação', page: 'w2h', search: '5w2h plano ação' },
    { type: 'PÁGINA', icon: '📋', title: 'Gerador de frases', subtitle: 'Abrir automação', page: 'frases', search: 'gerador frases empresa' },
    { type: 'PÁGINA', icon: '🔄', title: 'Conversor Word e PDF', subtitle: 'Converter DOCX para PDF ou PDF para DOCX', page: 'conversor', search: 'conversor word pdf docx arquivo documento' },
  ];
}
function openCommand() {
  showModal('commandModal');
  $('#commandInput').value = '';
  APP.commandIndex = 0;
  renderCommandResults('');
  setTimeout(() => $('#commandInput')?.focus(), 50);
}
function renderCommandResults(query) {
  const q = normalize(query);
  const results = APP.commandItems.filter(item => !q || normalize(item.search).includes(q)).slice(0, 18);
  const box = $('#commandResults');
  const meta = $('#commandMeta');
  meta.textContent = q ? `${results.length} resultados` : 'Sugestões rápidas';
  APP.commandIndex = Math.min(APP.commandIndex, Math.max(0, results.length - 1));
  box.innerHTML = '';
  if (!results.length) { box.innerHTML = '<div class="command-empty">Nenhum resultado encontrado.</div>'; return; }
  results.forEach((item, index) => {
    const button = document.createElement('button');
    button.className = `command-item ${index === APP.commandIndex ? 'active' : ''}`;
    button.type = 'button';
    button.innerHTML = `<span></span><div><b></b><small></small></div><em></em>`;
    $('span', button).textContent = item.icon;
    $('b', button).textContent = item.title;
    $('small', button).textContent = item.subtitle || '';
    $('em', button).textContent = item.type;
    button.addEventListener('click', () => executeCommand(item));
    box.appendChild(button);
  });
  box._results = results;
}
function executeCommand(item) {
  hideModal('commandModal');
  openPage(item.page);
  if (item.action) setTimeout(item.action, 170);
}
function bindCommand() {
  $('#globalSearchButton')?.addEventListener('click', openCommand);
  $('#commandInput')?.addEventListener('input', event => { APP.commandIndex = 0; renderCommandResults(event.target.value); });
  $('#commandInput')?.addEventListener('keydown', event => {
    const box = $('#commandResults');
    const results = box._results || [];
    if (event.key === 'ArrowDown') { event.preventDefault(); APP.commandIndex = Math.min(APP.commandIndex + 1, results.length - 1); renderCommandResults(event.currentTarget.value); }
    if (event.key === 'ArrowUp') { event.preventDefault(); APP.commandIndex = Math.max(APP.commandIndex - 1, 0); renderCommandResults(event.currentTarget.value); }
    if (event.key === 'Enter' && results[APP.commandIndex]) { event.preventDefault(); executeCommand(results[APP.commandIndex]); }
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openCommand(); }
    if (event.altKey && /^[1-9]$/.test(event.key)) {
      event.preventDefault();
      openPage(['home','epis','riscos','empresas','frases','w2h','nrs','painel','conversor'][Number(event.key) - 1]);
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function init() {
  bindAuth();
  bindNavigation();
  bindEpiFilters();
  bindSearches();
  bindGenerator();
  bindModals();
  bindEpiModal();
  bindCommand();
  registerServiceWorker();
  boot();
}

document.addEventListener('DOMContentLoaded', init);
