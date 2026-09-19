const { Client } = require('@notionhq/client')

module.exports = async function handler(req, res) {
  try {
    const blockId = req.query?.blockId

    if (!blockId) {
      return res
        .status(400)
        .send('Informe ?blockId=BLOCK_ID')
    }

    if (!process.env.NOTION_TOKEN) {
      return res
        .status(500)
        .send('NOTION_TOKEN não configurado.')
    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2025-09-03'
    })

    /*
     * Recupera o bloco de arquivo diretamente do Notion
     */
    const block = await notion.blocks.retrieve({
      block_id: blockId
    })

    /*
     * Verifica se realmente é um arquivo
     */
    if (block.type !== 'file') {
      return res
        .status(400)
        .send('O bloco informado não é um arquivo do Notion.')
    }

    const file = block.file || {}

    /*
     * O Notion pode fornecer:
     *
     * 1. arquivo hospedado pelo próprio Notion
     * 2. arquivo externo
     */

    const fileUrl =
      file.type === 'external'
        ? file.external?.url
        : file.file?.url

    if (!fileUrl) {
      return res
        .status(404)
        .send('Não foi encontrada uma URL válida para o arquivo.')
    }

    /*
     * Busca o HTML usando a URL temporária fornecida
     * pelo Notion.
     */

    const response = await fetch(fileUrl)

    if (!response.ok) {
      return res
        .status(502)
        .send(
          `Não foi possível baixar o arquivo do Notion. HTTP ${response.status}`
        )
    }

    const html = await response.text()

    if (!html || !html.trim()) {
      return res
        .status(404)
        .send('O arquivo HTML está vazio.')
    }

    /*
     * Confirmação simples de que o arquivo parece ser HTML.
     */

    const looksLikeHtml =
      /<!doctype\s+html/i.test(html) ||
      /<html[\s>]/i.test(html) ||
      /<body[\s>]/i.test(html)

    if (!looksLikeHtml) {
      return res
        .status(400)
        .send('O arquivo encontrado não parece ser um HTML válido.')
    }

    /*
     * Entrega o HTML para o navegador.
     */

    res.setHeader(
      'Content-Type',
      'text/html; charset=utf-8'
    )

    /*
     * Não manter cache longo porque o arquivo do Notion
     * pode ser substituído/atualizado.
     */

    res.setHeader(
      'Cache-Control',
      'no-store'
    )

    return res
      .status(200)
      .send(html)

  } catch (error) {

    console.error(error)

    return res
      .status(500)
      .send(
        error.message ||
        'Erro ao carregar MiniApp do Notion.'
      )
  }
}
