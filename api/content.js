const { Client } = require('@notionhq/client')

function richTextToPlain(arr) {
  return Array.isArray(arr)
    ? arr.map(t => t.plain_text || '').join('')
    : ''
}

function firstPropertyOfType(properties, type) {
  return Object.entries(properties || {})
    .find(([, value]) => value && value.type === type)
}

function pageTitle(page) {
  const found = firstPropertyOfType(page.properties, 'title')
  if (!found) return 'Sem título'

  return richTextToPlain(found[1].title)
}

function pageDescription(page) {
  const props = page.properties || {}

  const candidates = [
    'Resumo',
    'Descrição',
    'Description',
    'Summary',
    'Subtítulo'
  ]

  for (const name of candidates) {
    const p = props[name]

    if (!p) continue

    if (p.type === 'rich_text') {
      return richTextToPlain(p.rich_text)
    }

    if (p.type === 'select') {
      return p.select?.name || ''
    }

    if (p.type === 'status') {
      return p.status?.name || ''
    }
  }

  const rich = firstPropertyOfType(props, 'rich_text')

  return rich
    ? richTextToPlain(rich[1].rich_text)
    : ''
}

function pageIcon(page) {
  const icon = page.icon

  if (icon?.type === 'emoji') {
    return icon.emoji
  }

  return '🧬'
}

module.exports = async function handler(req, res) {
  try {
    if (
      !process.env.NOTION_TOKEN ||
      !process.env.NOTION_DATABASE_ID
    ) {
      return res.status(200).json({
        source: 'fallback',
        warning:
          'Configure NOTION_TOKEN e NOTION_DATABASE_ID no Vercel.',
        items: []
      })
    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: '2025-09-03'
    })

    // 1. Recupera o Database
    const database = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    })

    // 2. Descobre automaticamente o Data Source
    const dataSources = database.data_sources || []

    if (!dataSources.length) {
      throw new Error(
        'Nenhum Data Source encontrado dentro do Database do Notion.'
      )
    }

    const dataSourceId = dataSources[0].id

    // 3. Consulta as páginas/conteúdos
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      page_size: 100
    })

    // 4. Converte os resultados para o formato da PWA
    const items = response.results
      .filter(page => page.object === 'page')
      .map(page => ({
        id: page.id,
        title: pageTitle(page),
        description: pageDescription(page),
        icon: pageIcon(page),
        notionUrl: page.url,
        updatedAt: page.last_edited_time
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
    console.error('Erro Notion:', error)

    return res.status(500).json({
      error: error.message || 'Erro ao ler Notion',
      items: []
    })
  }
}
