const { Client } = require("@notionhq/client");

function plain(arr) {
  return Array.isArray(arr)
    ? arr.map(x => x.plain_text || "").join("")
    : "";
}

function propText(p) {
  if (!p) return "";
  if (p.type === "title") return plain(p.title);
  if (p.type === "rich_text") return plain(p.rich_text);
  if (p.type === "select") return p.select?.name || "";
  if (p.type === "status") return p.status?.name || "";
  if (p.type === "url") return p.url || "";
  if (p.type === "checkbox") return p.checkbox ? "true" : "false";
  if (p.type === "multi_select") {
    return (p.multi_select || []).map(x => x.name).join(", ");
  }
  return "";
}

function pageTitle(page) {
  const p = Object.values(page.properties || {})
    .find(x => x.type === "title");
  return propText(p) || "Sem título";
}

function pageIcon(page) {
  if (page.icon?.type === "emoji") return page.icon.emoji;
  return "🧬";
}

// Mantém a prioridade: Imagem URL, arquivo Imagem, capa da página.
function pageImage(page) {
  const properties = page.properties || {};
  const imageUrl =
    properties["Imagem URL"]?.url?.url ||
    properties["Imagem URL"]?.url ||
    "";
  if (imageUrl) return imageUrl;

  const files = properties["Imagem"]?.files || [];
  if (files.length) {
    const file = files[0];
    if (file.type === "external") return file.external?.url || "";
    if (file.type === "file") return file.file?.url || "";
  }

  if (page.cover?.type === "external") return page.cover.external?.url || "";
  if (page.cover?.type === "file") return page.cover.file?.url || "";
  return "";
}

function getDataSourceId(database) {
  return database.data_sources?.[0]?.id || process.env.NOTION_DATABASE_ID;
}

module.exports = async function handler(req, res) {
  try {
    if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
      return res.status(200).json({
        source: "fallback",
        warning: "Configure NOTION_TOKEN e NOTION_DATABASE_ID no Vercel.",
        items: []
      });
    }

    const notion = new Client({
      auth: process.env.NOTION_TOKEN,
      notionVersion: "2025-09-03"
    });

    const db = await notion.databases.retrieve({
      database_id: process.env.NOTION_DATABASE_ID
    });
    const dataSourceId = getDataSourceId(db);
    const results = [];
    let cursor;

    do {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {})
      });
      results.push(...response.results);
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    const items = results
      .filter(page => page.object === "page")
      .filter(page => page.properties?.["Publicar no site"]?.checkbox === true)
      .map(page => {
        const properties = page.properties || {};
        return {
          id: page.id,
          title: pageTitle(page),
          description: propText(properties["Descrição curta"]) ||
            "Conteúdo clínico em infectologia.",
          icon: pageIcon(page),
          image: pageImage(page),
          category: propText(properties["Categoria"]),
          className: propText(properties["Classe"]),
          // Nome atual da propriedade; mantém compatibilidade com o nome antigo.
          level: propText(properties["Nível de página"] ?? properties["Nível da página"]),
          miniApps: propText(properties["MiniApps usados"]),
          extras: propText(properties["Abas adicionais"]),
          premium: properties["Página premium"]?.checkbox === true,
          notionUrl: page.url,

          // Os três campos usados pelo index.html para ordenar os cards.
          featured: properties["Destacar no início"]?.checkbox === true,
          // Atualização automática = última edição da página.
          // Equivale à fórmula "Última atualização" que espelha "Última edição".
          // Qualquer alteração, inclusive em propriedades/checkboxes, muda essa data.
          updatedAt: page.last_edited_time ??
            properties["Última atualização"]?.formula?.date?.start ??
            properties["Última edição"]?.last_edited_time ??
            null,
          createdAt: page.created_time ?? null
        };
      });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ source: "notion", items });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error.message || "Erro ao ler Notion.",
      items: []
    });
  }
};
