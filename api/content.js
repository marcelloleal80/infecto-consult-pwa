const { Client } = require('@notionhq/client')

function plain(arr) {
  return Array.isArray(arr) ? arr.map(x => x.plain_text || '').join('') : ''
}

function propText(p) {
  if (!p) return ''
  if (p.type === 'title') return plain(p.title)
  if (p.type === 'rich_text') return plain(p.rich_text)
  if (p.type === 'select') return p.select?.name || ''
  if (p.type === 'status') return p.status?.name || ''
  if (p.type === 'url') return p.url || ''
  if (p.type === 'checkbox') return !!p.checkbox
  if (p.type === 'multi_select') return (p.multi_select || []).map(x => x.name)
  return ''
}

function pageTitle(page) {
  const p = Object.values(page.properties || {}).find(x => x?.type === 'title')
  return propText(p) || 'Sem título'
}

function pageIcon(page) {
  if (page.icon?.type === 'emoji') return page.icon.emoji
  return '🧬'
}

function getDataSourceId(database) {
  return database.data_sources?.[0]?.id || process.env.NOTION_DATABASE_ID
}

module.exports = async function handler(req, res) {
  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      return res.status(200).json({ source: 'fallback', warning: 'Configure NOTION_TOKEN e NOTION_DATABASE_ID no Vercel.', items: [] })
    }

    const notion = new Client({ auth: process.env.NOTION_TOKEN, notionVersion: '2025-09-03' })
    const db = await notion.databases.retrieve({ database_id: process.env.NOTION_DATABASE_ID })
    const dataSourceId = getDataSourceId(db)

    let results = []
    let cursor
    do {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {})
      })
      results.push(...response.results)
      cursor = response.has_more ? response.next_cursor : null
    } while (cursor)

    const items = results
      .filter(page => page.object === 'page')
      .filter(page => page.properties?.['Publicar no site']?.checkbox === true)
      .map(page => ({
        id: page.id,
        title: pageTitle(page),
        description: propText(page.properties?.['Descrição curta']),
        icon: pageIcon(page),
        category: propText(page.properties?.['Categoria']),
        level: propText(page.properties?.['Nível de página']),
        miniApps: propText(page.properties?.['MiniApps usados']),
        extraTabs: propText(page.properties?.['Abas adicionais']),
        premium: !!page.properties?.['Página premium']?.checkbox,
        notionUrl: page.url,
        updatedAt: page.last_edited_time
      }))

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({ source: 'notion', items })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message || 'Erro ao ler Notion', items: [] })
  }
}
