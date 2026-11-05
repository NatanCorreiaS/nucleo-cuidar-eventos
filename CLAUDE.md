# Núcleo Cuidar: contexto do projeto

Sistema de gestão de eventos e captação de recursos para o Núcleo Cuidar de Itabuna-BA.
Estrutura do código, comandos, convenções e regras de negócio estão no [README.md](README.md).
Este arquivo guarda só o que não dá para descobrir lendo o código.

## Contexto

- **Instituição:** APOSDEN (Associação de Pais e Portadores das Síndromes Deficitárias Neurológicas) /
  Núcleo Cuidar, CNPJ 07.474.504/0001-92. Slogan: "Quem ama cuida!".
- **Pedido:** protótipo em 1 semana, em Node, de manutenção fácil. Quem vai manter e hospedar é o próprio
  núcleo, então prefira a solução simples: sem etapa de build, sem serviços externos, código e tabelas
  em português.
- **Origem dos requisitos:** uma conversa de WhatsApp com o núcleo. Não houve levantamento formal.

## O que o núcleo contou

- Datas e preços variam conforme os patrocinadores: Seresta (R$ 60, agosto), Ressaca do Forró (R$ 30,
  julho), Seresta das Flores (R$ 60, setembro).
- O Caruru foi cancelado por falta de ingredientes. O Festival de Tortas e a rifa não foram realizados.
- Participa de eventos de terceiros, como o Festival de Dança dos professores Alessandro e Roberta, no
  Centro de Cultura, arrecadando alimentos.
- Outras fontes: bazar de usados e fantasias, sócios sustentadores (Pix ou cobrador), doações pelos
  Correios e Nota Premiada Bahia.

Por isso a data do evento é opcional e existe o status cancelado. Todos os outros nomes e valores do
seed são fictícios.

## Decisões

- **Fora do protótipo:** ingressos por vendedor, bazar, rifa, relatórios avançados, login por pessoa e
  página pública. A prioridade deve vir da conversa com o núcleo.
- **Banco em arquivo único:** o modo de journal padrão do SQLite foi mantido para o backup ser só copiar um
  arquivo.
- **Data padrão do lançamento:** em evento futuro é a de hoje, para a venda antecipada contar no painel do mês.
- **Render descartado para o teste:** no plano grátis, o SQLite é apagado cada vez que o serviço dorme,
  após 15 minutos sem acesso. Também exigiria Git e contas no GitHub e no Render.

## Identidade visual

- O logo veio do site oficial (Wix). `nucleocuidar.org.br` estava fora do ar ("domínio não conectado"),
  então a referência foi uma captura do Internet Archive de fevereiro de 2026 e o blog da instituição.
- Cores medidas no logo: azul `#3C3C98`, amarelo `#FCF018`, vermelho `#F03030`. O verde de "positivo" não vem
  do logo. Não foi encontrado manual de marca nem fonte oficial.
- **`nucleocuidar.com.br` é outra organização** (clínica de saúde da mulher em São Paulo). Não use.

## Situação em 2026-11-04

**Arquivos perdidos.** Por volta das 21:22 de 2026-11-01, algo fora desta conversa removeu arquivos. A
causa é desconhecida, nada foi encontrado na Lixeira e o projeto não tem Git. Se voltar a acontecer,
confira `docs/` e `node_modules` primeiro.

- `docs/roteiro-demo.md`: recriado em 2026-11-04 com o texto idêntico ao que estava na conversa.
- `node_modules`: reinstalado com `npm ci` em 2026-11-04.
- Os outros projetos que ficavam na pasta `Projeto Padrão` (apps de Warframe, sem relação com este):
  **continuam perdidos**. Não há cópia do conteúdo deles aqui.

**Testes.** Os 16 passam após a reinstalação (2026-11-04).

**Publicação de teste.** Fora do ar. O túnel da Cloudflare parou quando a sessão terminou, e o link antigo
não vale mais. Um novo terá outro endereço. O `cloudflared` não está instalado no PATH; o passo a passo está
no README. A senha fica em `senha-teste.txt`, fora do Git: não a repita em respostas.

**Nunca testado.** Abrir pelo celular de verdade, abrir o CSV no Excel real e entrar com a senha certa pelo
endereço público.

**Git.** Repositório iniciado em 2026-11-05 (branch `main`, primeiro commit `f55b2e0`). O `.gitignore` exclui `node_modules/`, `dados/`, `.env*`, `*.log` e `senha-teste.txt`. Ainda sem remoto.

**Sem resposta do núcleo.** Número de sócios e cobradores, se o cobrador usaria o sistema na rua, quem vai
usar e em qual aparelho, como é o controle hoje, para quem prestam contas, se as fantasias são alugadas ou
vendidas, quem faria o backup. Não há registro de que a demo tenha acontecido.

## Cuidados

- Sem HTTPS próprio, backup automático e login por pessoa, o sistema não está pronto para dados reais na
  internet. Hoje a senha é única e dá acesso a tudo.
- No PowerShell, use `npm.cmd`.
- Mantenha este arquivo atualizado quando a situação mudar.
