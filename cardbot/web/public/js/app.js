const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let euAtual = null;

async function api(metodo, url, corpo) {
  const resp = await fetch(url, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(dados.erro || 'Erro inesperado.');
  return dados;
}

function mostrarTela(id) {
  ['tela-carregando', 'tela-setup', 'tela-login', 'app'].forEach(t => {
    $('#' + t).classList.toggle('oculto', t !== id);
  });
}

// ------------------------------------------------------------------ boot --
async function iniciar() {
  try {
    const statusSetup = await api('GET', '/api/setup/status');
    if (statusSetup.precisaSetup) {
      mostrarTela('tela-setup');
      return;
    }
    const eu = await api('GET', '/api/eu');
    if (eu.logado) {
      euAtual = eu.usuario;
      montarApp();
    } else {
      mostrarTela('tela-login');
    }
  } catch (e) {
    mostrarTela('tela-login');
  }
}

$('#form-setup').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#setup-erro');
  erro.classList.add('oculto');
  try {
    await api('POST', '/api/setup', {
      usuario: $('#setup-usuario').value.trim(),
      senha: $('#setup-senha').value,
    });
    location.reload();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#login-erro');
  erro.classList.add('oculto');
  try {
    const r = await api('POST', '/api/login', {
      usuario: $('#login-usuario').value.trim(),
      senha: $('#login-senha').value,
    });
    euAtual = r.usuario;
    montarApp();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#btn-sair').addEventListener('click', async () => {
  await api('POST', '/api/logout');
  location.reload();
});

// ------------------------------------------------------------------- app --
function montarApp() {
  mostrarTela('app');
  $('#rodape-usuario').textContent = euAtual.usuario;
  $('#rodape-papel').textContent = euAtual.papel === 'dono' ? 'Dono' : 'Admin';
  $('#selo-inicial').textContent = euAtual.usuario.slice(0, 1).toUpperCase();
  if (euAtual.papel !== 'dono') {
    $('.item-nav[data-aba="config"]').classList.add('oculto');
    $('.item-nav[data-aba="contas"]').classList.add('oculto');
  }
  carregarRaridades();
  carregarVisaoGeral();
  carregarNPCs();
  carregarEdificios();
}

let raridadesCache = [];
async function carregarRaridades() {
  raridadesCache = await api('GET', '/api/raridades');
  const montarOpcoes = sel => raridadesCache.map(r => `<option value="${r}">${r}</option>`).join('');
  $('#carta-raridade').innerHTML = montarOpcoes();
  $('#armadura-raridade').innerHTML = montarOpcoes();
  $('#perk-raridade').innerHTML = montarOpcoes();
  $('#npc-raridade').innerHTML = montarOpcoes();
  $('#filtro-cartas').innerHTML = ['Todas', ...raridadesCache].map(r => `<button class="pill-raridade ${r === 'Todas' ? 'ativo' : ''}" data-raridade="${r}">${r}</button>`).join('');
  $$('#filtro-cartas .pill-raridade').forEach(b => {
    b.addEventListener('click', () => {
      $$('#filtro-cartas .pill-raridade').forEach(x => x.classList.remove('ativo'));
      b.classList.add('ativo');
      renderizarCartas(b.dataset.raridade);
    });
  });
}

$$('.item-nav').forEach(botao => {
  botao.addEventListener('click', () => {
    $$('.item-nav').forEach(b => b.classList.remove('ativo'));
    botao.classList.add('ativo');
    const aba = botao.dataset.aba;
    $$('.aba').forEach(s => s.classList.add('oculto'));
    $('#aba-' + aba).classList.remove('oculto');
    if (aba === 'visao-geral') carregarVisaoGeral();
    if (aba === 'cartas') carregarCartas();
    if (aba === 'armaduras') carregarArmaduras();
    if (aba === 'perks') carregarPerks();
    if (aba === 'jogadores') carregarJogadores();
    if (aba === 'config') carregarConfig();
    if (aba === 'contas') carregarContas();
  });
});

// ------------------------------------------------------------- visão geral --
async function carregarVisaoGeral() {
  const { heartbeat, estatisticas } = await api('GET', '/api/monitor');
  const cartoes = $('#cartoes-status');
  const statusTexto = heartbeat.online ? 'Online' : 'Offline';
  const statusClasse = heartbeat.online ? 'status-online' : 'status-offline';
  cartoes.innerHTML = `
    <div class="cartao-status"><div class="rotulo">Status do bot</div><div class="valor ${statusClasse}">${statusTexto}</div></div>
    <div class="cartao-status"><div class="rotulo">Servidores</div><div class="valor">${heartbeat.servidores ?? '—'}</div></div>
    <div class="cartao-status"><div class="rotulo">Ping</div><div class="valor">${heartbeat.ping ? heartbeat.ping + 'ms' : '—'}</div></div>
    <div class="cartao-status"><div class="rotulo">Jogadores</div><div class="valor">${estatisticas.totalJogadores}</div></div>
    <div class="cartao-status"><div class="rotulo">Moedas em circulação</div><div class="valor">${estatisticas.moedasTotais.toLocaleString('pt-BR')}</div></div>
    <div class="cartao-status"><div class="rotulo">Cidades fundadas</div><div class="valor">${estatisticas.cidadesFundadas}</div></div>
  `;
  const corpo = $('#tabela-top tbody');
  corpo.innerHTML = estatisticas.jogadores.slice(0, 10).map(j => `
    <tr><td>${escapar(j.username)}</td><td>${j.moedas.toLocaleString('pt-BR')}</td><td>${j.vitorias}</td><td>${j.cidadeFundada ? (escapar(j.nomeCidade) || 'Sim') : '—'}</td></tr>
  `).join('') || '<tr><td colspan="4">Ainda não há jogadores.</td></tr>';
}

async function carregarJogadores() {
  const { estatisticas } = await api('GET', '/api/monitor');
  const corpo = $('#tabela-jogadores tbody');
  corpo.innerHTML = estatisticas.jogadores.map(j => `
    <tr>
      <td>${escapar(j.username)}</td>
      <td>${j.moedas.toLocaleString('pt-BR')}</td>
      <td>${j.vitorias}</td>
      <td>${j.derrotas}</td>
      <td>${j.maiorAndar}</td>
      <td>${j.cidadeFundada ? (escapar(j.nomeCidade) || 'Sim') : '—'}</td>
      <td>${j.npcsConvidados}</td>
    </tr>
  `).join('') || '<tr><td colspan="7">Ainda não há jogadores.</td></tr>';
}

function escapar(txt) {
  if (!txt) return '';
  return String(txt).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ------------------------------------------------------------------- npcs --
let npcsCache = [];

async function carregarNPCs() {
  npcsCache = await api('GET', '/api/npcs');
  const lista = $('#lista-npcs');
  lista.innerHTML = npcsCache.map(npc => `
    <div class="cartao-npc" data-id="${npc.id}">
      ${npc.custoConvite ? '<span class="selo-convidavel">convidável</span>' : ''}
      <div class="emoji-npc">${npc.emoji || '🧑'}</div>
      <div class="nome-npc">${escapar(npc.nome)}</div>
      <div class="profissao-npc">${escapar(npc.profissao || 'Sem profissão definida')}${npc.raridade ? ` · ${escapar(npc.raridade)}` : ''}</div>
      <div class="persona-npc">${escapar(npc.persona)}</div>
    </div>
  `).join('');
  $$('#lista-npcs .cartao-npc').forEach(c => {
    c.addEventListener('click', () => abrirModalNPC(c.dataset.id));
  });
}

function abrirModalNPC(id) {
  const npc = id ? npcsCache.find(n => n.id === id) : null;
  $('#modal-npc-titulo').textContent = npc ? `Editar ${npc.nome}` : 'Novo morador';
  $('#npc-id-original').value = npc ? npc.id : '';
  $('#npc-nome').value = npc?.nome || '';
  $('#npc-emoji').value = npc?.emoji || '🧑';
  $('#npc-profissao').value = npc?.profissao || '';
  $('#npc-raridade').value = npc?.raridade || 'Comum';
  $('#npc-persona').value = npc?.persona || '';
  $('#npc-bordoes').value = (npc?.bordoes || []).join('\n');
  $('#npc-custo').value = npc?.custoConvite ?? '';
  $('#npc-frase-convite').value = npc?.fraseConvite || '';
  $('#npc-erro').classList.add('oculto');
  $('#btn-remover-npc').classList.toggle('oculto', !npc);
  $('#modal-npc').classList.remove('oculto');
}

$('#btn-novo-npc').addEventListener('click', () => abrirModalNPC(null));
$('#btn-cancelar-npc').addEventListener('click', () => $('#modal-npc').classList.add('oculto'));

$('#form-npc').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#npc-erro');
  erro.classList.add('oculto');
  const idOriginal = $('#npc-id-original').value;
  const dados = {
    nome: $('#npc-nome').value.trim(),
    emoji: $('#npc-emoji').value.trim(),
    profissao: $('#npc-profissao').value.trim(),
    raridade: $('#npc-raridade').value,
    persona: $('#npc-persona').value.trim(),
    bordoes: $('#npc-bordoes').value.split('\n').map(s => s.trim()).filter(Boolean),
    custoConvite: $('#npc-custo').value === '' ? '' : Number($('#npc-custo').value),
    fraseConvite: $('#npc-frase-convite').value.trim(),
  };
  try {
    if (idOriginal) {
      await api('PUT', `/api/npcs/${idOriginal}`, dados);
    } else {
      await api('POST', '/api/npcs', dados);
    }
    $('#modal-npc').classList.add('oculto');
    carregarNPCs();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#btn-remover-npc').addEventListener('click', async () => {
  const id = $('#npc-id-original').value;
  if (!id || !confirm('Remover esse morador? Essa ação não pode ser desfeita.')) return;
  try {
    await api('DELETE', `/api/npcs/${id}`);
    $('#modal-npc').classList.add('oculto');
    carregarNPCs();
  } catch (err) {
    $('#npc-erro').textContent = err.message;
    $('#npc-erro').classList.remove('oculto');
  }
});

// ---------------------------------------------------------------- edifícios --
let edificiosCache = {};

async function carregarEdificios() {
  edificiosCache = await api('GET', '/api/edificios');
  const lista = $('#lista-edificios');
  lista.innerHTML = Object.values(edificiosCache).map(ed => `
    <div class="cartao-npc" data-id="${ed.id}" style="border-left: 4px solid ${ed.cor || '#999'}">
      <div class="emoji-npc">${ed.emoji}</div>
      <div class="nome-npc">${escapar(ed.nome)}</div>
      <div class="profissao-npc">${ed.pontos} pts de cidade</div>
      <div class="persona-npc">Custo: ${formatarPares(ed.custo)}<br>Produção/h: ${formatarPares(ed.producaoHora) || '—'}</div>
    </div>
  `).join('');
  $$('#lista-edificios .cartao-npc').forEach(c => {
    c.addEventListener('click', () => abrirModalEdificio(c.dataset.id));
  });
}

function formatarPares(obj) {
  if (!obj || !Object.keys(obj).length) return '';
  return Object.entries(obj).map(([k, v]) => `${v} ${k}`).join(', ');
}

function abrirModalEdificio(id) {
  const ed = id ? edificiosCache[id] : null;
  $('#modal-edificio-titulo').textContent = ed ? `Editar ${ed.nome}` : 'Novo edifício';
  $('#ed-id-original').value = ed ? ed.id : '';
  $('#ed-nome').value = ed?.nome || '';
  $('#ed-emoji').value = ed?.emoji || '🏗️';
  $('#ed-cor').value = ed?.cor || '#c9932c';
  $('#ed-pontos').value = ed?.pontos ?? 1;
  $('#ed-custo-madeira').value = ed?.custo?.madeira ?? 0;
  $('#ed-custo-pedra').value = ed?.custo?.pedra ?? 0;
  $('#ed-custo-comida').value = ed?.custo?.comida ?? 0;
  $('#ed-custo-moedas').value = ed?.custo?.moedas ?? 0;
  $('#ed-prod-madeira').value = ed?.producaoHora?.madeira ?? 0;
  $('#ed-prod-pedra').value = ed?.producaoHora?.pedra ?? 0;
  $('#ed-prod-comida').value = ed?.producaoHora?.comida ?? 0;
  $('#ed-prod-ouro').value = ed?.producaoHora?.ouro ?? 0;
  $('#ed-erro').classList.add('oculto');
  $('#btn-remover-edificio').classList.toggle('oculto', !ed || id === 'castelo');
  $('#modal-edificio').classList.remove('oculto');
}

$('#btn-novo-edificio').addEventListener('click', () => abrirModalEdificio(null));
$('#btn-cancelar-edificio').addEventListener('click', () => $('#modal-edificio').classList.add('oculto'));

function montarCustoProducao() {
  const custo = {};
  const madC = Number($('#ed-custo-madeira').value) || 0;
  const pedC = Number($('#ed-custo-pedra').value) || 0;
  const comC = Number($('#ed-custo-comida').value) || 0;
  const moeC = Number($('#ed-custo-moedas').value) || 0;
  if (madC) custo.madeira = madC;
  if (pedC) custo.pedra = pedC;
  if (comC) custo.comida = comC;
  if (moeC) custo.moedas = moeC;

  const producao = {};
  const madP = Number($('#ed-prod-madeira').value) || 0;
  const pedP = Number($('#ed-prod-pedra').value) || 0;
  const comP = Number($('#ed-prod-comida').value) || 0;
  const ouroP = Number($('#ed-prod-ouro').value) || 0;
  if (madP) producao.madeira = madP;
  if (pedP) producao.pedra = pedP;
  if (comP) producao.comida = comP;
  if (ouroP) producao.ouro = ouroP;

  return { custo, producao };
}

$('#form-edificio').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#ed-erro');
  erro.classList.add('oculto');
  const idOriginal = $('#ed-id-original').value;
  const { custo, producao } = montarCustoProducao();
  const dados = {
    nome: $('#ed-nome').value.trim(),
    emoji: $('#ed-emoji').value.trim(),
    cor: $('#ed-cor').value.trim(),
    pontos: Number($('#ed-pontos').value) || 0,
    custo,
    producaoHora: producao,
  };
  try {
    if (idOriginal) {
      await api('PUT', `/api/edificios/${idOriginal}`, dados);
    } else {
      await api('POST', '/api/edificios', dados);
    }
    $('#modal-edificio').classList.add('oculto');
    carregarEdificios();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#btn-remover-edificio').addEventListener('click', async () => {
  const id = $('#ed-id-original').value;
  if (!id || !confirm('Remover esse edifício do catálogo da vila?')) return;
  try {
    await api('DELETE', `/api/edificios/${id}`);
    $('#modal-edificio').classList.add('oculto');
    carregarEdificios();
  } catch (err) {
    $('#ed-erro').textContent = err.message;
    $('#ed-erro').classList.remove('oculto');
  }
});

