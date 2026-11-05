import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';

// O banco de teste precisa estar definido antes de carregar o app.
const pasta = mkdtempSync(join(tmpdir(), 'nucleo-teste-'));
process.env.ARQUIVO_BANCO = join(pasta, 'teste.db');

const { app } = await import('../src/app.js');
const { db } = await import('../src/banco.js');
const { hoje, lerDinheiro, mesAtual, mesesEntre, moeda, somarMeses } = await import('../src/formato.js');
const { mesesEmAtraso } = await import('../src/consultas.js');
const { gerarCsv } = await import('../src/rotas/exportar.js');

let servidor;
let base;
const cookies = new Map();

async function pedir(caminho, corpo) {
  const resposta = await fetch(base + caminho, {
    method: corpo ? 'POST' : 'GET',
    redirect: 'manual',
    headers: {
      cookie: [...cookies].map(([nome, valor]) => `${nome}=${valor}`).join('; '),
      ...(corpo ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: corpo ? new URLSearchParams(corpo).toString() : undefined,
  });
  for (const cookie of resposta.headers.getSetCookie()) {
    const [par] = cookie.split(';');
    const separador = par.indexOf('=');
    cookies.set(par.slice(0, separador), par.slice(separador + 1));
  }
  return resposta;
}

before(async () => {
  await new Promise((resolver) => {
    servidor = app.listen(0, resolver);
  });
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  db.close();
  rmSync(pasta, { recursive: true, force: true });
});

test('lerDinheiro entende os formatos usados no Brasil', () => {
  assert.equal(lerDinheiro('60'), 6000);
  assert.equal(lerDinheiro('60,5'), 6050);
  assert.equal(lerDinheiro('1.234,56'), 123456);
  assert.equal(lerDinheiro('R$ 60,00'), 6000);
  assert.equal(lerDinheiro('60.50'), 6050);
  assert.equal(lerDinheiro('1.000'), 100000);
  assert.equal(lerDinheiro(''), null);
  assert.ok(Number.isNaN(lerDinheiro('abc')));
  assert.ok(Number.isNaN(lerDinheiro('-5')));
});

test('contas de meses atravessam a virada do ano', () => {
  assert.equal(somarMeses('2026-01', -1), '2025-12');
  assert.equal(somarMeses('2026-12', 1), '2027-01');
  assert.deepEqual(mesesEntre('2025-11', '2026-02'), ['2025-11', '2025-12', '2026-01', '2026-02']);
  assert.deepEqual(mesesEntre('2026-03', '2026-02'), []);
});

test('mês corrente não conta como atraso; meses vencidos sem pagamento contam', () => {
  const pagos = new Set(['2026-09']);
  assert.deepEqual(mesesEmAtraso('2026-08', pagos, '2026-11'), ['2026-08', '2026-10']);
  assert.deepEqual(mesesEmAtraso('2026-11', new Set(), '2026-11'), []);
});

test('CSV protege contra fórmulas sem afetar números negativos', () => {
  const csv = gerarCsv(['A', 'B'], [['=SOMA(1)', '-100,00'], ['com;ponto', null]]);
  assert.ok(csv.startsWith('﻿A;B\r\n'));
  assert.ok(csv.includes(`'=SOMA(1);-100,00`));
  assert.ok(csv.includes('"com;ponto";'));
});

test('sem senha definida, o sistema pede o primeiro acesso', async () => {
  assert.equal((await pedir('/')).headers.get('location'), '/entrar');
  assert.equal((await pedir('/entrar')).headers.get('location'), '/primeiro-acesso');
});

test('senha curta é recusada e o primeiro acesso cria a sessão', async () => {
  assert.equal((await pedir('/primeiro-acesso', { senha: 'curta', confirmacao: 'curta' })).status, 400);
  const resposta = await pedir('/primeiro-acesso', { senha: 'senha-de-teste', confirmacao: 'senha-de-teste' });
  assert.equal(resposta.headers.get('location'), '/');
  assert.equal((await pedir('/')).status, 200);
});

test('resultado do evento soma receitas e doações e desconta despesas', async () => {
  const criado = await pedir('/eventos', { nome: 'Seresta teste', tipo: 'proprio', status: 'realizado', valor_ingresso: '60,00' });
  const local = criado.headers.get('location');
  const id = local.split('/').pop();

  await pedir(`/eventos/${id}/ingressos`, { quantidade: '10', data: hoje() });
  await pedir(`/eventos/${id}/lancamentos`, { tipo: 'despesa', descricao: 'Som', valor: '100,00', data: hoje() });
  await pedir('/doacoes', { data: hoje(), tipo: 'dinheiro', valor: '50', origem: 'evento', evento_id: id });

  const pagina = await (await pedir(local)).text();
  assert.ok(pagina.includes(moeda(55000)), 'resultado esperado de R$ 550,00');
});

test('lançamento inválido não é salvo', async () => {
  const { id } = db.prepare('SELECT id FROM eventos LIMIT 1').get();
  const antes = db.prepare('SELECT COUNT(*) AS n FROM lancamentos').get().n;
  await pedir(`/eventos/${id}/lancamentos`, { tipo: 'despesa', descricao: 'Sem valor', valor: 'abc', data: hoje() });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lancamentos').get().n, antes);
});

test('sócio: atraso, "Marcar pago" e pagamento repetido', async () => {
  const mes = mesAtual();
  const inicio = somarMeses(mes, -2);
  const criado = await pedir('/socios', {
    nome: 'Sócio Teste', valor_mensal: '20,00', forma: 'cobrador', cobrador: 'Fulano', inicio, ativo: '1',
  });
  const id = criado.headers.get('location').split('/').pop();

  let pagina = await (await pedir(`/socios/${id}`)).text();
  assert.ok(pagina.includes('Meses em atraso (2)'));

  await pedir(`/socios/${id}/pagamentos`, { competencia: inicio });
  const pagamento = db.prepare('SELECT * FROM pagamentos_socios WHERE socio_id = ?').get(id);
  assert.equal(pagamento.valor_centavos, 2000);
  assert.equal(pagamento.data_pagamento, hoje());

  await pedir(`/socios/${id}/pagamentos`, { competencia: inicio, valor: '99,00' });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM pagamentos_socios WHERE socio_id = ?').get(id).n, 1);

  pagina = await (await pedir(`/socios/${id}`)).text();
  assert.ok(pagina.includes('Meses em atraso (1)'));
});

test('cobrador é obrigatório quando a forma é cobrador', async () => {
  const resposta = await pedir('/socios', { nome: 'X', valor_mensal: '10', forma: 'cobrador', inicio: mesAtual(), ativo: '1' });
  assert.equal(resposta.status, 400);
});

test('doação de alimentos exige descrição e não guarda valor', async () => {
  const semDescricao = await pedir('/doacoes', { data: hoje(), tipo: 'alimentos', origem: 'pessoa' });
  assert.equal(semDescricao.status, 400);
  await pedir('/doacoes', { data: hoje(), tipo: 'alimentos', descricao: '5 kg de arroz', valor: '30', origem: 'pessoa' });
  const doacao = db.prepare(`SELECT * FROM doacoes WHERE descricao = '5 kg de arroz'`).get();
  assert.equal(doacao.valor_centavos, null);
});

test('conteúdo digitado é escapado no HTML', async () => {
  const criado = await pedir('/parceiros', { nome: '<script>alert(1)</script>', categoria: 'parceiro' });
  assert.equal(criado.status, 302);
  const pagina = await (await pedir('/parceiros')).text();
  assert.ok(!pagina.includes('<script>alert(1)</script>'));
  assert.ok(pagina.includes('&lt;script&gt;'));
});

test('exportações respondem CSV, e relatório inexistente dá 404', async () => {
  for (const relatorio of ['eventos', 'parceiros', 'socios', 'mensalidades', 'doacoes']) {
    const resposta = await pedir(`/exportar/${relatorio}.csv`);
    assert.equal(resposta.status, 200, relatorio);
    assert.match(resposta.headers.get('content-type'), /text\/csv/);
  }
  assert.equal((await pedir('/exportar/constructor.csv')).status, 404);
});

test('backup baixa um banco SQLite válido', async () => {
  const resposta = await pedir('/conta/backup');
  assert.equal(resposta.status, 200);
  const bytes = Buffer.from(await resposta.arrayBuffer());
  assert.equal(bytes.subarray(0, 15).toString(), 'SQLite format 3');
});

test('redirecionamento para fora do sistema é ignorado', async () => {
  const { id } = db.prepare('SELECT id FROM socios LIMIT 1').get();
  const resposta = await pedir(`/socios/${id}/pagamentos`, { competencia: mesAtual(), voltar: '//site-externo.com' });
  assert.equal(resposta.headers.get('location'), `/socios/${id}`);
});

test('depois de sair, as páginas voltam a exigir login e senha errada é recusada', async () => {
  await pedir('/sair', {});
  cookies.clear();
  assert.equal((await pedir('/socios')).headers.get('location'), '/entrar');
  assert.equal((await pedir('/entrar', { senha: 'errada-errada' })).status, 401);
  assert.equal((await pedir('/entrar', { senha: 'senha-de-teste' })).headers.get('location'), '/');
  await pedir('/sair', {});
  for (let i = 0; i < 10; i += 1) await pedir('/entrar', { senha: 'errada-errada' });
  assert.equal((await pedir('/entrar', { senha: 'senha-de-teste' })).status, 429);
});
