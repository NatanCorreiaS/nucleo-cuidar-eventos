import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { gravarConfiguracao, lerConfiguracao } from './banco.js';

export const TAMANHO_MINIMO_SENHA = 8;

export function senhaDefinida() {
  return lerConfiguracao('senha_hash') !== null;
}

export function definirSenha(senha) {
  const sal = randomBytes(16).toString('hex');
  gravarConfiguracao('senha_sal', sal);
  gravarConfiguracao('senha_hash', scryptSync(senha, sal, 64).toString('hex'));
}

export function senhaConfere(senha) {
  const sal = lerConfiguracao('senha_sal');
  const hash = lerConfiguracao('senha_hash');
  if (!sal || !hash || typeof senha !== 'string') return false;
  return timingSafeEqual(scryptSync(senha, sal, 64), Buffer.from(hash, 'hex'));
}

// Falhas de login por endereço. Ficam na memória: reiniciar o sistema zera a contagem.
const MAXIMO_FALHAS = 10;
const JANELA_FALHAS_MS = 15 * 60 * 1000;
const falhas = new Map();

export function tentativasEsgotadas(endereco) {
  const registro = falhas.get(endereco);
  if (!registro) return false;
  if (Date.now() - registro.inicio > JANELA_FALHAS_MS) {
    falhas.delete(endereco);
    return false;
  }
  return registro.quantidade >= MAXIMO_FALHAS;
}

export function registrarFalha(endereco) {
  const registro = falhas.get(endereco);
  if (registro && Date.now() - registro.inicio <= JANELA_FALHAS_MS) registro.quantidade += 1;
  else falhas.set(endereco, { inicio: Date.now(), quantidade: 1 });
}

export function limparFalhas(endereco) {
  falhas.delete(endereco);
}

export function segredoDaSessao() {
  let segredo = lerConfiguracao('segredo_sessao');
  if (!segredo) {
    segredo = randomBytes(32).toString('hex');
    gravarConfiguracao('segredo_sessao', segredo);
  }
  return segredo;
}

export function exigirLogin(req, res, next) {
  if (req.session?.logado) return next();
  res.redirect('/entrar');
}
