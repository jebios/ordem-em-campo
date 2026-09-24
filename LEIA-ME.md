# Ordem em Campo — app para autônomos (versão 1.1)

App que funciona no navegador do celular e **pode ser instalado na tela inicial**. Depois de aberto uma vez, funciona **sem internet**. Todos os dados ficam guardados no próprio aparelho.

## O que ele faz

- **Orçamento rápido**: escolha o cliente, toque nos serviços e materiais do catálogo, ajuste quantidade e pronto. Envio pelo WhatsApp com os itens e o total, e PDF com a sua logo.
- **Aprovou? Vira OS** com um toque, com os itens copiados.
- **Ordem de serviço**: situação (pendente, agendada, em andamento, aguardando peça, concluída), data e hora, endereço, GPS, fotos de antes e depois, laudo técnico e assinatura do cliente na tela.
- **Concluir serviço**: dá baixa dos materiais no estoque (só uma vez, mesmo que a OS seja reaberta) e cria a cobrança sozinho.
- **Cobrança com Pix**: gera QR Code e Pix copia e cola **sem internet** (padrão do Banco Central) e envia pelo WhatsApp. Há também um botão para enviar só o código Pix como segunda mensagem. Marca como paga e emite recibo.
- **Estoque e catálogo**: materiais com estoque mínimo e alerta, entradas, saídas, ajuste de contagem e histórico. Serviços com preço padrão.
- **Clientes**: cadastro (pode puxar dos contatos do Android), histórico de OS e orçamentos, quanto já pagou e quanto deve.
- **Backup**: envia um arquivo para o Drive, WhatsApp ou e-mail, e restaura em outro celular.
- Tema claro, escuro ou automático, com botões grandes e alto contraste.
- **Agenda** (em *Mais › Agenda*): lista os atendimentos agendados agrupados por dia, com os atrasados em destaque. Tem dois jeitos de lembrar do horário:
  - **Notificação no celular**: avisa na tela com o tempo de antecedência que você escolher (no horário, 15 min, 30 min, 1h, 2h ou 1 dia antes). Só funciona enquanto o app estiver aberto ou rodando em segundo plano no aparelho — se o app ficar fechado por muito tempo, o aviso não dispara, porque este é um app sem servidor.
  - **Exportar para o Calendário do celular** (botão na Agenda, ou dentro de cada OS): gera um arquivo que abre no Google Agenda, Apple Calendário etc. Esse aviso vem do próprio sistema do celular e funciona **mesmo com o app fechado** — é a forma mais garantida de não perder um horário.

## Como publicar (grátis) para usar no celular

Para instalar e funcionar offline, o app precisa estar num endereço **https**. Duas opções gratuitas:

**Netlify (mais fácil)**
1. Crie uma conta grátis em netlify.com.
2. Em *Sites › Add new site › Deploy manually*, arraste a pasta `ordem-em-campo` inteira.
3. Ele gera um endereço como `https://seu-nome.netlify.app`. Pode renomear.

**GitHub Pages**
1. Crie um repositório público no GitHub e envie os arquivos da pasta.
2. Em *Settings › Pages*, escolha a branch `main` e a pasta raiz.
3. O endereço fica `https://seu-usuario.github.io/nome-do-repositorio/`.

## Como instalar no celular

- **Android (Chrome)**: abra o endereço, toque no menu ⋮ e depois em *Instalar app* (ou *Adicionar à tela inicial*). Também dá para instalar em *Mais › Instalar na tela inicial* dentro do app.
- **iPhone (Safari)**: abra o endereço, toque em *Compartilhar* e depois em *Adicionar à Tela de Início*.

Depois de instalado, abra o app **uma vez com internet**. A partir daí ele abre e funciona mesmo sem sinal.

## Sem internet: o que funciona

| Função | Offline |
|---|---|
| Cadastrar clientes, orçamentos, OS, estoque, cobranças | Sim |
| Fotos, assinatura, laudo | Sim |
| GPS (o celular usa satélite) | Sim, melhor em área aberta |
| Gerar Pix copia e cola e QR Code | Sim |
| Enviar pelo WhatsApp | Abre o WhatsApp com a mensagem pronta. A mensagem sai quando o sinal voltar |
| PDF (Salvar como PDF) | Sim |
| Abrir localização no mapa | Precisa de internet |

## Cuidados importantes

- **Os dados ficam só no celular.** Se o aparelho quebrar, só o backup recupera. Faça backup toda semana em *Mais › Backup e dados*. O app avisa na tela inicial quando passar de 7 dias.
- **Não limpe os dados do navegador** para esse site: isso apaga tudo.
- **Teste sua chave Pix** em *Mais › Meus dados*: há um QR de R$ 1,00 para ler com o app do seu banco. Confira se aparecem seu nome e o valor.
- O WhatsApp só aceita **texto** pelo link. Para mandar o PDF, toque em *Salvar PDF*, salve o arquivo e compartilhe no WhatsApp.

## Arquivos

- `index.html`: telas e visual
- `app.js`: funcionamento (banco local, Pix, WhatsApp, estoque)
- `sw.js`: guarda o app no celular para abrir sem internet
- `manifest.webmanifest` e ícones: instalação na tela inicial
- `qrcode.min.js`: gerador de QR Code (biblioteca livre, licença MIT)

Para atualizar o app depois de alguma mudança, troque o número em `CACHE` no `sw.js` (ex.: `v1.0.1`) e publique de novo. O app mostra “Nova versão disponível”.
