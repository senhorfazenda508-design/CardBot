// Quem pode usar o painel de admin (/admin e ;admin):
// - Qualquer pessoa com permissão "Gerenciar Servidor" no servidor onde o
//   comando foi usado (mesma permissão que já protegia /personalidade).
// - Donos/admins do bot: IDs do Discord vindos de duas fontes que se somam:
//   1) OWNER_IDS no .env (separados por vírgula) — continua funcionando como
//      antes, útil pro dono "raiz" que sempre tem acesso mesmo sem o painel.
//   2) data/config.json (donoDiscordId + adminDiscordIds), que é justamente o
//      que o painel web deixa configurar sem precisar mexer no .env nem
//      reiniciar o bot — o arquivo é lido do disco a cada checagem (é
//      pequeno, custo irrelevante), então uma mudança feita no site já vale
//      no comando seguinte.

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');

const OWNER_IDS_ENV = (process.env.OWNER_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function lerConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8') || '{}');
  } catch {
    return {};
  }
}

// IDs com acesso total de dono/admin do bot em qualquer servidor (e em DM),
// juntando .env + o que foi configurado no painel web.
function idsComAcessoTotal() {
  const cfg = lerConfig();
  const doPainel = [
    cfg.donoDiscordId,
    ...(Array.isArray(cfg.adminDiscordIds) ? cfg.adminDiscordIds : []),
  ].filter(Boolean);
  return Array.from(new Set([...OWNER_IDS_ENV, ...doPainel]));
}

function ehDono(userId) {
  if (!userId) return false;
  return idsComAcessoTotal().includes(String(userId));
}

function ehAdmin(ctx) {
  return Boolean(ctx?.podeGerenciarServidor) || ehDono(ctx?.userId);
}

module.exports = {
  ehAdmin,
  ehDono,
  get OWNER_IDS() { return idsComAcessoTotal(); },
};
