/* Клиент хранилища идей: Supabase REST + обновления в реальном времени.
   Без SDK — обычный fetch к PostgREST; realtime через supabase-js с CDN,
   если CDN недоступен — автоматический переход на опрос раз в 30 секунд. */
(function () {
  const cfg = window.COLLAB_CONFIG || {};
  const ready = !!(cfg.url && cfg.anonKey);

  const HEADERS = ready ? {
    apikey: cfg.anonKey,
    Authorization: "Bearer " + cfg.anonKey,
    "Content-Type": "application/json",
  } : {};

  async function rest(path, opts = {}) {
    const res = await fetch(cfg.url + "/rest/v1/" + path, {
      ...opts,
      headers: { ...HEADERS, ...(opts.headers || {}) },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error("Хранилище ответило ошибкой " + res.status + ": " + text);
      err.status = res.status;
      throw err;
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null; // 201/204 могут приходить с пустым телом
  }

  // анонимный идентификатор устройства (для защиты от повторного голоса)
  function clientId() {
    let id = null;
    try { id = localStorage.getItem("collab_client_id"); } catch (e) {}
    if (!id) {
      id = "c-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { localStorage.setItem("collab_client_id", id); } catch (e) {}
    }
    return id;
  }

  async function fetchAll() {
    const [ideas, comments, votes] = await Promise.all([
      rest("ideas?select=*&order=created_at.asc"),
      rest("comments?select=*&order=created_at.asc"),
      rest("votes?select=idea_id,client_id"),
    ]);
    const voteCount = {};
    const myVotes = new Set();
    const me = clientId();
    for (const v of votes) {
      voteCount[v.idea_id] = (voteCount[v.idea_id] || 0) + 1;
      if (v.client_id === me) myVotes.add(v.idea_id);
    }
    return { ideas, comments, voteCount, myVotes };
  }

  function addIdea({ author, section, kind, title, body }) {
    return rest("ideas", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ author, section, kind, title, body }),
    });
  }

  function addComment({ ideaId, author, body }) {
    return rest("comments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ idea_id: ideaId, author, body }),
    });
  }

  async function vote(ideaId) {
    try {
      await rest("votes", {
        method: "POST",
        body: JSON.stringify({ idea_id: ideaId, client_id: clientId() }),
      });
      return true;
    } catch (e) {
      if (e.status === 409) return false; // уже голосовали с этого устройства
      throw e;
    }
  }

  /* Подписка на изменения. onChange вызывается при любом добавлении данных.
     Realtime (websocket) — если на странице загрузился supabase-js; иначе опрос. */
  function subscribe(onChange) {
    if (!ready) return;
    if (window.supabase && window.supabase.createClient) {
      try {
        const client = window.supabase.createClient(cfg.url, cfg.anonKey);
        client.channel("collab-live")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "ideas" }, onChange)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, onChange)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "votes" }, onChange)
          .subscribe();
        return;
      } catch (e) { /* нет realtime — ниже включится опрос */ }
    }
    setInterval(onChange, 30000);
  }

  window.COLLAB = { ready, fetchAll, addIdea, addComment, vote, subscribe, clientId };
})();
