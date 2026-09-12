require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const store = require('./lib/store');

const PORT = process.env.PANEL_PORT || 3000;
const SESSION_SECRET = process.env.PANEL_SESSION_SECRET || 'troque-esse-segredo-no-.env';

const app = express();
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

// -------------------------------------------------------------- middlewares --
function exigirLogin(req, res, next) {
  if (req.session?.usuario) return next();
  return res.status(401).json({ erro: 'Não autenticado.' });
}

function exigirDono(req, res, next) {
  if (req.session?.usuario?.papel === 'dono') return next();
  return res.status(403).json({ erro: 'Só o dono do painel pode fazer isso.' });
}

// --------------------------------------------------------------------- setup --
// Primeiro acesso: se ninguém configurou usuário nenhum ainda, deixa criar o
// primeiro (que já nasce com papel "dono", com acesso total ao painel).
app.get('/api/setup/status', (req, res) => {
  res.json({ precisaSetup: !store.temAlgumUsuario() });
});

app.post('/api/setup', (req, res) => {
  if (store.temAlgumUsuario()) {
    return res.status(400).json({ erro: 'O painel já foi configurado.' });
  }
  const { usuario, senha } = req.body || {};
  if (!usuario || !senha || String(senha).length < 6) {
    return res.status(400).json({ erro: 'Informe um usuário e uma senha com pelo menos 6 caracteres.' });
  }
  const novo = store.criarUsuario({ usuario, senha, papel: 'dono' });
  req.session.usuario = { id: novo.id, usuario: novo.usuario, papel: novo.papel };
  res.json({ ok: true });
});

// --------------------------------------------------------------------- login --
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body || {};
  const u = store.conferirSenha(usuario, senha);
  if (!u) return res.status(401).json({ erro: 'Usuário ou senha inválidos.' });
  req.session.usuario = { id: u.id, usuario: u.usuario, papel: u.papel };
  res.json({ ok: true, usuario: req.session.usuario });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/eu', (req, res) => {
  if (!req.session?.usuario) return res.json({ logado: false });
  res.json({ logado: true, usuario: req.session.usuario });
});

// --------------------------------------------------------------- monitoramento --
app.get('/api/monitor', exigirLogin, (req, res) => {
  res.json({
    heartbeat: store.getHeartbeat(),
    estatisticas: store.estatisticasGerais(),
  });
});

// ------------------------------------------------------------------- config --
app.get('/api/config', exigirLogin, (req, res) => {
  const cfg = store.getConfig();
  res.json({
    donoNome: cfg.donoNome,
    donoDiscordId: cfg.donoDiscordId,
    adminDiscordIds: cfg.adminDiscordIds,
    nomeVilaPadrao: cfg.nomeVilaPadrao,
  });
});

app.post('/api/config', exigirLogin, exigirDono, (req, res) => {
  const cfg = store.atualizarConfigGeral(req.body || {});
  res.json({ ok: true, config: cfg });
});

// ------------------------------------------------------ usuários do painel --
app.get('/api/usuarios', exigirLogin, exigirDono, (req, res) => {
  const lista = store.getConfig().painelUsuarios.map(u => ({ id: u.id, usuario: u.usuario, papel: u.papel, criadoEm: u.criadoEm }));
  res.json(lista);
});

app.post('/api/usuarios', exigirLogin, exigirDono, (req, res) => {
  try {
    const { usuario, senha, papel } = req.body || {};
    if (!usuario || !senha || String(senha).length < 6) {
      return res.status(400).json({ erro: 'Usuário e senha (mín. 6 caracteres) são obrigatórios.' });
    }
    const novo = store.criarUsuario({ usuario, senha, papel });
    res.json({ ok: true, usuario: { id: novo.id, usuario: novo.usuario, papel: novo.papel } });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/usuarios/:id', exigirLogin, exigirDono, (req, res) => {
  if (req.params.id === req.session.usuario.id) {
    return res.status(400).json({ erro: 'Você não pode remover a própria conta.' });
  }
  store.removerUsuario(req.params.id);
  res.json({ ok: true });
});

app.post('/api/usuarios/:id/senha', exigirLogin, exigirDono, (req, res) => {
  try {
    const { senha } = req.body || {};
    if (!senha || String(senha).length < 6) return res.status(400).json({ erro: 'Senha muito curta.' });
    store.redefinirSenha(req.params.id, senha);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

// -------------------------------------------------------------------- npcs --
app.get('/api/npcs', exigirLogin, (req, res) => {
  res.json(store.getNPCs());
});

app.post('/api/npcs', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, npc: store.criarNPC(req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/npcs/:id', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, npc: store.atualizarNPC(req.params.id, req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/npcs/:id', exigirLogin, exigirDono, (req, res) => {
  store.removerNPC(req.params.id);
  res.json({ ok: true });
});

// -------------------------------------------------------------- edifícios --
app.get('/api/edificios', exigirLogin, (req, res) => {
  res.json(store.getEdificios());
});

app.post('/api/edificios', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, edificio: store.criarEdificio(req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/edificios/:id', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, edificio: store.atualizarEdificio(req.params.id, req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/edificios/:id', exigirLogin, exigirDono, (req, res) => {
  try {
    store.removerEdificio(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.get('/api/raridades', exigirLogin, (req, res) => {
  res.json(store.RARIDADES);
});

// ------------------------------------------------------------------- cartas --
app.get('/api/cartas', exigirLogin, (req, res) => {
  res.json(store.getCards());
});

app.post('/api/cartas', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, carta: store.criarCarta(req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/cartas/:id', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, carta: store.atualizarCarta(req.params.id, req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/cartas/:id', exigirLogin, exigirDono, (req, res) => {
  store.removerCarta(req.params.id);
  res.json({ ok: true });
});

// --------------------------------------------------------------- armaduras --
app.get('/api/armaduras', exigirLogin, (req, res) => {
  res.json(store.getArmaduras());
});

app.post('/api/armaduras', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, armadura: store.criarArmadura(req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/armaduras/:id', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, armadura: store.atualizarArmadura(req.params.id, req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/armaduras/:id', exigirLogin, exigirDono, (req, res) => {
  store.removerArmadura(req.params.id);
  res.json({ ok: true });
});

// -------------------------------------------------------------------- perks --
app.get('/api/perks', exigirLogin, (req, res) => {
  res.json(store.getPerksCatalogo());
});

app.post('/api/perks', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, perk: store.criarPerk(req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/perks/:id', exigirLogin, (req, res) => {
  try {
    res.json({ ok: true, perk: store.atualizarPerk(req.params.id, req.body || {}) });
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/perks/:id', exigirLogin, exigirDono, (req, res) => {
  store.removerPerk(req.params.id);
  res.json({ ok: true });
});

// ------------------------------------------------------------------ static --
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`🛠️  Painel do CardBot rodando em http://localhost:${PORT}`);
});
