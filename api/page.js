const { Client } = require('@notionhq/client')

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]))

const rich = arr => (arr || []).map(x => {
  let s = esc(x.plain_text || '').replace(/\n/g, '<br>')

  const a = x.annotations || {}

  if (a.code) s = `<code>${s}</code>`
  if (a.bold) s = `<strong>${s}</strong>`
  if (a.italic) s = `<em>${s}</em>`
  if (a.strikethrough) s = `<del>${s}</del>`
  if (a.underline) s = `<u>${s}</u>`

  if (x.href) {
    s = `<a href="${esc(x.href)}" target="_blank" rel="noopener noreferrer">${s}</a>`
  }

  return s
}).join('')


async function allChildren(notion, blockId) {
  const out = []
  let cursor

  do {
    const r = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {})
    })

    out.push(...r.results)
    cursor = r.has_more ? r.next_cursor : null

  } while (cursor)

  return out
}


function textOf(block) {
  const data = block[block.type]

  return rich(
    data?.rich_text ||
    data?.caption ||
    []
  )
}


function headingText(block) {
  const data = block[block.type]

  return (data?.rich_text || [])
    .map(x => x.plain_text || '')
    .join('')
    .trim()
}


function plainTextOf(arr) {
  return (arr || [])
    .map(x => x.plain_text || '')
    .join('')
    .trim()
}


function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}


/*
 * Detecta automaticamente arquivos HTML
 * anexados diretamente à página do Notion.
 *
 * Isso elimina a necessidade de colocar
 * cada MiniApp no GitHub.
 */
function detectMiniApps(blocks) {

  return (blocks || [])
    .filter(block => block.type === 'file')
    .map(block => {

      const d = block.file || {}

      const name =
        d.name ||
        plainTextOf(d.caption) ||
        ''

      const url =
        d.type === 'external'
          ? d.external?.url
          : d.file?.url

      const isHtml =
        /\.html?(\?|$)/i.test(name) ||
        /\.html?(\?|$)/i.test(url || '')

      if (!isHtml) return null

      return {
        id: block.id,
        name: name || 'Decisor clínico',
        url: `/api/miniapp?blockId=${encodeURIComponent(block.id)}`
      }

    })
    .filter(Boolean)
}


