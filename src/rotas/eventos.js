import { Router } from 'express';
import { db } from '../banco.js';
import { buscarEvento, listarEventos } from '../consultas.js';
import { dataValida, hoje, lerDinheiro, limpar, moeda, valorSimples } from '../formato.js';
import { STATUS_EVENTO, TIPOS_EVENTO } from '../opcoes.js';

const rotas = Router();

function lerFormulario(corpo) {
  const dados = {
    nome: limpar(corpo.nome),
    data: limpar(corpo.data),
    local: limpar(corpo.local),
    tipo: limpar(corpo.tipo),
    status: limpar(corpo.status),
    valor_ingresso: limpar(corpo.valor_ingresso),
    observacoes: limpar(corpo.observacoes),
  };
  const centavos = lerDinheiro(dados.valor_ingresso);
  const erros = [];
  if (!dados.nome) erros.push('Informe o nome do evento.');
  if (dados.data && !dataValida(dados.data)) erros.push('A data não é válida.');
  if (!Object.hasOwn(TIPOS_EVENTO, dados.tipo ?? '')) erros.push('Escolha o tipo do evento.');
  if (!Object.hasOwn(STATUS_EVENTO, dados.status ?? '')) erros.push('Escolha o status do evento.');
  if (Number.isNaN(centavos)) erros.push('O valor do ingresso não é válido. Exemplo: 60,00');
  return { dados, centavos, erros };
}

function avisar(req, texto, tipo = 'ok') {
  req.session.aviso = { tipo, texto };
}

rotas.get('/', (req, res) => {
  const status = Object.hasOwn(STATUS_EVENTO, req.query.status ?? '') ? req.query.status : null;
  res.render('eventos/lista', { titulo: 'Eventos', eventos: listarEventos(status), status });
});

rotas.get('/novo', (req, res) => {
  res.render('eventos/formulario', {
    titulo: 'Novo evento',
    evento: { tipo: 'proprio', status: 'planejado' },
    acao: '/eventos',
    erros: [],
  });
});

rotas.post('/', (req, res) => {
  const { dados, centavos, erros } = lerFormulario(req.body);
  if (erros.length) {
    return res.status(400).render('eventos/formulario', { titulo: 'Novo evento', evento: dados, acao: '/eventos', erros });
  }
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO eventos (nome, data, local, tipo, status, valor_ingresso_centavos, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(dados.nome, dados.data, dados.local, dados.tipo, dados.status, centavos, dados.observacoes);
  avisar(req, 'Evento criado.');
  res.redirect(`/eventos/${lastInsertRowid}`);
});

rotas.get('/:id', (req, res, next) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return next();
  res.render('eventos/detalhe', {
    titulo: evento.nome,
    evento,
    hoje: hoje(),
    lancamentos: db
      .prepare('SELECT * FROM lancamentos WHERE evento_id = ? ORDER BY data DESC, id DESC')
      .all(evento.id),
    apoios: db
      .prepare(
        `SELECT a.*, p.nome AS parceiro FROM apoios a
         JOIN parceiros p ON p.id = a.parceiro_id
         WHERE a.evento_id = ? ORDER BY p.nome COLLATE NOCASE`,
      )
      .all(evento.id),
    doacoes: db.prepare('SELECT * FROM doacoes WHERE evento_id = ? ORDER BY data DESC, id DESC').all(evento.id),
    parceiros: db.prepare('SELECT id, nome FROM parceiros ORDER BY nome COLLATE NOCASE').all(),
  });
});

rotas.get('/:id/editar', (req, res, next) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return next();
  res.render('eventos/formulario', {
    titulo: 'Editar evento',
    evento: { ...evento, valor_ingresso: valorSimples(evento.valor_ingresso_centavos) },
    acao: `/eventos/${evento.id}`,
    erros: [],
  });
});

