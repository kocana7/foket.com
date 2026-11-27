/* Foket AI 관제판: 메인 상단 애니메이션.
   종목 네트워크(canvas) · 엔진 코드 · 종목 스캔 · 실적 요약 · 시그널 로그를 하나의 흐름으로 움직인다.
   실적 수치(승률·손익비·기록 수·최근 청산 손익)는 records.json(+ /api/storage/records)의 실제 기록으로 계산한다.
   화면 밖이면 멈추고, 모션 줄이기 설정이면 정지 화면만 그린다. */
(function () {
  var root = document.getElementById('aiConsole');
  if (!root) return;

  /* 안쪽 고리: 실적 기록이 있는 16종목. 바깥 고리: 만기·거래량 루틴으로 매일 추적하는 나머지 16종목 */
  var CORE = ['KOSPI', 'NQ', 'ES', 'GC', 'CL', 'NG', 'SIL', 'NKD', 'UB', 'ZW', '6E', '6J', '6B', '6A', '6N', '6M'];
  var EXTRA = ['MKOSPI', 'HSI', 'HHI', 'CN', 'TW', 'NIY', 'FDAX', 'FESX', 'VX', 'HG', 'SI', 'ZC', 'ZS', '6C', '6S', '6L'];
  var SYMS = CORE.concat(EXTRA), NSYM = SYMS.length;
  var LABEL = { KOSPI: 'KOSPI200', MKOSPI: 'MINI K200', HHI: 'HSCEI', CN: 'A50', TW: 'TAIWAN', FDAX: 'DAX', FESX: 'STOXX50', VX: 'VIX' };
  var SHORT = { KOSPI: 'K200', MKOSPI: 'MK200', HHI: 'HSCEI', CN: 'A50', TW: 'TWN', FDAX: 'DAX', FESX: 'SX5E', VX: 'VIX' };
  function lab(s) { return LABEL[s] || s; }

  var T = {
    ko: { h: 'Foket <em>AI</em> 트레이딩 엔진', s: '32개 종목을 실시간으로 분석해 시그널을 만듭니다', live: '분석 중',
      code: 'engine.py', codeR: 'python · 실행 중', graph: '종목 네트워크', graphR: '32 종목 · 2.8억 로직', scan: '종목 스캔', kpi: '실적 요약', kpiR: '실제 기록 기준',
      log: '시그널 로그', logR: 'foket · live', win: '승률', ratio: '손익비 (해외)', recs: '검증 기록', logic: '학습 로직', logicV: '2.8', logicU: '억',
      scanL: '{s} 패턴 스캔 · 점수 {n}', match: '{s} 로직 일치 {n}건', cand: '{s} 시그널 후보 평가', closed: '{d} {s} 청산', wait: '{s} 조건 대기',
      note: '화면은 분석 과정을 표현한 연출이며, 수치는 홈페이지에 게시된 실적 기록으로 계산합니다.', more: '실적 조회 →', won: '원', recU: '건' },
    en: { h: 'Foket <em>AI</em> Trading Engine', s: 'Analyzing 32 instruments in real time to generate signals', live: 'Analyzing',
      code: 'engine.py', codeR: 'python · running', graph: 'Instrument network', graphR: '32 symbols · 280M logics', scan: 'Symbol scan', kpi: 'Track record', kpiR: 'from real records',
      log: 'Signal log', logR: 'foket · live', win: 'Win rate', ratio: 'Payoff (overseas)', recs: 'Verified trades', logic: 'Trained logics', logicV: '280', logicU: 'M',
      scanL: '{s} pattern scan · score {n}', match: '{s} logic matches {n}', cand: '{s} signal candidate check', closed: '{d} {s} closed', wait: '{s} waiting for setup',
      note: 'This screen visualizes the analysis process; figures are calculated from the track record published on this site.', more: 'View performance →', won: '', recU: '' },
    de: { h: 'Foket <em>KI</em>-Trading-Engine', s: 'Analysiert 32 Kontrakte in Echtzeit und erzeugt Signale', live: 'Analyse läuft',
      code: 'engine.py', codeR: 'python · läuft', graph: 'Kontrakt-Netzwerk', graphR: '32 Kontrakte · 280 Mio. Logiken', scan: 'Kontrakt-Scan', kpi: 'Ergebnisse', kpiR: 'echte Daten',
      log: 'Signal-Log', logR: 'foket · live', win: 'Trefferquote', ratio: 'Gewinn/Verlust (Ausland)', recs: 'Geprüfte Trades', logic: 'Trainierte Logiken', logicV: '280', logicU: ' Mio.',
      scanL: '{s} Musterscan · Wert {n}', match: '{s} Logik-Treffer {n}', cand: '{s} Signalkandidat prüfen', closed: '{d} {s} geschlossen', wait: '{s} wartet auf Setup',
      note: 'Die Animation veranschaulicht den Analyseprozess; die Zahlen stammen aus den auf dieser Website veröffentlichten Ergebnissen.', more: 'Ergebnisse →', won: '', recU: '' },
    ja: { h: 'Foket <em>AI</em> トレーディングエンジン', s: '32銘柄をリアルタイムで分析し、シグナルを生成します', live: '分析中',
      code: 'engine.py', codeR: 'python · 実行中', graph: '銘柄ネットワーク', graphR: '32銘柄 · 2.8億ロジック', scan: '銘柄スキャン', kpi: '実績サマリー', kpiR: '実際の記録に基づく',
      log: 'シグナルログ', logR: 'foket · live', win: '勝率', ratio: '損益比 (海外)', recs: '検証済み取引', logic: '学習ロジック', logicV: '2.8', logicU: '億',
      scanL: '{s} パターンスキャン · スコア {n}', match: '{s} ロジック一致 {n}件', cand: '{s} シグナル候補を評価', closed: '{d} {s} 決済', wait: '{s} 条件待ち',
      note: '画面は分析過程を表現した演出であり、数値は当サイトに掲載した実績記録から計算しています。', more: '実績を見る →', won: '', recU: '件' },
    zh: { h: 'Foket <em>AI</em> 交易引擎', s: '实时分析32个品种并生成信号', live: '分析中',
      code: 'engine.py', codeR: 'python · 运行中', graph: '品种网络', graphR: '32个品种 · 2.8亿逻辑', scan: '品种扫描', kpi: '业绩摘要', kpiR: '基于真实记录',
      log: '信号日志', logR: 'foket · live', win: '胜率', ratio: '盈亏比 (海外)', recs: '已验证交易', logic: '学习逻辑', logicV: '2.8', logicU: '亿',
      scanL: '{s} 形态扫描 · 评分 {n}', match: '{s} 逻辑匹配 {n}条', cand: '{s} 信号候选评估', closed: '{d} {s} 平仓', wait: '{s} 等待条件',
      note: '画面为分析过程的演示，数据根据本网站公布的业绩记录计算。', more: '查看业绩 →', won: '', recU: '笔' },
    fr: { h: 'Moteur de trading <em>IA</em> Foket', s: 'Analyse 32 contrats en temps réel pour générer des signaux', live: 'Analyse',
      code: 'engine.py', codeR: 'python · actif', graph: 'Réseau des contrats', graphR: '32 contrats · 280 M de logiques', scan: 'Scan des contrats', kpi: 'Résultats', kpiR: 'données réelles',
      log: 'Journal des signaux', logR: 'foket · live', win: 'Taux de réussite', ratio: 'Ratio gain/perte (étranger)', recs: 'Trades vérifiés', logic: 'Logiques entraînées', logicV: '280', logicU: ' M',
      scanL: '{s} scan de motifs · score {n}', match: '{s} logiques concordantes {n}', cand: '{s} évaluation du signal', closed: '{d} {s} clôturé', wait: '{s} en attente',
      note: 'Cet écran illustre le processus d’analyse ; les chiffres proviennent des résultats publiés sur ce site.', more: 'Voir les résultats →', won: '', recU: '' },
    es: { h: 'Motor de trading <em>IA</em> Foket', s: 'Analiza 32 instrumentos en tiempo real para generar señales', live: 'Analizando',
      code: 'engine.py', codeR: 'python · activo', graph: 'Red de instrumentos', graphR: '32 instrumentos · 280 M de lógicas', scan: 'Escaneo', kpi: 'Resultados', kpiR: 'datos reales',
      log: 'Registro de señales', logR: 'foket · live', win: 'Tasa de acierto', ratio: 'Ganancia/pérdida (ext.)', recs: 'Operaciones verificadas', logic: 'Lógicas entrenadas', logicV: '280', logicU: ' M',
      scanL: '{s} escaneo de patrones · puntuación {n}', match: '{s} lógicas coincidentes {n}', cand: '{s} evaluación de señal', closed: '{d} {s} cerrado', wait: '{s} esperando condiciones',
      note: 'Esta pantalla ilustra el proceso de análisis; las cifras se calculan con los resultados publicados en este sitio.', more: 'Ver resultados →', won: '', recU: '' },
    ru: { h: 'Торговый <em>ИИ</em>-движок Foket', s: 'Анализирует 32 инструментов в реальном времени и формирует сигналы', live: 'Анализ',
      code: 'engine.py', codeR: 'python · работает', graph: 'Сеть инструментов', graphR: '32 инструментов · 280 млн логик', scan: 'Сканирование', kpi: 'Результаты', kpiR: 'по реальным данным',
      log: 'Журнал сигналов', logR: 'foket · live', win: 'Доля прибыльных', ratio: 'Прибыль/убыток (зарубеж.)', recs: 'Проверенных сделок', logic: 'Обученных логик', logicV: '280', logicU: ' млн',
      scanL: '{s} поиск паттернов · оценка {n}', match: '{s} совпадений логик {n}', cand: '{s} оценка кандидата', closed: '{d} {s} закрыта', wait: '{s} ожидание условий',
      note: 'Экран иллюстрирует процесс анализа; цифры рассчитаны по результатам, опубликованным на сайте.', more: 'Результаты →', won: '', recU: '' }
  };
  function lang() {
    var l = document.documentElement.lang;
    if (!T[l]) { try { l = localStorage.getItem('lang'); } catch (e) { l = null; } }
    return T[l] ? l : 'ko';
  }
  var L = T[lang()];
  function fmt(s, o) { return s.replace(/\{(\w)\}/g, function (_, k) { return o[k] !== undefined ? o[k] : ''; }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 뼈대 ── */
  root.innerHTML =
    '<div class="aic-top"><div class="aic-head"><h2 class="aic-h" data-k="h"></h2><span class="aic-s" data-k="s"></span></div>' +
    '<div class="aic-meta"><span class="aic-live"><i></i><span data-k="live"></span></span><span class="aic-clk">KST <b id="aicClk">--:--:--</b></span></div></div>' +
    '<div class="aic-grid">' +
      '<div class="aic-p aic-code"><div class="aic-ph"><span data-k="code"></span><span data-k="codeR"></span></div><div class="aic-pb" id="aicCode"></div>' +
        '<div class="aic-ft"><span>py3.12 · foket sdk</span><span id="aicTok">0 ops/s</span></div></div>' +
      '<div class="aic-p aic-graph"><div class="aic-ph"><span data-k="graph"></span><span data-k="graphR"></span></div><div class="aic-pb"><canvas id="aicCv" aria-hidden="true"></canvas>' +
        '<div class="aic-gl">nodes ' + NSYM + ' · edges <span id="aicEdges">0</span> · core FOKET-AI</div></div></div>' +
      '<div class="aic-p aic-scan"><div class="aic-ph"><span data-k="scan"></span><span id="aicScanN">0 / ' + NSYM + '</span></div><div class="aic-pb"><div class="aic-mx" id="aicMx"></div><div class="aic-bars" id="aicBars"></div></div></div>' +
      '<div class="aic-p"><div class="aic-ph"><span data-k="kpi"></span><span data-k="kpiR"></span></div><div class="aic-pb"><div class="aic-kpi">' +
        '<div><div class="aic-kv" id="aicWin">—</div><div class="aic-kl" data-k="win"></div></div>' +
        '<div><div class="aic-kv" id="aicRatio">—</div><div class="aic-kl" data-k="ratio"></div></div>' +
        '<div><div class="aic-kv" id="aicRecs">—</div><div class="aic-kl" data-k="recs"></div></div>' +
        '<div><div class="aic-kv" id="aicLogic">—</div><div class="aic-kl" data-k="logic"></div></div>' +
        '<div class="aic-spark" id="aicSpark"></div></div></div></div>' +
      '<div class="aic-p aic-log"><div class="aic-ph"><span data-k="log"></span><span data-k="logR"></span></div><div class="aic-pb" id="aicLog"></div></div>' +
    '</div>' +
    '<div class="aic-bot"><span data-k="note"></span><a href="performance.html" data-k="more"></a></div>';

  function $(id) { return document.getElementById(id); }
  function applyText() {
    L = T[lang()];
    root.querySelectorAll('[data-k]').forEach(function (el) {
      var k = el.getAttribute('data-k');
      if (k === 'h') el.innerHTML = L.h; else el.textContent = L[k];
    });
    renderKpi(false);
  }

  /* ── 종목 스캔 매트릭스 ── */
  var mx = $('aicMx'), cells = {};
  SYMS.forEach(function (s) {
    var c = document.createElement('div');
    c.className = 'aic-cell';
    c.innerHTML = '<b>' + (SHORT[s] || s) + '</b>';
    mx.appendChild(c); cells[s] = c;
  });
  var bars = $('aicBars'), barRows = [];
  for (var i = 0; i < 5; i++) {
    var r = document.createElement('div');
    r.className = 'aic-bar';
    r.innerHTML = '<span></span><div class="aic-bt"><i style="width:0"></i></div><span></span>';
    bars.appendChild(r); barRows.push(r);
  }
  var scores = {}, scanned = {};
  function scoreOf(s) { return scores[s] || 0; }
  function updateBars() {
    var top = SYMS.slice().sort(function (a, b) { return scoreOf(b) - scoreOf(a); }).slice(0, 5);
    top.forEach(function (s, i) {
      var r = barRows[i];
      r.children[0].textContent = lab(s);
      r.children[1].firstChild.style.width = Math.round(scoreOf(s)) + '%';
      r.children[2].textContent = scoreOf(s) ? (scoreOf(s) / 100).toFixed(2) : '--';
    });
    $('aicScanN').textContent = Object.keys(scanned).length + ' / ' + NSYM;
  }

  /* ── 실적 요약 (실제 기록) ── */
  var stats = null;
  function n(v) { v = Number(v); return isFinite(v) ? v : null; }
  function buildStats(lists) {
    var seen = {}, rows = [];
    lists.forEach(function (d) {
      if (!d) return;
      var v = d.value !== undefined ? d.value : d;
      if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
      var arr = Array.isArray(v) ? v : (v && Array.isArray(v.records) ? v.records : []);
      arr.forEach(function (r) {
        if (!r || !r.date || !r.sym) return;
        var p = n(r.pnl); if (p === null) return;
        var key = r.date + '|' + r.sym;
        if (seen[key]) return; seen[key] = 1;
        rows.push({ date: String(r.date).slice(0, 10), sym: String(r.sym).toUpperCase() === 'K200' ? 'KOSPI' : String(r.sym).toUpperCase(), pnl: p, cur: r.cur || (String(r.sym).toUpperCase() === 'KOSPI' ? 'KRW' : 'USD') });
      });
    });
    if (!rows.length) return null;
    rows.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    var win = 0, tot = 0, wSum = 0, wN = 0, lSum = 0, lN = 0;
    rows.forEach(function (r) {
      if (r.pnl === 0) return;
      tot++; if (r.pnl > 0) win++;
      if (r.cur === 'USD') { if (r.pnl > 0) { wSum += r.pnl; wN++; } else { lSum -= r.pnl; lN++; } }
    });
    return {
      rows: rows, count: rows.length,
      winRate: tot ? win / tot * 100 : null,
      payoff: (wN && lN) ? (wSum / wN) / (lSum / lN) : null
    };
  }
  function countTo(el, to, dec, suffix, dur) {
    if (reduce || !dur) { el.innerHTML = to.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; return; }
    var t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.innerHTML = (to * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function renderKpi(animate) {
    var d = animate ? 1600 : 0;
    countTo($('aicLogic'), Number(L.logicV), L.logicV.indexOf('.') >= 0 ? 1 : 0, '<small>' + L.logicU + '</small>', d);
    if (!stats) return;
    if (stats.winRate !== null) countTo($('aicWin'), stats.winRate, 1, '<small>%</small>', d);
    if (stats.payoff !== null) countTo($('aicRatio'), stats.payoff, 2, '<small>x</small>', d);
    countTo($('aicRecs'), stats.count, 0, L.recU ? '<small>' + L.recU + '</small>' : '', d);
  }
  function renderSpark() {
    var sp = $('aicSpark'); sp.textContent = '';
    var last = stats.rows.slice(-40), mU = 1, mK = 1;
    last.forEach(function (r) { var a = Math.abs(r.pnl); if (r.cur === 'KRW') mK = Math.max(mK, a); else mU = Math.max(mU, a); });
    last.forEach(function (r) {
      var i = document.createElement('i');
      var k = Math.abs(r.pnl) / (r.cur === 'KRW' ? mK : mU);
      i.style.height = Math.max(8, Math.round(k * 100)) + '%';
      if (r.pnl < 0) i.className = 'neg';
      sp.appendChild(i);
    });
  }
  function money(r) {
    var a = Math.abs(r.pnl), sg = r.pnl > 0 ? '+' : r.pnl < 0 ? '-' : '';
    if (r.cur === 'KRW') return sg + (lang() === 'ko' ? a.toLocaleString('en-US') + '원' : '₩' + a.toLocaleString('en-US'));
    return sg + '$' + a.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  /* ── 시그널 로그 ── */
  var logEl = $('aicLog'), resIdx = 0;
  function kst() {
    var d = new Date(Date.now() + 9 * 3600e3);
    return d.toISOString().slice(11, 19);
  }
  function addLog(lv, cls, msg, right, rcls) {
    var row = document.createElement('div');
    row.className = 'aic-lr';
    row.innerHTML = '<span class="t">' + kst() + '</span><span class="lv ' + cls + '">' + lv + '</span><span class="m">' + esc(msg) + '</span><span class="r ' + (rcls || '') + '">' + esc(right || '') + '</span>';
    logEl.appendChild(row);
    while (logEl.children.length > 12) logEl.removeChild(logEl.firstChild);
    var over = logEl.scrollHeight - logEl.clientHeight;
    if (over > 0) logEl.scrollTop = over;
  }
  function logResult() {
    if (!stats) return;
    var recent = stats.rows.slice(-30);
    var r = recent[recent.length - 1 - (resIdx++ % recent.length)];
    addLog('RESULT', 'win', fmt(L.closed, { d: r.date.slice(5), s: lab(r.sym) }), money(r), r.pnl > 0 ? 'up' : r.pnl < 0 ? 'dn' : '');
  }

  /* ── 엔진 코드 ── */
  var CODE = [
    ['k', 'from'], ['f', ' foket '], ['k', 'import'], ['f', ' engine, market'], null,
    ['f', 'SYMBOLS = market.watchlist()'], ['c', '            # 32'], null,
    ['k', 'def'], ['f', ' score(bars):'], null,
    ['f', '    s  = engine.trend(bars) * '], ['n', '0.40'], null,
    ['f', '    s += engine.volatility(bars) * '], ['n', '0.25'], null,
    ['f', '    s += engine.logic_match(bars) * '], ['n', '0.35'], null,
    ['f', '    '], ['k', 'return'], ['f', ' round(s, '], ['n', '2'], ['f', ')'], null,
    null,
    ['k', 'def'], ['f', ' scan():'], null,
    ['f', '    '], ['k', 'for'], ['f', ' sym '], ['k', 'in'], ['f', ' SYMBOLS:'], null,
    ['f', '        bars = market.bars(sym, tf='], ['st', '"1m"'], ['f', ')'], null,
    ['f', '        hits = engine.match(bars, '], ['n', '280_000_000'], ['f', ')'], null,
    ['f', '        '], ['k', 'yield'], ['f', ' sym, score(bars), hits'], null,
    null,
    ['k', 'def'], ['f', ' select(day):'], null,
    ['f', '    ranked = sorted(scan(), key='], ['k', 'lambda'], ['f', ' x: x[1])'], null,
    ['f', '    best = ranked[-'], ['n', '1'], ['f', ']'], ['c', '      # daily pick'], null,
    ['f', '    '], ['k', 'if'], ['f', ' best.score > '], ['n', '0.62'], ['f', ':'], null,
    ['f', '        engine.signal(best, risk='], ['st', '"1 lot"'], ['f', ')'], null,
    ['f', '    '], ['k', 'return'], ['f', ' best'], null,
    null,
    ['k', 'while'], ['f', ' market.is_open():'], null,
    ['f', '    pick = select(today())'], null,
    ['f', '    notify.telegram(pick)'], ['c', '     # SNS'], null,
    ['f', '    engine.learn(market.close())'], null
  ];
  var codeLines = [[]];
  CODE.forEach(function (t) { if (t === null) codeLines.push([]); else codeLines[codeLines.length - 1].push(t); });
  var codeEl = $('aicCode'), codeLine = 0, codeHtml = [];
  function lineHtml(i) {
    return '<span class="aic-ln">' + (i + 1) + '</span>' + codeLines[i].map(function (t) { return '<span class="aic-' + t[0] + '">' + esc(t[1]) + '</span>'; }).join('');
  }
  function stepCode() {
    if (codeLine >= codeLines.length) { codeLine = 0; codeHtml = []; }
    codeHtml.push(lineHtml(codeLine++));
    var vis = Math.max(12, Math.floor((codeEl.clientHeight - 16) / 17));
    var shown = codeHtml.slice(-vis);
    codeEl.innerHTML = shown.join('\n') + ' <span class="aic-cur"></span>';
  }
  function fullCode() { codeEl.innerHTML = codeLines.slice(0, 20).map(function (_, i) { return lineHtml(i); }).join('\n'); }

  /* ── 종목 네트워크 (canvas) ── */
  var cv = $('aicCv'), ctx = cv.getContext('2d'), W = 0, H = 0, DPR = 1;
  var nodes = [], hubs = [], pulses = [], edges = 0, flash = 0;
  function layout() {
    var r = cv.getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var cx = W / 2, cy = H / 2 + 4, small = W < 520;
    var ox = W * (small ? 0.41 : 0.44), oy = H * 0.43, ix = W * (small ? 0.25 : 0.27), iy = H * 0.27;
    nodes = SYMS.map(function (s, i) {
      var outer = i >= CORE.length, k = outer ? i - CORE.length + 0.5 : i;
      var a = -Math.PI / 2 + k / CORE.length * Math.PI * 2;
      return { s: s, outer: outer, ang: k / CORE.length, bx: cx + Math.cos(a) * (outer ? ox : ix), by: cy + Math.sin(a) * (outer ? oy : iy), ph: Math.random() * 6.28, glow: 0 };
    });
    hubs = [];
    for (var i = 0; i < 10; i++) {
      var a = i / 10 * Math.PI * 2 + 0.3;
      hubs.push({ bx: cx + Math.cos(a) * ix * 0.5, by: cy + Math.sin(a) * iy * 0.55, ph: Math.random() * 6.28 });
    }
    root._small = small;
    root._core = { x: cx, y: cy };
    edges = CORE.length * 2 + EXTRA.length * 3 + hubs.length;
    $('aicEdges').textContent = edges;
  }
  function innerOf(i) { var k = i - CORE.length; return [k, (k + 1) % CORE.length]; }
  function pos(o, t) { return { x: o.bx + Math.sin(t * 0.0006 + o.ph) * 4, y: o.by + Math.cos(t * 0.0005 + o.ph) * 3 }; }
  function nearHubs(i) { var k = Math.round(nodes[i].ang * hubs.length) % hubs.length; return [k, (k + 1) % hubs.length]; }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var core = root._core;
    /* 배경 격자 점 */
    ctx.fillStyle = 'rgba(60,110,180,.10)';
    for (var gx = 12; gx < W; gx += 22) for (var gy = 12; gy < H; gy += 22) ctx.fillRect(gx, gy, 1, 1);
    var hp = hubs.map(function (h) { return pos(h, t); });
    /* 선 */
    ctx.lineWidth = 0.6;
    var np = nodes.map(function (nd) { return pos(nd, t); });
    nodes.forEach(function (nd, i) {
      var p = np[i];
      if (nd.outer) {
        innerOf(i).forEach(function (k) {
          ctx.strokeStyle = 'rgba(80,150,255,' + (0.12 + nd.glow * 0.5) + ')';
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(np[k].x, np[k].y); ctx.stroke();
        });
        return;
      }
      nearHubs(i).forEach(function (k) {
        ctx.strokeStyle = 'rgba(80,150,255,' + (0.16 + nd.glow * 0.5) + ')';
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.quadraticCurveTo((p.x + hp[k].x) / 2 + (core.y - p.y) * 0.08, (p.y + hp[k].y) / 2, hp[k].x, hp[k].y); ctx.stroke();
      });
    });
    hp.forEach(function (h) {
      ctx.strokeStyle = 'rgba(120,180,255,.22)';
      ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(core.x, core.y); ctx.stroke();
    });
    for (var j = 0; j < hp.length; j++) {
      var a = hp[j], b = hp[(j + 1) % hp.length];
      ctx.strokeStyle = 'rgba(80,150,255,.10)';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    /* 펄스 */
    pulses.forEach(function (pl) {
      var k = Math.min(1, (t - pl.t0) / pl.dur);
      var pts = pl.path.map(function (id) { return id === 'c' ? core : id[0] === 'h' ? hp[id[1]] : np[id[1]]; });
      var seg = k * (pts.length - 1), si = Math.min(pts.length - 2, Math.floor(seg)), q = seg - si;
      var x = pts[si].x + (pts[si + 1].x - pts[si].x) * q, y = pts[si].y + (pts[si + 1].y - pts[si].y) * q;
      var g = ctx.createRadialGradient(x, y, 0, x, y, 7);
      g.addColorStop(0, pl.hit ? 'rgba(0,230,150,1)' : 'rgba(140,200,255,1)');
      g.addColorStop(1, 'rgba(0,120,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.29); ctx.fill();
    });
    /* 허브 */
    hp.forEach(function (h) { ctx.fillStyle = '#2f7bff'; ctx.fillRect(h.x - 2, h.y - 2, 4, 4); });
    /* 코어 */
    var pr = 22 + Math.sin(t * 0.003) * 2 + flash * 8;
    ctx.strokeStyle = 'rgba(61,165,255,' + (0.35 + flash * 0.5) + ')'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(core.x, core.y, pr + 10, 0, 6.29); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(core.x, core.y, pr + 20, t * 0.0008, t * 0.0008 + 6.29); ctx.stroke(); ctx.setLineDash([]);
    var cg = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, pr);
    cg.addColorStop(0, 'rgba(61,165,255,.95)'); cg.addColorStop(1, 'rgba(11,63,158,.85)');
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(core.x, core.y, pr, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 11px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('FOKET', core.x, core.y - 5); ctx.font = '600 9px Inter,sans-serif'; ctx.fillStyle = '#cfe4ff'; ctx.fillText('AI CORE', core.x, core.y + 7);
    /* 종목 노드 */
    var sm = root._small, fs = sm ? 8.5 : 10, cw = sm ? 5.3 : 6.2, hh = sm ? 13 : 16;
    ctx.font = '600 ' + fs + 'px "JetBrains Mono",Consolas,monospace';
    nodes.forEach(function (nd, i) {
      var p = np[i], label = sm ? (SHORT[nd.s] || nd.s) : lab(nd.s), w = label.length * cw + (sm ? 8 : 12), on = nd.glow > 0.05;
      ctx.fillStyle = on ? 'rgba(21,101,224,' + (0.55 + nd.glow * 0.45) + ')' : 'rgba(8,18,36,.95)';
      ctx.strokeStyle = on ? 'rgba(120,190,255,.95)' : nd.outer ? 'rgba(47,123,255,.3)' : 'rgba(47,123,255,.6)';
      ctx.lineWidth = 1;
      ctx.fillRect(p.x - w / 2, p.y - hh / 2, w, hh); ctx.strokeRect(p.x - w / 2 + 0.5, p.y - hh / 2 + 0.5, w - 1, hh - 1);
      ctx.fillStyle = on ? '#fff' : nd.outer ? '#6f88ad' : '#b3cbec';
      ctx.fillText(label, p.x, p.y + 0.5);
      nd.glow *= 0.965;
    });
    flash *= 0.93;
  }

  /* ── 흐름: 종목 → 허브 → 코어 → 로그/스캔 ── */
  var tick = 0;
  function emit(t) {
    var i = Math.floor(Math.random() * SYMS.length), s = SYMS[i];
    var hit = Math.random() < 0.18;
    nodes[i].glow = 1;
    var path = [['n', i]], via = i;
    if (nodes[i].outer) { via = innerOf(i)[Math.random() < 0.5 ? 0 : 1]; path.push(['n', via]); }
    path.push(['h', nearHubs(via)[Math.random() < 0.5 ? 0 : 1]], 'c');
    pulses.push({ i: i, path: path, t0: t, dur: (nodes[i].outer ? 1800 : 1300) + Math.random() * 500, hit: hit, s: s });
    cells[s].classList.add('on');
  }
  function arrive(pl) {
    var s = pl.s, sc = 38 + Math.random() * 58;
    scores[s] = sc; scanned[s] = 1; flash = 1;
    var c = cells[s];
    c.classList.remove('on');
    var r = Math.random();
    if (pl.hit) {
      c.classList.add('hit'); setTimeout(function () { c.classList.remove('hit'); }, 2600);
      addLog('SIGNAL', 'sig', fmt(L.cand, { s: lab(s) }), (sc / 100).toFixed(2), 'up');
    } else if (r < 0.45) addLog('SCAN', 'ok', fmt(L.scanL, { s: lab(s), n: (sc / 100).toFixed(2) }), Math.round(80 + Math.random() * 400) + 'ms');
    else if (r < 0.8) addLog('MATCH', 'ok', fmt(L.match, { s: lab(s), n: Math.round(1200 + Math.random() * 48000).toLocaleString('en-US') }), Math.round(60 + Math.random() * 300) + 'ms');
    else addLog('WAIT', '', fmt(L.wait, { s: lab(s) }), '');
    updateBars();
  }

  var running = false, visible = true, lastEmit = 0, lastCode = 0, lastRes = 0, lastClk = 0, ops = 0;
  function loop(t) {
    if (!running) return;
    if (t - lastEmit > 650 + Math.random() * 500) { emit(t); lastEmit = t; }
    if (t - lastCode > 420) { stepCode(); lastCode = t; }
    if (t - lastRes > 5200) { logResult(); lastRes = t; }
    if (t - lastClk > 1000) { $('aicClk').textContent = kst(); ops = Math.round(9000 + Math.random() * 3500); $('aicTok').textContent = ops.toLocaleString('en-US') + ' ops/s'; lastClk = t; }
    pulses = pulses.filter(function (pl) { if (t - pl.t0 >= pl.dur) { arrive(pl); return false; } return true; });
    draw(t);
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible || document.hidden) return; running = true; requestAnimationFrame(loop); }
  function stop() { running = false; }

  function staticFrame() {
    SYMS.forEach(function (s, i) { scores[s] = 40 + ((i * 37) % 55); scanned[s] = 1; });
    updateBars(); fullCode(); $('aicClk').textContent = kst(); draw(0);
  }

  layout();
  applyText();
  updateBars();
  if (reduce) staticFrame();
  else { for (var w = 0; w < 6; w++) stepCode(); }

  var rT = 0;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { layout(); if (!running) draw(0); }, 120); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }, { threshold: 0.05 }).observe(root);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();

  /* 실적 기록 불러오기 */
  function getJ(u) { return fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }
  var api = location.protocol !== 'file:' ? location.origin + '/api' : 'http://localhost:3000/api';
  Promise.all([getJ('records.json'), getJ(api + '/storage/records')]).then(function (res) {
    stats = buildStats(res);
    if (!stats) return;
    renderKpi(true); renderSpark();
    logResult(); logResult();
  });

  /* 언어 변경 따라가기 */
  new MutationObserver(function () { applyText(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
