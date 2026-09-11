# Infecto Consult — PWA MVP 0.6

## O que está nesta versão
- Página inicial do Infecto Consult
- Módulo Pneumonia
- Módulo Pielonefrite Aguda
- Manifest PWA
- Service Worker
- Ícones PNG 192x192 e 512x512
- Botão de instalação quando o navegador oferecer a instalação
- Estrutura modular para adicionar novos conteúdos

## Publicar no GitHub Pages
1. Crie um repositório no GitHub (ex.: `infecto-consult`).
2. Extraia este ZIP.
3. Envie **o conteúdo da pasta** para a raiz do repositório. O arquivo `index.html` precisa ficar na raiz.
4. No GitHub: **Settings → Pages**.
5. Em **Build and deployment**, selecione **Deploy from a branch**.
6. Selecione a branch `main` e a pasta `/ (root)`.
7. Salve e aguarde a publicação.
8. Abra a URL informada pelo GitHub Pages.

Depois, teste:
- página inicial
- Pneumonia
- Pielonefrite
- atualização após novo commit
- instalação pelo navegador/celular

## Próxima evolução
Separar definitivamente o conteúdo clínico em arquivos de dados (JSON/Markdown) e deixar o HTML como "motor" do aplicativo. Assim, incluir uma nova síndrome não exige reconstruir toda a interface.