// ------------------------------------------------------------------- cartas --
let cartasCache = {};

async function carregarCartas() {
  cartasCache = await api('GET', '/api/cartas');
  const ativo = $('#filtro-cartas .pill-raridade.ativo');
  renderizarCartas(ativo ? ativo.dataset.raridade : 'Todas');
}

function renderizarCartas(filtroRaridade) {
  const lista = $('#lista-cartas');
  const itens = Object.values(cartasCache).filter(c => !filtroRaridade || filtroRaridade === 'Todas' || c.raridade === filtroRaridade);
  lista.innerHTML = itens.map(c => `
    <div class="cartao-npc" data-id="${c.id}">
      <div class="emoji-npc">${c.emoji || '🗡️'}</div>
      <div class="nome-npc">${escapar(c.nome)}</div>
      <div class="profissao-npc">${escapar(c.raridade)} · ⚔️ ${c.ataque}${c.efeito && c.efeito !== 'nenhum' ? ` · ${c.efeito}` : ''}</div>
      <div class="persona-npc">Tipo: ${escapar(c.tipo || '—')}${c.valor !== undefined ? ` · valor: ${c.valor}` : ''}</div>
    </div>
  `).join('') || '<p>Nenhuma carta com essa raridade.</p>';
  $$('#lista-cartas .cartao-npc').forEach(el => {
    el.addEventListener('click', () => abrirModalCarta(el.dataset.id));
  });
}

