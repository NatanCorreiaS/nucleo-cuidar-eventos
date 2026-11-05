# Roteiro da demo: Núcleo Cuidar

Duração: cerca de 15 minutos de sistema, mais o tempo da conversa.

**Objetivo:** descobrir se o sistema serve para o dia a dia do núcleo e colher as respostas que faltam.
Não é uma venda. Fale menos do que o sistema faz e pergunte mais como eles trabalham hoje.

## No dia, antes de sair

Rode na pasta `nucleo-cuidar`, com o sistema parado e a pasta `dados/` ainda vazia:

```bash
npm run seed
```

```bash
npm start
```

1. Abra <http://localhost:3000> e crie a senha. Assim a demo já começa no painel.
2. Faça os dados de exemplo no **mesmo mês** da demo. Os valores deste roteiro só batem nesse caso.
3. Deixe o computador carregado e a janela do navegador maximizada.

O sistema **não precisa de internet**. Para ensaiar de novo, pare o sistema, apague a pasta `dados/` e
repita os comandos acima.

### Se for mostrar no celular

1. Conecte o celular e o computador na mesma rede Wi-Fi.
2. Rode `ipconfig` e anote o "Endereço IPv4" da rede em uso. Ignore o da Radmin VPN.
3. No celular, abra `http://ESSE-ENDEREÇO:3000`.

Teste isso no local antes de começar. Se não abrir, siga só no computador e reduza a largura da janela
para mostrar a versão de celular.

## Roteiro

### 1. Abertura (1 min)

> "Isto é um protótipo, feito a partir do que vocês me contaram. Os eventos e os preços são os de vocês,
> mas os nomes de pessoas, os dias e os outros valores são inventados. A ideia é vocês me dizerem o que
> está certo, o que está errado e o que falta."

Deixe claro que podem interromper a qualquer momento.

### 2. Painel (1 min)

**Mostre:** menu **Painel**.

| Onde olhar | Valor esperado |
| --- | --- |
| Arrecadado no mês | R$ 290,00 |
| Sócios | R$ 140,00 |
| Doações em dinheiro | R$ 150,00 |
| Sócios em atraso | 3 (Paulo, Ana e Pedro) |

**Pergunte:** "É isso que a diretoria quer ver ao abrir o sistema? O que mais precisam saber?"

### 3. Eventos que eles reconhecem (2 min)

**Mostre:** menu **Eventos**. Aponte a Ressaca do Forró, a Seresta e a Seresta das Flores. Depois aponte
o **Caruru** e o **Festival de Tortas**, marcados como cancelados e sem data.

> "Vocês me contaram que as datas não são fixas e que alguns eventos não aconteceram. Por isso a data é
> opcional e o evento pode ficar como cancelado."

Abra a **Seresta**: receitas R$ 3.000,00, despesas R$ 1.450,00, resultado **R$ 1.550,00**.

**Pergunte:** "Hoje vocês sabem quanto cada evento deu de resultado? Onde anotam isso?"

### 4. Lançar um evento ao vivo (3 min)

**Mostre:** abra **Seresta de fim de ano (exemplo)** e faça, nesta ordem:

1. Em **Ingressos vendidos**, digite `40` e clique em **Lançar ingressos**. Receitas: R$ 2.400,00.
2. No formulário abaixo, escolha **Despesa**, escreva `Aluguel do som`, valor `300,00`, e clique em
   **Lançar**. Resultado: **R$ 2.100,00**.
3. Em **Parceiros e patrocinadores**, escolha **Mercadinho Exemplo**, escreva `10 caixas de refrigerante`
   e clique em **Registrar apoio**.

**Pergunte:**

- "Quem vende os ingressos? Precisam saber quantos ficaram com cada pessoa?"
- "O que os patrocinadores costumam dar? Precisam agradecer ou prestar contas a eles?"

### 5. Sócios e mensalidades (3 min)

Esta costuma ser a parte de maior valor, então dê tempo a ela.

**Mostre:** menu **Mensalidades**. Previsto R$ 265,00, recebido R$ 140,00, faltam 5.

