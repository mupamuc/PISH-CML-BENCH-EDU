/* Тултипы терминов: подсвечивает термины глоссария в тексте, показывает определение
   при наведении/фокусе/тапе. Данные — из glossary.js (window.GLOSSARY_FULL).
   Аннотирование запускают страницы вызовом window.annotateTerms(root). */
(function () {
  const G = window.GLOSSARY_FULL;
  if (!G) return;

  // синонимы/словоформы для детекции в тексте (ключ — точное имя термина)
  const ALIASES = {
    "Цифровой двойник изделия": ["цифровой двойник","цифрового двойник","цифровому двойник","цифровым двойник","цифровых двойник","двойник"],
    "Цифровая модель изделия": ["цифровая модель издели","цифровой модели издели","цифровая модель","цифровой модели"],
    "Цифровая тень (Digital Shadow)": ["цифровая тень","цифровой тени","цифровую тень","digital shadow"],
    "Двусторонние информационные связи": ["двусторонних информационных связ","двусторонние информационные связ","двусторонние связ","двусторонних связ"],
    "Адекватность модели": ["адекватност"],
    "Верификация": ["верификаци"],
    "Валидация": ["валидаци","валидир"],
    "Достоверность расчёта": ["достоверност"],
    "ЦД-Р · ЦД-П · ЦД-Э": ["ЦД-Р","ЦД-П","ЦД-Э","эксплуатационный цифровой двойник"],
    "Цифровая нить (Digital Thread)": ["цифровая нить","digital thread"],
    "Цифровые (виртуальные) испытания": ["виртуальные испытани","виртуальных испытани","цифровые испытани","цифровых испытани"],
    "Цифровой (виртуальный) испытательный стенд / полигон": ["испытательный стенд","испытательного стенда","цифровой полигон"],
    "Валидационный базис": ["валидационн"],
    "Цифровая сертификация": ["цифровая сертификаци","цифровой сертификаци"],
    "Натурные испытания": ["натурные испытани","натурных испытани","натурным эксперимент","натурного эксперимент","натурный эксперимент"],
    "Компьютерная модель": ["компьютерная модель","компьютерной модели"],
    "Метод конечных элементов (МКЭ)": ["МКЭ","метод конечных элементов","конечно-элемент","конечных элементов","кэ-модел"],
    "Вычислительная аэродинамика (CFD)": ["CFD","вычислительная аэродинамик","вычислительной аэродинамик"],
    "Редуцированная модель (ROM)": ["ROM","редуцированн","пониженного порядка"],
    "Суперкомпьютерный инжиниринг (HPC)": ["HPC","суперкомпьютерн","высокопроизводительные вычислени"],
    "Матрица целевых показателей и ресурсных ограничений": ["матрица целевых показателей","матрицы целевых показателей","матрицу целевых показателей","целевых показателей и ресурсных ограничений","матрица требований"],
    "Многоуровневая система требований": ["многоуровневая система требований","каскад требований","каскадирование требований"],
    "Каркас разработки": ["каркас разработки"],
  };

  const byName = {};
  G.terms.forEach(t => { byName[t.t] = t; });

  // индекс детекции: {re, name, len}
  const entries = [];
  Object.keys(ALIASES).forEach(name => {
    if (!byName[name]) return;
    ALIASES[name].forEach(a => {
      const esc = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      let re;
      try { re = new RegExp("(?<![\\p{L}\\p{N}])" + esc + "[а-яё]*(?![\\p{L}])", "iu"); }
      catch (e) { re = new RegExp("(?<![A-Za-zА-Яа-яЁё0-9])" + esc + "[а-яё]*(?![A-Za-zА-Яа-яЁё])", "i"); }
      entries.push({ re, name, len: a.length });
    });
  });
  entries.sort((x, y) => y.len - x.len);

  const SKIP_TAGS = new Set(["A","BUTTON","H1","H2","H3","CODE","INPUT","TEXTAREA","SELECT","SCRIPT","STYLE","LABEL"]);
  const SKIP_CLASS = ["gloss-term","kicker","chip","ftype","rd-formula","g-src","nav","mono","g-term","dc-code","syl-n","syl-b","stat-num","tm","quiz-num","theme-btn","brand"];
  function skip(node) {
    let p = node.parentElement;
    while (p) {
      if (p.tagName && SKIP_TAGS.has(p.tagName)) return true;
      if (p.classList && SKIP_CLASS.some(c => p.classList.contains(c))) return true;
      if (p.namespaceURI && p.namespaceURI.indexOf("svg") >= 0) return true;
      p = p.parentElement;
    }
    return false;
  }

  // аннотировать первое вхождение каждого термина внутри root
  window.annotateTerms = function (root) {
    if (!root || !entries.length) return;
    const used = new Set();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (skip(n)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = []; let n;
    while ((n = walker.nextNode())) nodes.push(n);

    nodes.forEach(node => {
      let text = node.nodeValue;
      const frag = document.createDocumentFragment();
      let pos = 0, guard = 0;
      while (pos < text.length && guard++ < 50) {
        let best = null, bestIdx = Infinity, bestMatch = null;
        const slice = text.slice(pos);
        for (const e of entries) {
          if (used.has(e.name)) continue;
          e.re.lastIndex = 0;
          const m = e.re.exec(slice);
          if (m && m.index < bestIdx) { bestIdx = m.index; best = e; bestMatch = m; }
        }
        if (!best) break;
        used.add(best.name);
        const abs = pos + bestMatch.index;
        if (abs > pos) frag.append(document.createTextNode(text.slice(pos, abs)));
        const word = bestMatch[0];
        const span = document.createElement("span");
        span.className = "gloss-term";
        span.textContent = word;
        span.dataset.term = best.name;
        span.tabIndex = 0;
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", "термин: " + best.name);
        frag.append(span);
        pos = abs + word.length;
      }
      if (pos === 0) return; // ничего не нашли
      if (pos < text.length) frag.append(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
  };

  // ——— единый тултип ———
  let tip, hideT, curEl;
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.id = "gloss-tip";
    document.body.appendChild(tip);
    tip.addEventListener("mouseenter", () => clearTimeout(hideT));
    tip.addEventListener("mouseleave", hideSoon);
    return tip;
  }
  function show(el) {
    const t = byName[el.dataset.term];
    if (!t) return;
    ensureTip();
    clearTimeout(hideT);
    curEl = el;
    const src = G.sources[t.src] || { label: t.src, url: "" };
    tip.innerHTML =
      '<div class="gt-term"></div><div class="gt-def"></div>' +
      '<div class="gt-foot"><span class="gt-src"></span>' +
      '<a href="glossary.html">в глоссарий →</a></div>';
    tip.querySelector(".gt-term").textContent = t.t;
    tip.querySelector(".gt-def").textContent = t.d;
    tip.querySelector(".gt-src").textContent = src.label;
    place(el);
  }
  function place(el) {
    const r = el.getBoundingClientRect();
    tip.style.visibility = "hidden"; tip.style.display = "block";
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) top = r.top - th - 8;
    tip.style.left = left + "px"; tip.style.top = Math.max(8, top) + "px";
    tip.style.visibility = "visible";
  }
  function hideSoon() { hideT = setTimeout(() => { if (tip) tip.style.display = "none"; curEl = null; }, 140); }
  function hideNow() { if (tip) tip.style.display = "none"; curEl = null; }

  document.addEventListener("mouseover", e => { const el = e.target.closest && e.target.closest(".gloss-term"); if (el) show(el); });
  document.addEventListener("mouseout", e => { if (e.target.closest && e.target.closest(".gloss-term")) hideSoon(); });
  document.addEventListener("focusin", e => { if (e.target.classList && e.target.classList.contains("gloss-term")) show(e.target); });
  document.addEventListener("focusout", e => { if (e.target.classList && e.target.classList.contains("gloss-term")) hideSoon(); });
  document.addEventListener("click", e => {
    const el = e.target.closest && e.target.closest(".gloss-term");
    if (el) { if (tip && tip.style.display === "block" && curEl === el) hideNow(); else show(el); }
    else if (tip && !e.target.closest("#gloss-tip")) hideNow();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideNow(); });
  window.addEventListener("scroll", () => { if (curEl && tip && tip.style.display === "block") place(curEl); }, { passive: true });
})();
