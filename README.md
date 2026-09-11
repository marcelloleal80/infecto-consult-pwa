# Infecto Consult — PWA MVP 0.8

Estrutura simplificada para o GitHub Pages.

Arquivos que devem ficar na raiz:
- index.html
- manifest.json
- sw.js
- icon-192.png
- icon-512.png
- icon.svg
- pneumonia.html
- pielonefrite.html

O `index.html` apresenta automaticamente o popup de instalação quando o navegador disponibiliza o evento PWA `beforeinstallprompt`.

Importante: o navegador controla quando a instalação nativa pode ser oferecida. O site não pode obrigar o Chrome a abrir a janela nativa em qualquer circunstância.
