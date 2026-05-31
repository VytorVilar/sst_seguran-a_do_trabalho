'use strict';

const APP = {
  page: 'home',
  passHash: 'U0czOTM=', // SG393
  sessionKey: 'sst_prime_login_animado_ok',
  rememberKey: 'sst_prime_login_animado_remember',
  themeKey: 'sst_prime_theme',
  favoriteKey: 'sst_prime_epi_favorites',
  viewKey: 'sst_prime_epi_view',
  favoriteOnly: false,
  epiView: 'grid',
  currentEpi: null,
  filters: { epi: '', category: '', categorySearch: '', risco: '', empresa: '', w2h: '', nr: '', painel: '' },
};

const $ = (s, sc = document) => sc.querySelector(s);
const $$ = (s, sc = document) => [...sc.querySelectorAll(s)];
const text = v => String(v ?? '');
const norm = v => text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const el = (tag, cls, content) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (content !== undefined) node.textContent = content;
  return node;
};

const FALLBACK_IMG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" rx="20" fill="#ffffff"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="22" fill="#334155">Imagem indisponível</text></svg>');

function toast(message, type = 'success') {
  const box = $('#toast');
  if (!box) return;
  box.textContent = message;
  box.className = `toast show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { box.className = 'toast'; }, 2200);
}

async function copyText(value) {
  const txt = text(value).trim();
  if (!txt) throw new Error('empty');
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(txt);
  const area = document.createElement('textarea');
  area.value = txt;
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('copy');
}

function dataReady() {
  if (typeof DATA !== 'undefined') return true;
  toast('Base DATA não carregada. Confira o arquivo JS/data.js.', 'error');
  return false;
}

function createRing() {
  const ring = $('#animatedRing');
  if (!ring) return;
  ring.innerHTML = '';
  for (let i = 0; i < 48; i++) {
    const b = el('span', 'ring-bar');
    b.style.setProperty('--i', i);
    ring.appendChild(b);
  }
}

function boot() {
  createRing();
  applyTheme(localStorage.getItem(APP.themeKey) || 'light');
  const bootScreen = $('#bootScreen');
  const remembered = localStorage.getItem(APP.rememberKey) === 'ok' || sessionStorage.getItem(APP.sessionKey) === 'ok';
  setTimeout(() => {
    bootScreen?.classList.add('hide');
    setTimeout(() => {
      bootScreen?.remove();
      remembered ? showApp() : showAuth();
    }, 430);
  }, 1100);
}

function showAuth() {
  $('#authScreen').hidden = false;
  $('#appShell').hidden = true;
  setTimeout(() => $('#loginUser')?.focus(), 120);
}

function showApp() {
  if (!dataReady()) return showAuth();
  $('#authScreen').hidden = true;
  $('#appShell').hidden = false;
  renderEverything();
  bindAppOnce();
  setTitle(APP.page);
  updateClock();
  if (!APP.clockTimer) APP.clockTimer = setInterval(updateClock, 1000);
  toast('Sistema iniciado com sucesso ✅');
}

function login() {
  const pass = $('#loginPass')?.value || '';
  const user = $('#loginUser')?.value || 'Técnico Administrador';
  const error = $('#loginError');
  if (pass === atob(APP.passHash)) {
    sessionStorage.setItem(APP.sessionKey, 'ok');
    if ($('#rememberLogin')?.checked) localStorage.setItem(APP.rememberKey, 'ok');
    if (error) error.textContent = '';
    toast(`Bem-vindo, ${user}!`);
    showApp();
    return;
  }
  if (error) error.textContent = 'Senha incorreta. Confira e tente novamente.';
  $('#loginPass').value = '';
  $('#loginPass')?.focus();
}

function bindLogin() {
  $('#loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    login();
  });
  $('#hintButton')?.addEventListener('click', () => {
    const err = $('#loginError');
    if (err) err.textContent = 'Dica: mesma senha usada nas abas fechadas do painel.';
  });
}

function applyTheme(mode) {
  document.body.classList.toggle('dark', mode === 'dark');
  localStorage.setItem(APP.themeKey, mode);
}

function updateClock() {
  const now = new Date();
  const h = now.toLocaleTimeString('pt-BR', { hour12: false });
  const d = now.toLocaleDateString('pt-BR');
  if ($('#clockPill')) $('#clockPill').textContent = h;
  if ($('#clockText')) $('#clockText').textContent = `Atualizado em ${d} às ${h}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function setTitle(page) {
  const titles = {
    home: `${greeting()}, Gestor`,
    epis: 'EPIs',
    riscos: 'Riscos',
    empresas: 'Empresas',
    frases: 'Frases',
    w2h: '5W2H',
    nrs: 'Normas Regulamentadoras',
    painel: 'Painel de recursos',
  };
  const title = $('#pageTitle');
  if (title) title.textContent = titles[page] || 'SST - Segurança do trabalho';
}

function openPage(page) {
  if (!document.getElementById(page)) return;
  APP.page = page;
  $$('.page').forEach(p => p.classList.toggle('active', p.id === page));
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  $('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  setTitle(page);
}

function scrollToSelector(selector) {
  const target = $(selector);
  if (!target) return;
  if (APP.page !== 'home') openPage('home');
  setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
}

function bindAppOnce() {
  if (APP.bound) return;
  APP.bound = true;

  $$('.nav-btn, .brand').forEach(btn => btn.addEventListener('click', () => btn.dataset.page && openPage(btn.dataset.page)));
  $$('[data-jump]').forEach(btn => btn.addEventListener('click', () => openPage(btn.dataset.jump)));
  $$('[data-scroll]').forEach(btn => btn.addEventListener('click', () => scrollToSelector(btn.dataset.scroll)));

  $('#logoutButton')?.addEventListener('click', () => {
    sessionStorage.removeItem(APP.sessionKey);
    localStorage.removeItem(APP.rememberKey);
    toast('Sessão encerrada.');
    showAuth();
  });

  $('#themeToggle')?.addEventListener('click', () => {
    const next = document.body.classList.contains('dark') ? 'light' : 'dark';
    applyTheme(next);
  });

  $('#searchEpi')?.addEventListener('input', e => { APP.filters.epi = e.target.value; renderEpis(); });
  $('#categoryTrigger')?.addEventListener('click', () => toggleCategoryMenu());
  $('#categorySearch')?.addEventListener('input', e => {
    APP.filters.categorySearch = e.target.value;
    renderCategoryOptions();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#categoryDropdown')) closeCategoryMenu();
  });
  $('#favoriteFilterBtn')?.addEventListener('click', () => {
    APP.favoriteOnly = !APP.favoriteOnly;
    updateFavoriteFilterButton();
    renderEpis();
  });
  $('#viewToggle')?.addEventListener('click', () => {
    APP.epiView = APP.epiView === 'grid' ? 'compact' : 'grid';
    localStorage.setItem(APP.viewKey, APP.epiView);
    updateViewToggle();
    renderEpis();
  });
  $('#clearEpiFilters')?.addEventListener('click', () => {
    APP.filters.epi = '';
    APP.filters.category = '';
    APP.filters.categorySearch = '';
    APP.favoriteOnly = false;
    if ($('#searchEpi')) $('#searchEpi').value = '';
    if ($('#categorySearch')) $('#categorySearch').value = '';
    updateCategoryTrigger();
    updateFavoriteFilterButton();
    renderCategoryOptions();
    renderEpis();
    toast('Filtros limpos.');
  });
  bindEpiModal();
  $('#searchRisco')?.addEventListener('input', e => { APP.filters.risco = e.target.value; renderRiscos(); });
  $('#searchEmpresa')?.addEventListener('input', e => { APP.filters.empresa = e.target.value; renderEmpresas(); });
  $('#searchW2H')?.addEventListener('input', e => { APP.filters.w2h = e.target.value; renderW2H(); });
  $('#searchNR')?.addEventListener('input', e => { APP.filters.nr = e.target.value; renderNRs(); });
  $('#searchPainel')?.addEventListener('input', e => { APP.filters.painel = e.target.value; renderPainel(); });

  document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    try {
      await copyText(btn.dataset.copy);
      toast('Copiado para área de transferência 📋');
    } catch {
      toast('Não foi possível copiar.', 'error');
    }
  });

  bindGenerator();

  document.addEventListener('keydown', e => {
    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const pages = ['home', 'epis', 'riscos', 'empresas', 'frases', 'w2h', 'nrs', 'painel'];
    const idx = Number(e.key) - 1;
    if (pages[idx]) {
      e.preventDefault();
      openPage(pages[idx]);
    }
  });
}

