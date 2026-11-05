import { Router } from 'express';
import { db } from '../banco.js';
import { limpar } from '../formato.js';
import { CATEGORIAS_PARCEIRO } from '../opcoes.js';

const rotas = Router();

function lerFormulario(corpo) {
  const dados = {
    nome: limpar(corpo.nome),
    categoria: limpar(corpo.categoria),
    telefone: limpar(corpo.telefone),
    observacoes: limpar(corpo.observacoes),
  };
  const erros = [];
  if (!dados.nome) erros.push('Informe o nome do parceiro.');
  if (!Object.hasOwn(CATEGORIAS_PARCEIRO, dados.categoria ?? '')) erros.push('Escolha a categoria.');
  return { dados, erros };
}

rotas.get('/', (req, res) => {
  const parceiros = db
    .prepare(
      `SELECT p.*, COUNT(a.id) AS total_apoios FROM parceiros p
       LEFT JOIN apoios a ON a.parceiro_id = p.id
       GROUP BY p.id ORDER BY p.nome COLLATE NOCASE`,
    )
    .all();
  res.render('parceiros/lista', { titulo: 'Parceiros e patrocinadores', parceiros });
});

rotas.get('/novo', (req, res) => {
  res.render('parceiros/formulario', {
    titulo: 'Novo parceiro',
    parceiro: { categoria: 'parceiro' },
    acao: '/parceiros',
    erros: [],
    apoios: [],
  });
});

rotas.post('/', (req, res) => {
  const { dados, erros } = lerFormulario(req.body);
  if (erros.length) {
    return res.status(400).render('parceiros/formulario', {
      titulo: 'Novo parceiro', parceiro: dados, acao: '/parceiros', erros, apoios: [],
    });
  }
  db.prepare('INSERT INTO parceiros (nome, categoria, telefone, observacoes) VALUES (?, ?, ?, ?)')
    .run(dados.nome, dados.categoria, dados.telefone, dados.observacoes);
  req.session.aviso = { tipo: 'ok', texto: 'Parceiro cadastrado.' };
  res.redirect('/parceiros');
});

function apoiosDoParceiro(id) {
  return db
    .prepare(
      `SELECT a.descricao, e.id AS evento_id, e.nome AS evento, e.data FROM apoios a
       JOIN eventos e ON e.id = a.evento_id
       WHERE a.parceiro_id = ? ORDER BY e.data DESC`,
    )
    .all(id);
}

rotas.get('/:id/editar', (req, res, next) => {
  const parceiro = db.prepare('SELECT * FROM parceiros WHERE id = ?').get(req.params.id);
  if (!parceiro) return next();
  res.render('parceiros/formulario', {
    titulo: 'Editar parceiro',
    parceiro,
    acao: `/parceiros/${parceiro.id}`,
    erros: [],
    apoios: apoiosDoParceiro(parceiro.id),
  });
});

rotas.post('/:id', (req, res, next) => {
  const existente = db.prepare('SELECT id FROM parceiros WHERE id = ?').get(req.params.id);
  if (!existente) return next();
  const { dados, erros } = lerFormulario(req.body);
  if (erros.length) {
    return res.status(400).render('parceiros/formulario', {
      titulo: 'Editar parceiro',
      parceiro: { ...dados, id: existente.id },
      acao: `/parceiros/${existente.id}`,
      erros,
      apoios: apoiosDoParceiro(existente.id),
    });
  }
  db.prepare('UPDATE parceiros SET nome = ?, categoria = ?, telefone = ?, observacoes = ? WHERE id = ?')
    .run(dados.nome, dados.categoria, dados.telefone, dados.observacoes, existente.id);
  req.session.aviso = { tipo: 'ok', texto: 'Parceiro atualizado.' };
  res.redirect('/parceiros');
});

rotas.post('/:id/excluir', (req, res) => {
  db.prepare('DELETE FROM parceiros WHERE id = ?').run(req.params.id);
  req.session.aviso = { tipo: 'ok', texto: 'Parceiro excluído.' };
  res.redirect('/parceiros');
});

export default rotas;
