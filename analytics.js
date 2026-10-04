/* =========================================================
   INFECTO CONSULT — ANALYTICS
   Google Analytics 4
   Measurement ID: G-ZX7GRQD9SM

   Eventos:
   - pesquisa no buscador
   - seleção de conteúdo
   - seleção de filtros
   ========================================================= */

(function () {
  "use strict";

  function track(eventName, params) {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", eventName, params || {});
  }

  function clean(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 100);
  }

  function getCardName(card) {
    const title = card?.querySelector("h3");
    return clean(title?.textContent || "");
  }

  function getCardId(card) {
    return clean(card?.dataset?.id || "");
  }

  function getTarget(card) {
    return clean(card?.dataset?.target || "");
  }

  /* =========================================================
     1. PESQUISAS
     ========================================================= */

  function setupSearchTracking() {
    const searchInput = document.getElementById("q");

    if (!searchInput) return;

    let timer = null;
    let lastTracked = "";

    searchInput.addEventListener("input", function () {
      const term = clean(searchInput.value).toLowerCase();

      clearTimeout(timer);

      if (term.length < 2) return;

      timer = setTimeout(function () {
        if (term === lastTracked) return;

        lastTracked = term;

        track("search", {
          search_term: term
        });
      }, 800);
    });
  }

  /* =========================================================
     2. SELEÇÃO DE CONTEÚDO
     ========================================================= */

  function setupContentTracking() {
    document.addEventListener("click", function (event) {

      const card = event.target.closest(
        ".module-card[data-target]"
      );

      if (card) {

        if (
          event.target.closest(
            ".favorite-button[data-favorite-id]"
          )
        ) {
          return;
        }

        const title = getCardName(card);
        const id = getCardId(card);
        const target = getTarget(card);

        track("select_content", {
          content_type: "module",
          item_id: id || target,
          item_name: title,
          content_target: target
        });

        return;
      }

      /* Resultado da busca */

      const result = event.target.closest(
        "#results button[data-target]"
      );

      if (result) {

        const target =
          clean(result.dataset.target || "");

        const title =
          clean(
            result.querySelector("b")?.textContent ||
            result.textContent
          );

        track("select_content", {
          content_type: "search_result",
          item_id: target,
          item_name: title,
          content_target: target
        });
      }
    });
  }

  /* =========================================================
     3. FILTROS
     ========================================================= */

  function setupFilterTracking() {
    document.addEventListener("click", function (event) {

      const button =
        event.target.closest(".class-button");

      if (!button) return;

      const categorySection =
        button.closest(".category-section");

      const category =
        clean(
          categorySection?.dataset?.category || ""
        );

      const selectedClass =
        clean(
          button.dataset.class ||
          button.textContent
        );

      track("select_content", {
        content_type: "class_filter",
        item_id: selectedClass,
        item_name: selectedClass,
        category: category
      });
    });
  }

  /* =========================================================
     INICIALIZAÇÃO
     ========================================================= */

  function init() {

    setupSearchTracking();
    setupContentTracking();
    setupFilterTracking();

    console.log(
      "Infecto Consult Analytics ativo."
    );
  }

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();
