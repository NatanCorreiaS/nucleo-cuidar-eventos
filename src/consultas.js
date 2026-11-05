import { db } from './banco.js';
import { mesAtual, mesesEntre, somarMeses } from './formato.js';

const SQL_EVENTOS = `
  SELECT e.*,
    COALESCE((SELECT SUM(valor_centavos) FROM lancamentos l
              WHERE l.evento_id = e.id AND l.tipo = 'receita'), 0) AS receitas,
    COALESCE((SELECT SUM(valor_centavos) FROM lancamentos l
              WHERE l.evento_id = e.id AND l.tipo = 'despesa'), 0) AS despesas,
    COALESCE((SELECT SUM(valor_centavos) FROM doacoes d
              WHERE d.evento_id = e.id AND d.tipo = 'dinheiro'), 0) AS doacoes_dinheiro
  FROM eventos e`;

function comResultado(evento) {
  return { ...evento, resultado: evento.receitas + evento.doacoes_dinheiro - evento.despesas };
}

export function listarEventos(status) {
  const filtro = status ? 'WHERE e.status = ?' : '';
  const parametros = status ? [status] : [];
  // Eventos sem data vêm primeiro: são os que ainda precisam de definição.
  return db
    .prepare(`${SQL_EVENTOS} ${filtro} ORDER BY e.data IS NOT NULL, e.data DESC, e.nome`)
    .all(...parametros)
    .map(comResultado);
}

export function buscarEvento(id) {
  const evento = db.prepare(`${SQL_EVENTOS} WHERE e.id = ?`).get(id);
  return evento ? comResultado(evento) : null;
}

// Meses vencidos sem pagamento. O mês corrente ainda não conta como atraso.
export function mesesEmAtraso(inicio, pagos, mesCorrente) {
  return mesesEntre(inicio, somarMeses(mesCorrente, -1)).filter((mes) => !pagos.has(mes));
}

export function listarSocios() {
  const pagosPorSocio = new Map();
  for (const { socio_id, competencia } of db.prepare('SELECT socio_id, competencia FROM pagamentos_socios').all()) {
    if (!pagosPorSocio.has(socio_id)) pagosPorSocio.set(socio_id, new Set());
    pagosPorSocio.get(socio_id).add(competencia);
  }
  const corrente = mesAtual();
  return db
    .prepare('SELECT * FROM socios ORDER BY nome COLLATE NOCASE')
    .all()
    .map((socio) => ({
      ...socio,
      meses_atraso: socio.ativo
        ? mesesEmAtraso(socio.inicio, pagosPorSocio.get(socio.id) ?? new Set(), corrente)
        : [],
    }));
}

export function listarCobradores() {
  return db
    .prepare('SELECT DISTINCT cobrador FROM socios WHERE cobrador IS NOT NULL ORDER BY cobrador COLLATE NOCASE')
    .all()
    .map((linha) => linha.cobrador);
}