function renderEverything() {
  renderCounters();
  renderCategories();
  renderEpis();
  renderRiscos();
  renderEmpresas();
  renderW2H();
  renderNRs();
  renderPainel();
  renderAlerts();
}

function renderCounters() {
  const cards = [
    ['EPIs', DATA.epis?.length || 0, 'Cadastrados'],
    ['Riscos', DATA.riscos?.length || 0, 'Mapeados'],
    ['Empresas', DATA.empresas?.length || 0, 'Ativas'],
    ['NRs', DATA.nrs?.length || 0, 'Disponíveis'],
  ];
  const grid = $('#kpiGrid');
  if (!grid) return;
  grid.innerHTML = '';
  cards.forEach(([title, value, sub]) => {
    const card = el('article', 'kpi');
    card.innerHTML = `<small>${title}</small><b>${value}</b><span>${sub}</span>`;
    grid.appendChild(card);
  });
}

function categoryIcon(cat) { return text(cat).split(' ')[0] || '📁'; }
function categoryName(cat) { return text(cat).replace(/^\S+\s*/, '') || text(cat); }


function getFavorites() {
  try { return JSON.parse(localStorage.getItem(APP.favoriteKey) || '[]'); }
  catch { return []; }
}

function setFavorites(list) {
  localStorage.setItem(APP.favoriteKey, JSON.stringify([...new Set(list)]));
}

