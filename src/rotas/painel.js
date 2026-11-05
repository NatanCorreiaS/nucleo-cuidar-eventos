import { Router } from 'express';
import { db } from '../banco.js';
import { listarSocios } from '../consultas.js';
import { hoje, mesAtual } from '../formato.js';

const rotas = Router();

function somaDoMes(sql, mes) {
  return db.prepare(sql).get(mes).total ?? 0;
}

rotas.get('/', (req, res) => {
  const mes = mesAtual();
  const eventos = somaDoMes(
    `SELECT SUM(valor_centavos) AS total FROM lancamentos WHERE tipo = 'receita' AND substr(data, 1, 7) = ?`, mes,
  );
  const despesas = somaDoMes(
    `SELECT SUM(valor_centavos) AS total FROM lancamentos WHERE tipo = 'despesa' AND substr(data, 1, 7) = ?`, mes,
  );
  const socios = somaDoMes(
    'SELECT SUM(valor_centavos) AS total FROM pagamentos_socios WHERE substr(data_pagamento, 1, 7) = ?', mes,
  );
  const doacoes = somaDoMes(
    `SELECT SUM(valor_centavos) AS total FROM doacoes WHERE tipo = 'dinheiro' AND substr(data, 1, 7) = ?`, mes,
  );
  const emAtraso = listarSocios()
    .filter((socio) => socio.meses_atraso.length)
    .sort((a, b) => b.meses_atraso.length - a.meses_atraso.length);
  const proximosEventos = db
    .prepare(
      `SELECT * FROM eventos WHERE status = 'planejado' AND (data IS NULL OR data >= ?)
       ORDER BY data IS NULL, data, nome LIMIT 5`,
    )
    .all(hoje());

  res.render('painel', {
    titulo: 'Painel',
    mes,
    arrecadado: { eventos, socios, doacoes, total: eventos + socios + doacoes },
    despesas,
    emAtraso,
    proximosEventos,
  });
});

export default rotas;
