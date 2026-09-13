# Ajuste concreto aplicado: Notion → PWA atual

Este ZIP é o seu projeto atual, preservando os arquivos estáticos existentes, com uma ponte simples para buscar conteúdo do Notion quando publicado na Vercel.

## O que foi adicionado

- `api/content.js`: rota serverless da Vercel que lê um banco do Notion.
- `package.json`: adiciona a dependência `@notionhq/client`.
- `.env.example`: mostra as variáveis necessárias.
- `index.html`: passa a tentar carregar `/api/content` e cria uma seção “Conteúdos vindos do Notion”.

## Como publicar

1. Descompacte este ZIP.
2. Substitua os arquivos no seu repositório GitHub atual por estes arquivos.
3. No Notion, crie uma integração interna.
4. Compartilhe o banco editorial com essa integração.
5. Na Vercel, abra o projeto e vá em Settings → Environment Variables.
6. Adicione:
   - `NOTION_TOKEN`: token da integração do Notion.
   - `NOTION_DATABASE_ID`: ID do banco editorial.
7. Faça commit/push no GitHub.
8. A Vercel deve redeployar automaticamente.

## Observação importante

Este ajuste mantém seu PWA simples. Ele não transforma todo o projeto em Next.js. A Vercel continua servindo os HTMLs estáticos, mas ganha uma rota `/api/content` para conversar com o Notion com segurança, sem expor o token no navegador.
