/* 모두의 중개사 — 한 장짜리 앱. 화면 다섯: 오늘 · 합격 지도 · 문제 · 출제 분석 · 법령반영 · 설정
   자료(data/*.js)는 전부 엔진\사이트생성.py 산출물이다. 손으로 고치지 않는다.
   ★ 추천은 오늘의리프() 한 곳에서만 고른다(홈과 문제 화면이 서로 다른 걸 권하지 않게). */
(function () {
  "use strict";
  var M = window.META;
  var $view = document.getElementById("view");
  var NO = "①②③④⑤";
  var 차이름 = { 1: "1차", 2: "2차" };

  /* ── 교리(2026-09-23 대표님 전략) ────────────────────────────────────
     과목마다 40점·평균 60점이면 합격 — 전 과목 만점이 아니라 과목별 역할로 푼다.
     근거: 04_분석\전략검토.json(제27~36회 실측) · 그림: 전략\합격설계도.png(04_분석\전략_인포그래픽.py)
     목표를 바꾸면 전략_인포그래픽.py 의 '목표' 와 함께 바꾼다. */
  var 교리 = {
    학개론: { 목표: 75, 역할: "득점", 전술: "비계산은 거의 다 · 계산은 푸는 법만 · 초고난도는 버림" },
    민법: { 목표: 55, 역할: "방어", 전술: "말문제 위주 · 사례형은 30초 판별 후 넘김" },
    중개사법: { 목표: 85, 역할: "득점", 전술: "전 범위 고득점" },
    공법: { 목표: 45, 역할: "과락 방어", 전술: "과락선 16문항 사수 · 빈출만" },
    공시법: { 목표: 55, 역할: "방어", 전술: "빈출 중심" },
    세법: { 목표: 55, 역할: "방어", 전술: "빈출 중심 · 계산은 푸는 법만" }
  };
  var 역할가중 = { "득점": 1.25, "방어": 1, "과락 방어": 1.1 };
  function 사례형(it) { return /[甲乙丙丁]/.test((it.q || "") + (it.b || "")); }
  function 계산형(it) {
    if (/계산|얼마|산정한|산출|구하면|금액은|값은/.test(it.q || "")) return true;
    return (it.ch || []).filter(function (t) { return /\d[\d,.]*\s*(원|%|만원|억|년|개월|㎡)/.test(t); }).length >= 4;
  }

  /* ── 기록 (이 기기 브라우저에만 남는다) ── */
  var KEY = "mj.rec.v1";
  function 읽기() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function 쓰기(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch (e) {} }
  var REC = 읽기();                      // {문항id: {ok:bool, t:ms, n:시도수}}
  function 설정(k, v) {
    try { if (v === undefined) return localStorage.getItem("mj." + k); localStorage.setItem("mj." + k, v); } catch (e) { return null; }
  }

  (function () { var mc = /[?&]cha=(all|1|2)(&|$)/.exec(location.search); if (mc) 설정("cha", mc[1]); })();   /* 미리보기·검사용: ?cha=all */

  /* ── 자료 인덱스 ── */
  var LEAF = {}, SUBJ = {};
  M.과목.forEach(function (s) {
    SUBJ[s.코드] = s;
    s.편.forEach(function (p) { p.장.forEach(function (c) {
      c.과목 = s.코드; c.편이름 = p.이름; LEAF[c.코드] = c;
      c.회당 = c.비중 / 100 * s.시험문항;   // 한 회 시험에서 이 단원이 평균 몇 문항 나오나 — 과목끼리 비교는 이 값으로
    }); });
  });
  var Q = window.Q = window.Q || {};
  function 과목문항(code, cb) {
    if (Q[code]) return cb(Q[code]);
    var el = document.createElement("script");
    el.src = "data/q_" + code + ".js?v=" + M.버전;
    el.onload = function () { cb(Q[code] || []); };
    el.onerror = function () { $view.innerHTML = '<div class="empty">문항 자료를 못 불러왔습니다.</div>'; };
    document.head.appendChild(el);
  }
  /* 기출 해설 — 07_모의고사\기출해설.json 을 회차별 파일(data/h_<회차>.js)로 나눠 필요할 때만 불러온다. 문항에 e:1 이 있는 것만 */
  var H = window.H = window.H || {};
  function 기출해설불러오기(r, cb) {
    if (H[r]) return cb();
    var 대기 = 기출해설불러오기.대기 = 기출해설불러오기.대기 || {};
    if (대기[r]) { 대기[r].push(cb); return; }
    대기[r] = [cb];
    var el = document.createElement("script");
    var 끝 = function () { var l = 대기[r]; delete 대기[r]; l.forEach(function (f) { f(); }); };
    el.src = "data/h_" + r + ".js?v=" + M.버전;
    el.onload = 끝; el.onerror = 끝;
    document.head.appendChild(el);
  }
  var C = window.C = window.C || {};
  var 개념장 = {}; (M.개념장 || []).forEach(function (k) { 개념장[k] = 1; });
  function 과목개념(code, cb) {
    if (C[code]) return cb(C[code]);
    var el = document.createElement("script");
    el.src = "data/c_" + code + ".js?v=" + M.버전;
    el.onload = function () { cb(C[code] || {}); };
    el.onerror = function () { $view.innerHTML = '<div class="empty">개념 자료를 못 불러왔습니다.</div>'; };
    document.head.appendChild(el);
  }
  function 등급칩(g) { return g ? '<span class="gchip g' + g + '">' + g + "</span>" : ""; }
  function 블록(b) {
    var t = b.종류;
    /* 도식 블록(2026-10-25 대표님 「줄글만 줄줄 있으니 공부하기 싫다」) — js/diagram.js 가 그린다 */
    if (b.t && window.DIAGRAM && DIAGRAM.has(b.t)) return '<div class="dgwrap">' + (b.등급 ? 등급칩(b.등급) : "") + DIAGRAM.html(b) + "</div>";
    if (t === "요점") return '<div class="cpt">' + 등급칩(b.등급) + '<div><b class="kw">' + esc(b.제목) + "</b> " + esc(b.글) + "</div></div>";
    if (t === "조문") return '<div class="jo"><span class="ln">' + esc(b.조) + "</span>" + esc(b.글) + "</div>";
    if (t === "비유") return '<div class="tip"><span class="ti">비유 팁</span><div>' + esc(b.글) + "</div></div>";
    if (t === "참고") return '<div class="ref"><span class="rt">참고</span><div>' + esc(b.글) + "</div></div>";
    if (t === "비교") return '<div class="cmp"><div class="cmp-h">' + esc(b.제목 || "한 번에 비교") + '</div><div class="tblwrap"><table><tr>' +
      (b.머리 || []).map(function (x) { return "<th>" + esc(x) + "</th>"; }).join("") + "</tr>" +
      (b.행 || []).map(function (r) { return "<tr>" + r.map(function (x) { return "<td>" + esc(x) + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</table></div>" + (b.결론 ? '<div class="one">' + esc(b.결론) + "</div>" : "") + "</div>";
    if (t === "구조") return '<div class="tree"><div class="tr-root">' + esc(b.제목) + '</div><div class="tr-kids">' +
      (b.갈래 || []).map(function (g) { return '<div class="tr-g"><b>' + esc(g.이름) + "</b>" + (g.항목 || []).map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>"; }).join("") +
      "</div>" + (b.결론 ? '<div class="one">' + esc(b.결론) + "</div>" : "") + "</div>";
    if (t === "소제목") return '<h4 class="csub">' + esc(b.글) + "</h4>";
    return "";
  }
  function 개념(code) {
    탭("tree");
    var c = LEAF[code];
    if (!c) { location.hash = "#/home"; return; }
    과목개념(c.과목, function (all) {
      var d = all[code];
      if (!d) { $view.innerHTML = '<div class="empty">이 단원은 개념 정리가 아직 없습니다. <a href="#/study/' + code + '">기출 풀기</a></div>'; return; }
      var h = 머리({
        sm: 1,
        kicker: '<a href="#/tree/' + c.과목 + '">' + esc(SUBJ[c.과목].약칭) + " 합격 지도</a> · " + esc(c.편이름) + " · 회당 " + c.회당.toFixed(1) + "문항",
        h1: esc(c.이름),
        sub: d.요약 ? '<b>' + esc(d.요약) + "</b>" : "",
        act: '<a class="btn ghost sm" href="#/study/' + code + '">기출 ' + c.문항.length + "문항 풀기</a>"
      }) +
        '<article class="card concept" style="margin-top:20px"><div class="bd">' + (d.블록 || []).map(블록).join("") + "</div></article>" +
        '<a class="btn wide" href="#/study/' + code + '">이 단원 기출 풀기 (' + c.문항.length + "문항)</a>" +
        '<p class="foot">등급 = 제27~36회 중 이 내용이 나온 회차 수 · S 8회↑ · A 4~7 · B 2~3 · C 1</p>';
      $view.innerHTML = h; window.scrollTo(0, 0);
      /* 합격 지도 잎(소제목)에서 왔으면 그 소제목으로 내린다(1025) */
      var 갈곳 = null; try { 갈곳 = sessionStorage.getItem("junggae.csub"); sessionStorage.removeItem("junggae.csub"); } catch (e) {}
      if (갈곳 && 갈곳.split("|")[0] === code) {
        var 소 = $view.querySelectorAll(".csub")[+갈곳.split("|")[1]];
        if (소) setTimeout(function () { 소.scrollIntoView({ behavior: "smooth", block: "start" }); 소.style.background = "var(--red-soft, #FDECEC)"; }, 60);
      }
    });
  }
  function 리프통계(c) {
    var ids = c.문항, done = 0, ok = 0;
    ids.forEach(function (id) { var r = REC[id]; if (r) { done++; if (r.ok) ok++; } });
    return { 전체: ids.length, 푼: done, 맞힌: ok, 이해도: ids.length ? ok / ids.length : 0 };
  }
  /* 하루 공부 시간(분): 30분~4시간. 저장된 값이 한도(240분)를 넘으면 한도 값으로 읽는다. 아직 오늘 분량을 계산하는 곳은 없어 저장만 한다 */
  function 하루분() { var v = parseInt(설정("daymin"), 10); return isNaN(v) ? 0 : Math.max(0, Math.min(240, v)); }
  function 응시차() { return 설정("cha") || "all"; }
  function 대상과목() {
    var c = 응시차();
    return M.과목.filter(function (s) { return c === "all" || String(s.차) === c; });
  }

  function 과목정답률(s) {
    var ok = 0, done = 0;
    s.편.forEach(function (p) { p.장.forEach(function (c) { var st = 리프통계(c); ok += st.맞힌; done += st.푼; }); });
    return done >= 10 ? ok / done : null;       // 10문항은 풀어야 정답률로 본다
  }
  function 목표가중(s) {
    // 교리: 득점 과목을 먼저, 목표에 가까워진 과목은 덜 권한다(만점을 향해 과공부하지 않게)
    var g = 교리[s.코드]; if (!g) return 1;
    var r = 과목정답률(s);
    var 남은길 = r == null ? 1 : Math.max(0.15, Math.min(1.3, (g.목표 - r * 100) / g.목표 + 0.3));
    return (역할가중[g.역할] || 1) * 남은길;
  }

  /* ── 추천: 여기 한 곳 ── */
  function 오늘의리프() {
    var 후보 = [];
    대상과목().forEach(function (s) {
      var 가중 = 목표가중(s);
      s.편.forEach(function (p) {
        p.장.forEach(function (c) {
          if (c.비추천 || !c.문항.length) return;
          var st = 리프통계(c);
          if (st.이해도 >= 0.8) return;
          // 안 댄 곳은 '안댐'만, 푼 곳은 '못함'만 센다 — 둘을 겹쳐 세면 안 댄 곳이 늘 이긴다
          var 남은 = st.푼 === 0 ? 1 : (1 - st.맞힌 / Math.max(1, st.푼)) * 0.9;
          var 점수 = c.회당 * 남은 * (c.최근3회비중 > c.비중 * 1.2 ? 1.2 : 1) * 가중;
          후보.push({ c: c, s: s, 점수: 점수, st: st });
        });
      });
    });
    후보.sort(function (a, b) { return b.점수 - a.점수; });
    return 후보;
  }

  /* ── 유틸 ── */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
  function pct(x, d) { return (x == null ? "–" : (Math.round(x * Math.pow(10, d || 0)) / Math.pow(10, d || 0)) + "%"); }
  function 디데이() {
    var n = 시험까지();
    document.getElementById("dday").innerHTML = n > 0 ? "제" + M.시험.회차 + "회 <b>D-" + n + "</b>" : n === 0 ? "제" + M.시험.회차 + "회 <b>D-DAY</b>" : "제" + M.시험.회차 + "회 시험 종료";
  }
  function spark(회차별) {
    var ks = Object.keys(회차별).sort(), mx = 0;
    ks.forEach(function (k) { mx = Math.max(mx, 회차별[k]); });
    return '<span class="spark" title="제27회~제36회 회차별 출제">' + ks.map(function (k) {
      return '<i style="height:' + (mx ? Math.max(2, 22 * 회차별[k] / mx) : 1) + 'px"></i>';
    }).join("") + "</span>";
  }
  function 탭(on) {
    [].forEach.call(document.querySelectorAll(".navlinks a"), function (a) {
      var 맞음 = a.getAttribute("data-tab") === on;
      a.classList.toggle("on", 맞음);
      if (맞음) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }
  /* 화면 머리 — 테라러닝 공통 .phead (kicker · h1 · sub + 오른쪽 단추) */
  function 머리(o) {
    return '<div class="phead' + (o.sm ? " sm" : "") + (o.hero ? " hero" : "") + '"><div>' +
      (o.kicker ? '<span class="kicker"><i></i><span>' + o.kicker + "</span></span>" : "") +
      "<h1>" + o.h1 + "</h1>" + (o.sub ? '<p class="sub">' + o.sub + "</p>" : "") +
      (o.bar != null ? '<span class="track"><i style="width:' + o.bar + '%"></i></span>' : "") + "</div>" +
      (o.act ? '<div class="pheadact">' + o.act + "</div>" : "") + "</div>";
  }
  /* 풀이 창(tera-pad.js, 화면표준 8절): 계산 문항에만 문제 판 안쪽 위에 「풀이 창」 단추 자리를 둔다. 단계 자료(steps)는 아직 없어 빈 종이·계산기로 연다 */
  function 계산문항(it) {
    var L = LEAF[it.L], 과 = L ? L.과목 : "";
    return !!window.TERA_PAD && (계산형(it) || (/학개론|세법/.test(과) && TERA_PAD.isCalc((it.q || "") + " " + (it.ch || []).join(" "))));
  }
  function 풀이창자리(it) { return 계산문항(it) ? '<div class="padslot" data-k="' + esc(it.i) + '"></div>' : ""; }
  function 풀이창붙이기(it) {
    var s = $view.querySelector(".padslot"); if (!s || !window.TERA_PAD) return;
    var L = LEAF[it.L];
    TERA_PAD.button(s, { key: String(it.i), title: L ? L.이름 : (it.x ? "실전 모의" : "풀이") });
    if (window.__tpadObs) return; window.__tpadObs = 1;
    function 맞춤() {
      var p = document.getElementById("tpad"), 켬 = !!(p && p.classList.contains("on")), r = document.documentElement;
      r.classList.toggle("padon", 켬); r.style.setProperty("--padh", (켬 ? p.offsetHeight : 0) + "px");
      if (켬) { var q = $view.querySelector(".qcard"); if (q) window.scrollTo({ top: Math.max(0, q.getBoundingClientRect().top + window.scrollY - 70), behavior: "smooth" }); }
    }
    new MutationObserver(function () {
      var p = document.getElementById("tpad");
      if (p && !p.__o) { p.__o = 1; new MutationObserver(맞춤).observe(p, { attributes: true, attributeFilter: ["class"] }); 맞춤(); }
    }).observe(document.body, { childList: true });
  }
  /* ── 문제 화면 공용 부품(tera-q.js?v=1111g · tera-q.css · tera-pad.js) 조각 ── */
  var 아이콘 = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 6.5C10.2 5 7.6 4.5 4.5 4.8v13c3.1-.3 5.7.2 7.5 1.7 1.8-1.5 4.4-2 7.5-1.7v-13c-3.1-.3-5.7.2-7.5 1.7zM12 6.5v13"/></svg>',
    pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 19.5l1-4L16 5l3 3L8.5 18.5z"/></svg>',
    conf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.5a2.4 2.4 0 1 1 3.3 2.2c-.7.3-1 .8-1 1.6M12 16.5h.01" stroke-linecap="round"/></svg>'
  };
  var 등급표 = null;
  /* 중요도 등급: 합격 지도와 같은 기준(편마다 한 회 평균 출제 문항 순위, 상위 20% S · 50% A · 80% B · 나머지 C) */
  function 등급(it) {
    var L = LEAF[it.L]; if (!L) return null;
    if (!등급표) {
      var 목 = [];
      대상과목().forEach(function (s) { s.편.forEach(function (p) { 목.push({ k: s.코드 + "." + p.이름, v: p.장.reduce(function (a, c) { return a + c.회당; }, 0) }); }); });
      목.sort(function (a, b) { return b.v - a.v; }); 등급표 = {};
      목.forEach(function (x, i) { var r = i / Math.max(1, 목.length); 등급표[x.k] = !(x.v > 0) ? "C" : r < .2 ? "S" : r < .5 ? "A" : r < .8 ? "B" : "C"; });
    }
    return 등급표[L.과목 + "." + L.편이름] || null;
  }
  function 진행줄(끝낸, 총) {
    return '<div class="tq-prog"><i><u style="width:' + (총 ? Math.round(끝낸 * 100 / 총) : 0) + '%"></u></i><span><b>' + Math.max(0, 총 - 끝낸) + "</b>문제 남았어요</span></div>";
  }
  function 번호줄(번호) { return '<div class="tq-meta"><span class="tq-no">' + 번호 + '번 문제</span><span id="qj-bd"></span><span class="tq-sp"></span><span id="qj-tg"></span></div>'; }
  function 줄채우기(it) {
    var b = document.getElementById("qj-bd"), g = 등급(it);
    if (b && g && window.TERA_Q) TERA_Q.badge(b, { tier: g });
    var t = document.getElementById("qj-tg"); if (t && window.TERA_Q) TERA_Q.toggle(t);
    if (window.TERA_Q) TERA_Q.annotate($view.querySelectorAll(".stem,.pick .t"));
  }
  function 아래줄(o) {
    var 줄 = document.getElementById("qj-bar");
    if (!줄) { 줄 = document.createElement("div"); 줄.id = "qj-bar"; 줄.className = "tq-bar"; document.body.appendChild(줄); }
    줄.innerHTML = (o.도구 || []).map(function (t) { return '<button type="button" class="tq-tool' + (t.on ? " is-on" : "") + '" data-t="' + t.id + '"' + (t.끔 ? " disabled" : "") + ">" + 아이콘[t.icon] + t.글 + "</button>"; }).join("") +
      '<span class="tq-sp"></span><button type="button" class="tq-nav" id="qj-prev" aria-label="이전"' + (o.이전 ? "" : " disabled") + '>‹</button><span class="tq-pos">' + o.위치 + " <small>/ " + o.총 + '</small></span>' +
      '<button type="button" class="tq-nav is-next" id="qj-next"' + (o.다음 ? "" : " disabled") + ">" + (o.다음글 || "다음") + " ›</button>";
    (o.도구 || []).forEach(function (t) { var b = 줄.querySelector('[data-t="' + t.id + '"]'); if (b && t.fn) b.onclick = t.fn; });
    if (o.이전) 줄.querySelector("#qj-prev").onclick = o.이전;
    if (o.다음) 줄.querySelector("#qj-next").onclick = o.다음;
    document.body.classList.add("has-tqbar");
  }
  function 아래줄치우기() { var 줄 = document.getElementById("qj-bar"); if (줄) 줄.remove(); document.body.classList.remove("has-tqbar"); if (window.TERA_PAD && TERA_PAD.penHide) TERA_PAD.penHide(); }
  /* 안쪽 화면(기출·모의고사): 머리띠를 「‹ 이름 · 3 / 34 · ×」로 바꾸고 아래 탭을 숨긴다(화면표준 1·4절). 다른 화면으로 가면 이동() 이 되돌린다 */
  function 안쪽(제목, 글) {
    document.body.classList.add("inner", "notab");
    var g = document.getElementById("gtitle"); if (g) g.textContent = 제목;
    var p = document.getElementById("gpr"); if (p) p.textContent = 글 || "";
  }
  /* 설정·목록: 묶음마다 판 한 장, 안에 묶음 이름(800 16px)과 설명 */
  function 묶음(이름, 메모, 본문) {
    return '<section class="card setc"><div class="bd"><h3 class="sh">' + 이름 + "</h3>" + (메모 ? '<p class="shn">' + 메모 + "</p>" : "") + 본문 + "</div></section>";
  }
  /* 목록 줄: 이름(800 16px) + 오른쪽 화살표 원. 연 태그를 앞에 받는다 */
  function 줄(여는, 이름, 말) { return 여는 + '<span class="rt"><b>' + 이름 + "</b>" + (말 ? "<small>" + 말 + "</small>" : "") + '</span><span class="ar">›</span></a>'; }
  /* 접힌 칸은 열 때 글을 채운다(닫혀 있는 동안 화면에 글이 없다) */
  var 접힘글 = {}, 접힘수 = 0;
  function 접힘(제목, 본문, 클래스) { var k = "z" + (++접힘수); 접힘글[k] = 본문; return '<details class="' + 클래스 + '" data-lz="' + k + '"><summary>' + 제목 + '</summary><div class="lz"></div></details>'; }
  function 접힘붙이기(루트) {
    [].forEach.call((루트 || document).querySelectorAll("details[data-lz]"), function (d) {
      d.addEventListener("toggle", function () { var z = d.querySelector(".lz"); if (d.open && !z.firstChild) z.innerHTML = 접힘글[d.getAttribute("data-lz")] || ""; });
    });
  }
  function 구획(제목, 메모) { return '<div class="sec"><h2>' + 제목 + "</h2>" + (메모 ? '<span class="note">' + 메모 + "</span>" : "") + "</div>"; }

  /* ── 옷 — 테라러닝 공통 셋: 흰 판(기본) · 종이 · 밤 ── */
  var 옷들 = [["white", "흰색"], ["paper", "종이색"], ["night", "어두운색"]];
  var 옷색 = { white: "#FFFFFF", paper: "#FAF8F3", night: "#08090B" };
  function 옷입기(v) {
    if (!옷색[v]) v = "white";
    document.documentElement.setAttribute("data-skin", v);
    설정("skin", v);
    var b = document.getElementById("skinbtn");
    if (b) b.textContent = 옷들.filter(function (x) { return x[0] === v; })[0][1];
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", 옷색[v]);
  }
  function 지금옷() { return document.documentElement.getAttribute("data-skin") || "white"; }

  /* ── 화면: 오늘 ── */
  function 홈() {
    탭("home");
    var 후보 = 오늘의리프();
    var 지금 = new Date(), 남 = 시험까지();
    var h = '<div class="dtl"><small>공인중개사 · ' + (지금.getMonth() + 1) + "월 " + 지금.getDate() + "일</small><h1>" +
      (남 >= 0 ? (남 === 0 ? "D-DAY" : "D-" + 남) : "제" + (M.시험.회차 + 1) + "회") + "</h1></div>";
    /* 첫 방문: 어떤 시험을 보는지부터 — 고르면 그 과목만으로 오늘 할 것을 고른다 */
    if (!설정("cha") && !Object.keys(REC).length) {
      h += '<section class="today first"><h2>어떤 시험을 보나요?</h2>' +
        '<div class="choose">' + [["all", "1·2차 동시", "6과목"], ["1", "1차만", "학개론·민법"], ["2", "2차만", "중개사법·공법·공시·세법"]].map(function (x) {
          return '<button type="button" data-v="' + x[0] + '"><b>' + x[1] + "</b><span>" + x[2] + "</span></button>";
        }).join("") + "</div></section>";
      $view.innerHTML = h;
      [].forEach.call($view.querySelectorAll(".choose button"), function (b) {
        b.onclick = function () { 설정("cha", b.getAttribute("data-v")); 기록남기기("onboard", { cha: b.getAttribute("data-v") }); 홈(); window.scrollTo(0, 0); };
      });
      return;
    }
    var 남은날 = 시험까지();
    var 막판 = (남은날 >= 0 && 남은날 <= 20) || /[?&]rt=1/.test(location.search);
    if (남은날 === 1 || 남은날 === 0) {
      h += 남은날 === 1 ? 전날카드(후보) : 당일카드();
    } else if (막판 && 후보.length) {
      h += 루틴카드(후보, 남은날);
      h += '<details class="more"><summary>다른 추천 단원</summary><div class="list">' +
        후보.slice(1, 7).map(function (x) {
          return '<a href="#/study/' + x.c.코드 + '"><span>' + esc(x.c.이름) + ' <span class="tiny">' + esc(x.s.약칭) + "</span></span><span class=\"tiny\">회당 " + x.c.회당.toFixed(1) + "문항</span></a>";
        }).join("") + "</div></details>";
    } else if (후보.length) {
      var t = 후보[0], c = t.c;
      h += '<section class="today"><span class="kicker">지금 풀 단원</span>' +
        "<h2>" + esc(c.이름) + "</h2>" +
        '<p class="sub">' + esc(t.s.이름) + " · " + esc(c.편이름) + "</p>" +
        '<div class="kv"><div><b>' + c.회당.toFixed(1) + '<small>문항</small></b><span>한 회 평균 출제</span></div>' +
        '<div><b>' + c.문항.length + '<small>문항</small></b><span>최근 10회 기출</span></div>' +
        '<div><b>' + t.st.맞힌 + "<small>/" + t.st.전체 + '</small></b><span>맞힌 문항</span></div></div>' +
        /* 11-06 대표님: 개념 없이 문제부터 금지 — 개념 정리가 있는 단원은 개념부터 */
        '<a class="btn wide" href="' + (개념장[c.코드] ? "#/concept/" : "#/study/") + c.코드 + '">시작</a>' +
        '<details class="more"><summary>다음 추천 단원</summary><div class="list">' +
        후보.slice(1, 7).map(function (x) {
          return '<a href="#/study/' + x.c.코드 + '"><span>' + esc(x.c.이름) + ' <span class="tiny">' + esc(x.s.약칭) + "</span></span><span class=\"tiny\">회당 " + x.c.회당.toFixed(1) + "문항</span></a>";
        }).join("") + "</div></details></section>";
    } else {
      h += '<section class="today"><h2>추천 단원을 전부 80% 이상 맞혔습니다</h2></section>';
    }
    var 오답수 = 오답목록().length, 모H = 모의기록(), 모수 = Object.keys(모H).length;
    h += '<section class="card rows">' +
      줄('<a class="rl" href="#/mock">', "모의고사", 모수 ? "푼 교시 " + 모수 + "개" : "") +
      줄('<a class="rl" href="#/wrong">', "복습", 오답수 ? "복습 문항 " + 오답수 + "개" : "") +
      줄('<a class="rl" href="javascript:void 0" data-zs="1">', "합격 전략", "") +
      줄('<a class="rl" href="#/plan">', "합격 설계도", "") + "</section>";
    // 과목별
    var 차묶음 = {};
    대상과목().forEach(function (s) { (차묶음[s.차] = 차묶음[s.차] || []).push(s); });
    Object.keys(차묶음).forEach(function (cha) {
      h += 구획(차이름[cha] + " 과목") + '<section class="card"><div class="bd">';
      var 합 = 0, n = 0;
      차묶음[cha].forEach(function (s) {
        var tot = 0, ok = 0, done = 0;
        s.편.forEach(function (p) { p.장.forEach(function (c) { var st = 리프통계(c); tot += st.전체; ok += st.맞힌; done += st.푼; }); });
        var 정답률 = done ? ok / done : null;
        if (정답률 != null) { 합 += 정답률 * 100; n++; }
        h += '<a class="subj" href="#/tree/' + s.코드 + '"><span><b>' + esc(s.이름) + '</b> <span class="tiny">' + done + "/" + tot + ' 풀이</span></span>' +
          '<span class="tiny">' + (교리[s.코드] ? "목표 " + 교리[s.코드].목표 + " · " + 교리[s.코드].역할 + " · " : "") + (정답률 == null ? "아직 안 풀었어요" : "내 정답률 " + Math.round(정답률 * 100) + "%") + "</span>" +
          '<span class="track"><i style="width:' + (tot ? 100 * ok / tot : 0) + '%"></i></span></a>';
      });
      h += "</div></section>";
      if (n) h += '<p class="tiny">푼 문항 기준 ' + 차이름[cha] + " 평균 " + Math.round(합 / n) + "점 수준 (" + (합 / n >= 60 ? "합격선 위" : "합격선 60점까지 " + Math.ceil(60 - 합 / n) + "점") + ")</p>";
    });
    h += 베타자리("home");
    $view.innerHTML = h;
    [].forEach.call($view.querySelectorAll("[data-flow]"), function (a) { a.addEventListener("click", function () { 흐름(a.getAttribute("data-flow")); }); });
    [].forEach.call($view.querySelectorAll("[data-zs]"), function (a) { a.addEventListener("click", function () { if (window.ZZSTRAT) ZZSTRAT.open("junggae"); }); });
    [].forEach.call($view.querySelectorAll(".ck button"), function (b) {
      b.onclick = function () { var k = "eve." + b.getAttribute("data-k"), on = 설정(k) !== "1"; 설정(k, on ? "1" : "0"); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); };
    });
    베타붙이기();
  }

  /* ── 시험까지 남은 날(한국 날짜 기준) — 10/30 은 하루 종일 1, 10/31 은 0. ?d=N 으로 미리보기 ── */
  function 시험까지() {
    var m = /[?&]d=(-?\d+)/.exec(location.search); if (m) return +m[1];
    var k = new Date(Date.now() + 9 * 3600000), p = M.시험.일.split("-");
    return Math.round((Date.UTC(+p[0], +p[1] - 1, +p[2]) - Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate())) / 86400000);
  }
  /* 시험 시간표(제37회 시행계획: 1차 100분, 2차 1교시 100분·2교시 50분) */
  var 시간표 = [
    { 차: "1", 이름: "1차", 과목: "부동산학개론 · 민법 및 민사특별법", 시: "09:30", 끝: "11:10", 분: 100 },
    { 차: "2", 이름: "2차 1교시", 과목: "중개사법령·중개실무 · 부동산공법", 시: "13:00", 끝: "14:40", 분: 100 },
    { 차: "2", 이름: "2차 2교시", 과목: "부동산공시법 · 부동산세법", 시: "15:30", 끝: "16:20", 분: 50 }
  ];
  function 내시간표() { var c = 응시차(); return 시간표.filter(function (x) { return c === "all" || x.차 === c; }); }
  function 시간표칸(상태) {
    return '<ol class="tt">' + 내시간표().map(function (x) {
      var s = 상태 ? 상태(x) : "";
      return '<li class="' + s + '"><span class="tm"><b>' + x.시 + "</b>~" + x.끝 + "</span><span class=\"tx\"><b>" + x.이름 + " · " + x.분 + "분</b><span>" + x.과목 + "</span></span>" +
        (s === "now" ? '<span class="mn">지금</span>' : s === "done" ? '<span class="mn">끝</span>' : "") + "</li>";
    }).join("") + "</ol>";
  }
  function 전날카드(후보) {
    var 일 = M.시험.일.replace(/-/g, ".").slice(5), 오답수 = 오답목록().length, 약 = 후보.length ? 후보[0].c : null;
    var 챙김 = [["id", "신분증", "실물 또는 모바일 신분증"], ["card", "수험표", "시험장 주소와 교시별 입실 시각 확인"], ["pen", "컴퓨터용 사인펜", "답안지 표기용"]];
    var h = '<section class="rtc eve" aria-label="시험 전날"><div class="hd2"><div><span class="k">시험 전날 · 내일 ' + 일 + '(토)</span><div class="big">D-1</div></div></div>' +
      '<h3 class="eh">내일 시간표</h3>' + 시간표칸() +
      '<h3 class="eh">챙길 것</h3><div class="ck">' + 챙김.map(function (x) {
        var on = 설정("eve." + x[0]) === "1";
        return '<button type="button" data-k="' + x[0] + '" aria-pressed="' + on + '"' + (on ? ' class="on"' : "") + '><i>✓</i><b>' + x[1] + "</b><span>" + x[2] + "</span></button>";
      }).join("") + '</div>' +
      '<h3 class="eh">오늘 볼 것</h3><div class="list eve-l">' +
      (오답수 ? '<a href="#/wrong" data-flow="w"><span><b>복습</b> <span class="tiny">복습 문항 ' + 오답수 + "개, 최근 것부터</span></span><span>›</span></a>" : "") +
      '<a href="#/fix"><span><b>법령이 바뀐 선지</b> <span class="tiny">' + M.시험.일.replace(/-/g, ".") + " 시행 법령으로 고친 문장</span></span><span>›</span></a>" +
      (약 ? '<a href="' + (개념장[약.코드] ? "#/concept/" : "#/study/") + 약.코드 + '"><span><b>' + esc(약.이름) + '</b> <span class="tiny">' + esc(SUBJ[약.과목].약칭) + " · " + (개념장[약.코드] ? "개념 정리" : "단원 풀이") + "</span></span><span>›</span></a>" : "") +
      "</div></section>";
    return h;
  }
  function 당일카드() {
    var k = new Date(Date.now() + 9 * 3600000), 지금 = ("0" + k.getUTCHours()).slice(-2) + ":" + ("0" + k.getUTCMinutes()).slice(-2);
    if (/[?&]t=(\d\d:\d\d)/.test(location.search)) 지금 = /[?&]t=(\d\d:\d\d)/.exec(location.search)[1];
    var 표 = 내시간표(), 끝남 = 지금 >= 표[표.length - 1].끝;
    var h = '<section class="rtc eve" aria-label="시험 당일"><div class="hd2"><div><span class="k">제' + M.시험.회차 + "회 공인중개사 · " + M.시험.일.replace(/-/g, ".") + '(토)</span><div class="big">' + (끝남 ? "시험 끝" : "D-DAY") + "</div></div></div>" +
      시간표칸(function (x) { return 지금 >= x.끝 ? "done" : 지금 >= x.시 ? "now" : ""; });
    if (끝남) h += '<p class="ft">합격자 발표는 12.02(수)입니다.</p>';
    return h + "</section>";
  }

  /* ── 오늘의 루틴(막판 모드, D-20 이하) — 테라러닝 공통 A안: 세로 길 · 종류별 색 아이콘 · 지금 할 것만 떠 있는 카드
     약점 쟁점 10문항 → 회차 모의 한 교시 → 복습. 끝냈는지는 mj.day.<날짜> 로 센다. */
  function 루틴카드(후보, 남은날) {
    var d = 하루(), 오답수 = 오답목록().length, 약 = 후보[0].c, 다음 = 다음모의(), 진행 = 모의진행();
    var 모의H = 모의기록(), 오늘모의 = Object.keys(모의H).filter(function (k) { var t = new Date(모의H[k].t); return t.toDateString() === new Date().toDateString(); }).sort(function (a, b) { return 모의H[b].t - 모의H[a].t; })[0];
    var 모의g = 진행 ? 교시들[진행.g] : 교시들[다음.g], 모의r = 진행 ? 진행.r : 다음.r, 모의href = "#/mock/" + 모의r + "/" + (진행 ? 진행.g : 다음.g);
    var 항목 = [
      { k: "s", ic: "✎", col: "var(--pt)", 제목: "약점 쟁점 10문항", 말: d.s >= 10 ? "오늘 " + d.s + "문항 풀이" : esc(약.이름) + " · " + esc(SUBJ[약.과목].약칭) + " · 회당 " + 약.회당.toFixed(1) + "문항", 분: 10, href: "#/study/" + 약.코드, 끝: d.s >= 10, 진도: d.s ? Math.min(10, d.s) + "/10" : "" },
      { k: "m", ic: "시", col: "var(--pt)", 제목: 오늘모의 ? "회차 모의 " + 교시들[오늘모의.split("-")[1]].이름 : "회차 모의 " + 모의g.이름, 말: 오늘모의 ? (실전세트(오늘모의.split("-")[0]) ? "실전 " + 오늘모의.split("-")[0].slice(1) : "제" + 오늘모의.split("-")[0]) + "회 · " + 모의H[오늘모의].점수.map(function (x) { return x.점; }).join("·") + "점" : (실전세트(모의r) ? "실전 " + String(모의r).slice(1) : "제" + 모의r) + "회 · " + 모의g.과목.map(function (s) { return SUBJ[s].약칭; }).join("·") + " · 시간 재고", 분: 모의g.분, href: 모의href, 끝: d.m >= 1, 진도: 진행 ? "푸는 중" : "" },
      { k: "w", ic: "↺", col: "var(--pt)", 제목: "복습", 말: 오답수 ? "복습 문항 " + 오답수 + "개, 최근 것부터 10개" : "복습 문항이 생기면 여기로 모입니다", 분: 10, href: "#/wrong", 끝: d.w >= 10 || (!오답수 && d.s >= 10 && d.m >= 1), 진도: d.w ? Math.min(10, d.w) + "/10" : "" }
    ];
    var 지금 = 항목.filter(function (x) { return !x.끝; })[0], nd = 항목.filter(function (x) { return x.끝; }).length;
    if (!지금) { var dn = 루틴날들(); if (dn.indexOf(오늘키()) < 0) { dn.push(오늘키()); 설정("rt.days", JSON.stringify(dn.slice(-60))); } }
    var 남분 = 항목.reduce(function (a, x) { return a + (x.끝 ? 0 : x.분); }, 0);
    var h = '<section class="rtc rt-a' + (지금 ? "" : " alldone") + '" aria-label="오늘의 루틴"><div class="hd2"><div><span class="k">' + (지금 ? "오늘의 루틴 · 시험까지 D-" + 남은날 : "오늘 루틴 끝") + '</span><div class="big">' + nd + "<small> / " + 항목.length + "</small></div></div>" +
      '<div class="hr"><span class="chip">' + (지금 ? 남분 + "분 남음" : "내일 같은 순서로") + "</span></div></div>" +
      '<div class="seg4">' + 항목.map(function (x) { return '<i class="' + (x.끝 ? "done" : x === 지금 ? "now" : "") + '" style="flex:' + x.분 + ' 1 0"></i>'; }).join("") + "</div>" +
      '<ol class="tl">' + 항목.map(function (x, i) {
        var s = x.끝 ? "done" : x === 지금 ? "now" : "up";
        return '<li class="' + s + '" style="--c:' + x.col + '"><span class="nd">' + (x.끝 ? "✓" : x.ic) + "</span>" +
          '<span class="tx">' + (s === "now" ? '<span class="k2">' + (i + 1) + "번째, 지금</span>" : "") + "<b>" + x.제목 + "</b><span>" + x.말 + "</span></span>" +
          '<span class="mn">' + (x.끝 ? "완료" : x.진도 || x.분 + "분") + "</span>" +
          (s === "now" ? '<a class="go" data-flow="' + x.k + '" href="' + x.href + '">' + (x.진도 ? "시작" : "시작") + " →</a>" : "") + "</li>";
      }).join("") + "</ol>";
    if (!지금) h += '<a class="go" data-flow="s" href="#/study/' + (후보[1] || 후보[0]).c.코드 + '">한 세트 더: ' + esc((후보[1] || 후보[0]).c.이름) + "</a>";
    var 날들 = 루틴날들(), NM = ["일", "월", "화", "수", "목", "금", "토"], 칸 = "";
    for (var i = 6; i >= 0; i--) {
      var dd = new Date(); dd.setDate(dd.getDate() - i);
      var kk = dd.getFullYear() + "-" + ("0" + (dd.getMonth() + 1)).slice(-2) + "-" + ("0" + dd.getDate()).slice(-2);
      var 함 = 날들.indexOf(kk) >= 0, 조금 = !함 && (function (x) { return x.s + x.w + x.m > 0; })(하루(kk));
      칸 += '<div class="' + (함 ? "full" : 조금 ? "part" : "") + (i === 0 ? " tdy" : "") + '">' + NM[dd.getDay()] + "<i>" + (함 ? "✓" : "") + "</i></div>";
    }
    var 연속 = 0; for (var j = 0; j < 60; j++) { var x = new Date(); x.setDate(x.getDate() - j); var kx = x.getFullYear() + "-" + ("0" + (x.getMonth() + 1)).slice(-2) + "-" + ("0" + x.getDate()).slice(-2); if (날들.indexOf(kx) >= 0) 연속++; else if (j > 0) break; }
    h += '<div class="wk">' + 칸 + "</div></section>";
    return h;
  }
  function 루틴날들() { try { return JSON.parse(설정("rt.days")) || []; } catch (e) { return []; } }

  /* ── 화면: 합격 지도 ── */
  function 트리(code) {
    탭("tree");
    /* 합격 지도(화면표준 11절): 줄 = 고른 차수의 과목, 칸 = 편, 눌러서 나오는 판에 장(단원)별 진척. avg = 한 회 평균 출제 문항(기출에서 나온 값), pct = 내 이해도 */
    var G = 대상과목().map(function (s) {
      var nodes = s.편.map(function (p) {
        var L = p.장.map(function (c) { var st = 리프통계(c); return { name: c.이름, avg: c.회당, pct: Math.round(st.이해도 * 100), c: c }; });
        var 합 = L.reduce(function (a, l) { return a + l.avg; }, 0);
        var 진 = 합 ? L.reduce(function (a, l) { return a + l.avg * l.pct; }, 0) / 합 : 0;
        return { id: s.코드 + "." + p.이름, name: p.이름, avg: 합, pct: Math.round(진), leaves: L };
      });
      return { name: s.약칭 || s.이름, weight: s.시험문항, nodes: nodes };
    });
    $view.innerHTML = '<div id="streehost"></div>';
    var 남 = 시험까지();
    if (window.TERA_MAP) TERA_MAP.mount(document.getElementById("streehost"), {
      title: "합격 지도", sub: "공인중개사", dday: 남 > 0 ? "D-" + 남 : (남 === 0 ? "D-DAY" : ""), unit: "문항", groups: G, mark: "tier",
      onLeaf: function (l) { location.hash = "#/" + (개념장[l.c.코드] && !리프통계(l.c).푼 ? "concept" : "study") + "/" + l.c.코드; },
      onStart: function (n) {
        var l = n.leaves.filter(function (x) { return x.pct < 80; })[0] || n.leaves[0];
        if (l) location.hash = "#/" + (개념장[l.c.코드] && !리프통계(l.c).푼 ? "concept" : "study") + "/" + l.c.코드;
      }
    });
  }

  /* ── 현행법 기준 정답(대표님 결정 0928 「개정 표시」, 01_DB\현행법표시.json) ──
     f.현행정답 이 있으면 그것으로 채점한다. 빈 배열 = 현행법으로는 정답 없음 → 채점에서 뺀다(맞은 것으로 남긴다). */
  function 정답들(it) { return it.f && it.f.현행정답 ? it.f.현행정답 : it.a; }
  function 채점(it, j) { var a = 정답들(it); return a.length ? a.indexOf(j) >= 0 : null; }
  function 번호들(a) { return a.map(function (x) { return NO[x - 1]; }).join(", "); }
  function 현행판(it) {
    if (!it.f || !it.f.현행표시) return "";
    var a = 정답들(it);
    return '<div class="lawnote nowlaw"><h4>현행법 기준 정답: ' + (a.length ? 번호들(a) : "없음") + "</h4><div>" + esc(it.f.현행표시) + "</div>" +
      '<div class="src">근거: ' + esc(it.f.근거조문 || "") + "</div></div>";
  }
  function 현행꼬리표(it) {
    if (!it.f || !it.f.현행표시) return "";
    return '<span class="tag law">현행법 기준 정답 ' + (정답들(it).length ? "변경" : "없음") + "</span>";
  }

  /* ── 하루 기록(루틴 체크용) — mj.day.<날짜> = {s:단원풀이 수, w:오답풀이 수, m:모의 제출 수} ── */
  function 오늘키() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function 하루(k) { try { return JSON.parse(설정("day." + (k || 오늘키()))) || { s: 0, w: 0, m: 0 }; } catch (e) { return { s: 0, w: 0, m: 0 }; } }
  function 하루더하기(필드) { var d = 하루(); d[필드] = (d[필드] || 0) + 1; 설정("day." + 오늘키(), JSON.stringify(d)); }
  function 흐름(v) { try { if (v === undefined) return sessionStorage.getItem("mj.flow"); if (v) sessionStorage.setItem("mj.flow", v); else sessionStorage.removeItem("mj.flow"); } catch (e) { return null; } }

  /* ── 베타 공통 장치 자리(테라러닝 공통 · 베타 운영 인프라) ──
     모듈(window.TERRA_BETA)이 index.html 에 한 줄로 붙으면 자리마다 mount 를 부른다. 모듈이 없으면 빈 자리로 둔다. */
  function 베타자리(이름) { return '<div class="beta-slot" data-beta="' + 이름 + '"></div>'; }
  function 베타붙이기() {
    var B = window.TERRA_BETA; if (!B || !B.mount) return;
    [].forEach.call(document.querySelectorAll(".beta-slot[data-beta]"), function (el) {
      if (el.getAttribute("data-on")) return; el.setAttribute("data-on", "1");
      try { B.mount(el, { site: "junggae", slot: el.getAttribute("data-beta"), screen: (location.hash || "#/home").slice(2).split("/")[0] || "home" }); } catch (e) { }
    });
  }
  function 기록남기기(이름, 자료) { var B = window.TERRA_BETA; if (B && B.track) try { B.track(이름, 자료 || {}); } catch (e) { } }
  window.MJ_BETA = { 붙이기: 베타붙이기 };
  window.MJ_RENDER = { 몸: function (it) { return 문항몸(it); }, 정돈: 자료정돈 };   /* 보기뭉침검수.py 가 학생 화면과 같은 함수로 그린다 */

  /* ── 화면: 문제 ── */
  /* 자료 글 정돈(2026-10-25 보기 뭉침 검수) — PDF 글자좌표 복원·전사에서 생긴 뭉침을 화면에서 공통 규칙으로 푼다.
     ① 줄바꿈 자리에서 끊긴 조각(「다.」 「ㆍ광역시…」)은 앞줄에 붙인다
     ② 한 줄에 보기가 둘 이상(「ㄱ. 실시설계 ㄴ. 기반시설공사」 「○ 상표권 ○ 임대료」)이면 다음 표지 앞에서 나눈다 — 표지는 차례(ㄱ 다음 ㄴ)일 때만
     ③ 「<보기>가: … 나: …」 「<보기>a. … b. …」 도 같은 방식으로 나눈다 */
  var 자음 = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ", 가나 = "가나다라마바사아자차카타파하", 영 = "abcdefghij";
  function 차례로나누기(l, 차례, 꼴) {
    var 처음 = new RegExp("^\\s*([" + 차례 + "])" + 꼴).exec(l);
    if (!처음) return [l];
    var 나온 = [], 지금 = 차례.indexOf(처음[1]), 시작 = 0;
    for (;;) {
      var 다음 = 차례.charAt(지금 + 1); if (!다음) break;
      var m = new RegExp("\\s+(" + 다음 + ")" + 꼴).exec(l.slice(시작 + 1));
      if (!m) break;
      var 자리 = 시작 + 1 + m.index;
      나온.push(l.slice(시작, 자리).trim()); 시작 = 자리; 지금++;
    }
    나온.push(l.slice(시작).trim());
    return 나온;
  }
  function 자료정돈(t) {
    var 줄 = [];
    String(t).split("\n").forEach(function (l) {
      if (줄.length && /^\s*(다\.\s*$|ㆍ\S)/.test(l) && !/^\s*[○◦]/.test(l)) { 줄[줄.length - 1] += l.trim(); return; }
      줄.push(l);
    });
    var 나온 = [];
    줄.forEach(function (l) {
      var 보 = /^\s*(<보기>|〈보기〉|＜보기＞)\s*(\S.*)$/.exec(l);
      if (보) { 나온.push(보[1]); l = 보[2]; }
      var 조각 = 차례로나누기(l, 자음, "\\s*\\.\\s");
      if (조각.length === 1) 조각 = 차례로나누기(l, 가나, "\\s*:\\s");
      if (조각.length === 1) 조각 = 차례로나누기(l, 영, "\\.\\s");
      if (조각.length === 1) 조각 = 차례로나누기(l, "123456789", "\\.\\s");
      if (조각.length === 1 && /^\s*[○◦]/.test(l)) 조각 = l.split(/\s+(?=[○◦]\s)/);
      나온.push.apply(나온, 조각);
    });
    return 나온.join("\n");
  }
  function 문항몸(it) {
    var q = String(it.q || ""), k = q.indexOf("\n"), 덧 = "";
    if (k > 0) { 덧 = q.slice(k + 1).trim(); q = q.slice(0, k); }   /* 발문 속 조건 줄(○·)은 자료 상자로 */
    return '<p class="stem">' + esc(q) + "</p>" + 보기그리기(it, 덧);
  }
  function 보기그리기(it, 덧) {
    var b = [덧, it.b].filter(Boolean).join("\n");
    if (!b && !(it.img && it.img.length)) return "";
    b = b ? 자료정돈(b) : "";
    var inner = "";
    if (b && b.split("\n").filter(function (l) { return l.indexOf("|") >= 0; }).length >= 2) {
      /* 글과 표를 원래 차례대로 — 이어진 「|」 줄 묶음 하나가 표 하나(표가 둘인 문항: 35회-2차-120) */
      var 묶음 = [];
      b.split("\n").forEach(function (l) {
        var 표줄 = l.indexOf("|") >= 0, 끝 = 묶음[묶음.length - 1];
        if (끝 && 끝.표 === 표줄 && (표줄 || l.trim())) 끝.줄.push(l);
        else if (표줄 || l.trim()) 묶음.push({ 표: 표줄, 줄: [l] });
      });
      inner = 묶음.map(function (m) {
        /* 몸줄이 ①~⑤ 인 표는 선지 표다 — 아래 선지 단추와 두 번 나오므로 뺀다(35회-2차-102·120) */
        if (m.표 && (it.ch || []).length && m.줄.slice(1).length === it.ch.length && m.줄.slice(1).every(function (l, i) { return l.split("|")[0].trim() === "①②③④⑤"[i]; })) return "";
        if (!m.표) return '<div class="dtxt">' + esc(m.줄.join("\n")) + "</div>";
        return '<div class="tblwrap"><table>' + m.줄.map(function (l, i) {
          var cells = l.split("|").map(function (x) { x = x.trim(); return x === "(빈칸)" ? "" : x; });   /* 전사 때 빈 머리칸 자리표 */
          var 머리 = i === 0 && !/^\s*[○◦·\-]/.test(l);   /* 「○ 항목 | 값」 줄로만 된 표는 머리줄이 없다 */
          return "<tr>" + cells.map(function (x) { return 머리 ? "<th>" + esc(x) + "</th>" : "<td>" + esc(x) + "</td>"; }).join("") + "</tr>";
        }).join("") + "</table></div>";
      }).join("");
    } else if (b) {
      inner = esc(b);
    }
    if (it.img && it.img.length && it.bs === "그림") inner += it.img.map(function (u) { return '<img loading="lazy" alt="문항 자료" src="' + u + '">'; }).join("");
    return inner ? '<div class="data tq-box">' + inner + "</div>" : "";   /* 선지 표만 있던 문항은 상자를 그리지 않는다 */
  }
  /* 문항 한 장 — 단원 풀이·복습가 같이 쓴다.
     o = { ids, 찾기(id)→문항, 머리(it,k,n)→html, 필드:"s"|"w", 끝(k)→마지막 문항 뒤 단추 html, 단원:c(선택) } */
  /* 실전 모의 해설 — 07_모의고사 원고(한줄·보기판정·선지판정·근거·개념 표/흐름/비교/계산·함정·개정) */
  function 실전해설(it, 자료) {
    var x = 자료 || it.x, 답 = 정답들(it), h = '<div class="mx">';
    function 판(p) { return p === "옳음" ? '<b class="mx-o">O</b>' : p === "틀림" ? '<b class="mx-x">X</b>' : '<b class="mx-n">·</b>'; }
    if (x.한줄) h += '<p class="mx-one">' + esc(x.한줄) + "</p>";
    if (x.보기판정) h += "<h4>보기 판정</h4><ul class=\"mx-ox\">" + x.보기판정.map(function (b) { return "<li>" + 판(b.판정) + "<span><b>" + esc(b.기호) + "</b> " + esc(b.설명 || "") + "</span></li>"; }).join("") + "</ul>";
    if (x.선지) h += "<h4>선지별 판정</h4><ul class=\"mx-ox\">" + x.선지.map(function (s) { return '<li class="' + (답.indexOf(s.번호) >= 0 ? "mx-ans" : "") + '">' + 판(s.판정) + "<span><b>" + (NO[s.번호 - 1] || s.번호) + "</b> " + esc(s.설명 || "") + "</span></li>"; }).join("") + "</ul>";
    if (x.근거) h += "<h4>근거</h4>" + x.근거.map(function (g) {
      var t = g.법령 ? g.법령 + " " + (g.조문 || "") : g.판례 ? "판례 " + g.판례 : "이론 · " + (g.이론 || "");
      return '<div class="mx-law"><b>' + esc(t) + "</b><div>" + esc(g.원문 || g.요지 || g.내용 || "") + "</div></div>";
    }).join("");
    (x.개념 || []).forEach(function (c) {
      h += '<div class="mx-box"><h4>' + esc(c.제목 || "개념 정리") + "</h4>";
      if (c.종류 === "표" && c.행) h += '<div class="mx-tw"><table><thead><tr>' + (c.머리 || []).map(function (t) { return "<th>" + esc(t) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        c.행.map(function (r) { return "<tr>" + r.map(function (t, i) { return (i ? "<td>" : "<th>") + esc(String(t)) + (i ? "</td>" : "</th>"); }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
      else if (c.종류 === "흐름" && c.단계) h += '<ol class="mx-flow">' + c.단계.map(function (d) { return "<li><b>" + esc(d.이름) + "</b><span>" + esc(d.설명 || "") + "</span></li>"; }).join("") + "</ol>";
      else if (c.종류 === "비교" && c.왼쪽) h += '<div class="mx-vs">' + [c.왼쪽, c.오른쪽].map(function (v) { return v ? "<div><b>" + esc(v.이름) + "</b><ul>" + (v.항목 || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul></div>" : ""; }).join("") + "</div>";
      else if (c.종류 === "계산" && c.단계) h += '<ol class="mx-calc">' + c.단계.map(function (d) { return "<li><span>" + esc(d.설명 || "") + "</span><code>" + esc(d.식 || "") + "</code><b>" + esc(d.값 || "") + "</b></li>"; }).join("") + "</ol>";
      h += "</div>";
    });
    if (x.함정) h += '<div class="mx-trap"><b>함정</b> ' + esc(Array.isArray(x.함정) ? x.함정.join(" ") : x.함정) + "</div>";
    if (x.개정) h += '<div class="lawnote"><h4>' + M.시험.일.replace(/-/g, ".") + " 시행 법령 기준</h4><div>" + esc(x.개정) + "</div></div>";
    return h + "</div>";
  }
  function 풀이판(o, k) {
    var 세션 = o.세션 = o.세션 || { 창: 0, 창ok: 0 };   /* 10문항마다(또는 끝) 별 결산 */
    var ids = o.ids, it = o.찾기(ids[k]);
    var 바뀐선지 = {};
    (it.f && it.f.수정 || []).forEach(function (m) { var mm = /^선지(\d)/.exec(m.위치); if (mm) 바뀐선지[+mm[1] - 1] = 1; });
    var h = 진행줄(k, ids.length) + 번호줄(k + 1);
    var 제목 = o.필드 === "w" ? "복습" : (LEAF[it.L] ? LEAF[it.L].이름 : "기출");
    h += '<article class="card qcard" style="margin-top:16px"><div class="bd"><div class="qmeta"><span class="tiny">' + (it.x ? "실전 모의 " + String(it.r).slice(1) + "회 " + 교시들[it.g].이름 + " " + it.n + "번" : "제" + it.r + "회(" + it.y + ") " + 차이름[it.c] + " " + esc(it.g) + " " + it.n + "번") +
      (it.p != null ? " · 체감정답률 " + it.p + "%" : "") + '</span><span class="tags">' + (SUBJ[it.L] ? "" : "") + (LEAF[it.L] && LEAF[it.L].과목 === "민법" && 사례형(it) ? '<span class="tag case">사례 · 30초 판별</span>' : "") +
      (계산형(it) ? '<span class="tag calc">계산 · 푸는 법</span>' : "") +
      (o.필드 === "w" && REC[it.i] && REC[it.i].ok && REC[it.i].conf === "half" ? '<span class="tag">헷갈림</span>' : "") +
      (it.f ? (현행꼬리표(it) || '<span class="tag law">현행 법령 반영</span>') : "") +
      (개념장[it.L] ? '<a class="btn ghost sm cbtn" href="#/concept/' + it.L + '">개념</a>' : "") + "</span></div>" +
      문항몸(it) + 풀이창자리(it) + '<div class="picks">' +
      it.ch.map(function (t, j) {
        return '<button class="pick' + (바뀐선지[j] ? " changed" : "") + '" data-j="' + (j + 1) + '"><span class="n">' + (j + 1) + '</span><span class="t">' + esc(t) + "</span></button>";
      }).join("") + '</div><div id="after"></div></div></article>';
    $view.innerHTML = h;
    안쪽(제목, "");
    풀이창붙이기(it); 줄채우기(it);
    var 헷 = false;   /* 헷갈림 확신도: 켠 채 답하면 half(헷갈림), 안 켜면 sure(확실) — 기록 칸 conf */
    function 헷갈림도구() {
      return { id: "conf", icon: "conf", 글: "헷갈림", on: 헷, fn: function () {
        헷 = !헷;
        var b = document.querySelector('#qj-bar [data-t="conf"]'); if (b) b.classList.toggle("is-on", 헷);
        if (끝 && REC[it.i]) { REC[it.i].conf = 헷 ? "half" : "sure"; 쓰기(REC); }
      } };
    }
    function 바그리기(끝남) {
      아래줄({ 도구: [헷갈림도구(), { id: "exp", icon: "book", 글: "해설", 끔: !끝남, fn: function () { var a = document.getElementById("after"); if (a) a.scrollIntoView({ behavior: "smooth", block: "start" }); } },
        { id: "pen", icon: "pen", 글: "펜", fn: function () { if (window.TERA_PAD && TERA_PAD.pen) TERA_PAD.pen({ key: String(it.i) }); } }],
        위치: String(k + 1), 총: String(ids.length), 이전: k > 0 ? function () { 풀이판(o, k - 1); } : null,
        다음: 끝남 && k < ids.length - 1 ? function () { 풀이판(o, k + 1); } : null });
    }
    바그리기(false);
    window.scrollTo(0, 0);
    if (it.e && !it.x) 기출해설불러오기(it.r, function () { });
    var 끝 = false;
    [].forEach.call($view.querySelectorAll(".pick"), function (b) {
      b.addEventListener("click", function () {
        if (끝) return; 끝 = true; setTimeout(function () { 바그리기(true); }, 0);
        var j = +b.getAttribute("data-j"), 판 = 채점(it, j), ok = 판 !== false, 답 = 정답들(it);
        [].forEach.call($view.querySelectorAll(".pick"), function (x) {
          var jj = +x.getAttribute("data-j");
          if (답.indexOf(jj) >= 0) x.setAttribute("data-s", jj === j ? "ok" : "ans");
          else if (jj === j && 판 === false) x.setAttribute("data-s", "no");
          x.setAttribute("disabled", "");
        });
        if (window.ZZ && 판 !== null) { if (ok) ZZ.ok(b); else ZZ.no(b); }
        세션.창++; if (ok) 세션.창ok++;
        if (세션.창 >= 10 || k === ids.length - 1) {
          var 률 = 세션.창ok / 세션.창; 세션.창 = 0; 세션.창ok = 0;
          if (window.ZZ) ZZ.stars(률 >= 1 ? 3 : 률 >= 0.7 ? 2 : 률 >= 0.4 ? 1 : 0);
        }
        var r = REC[it.i] || { n: 0 };
        REC[it.i] = { ok: ok, t: Date.now(), n: r.n + 1, conf: 헷 ? "half" : "sure" };
        쓰기(REC);
        하루더하기(o.필드);
        기록남기기("answer", { id: it.i, ok: ok, mode: o.필드 === "w" ? "wrong" : "study" });
        var a = "";
        a += '<div class="verdict ' + (ok ? "ok" : "no") + '">' + (판 === null ? "현행법으로는 정답이 없는 문항이라 채점에서 뺐습니다. 아래 근거를 읽고 넘어가세요."
          : ok ? "맞았습니다." : "정답은 " + 번호들(답) + "입니다. " + (o.필드 === "w" ? "다음에 복습에서 또 나옵니다." : "복습에 들어가고 이 단원 다음 풀이에도 다시 나옵니다.")) +
          (it.m && !(it.f && it.f.현행표시) ? ' <span class="tiny">(' + esc(it.m) + ")</span>" : "") + "</div>";
        a += 현행판(it);
        if (!ok && 개념장[it.L]) a += '<p class="tiny" style="margin-top:10px"><a href="#/concept/' + it.L + '">이 단원 개념 정리 보기 →</a></p>';
        if (it.x) a += 실전해설(it);
        else if (it.e) a += '<div id="hs" data-i="' + esc(it.i) + '"></div>';
        if (it.f && ((it.f.수정 || []).length || it.f.요약)) {
          a += '<div class="lawnote"><h4>' + (it.f.판정 === "폐기권고" ? "현행 법령으로는 성립하지 않는 문항입니다" : M.시험.일.replace(/-/g, ".") + " 시행 법령에 맞춰 고친 곳") + "</h4>" +
            (it.f.요약 ? "<div>" + esc(it.f.요약) + "</div>" : "") + "<ul>" +
            (it.f.수정 || []).map(function (m) {
              return "<li><b>" + esc(m.위치.replace("선지", "선지 ")) + '</b><div class="was">' + esc(m.원문) + '</div><div class="now">→ ' + esc(m.수정문) + '</div><div class="src">근거: ' + esc(m.근거) + (m.바뀐점 ? " · " + esc(m.바뀐점) : "") + "</div></li>";
            }).join("") + "</ul>" + (it.f.정답변경사유 ? '<div class="src">정답: ' + esc(it.f.정답변경사유) + "</div>" : "") + "</div>";
        }
        /* 루틴에서 들어왔으면 10문항째에 루틴으로 돌아가는 단추를 하나만 빨갛게 — 빨간 단추 둘 금지 */
        var 루틴끝 = 흐름() === o.필드 && 하루()[o.필드] >= 10;
        var 다음있음 = k < ids.length - 1;
        /* 문항 오류 신고 — 베타 공통 모듈(TerraBeta.report)이 있을 때만. 가입 전 사용자도 신고할 수 있다 */
        if (window.TerraBeta && TerraBeta.report) a += '<button type="button" class="rptbtn" id="rpt">문항이 이상해요 · 신고</button>';
        a += '<div class="navq">' + (k > 0 ? '<button class="btn ghost" id="prev">이전</button>' : "");
        if (루틴끝) a += (다음있음 ? '<button class="btn ghost" id="next">계속 풀기</button>' : "") + '<a class="btn" href="#/home" id="rtback">오늘 루틴으로 →</a>';
        else a += 다음있음 ? '<button class="btn" id="next">다음</button>' : o.끝(k);
        a += "</div>";
        if (!다음있음) a += 베타자리("result");
        document.getElementById("after").innerHTML = a;
        if (it.e && !it.x) 기출해설불러오기(it.r, function () {
          var hs = document.getElementById("hs"), 자료 = H[it.r] && H[it.r][it.i];
          if (hs && 자료 && hs.getAttribute("data-i") === it.i) { hs.innerHTML = 실전해설(it, 자료); }
        });
        베타붙이기();
        var nx = document.getElementById("next"), pv = document.getElementById("prev"), rb = document.getElementById("rtback");
        if (nx) nx.onclick = function () { 풀이판(o, k + 1); };
        if (pv) pv.onclick = function () { 풀이판(o, k - 1); };
        if (rb) rb.onclick = function () { 흐름(""); };
        var rp = document.getElementById("rpt");
        if (rp) rp.onclick = function () {
          var L = LEAF[it.L];
          try { TerraBeta.report({ app: "junggae", 종목: "공인중개사", id: it.i, 과목: L ? SUBJ[L.과목].이름 : "", 유형: it.x ? "실전 모의" : "기출", 화면: (location.hash || "").slice(1) }); } catch (e) { }
        };
        var vd = $view.querySelector(".verdict"); if (vd && vd.scrollIntoView) vd.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function 문제(code, 번호) {
    탭("tree");
    var c = LEAF[code];
    if (!c) { location.hash = "#/home"; return; }
    if (!c.문항.length) { $view.innerHTML = '<div class="empty">이 단원에는 기출 문항이 없습니다. <a href="#/tree/' + c.과목 + '">합격 지도로</a></div>'; return; }
    과목문항(c.과목, function (all) {
      var byId = {};
      all.forEach(function (x) { byId[x.i] = x; });
      var ids = c.문항.slice();
      // 안 푼 것 → 틀린 것 → 맞힌 것, 같은 무리 안에서는 최신 회차부터
      ids.sort(function (a, b) {
        function g(id) { var r = REC[id]; return !r ? 0 : (r.ok && r.conf !== "half" ? 2 : 1); }
        return g(a) - g(b) || byId[b].r - byId[a].r;
      });
      var k = 번호 == null ? 0 : Math.max(0, Math.min(ids.length - 1, 번호));
      풀이판({
        ids: ids, 필드: "s", 찾기: function (id) { return byId[id]; },
        머리: function (it, k, n) {
          var st = 리프통계(c);
          return 머리({
            sm: 1,
            kicker: '<a href="#/tree/' + c.과목 + '">' + esc(SUBJ[c.과목].약칭) + " 합격 지도</a> · " + esc(c.편이름),
            h1: esc(c.이름),
            sub: "맞힌 <b>" + st.맞힌 + " / " + st.전체 + "</b>문항 · " + esc(c.설명),
            act: (개념장[c.코드] ? '<a class="btn ghost sm" href="#/concept/' + c.코드 + '">개념</a>' : "") +
              (c.비추천 ? '<span class="tag skip">학습 후순위</span>' : '<span class="tag">비중 ' + pct(c.비중, 1) + "</span>") +
              '<span class="tag">' + (k + 1) + " / " + n + "</span>",
            bar: st.전체 ? 100 * st.맞힌 / st.전체 : 0
          });
        },
        끝: function () {
          var 다음 = 오늘의리프().filter(function (x) { return x.c.코드 !== c.코드; })[0];
          return (다음 ? '<a class="btn" href="#/study/' + 다음.c.코드 + '">다음 추천: ' + esc(다음.c.이름) + "</a>" : '<a class="btn" href="#/tree/' + c.과목 + '">합격 지도로</a>') +
            '<a class="btn ghost" href="#/home">오늘 화면으로</a>';
        }
      }, k);
    });
  }

  /* ── 여러 과목 문항을 한꺼번에 ── */
  function 여러과목(codes, cb) {
    var 남 = codes.length; if (!남) return cb();
    codes.forEach(function (code) { 과목문항(code, function () { if (--남 === 0) cb(); }); });
  }
  function 문항찾기() {
    var m = {};
    Object.keys(Q).forEach(function (k) { (Q[k] || []).forEach(function (x) { m[x.i] = x; }); });
    return m;
  }
  function 오답목록() {
    return Object.keys(REC).filter(function (id) { return REC[id] && (!REC[id].ok || REC[id].conf === "half"); })   /* 틀린 문항 + 헷갈림으로 답한 문항 */
      .sort(function (a, b) { return REC[b].t - REC[a].t; });
  }

  /* ── 화면: 복습 ── */
  function 오답() {
    탭("home");
    $view.innerHTML = '<div class="empty">문항을 불러오는 중…</div>';
    var 실전자료 = 실전목록().filter(function (r) { return 오답목록().some(function (id) { return id.indexOf(r + "-") === 0; }); }).map(function (r) { return "m37_" + r; });
    여러과목(M.과목.map(function (s) { return s.코드; }).concat(실전자료), function () {
      var by = 문항찾기();
      var ids = 오답목록().filter(function (id) { return by[id]; });
      if (!ids.length) {
        $view.innerHTML = 머리({ kicker: '<a href="#/home">오늘</a> · 복습', h1: "다시 풀 문항이 없습니다" }) +
          '<a class="btn wide" href="#/home" style="margin-top:20px">오늘 화면으로</a>';
        return;
      }
      풀이판({
        ids: ids, 필드: "w", 찾기: function (id) { return by[id]; },
        머리: function (it, k, n) {
          var c = LEAF[it.L];
          return 머리({ sm: 1, kicker: '<a href="#/home">오늘</a> · 복습' + (c ? " · " + esc(SUBJ[c.과목].약칭) + " · " + esc(c.이름) : ""),
            h1: "복습",
            act: '<span class="tag">' + (k + 1) + " / " + n + "</span>" });
        },
        끝: function () { return '<a class="btn" href="#/home">오늘 화면으로</a>'; }
      }, 0);
    });
  }

  /* ── 모의고사 — 실제 시험처럼 한 교시씩 시간을 재고 푼다 ──
     교시: 1 = 1차(학개론·민법 80문항 100분) · 2 = 2차 1교시(중개사법·공법 80문항 100분) · 3 = 2차 2교시(공시법·세법 40문항 50분) */
  var 교시들 = {
    1: { 이름: "1차", 과목: ["학개론", "민법"], 분: 100, 차: 1 },
    2: { 이름: "2차 1교시", 과목: ["중개사법", "공법"], 분: 100, 차: 2 },
    3: { 이름: "2차 2교시", 과목: ["공시법", "세법"], 분: 50, 차: 2 }
  };
  var 시험과목 = { 학개론: "부동산학개론", 민법: "민법 및 민사특별법", 중개사법: "공인중개사법령 및 실무", 공법: "부동산공법", 공시법: "공시법령·세법", 세법: "공시법령·세법" };
  /* 실전 모의(제37회 대비 5세트, 07_모의고사) — r 이 "S1"~"S5" 면 실전 세트 */
  function 실전목록() { return (window.M37 && M37.세트 || []).map(function (n) { return "S" + n; }); }
  function 실전세트(r) { var m = /^S(\d)$/.exec(String(r)); return m ? "S" + m[1] : null; }
  function 모의기록() { try { return JSON.parse(설정("mock.hist")) || {}; } catch (e) { return {}; } }
  function 모의키(r, g) { return r + "-" + g; }
  function 내교시() { var c = 응시차(); return [1, 2, 3].filter(function (g) { return c === "all" || String(교시들[g].차) === c; }); }
  function 다음모의() {
    var H = 모의기록(), gs = 내교시(), 실 = 실전목록();
    for (var t = 0; t < 실.length; t++) for (var u = 0; u < gs.length; u++) if (!H[모의키(실[t], gs[u])]) return { r: 실[t], g: gs[u] };
    for (var r = 36; r >= 27; r--) for (var i = 0; i < gs.length; i++) if (!H[모의키(r, gs[i])]) return { r: r, g: gs[i] };
    return { r: 36, g: gs[0] };
  }
  function 모의목록() {
    탭("home");
    var H = 모의기록(), gs = 내교시(), 진행 = 모의진행();
    var h = 머리({ h1: "모의고사" });
    if (진행) h += '<a class="btn wide" style="margin-top:20px" href="#/mock/' + 진행.r + "/" + 진행.g + '">풀던 모의고사 이어서: ' + (실전세트(진행.r) ? "실전 " + 진행.r.slice(1) + "회 " : "제" + 진행.r + "회 ") + 교시들[진행.g].이름 + "</a>";
    var 찍음 = !!진행;
    function 줄(r, 이름) {
      return '<div class="mockrow"><b>' + 이름 + "</b><div class=\"mockgs\">" + gs.map(function (g) {
        var x = H[모의키(r, g)], 표 = "";
        if (!x && !찍음) { 찍음 = true; 표 = '<b class="rec22">추천</b>'; }
        return '<a class="mockg' + (x ? (x.합 ? " pass" : " fail") : "") + '" href="#/mock/' + r + "/" + g + '"><span>' + 교시들[g].이름 + 표 + "</span><small>" +
          (x ? x.점수.map(function (s) { return s.점; }).join("·") + "점" : 교시들[g].분 + "분") + "</small></a>";
      }).join("") + "</div></div>";
    }
    var 실 = 실전목록();
    if (실.length) {
      h += 구획("실전 모의") + '<section class="card"><div class="bd">';
      실.forEach(function (r) { h += 줄(r, "실전 " + r.slice(1) + "회"); });
      h += "</div></section>";
    }
    h += 구획("기출 회차") + '<section class="card"><div class="bd">';
    for (var r = 36; r >= 27; r--) h += 줄(r, "제" + r + "회");
    h += "</div></section>";
    $view.innerHTML = h;
  }
  function 모의진행() { try { return JSON.parse(설정("mock.cur")); } catch (e) { return null; } }
  var 모의시계 = null;
  function 모의(r, g) {
    탭("home");
    if (모의시계) { clearInterval(모의시계); 모의시계 = null; }
    var T = 교시들[g], 실전 = 실전세트(r);
    if (!실전) r = +r;
    if (!T || (실전 ? 실전목록().indexOf(실전) < 0 : (r < 27 || r > 36))) { location.hash = "#/mock"; return; }
    var 회이름 = 실전 ? "실전 모의 " + 실전.slice(1) + "회" : "제" + r + "회";
    $view.innerHTML = '<div class="empty">문항을 불러오는 중…</div>';
    여러과목(실전 ? ["m37_" + 실전] : T.과목, function () {
      var ids = [];
      if (실전) (Q["m37_" + 실전] || []).filter(function (x) { return x.g === g; }).sort(function (a, b) { return a.n - b.n; }).forEach(function (x) { ids.push(x); });
      else T.과목.forEach(function (s) {
        (Q[s] || []).filter(function (x) { return x.r === r; }).sort(function (a, b) { return a.n - b.n; }).forEach(function (x) { ids.push(x); });
      });
      var 진행 = 모의진행(), key = 모의키(r, g);
      if (!진행 || 진행.key !== key) 진행 = null;
      if (!진행) {
        $view.innerHTML = 머리({ kicker: '<a href="#/mock">모의고사</a> · ' + 회이름, h1: 회이름 + " " + T.이름, sub: T.과목.map(function (s) { return esc(SUBJ[s].이름); }).join(" · ") + " · " + ids.length + "문항 · " + T.분 + "분" }) +
          (모의기록()[key] ? '<p class="tiny" style="margin-top:12px">이 교시는 전에 풀었습니다.</p>' : "") +
          '<a class="btn wide" id="mstart" href="javascript:void 0" style="margin-top:20px">시작 (' + T.분 + "분)</a>";
        document.getElementById("mstart").onclick = function () {
          설정("mock.cur", JSON.stringify({ key: key, r: r, g: g, start: Date.now(), ans: {}, k: 0 }));
          기록남기기("mock_start", { key: key });
          모의(r, g);
        };
        return;
      }
      var 끝시각 = 진행.start + T.분 * 60000;
      function 저장() { 설정("mock.cur", JSON.stringify(진행)); }
      function 남은() { return Math.max(0, 끝시각 - Date.now()); }
      function 시계글() { var s = Math.ceil(남은() / 1000); return Math.floor(s / 60) + ":" + ("0" + s % 60).slice(-2); }
      function 그리기() {
        var k = 진행.k, it = ids[k], 고른 = 진행.ans[it.i];
        var 푼수 = Object.keys(진행.ans).length;
        var h = 진행줄(푼수, ids.length) + 번호줄(k + 1) + '<div class="mockbar"><span><b>' + 회이름 + " " + T.이름 + "</b> · " + esc(SUBJ[LEAF[it.L] ? LEAF[it.L].과목 : T.과목[0]].약칭) + '</span><span class="clock" id="clock">' + 시계글() + '</span><button class="btn ghost sm" id="msubmit">제출</button></div>' +
          '<article class="card qcard" style="margin-top:14px"><div class="bd"><div class="qmeta"><span class="tiny">' + (k + 1) + " / " + ids.length + "번 · 답 " + 푼수 + "개 표시</span>" +
          '<span class="tags">' + (it.f ? '<span class="tag law">현행 법령 반영</span>' : "") + "</span></div>" +
          문항몸(it) + 풀이창자리(it) + '<div class="picks">' +
          it.ch.map(function (t, j) {
            return '<button class="pick" data-j="' + (j + 1) + '"' + (고른 === j + 1 ? ' data-s="pick"' : "") + '><span class="n">' + (j + 1) + '</span><span class="t">' + esc(t) + "</span></button>";
          }).join("") + "</div>" +
          '<div class="navq">' + (k > 0 ? '<button class="btn ghost" id="mprev">이전</button>' : "") + (k < ids.length - 1 ? '<button class="btn" id="mnext">다음</button>' : '<button class="btn" id="msubmit2">제출하기</button>') + "</div>" +
          '<details class="more omr"><summary>답안표 (' + 푼수 + "/" + ids.length + ")</summary><div class=\"omrgrid\">" +
          ids.map(function (x, i) { return '<button data-k="' + i + '" class="' + (진행.ans[x.i] ? "on" : "") + (i === k ? " cur" : "") + '">' + (i + 1) + "<small>" + (진행.ans[x.i] ? NO[진행.ans[x.i] - 1] : "") + "</small></button>"; }).join("") +
          "</div></details></div></article>";
        $view.innerHTML = h;
        안쪽("모의고사", 시계글());
        풀이창붙이기(it); 줄채우기(it);
        var 안푼 = ids.filter(function (x) { return !진행.ans[x.i]; }).length;
        var 이동자리 = document.createElement("div"); 이동자리.style.margin = "0 0 10px";
        var om = $view.querySelector(".omr"); if (om) om.parentNode.insertBefore(이동자리, om);
        if (window.TERA_Q) TERA_Q.jump(이동자리, { count: 안푼, onClick: function () { var j = ids.findIndex(function (x) { return !진행.ans[x.i]; }); if (j >= 0) { 진행.k = j; 저장(); 그리기(); window.scrollTo(0, 0); } } });
        진행.conf = 진행.conf || {};
        아래줄({ 도구: [{ id: "conf", icon: "conf", 글: "헷갈림", on: !!진행.conf[it.i], fn: function () {
          if (진행.conf[it.i]) delete 진행.conf[it.i]; else 진행.conf[it.i] = 1; 저장();
          var cb = document.querySelector('#qj-bar [data-t="conf"]'); if (cb) cb.classList.toggle("is-on", !!진행.conf[it.i]);
        } }, { id: "pen", icon: "pen", 글: "펜", fn: function () { if (window.TERA_PAD && TERA_PAD.pen) TERA_PAD.pen({ key: String(it.i) }); } }],
          위치: String(k + 1), 총: String(ids.length),
          이전: k > 0 ? function () { var e = document.getElementById("mprev"); if (e) e.click(); } : null,
          다음: function () { var e = document.getElementById("mnext") || document.getElementById("msubmit2"); if (e) e.click(); },
          다음글: k < ids.length - 1 ? "다음" : "제출" });
        [].forEach.call($view.querySelectorAll(".pick"), function (b) {
          b.onclick = function () {
            진행.ans[it.i] = +b.getAttribute("data-j"); 저장();
            if (진행.k < ids.length - 1) { 진행.k++; 저장(); setTimeout(그리기, 160); [].forEach.call($view.querySelectorAll(".pick"), function (x) { x.removeAttribute("data-s"); }); b.setAttribute("data-s", "pick"); }
            else 그리기();
          };
        });
        [].forEach.call($view.querySelectorAll(".omrgrid button"), function (b) { b.onclick = function () { 진행.k = +b.getAttribute("data-k"); 저장(); 그리기(); window.scrollTo(0, 0); }; });
        var p = document.getElementById("mprev"), n = document.getElementById("mnext");
        if (p) p.onclick = function () { 진행.k--; 저장(); 그리기(); window.scrollTo(0, 0); };
        if (n) n.onclick = function () { 진행.k++; 저장(); 그리기(); window.scrollTo(0, 0); };
        [document.getElementById("msubmit"), document.getElementById("msubmit2")].forEach(function (b) {
          if (b) b.onclick = function () {
            var 빈 = ids.length - Object.keys(진행.ans).length;
            if (빈 && !confirm("답을 안 고른 문항이 " + 빈 + "개 있습니다. 제출할까요?")) return;
            제출();
          };
        });
      }
      function 제출() {
        if (모의시계) { clearInterval(모의시계); 모의시계 = null; }
        var 과목점 = {}, 틀린 = [], 틀린답 = 0;
        ids.forEach(function (it) {
          var 이름 = 시험과목[LEAF[it.L] ? LEAF[it.L].과목 : T.과목[0]];
          var s = 과목점[이름] = 과목점[이름] || { 맞: 0, 전: 0 };
          var j = 진행.ans[it.i], 판 = j ? 채점(it, j) : false, ok = 판 !== false;
          s.전++; if (ok) s.맞++;
          var rr = REC[it.i] || { n: 0 };
          if (j) REC[it.i] = { ok: ok, t: Date.now(), n: rr.n + 1, conf: (진행.conf || {})[it.i] ? "half" : "sure" };
          if (!ok) 틀린.push(it);
          if (j && !ok) 틀린답++;
        });
        쓰기(REC);
        var 점수 = Object.keys(과목점).map(function (nm) { var s = 과목점[nm]; return { 과목: nm, 맞: s.맞, 전: s.전, 점: Math.round(100 * s.맞 / s.전) }; });
        var 합 = 점수.every(function (s) { return s.점 >= 40; }) && 점수.reduce(function (a, s) { return a + s.점; }, 0) / 점수.length >= 60;
        var H = 모의기록(); H[key] = { 점수: 점수, 합: 합, t: Date.now(), 분: Math.round((Date.now() - 진행.start) / 60000) }; 설정("mock.hist", JSON.stringify(H));
        설정("mock.cur", ""); try { localStorage.removeItem("mj.mock.cur"); } catch (e) { }
        하루더하기("m");
        기록남기기("mock_submit", { key: key, scores: 점수, pass: 합 });
        if (window.ZZ && ZZ.stars) ZZ.stars(합 ? 3 : 점수.every(function (s) { return s.점 >= 40; }) ? 2 : 1);
        결과(점수, 합, 틀린, H[key].분, 틀린답);
      }
      function 결과(점수, 합, 틀린, 분, 틀린답) {
        var 평균 = Math.round(점수.reduce(function (a, s) { return a + s.점; }, 0) / 점수.length);
        var 루틴 = 흐름() === "m";
        var h = 머리({ kicker: '<a href="#/mock">모의고사</a> · ' + 회이름 + " " + T.이름, h1: 합 ? "합격선 넘었습니다" : "합격선까지 " + Math.max(0, 60 - 평균) + "점",
          sub: 분 + "분 걸림 · 평균 " + 평균 + "점" }) +
          '<div class="stats' + (점수.length === 2 ? "" : " three") + '" style="margin-top:20px">' + 점수.map(function (s) {
            return '<div class="stat' + (s.점 < 40 ? " hot" : "") + '"><b>' + s.점 + "<small>점</small></b><span>" + esc(s.과목) + " · " + s.맞 + "/" + s.전 + (s.점 < 40 ? " · 과락" : "") + "</span></div>";
          }).join("") + "</div>" +
          '<div class="navq">' + (틀린답 ? '<a class="btn' + (루틴 ? " ghost" : "") + '" href="#/wrong">틀린 ' + 틀린답 + "문항 다시 풀기</a>" : "") +
          (루틴 ? '<a class="btn" href="#/home" id="rtback">오늘 루틴으로 →</a>' : '<a class="btn ghost" href="#/mock">다른 회차</a>') + "</div>" +
          베타자리("result");
        if (틀린.length) h += 구획("복습 문항", "정답은 " + M.시험.일.replace(/-/g, ".") + " 시행 법령 기준") + '<section class="card"><div class="bd">' + 틀린.map(function (it) {
          var j = 진행.ans[it.i];
          return '<div class="fixitem"><div class="row between"><span class="tiny">' + it.n + "번 · " + esc(LEAF[it.L] ? LEAF[it.L].이름 : "") + "</span>" +
            '<span class="tiny">고른 답 ' + (j ? NO[j - 1] : "없음") + " · 정답 " + (정답들(it).length ? 번호들(정답들(it)) : "없음") + "</span></div><div>" + esc(it.q.length > 80 ? it.q.slice(0, 80) + "…" : it.q) + "</div></div>";
        }).join("") + "</div></section>";
        $view.innerHTML = h; window.scrollTo(0, 0);
        아래줄치우기(); var 시계 = document.getElementById("gpr"); if (시계) 시계.textContent = "";   /* 제출한 뒤에는 문제 아래 줄과 시계를 걷는다 */
        var rb = document.getElementById("rtback"); if (rb) rb.onclick = function () { 흐름(""); };
        베타붙이기();
      }
      if (남은() <= 0) { 제출(); return; }
      그리기();
      모의시계 = setInterval(function () {
        if (!document.getElementById("clock")) { clearInterval(모의시계); 모의시계 = null; return; }
        document.getElementById("clock").textContent = 시계글();
        if (남은() < 5 * 60000) document.getElementById("clock").classList.add("low");
        if (남은() <= 0) 제출();
      }, 1000);
    });
  }

  /* ── 화면: 출제 분석 ── */
  function 분석(code) {
    var 추천리프 = 오늘의리프()[0];   /* 화면표준 10절: 오늘 화면의 첫 추천 단원 한 곳에만 추천 표시 */
    탭("analysis");
    var s = SUBJ[code] || M.과목[0];
    var h = 머리({ h1: esc(s.이름) + " 출제 분석" });
    h += '<div class="segs bar">' + M.과목.map(function (x) {
      return '<a' + (x.코드 === s.코드 ? ' aria-current="page"' : "") + ' href="#/analysis/' + x.코드 + '">' + esc(x.약칭) + "</a>";
    }).join("") + "</div>";
    // 편 × 회차
    var 회차 = M.분석.회차;
    var mx = 0;
    Object.keys(s.편_회차).forEach(function (p) { 회차.forEach(function (r) { mx = Math.max(mx, s.편_회차[p][r] || 0); }); });
    h += 구획("편별 · 회차별 출제 문항 수") + '<section class="card"><div class="tblscroll"><table class="tbl heatgrid"><thead><tr><th>편</th>' +
      회차.map(function (r) { return "<th>" + r + "회</th>"; }).join("") + "<th>합</th></tr></thead><tbody>";
    Object.keys(s.편_회차).forEach(function (p) {
      var row = s.편_회차[p], sum = 0;
      h += "<tr><td>" + esc(p) + "</td>" + 회차.map(function (r) {
        var v = row[r] || 0; sum += v;
        return '<td><span class="heat" style="background:color-mix(in srgb,var(--pt) ' + Math.round(55 * v / (mx || 1)) + '%,transparent)">' + (Math.round(v * 10) / 10) + "</span></td>";
      }).join("") + "<td><b>" + Math.round(sum * 10) / 10 + "</b></td></tr>";
    });
    h += "</tbody></table></div></section>";
    // 리프 표
    var 리프 = [];
    s.편.forEach(function (p) { p.장.forEach(function (c) { 리프.push(c); }); });
    리프.sort(function (a, b) { return b.비중 - a.비중; });
    h += 구획("단원(장)별 출제비중") +
      '<section class="card"><div class="tblscroll"><table class="tbl heatgrid"><thead><tr><th>단원</th><th>10년</th><th>최근3회</th><th>문항</th><th>체감정답률</th><th>추이</th></tr></thead><tbody>' +
      리프.map(function (c) {
        return '<tr class="' + (c.비추천 ? "skip" : "") + '"><td><a href="#/study/' + c.코드 + '">' + esc(c.이름) + "</a>" + (추천리프 && 추천리프.c.코드 === c.코드 ? ' <b class="rec22">추천</b>' : "") + (c.비추천 ? ' <span class="tag skip">후순위</span>' : "") + "</td><td>" + pct(c.비중, 1) + "</td><td>" + pct(c.최근3회비중, 1) + "</td><td>" + c.문항.length + "</td><td>" + (c.평균정답률 == null ? "–" : Math.round(c.평균정답률) + "%") + "</td><td>" + spark(c.회차별) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
    var 후 = 리프.filter(function (c) { return c.비추천; });
    if (후.length) h += 구획("학습 후순위 단원") + '<section class="card rows">' + 후.map(function (c) {
      return 접힘('<span class="rt"><b>' + esc(c.이름) + '</b></span><span class="ar">›</span>', '<p class="why">' + esc(c.비추천사유) + "</p>", "rd");
    }).join("") + "</section>";
    $view.innerHTML = h; 접힘붙이기($view);
  }

  /* ── 화면: 법령반영 대장 ── */
  function 법령() {
    탭("fix");
    var L = M.법령;
    var h = 머리({ h1: "현행 법령 반영 대장" });
    h += '<div class="stats">' + ["수정", "폐기권고", "유효", "판단보류"].map(function (k) { return '<div class="stat"><b>' + (L.판정[k] || 0) + "</b><span>" + k + "</span></div>"; }).join("") + "</div>";
    h += 구획("과목별") + '<section class="card rows">';
    M.과목.forEach(function (s) {
      var n = L.과목별[s.코드] || 0;
      if (!n) return;
      h += '<details class="rd" data-s="' + s.코드 + '"><summary class="rl"><span class="rt"><b>' + esc(s.이름) + '</b></span><span class="cnt">' + n + '문항</span><span class="ar">›</span></summary><div class="fxbody" id="fx-' + s.코드 + '"></div></details>';
    });
    h += "</section>";
    $view.innerHTML = h;
    [].forEach.call($view.querySelectorAll("details[data-s]"), function (d) {
      d.addEventListener("toggle", function () {
        var code = d.getAttribute("data-s"), box = document.getElementById("fx-" + code);
        if (!d.open || box.getAttribute("data-on")) return;
        box.setAttribute("data-on", "1");
        과목문항(code, function (all) {
          box.innerHTML = all.filter(function (x) { return x.f; }).sort(function (a, b) { return b.r - a.r; }).map(function (x) {
            return '<div class="fixitem"><div class="row between"><span class="tiny">제' + x.r + "회 " + 차이름[x.c] + " " + esc(x.g) + " " + x.n + "번</span>" +
              '<a class="tiny" href="#/study/' + x.L + '">단원 가기</a></div><div>' + esc(x.f.요약 || "") + "</div>" +
              (x.f.수정 || []).map(function (m) {
                return '<div class="lawnote" style="margin-top:6px"><b>' + esc(m.위치) + '</b><div class="was">' + esc(m.원문) + '</div><div class="now">→ ' + esc(m.수정문) + '</div><div class="src">근거: ' + esc(m.근거) + "</div></div>";
              }).join("") + "</div>";
          }).join("");
        });
      });
    });
  }

  /* ── 화면: 설정 ── */
  function 설정화면() {
    탭("settings");
    var skin = 지금옷(), cha = 응시차();
    var 칩 = function (id, 목록, 지금값) {
      return '<div class="segs" id="' + id + '">' + 목록.map(function (x) {
        return '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (지금값 === x[0]) + '">' + x[1] + "</button>";
      }).join("") + "</div>";
    };
    /* 자료 출처 — 화면에서 뺀 근거 글을 접어 둔다(있는 글을 옮기기만) */
    var 출처 = 접힘("출처 보기", '<p>문항: 한국산업인력공단 큐넷 공개 기출문제(제27~36회, 공공누리 출처표시) · 정답: 큐넷 최종정답 · 법령: 법제처 국가법령정보 공동활용(' + M.시험.일.replace(/-/g, ".") + " 시행본) · 체감정답률: CBT 풀이 사이트 이용자 통계.</p>" +
      "<p>기준: 제" + M.시험.회차 + "회 시험일(" + M.시험.일.replace(/-/g, ".") + ') 현재 시행 법령 — 큐넷 공고 "시험시행일 현재 시행되고 있는 법령".</p>' +
      "<p>체감정답률 = CBT 풀이 사이트 이용자 정답률(제27~35회). 공식 통계가 아니라 단원끼리 비교하는 용도로만 씁니다.</p>" +
      "<p>문항은 큐넷 공개 기출(공공누리 출처표시)이며, 법령이 바뀐 선지는 " + M.시험.일.replace(/-/g, ".") + " 시행 법령 기준으로 고쳐 실었습니다. 기록은 이 기기 브라우저에만 저장됩니다.</p>" +
      M.과목.map(function (x) { return "<p><b>" + esc(x.이름) + "</b> " + x.문항수 + "문항을 단원으로 잘라 셌습니다. 한 문항이 두 단원에 걸리면 나눠 셉니다. " + esc(x.합격계산 || "") + "</p>"; }).join("") +
      "<p>자료 생성 " + esc(M.생성) + "</p>", "src");
    var h = 머리({ h1: "설정" }) +
      묶음("공부", "", 칩("cha", [["all", "1·2차 동시"], ["1", "1차만"], ["2", "2차만"]], cha) +
        '<p class="shn" style="margin:16px 0 8px">하루 공부 시간</p>' +
        칩("daymin", [["30", "30분"], ["60", "1시간"], ["90", "1시간 30분"], ["120", "2시간"], ["180", "3시간"], ["240", "4시간"]], String(하루분())) +
        '<div class="rows in">' + 줄('<a class="rl" href="javascript:void 0" data-zs="1">', "합격 전략", "") + "</div>") +
      묶음("화면 색", "", 칩("skin", 옷들, skin)) +
      묶음("기록", "기록은 이 브라우저에만 있습니다.", '<div class="row between"><p class="sub">푼 문항 <b>' + Object.keys(REC).length + '</b>개</p><button class="btn ghost sm" id="reset">기록 지우기</button></div>') +
      베타자리("settings") +
      묶음("자료 출처", "", 출처);
    $view.innerHTML = h; 접힘붙이기($view);
    [].forEach.call($view.querySelectorAll("[data-zs]"), function (a) { a.addEventListener("click", function () { if (window.ZZSTRAT) ZZSTRAT.open("junggae"); }); });
    [].forEach.call($view.querySelectorAll("#skin button"), function (b) {
      b.onclick = function () { 옷입기(b.getAttribute("data-v")); 설정화면(); };
    });
    [].forEach.call($view.querySelectorAll("#daymin button"), function (b) {
      b.onclick = function () { 설정("daymin", b.getAttribute("data-v")); 설정화면(); };
    });
    [].forEach.call($view.querySelectorAll("#cha button"), function (b) {
      b.onclick = function () { 설정("cha", b.getAttribute("data-v")); 설정화면(); };
    });
    베타붙이기();
    document.getElementById("reset").onclick = function () {
      if (confirm("푼 기록을 모두 지울까요?")) { REC = {}; 쓰기(REC); 설정화면(); }
    };
  }

  /* ── 화면: 합격 설계도 ── */
  function 설계도() {
    탭("home");
    var h = 머리({ h1: "과목마다 40점, 평균 60점" }) +
      '<section class="card rows" style="margin-top:16px">' + 줄('<a class="rl" href="javascript:void 0" data-zs="1">', "합격 전략", "") + "</section>" +
      '<section class="card" style="margin-top:16px"><div class="bd"><img src="전략/합격설계도.png?v=' + M.버전 + '" alt="합격 설계도" style="display:block;width:100%;border-radius:12px"></div></section>';
    [1, 2].forEach(function (cha) {
      var ss = M.과목.filter(function (s) { return s.차 === cha && 교리[s.코드]; });
      h += 구획(차이름[cha]) + '<section class="card"><div class="bd">' + ss.map(function (s) {
        var g = 교리[s.코드];
        return '<div class="fixitem"><div class="row between"><b>' + esc(s.이름) + '</b><span class="goal">목표 <b>' + g.목표 + "</b> · " + g.역할 + '</span></div><div class="tiny">' + esc(g.전술) + "</div></div>";
      }).join("") + "</div></section>";
    });
    $view.innerHTML = h;
    [].forEach.call($view.querySelectorAll("[data-zs]"), function (a) { a.addEventListener("click", function () { if (window.ZZSTRAT) ZZSTRAT.open("junggae"); }); });
  }

  /* ── 길잡이 ── */
  function 이동() {
    var p = (location.hash || "#/home").slice(2).split("/");
    var 덮개 = document.getElementById("zzc"); if (덮개) 덮개.remove();   /* 화면을 옮기면 앞 화면 안내는 걷는다 */
    document.body.classList.remove("inner", "notab"); 아래줄치우기();
    try {
      if (p[0] === "tree") 트리(decodeURIComponent(p[1] || ""));
      else if (p[0] === "concept") 개념(decodeURIComponent(p[1] || ""));
      else if (p[0] === "study") 문제(decodeURIComponent(p[1] || ""), p[2] ? +p[2] : null);
      else if (p[0] === "analysis") 분석(decodeURIComponent(p[1] || ""));
      else if (p[0] === "fix") 법령();
      else if (p[0] === "settings") 설정화면();
      else if (p[0] === "plan") 설계도();
      else if (p[0] === "wrong") 오답();
      else if (p[0] === "mock") { if (p[1] && p[2]) 모의(p[1], +p[2]); else 모의목록(); }
      else 홈();
    } catch (e) {
      $view.innerHTML = '<div class="empty">화면을 그리다 멈췄습니다: ' + esc(e.message) + "</div>";
      if (window.console) console.error(e);
    }
  }
  window.addEventListener("hashchange", 이동);
  옷입기(지금옷());
  document.getElementById("skinbtn").addEventListener("click", function () {
    var i = 옷들.map(function (x) { return x[0]; }).indexOf(지금옷());
    옷입기(옷들[(i + 1) % 옷들.length][0]);
    if ((location.hash || "").indexOf("#/settings") === 0) 설정화면();
  });
  디데이();
  이동();
  /* 화면표준 9·14절: 공용 합격전략 창(zzstrat.js)은 파일을 그대로 두고 앱에서 글자와 색만 덮는다.
     창은 열린 Shadow DOM 안이라 앱 css 가 안 닿는다 → 열릴 때 그 안에 덮개 style 하나를 넣는다(흰 바탕 · 포인트 색 · 회색) */
  (function(){
    var P="#6D28D9", PI="#5B21B6", PS="rgba(109,40,217,.10)";
    var 덮개=[
      "#zs,#zst,#zsy{--zs-bg:#FFFFFF;--zs-card:#FFFFFF;--zs-line:#E6E8EC;--zs-red:"+P+";--zs-blue:#9B79E8;--zs-gold:#7C818C;--zs-soft:#F1F3F6;--zs-tx:#111419;--zs-sub:#5F6670}",
      "#zs .top .t{letter-spacing:0;font-size:13px}#zs .top button{border-radius:12px}",
      "#zs section{border-radius:18px;box-shadow:none}",
      "#zs .chip{border-radius:999px;background:#F1F3F6;color:#333941}#zs .chip.r{background:"+PS+";color:"+PI+"}",
      "#zs .pk{border:1px solid #E6E8EC;border-radius:14px;background:#FFFFFF}#zs .pk.on{border-color:"+P+";background:"+PS+";box-shadow:none}",
      "#zs .tg{border-radius:999px;font-size:11.5px}#zs .tg.a{background:"+P+";color:#fff}#zs .tg.l{background:rgba(109,40,217,.16);color:"+PI+";border:0}#zs .tg.g{background:#F1F3F6;color:#5F6670;border:0}",
      "#zs .sc,#zs .sc.s,#zs .sc.d{border:1px solid #E6E8EC;border-radius:14px}#zs .sc.on{background:#FFFFFF}#zs .sc .rb{border-radius:999px}",
      "#zs .sc.s .rb,#zs .sc.s .bar b{background:"+P+"}#zs .sc.d .rb,#zs .sc.d .bar b{background:#9B79E8}#zs .sc.b .bar b{background:#B4BAC3}",
      "#zs .det{border-radius:14px}#zs .vl i{background:"+P+";border-radius:50%}",
      "#zs .gauge .fl{background:rgba(109,40,217,.14)}#zs .stack i.s{background:"+P+"}#zs .stack i.d{background:#9B79E8}#zs .stack i.b{background:#B4BAC3}",
      "#zs .gp b{background:"+P+";border-radius:12px}#zs .gp::after{background:"+P+"}#zs .gb .gline b{border-radius:12px}",
      "#zs .gc .cd{border:1px solid #E6E8EC;border-radius:14px}",
      "#zs .gc .cd:nth-child(1){--c:"+P+"!important}#zs .gc .cd:nth-child(2){--c:#8B5CF6!important}#zs .gc .cd:nth-child(3){--c:#A78BFA!important}#zs .gc .cd:nth-child(n+4){--c:#9CA3AF!important}",
      "#zs .gc .cg{border-radius:999px}#zs .hit{border-radius:14px}",
      "#zs .q li.a::before{background:"+P+";border-color:"+P+"}#zs .q .st.f{color:"+PI+";border-color:"+PI+"}#zs .q{border-radius:14px}",
      "#zs .go{background:"+P+";border-radius:12px}#zst .nx{background:"+P+";border-radius:12px}#zst .hole{border-radius:14px}#zst .bub{border-radius:18px}",
      "#zsy .nx{background:"+P+"}#zsy .pg i{background:"+P+"}#zsy .pk{border:1px solid #E6E8EC}#zsy .pk.on{border-color:"+P+";box-shadow:none}",
      "#zsy .end button{border:1px solid "+P+";color:"+PI+"}#zsy .end .main{background:"+P+";color:#fff}"
    ].join("\n");
    function 글(root){ var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null,false), n; while((n=w.nextNode())){ if(n.nodeValue.indexOf("합격전략")>=0) n.nodeValue=n.nodeValue.replace(/합격전략/g,"합격 전략"); } }
    function 말(){
      document.querySelectorAll(".zs-fab,.zs-btn").forEach(function(el){ 글(el); });
      var h=document.getElementById("zs-host");
      if(h && h.shadowRoot){
        if(!h.shadowRoot.getElementById("mj-ov")){ var st=document.createElement("style"); st.id="mj-ov"; st.textContent=덮개; h.shadowRoot.appendChild(st); }
        글(h.shadowRoot);
      }
    }
    new MutationObserver(말).observe(document.documentElement,{childList:true,subtree:true}); 말();
  })();
})();