function isFavorite(item) {
  return getFavorites().includes(text(item.ca));
}

function toggleFavorite(item) {
  const ca = text(item.ca);
  if (!ca) return;
  const favs = getFavorites();
  const next = favs.includes(ca) ? favs.filter(v => v !== ca) : [...favs, ca];
  setFavorites(next);
  renderEpis();
  if (APP.currentEpi && text(APP.currentEpi.ca) === ca) updateModalFavoriteButton();
}

function updateFavoriteFilterButton() {
  const btn = $('#favoriteFilterBtn');
  if (!btn) return;
  btn.classList.toggle('active', APP.favoriteOnly);
  btn.setAttribute('aria-pressed', APP.favoriteOnly ? 'true' : 'false');
  btn.textContent = APP.favoriteOnly ? '★ Favoritos' : '☆ Favoritos';
}

function updateViewToggle() {
  const btn = $('#viewToggle');
  if (!btn) return;
  btn.textContent = APP.epiView === 'grid' ? 'Modo compacto' : 'Modo cards';
}

function categoryList() {
  return [...new Set((DATA.epis || []).map(i => i.categoria).filter(Boolean))];
}

function renderCategories() {
  APP.epiView = localStorage.getItem(APP.viewKey) || APP.epiView || 'grid';
  updateViewToggle();
  updateFavoriteFilterButton();
  renderCategoryOptions();
  updateCategoryTrigger();
}

function renderCategoryOptions() {
  const box = $('#categoryOptions');
  if (!box) return;
  const q = norm(APP.filters.categorySearch);
  const cats = categoryList().filter(cat => !q || norm(cat).includes(q) || norm(categoryName(cat)).includes(q));
  const all = [{ value: '', icon: '📁', name: 'Todas as categorias', count: (DATA.epis || []).length }, ...cats.map(cat => ({
    value: cat,
    icon: categoryIcon(cat),
    name: categoryName(cat),
    count: (DATA.epis || []).filter(i => i.categoria === cat).length,
  }))];

  box.innerHTML = '';
  all.forEach(item => {
    const btn = el('button', `category-option ${APP.filters.category === item.value ? 'active' : ''}`);
    btn.type = 'button';
    btn.dataset.category = item.value;
    btn.innerHTML = `<span>${item.icon}</span><b>${item.name}</b><small>${item.count} itens</small><em>✓</em>`;
    btn.addEventListener('click', () => {
      APP.filters.category = item.value;
      updateCategoryTrigger();
      renderCategoryOptions();
      renderEpis();
      closeCategoryMenu();
    });
    box.appendChild(btn);
  });
}

function updateCategoryTrigger() {
  const current = APP.filters.category;
  const icon = $('#categoryTriggerIcon');
  const label = $('#categoryTriggerText');
  if (!icon || !label) return;
  icon.textContent = current ? categoryIcon(current) : '📁';
  label.textContent = current ? categoryName(current) : 'Todas as categorias';
}

function toggleCategoryMenu() {
  const menu = $('#categoryMenu');
  const trigger = $('#categoryTrigger');
  if (!menu || !trigger) return;
  const open = menu.classList.toggle('show');
  trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) setTimeout(() => $('#categorySearch')?.focus(), 60);
}

function closeCategoryMenu() {
  $('#categoryMenu')?.classList.remove('show');
  $('#categoryTrigger')?.setAttribute('aria-expanded', 'false');
}