function abrirModalCarta(id) {
  const c = id ? cartasCache[id] : null;
  $('#modal-carta-titulo').textContent = c ? `Editar ${c.nome}` : 'Nova carta';
  $('#carta-id-original').value = c ? c.id : '';
  $('#carta-nome').value = c?.nome || '';
  $('#carta-emoji').value = c?.emoji || '🗡️';
  $('#carta-raridade').value = c?.raridade || 'Comum';
  $('#carta-ataque').value = c?.ataque ?? 1;
  $('#carta-efeito').value = c?.efeito || 'nenhum';
  $('#carta-valor').value = c?.valor ?? '';
  $('#carta-tipo').value = c?.tipo || '';
  $('#carta-erro').classList.add('oculto');
  $('#btn-remover-carta').classList.toggle('oculto', !c);
  $('#modal-carta').classList.remove('oculto');
}

$('#btn-nova-carta').addEventListener('click', () => abrirModalCarta(null));
$('#btn-cancelar-carta').addEventListener('click', () => $('#modal-carta').classList.add('oculto'));

$('#form-carta').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#carta-erro');
  erro.classList.add('oculto');
  const idOriginal = $('#carta-id-original').value;
  const dados = {
    nome: $('#carta-nome').value.trim(),
    emoji: $('#carta-emoji').value.trim(),
    raridade: $('#carta-raridade').value,
    ataque: $('#carta-ataque').value,
    efeito: $('#carta-efeito').value,
    valor: $('#carta-valor').value,
    tipo: $('#carta-tipo').value.trim(),
  };
  try {
    if (idOriginal) {
      await api('PUT', `/api/cartas/${idOriginal}`, dados);
    } else {
      await api('POST', '/api/cartas', dados);
    }
    $('#modal-carta').classList.add('oculto');
    carregarCartas();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#btn-remover-carta').addEventListener('click', async () => {
  const id = $('#carta-id-original').value;
  if (!id || !confirm('Remover essa carta do catálogo?')) return;
  try {
    await api('DELETE', `/api/cartas/${id}`);
    $('#modal-carta').classList.add('oculto');
    carregarCartas();
  } catch (err) {
    $('#carta-erro').textContent = err.message;
    $('#carta-erro').classList.remove('oculto');
  }
});

