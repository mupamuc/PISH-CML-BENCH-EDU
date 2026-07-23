/* Живые данные пилотного тенанта ИСУ (university-saas): читает
   data/isu-public.json — анонимизированный агрегат, который доставляет
   плагин university-lk автопушем в этот репозиторий (см. решение §6 п.6
   плана интеграции, docs/PLAN-university-saas-integration.md).

   Формат файла — university_lk_analytics_public_export():
     { generated_at, teams:[{team,stage,risk,accepted,total}],
       stages:{<код>:<число команд>}, competencies:{total,uncovered},
       disciplines:<число> }
   Команды уже анонимны («Команда N»), персональных данных нет.
   Файл может быть пуст (0 команд) — на пилоте ещё не запущены проекты. */
(function () {
  // Стадии сквозного проекта по умолчанию (S1..S4) совпадают по смыслу
  // со стадиями стенда (С1..С4 в assets/data.js) — переиспользуем их
  // цвет/название для узнаваемости; неизвестный код стадии (вуз мог
  // настроить свой справочник) просто печатается как есть.
  var STAGE_MAP = { S1: 1, S2: 2, S3: 3, S4: 4 };

  function stageMeta(code) {
    var D = window.DATA;
    var id = STAGE_MAP[code];
    var s = id && D ? D.STAGES.find(function (x) { return x.id === id; }) : null;
    return s
      ? { tag: s.tag, name: s.name, color: 'var(' + s.var + ')' }
      : { tag: code || '—', name: '', color: 'var(--text-mut)' };
  }

  function fmtDate(mysql) {
    if (!mysql) { return ''; }
    var d = new Date(mysql.replace(' ', 'T') + 'Z');
    if (isNaN(d)) { return mysql; }
    return d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' МСК';
  }

  function render(root, data) {
    root.innerHTML = '';
    root.append(el('div', { class: 'kicker' }, 'Живые данные · пилотный тенант ИСУ'));
    root.append(el('h2', { style: 'font-size:var(--t-h2);margin:.3rem 0 .6rem' }, 'Что уже происходит в системе управления'));
    root.append(el('p', { class: 'muted', style: 'max-width:60ch' },
      'Анонимизированный срез из личного кабинета ИСУ (isu.leventsov.ru): счётчики и стадии без имён и файлов — ' +
      'вуз ведёт проекты и учебный план в ИСУ, сюда прилетает только сводка.'));

    if (!data.teams || !data.teams.length) {
      root.append(el('div', { class: 'panel hud', style: 'padding:1.1rem 1.3rem;margin-top:1rem' },
        el('div', {}, 'Пока ноль проектных команд — пилотный тенант в стадии наполнения. Как только в ИСУ заведут первые команды и дисциплины, здесь появится сводка.'),
        data.generated_at ? el('div', { class: 'dim', style: 'font-size:var(--t-xs);margin-top:.5rem;font-family:var(--mono)' }, 'обновлено: ' + fmtDate(data.generated_at)) : null));
      return;
    }

    // мини пайплайн по стадиям
    var stageCodes = Object.keys(data.stages || {});
    if (stageCodes.length) {
      var pipe = el('div', { class: 'pipe', style: 'margin-block:1.2rem' });
      stageCodes.forEach(function (code) {
        var meta = stageMeta(code);
        var n = data.stages[code];
        pipe.append(el('div', { class: 'pcell', style: '--c:' + meta.color },
          el('div', { class: 't' }, meta.tag),
          meta.name ? el('div', { class: 'n' }, meta.name) : null,
          el('div', { class: 'cnt' }, n + ' ' + plural(n, 'команда', 'команды', 'команд'))));
      });
      root.append(pipe);
    }

    // карточки команд (без имён и миссий — только то, что реально отдаёт ИСУ)
    var box = el('div', { class: 'grid teams' });
    data.teams.forEach(function (t) {
      var meta = stageMeta(t.stage);
      var pct = t.total > 0 ? Math.round(100 * t.accepted / t.total) : 0;
      box.append(el('div', { class: 'panel team hud', style: 'cursor:default' },
        el('div', { class: 'top' },
          el('div', {}, el('h3', {}, t.team)),
          el('span', { class: 'chip', style: 'color:' + riskColor(t.risk) }, el('i', { class: 'dot' }), riskLabel(t.risk))),
        el('div', { class: 'chip mt-m', style: 'color:' + meta.color }, el('i', { class: 'dot' }), meta.tag + (meta.name ? ' · ' + meta.name : '')),
        el('div', { class: 'barwrap' },
          el('div', { class: 'barlbl' }, el('span', {}, 'артефакты принято'), el('span', {}, t.accepted + ' / ' + t.total)),
          el('div', { class: 'bar' }, el('i', { style: 'width:' + pct + '%;background:' + meta.color })))));
    });
    root.append(box);

    var footBits = [];
    if (data.disciplines) { footBits.push(data.disciplines + ' ' + plural(data.disciplines, 'дисциплина', 'дисциплины', 'дисциплин') + ' в учебном плане'); }
    if (data.competencies && data.competencies.total) {
      footBits.push('покрытие компетенций: ' + (data.competencies.total - data.competencies.uncovered) + ' / ' + data.competencies.total);
    }
    root.append(el('div', { class: 'legend', style: 'margin-top:1rem' },
      footBits.length ? el('span', {}, footBits.join(' · ')) : null,
      data.generated_at ? el('span', { class: 'dim' }, 'обновлено: ' + fmtDate(data.generated_at)) : null));
  }

  function plural(n, a, b, c) {
    var m = n % 100, d = n % 10;
    if (m >= 11 && m <= 14) { return c; }
    if (d === 1) { return a; }
    if (d >= 2 && d <= 4) { return b; }
    return c;
  }

  window.mountIsuLive = function (rootId) {
    var root = document.getElementById(rootId);
    if (!root) { return; }
    fetch('data/isu-public.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) { throw new Error('http ' + r.status); } return r.json(); })
      .then(function (data) { render(root, data); })
      .catch(function () {
        // Файл ещё не доставлен автопушем или страница открыта локально
        // без сервера (fetch по file:// блокируется браузером) — секцию
        // просто не показываем, демо-контент выше не страдает.
        root.remove();
      });
  };
})();
