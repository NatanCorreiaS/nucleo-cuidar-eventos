import { fileURLToPath } from 'node:url';
import cookieSession from 'cookie-session';
import express from 'express';
import { lerConfiguracao } from './banco.js';
import { exigirLogin, segredoDaSessao } from './auth.js';
import * as formato from './formato.js';
import * as opcoes from './opcoes.js';
import rotasAutenticacao from './rotas/autenticacao.js';
import rotasDoacoes from './rotas/doacoes.js';
import rotasEventos from './rotas/eventos.js';
import rotasExportar from './rotas/exportar.js';
import rotasPainel from './rotas/painel.js';
import rotasParceiros from './rotas/parceiros.js';
import rotasSocios from './rotas/socios.js';

const cookieSeguro = process.env.COOKIE_SEGURO === '1';

export const app = express();

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', fileURLToPath(new URL('../views', import.meta.url)));
if (cookieSeguro) app.set('trust proxy', 1);

app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));
app.use(express.urlencoded({ extended: false }));
app.use(
  cookieSession({
    name: 'sessao',
    keys: [segredoDaSessao()],
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSeguro,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }),
);

app.use((req, res, next) => {
  req.body ??= {};
  res.locals.f = formato;
  res.locals.opcoes = opcoes;
  res.locals.caminho = req.path;
  res.locals.logado = Boolean(req.session.logado);
  res.locals.demo = lerConfiguracao('demonstracao') === '1';
  res.locals.aviso = req.session.aviso ?? null;
  delete req.session.aviso;
  next();
});

app.use(rotasAutenticacao);
app.use(exigirLogin);
app.use(rotasPainel);
app.use('/eventos', rotasEventos);
app.use('/parceiros', rotasParceiros);
app.use('/socios', rotasSocios);
app.use('/doacoes', rotasDoacoes);
app.use('/exportar', rotasExportar);

app.use((req, res) => {
  res.status(404).render('erro', { titulo: 'Página não encontrada', mensagem: 'Esta página não existe ou o registro foi excluído.' });
});

app.use((erro, req, res, next) => {
  console.error(erro);
  if (res.headersSent) return next(erro);
  res.status(500).render('erro', { titulo: 'Algo deu errado', mensagem: 'Não foi possível concluir a operação. Tente novamente.' });
});