// --------------------------------------------------------------- armaduras --
let armadurasCache = {};

async function carregarArmaduras() {
  armadurasCache = await api('GET', '/api/armaduras');
  const lista = $('#lista-armaduras');
  lista.innerHTML = Object.values(armadurasCache).map(a => `
    <div class="cartao-npc" data-id="${a.id}">
      <div class="emoji-npc">${a.emoji || '🛡️'}</div>
      <div class="nome-npc">${escapar(a.nome)}</div>
      <div class="profissao-npc">${escapar(a.raridade)}</div>
      <div class="persona-npc">Defesa: ${Math.round((a.defesa || 0) * 100)}% · +${a.vida || 0} vida · 🪙 ${a.preco || 0}</div>
    </div>
  `).join('');
  $$('#lista-armaduras .cartao-npc').forEach(el => {
    el.addEventListener('click', () => abrirModalArmadura(el.dataset.id));
  });
}

function abrirModalArmadura(id) {
  const a = id ? armadurasCache[id] : null;
  $('#modal-armadura-titulo').textContent = a ? `Editar ${a.nome}` : 'Nova armadura';
  $('#armadura-id-original').value = a ? a.id : '';
  $('#armadura-nome').value = a?.nome || '';
  $('#armadura-emoji').value = a?.emoji || '🛡️';
  $('#armadura-raridade').value = a?.raridade || 'Comum';
  $('#armadura-defesa').value = a?.defesa ?? 0;
  $('#armadura-vida').value = a?.vida ?? 0;
  $('#armadura-preco').value = a?.preco ?? 0;
  $('#armadura-erro').classList.add('oculto');
  $('#btn-remover-armadura').classList.toggle('oculto', !a);
  $('#modal-armadura').classList.remove('oculto');
}