rotas.post('/:id', (req, res, next) => {
  if (!buscarEvento(req.params.id)) return next();
  const { dados, centavos, erros } = lerFormulario(req.body);
  if (erros.length) {
    return res.status(400).render('eventos/formulario', {
      titulo: 'Editar evento',
      evento: { ...dados, id: req.params.id },
      acao: `/eventos/${req.params.id}`,
      erros,
    });
  }
  db.prepare(
    `UPDATE eventos SET nome = ?, data = ?, local = ?, tipo = ?, status = ?,
       valor_ingresso_centavos = ?, observacoes = ? WHERE id = ?`,
  ).run(dados.nome, dados.data, dados.local, dados.tipo, dados.status, centavos, dados.observacoes, req.params.id);
  avisar(req, 'Evento atualizado.');
  res.redirect(`/eventos/${req.params.id}`);
});

rotas.post('/:id/excluir', (req, res) => {
  db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id);
  avisar(req, 'Evento excluído.');
  res.redirect('/eventos');
});

rotas.post('/:id/lancamentos', (req, res, next) => {
  if (!buscarEvento(req.params.id)) return next();
  const descricao = limpar(req.body.descricao);
  const tipo = limpar(req.body.tipo);
  const data = limpar(req.body.data);
  const centavos = lerDinheiro(req.body.valor);
  if (!descricao || !['receita', 'despesa'].includes(tipo) || !dataValida(data) || !(centavos > 0)) {
    avisar(req, 'Lançamento não salvo: preencha tipo, descrição, data e um valor maior que zero.', 'erro');
  } else {
    db.prepare('INSERT INTO lancamentos (evento_id, tipo, descricao, valor_centavos, data) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, tipo, descricao, centavos, data);
    avisar(req, tipo === 'receita' ? 'Receita lançada.' : 'Despesa lançada.');
  }
  res.redirect(`/eventos/${req.params.id}#financeiro`);
});

rotas.post('/:id/lancamentos/:lancamento/excluir', (req, res) => {
  db.prepare('DELETE FROM lancamentos WHERE id = ? AND evento_id = ?').run(req.params.lancamento, req.params.id);
  avisar(req, 'Lançamento excluído.');
  res.redirect(`/eventos/${req.params.id}#financeiro`);
});

rotas.post('/:id/ingressos', (req, res, next) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return next();
  const quantidade = Number(req.body.quantidade);
  const data = limpar(req.body.data);
  if (!evento.valor_ingresso_centavos || !Number.isInteger(quantidade) || quantidade <= 0 || !dataValida(data)) {
    avisar(req, 'Ingressos não lançados: informe a quantidade e a data.', 'erro');
  } else {
    db.prepare(`INSERT INTO lancamentos (evento_id, tipo, descricao, valor_centavos, data) VALUES (?, 'receita', ?, ?, ?)`)
      .run(
        evento.id,
        `Ingressos: ${quantidade} × ${moeda(evento.valor_ingresso_centavos)}`,
        quantidade * evento.valor_ingresso_centavos,
        data,
      );
    avisar(req, 'Venda de ingressos lançada.');
  }
  res.redirect(`/eventos/${evento.id}#financeiro`);
});

rotas.post('/:id/apoios', (req, res, next) => {
  if (!buscarEvento(req.params.id)) return next();
  const parceiro = db.prepare('SELECT id FROM parceiros WHERE id = ?').get(req.body.parceiro_id ?? 0);
  const descricao = limpar(req.body.descricao);
  if (!parceiro || !descricao) {
    avisar(req, 'Apoio não salvo: escolha o parceiro e diga o que foi contribuído.', 'erro');
  } else {
    db.prepare('INSERT INTO apoios (evento_id, parceiro_id, descricao) VALUES (?, ?, ?)')
      .run(req.params.id, parceiro.id, descricao);
    avisar(req, 'Apoio registrado.');
  }
  res.redirect(`/eventos/${req.params.id}#apoios`);
});

rotas.post('/:id/apoios/:apoio/excluir', (req, res) => {
  db.prepare('DELETE FROM apoios WHERE id = ? AND evento_id = ?').run(req.params.apoio, req.params.id);
  avisar(req, 'Apoio removido.');
  res.redirect(`/eventos/${req.params.id}#apoios`);
});

export default rotas;
