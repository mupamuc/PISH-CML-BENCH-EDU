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

  // фирменный логотип ПИШ ЦИ (цветной для светлой темы, белый для тёмной)
  window.logoEl = function (h) {
    const wrap = el("span", { class: "brand-logo", style: "display:inline-flex;align-items:center" });
    const light = el("img", { class: "logo-light", src: "assets/img/logo_color.png",
      alt: "Цифровой инжиниринг · ПИШ СПбПУ" });
    const dark = el("img", { class: "logo-dark", src: "assets/img/logo_white.png", alt: "" });
    if (h) { light.style.height = h + "px"; dark.style.height = h + "px"; }
    wrap.append(light, dark);
    return wrap;
  };

  // навигация (общая для всех страниц)
  window.mountNav = function (active) {
    const links = [
      ["index.html", "Обзор"],
      ["tracker.html", "Трекер проекта"],
      ["app.html", "Кабинеты"],
    ];
    const nav = el("nav", { class: "nav" },
      el("div", { class: "nav-in" },
        el("a", { class: "brand", href: "index.html", style: "color:inherit" }, logoEl(34)),
        el("div", { class: "nav-links" },
          ...links.map(([h, t]) =>
            el("a", { href: h, class: active === h ? "active" : "" }, t))),
        el("a", { class: "nav-cta", href: "#postupit", onclick: gotoPostupit }, "Поступить →"),
        themeBtn()
      )
    );
    document.body.prepend(nav);
  };

  // иконки темы
  const SUN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>`;
  const MOON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 7 7 0 1 0 20 14.5z"/></svg>`;

  function themeBtn() {
    const b = el("button", { class: "theme-btn", "aria-label": "Переключить тему", title: "Светлая / тёмная тема" });
    const paint = () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      b.innerHTML = dark ? SUN : MOON;   // показываем иконку того, во что переключим
    };
    b.addEventListener("click", () => {
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const next = dark ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      paint();
    });
    paint();
    return b;
  }
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
              el("div", { style:"margin-bottom:.8rem" }, logoEl(40)),
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
