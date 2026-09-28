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


/* =========================================================
   TÍTULO DA PÁGINA
   ========================================================= */

function pageTitle(page) {
  const p = Object.values(page.properties || {})
    .find(x => x.type === "title");

  return propText(p) || "Sem título";
}


/* =========================================================
   ÍCONE DA PÁGINA
   ========================================================= */

function pageIcon(page) {

  if (page.icon?.type === "emoji") {
    return page.icon.emoji;
  }

  return "🧬";
}


/* =========================================================
   IMAGEM
   Aceita:
   1. propriedade Notion "Imagem URL"
   2. propriedade Notion "Imagem" do tipo files
   3. capa da página do Notion
   ========================================================= */

function pageImage(page) {

  const properties = page.properties || {};

  /* -----------------------------------------
     OPÇÃO 1 — propriedade "Imagem URL"
     ----------------------------------------- */

  const imageUrl =
    properties["Imagem URL"]?.url?.url ||
    properties["Imagem URL"]?.url ||
    "";

  if (imageUrl) {
    return imageUrl;
  }


  /* -----------------------------------------
     OPÇÃO 2 — propriedade "Imagem"
     do tipo arquivos
     ----------------------------------------- */

  const files =
    properties["Imagem"]?.files || [];

  if (files.length) {

    const file = files[0];

    if (file.type === "external") {
      return file.external?.url || "";
    }

    if (file.type === "file") {
      return file.file?.url || "";
    }
  }


  /* -----------------------------------------
     OPÇÃO 3 — capa da página
     ----------------------------------------- */

  if (page.cover) {

    if (page.cover.type === "external") {
      return page.cover.external?.url || "";
    }

    if (page.cover.type === "file") {
      return page.cover.file?.url || "";
    }
  }


  return "";
}


/* =========================================================
   DATABASE / DATA SOURCE
   ========================================================= */

function getDataSourceId(database) {

  return (
    database.data_sources?.[0]?.id ||
    process.env.NOTION_DATABASE_ID
  );

}


/* =========================================================
   HANDLER
   ========================================================= */

module.exports = async function handler(req, res) {

  try {

    if (
      !process.env.NOTION_TOKEN ||
      !process.env.NOTION_DATABASE_ID
    ) {

      return res.status(200).json({

        source: "fallback",

        warning:
          "Configure NOTION_TOKEN e NOTION_DATABASE_ID no Vercel.",

        items: []

      });

    }


    const notion = new Client({

      auth: process.env.NOTION_TOKEN,

      notionVersion: "2025-09-03"

    });


    const db = await notion.databases.retrieve({

      database_id:
        process.env.NOTION_DATABASE_ID

    });


    const dataSourceId =
      getDataSourceId(db);


    let results = [];

    let cursor = undefined;


    do {

      const response =
        await notion.dataSources.query({

          data_source_id:
            dataSourceId,

          page_size: 100,

          ...(cursor
            ? { start_cursor: cursor }
            : {})

        });


      results.push(
        ...response.results
      );


      cursor =
        response.has_more
          ? response.next_cursor
          : null;

    } while (cursor);


    /* =====================================================
       TRANSFORMA PÁGINAS DO NOTION EM ITENS DO SITE
       ===================================================== */

    const items = results

      .filter(page =>
        page.object === "page"
      )

      .filter(page =>
        page.properties?.["Publicar no site"]?.checkbox === true
      )

      .map(page => {

        return {

          id: page.id,

          title:
            pageTitle(page),

          description:
            propText(
              page.properties?.["Descrição curta"]
            ) ||
            "Conteúdo clínico em infectologia.",

          icon:
            pageIcon(page),

          image:
            pageImage(page),

          category:
            propText(
              page.properties?.["Categoria"]
            ),

          level:
            propText(
              page.properties?.["Nível da página"]
            ),

          miniApps:
            propText(
              page.properties?.["MiniApps usados"]
            ),

          extras:
            propText(
              page.properties?.["Abas adicionais"]
            ),

          premium:
            page.properties?.["Página premium"]?.checkbox === true,

          notionUrl:
            page.url,

          updatedAt:
            page.last_edited_time

        };

      });


    /* =====================================================
       CACHE
       ===================================================== */

    res.setHeader(
      "Cache-Control",
      "s-maxage=60, stale-while-revalidate=300"
    );


    return res.status(200).json({

      source: "notion",

      items

    });


  } catch (error) {

    console.error(error);

    return res.status(500).json({

      error:
        error.message ||
        "Erro ao ler Notion.",

      items: []

    });

  }

};
