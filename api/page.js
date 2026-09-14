const { Client } = require('@notionhq/client')

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: '2025-09-03'
})


function richTextToPlain(arr = []) {

  return arr
    .map(item => item.plain_text || '')
    .join('')

}


function getPageTitle(page) {

  const props =
    page.properties || {}

  const titleProperty =
    props['Título']

  if (
    titleProperty &&
    titleProperty.type === 'title'
  ) {

    return richTextToPlain(
      titleProperty.title
    )

  }

  for (
    const property
    of Object.values(props)
  ) {

    if (
      property &&
      property.type === 'title'
    ) {

      return richTextToPlain(
        property.title
      )

    }

  }

  return 'Infecto Consult'

}


function renderRichText(arr = []) {

  return arr
    .map(item => {

      let text =
        item.plain_text || ''

      if (item.annotations?.bold) {
        text = `<strong>${text}</strong>`
      }

      if (item.annotations?.italic) {
        text = `<em>${text}</em>`
      }

      if (item.annotations?.code) {
        text = `<code>${text}</code>`
      }

      return text

    })
    .join('')

}


function renderBlock(block) {

  const type =
    block.type

  const data =
    block[type]

  if (!data) {
    return ''
  }


  if (type === 'paragraph') {

    const text =
      renderRichText(
        data.rich_text
      )

    return text
      ? `<p>${text}</p>`
      : ''

  }


  if (type === 'heading_1') {

    return `
      <h1>
        ${renderRichText(data.rich_text)}
      </h1>
    `

  }


  if (type === 'heading_2') {

    return `
      <h2>
        ${renderRichText(data.rich_text)}
      </h2>
    `

  }


  if (type === 'heading_3') {

    return `
      <h3>
        ${renderRichText(data.rich_text)}
      </h3>
    `

  }


  if (
    type ===
    'bulleted_list_item'
  ) {

    return `
      <li>
        ${renderRichText(data.rich_text)}
      </li>
    `

  }


  if (
    type ===
    'numbered_list_item'
  ) {

    return `
      <li>
        ${renderRichText(data.rich_text)}
      </li>
    `

  }


  if (type === 'quote') {

    return `
      <blockquote>
        ${renderRichText(data.rich_text)}
      </blockquote>
    `

  }


  if (type === 'callout') {

    return `
      <div class="callout">

        ${data.icon?.emoji || '💡'}

        ${renderRichText(data.rich_text)}

      </div>
    `

  }


  if (type === 'divider') {

    return '<hr>'

  }


  if (type === 'code') {

    return `
      <pre><code>
${renderRichText(data.rich_text)}
      </code></pre>
    `

  }


  return ''

}


module.exports = async function handler(
  req,
  res
) {

  try {

    const pageId =
      req.query.id

    if (!pageId) {

      return res.status(400).json({

        error:
          'Informe o ID da página.'

      })

    }


    /*
     * Busca a página
     */

    const page =
      await notion.pages.retrieve({
        page_id: pageId
      })


    /*
     * Busca os blocos da página
     */

    const response =
      await notion.blocks.children.list({

        block_id: pageId,

        page_size: 100

      })


    let html = ''

    let inBullets = false

    let inNumbers = false


    for (
      const block
      of response.results
    ) {


      /*
       * Lista com marcadores
       */

      if (
        block.type ===
        'bulleted_list_item'
      ) {

        if (!inBullets) {

          html += '<ul>'

          inBullets = true

        }

        html +=
          renderBlock(block)

        continue

      }


      if (inBullets) {

        html += '</ul>'

        inBullets = false

      }


      /*
       * Lista numerada
       */

      if (
        block.type ===
        'numbered_list_item'
      ) {

        if (!inNumbers) {

          html += '<ol>'

          inNumbers = true

        }

        html +=
          renderBlock(block)

        continue

      }


      if (inNumbers) {

        html += '</ol>'

        inNumbers = false

      }


      html +=
        renderBlock(block)

    }


    if (inBullets) {

      html += '</ul>'

    }


    if (inNumbers) {

      html += '</ol>'

    }


    return res.status(200).json({

      id: page.id,

      title:
        getPageTitle(page),

      icon:
        page.icon?.emoji ||
        '🧬',

      content:
        html,

      notionUrl:
        page.url

    })


  } catch (error) {

    console.error(
      'Erro ao carregar página:',
      error
    )


    return res.status(500).json({

      error:
        error.message ||
        'Erro ao carregar conteúdo'

    })

  }

}
