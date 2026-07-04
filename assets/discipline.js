/* Детальная страница дисциплины + читалка лекции + тест самоконтроля.
   Надстройка над Moodle: контент курса читается прямо в платформе. */
(function () {
  const E = window.el;

  // бейдж типа файла
  const FT = { docx:["DOCX","var(--brand)"], pptx:["PPTX","var(--amber)"],
    pdf:["PDF","var(--rose)"], lecture:["ЛЕКЦИЯ","var(--brand-2)"], quiz:["ТЕСТ","var(--violet)"] };
  function ftype(t){ const [l,c]=FT[t]||["FILE","var(--text-dim)"];
    return E("span",{class:"ftype",style:"--fc:"+c},l); }

  const ICON = {
    read:  "Читать в платформе",
    quiz:  "Пройти самоконтроль",
    download: "Скачать",
  };

  // ——— детальная страница дисциплины ———
  window.buildDisciplineDetail = function (code, backFn) {
    const wrap = E("div", { class: "disc-detail" });
    wrap.append(E("button", { class: "btn btn-ghost", style:"margin-bottom:1.2rem", onclick: backFn },
      "← Все дисциплины"));

    if (code !== window.COURSE_VM.code) {
      // заглушка для прочих дисциплин
      const d = window.DATA.D.find(x => x.code === code) || {};
      wrap.append(
        E("div", { class:"panel card hud" },
          E("div",{class:"kicker"}, code + " · " + d.ze + " з.е. · С" + d.sem),
          E("h1",{style:"font-size:var(--t-h1);margin-top:.4rem"}, d.name || code),
          E("div",{class:"stub mt-l"},
            E("div",{class:"stub-ic"},"◔"),
            E("div",{},
              E("div",{style:"font-weight:600"},"Материалы дисциплины готовятся"),
              E("div",{class:"dim",style:"margin-top:.3rem"},
                "Программа, лекции, практика и тесты появятся здесь по мере наполнения кафедрой. Для курса «Вычислительная механика» материалы уже загружены — откройте его для примера."),
              E("div",{class:"flex gap-m mt-m"},
                E("a",{class:"chip",href:"#"},"Moodle-курс (LTI)"),
                E("a",{class:"chip",style:"color:var(--brand)",href:"#",
                  onclick:(e)=>{e.preventDefault(); backFn(); setTimeout(()=>window.openDiscipline(window.COURSE_VM.code),50);}},
                  "→ пример: ВМ"))))));
      return wrap;
    }

    const c = window.COURSE_VM;
    // шапка
    wrap.append(E("div",{class:"panel card hud"},
      E("div",{class:"kicker"}, c.code + " · " + c.ze + " з.е. · С" + c.sem + " · " + c.hoursLec + " ч лекций + " + c.hoursPr + " ч практик"),
      E("h1",{style:"font-size:var(--t-h1);margin-top:.4rem"}, c.name),
      E("p",{class:"muted mt-s",style:"max-width:70ch"}, c.overview),
      E("div",{class:"flex gap-m wrap-w mt-m"},
        E("a",{class:"btn btn-ghost",href:c.moodle}, "Открыть в Moodle (LTI) →"),
        E("span",{class:"chip",style:"color:var(--brand-2)"}, E("i",{class:"dot"}), "надстройка: контент читается в платформе"))));

    // программа (16 тем)
    const syl = E("div",{class:"panel card hud mt-m"},
      E("h3",{}, E("span",{},"Программа курса · 16 тем (лекция + практика)"),
        E("span",{class:"chip"}, "тема 8 — материалы загружены")));
    const grid = E("div",{class:"syl"});
    c.topics.forEach(t=>{
      const row = E("div",{class:"syl-row"+(t.filled?" filled":"")+(t.filled?"":" soon"),
        onclick: t.filled ? ()=>document.getElementById("mat-anchor").scrollIntoView({behavior:"smooth"}) : null},
        E("span",{class:"syl-n"}, t.n),
        E("span",{class:"syl-b",title:"блок "+t.block}, t.block),
        E("div",{class:"syl-txt"},
          E("div",{}, t.lecture),
          E("div",{class:"dim",style:"font-size:var(--t-xs)"}, "практика: " + t.practice)),
        t.filled ? E("span",{class:"chip",style:"color:var(--brand-2)"},"материалы")
                 : E("span",{class:"chip dim"},"скоро"));
      grid.append(row);
    });
    syl.append(grid);
    wrap.append(syl);

    // материалы по категориям
    const anchor = E("div",{id:"mat-anchor"});
    wrap.append(anchor);
    const cats = [...new Set(c.materials.map(m=>m.cat))];
    const matWrap = E("div",{class:"panel card hud mt-m"},
      E("h3",{}, E("span",{},"Материалы темы 8 · «CFD: основы»"),
        E("span",{class:"chip",style:"color:var(--brand-2)"}, c.materials.length + " файлов")));
    cats.forEach(cat=>{
      matWrap.append(E("div",{class:"mat-cat"}, cat));
      c.materials.filter(m=>m.cat===cat).forEach(m=>{
        const actBtn = m.act==="read"
          ? E("button",{class:"btn btn-primary btn-sm",onclick:window.openLectureReader}, ICON.read)
          : m.act==="quiz"
          ? E("button",{class:"btn btn-primary btn-sm",onclick:window.openQuiz}, ICON.quiz)
          : E("a",{class:"btn btn-ghost btn-sm",href:m.file,download:""}, ICON.download);
        matWrap.append(E("div",{class:"mat-row"},
          ftype(m.type),
          E("div",{class:"mat-info"},
            E("div",{style:"font-weight:560"}, m.title),
            m.note?E("div",{class:"dim",style:"font-size:var(--t-xs)"}, m.note):null),
          E("span",{class:"mat-size dim mono"}, m.size),
          actBtn));
      });
    });
    wrap.append(matWrap);
    return wrap;
  };

  // ——— overlay helper ———
  function overlay(node){
    const ov = E("div",{class:"disc-ov"});
    ov.addEventListener("click",e=>{ if(e.target===ov) close(); });
    const onKey = e=>{ if(e.key==="Escape") close(); };
    document.addEventListener("keydown",onKey);
    function close(){ ov.remove(); document.removeEventListener("keydown",onKey); }
    ov._close = close;
    ov.append(node);
    document.body.append(ov);
    return ov;
  }

  // ——— читалка лекции ———
  window.openLectureReader = function(){
    const L = window.LECTURE_CFD;
    const body = E("article",{class:"reader-body"});
    L.blocks.forEach(b=>{
      const [t,v]=b;
      if(t==="h2") body.append(E("h2",{class:"rd-h2"},v));
      else if(t==="h3") body.append(E("h3",{class:"rd-h3"},v));
      else if(t==="p") body.append(E("p",{class:"rd-p",html:v}));
      else if(t==="formula") body.append(E("div",{class:"rd-formula",html:v}));
      else if(t==="note") body.append(E("div",{class:"rd-note",html:v}));
      else if(t==="ex") body.append(E("div",{class:"rd-ex",html:v}));
      else if(t==="ol"){ const o=E("ol",{class:"rd-list"}); v.forEach(li=>o.append(E("li",{html:li}))); body.append(o); }
      else if(t==="ul"){ const u=E("ul",{class:"rd-list"}); v.forEach(li=>u.append(E("li",{html:li}))); body.append(u); }
      else if(t==="table"){ body.append(renderTable(v)); }
    });
    const modal = E("div",{class:"panel reader hud"},
      E("button",{class:"rd-x",onclick:()=>ov._close(),"aria-label":"закрыть"},"✕"),
      E("div",{class:"rd-head"},
        E("div",{class:"kicker"}, L.code + " · " + L.topic + " · ~" + L.readMin + " мин"),
        E("h1",{class:"rd-title"}, L.title),
        E("div",{class:"muted",style:"font-size:var(--t-sm)"}, L.subtitle),
        E("div",{class:"flex gap-m mt-m wrap-w"},
          E("button",{class:"btn btn-primary btn-sm",onclick:()=>{ov._close(); window.openQuiz();}},"Проверить себя →"),
          E("a",{class:"btn btn-ghost btn-sm",href:L.src,download:""},"Скачать конспект (DOCX)"))),
      body);
    const ov = overlay(modal);
    modal.scrollTop = 0;
    if (window.annotateTerms) window.annotateTerms(body);
  };

  function renderTable(t){
    const tbl=E("table",{class:"rd-table"});
    tbl.append(E("tr",{}, ...t.head.map(h=>E("th",{},h))));
    t.rows.forEach(r=> tbl.append(E("tr",{}, ...r.map(c=>E("td",{},c)))));
    return E("div",{class:"rd-tablewrap"},tbl);
  }

  // ——— тест самоконтроля ———
  window.openQuiz = function(){
    const Q = window.LECTURE_CFD.quiz;
    let score=0, done=0;
    const list = E("div",{class:"quiz-list"});
    const scoreEl = E("div",{class:"quiz-score"});
    function refresh(){ scoreEl.textContent = "Верно: "+score+" / "+Q.length + (done===Q.length?" — готово":""); }
    Q.forEach((item,qi)=>{
      const opts=E("div",{class:"quiz-opts"});
      let answered=false;
      const expl=E("div",{class:"quiz-expl hide"});
      item.o.forEach((opt,oi)=>{
        const btn=E("button",{class:"quiz-opt",onclick:()=>{
          if(answered) return; answered=true; done++;
          const ok = oi===item.a;
          if(ok){ btn.classList.add("ok"); score++; }
          else { btn.classList.add("bad"); opts.children[item.a].classList.add("ok"); }
          [...opts.children].forEach(b=>b.disabled=true);
          expl.innerHTML = (ok?"✓ Верно. ":"✕ ") + item.e;
          expl.classList.remove("hide");
          refresh();
        }}, opt);
        opts.append(btn);
      });
      list.append(E("div",{class:"quiz-q"},
        E("div",{class:"quiz-qh"}, E("span",{class:"quiz-num"}, (qi+1)), E("span",{}, item.q)),
        opts, expl));
    });
    refresh();
    const modal=E("div",{class:"panel reader hud"},
      E("button",{class:"rd-x",onclick:()=>ov._close(),"aria-label":"закрыть"},"✕"),
      E("div",{class:"rd-head"},
        E("div",{class:"kicker"}, "Самоконтроль · тема 8 · CFD"),
        E("h1",{class:"rd-title"}, "Проверь понимание"),
        E("div",{class:"muted",style:"font-size:var(--t-sm)"}, "Выбери ответ — платформа сразу пояснит. Это тренировка, не оценивание."),
        scoreEl),
      list);
    const ov=overlay(modal);
  };
})();