function renderEpis() {
  const box = $('#epiList');
  const empty = $('#epiEmpty');
  if (!box) return;
  const q = norm(APP.filters.epi);
  const cat = APP.filters.category;
  const favs = getFavorites();

  const items = (DATA.epis || []).filter(item => {
    const hay = norm(`${item.nome} ${item.ca} ${item.categoria}`);
    const matchText = !q || hay.includes(q);
    const matchCat = !cat || item.categoria === cat;
    const matchFav = !APP.favoriteOnly || favs.includes(text(item.ca));
    return matchText && matchCat && matchFav;
  });

  box.classList.toggle('compact-mode', APP.epiView === 'compact');
  box.innerHTML = '';

  items.forEach(item => {
    const fav = favs.includes(text(item.ca));
    const card = el('article', 'data-card epi-card');
    const img = el('img');
    img.src = item.imagem || '';
    img.alt = item.nome || 'EPI';
    img.loading = 'lazy';
    img.onerror = () => { img.onerror = null; img.src = FALLBACK_IMG; };

    card.innerHTML = `<span class="ca-badge">CA ${item.ca || 'N/I'}</span>`;
    const favBtn = el('button', `favorite-btn ${fav ? 'active' : ''}`, fav ? '★' : '☆');
    favBtn.type = 'button';
    favBtn.title = fav ? 'Remover dos favoritos' : 'Favoritar EPI';
    favBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(item);
    });
    card.appendChild(favBtn);
    card.appendChild(img);
    card.appendChild(el('h3', '', item.nome));
    card.appendChild(el('span', 'tag', `${categoryIcon(item.categoria)} ${categoryName(item.categoria)}`));

    const actions = el('div', 'epi-actions');
    const detail = el('button', 'open-btn', 'Ver detalhes');
    detail.type = 'button';
    detail.addEventListener('click', e => {
      e.stopPropagation();
      openEpiModal(item);
    });
    const btn = el('button', 'copy-btn', '📋 Copiar CA');
    btn.type = 'button';
    btn.dataset.copy = item.ca || '';
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      try {
        await copyText(item.ca || '');
        toast('CA copiado para área de transferência 📋');
      } catch {
        toast('Não foi possível copiar o CA.', 'error');
      }
    });
    actions.appendChild(detail);
    actions.appendChild(btn);
    card.appendChild(actions);
    card.addEventListener('click', () => openEpiModal(item));
    box.appendChild(card);
  });

  if ($('#epiCount')) $('#epiCount').textContent = items.length;
  empty?.classList.toggle('show', items.length === 0);
}

function bindEpiModal() {
  if (APP.modalBound) return;
  APP.modalBound = true;
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeEpiModal));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeEpiModal();
  });
  $('#copyModalCA')?.addEventListener('click', async () => {
    if (!APP.currentEpi) return;
    try {
      await copyText(APP.currentEpi.ca || '');
      toast('CA copiado.');
    } catch {
      toast('Não foi possível copiar o CA.', 'error');
    }
  });
  $('#copyModalFull')?.addEventListener('click', async () => {
    if (!APP.currentEpi) return;
    try {
      await copyText(`${APP.currentEpi.nome} — CA ${APP.currentEpi.ca || 'N/I'}`);
      toast('Nome + CA copiado.');
    } catch {
      toast('Não foi possível copiar.', 'error');
    }
  });
  $('#toggleModalFavorite')?.addEventListener('click', () => {
    if (!APP.currentEpi) return;
    toggleFavorite(APP.currentEpi);
  });
}

function openEpiModal(item) {
  APP.currentEpi = item;
  const modal = $('#epiModal');
  if (!modal) return;
  const modalImg = $('#epiModalImg');
  if (modalImg) {
    modalImg.onerror = () => { modalImg.onerror = null; modalImg.src = FALLBACK_IMG; };
    modalImg.src = item.imagem || FALLBACK_IMG;
  }
  if ($('#epiModalTitle')) $('#epiModalTitle').textContent = item.nome || 'EPI';
  if ($('#epiModalCategory')) $('#epiModalCategory').textContent = `${categoryIcon(item.categoria)} ${categoryName(item.categoria)}`;
  if ($('#epiModalCA')) $('#epiModalCA').textContent = `CA ${item.ca || 'N/I'}`;
  updateModalFavoriteButton();
  modal.classList.add('show');
  document.body.classList.add('modal-open');
  modal.setAttribute('aria-hidden', 'false');
}

function updateModalFavoriteButton() {
  const btn = $('#toggleModalFavorite');
  if (!btn || !APP.currentEpi) return;
  const fav = isFavorite(APP.currentEpi);
  btn.textContent = fav ? '★ Remover favorito' : '☆ Favoritar';
  btn.classList.toggle('active', fav);
}

