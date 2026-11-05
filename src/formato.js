// Conversões entre o que a pessoa digita, o que fica no banco e o que aparece na tela.
// Dinheiro é sempre guardado em centavos (inteiro), datas como AAAA-MM-DD e meses como AAAA-MM.

const FUSO = 'America/Bahia';
const NOMES_MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatoNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function limpar(valor) {
  if (typeof valor !== 'string') return null;
  return valor.trim() || null;
}

// Aceita "60", "60,5", "1.234,56", "R$ 60,00" e "60.50". Vazio vira null e inválido vira NaN.
export function lerDinheiro(texto) {
  const limpo = String(texto ?? '').replace(/R\$|\s/g, '');
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(',')) normalizado = limpo.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) normalizado = limpo.replace(/\./g, '');
  const partes = normalizado.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!partes) return NaN;
  return Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
}

export function moeda(centavos) {
  return centavos == null ? '—' : formatoMoeda.format(centavos / 100);
}

// Número sem "R$", para campos de formulário e planilhas.
export function valorSimples(centavos) {
  return centavos == null ? '' : formatoNumero.format(centavos / 100);
}

export function hoje(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(agora);
}

export function mesAtual(agora = new Date()) {
  return hoje(agora).slice(0, 7);
}

export function dataValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto ?? '')) return false;
  const data = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === texto;
}

export function mesValido(texto) {
  return typeof texto === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(texto);
}

export function dataBR(texto) {
  if (!texto) return 'A definir';
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function mesPorExtenso(texto) {
  const [ano, mes] = texto.split('-');
  return `${NOMES_MESES[Number(mes) - 1]} de ${ano}`;
}

export function mesCurto(texto) {
  const [ano, mes] = texto.split('-');
  return `${mes}/${ano}`;
}

export function somarMeses(mes, quantidade) {
  const [ano, numero] = mes.split('-').map(Number);
  const total = ano * 12 + (numero - 1) + quantidade;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

// Lista de meses de "inicio" até "fim", incluindo os dois.
export function mesesEntre(inicio, fim) {
  const meses = [];
  for (let mes = inicio; mes <= fim; mes = somarMeses(mes, 1)) meses.push(mes);
  return meses;
}

// Evita que um redirecionamento vindo de formulário leve para outro site.
export function caminhoLocal(texto, padrao) {
  return typeof texto === 'string' && /^\/(?![/\\])/.test(texto) ? texto : padrao;
}