$('#btn-nova-armadura').addEventListener('click', () => abrirModalArmadura(null));
$('#btn-cancelar-armadura').addEventListener('click', () => $('#modal-armadura').classList.add('oculto'));

$('#form-armadura').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#armadura-erro');
  erro.classList.add('oculto');
  const idOriginal = $('#armadura-id-original').value;
  const dados = {
    nome: $('#armadura-nome').value.trim(),
    emoji: $('#armadura-emoji').value.trim(),
    raridade: $('#armadura-raridade').value,
    defesa: $('#armadura-defesa').value,
    vida: $('#armadura-vida').value,
    preco: $('#armadura-preco').value,
  };
  try {
    if (idOriginal) {
      await api('PUT', `/api/armaduras/${idOriginal}`, dados);
    } else {
      await api('POST', '/api/armaduras', dados);
    }
    $('#modal-armadura').classList.add('oculto');
    carregarArmaduras();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#btn-remover-armadura').addEventListener('click', async () => {
  const id = $('#armadura-id-original').value;
  if (!id || !confirm('Remover essa armadura do catálogo?')) return;
  try {
    await api('DELETE', `/api/armaduras/${id}`);
    $('#modal-armadura').classList.add('oculto');
    carregarArmaduras();
  } catch (err) {
    $('#armadura-erro').textContent = err.message;
    $('#armadura-erro').classList.remove('oculto');
  }
});

