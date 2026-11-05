// Carrega dados de demonstração. Só roda em banco sem eventos, para nunca misturar com dados reais.
// Os eventos e preços de ingresso vêm da conversa com o núcleo; os demais dados são fictícios.
import { db, gravarConfiguracao } from '../src/banco.js';
import { hoje, mesAtual, somarMeses } from '../src/formato.js';

const { total } = db.prepare('SELECT COUNT(*) AS total FROM eventos').get();
if (total > 0) {
  console.error('O banco já tem eventos. A demonstração só é carregada em um banco vazio.');
  process.exit(1);
}

const hojeTexto = hoje();
const mes = mesAtual();

function diasDepois(dias) {
  const data = new Date(`${hojeTexto}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

const inserirEvento = db.prepare(
  `INSERT INTO eventos (nome, data, local, tipo, status, valor_ingresso_centavos, observacoes)
   VALUES (@nome, @data, @local, @tipo, @status, @ingresso, @observacoes)`,
);
const inserirLancamento = db.prepare(
  'INSERT INTO lancamentos (evento_id, tipo, descricao, valor_centavos, data) VALUES (?, ?, ?, ?, ?)',
);
const inserirParceiro = db.prepare('INSERT INTO parceiros (nome, categoria, telefone, observacoes) VALUES (?, ?, ?, ?)');
const inserirApoio = db.prepare('INSERT INTO apoios (evento_id, parceiro_id, descricao) VALUES (?, ?, ?)');
const inserirSocio = db.prepare(
  `INSERT INTO socios (nome, telefone, endereco, valor_mensal_centavos, forma, cobrador, inicio)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const inserirPagamento = db.prepare(
  'INSERT INTO pagamentos_socios (socio_id, competencia, valor_centavos, data_pagamento) VALUES (?, ?, ?, ?)',
);
const inserirDoacao = db.prepare(
  `INSERT INTO doacoes (data, doador, tipo, descricao, valor_centavos, origem, evento_id)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);

db.transaction(() => {
  const evento = (dados) =>
    inserirEvento.run({ local: null, ingresso: null, observacoes: null, ...dados }).lastInsertRowid;

  const ressaca = evento({
    nome: 'Ressaca do Forró', data: '2026-07-18', tipo: 'proprio', status: 'realizado', ingresso: 3000,
  });
  const seresta = evento({
    nome: 'Seresta', data: '2026-08-15', tipo: 'proprio', status: 'realizado', ingresso: 6000,
  });
  evento({
    nome: 'Caruru', data: null, tipo: 'proprio', status: 'cancelado',
    observacoes: 'Cancelado por falta de ingredientes.',
  });
  const flores = evento({
    nome: 'Seresta das Flores', data: '2026-09-19', tipo: 'proprio', status: 'realizado', ingresso: 6000,
  });
  evento({
    nome: 'Festival de Tortas e rifa', data: null, tipo: 'proprio', status: 'cancelado',
    observacoes: 'Acontece todos os anos, mas não foi possível realizar neste ano.',
  });
  const festival = evento({
    nome: 'Festival de Dança', data: '2026-10-24', local: 'Centro de Cultura', tipo: 'arrecadacao', status: 'realizado',
    observacoes: 'Festival dos professores Alessandro e Roberta. Arrecadação de alimentos.',
  });
  evento({
    nome: 'Seresta de fim de ano (exemplo)', data: diasDepois(40), tipo: 'proprio', status: 'planejado', ingresso: 6000,
    observacoes: 'Evento fictício para demonstrar a lista de próximos eventos.',
  });

  inserirLancamento.run(ressaca, 'receita', 'Ingressos: 80 × R$ 30,00', 240000, '2026-07-18');
  inserirLancamento.run(ressaca, 'despesa', 'Banda e som', 90000, '2026-07-18');
  inserirLancamento.run(seresta, 'receita', 'Ingressos: 50 × R$ 60,00', 300000, '2026-08-15');
  inserirLancamento.run(seresta, 'despesa', 'Músicos', 120000, '2026-08-15');
  inserirLancamento.run(seresta, 'despesa', 'Decoração', 25000, '2026-08-14');
  inserirLancamento.run(flores, 'receita', 'Ingressos: 45 × R$ 60,00', 270000, '2026-09-19');
  inserirLancamento.run(flores, 'despesa', 'Músicos', 120000, '2026-09-19');
  inserirLancamento.run(flores, 'despesa', 'Flores e decoração', 40000, '2026-09-18');

  const padaria = inserirParceiro.run('Padaria Exemplo', 'patrocinador', '(73) 90000-0001', null).lastInsertRowid;
  const mercado = inserirParceiro.run('Mercadinho Exemplo', 'patrocinador', '(73) 90000-0002', null).lastInsertRowid;
  const som = inserirParceiro.run('Som e Luz Exemplo', 'parceiro', '(73) 90000-0003', null).lastInsertRowid;
  const professores = inserirParceiro.run(
    'Alessandro e Roberta', 'parceiro', null, 'Professores de dança. Promovem o festival no Centro de Cultura.',
  ).lastInsertRowid;

  inserirApoio.run(seresta, padaria, 'Salgados para o evento');
  inserirApoio.run(flores, mercado, 'Bebidas com desconto');
  inserirApoio.run(ressaca, som, 'Desconto no aluguel do som');
  inserirApoio.run(festival, professores, 'Espaço para arrecadação de alimentos no festival');

  // [nome, valor, forma, cobrador, meses sem pagar contados a partir do último mês fechado]
  const socios = [
    ['Maria Exemplo', 2000, 'pix', null, 0],
    ['João Exemplo', 5000, 'cobrador', 'Carlos Exemplo', 0],
    ['Ana Exemplo', 1000, 'cobrador', 'Carlos Exemplo', 2],
    ['Pedro Exemplo', 3000, 'pix', null, 1],
    ['Lúcia Exemplo', 2000, 'cobrador', 'Carlos Exemplo', 0],
    ['Paulo Exemplo', 1500, 'cobrador', 'Rita Exemplo', 3],
    ['Helena Exemplo', 10000, 'pix', null, 0],
    ['Antônio Exemplo', 2000, 'cobrador', 'Rita Exemplo', 0],
  ];
  const inicio = somarMeses(mes, -6);
  socios.forEach(([nome, valor, forma, cobrador, mesesSemPagar], indice) => {
    const socioId = inserirSocio.run(
      nome, `(73) 90000-01${String(indice).padStart(2, '0')}`, 'Itabuna-BA', valor, forma, cobrador, inicio,
    ).lastInsertRowid;
    for (let atras = 6; atras >= 1 + mesesSemPagar; atras--) {
      const competencia = somarMeses(mes, -atras);
      inserirPagamento.run(socioId, competencia, valor, `${competencia}-10`);
    }
    // Metade dos sócios em dia já pagou o mês corrente.
    if (mesesSemPagar === 0 && indice % 2 === 0) inserirPagamento.run(socioId, mes, valor, hojeTexto);
  });

  inserirDoacao.run('2026-10-24', null, 'alimentos', '35 kg de alimentos não perecíveis', null, 'evento', festival);
  inserirDoacao.run('2026-10-24', null, 'dinheiro', 'Doações espontâneas no festival', 18000, 'evento', festival);
  inserirDoacao.run(hojeTexto, 'Doador Exemplo', 'dinheiro', null, 10000, 'pessoa', null);
  inserirDoacao.run(hojeTexto, null, 'itens', 'Roupas e sapatos usados para o bazar', null, 'bazar', null);
  inserirDoacao.run(hojeTexto, null, 'dinheiro', 'Depósito via Correios', 5000, 'correios', null);

  gravarConfiguracao('demonstracao', '1');
})();

console.log('Dados de demonstração carregados.');
