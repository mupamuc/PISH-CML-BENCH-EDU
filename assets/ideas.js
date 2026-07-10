/* Страница «Идеи»: живой граф экспертных мнений + лента событий GitHub.
   Граф: разделы платформы — якоря; к ним идеи; к идеям комментарии.
   Данные — window.COLLAB (Supabase), обновление в реальном времени. */
(function () {
  window.IDEAS_SECTIONS = [
    { id: "landing",      label: "Лендинг программы",     hue: "var(--cyan)" },
    { id: "tracker",      label: "Трекер проекта",        hue: "var(--lime)" },
    { id: "cab-student",  label: "Кабинет студента",      hue: "var(--violet)" },
    { id: "cab-teacher",  label: "Кабинет преподавателя", hue: "var(--amber)" },
    { id: "cab-rop",      label: "Кабинет РОП",           hue: "var(--cyan)" },
    { id: "cab-director", label: "Кабинет директора",     hue: "var(--lime)" },
    { id: "glossary",     label: "Глоссарий",             hue: "var(--violet)" },
    { id: "data",         label: "Данные и БД",           hue: "var(--amber)" },
    { id: "general",      label: "Общее / другое",        hue: "var(--cyan)" },
  ];

  const state = { ideas: [], comments: [], voteCount: {}, myVotes: new Set(), openIdeaId: null };

  /* ————— утилиты ————— */
  const $ = (id) => document.getElementById(id);
  const sectionById = (id) => window.IDEAS_SECTIONS.find((s) => s.id === id) ||
    { id, label: id, hue: "var(--text-dim)" };

  function timeAgo(iso) {
    const sec = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
    if (sec < 60) return "только что";
    const min = sec / 60, h = min / 60, d = h / 24;
    if (min < 60) return plural(Math.floor(min), "минуту", "минуты", "минут") + " назад";
    if (h < 24) return plural(Math.floor(h), "час", "часа", "часов") + " назад";
    if (d < 30) return plural(Math.floor(d), "день", "дня", "дней") + " назад";
    return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  }
  function plural(n, a, b, c) {
    const m = n % 100, d = n % 10;
    const w = (m >= 11 && m <= 14) ? c : d === 1 ? a : (d >= 2 && d <= 4) ? b : c;
    return n + " " + w;
  }
  function savedName() { try { return localStorage.getItem("collab_name") || ""; } catch (e) { return ""; } }
  function saveName(v) { try { localStorage.setItem("collab_name", v); } catch (e) {} }

  /* ————— загрузка данных ————— */
  async function reload() {
    if (!window.COLLAB.ready) return;
    try {
      const data = await window.COLLAB.fetchAll();
      state.ideas = data.ideas;
      state.comments = data.comments;
      state.voteCount = data.voteCount;
      state.myVotes = data.myVotes;
      $("g-offline")?.classList.add("hide");
      syncGraph();
      renderStats();
      if (state.openIdeaId) renderPanel(state.openIdeaId);
    } catch (e) {
      $("g-offline")?.classList.remove("hide");
    }
  }

  /* ————— граф (SVG + силовая раскладка) ————— */
  const W = 1000, H = 660;
  let nodes = [], links = [], nodeById = {};
  let svg, gLinks, gNodes, rafId = null, hot = 0;

  function initGraph() {
    svg = $("graph-svg");
    gLinks = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.append(gLinks, gNodes);

    // якоря-разделы по кольцу
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.36;
    window.IDEAS_SECTIONS.forEach((s, i) => {
      const a = (i / window.IDEAS_SECTIONS.length) * Math.PI * 2 - Math.PI / 2;
      addNode({
        id: "sec:" + s.id, type: "section", section: s,
        x: cx + R * Math.cos(a), y: cy + R * Math.sin(a),
        ax: cx + R * Math.cos(a), ay: cy + R * Math.sin(a), // точка притяжения
        r: 12,
      });
    });
    syncGraph();
  }

  function addNode(n) {
    n.vx = 0; n.vy = 0;
    nodes.push(n); nodeById[n.id] = n;
    return n;
  }

  /* привести узлы/рёбра графа в соответствие данным (добавляем недостающее) */
  function syncGraph() {
    let changed = false;
    for (const idea of state.ideas) {
      const id = "idea:" + idea.id;
      if (!nodeById[id]) {
        const anchor = nodeById["sec:" + idea.section] || nodeById["sec:general"];
        addNode({
          id, type: "idea", idea,
          x: anchor.x + (Math.random() - 0.5) * 60,
          y: anchor.y + (Math.random() - 0.5) * 60,
          r: 9,
        });
        links.push({ a: "sec:" + (nodeById["sec:" + idea.section] ? idea.section : "general"), b: id, len: 78 });
        changed = true;
      }
      nodeById[id].votes = state.voteCount[idea.id] || 0;
    }
    for (const c of state.comments) {
      const id = "com:" + c.id;
      const parent = nodeById["idea:" + c.idea_id];
      if (!nodeById[id] && parent) {
        addNode({
          id, type: "comment", comment: c,
          x: parent.x + (Math.random() - 0.5) * 30,
          y: parent.y + (Math.random() - 0.5) * 30,
          r: 3.5,
        });
        links.push({ a: "idea:" + c.idea_id, b: id, len: 26 });
        changed = true;
      }
    }
    if (changed || !gNodes.childNodes.length) renderGraph();
    heatUp();
  }

  function renderGraph() {
    gLinks.innerHTML = ""; gNodes.innerHTML = "";
    for (const l of links) {
      l.el = line("g-link");
      gLinks.append(l.el);
    }
    for (const n of nodes) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "g-node g-" + n.type);
      if (n.type === "section") {
        const ring = circle(n.r + 5, "g-sec-ring");
        const dot = circle(n.r, "g-sec-dot");
        dot.style.fill = n.section.hue;
        const t = text(n.section.label, "g-sec-label");
        t.setAttribute("y", n.r + 20);
        g.append(ring, dot, t);
        g.addEventListener("click", () => { $("f-section").value = n.section.id; $("f-title").focus(); });
        g.append(titleEl("Раздел «" + n.section.label + "» — нажмите, чтобы предложить сюда идею"));
      } else if (n.type === "idea") {
        const dot = circle(n.r, "g-idea-dot " + (n.idea.kind === "critique" ? "g-crit" : ""));
        g.append(dot, titleEl((n.idea.kind === "critique" ? "Критика: " : "Идея: ") + n.idea.title +
          " — " + n.idea.author));
        g.addEventListener("click", () => openIdea(n.idea.id));
      } else {
        g.append(circle(n.r, "g-com-dot"),
          titleEl("Комментарий " + n.comment.author));
        g.addEventListener("click", () => openIdea(n.comment.idea_id));
      }
      n.el = g;
      gNodes.append(g);
    }
    tickDraw();
  }
  const NS = "http://www.w3.org/2000/svg";
  function circle(r, cls) { const c = document.createElementNS(NS, "circle"); c.setAttribute("r", r); c.setAttribute("class", cls); return c; }
  function line(cls) { const l = document.createElementNS(NS, "line"); l.setAttribute("class", cls); return l; }
  function text(s, cls) { const t = document.createElementNS(NS, "text"); t.textContent = s; t.setAttribute("class", cls); t.setAttribute("text-anchor", "middle"); return t; }
  function titleEl(s) { const t = document.createElementNS(NS, "title"); t.textContent = s; return t; }

  /* физика: пружины по рёбрам, отталкивание узлов, притяжение якорей */
  function heatUp() { hot = 240; if (!rafId) rafId = requestAnimationFrame(step); }
  function step() {
    for (let it = 0; it < 2; it++) simTick();
    tickDraw();
    hot--;
    rafId = hot > 0 ? requestAnimationFrame(step) : null;
  }
  function simTick() {
    for (const l of links) {
      const a = nodeById[l.a], b = nodeById[l.b];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const f = (d - l.len) * 0.012;
      dx /= d; dy /= d;
      a.vx += dx * f; a.vy += dy * f;
      b.vx -= dx * f; b.vy -= dy * f;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 150 * 150 || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const f = Math.min(4, 320 / d2);
        dx /= d; dy /= d;
        a.vx -= dx * f; a.vy -= dy * f;
        b.vx += dx * f; b.vy += dy * f;
      }
    }
    for (const n of nodes) {
      if (n.ax !== undefined) { n.vx += (n.ax - n.x) * 0.06; n.vy += (n.ay - n.y) * 0.06; }
      n.vx *= 0.82; n.vy *= 0.82;
      n.x = Math.max(30, Math.min(W - 30, n.x + n.vx));
      n.y = Math.max(30, Math.min(H - 44, n.y + n.vy));
    }
  }
  function tickDraw() {
    for (const l of links) {
      const a = nodeById[l.a], b = nodeById[l.b];
      l.el.setAttribute("x1", a.x); l.el.setAttribute("y1", a.y);
      l.el.setAttribute("x2", b.x); l.el.setAttribute("y2", b.y);
    }
    for (const n of nodes) n.el.setAttribute("transform", "translate(" + n.x + "," + n.y + ")");
  }

  /* ————— панель идеи ————— */
  function openIdea(id) {
    state.openIdeaId = id;
    renderPanel(id);
    $("panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderPanel(id) {
    const idea = state.ideas.find((i) => i.id === id);
    const box = $("panel-body");
    if (!idea) { box.innerHTML = ""; box.append(el("div", { class: "dim" }, "Идея не найдена.")); return; }
    const sec = sectionById(idea.section);
    const comments = state.comments.filter((c) => c.idea_id === id);
    const votes = state.voteCount[id] || 0;
    const voted = state.myVotes.has(id);

    box.innerHTML = "";
    box.append(
      el("div", { class: "flex gap-s center wrap-w" },
        el("span", { class: "chip", style: "color:" + sec.hue + ";border-color:currentColor" }, sec.label),
        el("span", { class: "chip" }, idea.kind === "critique" ? "⚠ критика" : "💡 идея"),
        el("span", { class: "dim mono", style: "font-size:var(--t-xs)" }, timeAgo(idea.created_at))),
      el("h3", { class: "mt-m", style: "font-size:1.25rem" }, idea.title),
      el("div", { class: "muted", style: "font-size:var(--t-sm);margin:.3rem 0 .8rem" }, "— " + idea.author),
      el("p", { style: "white-space:pre-wrap;font-size:var(--t-sm);line-height:1.55" }, idea.body),
      el("button", {
        class: "btn " + (voted ? "btn-ghost" : "btn-primary"),
        style: "margin:.2rem 0 1.2rem",
        onclick: async (e) => {
          e.target.disabled = true;
          try { await window.COLLAB.vote(id); await reload(); }
          catch (err) { alert(err.message); }
          e.target.disabled = false;
        },
      }, voted ? "✓ Вы поддержали · " + votes : "👍 Поддержать · " + votes),
      el("div", { class: "kicker" }, "Комментарии · " + comments.length),
      el("div", { id: "p-comments" },
        comments.length
          ? comments.map((c) => el("div", { class: "p-com" },
              el("div", { class: "mono dim", style: "font-size:var(--t-xs)" }, c.author + " · " + timeAgo(c.created_at)),
              el("div", { style: "white-space:pre-wrap" }, c.body)))
          : el("div", { class: "dim", style: "font-size:var(--t-sm);padding:.6rem 0" },
              "Пока нет — будьте первым.")),
      commentForm(id)
    );
  }

  function commentForm(ideaId) {
    const name = el("input", { class: "c-inp", placeholder: "Ваше имя", maxlength: "80", value: savedName() });
    const body = el("textarea", { class: "c-inp", rows: "3", placeholder: "Ваш комментарий…", maxlength: "1000" });
    const btn = el("button", { class: "btn btn-ghost", style: "margin-top:.5rem" }, "Отправить комментарий");
    const wrap = el("div", { class: "mt-m" }, name, body, btn);
    btn.addEventListener("click", async () => {
      const a = name.value.trim(), b = body.value.trim();
      if (!a || !b) { alert("Заполните имя и текст комментария."); return; }
      btn.disabled = true; btn.textContent = "Отправляем…";
      try {
        saveName(a);
        await window.COLLAB.addComment({ ideaId, author: a, body: b });
        await reload();
      } catch (e) { alert("Не получилось отправить: " + e.message); }
      btn.disabled = false; btn.textContent = "Отправить комментарий";
    });
    return wrap;
  }

  /* ————— форма новой идеи ————— */
  function initForm() {
    const secSel = $("f-section");
    window.IDEAS_SECTIONS.forEach((s) => secSel.append(el("option", { value: s.id }, s.label)));
    $("f-name").value = savedName();

    $("f-send").addEventListener("click", async () => {
      const author = $("f-name").value.trim();
      const title = $("f-title").value.trim();
      const body = $("f-body").value.trim();
      const kind = document.querySelector('input[name="f-kind"]:checked').value;
      if (!author) return alert("Представьтесь, пожалуйста — впишите имя.");
      if (title.length < 3) return alert("Впишите заголовок идеи (хотя бы пару слов).");
      if (body.length < 3) return alert("Опишите идею в поле «Суть».");
      const btn = $("f-send");
      btn.disabled = true; btn.textContent = "Отправляем…";
      try {
        saveName(author);
        const rows = await window.COLLAB.addIdea({ author, section: secSel.value, kind, title, body });
        $("f-title").value = ""; $("f-body").value = "";
        await reload();
        if (rows && rows[0]) openIdea(rows[0].id);
      } catch (e) { alert("Не получилось отправить: " + e.message); }
      btn.disabled = false; btn.textContent = "Опубликовать идею";
    });
  }

  /* ————— счётчики ————— */
  function renderStats() {
    $("stat-ideas").textContent = state.ideas.length;
    $("stat-comments").textContent = state.comments.length;
    $("stat-votes").textContent = Object.values(state.voteCount).reduce((a, b) => a + b, 0);
  }

  /* ————— лента GitHub на человеческом языке ————— */
  const GH = "https://api.github.com/repos/" + (window.COLLAB_CONFIG.repo || "");

  function ghHuman(ev) {
    const who = ev.actor ? ev.actor.login : "кто-то";
    const p = ev.payload || {};
    switch (ev.type) {
      case "PushEvent": {
        const n = (p.commits || []).length || 1;
        const msg = p.commits && p.commits[0] ? p.commits[0].message.split("\n")[0] : "";
        return { icon: "⬆", text: who + " внёс " + plural(n, "изменение", "изменения", "изменений") +
          " в основную версию" + (msg ? ": «" + msg + "»" : "") };
      }
      case "ForkEvent":
        return { icon: "⑂", text: who + " сделал форк — создал свою личную копию проекта" };
      case "PullRequestEvent": {
        const t = p.pull_request ? "«" + p.pull_request.title + "»" : "";
        if (p.action === "opened") return { icon: "⇄", text: who + " предложил изменения " + t + " — ожидают проверки (pull request №" + p.number + ")" };
        if (p.action === "closed" && p.pull_request && p.pull_request.merged)
          return { icon: "✓", text: "предложение " + who + " " + t + " принято в основную версию" };
        if (p.action === "closed") return { icon: "✕", text: "предложение " + who + " " + t + " закрыто без принятия" };
        return { icon: "⇄", text: who + ": pull request " + t };
      }
      case "IssuesEvent": {
        const t = p.issue ? "«" + p.issue.title + "»" : "";
        return { icon: "◎", text: who + (p.action === "opened" ? " открыл обсуждение " : " обновил обсуждение ") + t };
      }
      case "IssueCommentEvent":
        return { icon: "💬", text: who + " прокомментировал обсуждение" + (p.issue ? " «" + p.issue.title + "»" : "") };
      case "WatchEvent":
        return { icon: "★", text: who + " отметил проект звездой" };
      case "CreateEvent":
        return p.ref_type === "branch" ? { icon: "⎇", text: who + " создал ветку «" + p.ref + "»" } : null;
      default:
        return null;
    }
  }

  async function loadGithubFeed() {
    const list = $("gh-feed");
    try {
      const [repo, events] = await Promise.all([
        fetch(GH).then((r) => r.json()),
        fetch(GH + "/events?per_page=30").then((r) => (r.ok ? r.json() : [])),
      ]);
      $("gh-stats").innerHTML = "";
      $("gh-stats").append(
        el("span", { class: "chip" }, "⑂ " + plural(repo.forks_count || 0, "форк", "форка", "форков")),
        el("span", { class: "chip" }, "★ " + (repo.stargazers_count || 0)),
        el("span", { class: "chip" }, "◎ " + plural(repo.open_issues_count || 0, "открытое обсуждение", "открытых обсуждения", "открытых обсуждений")));
      list.innerHTML = "";
      const items = (Array.isArray(events) ? events : []).map((ev) => ({ ev, h: ghHuman(ev) }))
        .filter((x) => x.h).slice(0, 14);
      if (!items.length) {
        list.append(el("div", { class: "dim" }, "Пока тихо: событий за последнее время нет."));
        return;
      }
      for (const { ev, h } of items) {
        list.append(el("div", { class: "gh-item" },
          el("span", { class: "gh-ico mono" }, h.icon),
          el("div", {},
            el("div", { style: "font-size:var(--t-sm)" }, h.text),
            el("div", { class: "dim mono", style: "font-size:var(--t-xs)" }, timeAgo(ev.created_at)))));
      }
    } catch (e) {
      list.innerHTML = "";
      list.append(el("div", { class: "dim" }, "Не удалось загрузить события GitHub (возможно, исчерпан лимит запросов — обновится позже)."));
    }
  }

  /* ————— запуск ————— */
  window.initIdeasPage = function () {
    initGraph();
    initForm();
    if (!window.COLLAB.ready) {
      $("g-nocfg").classList.remove("hide");
      $("f-send").disabled = true;
    } else {
      reload();
      window.COLLAB.subscribe(reload);
    }
    loadGithubFeed();
    setInterval(loadGithubFeed, 60000);
  };
})();
