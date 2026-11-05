# Núcleo Cuidar: gestão de eventos e captação de recursos

Protótipo para o Núcleo Cuidar de Itabuna-BA. Controla eventos, parceiros, sócios sustentadores e doações.

## O que o protótipo faz

- **Eventos:** data opcional, tipo, valor do ingresso e status (planejado, realizado ou cancelado).
- **Financeiro por evento:** receitas, despesas, lançamento rápido de ingressos e resultado calculado.
- **Parceiros e patrocinadores:** cadastro e registro do que cada um contribuiu em cada evento.
- **Sócios sustentadores:** valor mensal, Pix ou cobrador, mensalidades do mês e lista de atrasos.
- **Doações:** dinheiro, alimentos ou itens, com origem (evento, Correios, bazar, Nota Premiada, etc.).
- **Painel:** arrecadado no mês, próximos eventos e sócios em atraso.
- **Planilhas e backup:** exportação CSV (abre no Excel) e download de uma cópia do banco.

Ficaram para depois: controle de ingressos por vendedor, bazar, rifa, relatórios avançados, vários
usuários com permissões diferentes e página pública.

## Como rodar

Requer [Node.js](https://nodejs.org) 20 ou superior.

```bash
npm install
```

```bash
npm start
```

Abra <http://localhost:3000>. No primeiro acesso, o sistema pede para criar a senha.

Para outro aparelho da mesma rede (um celular, por exemplo), use o IP do computador no lugar de
`localhost`, como `http://192.168.0.10:3000`.

### Dados de demonstração

Com o banco vazio, antes de cadastrar eventos:

```bash
npm run seed
```

Os eventos e preços de ingresso vêm da conversa com o núcleo; nomes de pessoas, dias e os demais
valores são fictícios. Uma faixa avisa disso em todas as telas. O passo a passo para apresentar o
sistema está em [docs/roteiro-demo.md](docs/roteiro-demo.md).

Para começar do zero com os dados reais, pare o sistema e apague a pasta `dados/`. **Isso apaga tudo,
inclusive a senha.**

## Backup e restauração

Todos os dados ficam em um único arquivo: `dados/nucleo.db`.

- **Fazer backup:** menu **Conta e backup** > **Baixar cópia de segurança**. Guarde a cópia fora do computador.
- **Restaurar:** pare o sistema, substitua `dados/nucleo.db` pela cópia, renomeando-a para `nucleo.db`, e inicie de novo.

## Esqueci a senha

No computador onde o sistema roda:

```bash
npm run redefinir-senha -- "nova senha"
```

## Configuração

Todas as variáveis são opcionais.

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `PORTA` | `3000` | Porta do servidor (também aceita `PORT`) |
| `ARQUIVO_BANCO` | `dados/nucleo.db` | Caminho do banco de dados |
| `COOKIE_SEGURO` | desligado | Use `1` quando publicar com HTTPS. Exige senha já criada ou `SENHA_INICIAL` |
| `SENHA_INICIAL` | vazio | Senha criada ao iniciar, se o banco ainda não tiver uma |

## Publicar para teste

Para colegas testarem com dados de exemplo, o sistema pode rodar neste computador e ser exposto por um
[Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), gratuito e
sem conta. Em um terminal PowerShell:

```powershell
$env:ARQUIVO_BANCO = "$env:TEMP\nucleo-teste.db"; npm run seed
$env:PORTA = "3100"; $env:COOKIE_SEGURO = "1"; $env:SENHA_INICIAL = "uma senha longa"; npm start
```

Em outro terminal:

```powershell
cloudflared tunnel --url http://localhost:3100
```

O endereço aparece no terminal do `cloudflared` e muda a cada vez. Ele só funciona com o computador
ligado e os dois terminais abertos. **Não coloque dados reais:** a senha é única e dá acesso a tudo.

## Antes de usar na internet com dados reais

O teste acima não serve para o uso real. Para isso, falta pelo menos:

1. Hospedar em um servidor próprio, com HTTPS e `COOKIE_SEGURO=1`.
2. Automatizar o backup.
3. Criar um login para cada pessoa.
4. Revisar quais dados pessoais de doadores são realmente necessários (LGPD).

Já existe limite de tentativas de senha: 10 erros por endereço bloqueiam o login por 15 minutos.

## Para quem vai dar manutenção

Stack: Node.js, Express, EJS e SQLite (`better-sqlite3`). Não há etapa de build.

```
src/
  servidor.js    inicia o servidor
  app.js         configuração do Express e ordem das rotas
  banco.js       conexão e estrutura do banco (migrações)
  auth.js        senha e sessão
  opcoes.js      listas fixas dos formulários (tipos, status, origens)
  formato.js     dinheiro, datas e meses
  consultas.js   consultas usadas em mais de uma tela
  rotas/         uma rota por módulo
views/           telas (uma pasta por módulo)
public/          CSS
scripts/         dados de demonstração e redefinição de senha
test/            testes
```

Identidade visual: logo e slogan ("Quem ama cuida!") vêm do site oficial da instituição. As cores
ficam no início de `public/estilo.css` e o logo em `public/logo.png`. Se o núcleo enviar uma versão
em melhor qualidade, basta substituir esse arquivo.

Convenções:

- Dinheiro é guardado em **centavos** (inteiro), datas como `AAAA-MM-DD` e meses como `AAAA-MM`.
- Para mudar a estrutura do banco, **acrescente** um item ao fim de `migracoes` em `src/banco.js`, sem
  alterar os anteriores. Ele roda sozinho ao iniciar o sistema.
- Para acrescentar uma opção de tipo ou origem, edite `src/opcoes.js`.

Comandos para desenvolvimento:

```bash
npm run dev
```

```bash
npm test
```

### Regras de negócio

- **Resultado do evento** = receitas + doações em dinheiro vinculadas ao evento − despesas.
- **Apoios** de parceiros não entram no resultado. Dinheiro recebido deve ser lançado como receita.
- **Atraso de sócio:** mês já encerrado, a partir do mês de início, sem pagamento. O mês corrente
  aparece como pendente, não como atraso. Sócios inativos não geram atraso.
- **Arrecadado no mês** usa a data em que o dinheiro entrou, não o mês de referência da mensalidade.
