/* CRM-кусок платформы: грант-радар + Service Desk + чат.
   Демо, но рабочее: ключевые слова, заявки и сообщения хранятся в localStorage. */
window.CRM = (function () {
  const E = window.el;
  const LS = { kw: "crm_kw_v1", sd: "crm_sd_v1", chat: "crm_chat_v1" };
  const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  let seq = load("crm_seq", 100);
  const nextId = () => { seq++; save("crm_seq", seq); return seq; };

  const DEFAULT_KW = ["БПЛА", "беспилот", "цифровой двойник", "композит", "аэродинамик",
    "прочность", "ИИ", "машинное обучение", "VTOL", "автономн", "рой", "мониторинг",
    "агро", "логистика", "сертификац", "оптимизац"];

  // каталог грантов/конкурсов (сид; в проде — из парсера-скаута)
  const GRANTS = [
    { id: "umnik", title: "УМНИК", org: "Фонд содействия инновациям (ФСИ)", type: "грант", deadline: "2026-09-15", amount: "500 тыс ₽", url: "https://fasie.ru", tags: ["студент", "НИОКР", "БПЛА", "ИИ"], desc: "Гранты молодым учёным на НИОКР, в т.ч. по беспилотным системам и ИИ." },
    { id: "startup", title: "Студенческий стартап", org: "ФСИ", type: "грант", deadline: "2026-10-01", amount: "1 млн ₽", url: "https://fasie.ru", tags: ["студент", "стартап", "агро", "логистика", "мониторинг"], desc: "Грант на запуск стартапа: агромониторинг, логистика, инспекция." },
    { id: "rnf", title: "РНФ · молодёжный грант", org: "Российский научный фонд", type: "грант", deadline: "2026-11-20", amount: "1.5 млн ₽/год", url: "https://рнф.рф", tags: ["наука", "цифровой двойник", "композит", "прочность"], desc: "Фундаментальные и поисковые исследования: цифровые двойники, механика композитов." },
    { id: "kiberdrom", title: "Кибердром", org: "НТИ · соревнования БАС", type: "конкурс", deadline: "2026-08-30", amount: "призовой фонд", url: "https://nti2035.ru", tags: ["БПЛА", "автономн", "рой", "соревнование"], desc: "Соревнования автономных и роевых беспилотников." },
    { id: "arhipelag", title: "Архипелаг 2026", org: "НТИ / Платформа", type: "интенсив", deadline: "2026-07-25", amount: "акселерация", url: "https://nti2035.ru", tags: ["БАС", "стартап", "рой", "ИИ"], desc: "Проектно-образовательный интенсив по БАС и новым рынкам." },
    { id: "npp-bas", title: "Кадры для БАС (НПП)", org: "Минпромторг / нацпроект", type: "НИОКР", deadline: "2026-12-10", amount: "по конкурсу", url: "https://government.ru", tags: ["БАС", "кадры", "сертификац", "мониторинг"], desc: "Национальный проект: разработка и сертификация БАС, подготовка кадров." },
    { id: "prioritet", title: "Приоритет-2030 · внутр. грант СПбПУ", org: "СПбПУ", type: "грант", deadline: "2026-09-05", amount: "300–700 тыс ₽", url: "https://spbstu.ru", tags: ["цифровой двойник", "инжиниринг", "аэродинамик", "оптимизац"], desc: "Внутренние гранты на цифровой инжиниринг и двойники изделий." },
    { id: "rfrit", title: "РФРИТ · цифровые решения", org: "РФРИТ", type: "грант", deadline: "2026-10-30", amount: "до 6 млн ₽", url: "https://рфрит.рф", tags: ["ПО", "ИИ", "платформа", "автономн"], desc: "Гранты на разработку российского ПО, ИИ и автономных систем." },
    { id: "hackathon", title: "Хакатон «Цифровой инжиниринг»", org: "ПИШ СПбПУ", type: "хакатон", deadline: "2026-08-12", amount: "призы + стажировки", url: "https://pish.spbstu.ru", tags: ["цифровой двойник", "оптимизац", "композит", "CAE"], desc: "Командный хакатон по CAE, оптимизации и цифровым двойникам." },
    { id: "minobr-niokr", title: "НИОКР по БАС", org: "Минобрнауки", type: "НИОКР", deadline: "2027-01-15", amount: "по конкурсу", url: "https://minobrnauki.gov.ru", tags: ["БАС", "НИОКР", "сертификац", "мониторинг", "VTOL"], desc: "Прикладные НИОКР: аппараты вертикального взлёта, сертификация, мониторинг." },
  ];

  const ASSIGNEES = ["РОП", "Команда «Стриж»", "Команда «Капля»", "Команда «Сокол»", "Команда «Гриф»", "Преподаватель (ВМ)", "Студент-лид заявки"];
  const STATUSES = [
    ["новая", "var(--text-dim)"], ["назначена", "var(--cyan)"], ["в работе", "var(--amber)"],
    ["подана", "var(--violet)"], ["принята", "var(--lime)"], ["отклонена", "var(--rose)"],
  ];
  const statusColor = s => (STATUSES.find(x => x[0] === s) || [])[1] || "var(--text-mut)";

  // ---- состояние ----
  let kws = load(LS.kw, DEFAULT_KW.slice());
  let tickets = load(LS.sd, []);
  let chat = load(LS.chat, seedChat());

  function seedChat() {
    return {
      channels: [
        { id: "dir-rop", name: "Дирекция ↔ РОП", who: ["Директор", "РОП"] },
        { id: "rop-strizh", name: "РОП ↔ команда «Стриж»", who: ["РОП", "Команда «Стриж»"] },
        { id: "teachers", name: "Преподаватели профиля", who: ["Директор", "Преподаватели"] },
        { id: "grants", name: "Гранты и заявки", who: ["Директор", "РОП", "Студент-лид"] },
      ],
      msgs: {
        "dir-rop": [
          { a: "Директор", t: "Проверьте радар грантов — Кибердром и Архипелаг близко по срокам.", ts: "09:10" },
          { a: "РОП", t: "Да, назначаю «Сокол» на Кибердром (роевая функция подходит).", ts: "09:24" },
        ],
        "rop-strizh": [{ a: "РОП", t: "«Стриж», ваш мониторинг ЛЭП подходит под Студстартап. Подготовьте заявку.", ts: "10:02" }],
        "teachers": [{ a: "Директор", t: "Нужен ментор по CAE на хакатон ПИШ.", ts: "11:15" }],
        "grants": [{ a: "Студент-лид", t: "Собрал черновик заявки УМНИК, нужна проверка.", ts: "12:40" }],
      },
    };
  }
  let curChannel = "dir-rop";

  // ---- матчинг ----
  function matchKw(g) {
    const hay = (g.title + " " + g.desc + " " + g.tags.join(" ")).toLowerCase();
    return kws.filter(k => k.trim() && hay.includes(k.trim().toLowerCase()));
  }
  function matchProjects(g) {
    const teams = (window.DATA && window.DATA.TEAMS) || [];
    return teams.filter(t => {
      const hay = (t.mission + " " + t.type + " " + t.name).toLowerCase();
      return g.tags.some(tag => { const s = tag.toLowerCase().slice(0, 5); return s.length >= 3 && hay.includes(s); });
    });
  }
  function relevantGrants() {
    return GRANTS.map(g => ({ g, hits: matchKw(g), projects: matchProjects(g) }))
      .filter(x => x.hits.length > 0)
      .sort((a, b) => b.hits.length - a.hits.length || a.g.deadline.localeCompare(b.g.deadline));
  }

  // ---- рендер ----
  let refs = {};
  function highlight(text, terms) {
    let out = [text];
    // подсветка первого совпавшего термина в заголовке (упрощённо)
    return text;
  }

  function mount(root) {
    root.innerHTML = "";
    // 1) грант-радар
    const radar = E("div", { class: "panel card hud" },
      E("h3", {}, E("span", {}, "Гранты, НИОКР, конкурсы · радар"),
        E("span", { class: "chip", style: "color:var(--brand-2)" }, "скаут по ключевым словам")));
    radar.append(kwEditor());
    refs.grants = E("div", {});
    radar.append(refs.grants);
    root.append(radar);
    renderGrants();

    // 2) SD + чат
    const row = E("div", { class: "cols c2", style: "margin-top:1rem" });
    refs.sd = E("div", {});
    refs.chat = E("div", {});
    row.append(refs.sd, refs.chat);
    root.append(row);
    renderSD();
    renderChat();
  }

  function kwEditor() {
    const box = E("div", { class: "kw-edit" });
    const chips = E("div", { class: "kw-chips" });
    kws.forEach((k, i) => chips.append(
      E("span", { class: "kw-chip" }, k,
        E("button", { title: "убрать", onclick: () => { kws.splice(i, 1); save(LS.kw, kws); mountKwAndGrants(); } }, "✕"))));
    const inp = E("input", { class: "kw-input", placeholder: "+ ключевое слово…", onkeydown: (e) => {
      if (e.key === "Enter" && e.target.value.trim()) {
        kws.push(e.target.value.trim()); save(LS.kw, kws); mountKwAndGrants();
      }
    }});
    const reset = E("button", { class: "chip", style: "cursor:pointer", onclick: () => { kws = DEFAULT_KW.slice(); save(LS.kw, kws); mountKwAndGrants(); } }, "сбросить");
    box.append(E("div", { class: "note", style: "margin-bottom:.5rem" }, "Директор задаёт тематики — радар фильтрует релевантные гранты. Enter добавляет:"),
      chips, E("div", { class: "flex gap-s center", style: "margin-top:.5rem" }, inp, reset));
    return box;
  }
  function mountKwAndGrants() {
    // перерисовать редактор ключей (в radar) и список
    const radar = refs.grants.parentNode;
    radar.replaceChild(kwEditor(), radar.children[1]); // [0]=h3,[1]=kwEditor
    renderGrants();
  }

  function renderGrants() {
    const list = refs.grants; list.innerHTML = "";
    const rel = relevantGrants();
    list.append(E("div", { class: "note", style: "margin:.6rem 0" },
      "Релевантных: " + rel.length + " из " + GRANTS.length + " · отсортировано по совпадениям и сроку"));
    rel.forEach(({ g, hits, projects }) => {
      const card = E("div", { class: "grant" },
        E("div", { class: "grant-head" },
          E("div", {}, E("b", {}, g.title), E("span", { class: "dim", style: "font-size:var(--t-xs)" }, "  " + g.org)),
          E("span", { class: "chip", style: "color:var(--violet)" }, g.type)),
        E("div", { class: "grant-meta" },
          E("span", { class: "chip" }, "срок: " + g.deadline),
          E("span", { class: "chip" }, g.amount),
          ...hits.slice(0, 4).map(h => E("span", { class: "chip", style: "color:var(--brand-2)" }, "⌗ " + h))),
        E("div", { class: "dim", style: "font-size:var(--t-sm);margin:.4rem 0" }, g.desc));
      if (projects.length) {
        card.append(E("div", { class: "grant-match" },
          E("span", { class: "dim", style: "font-size:var(--t-xs)" }, "подходят проекты: "),
          ...projects.map(p => E("span", { class: "chip", style: "color:var(--cyan)" }, p.name))));
      }
      card.append(E("div", { class: "flex gap-s", style: "margin-top:.6rem" },
        E("button", { class: "btn btn-primary btn-sm", onclick: () => openTaskModal(g, projects) }, "Направить задачу →"),
        E("a", { class: "btn btn-ghost btn-sm", href: g.url, target: "_blank", rel: "noopener" }, "сайт")));
      list.append(card);
    });
    if (!rel.length) list.append(E("div", { class: "dim" }, "Нет совпадений — измените ключевые слова."));
  }

  // ---- Service Desk ----
  function renderSD() {
    const box = refs.sd; box.innerHTML = "";
    box.append(E("h3", {}, E("span", {}, "Service Desk · заявки на гранты"),
      E("span", { class: "chip", style: "color:var(--cyan-dim)" }, tickets.length + " задач")));
    box.className = "panel card hud";
    if (!tickets.length) { box.append(E("div", { class: "note", style: "margin-top:.6rem" }, "Пока нет задач. Направьте задачу из радара грантов слева — она появится здесь с трекингом статуса.")); return; }
    tickets.slice().reverse().forEach(tk => {
      box.append(E("div", { class: "sd-ticket" },
        E("div", { style: "flex:1;min-width:0" },
          E("div", { style: "font-weight:560" }, tk.title),
          E("div", { class: "note" }, "→ " + tk.assignee + " · срок " + tk.due + (tk.note ? " · " + tk.note : ""))),
        statusSelect(tk)));
    });
  }
  function statusSelect(tk) {
    const sel = E("select", { class: "sd-status", style: "border-color:" + statusColor(tk.status),
      onchange: (e) => { tk.status = e.target.value; save(LS.sd, tickets); renderSD(); } });
    STATUSES.forEach(([s]) => { const o = E("option", { value: s }, s); if (s === tk.status) o.selected = true; sel.append(o); });
    return sel;
  }

  // ---- модалка «направить задачу» ----
  function openTaskModal(g, projects) {
    const ov = E("div", { class: "crm-ov" });
    ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
    const defaultAssignee = projects[0] ? projects[0].name : "РОП";
    const assSel = E("select", { class: "sd-status", style: "width:100%" },
      ...ASSIGNEES.map(a => { const o = E("option", { value: a }, a); if (a === defaultAssignee) o.selected = true; return o; }));
    const due = E("input", { class: "kw-input", type: "date", value: g.deadline, style: "width:100%" });
    const note = E("textarea", { class: "kw-input", rows: "2", placeholder: "комментарий (необязательно)", style: "width:100%;resize:vertical" });
    const modal = E("div", { class: "panel crm-modal hud" },
      E("button", { class: "rd-x", onclick: () => ov.remove() }, "✕"),
      E("div", { class: "kicker" }, "новая задача · Service Desk"),
      E("h3", { style: "margin:.3rem 0 1rem" }, g.title),
      field("Исполнитель", assSel),
      field("Срок (до дедлайна гранта)", due),
      field("Комментарий", note),
      E("div", { class: "flex gap-s", style: "margin-top:1rem" },
        E("button", { class: "btn btn-primary btn-sm", onclick: () => {
          tickets.push({ id: nextId(), grant: g.id, title: "Заявка: " + g.title, assignee: assSel.value, due: due.value, note: note.value.trim(), status: "назначена", created: g.deadline });
          save(LS.sd, tickets); ov.remove(); renderSD();
          // отметка в чате «Гранты»
          postSystem("grants", "Создана задача по «" + g.title + "» → " + assSel.value);
        } }, "Создать задачу"),
        E("button", { class: "btn btn-ghost btn-sm", onclick: () => ov.remove() }, "Отмена")));
    ov.append(modal); document.body.append(ov);
  }
  function field(label, ctrl) {
    return E("div", { style: "margin-bottom:.7rem" },
      E("div", { class: "note", style: "margin-bottom:.25rem" }, label), ctrl);
  }

  // ---- чат ----
  function renderChat() {
    const box = refs.chat; box.innerHTML = ""; box.className = "panel card hud";
    box.append(E("h3", {}, E("span", {}, "Коммуникации · чат"),
      E("span", { class: "chip", style: "color:var(--cyan-dim)" }, "роли")));
    const chans = E("div", { class: "ch-list" });
    chat.channels.forEach(c => chans.append(
      E("button", { class: "ch-item" + (c.id === curChannel ? " on" : ""), onclick: () => { curChannel = c.id; renderChat(); } }, c.name)));
    box.append(chans);
    const thread = E("div", { class: "ch-thread" });
    (chat.msgs[curChannel] || []).forEach(m => thread.append(
      E("div", { class: "cmsg" + (m.a === "Директор" ? " me" : "") },
        E("div", { class: "cwho" }, m.a + " · " + m.ts), E("div", {}, m.t))));
    box.append(thread);
    const inp = E("input", { class: "kw-input", placeholder: "сообщение от лица Директора…", onkeydown: (e) => {
      if (e.key === "Enter" && e.target.value.trim()) { postMsg(curChannel, "Директор", e.target.value.trim()); }
    }});
    box.append(E("div", { class: "chat-input" }, inp,
      E("button", { class: "btn btn-primary btn-sm", onclick: () => { const v = inp.value.trim(); if (v) postMsg(curChannel, "Директор", v); } }, "→")));
  }
  function nowHM() { return "—"; } // без Date в детерм.среде; метка условная
  function postMsg(ch, author, text) {
    (chat.msgs[ch] = chat.msgs[ch] || []).push({ a: author, t: text, ts: "сейчас" });
    save(LS.chat, chat); renderChat();
  }
  function postSystem(ch, text) {
    (chat.msgs[ch] = chat.msgs[ch] || []).push({ a: "Система", t: text, ts: "сейчас" });
    save(LS.chat, chat);
  }

  return { mount };
})();