async function renderBlock(notion, block, depth = 0) {

  const type = block.type
  const d = block[type] || {}

  let inner = ''

  if (block.has_children) {

    const children = await allChildren(
      notion,
      block.id
    )

    inner = (
      await Promise.all(
        children.map(c =>
          renderBlock(
            notion,
            c,
            depth + 1
          )
        )
      )
    ).join('')
  }


  switch (type) {

    case 'paragraph':

      return d.rich_text?.length
        ? `<p>${rich(d.rich_text)}</p>`
        : '<div class="spacer"></div>'


    case 'heading_1':

      return `<h2>${textOf(block)}</h2>${inner}`


    case 'heading_2':

      return `<h3>${textOf(block)}</h3>${inner}`


    case 'heading_3':

      return `<h4>${textOf(block)}</h4>${inner}`


    case 'bulleted_list_item':

      return `<li>${textOf(block)}${
        inner
          ? `<div class="nested-list">${inner}</div>`
          : ''
      }</li>`


    case 'numbered_list_item':

      return `<li>${textOf(block)}${
        inner
          ? `<div class="nested-list">${inner}</div>`
          : ''
      }</li>`


    case 'quote':

      return `<blockquote>${textOf(block)}${inner}</blockquote>`


    case 'callout':

      return `
        <aside class="callout">
          <div class="callout-icon">
            ${esc(d.icon?.emoji || '💡')}
          </div>
          <div>
            ${rich(d.rich_text || [])}
            ${inner}
          </div>
        </aside>
      `


    case 'to_do':

      return `
        <label class="todo">
          <input
            type="checkbox"
            disabled
            ${d.checked ? 'checked' : ''}
          >
          ${textOf(block)}
          ${inner}
        </label>
      `


    case 'toggle':

      return `
        <details>
          <summary>${textOf(block)}</summary>
          ${inner}
        </details>
      `


    case 'divider':

      return '<hr>'


    case 'code':

      return `
        <pre>
          <code>${esc(
            (d.rich_text || [])
              .map(x => x.plain_text || '')
              .join('')
          )}</code>
        </pre>
      `


    case 'equation':

      return `
        <div class="equation">
          ${esc(d.expression || '')}
        </div>
      `


    case 'bookmark':

      return `
        <p class="embed-link">
          <a
            href="${esc(d.url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${esc(
              d.caption?.map(x => x.plain_text || '').join('') ||
              d.url ||
              'Abrir link'
            )}
          </a>
        </p>
      `


    case 'link_preview':

      return `
        <p class="embed-link">
          <a
            href="${esc(d.url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir recurso externo
          </a>
        </p>
      `


    case 'embed':

      return `
        <div class="external-embed">
          <a
            href="${esc(d.url)}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir conteúdo incorporado
          </a>
        </div>
      `


    case 'video': {

      const src =
        d.type === 'external'
          ? d.external?.url
          : d.file?.url

      return `
        <div class="media">
          <a
            href="${esc(src || '#')}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ▶ Abrir vídeo
          </a>
        </div>
      `
    }


    case 'audio': {

      const src =
        d.type === 'external'
          ? d.external?.url
          : d.file?.url

      return `
        <div class="media">
          <a
            href="${esc(src || '#')}"
            target="_blank"
            rel="noopener noreferrer"
          >
            🔊 Abrir áudio
          </a>
        </div>
      `
    }


    case 'image': {

      const src =
        d.type === 'external'
          ? d.external?.url
          : d.file?.url

      return src
        ? `
          <figure>
            <img
              src="${esc(src)}"
              alt="${esc(
                (d.caption || [])
                  .map(x => x.plain_text || '')
                  .join('')
              )}"
            >
            <figcaption>
              ${rich(d.caption || [])}
            </figcaption>
          </figure>
        `
        : ''
    }


    case 'file': {

      const src =
        d.type === 'external'
          ? d.external?.url
          : d.file?.url

      return `
        <p class="file-link">
          📎
          <a
            href="${esc(src || '#')}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ${
              rich(
                d.name
                  ? [{ plain_text: d.name }]
                  : d.caption || []
              ) || 'Abrir arquivo'
            }
          </a>
        </p>
      `
    }


    case 'child_page':

      return `
        <p class="child-page">
          📄 ${esc(d.title || 'Página relacionada')}
        </p>
        ${inner}
      `


    case 'column_list':

      return `<div class="columns">${inner}</div>`


    case 'column':

      return `<div class="column">${inner}</div>`


    case 'table': {

      const rows =
        block.has_children
          ? await allChildren(
              notion,
              block.id
            )
          : []

      const trs = rows.map(row => {

        const cells =
          row.table_row?.cells || []

        return `
          <tr>
            ${cells.map((cell, i) => {

              const isHeader =
                i === 0 &&
                d.has_column_header

              const tag =
                isHeader
                  ? 'th'
                  : 'td'

              return `
                <${tag}>
                  ${rich(cell)}
                </${tag}>
              `

            }).join('')}
          </tr>
        `

      }).join('')

      return `
        <div class="table-wrap">
          <table>
            ${trs}
          </table>
        </div>
      `
    }


    case 'table_row':

      return ''


    case 'table_of_contents':

      return ''


    case 'unsupported':

      return `
        <aside class="callout">
          ⚠️ Bloco do Notion ainda não suportado pelo PWA:
          ${esc(type)}
        </aside>
      `


    case 'synced_block':

      return inner


    default:

      return inner || ''
  }
}


function wrapLists(html) {

  return html.replace(
    /(?:<li>[\s\S]*?<\/li>)+/g,
    m => `<ul>${m}</ul>`
  )
}


function splitSections(blocks, rendered) {

  const sections = []

  let current = {
    title: 'Visão geral',
    html: ''
  }

  sections.push(current)


  blocks.forEach((block, index) => {

    const piece =
      rendered[index] || ''


    if (block.type === 'heading_1') {

      const title =
        headingText(block)
          .replace(
            /^\s*[-–—]\s*TESTE.*$/i,
            ''
          )
          .trim()


      current = {
        title: title || 'Seção',
        html: ''
      }


      sections.push(current)

      return
    }


    /*
     * Todo bloco que não seja heading_1
     * permanece dentro da seção atual.
     */
    current.html += piece

  })


  return sections.filter(section =>
    section.html.trim() ||
    section.title === 'Visão geral'
  )
}


const BASE = {

  'Síndrome clínica': [
    'Quadro clínico',
    'Diagnóstico diferencial',
    'Exames',
    'Tratamento',
    'Referências'
  ],

  'Doença': [
    'Visão geral',
    'Diagnóstico',
    'Avaliação inicial',
    'Tratamento',
    'Seguimento',
    'Referências'
  ],

  'Antimicrobiano': [
    'Visão geral',
    'Indicações',
    'Dose e administração',
    'Ajustes de dose',
    'Efeitos adversos',
    'Interações',
    'Monitoramento',
    'Referências'
  ],

  'Patógeno': [
    'Microbiologia',
    'Síndromes clínicas',
    'Diagnóstico',
    'Resistência',
    'Tratamento',
    'Controle de infecção',
    'Referências'
  ],

  'Exame': [
    'Para que serve',
    'Quando solicitar',
    'Como interpretar',
    'Valores de referência',
    'Limitações',
    'Armadilhas',
    'Referências'
  ],

  'Protocolo': [
    'Quem deve receber',
    'Avaliação inicial',
    'Conduta',
    'Esquema terapêutico',
    'Exames',
    'Seguimento',
    'Situações especiais',
    'Referências'
  ],

  'Ferramenta clínica': [
    'Calculadora',
    'Como interpretar',
    'Quando usar',
    'Limitações',
    'Referências'
  ]

}