function closeEpiModal() {
  const modal = $('#epiModal');
  if (!modal) return;
  modal.classList.remove('show');
  document.body.classList.remove('modal-open');
  modal.setAttribute('aria-hidden', 'true');
  APP.currentEpi = null;
}

function textCard(meta, title, desc, copyValue) {
  const card = el('article', 'data-card');
  if (meta) card.appendChild(el('span', 'tag', meta));
  card.appendChild(el('h3', '', title || 'Sem título'));
  card.appendChild(el('p', '', desc || ''));
  const btn = el('button', 'copy-btn', '📋 Copiar');
  btn.dataset.copy = copyValue || desc || title || '';
  card.appendChild(btn);
  return card;
}

function linkCard(title, desc, link, label = 'Abrir') {
  const card = el('article', 'data-card');
  card.appendChild(el('h3', '', title || 'Sem título'));
  card.appendChild(el('p', '', desc || ''));
  const btn = el('button', 'open-btn', label);
  btn.addEventListener('click', () => link && window.open(link, '_blank', 'noopener,noreferrer'));
  card.appendChild(btn);
  return card;
}

function genericRender({ list, boxId, emptyId, filter, search, card }) {
  const box = $(boxId), empty = $(emptyId);
  if (!box) return;
  const q = norm(filter);
  const items = (list || []).filter(item => !q || norm(search(item)).includes(q));
  box.innerHTML = '';
  items.forEach(item => box.appendChild(card(item)));
  empty?.classList.toggle('show', items.length === 0);
}

function renderRiscos() {
  genericRender({
    list: DATA.riscos,
    boxId: '#riskList',
    emptyId: '#riskEmpty',
    filter: APP.filters.risco,
    search: i => `${i.tipo} ${i.titulo} ${i.texto}`,
    card: i => textCard(i.tipo, i.titulo, i.texto, i.texto),
  });
}

function renderEmpresas() {
  genericRender({
    list: DATA.empresas,
    boxId: '#empresaList',
    emptyId: '#empresaEmpty',
    filter: APP.filters.empresa,
    search: i => `${i.nome} ${i.risco} ${i.setor}`,
    card: i => textCard(`${i.emoji || '🏢'} ${i.risco || ''}`, i.nome, i.setor, i.nome),
  });
}

function renderW2H() {
  genericRender({
    list: DATA.w2h,
    boxId: '#w2hList',
    emptyId: '#w2hEmpty',
    filter: APP.filters.w2h,
    search: i => `${i.titulo} ${i.texto}`,
    card: i => textCard('5W2H', i.titulo, i.texto, i.texto),
  });
}

function renderNRs() {
  genericRender({
    list: DATA.nrs,
    boxId: '#nrList',
    emptyId: '#nrEmpty',
    filter: APP.filters.nr,
    search: i => `${i.codigo} ${i.nome}`,
    card: i => linkCard(i.codigo, i.nome, i.link, 'Abrir NR'),
  });
}

function renderPainel() {
  genericRender({
    list: DATA.painel,
    boxId: '#painelList',
    emptyId: '#painelEmpty',
    filter: APP.filters.painel,
    search: i => `${i.titulo} ${i.desc}`,
    card: i => linkCard(i.titulo, i.desc, i.link, 'Acessar'),
  });
}

function renderAlerts() {
  const box = $('#homeAlerts');
  if (!box) return;
  box.innerHTML = '';
  (DATA.alertas || []).forEach(a => box.appendChild(el('li', '', a)));
}

function bindGenerator() {
  if (APP.generatorBound) return;
  APP.generatorBound = true;
  if ($('#dataInput') && !$('#dataInput').value) $('#dataInput').value = new Date().toISOString().slice(0, 10);
  $('#gerarFrasesBtn')?.addEventListener('click', () => {
    const empresa = $('#empresaInput')?.value.trim() || 'EMPRESA';
    const data = $('#dataInput')?.value || new Date().toISOString().slice(0, 10);
    const nomes = ($('#nomesInput')?.value || '').split('\n').map(n => n.trim()).filter(Boolean);
    const out = $('#frasesResultado');
    out.value = nomes.map(n => `${n}, ${empresa}, , , ${data}`).join('\n');
    toast('Frases geradas com sucesso.');
  });
  $('#copiarFrasesBtn')?.addEventListener('click', async () => {
    try {
      await copyText($('#frasesResultado')?.value || '');
      toast('Frases copiadas.');
    } catch {
      toast('Gere as frases primeiro.', 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindLogin();
  boot();
});
