import { Router } from 'express';
import { db } from '../banco.js';
import { listarCobradores, listarSocios } from '../consultas.js';
import {
  caminhoLocal, dataValida, hoje, lerDinheiro, limpar, mesAtual, mesValido, somarMeses, valorSimples,
} from '../formato.js';
import { FORMAS_SOCIO } from '../opcoes.js';

const rotas = Router();

function lerFormulario(corpo) {
  const forma = limpar(corpo.forma);
  const dados = {
    nome: limpar(corpo.nome),
    telefone: limpar(corpo.telefone),
    endereco: limpar(corpo.endereco),
    valor_mensal: limpar(corpo.valor_mensal),
    forma,
    cobrador: forma === 'cobrador' ? limpar(corpo.cobrador) : null,
    inicio: limpar(corpo.inicio),
    ativo: corpo.ativo === '1' ? 1 : 0,
    observacoes: limpar(corpo.observacoes),
  };
  const centavos = lerDinheiro(dados.valor_mensal);
  const erros = [];
  if (!dados.nome) erros.push('Informe o nome do sócio.');
  if (!(centavos > 0)) erros.push('Informe o valor mensal. Exemplo: 20,00');
  if (!Object.hasOwn(FORMAS_SOCIO, forma ?? '')) erros.push('Escolha a forma de contribuição.');
  if (forma === 'cobrador' && !dados.cobrador) erros.push('Informe o nome do cobrador.');
  if (!mesValido(dados.inicio)) erros.push('Informe o mês de início da contribuição.');
  return { dados, centavos, erros };
}

function renderizarFormulario(res, opcoesTela, status = 200) {
  res.status(status).render('socios/formulario', { ...opcoesTela, cobradores: listarCobradores() });
}

rotas.get('/', (req, res) => {
  const socios = listarSocios();
  const filtro = req.query.filtro === 'atraso' ? 'atraso' : 'todos';
  res.render('socios/lista', {
    titulo: 'Sócios sustentadores',
    filtro,
    socios: filtro === 'atraso' ? socios.filter((socio) => socio.meses_atraso.length) : socios,
    totalAtivos: socios.filter((socio) => socio.ativo).length,
    totalAtraso: socios.filter((socio) => socio.meses_atraso.length).length,
    esperadoMensal: socios.filter((socio) => socio.ativo).reduce((soma, socio) => soma + socio.valor_mensal_centavos, 0),
  });
});

rotas.get('/mensalidades', (req, res) => {
  const corrente = mesAtual();
  const mes = mesValido(req.query.mes) ? req.query.mes : corrente;
  const cobradores = listarCobradores();
  const cobrador = cobradores.includes(req.query.cobrador) ? req.query.cobrador : null;

  const pagamentos = new Map(
    db.prepare('SELECT * FROM pagamentos_socios WHERE competencia = ?').all(mes).map((p) => [p.socio_id, p]),
  );
  const socios = db
    .prepare('SELECT * FROM socios WHERE ativo = 1 AND inicio <= ? ORDER BY nome COLLATE NOCASE')
    .all(mes)
    .filter((socio) => !cobrador || socio.cobrador === cobrador)
    .map((socio) => ({ ...socio, pagamento: pagamentos.get(socio.id) ?? null }));

  res.render('socios/mensalidades', {
    titulo: 'Mensalidades',
    mes,
    corrente,
    anterior: somarMeses(mes, -1),
    proximo: somarMeses(mes, 1),
    cobradores,
    cobrador,
    socios,
    esperado: socios.reduce((soma, socio) => soma + socio.valor_mensal_centavos, 0),
    recebido: socios.reduce((soma, socio) => soma + (socio.pagamento?.valor_centavos ?? 0), 0),
    pendentes: socios.filter((socio) => !socio.pagamento).length,
    voltar: req.originalUrl,
  });
});

rotas.get('/novo', (req, res) => {
  renderizarFormulario(res, {
    titulo: 'Novo sócio',
    socio: { forma: 'pix', inicio: mesAtual(), ativo: 1 },
    acao: '/socios',
    erros: [],
  });
});

