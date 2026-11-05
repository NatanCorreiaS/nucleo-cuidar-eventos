import { Router } from 'express';
import { db } from '../banco.js';
import { caminhoLocal, dataValida, hoje, lerDinheiro, limpar, mesValido, somarMeses, mesAtual, valorSimples } from '../formato.js';
import { ORIGENS_DOACAO, TIPOS_DOACAO } from '../opcoes.js';

const rotas = Router();

function listarEventosParaSelecao() {
  return db.prepare('SELECT id, nome, data FROM eventos ORDER BY data IS NOT NULL, data DESC, nome').all();
}

function lerFormulario(corpo) {
  const origem = limpar(corpo.origem);
  const dados = {
    data: limpar(corpo.data),
    doador: limpar(corpo.doador),
    tipo: limpar(corpo.tipo),
    descricao: limpar(corpo.descricao),
    valor: limpar(corpo.valor),
    origem,
    evento_id: origem === 'evento' ? limpar(corpo.evento_id) : null,
  };
  const erros = [];
  const centavos = dados.tipo === 'dinheiro' ? lerDinheiro(dados.valor) : null;
  if (!dataValida(dados.data)) erros.push('Informe a data da doação.');
  if (!Object.hasOwn(TIPOS_DOACAO, dados.tipo ?? '')) erros.push('Escolha o tipo da doação.');
  if (!Object.hasOwn(ORIGENS_DOACAO, origem ?? '')) erros.push('Escolha a origem da doação.');
  if (dados.tipo === 'dinheiro' && !(centavos > 0)) erros.push('Informe o valor doado. Exemplo: 50,00');
  if (dados.tipo && dados.tipo !== 'dinheiro' && !dados.descricao) {
    erros.push('Descreva o que foi doado. Exemplo: 20 kg de arroz');
  }
  if (origem === 'evento' && !db.prepare('SELECT id FROM eventos WHERE id = ?').get(dados.evento_id ?? 0)) {
    erros.push('Escolha o evento da doação.');
  }
  return { dados, centavos, erros };
}

function renderizarFormulario(res, opcoesTela, status = 200) {
  res.status(status).render('doacoes/formulario', { ...opcoesTela, eventos: listarEventosParaSelecao() });
}

rotas.get('/', (req, res) => {
  const corrente = mesAtual();
  const mes = mesValido(req.query.mes) ? req.query.mes : corrente;
  const doacoes = db
    .prepare(
      `SELECT d.*, e.nome AS evento FROM doacoes d
       LEFT JOIN eventos e ON e.id = d.evento_id
       WHERE substr(d.data, 1, 7) = ? ORDER BY d.data DESC, d.id DESC`,
    )
    .all(mes);
  res.render('doacoes/lista', {
    titulo: 'Doações',
    mes,
    corrente,
    anterior: somarMeses(mes, -1),
    proximo: somarMeses(mes, 1),
    doacoes,
    totalDinheiro: doacoes.reduce((soma, doacao) => soma + (doacao.valor_centavos ?? 0), 0),
  });
});

rotas.get('/nova', (req, res) => {
  const eventoId = req.query.evento ?? null;
  renderizarFormulario(res, {
    titulo: 'Nova doação',
    doacao: {
      data: hoje(),
      tipo: 'dinheiro',
      origem: eventoId ? 'evento' : 'pessoa',
      evento_id: eventoId,
    },
    acao: '/doacoes',
    erros: [],
  });
});

function destinoDepoisDeSalvar(eventoId, data) {
  return eventoId ? `/eventos/${eventoId}#doacoes` : `/doacoes?mes=${data.slice(0, 7)}`;
}

rotas.post('/', (req, res) => {
  const { dados, centavos, erros } = lerFormulario(req.body);
  if (erros.length) {
    return renderizarFormulario(res, { titulo: 'Nova doação', doacao: dados, acao: '/doacoes', erros }, 400);
  }
  db.prepare(
    `INSERT INTO doacoes (data, doador, tipo, descricao, valor_centavos, origem, evento_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(dados.data, dados.doador, dados.tipo, dados.descricao, centavos, dados.origem, dados.evento_id);
  req.session.aviso = { tipo: 'ok', texto: 'Doação registrada.' };
  res.redirect(destinoDepoisDeSalvar(dados.evento_id, dados.data));
});

rotas.get('/:id/editar', (req, res, next) => {
  const doacao = db.prepare('SELECT * FROM doacoes WHERE id = ?').get(req.params.id);
  if (!doacao) return next();
  renderizarFormulario(res, {
    titulo: 'Editar doação',
    doacao: { ...doacao, valor: valorSimples(doacao.valor_centavos) },
    acao: `/doacoes/${doacao.id}`,
    erros: [],
  });
});

rotas.post('/:id', (req, res, next) => {
  const existente = db.prepare('SELECT id FROM doacoes WHERE id = ?').get(req.params.id);
  if (!existente) return next();
  const { dados, centavos, erros } = lerFormulario(req.body);
  if (erros.length) {
    return renderizarFormulario(res, {
      titulo: 'Editar doação', doacao: { ...dados, id: existente.id }, acao: `/doacoes/${existente.id}`, erros,
    }, 400);
  }
  db.prepare(
    `UPDATE doacoes SET data = ?, doador = ?, tipo = ?, descricao = ?, valor_centavos = ?, origem = ?, evento_id = ?
     WHERE id = ?`,
  ).run(dados.data, dados.doador, dados.tipo, dados.descricao, centavos, dados.origem, dados.evento_id, existente.id);
  req.session.aviso = { tipo: 'ok', texto: 'Doação atualizada.' };
  res.redirect(destinoDepoisDeSalvar(dados.evento_id, dados.data));
});

rotas.post('/:id/excluir', (req, res) => {
  db.prepare('DELETE FROM doacoes WHERE id = ?').run(req.params.id);
  req.session.aviso = { tipo: 'ok', texto: 'Doação excluída.' };
  res.redirect(caminhoLocal(req.body.voltar, '/doacoes'));
});

export default rotas;
