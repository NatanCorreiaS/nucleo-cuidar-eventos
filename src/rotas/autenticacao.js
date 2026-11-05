import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Router } from 'express';
import { db } from '../banco.js';
import {
  definirSenha,
  exigirLogin,
  limparFalhas,
  registrarFalha,
  senhaConfere,
  senhaDefinida,
  TAMANHO_MINIMO_SENHA,
  tentativasEsgotadas,
} from '../auth.js';
import { hoje } from '../formato.js';

const rotas = Router();

function erroNaNovaSenha(senha, confirmacao) {
  if (typeof senha !== 'string' || senha.length < TAMANHO_MINIMO_SENHA) {
    return `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
  if (senha !== confirmacao) return 'As duas senhas não são iguais.';
  return null;
}

rotas.get('/primeiro-acesso', (req, res) => {
  if (senhaDefinida()) return res.redirect('/entrar');
  res.render('primeiro-acesso', { titulo: 'Primeiro acesso', erro: null, tamanho: TAMANHO_MINIMO_SENHA });
});

rotas.post('/primeiro-acesso', (req, res) => {
  if (senhaDefinida()) return res.redirect('/entrar');
  const erro = erroNaNovaSenha(req.body.senha, req.body.confirmacao);
  if (erro) {
    return res.status(400).render('primeiro-acesso', { titulo: 'Primeiro acesso', erro, tamanho: TAMANHO_MINIMO_SENHA });
  }
  definirSenha(req.body.senha);
  req.session.logado = true;
  res.redirect('/');
});

rotas.get('/entrar', (req, res) => {
  if (!senhaDefinida()) return res.redirect('/primeiro-acesso');
  if (req.session.logado) return res.redirect('/');
  res.render('entrar', { titulo: 'Entrar', erro: null });
});

rotas.post('/entrar', (req, res) => {
  if (tentativasEsgotadas(req.ip)) {
    return res.status(429).render('entrar', { titulo: 'Entrar', erro: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' });
  }
  if (!senhaConfere(req.body.senha)) {
    registrarFalha(req.ip);
    return res.status(401).render('entrar', { titulo: 'Entrar', erro: 'Senha incorreta.' });
  }
  limparFalhas(req.ip);
  req.session.logado = true;
  res.redirect('/');
});

rotas.post('/sair', (req, res) => {
  req.session = null;
  res.redirect('/entrar');
});

rotas.get('/conta', exigirLogin, (req, res) => {
  res.render('conta', { titulo: 'Conta e backup', erro: null, tamanho: TAMANHO_MINIMO_SENHA });
});

rotas.post('/conta/senha', exigirLogin, (req, res) => {
  const erro = senhaConfere(req.body.atual)
    ? erroNaNovaSenha(req.body.senha, req.body.confirmacao)
    : 'A senha atual está incorreta.';
  if (erro) {
    return res.status(400).render('conta', { titulo: 'Conta e backup', erro, tamanho: TAMANHO_MINIMO_SENHA });
  }
  definirSenha(req.body.senha);
  req.session.aviso = { tipo: 'ok', texto: 'Senha alterada.' };
  res.redirect('/conta');
});

rotas.get('/conta/backup', exigirLogin, async (req, res) => {
  const copia = join(tmpdir(), `nucleo-cuidar-${randomUUID()}.db`);
  await db.backup(copia);
  res.download(copia, `nucleo-cuidar-backup-${hoje()}.db`, async () => {
    await rm(copia, { force: true });
  });
});

export default rotas;
