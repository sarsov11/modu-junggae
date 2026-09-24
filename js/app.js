/* 모두의 중개사 — 한 장짜리 앱. 화면 다섯: 오늘 · 스킬트리 · 문제 · 출제분석 · 법령반영 · 설정
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
    if (t === "요점") return '<div class="cpt">' + 등급칩(b.등급) + '<div><b class="kw">' + esc(b.제목) + "</b> " + esc(b.글) + "</div></div>";
    if (t === "조문") return '<div class="law"><span class="ln">' + esc(b.조) + "</span>" + esc(b.글) + "</div>";
    if (t === "비유") return '<div class="tip"><span class="ti">비유 팁</span><div>' + esc(b.글) + "</div></div>";
    if (t === "참고") return '<div class="ref"><span class="rt">참고</span><div>' + esc(b.글) + "</div></div>";
    if (t === "비교") return '<div class="big"><div class="big-h">' + esc(b.제목 || "한 번에 비교") + '</div><div class="tblwrap"><table><tr>' +
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
      var h = '<div class="qhead"><a class="tiny" href="#/tree/' + c.과목 + '">← ' + esc(SUBJ[c.과목].약칭) + ' 스킬트리</a><a class="tiny" href="#/study/' + code + '">기출 ' + c.문항.length + "문항 ›</a></div>" +
        '<div class="card"><h3>' + esc(c.이름) + '</h3><p class="tiny" style="margin:4px 0 0">' + esc(c.편이름) + " · 회당 " + c.회당.toFixed(1) + "문항</p>" +
        (d.요약 ? '<p class="csum">' + esc(d.요약) + "</p>" : "") + "</div>" +
        '<article class="card concept">' + (d.블록 || []).map(블록).join("") + "</article>" +
        '<a class="btn" style="width:100%" href="#/study/' + code + '">이 단원 기출 풀기 (' + c.문항.length + "문항)</a>" +
        '<p class="tiny" style="margin-top:10px">등급 = 제27~36회 중 이 내용이 나온 회차 수 · S 8회↑ · A 4~7 · B 2~3 · C 1</p>';
      $view.innerHTML = h; window.scrollTo(0, 0);
    });
  }
  function 리프통계(c) {
    var ids = c.문항, done = 0, ok = 0;
    ids.forEach(function (id) { var r = REC[id]; if (r) { done++; if (r.ok) ok++; } });
    return { 전체: ids.length, 푼: done, 맞힌: ok, 이해도: ids.length ? ok / ids.length : 0 };
  }
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
    var d = new Date(M.시험.일 + "T09:00:00+09:00"), now = new Date();
    var n = Math.ceil((d - now) / 86400000);
    document.getElementById("dday").innerHTML = n >= 0 ? "제" + M.시험.회차 + "회 <b>D-" + n + "</b>" : "제" + M.시험.회차 + "회 시험 종료";
  }
  function spark(회차별) {
    var ks = Object.keys(회차별).sort(), mx = 0;
    ks.forEach(function (k) { mx = Math.max(mx, 회차별[k]); });
    return '<span class="spark" title="제27회~제36회 회차별 출제">' + ks.map(function (k) {
      return '<i style="height:' + (mx ? Math.max(2, 22 * 회차별[k] / mx) : 1) + 'px"></i>';
    }).join("") + "</span>";
  }
  function 탭(on) {
    [].forEach.call(document.querySelectorAll(".tabs a"), function (a) { a.classList.toggle("on", a.getAttribute("data-tab") === on); });
  }

  /* ── 화면: 오늘 ── */
  function 홈() {
    탭("home");
    var 후보 = 오늘의리프();
    var h = "";
    if (후보.length) {
      var t = 후보[0], c = t.c;
      h += '<section class="card today"><div class="eyebrow">오늘 할 것 하나</div>' +
        "<h2>" + esc(c.이름) + "</h2>" +
        '<div class="sub">' + esc(t.s.이름) + " · " + esc(c.편이름) + "</div>" +
        '<div class="stat3"><div><b>' + c.회당.toFixed(1) + '문항</b><span>시험 한 회 평균 출제</span></div>' +
        "<div><b>" + c.문항.length + '문항</b><span>최근 10회 기출</span></div>' +
        "<div><b>" + t.st.맞힌 + "/" + t.st.전체 + '</b><span>맞힌 문항</span></div></div>' +
        '<a class="btn" style="width:100%" href="#/study/' + c.코드 + '">시작하기</a>' +
        '<details class="more"><summary>다른 단원이 더 필요해요 ▾</summary><div class="list">' +
        후보.slice(1, 7).map(function (x) {
          return '<a href="#/study/' + x.c.코드 + '"><span>' + esc(x.c.이름) + ' <span class="tiny">' + esc(x.s.약칭) + "</span></span><span class=\"tiny\">회당 " + x.c.회당.toFixed(1) + "문항</span></a>";
        }).join("") + "</div></details></section>";
    } else {
      h += '<section class="card today"><div class="eyebrow">오늘 할 것</div><h2>추천 단원을 전부 80% 이상 맞혔습니다</h2><p class="sub">스킬트리에서 후순위 단원이나 틀린 문항을 다시 풀어 보세요.</p></section>';
    }
    h += '<a class="card plancard" href="#/plan"><div class="row between"><b>합격 설계도</b><span class="tiny">과목별 역할로 푼다 ›</span></div>' +
      '<div class="goals">' + 대상과목().map(function (s) {
        var g = 교리[s.코드]; return g ? '<span class="goal g-' + (g.역할 === "득점" ? "up" : g.역할 === "방어" ? "keep" : "cut") + '">' + esc(s.약칭) + " <b>" + g.목표 + "</b></span>" : "";
      }).join("") + "</div></a>";
    // 과목별
    var 차묶음 = {};
    대상과목().forEach(function (s) { (차묶음[s.차] = 차묶음[s.차] || []).push(s); });
    Object.keys(차묶음).forEach(function (cha) {
      h += '<section class="card"><div class="row between"><h3>' + 차이름[cha] + ' 과목</h3><span class="tiny">과목당 40점 이상 · 평균 60점 이상 합격</span></div>';
      var 합 = 0, n = 0;
      차묶음[cha].forEach(function (s) {
        var tot = 0, ok = 0, done = 0, okd = 0;
        s.편.forEach(function (p) { p.장.forEach(function (c) { var st = 리프통계(c); tot += st.전체; ok += st.맞힌; done += st.푼; }); });
        var 정답률 = done ? ok / done : null;
        if (정답률 != null) { 합 += 정답률 * 100; n++; }
        h += '<a class="subj" href="#/tree/' + s.코드 + '"><span><b>' + esc(s.이름) + '</b> <span class="tiny">' + done + "/" + tot + ' 풀이</span></span>' +
          '<span class="tiny">' + (교리[s.코드] ? "목표 " + 교리[s.코드].목표 + " · " + 교리[s.코드].역할 + " · " : "") + (정답률 == null ? "아직 안 풀었어요" : "내 정답률 " + Math.round(정답률 * 100) + "%") + "</span>" +
          '<span class="bar"><i style="width:' + (tot ? 100 * ok / tot : 0) + '%"></i></span></a>';
      });
      if (n) h += '<p class="tiny" style="margin:8px 0 0">푼 문항 기준 ' + 차이름[cha] + " 평균 " + Math.round(합 / n) + "점 수준 (" + (합 / n >= 60 ? "합격선 위" : "합격선 60점까지 " + Math.ceil(60 - 합 / n) + "점") + ")</p>";
      h += "</section>";
    });
    h += '<p class="tiny">문항은 큐넷 공개 기출(공공누리 출처표시)이며, 법령이 바뀐 선지는 ' + M.시험.일.replace(/-/g, ".") + " 시행 법령 기준으로 고쳐 실었습니다. 기록은 이 기기 브라우저에만 저장됩니다.</p>";
    $view.innerHTML = h;
  }

  /* ── 화면: 스킬트리 ── */
  function 트리(code) {
    탭("tree");
    var 목록 = 대상과목();
    var s = SUBJ[code] || 목록[0];
    var h = '<div class="seg">' + 목록.map(function (x) {
      return '<a class="' + (x.코드 === s.코드 ? "on" : "") + '" href="#/tree/' + x.코드 + '">' + esc(x.약칭) + "</a>";
    }).join("") + "</div>";
    h += '<div class="card"><div class="row between"><h2>' + esc(s.이름) + '</h2><span class="chip">' + 차이름[s.차] + ' · ' + s.시험문항 + '문항</span></div>' +
      '<p class="sub" style="margin:6px 0 0">막대 굵기 = 최근 10회 출제비중, 작은 막대 = 회차별 출제 추이. 점선 카드는 <b>학습 후순위</b>(비추천) 단원입니다 — 문제는 그대로 풀 수 있습니다.</p></div>';
    var mx = 0;
    s.편.forEach(function (p) { p.장.forEach(function (c) { mx = Math.max(mx, c.비중); }); });
    s.편.forEach(function (p) {
      var 편비중 = p.장.reduce(function (a, c) { return a + c.비중; }, 0);
      h += '<div class="pyeon"><h3>' + esc(p.이름) + " <small>" + pct(편비중, 1) + "</small></h3></div><div class=\"trunk\">";
      p.장.forEach(function (c) {
        var st = 리프통계(c);
        h += '<a class="node' + (c.비추천 ? " skip" : "") + (st.이해도 >= 0.8 ? " done" : "") + '" href="#/' + (개념장[c.코드] && !st.푼 ? "concept" : "study") + "/" + c.코드 + '">' +
          '<div class="row between"><span class="nm grow">' + esc(c.이름) + "</span>" + spark(c.회차별) + "</div>" +
          '<div class="weight"><i style="width:' + (mx ? 100 * c.비중 / mx : 0) + '%"></i></div>' +
          '<div class="meta"><span class="chip">회당 ' + c.회당.toFixed(1) + "문항 · " + pct(c.비중, 1) + "</span>" +
          '<span class="chip">' + c.문항.length + "문항</span>" +
          (c.평균정답률 != null ? '<span class="chip">체감정답률 ' + Math.round(c.평균정답률) + "%</span>" : "") +
          (c.최근3회비중 >= c.비중 * 1.3 && c.비중 > 0 ? '<span class="chip hot">최근 늘어남</span>' : "") +
          (c.수정수 ? '<span class="chip law">법령반영 ' + c.수정수 + "</span>" : "") +
          (c.비추천 ? '<span class="chip skip">학습 후순위</span>' : "") +
          (st.푼 ? '<span class="chip ok">' + st.맞힌 + "/" + st.전체 + "</span>" : "") +
          "</div>" + (c.비추천 ? '<p class="tiny" style="margin:6px 0 0">' + esc(c.비추천사유) + "</p>" : "") + "</a>";
      });
      h += "</div>";
    });
    $view.innerHTML = h;
  }

  /* ── 화면: 문제 ── */
  function 보기그리기(it) {
    if (!it.b && !(it.img && it.img.length)) return "";
    var inner = "";
    if (it.bs === "표" && it.b) {
      var 줄 = it.b.split("\n"), 표 = [], 글 = [];
      줄.forEach(function (l) { if (l.indexOf("|") >= 0) 표.push(l); else if (표.length) { 글.push("\n"); 글.push(l); } else 글.push(l); });
      var 앞 = [], 뒤 = [], 표시작 = 줄.findIndex(function (l) { return l.indexOf("|") >= 0; });
      앞 = 줄.slice(0, 표시작).filter(Boolean);
      var 표줄 = 줄.slice(표시작).filter(function (l) { return l.indexOf("|") >= 0; });
      뒤 = 줄.slice(표시작).filter(function (l) { return l && l.indexOf("|") < 0; });
      inner = (앞.length ? esc(앞.join("\n")) + "\n" : "") + '<div class="tblwrap"><table>' + 표줄.map(function (l, i) {
        var cells = l.split("|").map(function (x) { return x.trim(); });
        return "<tr>" + cells.map(function (x) { return i === 0 ? "<th>" + esc(x) + "</th>" : "<td>" + esc(x) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</table></div>" + (뒤.length ? esc(뒤.join("\n")) : "");
    } else if (it.b) {
      inner = esc(it.b);
    }
    if (it.img && it.img.length && it.bs === "그림") inner += it.img.map(function (u) { return '<img loading="lazy" alt="문항 자료" src="' + u + '">'; }).join("");
    return '<div class="box">' + inner + "</div>";
  }
  function 문제(code, 번호) {
    탭("tree");
    var c = LEAF[code];
    if (!c) { location.hash = "#/home"; return; }
    과목문항(c.과목, function (all) {
      var byId = {};
      all.forEach(function (x) { byId[x.i] = x; });
      var ids = c.문항.slice();
      // 안 푼 것 → 틀린 것 → 맞힌 것, 같은 무리 안에서는 최신 회차부터
      ids.sort(function (a, b) {
        function g(id) { var r = REC[id]; return !r ? 0 : (r.ok ? 2 : 1); }
        return g(a) - g(b) || byId[b].r - byId[a].r;
      });
      var k = 번호 == null ? 0 : Math.max(0, Math.min(ids.length - 1, 번호));
      그리기(ids, k);
    });
    function 그리기(ids, k) {
      var it = Q[c.과목].find(function (x) { return x.i === ids[k]; });
      var st = 리프통계(c);
      var 바뀐선지 = {};
      (it.f && it.f.수정 || []).forEach(function (m) { var mm = /^선지(\d)/.exec(m.위치); if (mm) 바뀐선지[+mm[1] - 1] = 1; });
      var h = '<div class="qhead"><a class="tiny" href="#/tree/' + c.과목 + '">← ' + esc(SUBJ[c.과목].약칭) + " 스킬트리</a>" + (개념장[c.코드] ? '<a class="tiny" href="#/concept/' + c.코드 + '">개념 보기</a>' : "") + "<span class=\"tiny\">" + (k + 1) + " / " + ids.length + "</span></div>" +
        '<div class="card"><div class="row between"><h3 class="grow">' + esc(c.이름) + "</h3>" +
        (c.비추천 ? '<span class="chip skip">학습 후순위</span>' : '<span class="chip">비중 ' + pct(c.비중, 1) + "</span>") + "</div>" +
        '<div class="bar" style="margin-top:8px"><i style="width:' + (st.전체 ? 100 * st.맞힌 / st.전체 : 0) + '%"></i></div>' +
        '<p class="tiny" style="margin:6px 0 0">맞힌 ' + st.맞힌 + " / " + st.전체 + "문항 · " + esc(c.설명) + "</p></div>";
      h += '<article class="card"><div class="row between"><span class="tiny">제' + it.r + "회(" + it.y + ") " + 차이름[it.c] + " " + esc(it.g) + " " + it.n + "번" +
        (it.p != null ? " · 체감정답률 " + it.p + "%" : "") + "</span><span>" + (c.과목 === "민법" && 사례형(it) ? '<span class="chip case">사례 · 30초 판별</span> ' : "") +
        (계산형(it) ? '<span class="chip calc">계산 · 푸는 법</span> ' : "") +
        (it.p != null && it.p <= 20 ? '<span class="chip hot">고난도</span> ' : "") + (it.f ? '<span class="chip law">현행 법령 반영</span>' : "") + "</span></div>" +
        '<p class="q">' + esc(it.q) + "</p>" + 보기그리기(it) + '<div class="choices">' +
        it.ch.map(function (t, j) {
          return '<button class="choice' + (바뀐선지[j] ? " changed" : "") + '" data-j="' + (j + 1) + '"><span class="no">' + (j + 1) + "</span><span>" + esc(t) + "</span></button>";
        }).join("") + '</div><div id="after"></div></article>';
      $view.innerHTML = h;
      window.scrollTo(0, 0);
      var 끝 = false;
      [].forEach.call($view.querySelectorAll(".choice"), function (b) {
        b.addEventListener("click", function () {
          if (끝) return; 끝 = true;
          var j = +b.getAttribute("data-j"), ok = it.a.indexOf(j) >= 0;
          [].forEach.call($view.querySelectorAll(".choice"), function (x) {
            var jj = +x.getAttribute("data-j");
            if (it.a.indexOf(jj) >= 0) x.classList.add("right");
            else if (jj === j) x.classList.add("wrong");
            x.setAttribute("disabled", "");
          });
          var r = REC[it.i] || { n: 0 };
          REC[it.i] = { ok: ok, t: Date.now(), n: r.n + 1 };
          쓰기(REC);
          var a = "";
          a += '<div class="verdict ' + (ok ? "ok" : "no") + '">' + (ok ? "맞았습니다." : "정답은 " + it.a.map(function (x) { return NO[x - 1]; }).join(", ") + "입니다. 다시 풀 기회는 이 단원에 남겨 둡니다.") +
            (it.m ? ' <span class="tiny">(' + esc(it.m) + ")</span>" : "") + "</div>";
          if (it.f) {
            a += '<div class="lawnote"><h4>' + (it.f.판정 === "폐기권고" ? "현행 법령으로는 성립하지 않는 문항입니다" : M.시험.일.replace(/-/g, ".") + " 시행 법령에 맞춰 고친 곳") + "</h4>" +
              (it.f.요약 ? "<div>" + esc(it.f.요약) + "</div>" : "") + "<ul>" +
              (it.f.수정 || []).map(function (m) {
                return "<li><b>" + esc(m.위치.replace("선지", "선지 ")) + '</b><div class="was">' + esc(m.원문) + '</div><div class="now">→ ' + esc(m.수정문) + '</div><div class="src">근거: ' + esc(m.근거) + (m.바뀐점 ? " · " + esc(m.바뀐점) : "") + "</div></li>";
              }).join("") + "</ul>" + (it.f.정답변경사유 ? '<div class="src">정답: ' + esc(it.f.정답변경사유) + "</div>" : "") + "</div>";
          }
          a += '<div class="navq">' + (k > 0 ? '<button class="btn ghost" id="prev">이전</button>' : "") +
            (k < ids.length - 1 ? '<button class="btn" id="next">다음 문항</button>' : '<a class="btn" href="#/home">오늘 화면으로</a>') + "</div>";
          document.getElementById("after").innerHTML = a;
          var nx = document.getElementById("next"), pv = document.getElementById("prev");
          if (nx) nx.onclick = function () { 그리기(ids, k + 1); };
          if (pv) pv.onclick = function () { 그리기(ids, k - 1); };
        });
      });
    }
  }

  /* ── 화면: 출제분석 ── */
  function 분석(code) {
    탭("analysis");
    var s = SUBJ[code] || M.과목[0];
    var h = '<div class="seg">' + M.과목.map(function (x) {
      return '<a class="' + (x.코드 === s.코드 ? "on" : "") + '" href="#/analysis/' + x.코드 + '">' + esc(x.약칭) + "</a>";
    }).join("") + "</div>";
    h += '<section class="card"><h2>' + esc(s.이름) + ' 출제 분석</h2><p class="sub" style="margin:6px 0 0">' + esc(M.분석.기간) + " · " + s.문항수 + "문항을 단원으로 잘라 셌습니다. 한 문항이 두 단원에 걸리면 나눠 셉니다.</p>" +
      '<p class="sub" style="margin:6px 0 0"><b>후순위 합계 ' + pct(s.비추천비중합, 1) + "</b> — " + esc(s.합격계산) + "</p></section>";
    // 편 × 회차
    var 회차 = M.분석.회차;
    var mx = 0;
    Object.keys(s.편_회차).forEach(function (p) { 회차.forEach(function (r) { mx = Math.max(mx, s.편_회차[p][r] || 0); }); });
    h += '<section class="card"><h3>편별 · 회차별 출제 문항 수</h3><div class="tblscroll"><table class="grid"><thead><tr><th>편</th>' +
      회차.map(function (r) { return "<th>" + r + "회</th>"; }).join("") + "<th>합</th></tr></thead><tbody>";
    Object.keys(s.편_회차).forEach(function (p) {
      var row = s.편_회차[p], sum = 0;
      h += "<tr><td>" + esc(p) + "</td>" + 회차.map(function (r) {
        var v = row[r] || 0; sum += v;
        return '<td><span class="heat" style="background:color-mix(in srgb,var(--accent) ' + Math.round(70 * v / (mx || 1)) + '%,transparent)">' + (Math.round(v * 10) / 10) + "</span></td>";
      }).join("") + "<td><b>" + Math.round(sum * 10) / 10 + "</b></td></tr>";
    });
    h += "</tbody></table></div></section>";
    // 리프 표
    var 리프 = [];
    s.편.forEach(function (p) { p.장.forEach(function (c) { 리프.push(c); }); });
    리프.sort(function (a, b) { return b.비중 - a.비중; });
    h += '<section class="card"><h3>단원(장)별 출제비중</h3><p class="tiny">체감정답률 = CBT 풀이 사이트 이용자 정답률(제27~35회). 공식 통계가 아니라 단원끼리 비교하는 용도로만 씁니다.</p><div class="tblscroll"><table class="grid"><thead><tr><th>단원</th><th>10년</th><th>최근3회</th><th>문항</th><th>체감정답률</th><th>추이</th></tr></thead><tbody>' +
      리프.map(function (c) {
        return '<tr class="' + (c.비추천 ? "skip" : "") + '"><td><a href="#/study/' + c.코드 + '">' + esc(c.이름) + "</a>" + (c.비추천 ? ' <span class="chip skip">후순위</span>' : "") + "</td><td>" + pct(c.비중, 1) + "</td><td>" + pct(c.최근3회비중, 1) + "</td><td>" + c.문항.length + "</td><td>" + (c.평균정답률 == null ? "–" : Math.round(c.평균정답률) + "%") + "</td><td>" + spark(c.회차별) + "</td></tr>";
      }).join("") + "</tbody></table></div></section>";
    var 후 = 리프.filter(function (c) { return c.비추천; });
    h += '<section class="card"><h3>학습 후순위(비추천) 단원</h3>' + (후.length ? 후.map(function (c) {
      return '<div class="fixitem"><b>' + esc(c.이름) + '</b><div class="tiny">' + esc(c.비추천사유) + "</div></div>";
    }).join("") : '<p class="sub">이 과목은 버릴 단원 없이 고르게 가져가는 편이 낫습니다.</p>') + "</section>";
    $view.innerHTML = h;
  }

  /* ── 화면: 법령반영 대장 ── */
  function 법령() {
    탭("fix");
    var L = M.법령;
    var h = '<section class="card"><h2>현행 법령 반영 대장</h2><p class="sub" style="margin:6px 0 0">기준: 제' + M.시험.회차 + "회 시험일(" + M.시험.일.replace(/-/g, ".") + ") 현재 시행 법령 — 큐넷 공고 \"시험시행일 현재 시행되고 있는 법령\". 검토 " + L.검토 + "문항 중 <b>" + L.수정 + "문항</b>을 고쳤습니다.</p>" +
      '<div class="stat3">' + ["수정", "유효", "판단보류"].map(function (k) { return "<div><b>" + (L.판정[k] || 0) + "</b><span>" + k + "</span></div>"; }).join("") + "</div></section>";
    M.과목.forEach(function (s) {
      var n = L.과목별[s.코드] || 0;
      if (!n) return;
      h += '<section class="card"><div class="row between"><h3>' + esc(s.이름) + '</h3><span class="chip law">' + n + '문항</span></div><div id="fx-' + s.코드 + '"><button class="btn small ghost" data-s="' + s.코드 + '">목록 펼치기</button></div></section>';
    });
    $view.innerHTML = h;
    [].forEach.call($view.querySelectorAll("button[data-s]"), function (b) {
      b.onclick = function () {
        var code = b.getAttribute("data-s");
        과목문항(code, function (all) {
          var box = document.getElementById("fx-" + code);
          box.innerHTML = all.filter(function (x) { return x.f; }).sort(function (a, b) { return b.r - a.r; }).map(function (x) {
            return '<div class="fixitem"><div class="row between"><span class="tiny">제' + x.r + "회 " + 차이름[x.c] + " " + esc(x.g) + " " + x.n + "번</span>" +
              '<a class="tiny" href="#/study/' + x.L + '">단원 가기</a></div><div>' + esc(x.f.요약 || "") + "</div>" +
              (x.f.수정 || []).map(function (m) {
                return '<div class="lawnote" style="margin-top:6px"><b>' + esc(m.위치) + '</b><div class="was">' + esc(m.원문) + '</div><div class="now">→ ' + esc(m.수정문) + '</div><div class="src">근거: ' + esc(m.근거) + "</div></div>";
              }).join("") + "</div>";
          }).join("");
        });
      };
    });
  }

  /* ── 화면: 설정 ── */
  function 설정화면() {
    탭("settings");
    var skin = document.documentElement.getAttribute("data-skin"), cha = 응시차();
    var h = '<section class="card"><h2>화면 옷 고르기</h2><p class="sub">내용은 같고 색과 글꼴만 바뀝니다.</p><div class="toggle" id="skin">' +
      [["jijeok", "지적도"], ["deunggi", "등기부"], ["bam", "밤"]].map(function (x) {
        return '<button data-v="' + x[0] + '" class="' + (skin === x[0] ? "on" : "") + '">' + x[1] + "</button>";
      }).join("") + "</div></section>" +
      '<section class="card"><h2>이번에 보는 시험</h2><div class="toggle" id="cha">' +
      [["all", "1·2차 동시"], ["1", "1차만"], ["2", "2차만"]].map(function (x) {
        return '<button data-v="' + x[0] + '" class="' + (cha === x[0] ? "on" : "") + '">' + x[1] + "</button>";
      }).join("") + '</div><p class="tiny">오늘 할 것·스킬트리가 고른 차수 과목만 보여 줍니다.</p></section>' +
      '<section class="card"><h2>기록</h2><p class="sub">푼 문항 ' + Object.keys(REC).length + '개. 기록은 이 브라우저에만 있습니다.</p><button class="btn ghost" id="reset">기록 지우기</button></section>' +
      '<section class="card"><h2>자료 출처</h2><p class="sub">문항: 한국산업인력공단 큐넷 공개 기출문제(제27~36회, 공공누리 출처표시) · 정답: 큐넷 최종정답 · 법령: 법제처 국가법령정보 공동활용(' + M.시험.일.replace(/-/g, ".") + " 시행본) · 체감정답률: CBT 풀이 사이트 이용자 통계.</p><p class=\"tiny\">자료 생성 " + esc(M.생성) + "</p></section>";
    $view.innerHTML = h;
    [].forEach.call($view.querySelectorAll("#skin button"), function (b) {
      b.onclick = function () { var v = b.getAttribute("data-v"); document.documentElement.setAttribute("data-skin", v); 설정("skin", v); 설정화면(); };
    });
    [].forEach.call($view.querySelectorAll("#cha button"), function (b) {
      b.onclick = function () { 설정("cha", b.getAttribute("data-v")); 설정화면(); };
    });
    document.getElementById("reset").onclick = function () {
      if (confirm("푼 기록을 모두 지울까요?")) { REC = {}; 쓰기(REC); 설정화면(); }
    };
  }

  /* ── 화면: 합격 설계도 ── */
  function 설계도() {
    탭("home");
    var h = '<section class="card"><h2 style="margin:0 0 6px">합격 설계도</h2><p class="sub" style="margin:0 0 10px">과목마다 40점 이상 · 평균 60점 이상. 전 과목 만점이 아니라 과목별 역할로 푼다.</p>' +
      '<img src="전략/합격설계도.png?v=' + M.버전 + '" alt="합격 설계도" style="width:100%;border-radius:12px"></section>';
    [1, 2].forEach(function (cha) {
      var ss = M.과목.filter(function (s) { return s.차 === cha && 교리[s.코드]; });
      h += '<section class="card"><h3>' + 차이름[cha] + "</h3>" + ss.map(function (s) {
        var g = 교리[s.코드];
        return '<div class="fixitem"><b>' + esc(s.이름) + '</b> <span class="chip">목표 ' + g.목표 + " · " + g.역할 + '</span><div class="tiny">' + esc(g.전술) + "</div></div>";
      }).join("") + "</section>";
    });
    h += '<p class="tiny">오늘 화면의 추천은 이 설계도를 따릅니다 — 득점 과목을 먼저 권하고, 목표에 가까워진 과목은 덜 권합니다. 근거: 제27~36회 기출 실측.</p>';
    $view.innerHTML = h;
  }

  /* ── 길잡이 ── */
  function 이동() {
    var p = (location.hash || "#/home").slice(2).split("/");
    try {
      if (p[0] === "tree") 트리(decodeURIComponent(p[1] || ""));
      else if (p[0] === "concept") 개념(decodeURIComponent(p[1] || ""));
      else if (p[0] === "study") 문제(decodeURIComponent(p[1] || ""), p[2] ? +p[2] : null);
      else if (p[0] === "analysis") 분석(decodeURIComponent(p[1] || ""));
      else if (p[0] === "fix") 법령();
      else if (p[0] === "settings") 설정화면();
      else if (p[0] === "plan") 설계도();
      else 홈();
    } catch (e) {
      $view.innerHTML = '<div class="empty">화면을 그리다 멈췄습니다: ' + esc(e.message) + "</div>";
      if (window.console) console.error(e);
    }
  }
  window.addEventListener("hashchange", 이동);
  디데이();
  이동();
})();
