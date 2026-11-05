import { app } from './app.js';
import { definirSenha, senhaDefinida, TAMANHO_MINIMO_SENHA } from './auth.js';

const porta = Number(process.env.PORTA || process.env.PORT) || 3000;
const senhaInicial = process.env.SENHA_INICIAL;

if (!senhaDefinida()) {
  if (senhaInicial && senhaInicial.length >= TAMANHO_MINIMO_SENHA) {
    definirSenha(senhaInicial);
  } else if (senhaInicial || process.env.COOKIE_SEGURO === '1') {
    // Na internet, quem abrisse primeiro a tela de primeiro acesso definiria a senha.
    console.error(`Defina SENHA_INICIAL com pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
    process.exit(1);
  }
}

app.listen(porta, () => {
  console.log(`Núcleo Cuidar rodando em http://localhost:${porta}`);
});
