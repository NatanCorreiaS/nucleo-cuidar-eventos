import { Router } from 'express';
import { db } from '../banco.js';
import { listarEventos, listarSocios } from '../consultas.js';
import { dataBR, hoje, mesCurto, valorSimples } from '../formato.js';
import * as opcoes from '../opcoes.js';

const rotas = Router();

const NUMERICO = /^-?[\d.]+(,\d+)?$/;

// Texto começando com = + - @ seria executado como fórmula pelo Excel.
function celula(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !NUMERICO.test(texto)) texto = `'${texto}`;
  return /[";\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

// Separador ";" e BOM para o Excel em português abrir os acentos e as colunas corretamente.
export function gerarCsv(colunas, linhas) {
  const conteudo = [colunas, ...linhas].map((linha) => linha.map(celula).join(';')).join('\r\n');
  return `﻿${conteudo}\r\n`;
}

const relatorios = {
  eventos() {
    return {
      colunas: ['Evento', 'Data', 'Local', 'Tipo', 'Status', 'Ingresso (R$)', 'Receitas (R$)', 'Doações em dinheiro (R$)', 'Despesas (R$)', 'Resultado (R$)'],
      linhas: listarEventos().map((e) => [
        e.nome, dataBR(e.data), e.local, opcoes.TIPOS_EVENTO[e.tipo], opcoes.STATUS_EVENTO[e.status],
        valorSimples(e.valor_ingresso_centavos), valorSimples(e.receitas), valorSimples(e.doacoes_dinheiro),
        valorSimples(e.despesas), valorSimples(e.resultado),
      ]),
    };
  },
  parceiros() {
    return {
      colunas: ['Nome', 'Categoria', 'Telefone', 'Observações'],
      linhas: db.prepare('SELECT * FROM parceiros ORDER BY nome COLLATE NOCASE').all().map((p) => [
        p.nome, opcoes.CATEGORIAS_PARCEIRO[p.categoria], p.telefone, p.observacoes,
      ]),
    };
  },
  socios() {
    return {
      colunas: ['Nome', 'Telefone', 'Endereço', 'Valor mensal (R$)', 'Forma', 'Cobrador', 'Início', 'Situação', 'Meses em atraso'],
      linhas: listarSocios().map((s) => [
        s.nome, s.telefone, s.endereco, valorSimples(s.valor_mensal_centavos), opcoes.FORMAS_SOCIO[s.forma], s.cobrador,
        mesCurto(s.inicio), s.ativo ? 'Ativo' : 'Inativo', s.meses_atraso.map(mesCurto).join(', '),
      ]),
    };
  },
  mensalidades() {
    const pagamentos = db
      .prepare(
        `SELECT s.nome, p.competencia, p.valor_centavos, p.data_pagamento FROM pagamentos_socios p
         JOIN socios s ON s.id = p.socio_id ORDER BY p.competencia DESC, s.nome COLLATE NOCASE`,
      )
      .all();
    return {
      colunas: ['Sócio', 'Mês de referência', 'Valor (R$)', 'Data do pagamento'],
      linhas: pagamentos.map((p) => [p.nome, mesCurto(p.competencia), valorSimples(p.valor_centavos), dataBR(p.data_pagamento)]),
    };
  },
  doacoes() {
    const doacoes = db
      .prepare(
        `SELECT d.*, e.nome AS evento FROM doacoes d
         LEFT JOIN eventos e ON e.id = d.evento_id ORDER BY d.data DESC, d.id DESC`,
      )
      .all();
    return {
      colunas: ['Data', 'Doador', 'Tipo', 'Descrição', 'Valor (R$)', 'Origem', 'Evento'],
      linhas: doacoes.map((d) => [
        dataBR(d.data), d.doador, opcoes.TIPOS_DOACAO[d.tipo], d.descricao, valorSimples(d.valor_centavos),
        opcoes.ORIGENS_DOACAO[d.origem], d.evento,
      ]),
    };
  },
};

rotas.get('/:relatorio.csv', (req, res, next) => {
  if (!Object.hasOwn(relatorios, req.params.relatorio)) return next();
  const { colunas, linhas } = relatorios[req.params.relatorio]();
  res.type('text/csv; charset=utf-8');
  res.attachment(`${req.params.relatorio}-${hoje()}.csv`);
  res.send(gerarCsv(colunas, linhas));
});

export default rotas;
