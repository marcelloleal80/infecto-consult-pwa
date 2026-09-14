const { Client } = require('@notionhq/client')

function richTextToPlain(arr) {
  return Array.isArray(arr)
    ? arr.map(t => t.plain_text || '').join('')
    : ''
}

function getTitle(page) {
  const props = page.properties || {}

  // Primeiro tenta a propriedade do nosso banco
  const named = props['Título']

  if (named?.type === 'title') {
    return richTextToPlain(named.title)
  }

  // Fallback: procura qualquer propriedade do tipo title
  for (const value of Object.values(props)) {
    if (value?.type === 'title') {
      return richTextToPlain(value.title)
    }
  }

  return 'Sem título'
}

function getDescription(page) {
  const props = page.properties || {}

  const property = props['Descrição curta']

  if (property?.type === 'rich_text') {
    return richTextToPlain(property.rich_text)
  }

  const fallback = Object.values(props).find(
    p => p?.type === 'rich_text'
  )

  return fallback
    ? richTextToPlain(fallback.rich_text)
    : ''
}

function getIcon(page) {
  const icon = page.icon

  if (icon?.type === 'emoji') {
    return icon.emoji
  }

  return '🧬'
}

function isPublished(page) {
  const property =
    page.properties?.['Publicar no site']

  return property?.type === 'checkbox'
    ? property.checkbox === true
    : false
}

module.exports = async function handler(req, res) {

  try {

    if (
      !process.env.NOTION_TOKEN ||
      !process.env.NOTION_DATABASE_ID
    ) {

      return res.status(200).json({
        source: 'fallback',
        warning: 'Configure NOTION_TOKEN e NOTION_DATABASE_ID.',
        items: []
      })

    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2025-09-03'
    })

    /*
     * Descobre automaticamente o Data Source
     */

    const database =
      await notion.databases.retrieve({
        database_id:
          process.env.NOTION_DATABASE_ID
      })

    const dataSources =
      database.data_sources || []

    if (!dataSources.length) {
      throw new Error(
        'Nenhum Data Source encontrado.'
      )
    }

    const dataSourceId =
      dataSources[0].id

    /*
     * Consulta as páginas
     */

    const response =
      await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100
      })

    /*
     * Somente páginas marcadas
     * como "Publicar no site"
     */

    const items =
      response.results
        .filter(page =>
          page.object === 'page' &&
          isPublished(page)
        )
        .map(page => ({

          id: page.id,

          title: getTitle(page),

          description:
            getDescription(page),

          icon:
            getIcon(page),

          notionUrl:
            page.url,

          updatedAt:
            page.last_edited_time

        }))

    res.setHeader(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=300'
    )

    return res.status(200).json({

      source: 'notion',

      items

    })

  } catch (error) {

    console.error(
      'Erro Notion:',
      error
    )

    return res.status(500).json({

      error:
        error.message ||
        'Erro ao ler Notion',

      items: []

    })

  }

}
