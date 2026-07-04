/* Общие UI-хелперы платформы */
(function () {
  const D = window.DATA;

  // мини-хелпер создания элементов
  window.el = function (tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const kid of kids.flat()) {
      if (kid == null) continue;
      n.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return n;
  };

  // логотип-глиф (БПЛА-стилизация)
  window.GLYPH = `<svg class="glyph" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
    <path d="M16 6v20M6 12h20M9 12l-3-4M23 12l3-4M9 12l-3 4M23 12l3 4"/>
    <circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none"/></svg>`;

  // навигация (общая для всех страниц)
  window.mountNav = function (active) {
    const links = [
      ["index.html", "Обзор"],
      ["tracker.html", "Трекер проекта"],
      ["app.html", "Кабинеты"],
    ];
    const nav = el("nav", { class: "nav" },
      el("div", { class: "nav-in" },
        el("a", { class: "brand", href: "index.html", style: "color:inherit" },
          rawSvg(GLYPH), el("span", {}, "ПИШ ЦИ · БАС")),
        el("div", { class: "nav-links" },
          ...links.map(([h, t]) =>
            el("a", { href: h, class: active === h ? "active" : "" }, t))),
        el("a", { class: "nav-cta", href: "#postupit", onclick: gotoPostupit }, "Поступить →")
      )
    );
    document.body.prepend(nav);
  };
  function gotoPostupit(e){
    if (!document.getElementById("postupit")) { e.preventDefault(); location.href = "index.html#postupit"; }
  }
  function rawSvg(s){ const d=el("span"); d.innerHTML=s; return d.firstChild; }
  window.rawSvg = rawSvg;

  window.mountFooter = function () {
    document.body.append(
      el("footer", { class: "site" },
        el("div", { class: "wrap" },
          el("div", { class: "flex between wrap-w gap-m" },
            el("div", {},
              el("div", { class: "flex center gap-s", style:"margin-bottom:.6rem" }, rawSvg(GLYPH), el("b", {}, "Платформа ПИШ ЦИ БАС")),
              el("div", { class: "dim", style:"max-width:44ch" },
                "Демонстрационный прототип фазы 0. Данные учебного плана — реальные (g15.04.03_ПИШ_2026); команды и прогресс — синтетические для показа.")),
            el("div", { class:"mono", style:"font-size:var(--t-xs);text-align:right;color:var(--text-dim)" },
              el("div",{}, D.PROGRAM.code + " · " + D.PROGRAM.ze + " з.е. · " + D.PROGRAM.years + " года"),
              el("div",{}, "Передовая инженерная школа СПбПУ"),
              el("div",{style:"margin-top:.4rem"}, "старт — " + D.PROGRAM.start)))
        ))
    );
  };

  // статус-цвет
  window.riskColor = r => ({ ok:"var(--ok)", warn:"var(--warn)", risk:"var(--risk)" }[r] || "var(--text-mut)");
  window.riskLabel = r => ({ ok:"в графике", warn:"внимание", risk:"риск" }[r] || r);
  window.stageColor = id => (D.STAGES.find(s=>s.id===id)||{}).var || "--cyan";
})();