1. Clique no filtro **Carlos Exemplo**: aparece a lista desse cobrador. Volte para **Todos**.
2. Em **João Exemplo**, clique em **Marcar pago**. Recebido: **R$ 190,00**, faltam 4.
3. Abra o menu **Sócios**, clique em **Em atraso** e abra **Paulo Exemplo**: três meses em atraso.

**Pergunte:**

- "Quantos sócios e quantos cobradores existem hoje?"
- "Como o cobrador presta contas? Ele usaria isto no celular, na rua?"
- "Quem paga por Pix: como vocês ficam sabendo?"
- "O sócio recebe algum recibo?"

### 6. Doações (2 min)

**Mostre:** abra o evento **Festival de Dança** e clique em **Registrar doação**.

1. Em **Tipo**, escolha **Alimentos**. Em **Descrição**, escreva `20 kg de arroz`. Clique em **Salvar**.
2. A doação aparece no evento e o resultado continua em **R$ 180,00**: alimentos são registrados, mas
   não contam como dinheiro.

Mostre também a lista de **Origem**: Correios, Bazar e Nota Premiada Bahia.

**Pergunte:** "Vocês precisam saber o total de alimentos arrecadado? O dinheiro da Nota Premiada entra
como? As fantasias são alugadas ou vendidas?"

### 7. Volta ao painel, planilha e backup (2 min)

**Mostre:** menu **Painel**. Arrecadado no mês agora é **R$ 2.740,00** e as despesas são R$ 300,00.

> "Tudo o que lançamos já aparece aqui."

Em **Conta e backup**, baixe a planilha de **Eventos** e mostre o botão de cópia de segurança.

**Pergunte:** "Para quem vocês prestam contas, e em que formato?"

### 8. Fechamento (1 min)

- "O que mais ajudaria vocês? O que aqui não serve?"
- "Quem usaria o sistema no dia a dia? Teriam alguém para fazer a cópia de segurança toda semana?"
- Combine o próximo contato.

## Peça antes de sair

- [ ] Planilhas ou cadernos atuais, principalmente a **lista de sócios**
- [ ] Logo original em alta qualidade
- [ ] Nome e contato de quem vai cuidar do sistema
- [ ] Aviso dado: `nucleocuidar.org.br` está fora do ar

## Se perguntarem

| Pergunta | Resposta honesta |
| --- | --- |
| "Dá para usar de qualquer lugar?" | Ainda não. Hoje funciona na rede local. Colocar na internet é possível e depende do que for combinado sobre hospedagem. |
| "Quanto custa manter?" | Depende da hospedagem. Em um computador da instituição, não há mensalidade. Na internet, há um custo mensal a confirmar. |
| "Dá para receber Pix ou vender ingresso pelo sistema?" | Não. O sistema registra o que foi recebido, mas não faz cobrança. |
| "Cada pessoa tem o próprio login?" | Ainda não. Hoje há uma senha só, que dá acesso a tudo. Dá para acrescentar. |
| "E o bazar, a rifa, os ingressos por vendedor?" | Ficaram para a próxima fase. Ajude a escolher qual vem primeiro. |
| "Os dados estão seguros?" | Ficam no computador onde o sistema roda, protegidos por senha. Por isso a cópia de segurança é essencial. |
| "Quando fica pronto?" | Não prometa data na hora. Combine depois de reunir os pedidos. |

## Folha de respostas

| Pergunta | Resposta |
| --- | --- |
| Quantos sócios existem? | |
| Quantos cobradores existem? | |
| O cobrador usaria o sistema na rua? | |
| Quem vai usar, e em qual aparelho? | |
| Como é o controle hoje? | |
| Para quem prestam contas? | |
| Fantasias: alugadas ou vendidas? | |
| Quem faria a cópia de segurança? | |
| O que mais pediram? | |
| Qual a prioridade da próxima fase? | |

## Depois da demo

Pare o sistema e apague a pasta `dados/`. Os dados reais começam em um banco limpo, sem a faixa de
demonstração.
