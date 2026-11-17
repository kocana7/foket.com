/* Shared i18n helpers for all public pages: symbol names, money format,
   profit calculation basis notes, and the floating Telegram/KakaoTalk labels. */
(function () {
  var LANGS = ['ko', 'en', 'de', 'ja', 'zh', 'fr', 'es', 'ru'];

  var SYM = {
    '6A':   { en: 'Australian dollar', de: 'Australischer Dollar', ja: '豪ドル', zh: '澳元', fr: 'Dollar australien', es: 'Dólar australiano', ru: 'Австралийский доллар' },
    '6B':   { en: 'British pound', de: 'Britisches Pfund', ja: '英ポンド', zh: '英镑', fr: 'Livre sterling', es: 'Libra esterlina', ru: 'Британский фунт' },
    '6E':   { en: 'Euro', de: 'Euro', ja: 'ユーロ', zh: '欧元', fr: 'Euro', es: 'Euro', ru: 'Евро' },
    '6J':   { en: 'Japanese yen', de: 'Japanischer Yen', ja: '日本円', zh: '日元', fr: 'Yen japonais', es: 'Yen japonés', ru: 'Японская иена' },
    '6M':   { en: 'Mexican peso', de: 'Mexikanischer Peso', ja: 'メキシコペソ', zh: '墨西哥比索', fr: 'Peso mexicain', es: 'Peso mexicano', ru: 'Мексиканское песо' },
    '6N':   { en: 'New Zealand dollar', de: 'Neuseeland-Dollar', ja: 'NZドル', zh: '新西兰元', fr: 'Dollar néo-zélandais', es: 'Dólar neozelandés', ru: 'Новозеландский доллар' },
    'CL':   { en: 'Crude oil (WTI)', de: 'Rohöl (WTI)', ja: '原油 (WTI)', zh: '原油 (WTI)', fr: 'Pétrole brut (WTI)', es: 'Petróleo crudo (WTI)', ru: 'Нефть (WTI)' },
    'ES':   { en: 'S&P 500 (E-mini)', de: 'S&P 500 (E-mini)', ja: 'S&P500 (E-mini)', zh: '标普500 (E-mini)', fr: 'S&P 500 (E-mini)', es: 'S&P 500 (E-mini)', ru: 'S&P 500 (E-mini)' },
    'GC':   { en: 'Gold', de: 'Gold', ja: '金', zh: '黄金', fr: 'Or', es: 'Oro', ru: 'Золото' },
    'KOSPI':{ en: 'KOSPI 200 futures', de: 'KOSPI-200-Future', ja: 'KOSPI200先物', zh: 'KOSPI200期货', fr: 'Contrat KOSPI 200', es: 'Futuro KOSPI 200', ru: 'Фьючерс KOSPI 200' },
    'NG':   { en: 'Natural gas', de: 'Erdgas', ja: '天然ガス', zh: '天然气', fr: 'Gaz naturel', es: 'Gas natural', ru: 'Природный газ' },
    'NKD':  { en: 'Nikkei 225 (USD)', de: 'Nikkei 225 (USD)', ja: '日経225 (ドル建て)', zh: '日经225 (美元)', fr: 'Nikkei 225 (USD)', es: 'Nikkei 225 (USD)', ru: 'Nikkei 225 (USD)' },
    'NQ':   { en: 'Nasdaq-100 (E-mini)', de: 'Nasdaq-100 (E-mini)', ja: 'ナスダック100 (E-mini)', zh: '纳斯达克100 (E-mini)', fr: 'Nasdaq-100 (E-mini)', es: 'Nasdaq-100 (E-mini)', ru: 'Nasdaq-100 (E-mini)' },
    'SIL':  { en: 'Micro silver', de: 'Micro-Silber', ja: 'マイクロ銀', zh: '微型白银', fr: 'Micro argent', es: 'Micro plata', ru: 'Микро-серебро' },
    'UB':   { en: 'Ultra U.S. Treasury bond', de: 'Ultra-US-Staatsanleihe', ja: 'ウルトラ米国債', zh: '超长期美国国债', fr: 'Ultra T-Bond US', es: 'Ultra bono del Tesoro de EE. UU.', ru: 'Ультра казначейские облигации США' },
    'ZW':   { en: 'Wheat', de: 'Weizen', ja: '小麦', zh: '小麦', fr: 'Blé', es: 'Trigo', ru: 'Пшеница' }
  };
  SYM.K200 = SYM.KOSPI;

  /* Every profit figure on the site is calculated on the Foket Daily Signal basis.
     rec = signal records (previous day's record, performance page),
     sym = per-symbol figures (return status cards, 30-day symbol cards). */
  var BASIS = {
    title: { ko: '수익 산정 기준', en: 'How profits are calculated', de: 'Berechnungsgrundlage', ja: '収益の算定基準', zh: '收益计算标准', fr: 'Méthode de calcul', es: 'Base de cálculo', ru: 'Как рассчитывается доходность' },
    rec: {
      ko: '홈페이지에 게시된 모든 수익 수치는 포켓 데일리 시그널 기준으로 산정합니다. 매일 시스템이 선별한 해외선물 1종목과 코스피200 선물 1종목에 대해, 포켓 자동 시스템의 매매 신호대로 종목당 1계약을 진입하고 당일 청산했다고 가정해 계산한 결과입니다. 수수료·슬리피지에 따라 실제 결과와 다를 수 있습니다. 과거 실적은 미래 수익을 보장하지 않습니다.',
      en: 'All profit figures on this site are calculated on the Foket Daily Signal basis: for the one overseas futures symbol and one KOSPI 200 futures contract selected by the system each day, we assume one contract per symbol is entered as the Foket automated system signals and closed the same day. Actual results may differ due to fees and slippage. Past performance does not guarantee future results.',
      de: 'Alle Gewinnzahlen auf dieser Website werden auf Basis des Foket Daily Signal berechnet: Für den täglich vom System ausgewählten ausländischen Future und den KOSPI-200-Future wird angenommen, dass je ein Kontrakt gemäß den Signalen des automatisierten Foket-Systems eröffnet und am selben Tag geschlossen wird. Gebühren und Slippage können zu Abweichungen führen. Vergangene Ergebnisse garantieren keine zukünftigen Gewinne.',
      ja: '当サイトに掲載するすべての収益数値は、Foket デイリーシグナル基準で算定しています。システムが毎日選んだ海外先物1銘柄とKOSPI200先物1銘柄について、Foket自動システムの売買シグナルどおりに1銘柄1枚でエントリーし、当日中に決済したと仮定して計算した結果です。手数料・スリッページにより実際の結果と異なる場合があります。過去の実績は将来の収益を保証しません。',
      zh: '本网站发布的所有收益数据均按 Foket 每日信号标准计算：针对系统每天选出的1个海外期货品种和1个KOSPI200期货品种，假设按照Foket自动系统的交易信号每个品种开仓1手并于当日平仓而得出的结果。因手续费和滑点，实际结果可能有所不同。过往业绩不代表未来收益。',
      fr: 'Tous les chiffres de gains publiés sur ce site sont calculés sur la base du Foket Daily Signal : pour le contrat à terme étranger et le contrat KOSPI 200 sélectionnés chaque jour par le système, on suppose qu’un contrat par symbole est ouvert selon les signaux du système automatisé Foket et clôturé le jour même. Les frais et le slippage peuvent entraîner des écarts. Les performances passées ne garantissent pas les gains futurs.',
      es: 'Todas las cifras de ganancias publicadas en este sitio se calculan con base en Foket Daily Signal: para el futuro extranjero y el futuro KOSPI 200 que el sistema selecciona cada día, se supone que se abre un contrato por símbolo según las señales del sistema automatizado de Foket y se cierra el mismo día. Los resultados reales pueden diferir por comisiones y slippage. El rendimiento pasado no garantiza ganancias futuras.',
      ru: 'Все показатели доходности на сайте рассчитаны на основе Foket Daily Signal: для одного зарубежного фьючерса и одного фьючерса KOSPI 200, которые система выбирает каждый день, предполагается вход одним контрактом по сигналам автоматической системы Foket и закрытие в тот же день. Из‑за комиссий и проскальзывания фактические результаты могут отличаться. Прошлые результаты не гарантируют будущей доходности.'
    },
    sym: {
      ko: '종목별 수치도 포켓 데일리 시그널과 같은 방식으로 산정합니다. 각 종목에 포켓 자동 시스템의 매매 신호를 1계약 기준으로 적용하고, 당일 진입·당일 청산했다고 가정해 계산한 결과입니다. 수수료·슬리피지에 따라 실제 결과와 다를 수 있습니다. 과거 실적은 미래 수익을 보장하지 않습니다.',
      en: 'Per-symbol figures are calculated the same way as the Foket Daily Signal: the Foket automated system’s signals are applied to each symbol for one contract, assuming entry and exit on the same day. Actual results may differ due to fees and slippage. Past performance does not guarantee future results.',
      de: 'Die Werte je Kontrakt werden auf dieselbe Weise wie beim Foket Daily Signal berechnet: Die Signale des automatisierten Foket-Systems werden auf je einen Kontrakt angewendet, mit Eröffnung und Schließung am selben Tag. Gebühren und Slippage können zu Abweichungen führen. Vergangene Ergebnisse garantieren keine zukünftigen Gewinne.',
      ja: '銘柄別の数値も Foket デイリーシグナルと同じ方法で算定しています。各銘柄にFoket自動システムの売買シグナルを1枚基準で適用し、当日エントリー・当日決済と仮定して計算した結果です。手数料・スリッページにより実際の結果と異なる場合があります。過去の実績は将来の収益を保証しません。',
      zh: '各品种数据同样按 Foket 每日信号的方法计算：将Foket自动系统的交易信号按1手应用于各品种，并假设当日开仓、当日平仓。因手续费和滑点，实际结果可能有所不同。过往业绩不代表未来收益。',
      fr: 'Les chiffres par symbole sont calculés de la même manière que pour le Foket Daily Signal : les signaux du système automatisé Foket sont appliqués à chaque symbole pour un contrat, avec entrée et sortie le même jour. Les frais et le slippage peuvent entraîner des écarts. Les performances passées ne garantissent pas les gains futurs.',
      es: 'Las cifras por símbolo se calculan igual que en Foket Daily Signal: las señales del sistema automatizado de Foket se aplican a cada símbolo con un contrato, suponiendo entrada y salida el mismo día. Los resultados reales pueden diferir por comisiones y slippage. El rendimiento pasado no garantiza ganancias futuras.',
      ru: 'Показатели по инструментам рассчитываются так же, как для Foket Daily Signal: сигналы автоматической системы Foket применяются к каждому инструменту на один контракт с входом и выходом в тот же день. Из‑за комиссий и проскальзывания фактические результаты могут отличаться. Прошлые результаты не гарантируют будущей доходности.'
    }
  };

  var FLOAT = {
    tg: { ko: '텔레그램 문의', en: 'Telegram Inquiry', de: 'Telegram-Anfrage', ja: 'Telegramでお問い合わせ', zh: 'Telegram 咨询', fr: 'Contact Telegram', es: 'Consulta por Telegram', ru: 'Запрос в Telegram' },
    kk: { ko: '카카오톡 문의', en: 'KakaoTalk Inquiry', de: 'KakaoTalk-Anfrage', ja: 'KakaoTalkでお問い合わせ', zh: 'KakaoTalk 咨询', fr: 'Contact KakaoTalk', es: 'Consulta por KakaoTalk', ru: 'Запрос в KakaoTalk' }
  };

  function lang() {
    var l = document.documentElement.lang || '';
    if (LANGS.indexOf(l) < 0) { try { l = localStorage.getItem('lang') || 'ko'; } catch (e) { l = 'ko'; } }
    return LANGS.indexOf(l) < 0 ? 'ko' : l;
  }
  function pick(map, l) { l = l || lang(); return map[l] || map.en || map.ko; }

  function symName(sym, koName, l) {
    l = l || lang();
    if (l === 'ko') return koName || '';
    var m = SYM[String(sym || '').toUpperCase()];
    return m ? (m[l] || m.en) : (koName && /[가-힣]/.test(koName) ? '' : (koName || ''));
  }
  /* KRW: "1,000원" in Korean, "₩1,000" elsewhere. USD: "$1,000". */
  function money(n, cur, l) {
    l = l || lang(); cur = String(cur || 'USD').toUpperCase();
    var s = Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: cur === 'KRW' ? 0 : 2 });
    var g = n > 0 ? '+' : (n < 0 ? '-' : '');
    if (cur === 'KRW') return l === 'ko' ? g + s + '원' : g + '₩' + s;
    return g + (cur === 'USD' ? '$' : cur + ' ') + s;
  }

  function refresh() {
    var l = lang();
    document.querySelectorAll('[data-fk-float]').forEach(function (el) { el.textContent = pick(FLOAT[el.getAttribute('data-fk-float')] || {}, l); });
    document.querySelectorAll('[data-fk-basis]').forEach(function (el) {
      var kind = el.getAttribute('data-fk-basis');
      el.textContent = '';
      var b = document.createElement('b'); b.textContent = pick(BASIS.title, l) + ' ';
      el.appendChild(b); el.appendChild(document.createTextNode(pick(BASIS[kind] || BASIS.rec, l)));
    });
  }

  /* Telegram links. [data-tg="free"] = inquiry buttons -> support bot (admin telegram_bot, default foket_center_bot).
     [data-tg="channel"] = notice channel (admin telegram_channel, default foket_center_bot).
     The retired foketsignal_Lobby room is never used. */
  var TG_BOT = 'https://t.me/foket_center_bot', TG_CHANNEL = 'https://t.me/foket_center_bot';
  function okUrl(u, d) { return (u && !/foketsignal_lobby/i.test(u)) ? u : d; }
  function tgUrl(cfg) { return okUrl(cfg && cfg.telegram_bot, TG_BOT); }
  function channelUrl(cfg) { return okUrl(cfg && cfg.telegram_channel, TG_CHANNEL); }
  function applyTg(cfg) {
    var u = tgUrl(cfg), c = channelUrl(cfg);
    document.querySelectorAll('[data-tg="free"]').forEach(function (el) { el.href = u; });
    document.querySelectorAll('[data-tg="channel"]').forEach(function (el) { el.href = c; });
  }
  function loadTg() {
    var base = location.protocol !== 'file:' ? location.origin + '/api' : 'http://localhost:3000/api';
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem('fk_settings') || 'null'); } catch (e) {}
    applyTg(cached);
    fetch(base + '/storage/settings', { cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.success && j.value) applyTg(JSON.parse(j.value)); }).catch(function () {});
  }
  window.FK_I18N = { lang: lang, symName: symName, money: money, basis: BASIS, refresh: refresh, tgUrl: tgUrl, channelUrl: channelUrl };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadTg); else loadTg();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh); else refresh();
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
})();