module.exports = async function handler(req, res) {

  try {

    const id =
      req.query?.id


    if (!id) {

      return res
        .status(400)
        .json({
          error:
            'Informe ?id=PAGE_ID'
        })

    }


    if (!process.env.NOTION_TOKEN) {

      return res
        .status(500)
        .json({
          error:
            'NOTION_TOKEN não configurado.'
        })

    }


    const notion =
      new Client({
        auth:
          process.env.NOTION_TOKEN,
        notionVersion:
          '2025-09-03'
      })


    /*
     * Recupera a página.
     */

    const page =
      await notion.pages.retrieve({
        page_id: id
      })


    /*
     * Recupera TODOS os blocos.
     */

    const blocks =
      await allChildren(
        notion,
        id
      )


    /*
     * Detecta automaticamente os
     * arquivos HTML anexados ao Notion.
     */

    const detectedMiniApps =
      detectMiniApps(blocks)


    /*
     * Renderiza todos os blocos.
     */

    const rendered =
      await Promise.all(
        blocks.map(b =>
          renderBlock(
            notion,
            b
          )
        )
      )


    /*
     * Divide em seções.
     */

    const sections =
      splitSections(
        blocks,
        rendered
      )


    const props =
      page.properties || {}


    const get = name => {

      const p =
        props[name]

      if (!p) return ''


      if (p.type === 'title') {

        return (p.title || [])
          .map(x =>
            x.plain_text || ''
          )
          .join('')

      }


      if (p.type === 'rich_text') {

        return (p.rich_text || [])
          .map(x =>
            x.plain_text || ''
          )
          .join('')

      }


      if (p.type === 'select') {

        return p.select?.name || ''

      }


      if (p.type === 'status') {

        return p.status?.name || ''

      }


      if (p.type === 'checkbox') {

        return !!p.checkbox

      }


      if (p.type === 'multi_select') {

        return (p.multi_select || [])
          .map(x => x.name)

      }


      return ''
    }


    const category =
      get('Categoria') ||
      'Síndrome clínica'


    const extraTabs =
      get('Abas adicionais') ||
      []


    const title =
      get('Título') ||
      'Infecto Consult'


    const icon =
      page.icon?.type === 'emoji'
        ? page.icon.emoji
        : '🧬'


    /*
     * Mantém o valor antigo da propriedade
     * para compatibilidade.
     */

    const legacyMiniApps =
      get('MiniApps usados') ||
      ''


    const premium =
      !!get('Página premium')


    const tabDefs = []


    const addIfPresent =
      (label, section) => {

        const match =
          sections.find(s =>
            normalize(s.title) ===
              normalize(
                section || label
              ) ||

            normalize(s.title).includes(
              normalize(
                section || label
              )
            )
          )


        if (match) {

          tabDefs.push({
            label,
            html:
              wrapLists(
                match.html
              )
          })

        }

      }


    const baseTabs =
      BASE[category] ||
      BASE['Síndrome clínica']


    baseTabs.forEach(label =>
      addIfPresent(label)
    )


    ;(
      Array.isArray(extraTabs)
        ? extraTabs
        : []
    ).forEach(label =>
      addIfPresent(label)
    )


    /*
     * Qualquer seção não mapeada
     * vira uma aba própria.
     */

    const usedHtml =
      new Set(
        tabDefs.map(
          t => t.html
        )
      )


    sections.forEach(s => {

      const html =
        wrapLists(
          s.html
        )


      if (!usedHtml.has(html)) {

        tabDefs.push({
          label: s.title,
          html
        })

      }

    })


    /*
     * Durante a fase de teste:
     * impedir cache do Vercel.
     */

    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate'
    )


    return res
      .status(200)
      .json({

        source: 'notion',

        id,

        title,

        icon,

        category,

        premium,

        /*
         * NOVO:
         * lista automática de MiniApps HTML
         * encontrados nos blocos do Notion.
         */
        miniApps:
          detectedMiniApps,

        /*
         * Compatibilidade com a propriedade antiga.
         */
        legacyMiniApps,

        notionUrl:
          page.url,

        updatedAt:
          page.last_edited_time,

        tabs:
          tabDefs

      })


  } catch (error) {

    console.error(error)


    return res
      .status(500)
      .json({
        error:
          error.message ||
          'Erro ao ler página do Notion'
      })

  }

}