rotas.post('/', (req, res) => {
  const { dados, centavos, erros } = lerFormulario(req.body);
  if (erros.length) {
    return renderizarFormulario(res, { titulo: 'Novo sócio', socio: dados, acao: '/socios', erros }, 400);
  }
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO socios (nome, telefone, endereco, valor_mensal_centavos, forma, cobrador, inicio, ativo, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(dados.nome, dados.telefone, dados.endereco, centavos, dados.forma, dados.cobrador, dados.inicio, dados.ativo, dados.observacoes);
  req.session.aviso = { tipo: 'ok', texto: 'Sócio cadastrado.' };
  res.redirect(`/socios/${lastInsertRowid}`);
});

rotas.get('/:id', (req, res, next) => {
  const socio = listarSocios().find((item) => String(item.id) === req.params.id);
  if (!socio) return next();
  res.render('socios/detalhe', {
    titulo: socio.nome,
    socio,
    hoje: hoje(),
    mesPadrao: socio.meses_atraso[0] ?? mesAtual(),
    pagamentos: db
      .prepare('SELECT * FROM pagamentos_socios WHERE socio_id = ? ORDER BY competencia DESC')
      .all(socio.id),
    voltar: `/socios/${socio.id}`,
  });
});

rotas.get('/:id/editar', (req, res, next) => {
  const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(req.params.id);
  if (!socio) return next();
  renderizarFormulario(res, {
    titulo: 'Editar sócio',
    socio: { ...socio, valor_mensal: valorSimples(socio.valor_mensal_centavos) },
    acao: `/socios/${socio.id}`,
    erros: [],
  });
});

rotas.post('/:id', (req, res, next) => {
  const existente = db.prepare('SELECT id FROM socios WHERE id = ?').get(req.params.id);
  if (!existente) return next();
  const { dados, centavos, erros } = lerFormulario(req.body);
  if (erros.length) {
    return renderizarFormulario(res, {
      titulo: 'Editar sócio', socio: { ...dados, id: existente.id }, acao: `/socios/${existente.id}`, erros,
    }, 400);
  }
  db.prepare(
    `UPDATE socios SET nome = ?, telefone = ?, endereco = ?, valor_mensal_centavos = ?, forma = ?,
       cobrador = ?, inicio = ?, ativo = ?, observacoes = ? WHERE id = ?`,
  ).run(dados.nome, dados.telefone, dados.endereco, centavos, dados.forma, dados.cobrador, dados.inicio, dados.ativo, dados.observacoes, existente.id);
  req.session.aviso = { tipo: 'ok', texto: 'Sócio atualizado.' };
  res.redirect(`/socios/${existente.id}`);
});

rotas.post('/:id/excluir', (req, res) => {
  db.prepare('DELETE FROM socios WHERE id = ?').run(req.params.id);
  req.session.aviso = { tipo: 'ok', texto: 'Sócio e seu histórico de pagamentos excluídos.' };
  res.redirect('/socios');
});

// Sem valor ou data no formulário, usa o valor mensal do sócio e a data de hoje (botão "Marcar pago").
rotas.post('/:id/pagamentos', (req, res, next) => {
  const socio = db.prepare('SELECT * FROM socios WHERE id = ?').get(req.params.id);
  if (!socio) return next();
  const competencia = limpar(req.body.competencia);
  const data = limpar(req.body.data_pagamento) ?? hoje();
  const centavos = lerDinheiro(req.body.valor) ?? socio.valor_mensal_centavos;
  if (!mesValido(competencia) || !dataValida(data) || !(centavos > 0)) {
    req.session.aviso = { tipo: 'erro', texto: 'Pagamento não salvo: confira o mês, a data e o valor.' };
  } else {
    const { changes } = db
      .prepare(
        `INSERT INTO pagamentos_socios (socio_id, competencia, valor_centavos, data_pagamento)
         VALUES (?, ?, ?, ?) ON CONFLICT (socio_id, competencia) DO NOTHING`,
      )
      .run(socio.id, competencia, centavos, data);
    req.session.aviso = changes
      ? { tipo: 'ok', texto: `Pagamento de ${socio.nome} registrado.` }
      : { tipo: 'erro', texto: 'Este mês já estava pago. Exclua o pagamento antes de lançar de novo.' };
  }
  res.redirect(caminhoLocal(req.body.voltar, `/socios/${socio.id}`));
});

rotas.post('/:id/pagamentos/:pagamento/excluir', (req, res) => {
  db.prepare('DELETE FROM pagamentos_socios WHERE id = ? AND socio_id = ?').run(req.params.pagamento, req.params.id);
  req.session.aviso = { tipo: 'ok', texto: 'Pagamento desfeito.' };
  res.redirect(caminhoLocal(req.body.voltar, `/socios/${req.params.id}`));
});

export default rotas;
