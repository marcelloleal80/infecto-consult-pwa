# Infecto Consult — PWA MVP 0.8

Versão com popup próprio de instalação.

Quando o navegador considerar o site instalável, o Infecto Consult apresenta automaticamente:
**Instalar Infecto Consult → Instalar aplicativo**

O botão usa o mecanismo oficial `beforeinstallprompt` do navegador para abrir a instalação nativa.

Importante: o navegador controla quando `beforeinstallprompt` é disparado. O site não consegue obrigar o Chrome a mostrar a caixa nativa em qualquer situação. O popup do Infecto Consult é automático assim que o navegador disponibiliza o evento.

## Publicação
Atualize no GitHub os arquivos `index.html`, `manifest.json`, `sw.js` e a pasta `icons/`.
