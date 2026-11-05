import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const caminhoPadrao = fileURLToPath(new URL('../dados/nucleo.db', import.meta.url));
const caminho = process.env.ARQUIVO_BANCO || caminhoPadrao;

mkdirSync(dirname(caminho), { recursive: true });

export const db = new Database(caminho);
db.pragma('foreign_keys = ON');

// Cada item é uma versão do banco. Para mudar a estrutura, acrescente um item novo
// no fim da lista; nunca altere um item que já rodou em produção.
const migracoes = [
  `
  CREATE TABLE configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  CREATE TABLE eventos (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    data TEXT,
    local TEXT,
    tipo TEXT NOT NULL,
    status TEXT NOT NULL,
    valor_ingresso_centavos INTEGER,
    observacoes TEXT
  );

  CREATE TABLE lancamentos (
    id INTEGER PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    descricao TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE parceiros (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    telefone TEXT,
    observacoes TEXT
  );

  CREATE TABLE apoios (
    id INTEGER PRIMARY KEY,
    evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    parceiro_id INTEGER NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL
  );

  CREATE TABLE socios (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    endereco TEXT,
    valor_mensal_centavos INTEGER NOT NULL,
    forma TEXT NOT NULL,
    cobrador TEXT,
    inicio TEXT NOT NULL,
    ativo INTEGER NOT NULL DEFAULT 1,
    observacoes TEXT
  );

  CREATE TABLE pagamentos_socios (
    id INTEGER PRIMARY KEY,
    socio_id INTEGER NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
    competencia TEXT NOT NULL,
    valor_centavos INTEGER NOT NULL,
    data_pagamento TEXT NOT NULL,
    UNIQUE (socio_id, competencia)
  );

  CREATE TABLE doacoes (
    id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    doador TEXT,
    tipo TEXT NOT NULL,
    descricao TEXT,
    valor_centavos INTEGER,
    origem TEXT NOT NULL,
    evento_id INTEGER REFERENCES eventos(id) ON DELETE SET NULL
  );

  CREATE INDEX idx_lancamentos_evento ON lancamentos(evento_id);
  CREATE INDEX idx_lancamentos_data ON lancamentos(data);
  CREATE INDEX idx_apoios_evento ON apoios(evento_id);
  CREATE INDEX idx_pagamentos_data ON pagamentos_socios(data_pagamento);
  CREATE INDEX idx_doacoes_data ON doacoes(data);
  CREATE INDEX idx_doacoes_evento ON doacoes(evento_id);
  `,
];

const versaoAtual = db.pragma('user_version', { simple: true });
for (let versao = versaoAtual; versao < migracoes.length; versao++) {
  db.transaction(() => {
    db.exec(migracoes[versao]);
    db.pragma(`user_version = ${versao + 1}`);
  })();
}

export function lerConfiguracao(chave) {
  return db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(chave)?.valor ?? null;
}

export function gravarConfiguracao(chave, valor) {
  db.prepare(
    `INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
     ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor`,
  ).run(chave, valor);
}