// -------------------------------------------------------------------- perks --
let perksCache = {};

async function carregarPerks() {
  perksCache = await api('GET', '/api/perks');
  const lista = $('#lista-perks');
  lista.innerHTML = Object.values(perksCache).map(p => `
    <div class="cartao-npc" data-id="${p.id}">
      <div class="emoji-npc">${p.emoji || '✨'}</div>
      <div class="nome-npc">${escapar(p.nome)}</div>
      <div class="profissao-npc">${p.tipo === 'ativa' ? 'Ativa' : 'Passiva'} · ${escapar(p.raridade)} · 🪙 ${p.preco || 0}</div>
      <div class="persona-npc">${escapar(p.descricao || '')}</div>
    </div>
  `).join('');
  $$('#lista-perks .cartao-npc').forEach(el => {
    el.addEventListener('click', () => abrirModalPerk(el.dataset.id));
  });
}

const CAMPOS_EXTRA_PERK = ['vidaBonus', 'danoMult', 'defesaBonus', 'regenPorTurno', 'vampiroPercent', 'critBonus', 'critBase', 'ultimoFolego', 'efeito', 'valor'];

function abrirModalPerk(id) {
  const p = id ? perksCache[id] : null;
  $('#modal-perk-titulo').textContent = p ? `Editar ${p.nome}` : 'Novo perk';
  $('#perk-id-original').value = p ? p.id : '';
  $('#perk-nome').value = p?.nome || '';
  $('#perk-emoji').value = p?.emoji || '✨';
  $('#perk-tipo').value = p?.tipo || 'passiva';
  $('#perk-raridade').value = p?.raridade || 'Comum';
  $('#perk-preco').value = p?.preco ?? 0;
  $('#perk-descricao').value = p?.descricao || '';
  const extra = {};
  if (p) {
    for (const campo of CAMPOS_EXTRA_PERK) {
      if (p[campo] !== undefined) extra[campo] = p[campo];
    }
  }
  $('#perk-extra').value = Object.keys(extra).length ? JSON.stringify(extra, null, 2) : '';
  $('#perk-erro').classList.add('oculto');
  $('#btn-remover-perk').classList.toggle('oculto', !p);
  $('#modal-perk').classList.remove('oculto');
}

