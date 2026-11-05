// Uso: npm run redefinir-senha -- "nova senha"
// Para quem esqueceu a senha e tem acesso ao computador onde o sistema roda.
import { definirSenha, TAMANHO_MINIMO_SENHA } from '../src/auth.js';

const senha = process.argv[2];

if (!senha || senha.length < TAMANHO_MINIMO_SENHA) {
  console.error(`Informe a nova senha, com pelo menos ${TAMANHO_MINIMO_SENHA} caracteres:`);
  console.error('  npm run redefinir-senha -- "nova senha"');
  process.exit(1);
}

definirSenha(senha);
console.log('Senha redefinida.');