$('#btn-novo-perk').addEventListener('click', () => abrirModalPerk(null));
$('#btn-cancelar-perk').addEventListener('click', () => $('#modal-perk').classList.add('oculto'));

$('#form-perk').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#perk-erro');
  erro.classList.add('oculto');
  const idOriginal = $('#perk-id-original').value;
  let extra = {};
  const textoExtra = $('#perk-extra').value.trim();
  if (textoExtra) {
    try {
      extra = JSON.parse(textoExtra);
    } catch {
      erro.textContent = 'O campo de bônus (JSON) tem um erro de sintaxe. Confira as chaves { } e vírgulas.';
      erro.classList.remove('oculto');
      return;
    }
  }
  const dados = {
    nome: $('#perk-nome').value.trim(),
    emoji: $('#perk-emoji').value.trim(),
    tipo: $('#perk-tipo').value,
    raridade: $('#perk-raridade').value,
    preco: $('#perk-preco').value,
    descricao: $('#perk-descricao').value.trim(),
    extra,
  };
  try {
    if (idOriginal) {
      await api('PUT', `/api/perks/${idOriginal}`, dados);
    } else {
      await api('POST', '/api/perks', dados);
    }
    $('#modal-perk').classList.add('oculto');
    carregarPerks();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

$('#btn-remover-perk').addEventListener('click', async () => {
  const id = $('#perk-id-original').value;
  if (!id || !confirm('Remover esse perk do catálogo?')) return;
  try {
    await api('DELETE', `/api/perks/${id}`);
    $('#modal-perk').classList.add('oculto');
    carregarPerks();
  } catch (err) {
    $('#perk-erro').textContent = err.message;
    $('#perk-erro').classList.remove('oculto');
  }
});

// ------------------------------------------------------------------ config --
async function carregarConfig() {
  const cfg = await api('GET', '/api/config');
  $('#cfg-dono-nome').value = cfg.donoNome || '';
  $('#cfg-dono-id').value = cfg.donoDiscordId || '';
  $('#cfg-admin-ids').value = (cfg.adminDiscordIds || []).join(', ');
  $('#cfg-nome-vila').value = cfg.nomeVilaPadrao || '';
}

$('#form-config').addEventListener('submit', async e => {
  e.preventDefault();
  const sucesso = $('#cfg-sucesso');
  sucesso.classList.add('oculto');
  await api('POST', '/api/config', {
    donoNome: $('#cfg-dono-nome').value,
    donoDiscordId: $('#cfg-dono-id').value,
    adminDiscordIds: $('#cfg-admin-ids').value,
    nomeVilaPadrao: $('#cfg-nome-vila').value,
  });
  sucesso.classList.remove('oculto');
  setTimeout(() => sucesso.classList.add('oculto'), 2500);
});

// -------------------------------------------------------------- contas --
async function carregarContas() {
  const contas = await api('GET', '/api/usuarios');
  const corpo = $('#tabela-contas tbody');
  corpo.innerHTML = contas.map(c => `
    <tr>
      <td>${escapar(c.usuario)}</td>
      <td>${c.papel === 'dono' ? 'Dono' : 'Admin'}</td>
      <td>${new Date(c.criadoEm).toLocaleDateString('pt-BR')}</td>
      <td>${c.id === euAtual.id ? '' : `<button class="botao-fantasma" data-remover="${c.id}">Remover</button>`}</td>
    </tr>
  `).join('');
  $$('#tabela-contas button[data-remover]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('Remover essa conta do painel?')) return;
      await api('DELETE', `/api/usuarios/${b.dataset.remover}`);
      carregarContas();
    });
  });
}

$('#form-nova-conta').addEventListener('submit', async e => {
  e.preventDefault();
  const erro = $('#conta-erro');
  erro.classList.add('oculto');
  try {
    await api('POST', '/api/usuarios', {
      usuario: $('#conta-usuario').value.trim(),
      senha: $('#conta-senha').value,
      papel: $('#conta-papel').value,
    });
    $('#form-nova-conta').reset();
    carregarContas();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('oculto');
  }
});

iniciar();
