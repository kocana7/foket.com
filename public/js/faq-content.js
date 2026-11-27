/* Built-in FAQ content for faq.html, in the 8 site languages.
   Answers support "\n" line breaks, "• " bullets and [text](url) links.
   Entries added in the admin page (storage key "faq") are shown after these,
   under the "more" category. */
window.FOKET_FAQ = {
  cats: [
    { id: 'service', icon: 'fa-layer-group' },
    { id: 'trial', icon: 'fa-gift' },
    { id: 'pricing', icon: 'fa-receipt' },
    { id: 'signals', icon: 'fa-bolt' },
    { id: 'risk', icon: 'fa-shield-halved' }
  ],
  catNames: {
    all:     { ko: '전체', en: 'All', de: 'Alle', ja: 'すべて', zh: '全部', fr: 'Tout', es: 'Todo', ru: 'Все' },
    service: { ko: '서비스 소개', en: 'Services', de: 'Dienste', ja: 'サービス紹介', zh: '服务介绍', fr: 'Services', es: 'Servicios', ru: 'Сервисы' },
    trial:   { ko: '무료 체험', en: 'Free trial', de: 'Gratis-Test', ja: '無料体験', zh: '免费体验', fr: 'Essai gratuit', es: 'Prueba gratis', ru: 'Пробный период' },
    pricing: { ko: '요금·결제', en: 'Pricing', de: 'Preise', ja: '料金・お支払い', zh: '费用与支付', fr: 'Tarifs', es: 'Precios', ru: 'Стоимость' },
    signals: { ko: '신호·포지션', en: 'Signals', de: 'Signale', ja: 'シグナル・ポジション', zh: '信号与持仓', fr: 'Signaux', es: 'Señales', ru: 'Сигналы' },
    edu:     { ko: 'ROF 교육', en: 'Education', de: 'Ausbildung', ja: 'ROF教育', zh: 'ROF 教育', fr: 'Formation', es: 'Formación', ru: 'Обучение' },
    risk:    { ko: '위험·책임', en: 'Risk', de: 'Risiko', ja: 'リスク・責任', zh: '风险与责任', fr: 'Risques', es: 'Riesgos', ru: 'Риски' },
    more:    { ko: '추가 안내', en: 'More', de: 'Weiteres', ja: 'その他', zh: '其他', fr: 'Autres', es: 'Más', ru: 'Другое' }
  },
  items: [
    /* ── 서비스 소개 ── */
    {
      id: 'what', cat: 'service',
      q: {
        ko: '포켓은 어떤 서비스인가요?',
        en: 'What is Foket?',
        de: 'Was ist Foket?',
        ja: 'Foketはどんなサービスですか？',
        zh: 'Foket 是什么服务？',
        fr: 'Qu’est-ce que Foket ?',
        es: '¿Qué es Foket?',
        ru: 'Что такое Foket?'
      },
      a: {
        ko: '포켓은 CME 선물과 코스피200, 16개 종목에서 매일 2억 8천만 개의 트레이딩 로직을 실행·검증하고, 그 결과로 선별한 매수·매도 신호를 텔레그램으로 1:1 보내 드리는 시그널 서비스입니다.\n"어떤 천재의 트레이딩 로직도 AI의 무한 학습 실적결과를 이길 수 없습니다." 포켓은 감이 아니라 매일 쌓이는 데이터로 판단합니다.',
        en: 'Foket runs and verifies 280 million trading logics every day across 16 markets (CME futures and KOSPI 200), and sends the buy/sell signals selected from those results to you one-to-one on Telegram.\n"No genius’s trading logic can beat the results of AI’s endless learning." Foket decides with data that grows every day, not with gut feeling.',
        de: 'Foket führt täglich 280 Millionen Handelslogiken auf 16 Märkten (CME-Futures und KOSPI 200) aus, prüft die Ergebnisse und sendet Ihnen die daraus ausgewählten Kauf-/Verkaufssignale persönlich per Telegram.\n„Keine Trading-Logik eines Genies schlägt die Ergebnisse des unendlichen Lernens einer KI.“ Foket entscheidet nach Daten, die jeden Tag wachsen, nicht nach Bauchgefühl.',
        ja: 'Foketは、CME先物とKOSPI200の16銘柄で毎日2億8千万個のトレーディングロジックを実行・検証し、その結果から選んだ売買シグナルをTelegramで1対1でお届けするシグナルサービスです。\n「どんな天才のトレーディングロジックも、AIの無限学習の実績には勝てません。」Foketは勘ではなく、毎日積み重なるデータで判断します。',
        zh: 'Foket 每天在 CME 期货和 KOSPI200 共 16 个品种上运行并验证 2.8 亿个交易逻辑，并将据此筛选出的买卖信号通过 Telegram 一对一发送给您。\n“任何天才的交易逻辑，都无法战胜 AI 无限学习的实绩。”Foket 依靠每天积累的数据做判断，而不是凭感觉。',
        fr: 'Foket exécute et vérifie chaque jour 280 millions de logiques de trading sur 16 marchés (futures CME et KOSPI 200), puis vous envoie en direct sur Telegram les signaux d’achat/vente sélectionnés à partir de ces résultats.\n« Aucune logique de trading, même géniale, ne bat les résultats de l’apprentissage infini de l’IA. » Foket décide avec des données qui s’enrichissent chaque jour, pas à l’intuition.',
        es: 'Foket ejecuta y verifica cada día 280 millones de lógicas de trading en 16 mercados (futuros CME y KOSPI 200) y le envía por Telegram, de forma individual, las señales de compra/venta seleccionadas a partir de esos resultados.\n«Ninguna lógica de trading de un genio puede superar los resultados del aprendizaje infinito de la IA». Foket decide con datos que crecen cada día, no por intuición.',
        ru: 'Foket ежедневно запускает и проверяет 280 млн торговых логик на 16 рынках (фьючерсы CME и KOSPI 200) и отправляет вам лично в Telegram отобранные по результатам сигналы на покупку и продажу.\n«Никакая торговая логика гения не превзойдёт результаты бесконечного обучения ИИ». Foket принимает решения на основе данных, которые растут каждый день, а не интуиции.'
      }
    },
    {
      id: 'daily-vs-select', cat: 'service',
      q: {
        ko: '데일리 시그널과 셀렉트 시그널은 무엇이 다른가요?',
        en: 'What is the difference between Daily Signal and Select Signal?',
        de: 'Was ist der Unterschied zwischen Daily Signal und Select Signal?',
        ja: 'デイリーシグナルとセレクトシグナルの違いは何ですか？',
        zh: '每日信号和精选信号有什么区别？',
        fr: 'Quelle est la différence entre Daily Signal et Select Signal ?',
        es: '¿Qué diferencia hay entre Daily Signal y Select Signal?',
        ru: 'Чем Daily Signal отличается от Select Signal?'
      },
      a: {
        ko: '• 포켓 데일리 시그널: 시스템이 매일 선별한 해외선물 1종목과 한국선물(코스피200) 1종목, 총 2종목의 신호를 받습니다. 해외선물 종목은 날마다 바뀔 수 있습니다.\n• 포켓 셀렉트 시그널: 포켓이 운용하는 종목 가운데 원하는 1종목을 고르시면, 그 종목에서 검증 결과가 가장 우수한 시스템의 신호를 보내 드립니다.\n두 서비스의 요금은 같습니다.',
        en: '• Foket Daily Signal: signals for 2 symbols, one overseas futures symbol selected by the system each day and one Korean futures symbol (KOSPI 200). The overseas symbol may change from day to day.\n• Foket Select Signal: choose any one symbol that Foket trades, and you receive signals from the system with the best verified results on that symbol.\nBoth services cost the same.',
        de: '• Foket Daily Signal: Signale für 2 Symbole – ein täglich vom System ausgewählter ausländischer Future und ein koreanischer Future (KOSPI 200). Der ausländische Future kann täglich wechseln.\n• Foket Select Signal: Wählen Sie ein von Foket gehandeltes Symbol, und Sie erhalten die Signale des Systems mit den besten geprüften Ergebnissen für dieses Symbol.\nBeide Dienste kosten gleich viel.',
        ja: '• Foketデイリーシグナル：システムが毎日選ぶ海外先物1銘柄と韓国先物（KOSPI200）1銘柄、計2銘柄のシグナルを受け取れます。海外先物の銘柄は日によって変わることがあります。\n• Foketセレクトシグナル：Foketが運用する銘柄の中からお好きな1銘柄を選ぶと、その銘柄で検証結果が最も優れたシステムのシグナルをお届けします。\n2つのサービスの料金は同じです。',
        zh: '• Foket 每日信号：接收系统每天筛选的 1 个海外期货品种和 1 个韩国期货品种（KOSPI200），共 2 个品种的信号。海外期货品种可能每天不同。\n• Foket 精选信号：从 Foket 运营的品种中任选 1 个，我们会发送该品种上验证结果最优的系统信号。\n两项服务价格相同。',
        fr: '• Foket Daily Signal : des signaux sur 2 symboles, un future étranger choisi chaque jour par le système et un future coréen (KOSPI 200). Le symbole étranger peut changer d’un jour à l’autre.\n• Foket Select Signal : choisissez un symbole parmi ceux que Foket traite, et vous recevez les signaux du système ayant les meilleurs résultats vérifiés sur ce symbole.\nLes deux services ont le même tarif.',
        es: '• Foket Daily Signal: señales para 2 símbolos, un futuro extranjero elegido cada día por el sistema y un futuro coreano (KOSPI 200). El símbolo extranjero puede cambiar de un día a otro.\n• Foket Select Signal: elija un símbolo de los que opera Foket y recibirá las señales del sistema con los mejores resultados verificados en ese símbolo.\nAmbos servicios tienen el mismo precio.',
        ru: '• Foket Daily Signal: сигналы по 2 инструментам — один зарубежный фьючерс, который система выбирает каждый день, и один корейский фьючерс (KOSPI 200). Зарубежный инструмент может меняться день ото дня.\n• Foket Select Signal: выберите один инструмент из тех, которыми торгует Foket, и получайте сигналы системы с лучшими проверенными результатами по нему.\nСтоимость обоих сервисов одинакова.'
      }
    },
    {
      id: 'delegate', cat: 'service',
      q: {
        ko: '직접 매매하기 어렵다면 어떻게 하나요?',
        en: 'What if I cannot trade by myself?',
        de: 'Was, wenn ich nicht selbst handeln kann?',
        ja: '自分で売買するのが難しい場合は？',
        zh: '如果我无法自己交易怎么办？',
        fr: 'Et si je ne peux pas trader moi-même ?',
        es: '¿Y si no puedo operar por mi cuenta?',
        ru: 'Что делать, если я не могу торговать сам?'
      },
      a: {
        ko: '위탁 또는 주문대리 서비스를 이용하실 수 있습니다. 포켓이 제휴 자산운용사에 연결해 드리며, 계약하시면 포켓의 자동 트레이딩 시스템으로 운용됩니다.\n• 별도 요금 없이 계약에 따라 수익의 30~40%를 정산합니다.\n• 정산은 주 단위가 기본이며, 계약에 따라 다를 수 있습니다.\n자세한 조건은 상담 텔레그램으로 문의해 주십시오.',
        en: 'You can use our delegated trading or proxy order service. Foket connects you with a partner asset manager, and once you sign a contract your account is run by Foket’s automated trading system.\n• No separate fee: 30–40% of the profit is settled under the contract.\n• Settlement is usually weekly and may vary by contract.\nPlease ask on Telegram for details.',
        de: 'Sie können unseren Treuhand- bzw. Auftragsdienst nutzen. Foket vermittelt Sie an einen Partner-Vermögensverwalter; nach Vertragsabschluss wird Ihr Konto von Foket’s automatischem Handelssystem verwaltet.\n• Keine separate Gebühr: Je nach Vertrag werden 30–40 % des Gewinns abgerechnet.\n• Abrechnung in der Regel wöchentlich, je nach Vertrag unterschiedlich.\nDetails erhalten Sie per Telegram.',
        ja: '委託または注文代理サービスをご利用いただけます。Foketが提携資産運用会社におつなぎし、ご契約後はFoketの自動トレーディングシステムで運用されます。\n• 別途料金はなく、契約に応じて利益の30〜40%を精算します。\n• 精算は原則週単位で、契約により異なる場合があります。\n詳しくはTelegramでお問い合わせください。',
        zh: '您可以使用委托或代理下单服务。Foket 将为您对接合作资产管理公司，签约后由 Foket 的自动交易系统运作。\n• 不另收费用，根据合同结算收益的 30~40%。\n• 通常按周结算，具体视合同而定。\n详情请通过 Telegram 咨询。',
        fr: 'Vous pouvez utiliser notre service de gestion déléguée ou d’ordres par mandat. Foket vous met en relation avec une société de gestion partenaire ; une fois le contrat signé, votre compte est géré par le système de trading automatisé de Foket.\n• Pas de frais séparés : 30 à 40 % du profit sont réglés selon le contrat.\n• Règlement en général hebdomadaire, selon le contrat.\nRenseignez-vous sur Telegram.',
        es: 'Puede usar nuestro servicio de trading delegado u órdenes por mandato. Foket le pone en contacto con una gestora asociada y, tras firmar el contrato, su cuenta la opera el sistema de trading automatizado de Foket.\n• Sin tarifa aparte: se liquida el 30–40 % de la ganancia según el contrato.\n• La liquidación suele ser semanal y puede variar según el contrato.\nConsulte los detalles por Telegram.',
        ru: 'Можно воспользоваться доверительным управлением или подачей заявок по поручению. Foket свяжет вас с партнёрской управляющей компанией; после заключения договора счёт ведёт автоматическая торговая система Foket.\n• Отдельной платы нет: по договору удерживается 30–40 % прибыли.\n• Расчёт обычно еженедельный, условия зависят от договора.\nПодробности — в Telegram.'
      }
    },

    /* ── 무료 체험 ── */
    {
      id: 'trial-apply', cat: 'trial',
      q: {
        ko: '무료 체험은 어떻게 신청하나요?',
        en: 'How do I apply for the free trial?',
        de: 'Wie beantrage ich den Gratis-Test?',
        ja: '無料体験はどうやって申し込みますか？',
        zh: '如何申请免费体验？',
        fr: 'Comment demander l’essai gratuit ?',
        es: '¿Cómo solicito la prueba gratuita?',
        ru: 'Как подать заявку на пробный период?'
      },
      a: {
        ko: '텔레그램 상담 봇 [@foket_center_bot](https://t.me/foket_center_bot)에서 신청하시면 됩니다. 데일리 시그널이든 셀렉트 시그널이든 10거래일 동안 무료로 직접 확인해 보실 수 있습니다.',
        en: 'Apply through our Telegram bot [@foket_center_bot](https://t.me/foket_center_bot). You can try either Daily Signal or Select Signal free for 10 trading days.',
        de: 'Beantragen Sie ihn über unseren Telegram-Bot [@foket_center_bot](https://t.me/foket_center_bot). Sie können Daily Signal oder Select Signal 10 Handelstage lang kostenlos testen.',
        ja: 'Telegram相談ボット[@foket_center_bot](https://t.me/foket_center_bot)からお申し込みください。デイリーシグナルでもセレクトシグナルでも、10取引日のあいだ無料でお試しいただけます。',
        zh: '请通过 Telegram 咨询机器人 [@foket_center_bot](https://t.me/foket_center_bot) 申请。每日信号或精选信号均可免费体验 10 个交易日。',
        fr: 'Faites la demande via notre bot Telegram [@foket_center_bot](https://t.me/foket_center_bot). Vous pouvez essayer Daily Signal ou Select Signal gratuitement pendant 10 jours de bourse.',
        es: 'Solicítela a través de nuestro bot de Telegram [@foket_center_bot](https://t.me/foket_center_bot). Puede probar Daily Signal o Select Signal gratis durante 10 días hábiles de mercado.',
        ru: 'Подайте заявку через наш Telegram-бот [@foket_center_bot](https://t.me/foket_center_bot). Daily Signal или Select Signal можно бесплатно попробовать в течение 10 торговых дней.'
      }
    },
    {
      id: 'trial-what', cat: 'trial',
      q: {
        ko: '체험 기간에는 무엇을 받나요?',
        en: 'What do I get during the trial?',
        de: 'Was erhalte ich während des Tests?',
        ja: '体験期間中は何を受け取れますか？',
        zh: '体验期间可以获得什么？',
        fr: 'Que reçois-je pendant l’essai ?',
        es: '¿Qué recibo durante la prueba?',
        ru: 'Что я получаю в пробный период?'
      },
      a: {
        ko: '상담 텔레그램으로 실시간 매수·매도 신호를 1:1로 받으시고, \'현재 포지션 보기\' 버튼으로 실시간 포지션과 평가손익을 언제든 조회하실 수 있습니다. 결과를 직접 확인한 뒤에 결정하셔도 늦지 않습니다.',
        en: 'You receive real-time buy/sell signals one-to-one on Telegram, and you can check live positions and unrealized P&L at any time with the "Current position" button. Decide after you have seen the results yourself.',
        de: 'Sie erhalten Kauf-/Verkaufssignale in Echtzeit persönlich per Telegram und können offene Positionen und unrealisierte G/V jederzeit über die Schaltfläche „Aktuelle Position“ abrufen. Entscheiden Sie, nachdem Sie die Ergebnisse selbst gesehen haben.',
        ja: 'Telegramでリアルタイムの売買シグナルを1対1で受け取り、「現在のポジション」ボタンでリアルタイムのポジションと評価損益をいつでも確認できます。結果をご自身で確かめてから決めても遅くありません。',
        zh: '您将通过 Telegram 一对一接收实时买卖信号，并可随时用“当前持仓”按钮查看实时持仓和浮动盈亏。亲自确认结果后再做决定也不迟。',
        fr: 'Vous recevez les signaux d’achat/vente en temps réel sur Telegram et pouvez consulter à tout moment les positions et le P&L latent avec le bouton « Position actuelle ». Décidez après avoir vu les résultats par vous-même.',
        es: 'Recibe señales de compra/venta en tiempo real por Telegram y puede consultar en cualquier momento las posiciones y el P&L no realizado con el botón «Posición actual». Decida después de ver los resultados usted mismo.',
        ru: 'Вы получаете сигналы на покупку и продажу в реальном времени лично в Telegram и в любой момент можете посмотреть открытые позиции и нереализованный P&L кнопкой «Текущая позиция». Решайте, когда сами увидите результаты.'
      }
    },
    {
      id: 'trial-after', cat: 'trial',
      q: {
        ko: '체험이 끝나면 어떻게 되나요? 자동으로 결제되나요?',
        en: 'What happens when the trial ends? Am I charged automatically?',
        de: 'Was passiert nach dem Test? Wird automatisch abgerechnet?',
        ja: '体験が終わるとどうなりますか？自動で課金されますか？',
        zh: '体验结束后会怎样？会自动扣费吗？',
        fr: 'Que se passe-t-il à la fin de l’essai ? Suis-je facturé automatiquement ?',
        es: '¿Qué pasa al terminar la prueba? ¿Se cobra automáticamente?',
        ru: 'Что будет после пробного периода? Деньги спишут автоматически?'
      },
      a: {
        ko: '자동으로 결제되지 않습니다. 체험 거래일이 끝나고 유료로 전환할 시점에 안내 메시지를 보내 드립니다. 계속 이용하길 원하시는 분만 안내에 따라 신청하시면 됩니다.',
        en: 'No, nothing is charged automatically. When your trial days end and it is time to switch to the paid service, we will send you a message with the details. Only if you want to continue, follow it to sign up.',
        de: 'Nein, es wird nichts automatisch abgerechnet. Wenn Ihre Testtage enden, senden wir Ihnen eine Nachricht mit den Details zum kostenpflichtigen Dienst. Nur wenn Sie weitermachen möchten, melden Sie sich danach an.',
        ja: '自動で課金されることはありません。体験の取引日が終わり有料へ切り替える時期に、ご案内のメッセージをお送りします。継続をご希望の方だけ、案内に沿ってお申し込みください。',
        zh: '不会自动扣费。体验交易日结束、需要转为付费时，我们会给您发送说明消息。只有希望继续使用的用户按说明申请即可。',
        fr: 'Non, rien n’est facturé automatiquement. À la fin de vos jours d’essai, au moment de passer au service payant, nous vous envoyons un message d’information. Si vous souhaitez continuer, il vous suffit de le suivre.',
        es: 'No, no se cobra nada automáticamente. Cuando terminen sus días de prueba y llegue el momento de pasar al servicio de pago, le enviaremos un mensaje con la información. Solo si desea continuar, siga sus indicaciones.',
        ru: 'Нет, автоматически ничего не списывается. Когда пробные торговые дни закончатся и придёт время перейти на платный сервис, мы пришлём вам сообщение с подробностями. Продолжить можно по нему, если захотите.'
      }
    },

    /* ── 요금·결제 ── */
    {
      id: 'price', cat: 'pricing',
      q: {
        ko: '요금은 얼마인가요?',
        en: 'How much does it cost?',
        de: 'Was kostet es?',
        ja: '料金はいくらですか？',
        zh: '费用是多少？',
        fr: 'Combien ça coûte ?',
        es: '¿Cuánto cuesta?',
        ru: 'Сколько это стоит?'
      },
      a: {
        ko: '데일리 시그널과 셀렉트 시그널 모두 20거래일 50만원(해외 고객은 $300)입니다. 부가세는 별도입니다.',
        en: 'Both Daily Signal and Select Signal cost KRW 500,000 (or $300) per 20 trading days. VAT is not included.',
        de: 'Daily Signal und Select Signal kosten jeweils 500.000 KRW (bzw. 300 $) pro 20 Handelstage, zzgl. MwSt.',
        ja: 'デイリーシグナル、セレクトシグナルともに20取引日で50万ウォン（海外のお客様は$300）です。付加価値税は別途です。',
        zh: '每日信号和精选信号均为每 20 个交易日 50 万韩元（海外客户 300 美元），不含增值税。',
        fr: 'Daily Signal et Select Signal coûtent chacun 500 000 KRW (ou 300 $) pour 20 jours de bourse, TVA non comprise.',
        es: 'Daily Signal y Select Signal cuestan 500.000 KRW (o 300 $) por 20 días hábiles de mercado. IVA no incluido.',
        ru: 'Daily Signal и Select Signal стоят 500 000 KRW (или $300) за 20 торговых дней. НДС не включён.'
      }
    },
    {
      id: 'trading-days', cat: 'pricing',
      q: {
        ko: '\'20거래일\'은 어떻게 세나요?',
        en: 'How are "20 trading days" counted?',
        de: 'Wie werden „20 Handelstage“ gezählt?',
        ja: '「20取引日」はどう数えますか？',
        zh: '“20 个交易日”如何计算？',
        fr: 'Comment sont comptés les « 20 jours de bourse » ?',
        es: '¿Cómo se cuentan los «20 días hábiles»?',
        ru: 'Как считаются «20 торговых дней»?'
      },
      a: {
        ko: '달력 날짜가 아니라 시장이 열리는 날만 셉니다. 주말이나 휴장일처럼 거래가 없는 날은 이용 기간에서 빠집니다.',
        en: 'Only days when the market is open are counted, not calendar days. Days without trading, such as weekends and market holidays, do not use up your period.',
        de: 'Gezählt werden nur Tage, an denen der Markt geöffnet ist, nicht Kalendertage. Tage ohne Handel wie Wochenenden und Börsenfeiertage zählen nicht.',
        ja: '暦日ではなく、市場が開いている日だけを数えます。週末や休場日など取引のない日は利用期間に含まれません。',
        zh: '只计算市场开市的日子，而不是日历天数。周末和休市日等无交易的日子不计入使用期限。',
        fr: 'Seuls les jours d’ouverture du marché comptent, pas les jours calendaires. Les jours sans cotation, comme les week-ends et jours fériés boursiers, ne sont pas décomptés.',
        es: 'Solo se cuentan los días en que el mercado está abierto, no los días naturales. Los días sin negociación, como fines de semana y festivos bursátiles, no se descuentan.',
        ru: 'Считаются только дни, когда рынок открыт, а не календарные дни. Дни без торгов, например выходные и биржевые праздники, не учитываются.'
      }
    },
    {
      id: 'payment', cat: 'pricing',
      q: {
        ko: '결제는 어떻게 하나요?',
        en: 'How do I pay?',
        de: 'Wie bezahle ich?',
        ja: 'お支払い方法は？',
        zh: '如何付款？',
        fr: 'Comment payer ?',
        es: '¿Cómo pago?',
        ru: 'Как оплатить?'
      },
      a: {
        ko: '• 국내 고객: 계좌이체\n• 해외 고객: 해외송금\n• 암호화폐 결제: 별도로 문의해 주십시오.\n입금 계좌와 절차는 상담 텔레그램 [@foket_center_bot](https://t.me/foket_center_bot)에서 안내해 드립니다.',
        en: '• Customers in Korea: bank transfer\n• Overseas customers: international wire transfer\n• Cryptocurrency: please contact us separately.\nWe will send the account details and steps on Telegram at [@foket_center_bot](https://t.me/foket_center_bot).',
        de: '• Kunden in Korea: Banküberweisung\n• Kunden im Ausland: Auslandsüberweisung\n• Kryptowährung: bitte separat anfragen.\nKontodaten und Ablauf erhalten Sie per Telegram über [@foket_center_bot](https://t.me/foket_center_bot).',
        ja: '• 韓国国内のお客様：銀行振込\n• 海外のお客様：海外送金\n• 暗号資産でのお支払い：別途お問い合わせください。\n振込先と手順はTelegram [@foket_center_bot](https://t.me/foket_center_bot) でご案内します。',
        zh: '• 韩国国内客户：银行转账\n• 海外客户：境外汇款\n• 加密货币支付：请另行咨询。\n收款账户及流程将通过 Telegram [@foket_center_bot](https://t.me/foket_center_bot) 告知。',
        fr: '• Clients en Corée : virement bancaire\n• Clients à l’étranger : virement international\n• Cryptomonnaie : contactez-nous séparément.\nNous vous communiquons les coordonnées et la marche à suivre sur Telegram via [@foket_center_bot](https://t.me/foket_center_bot).',
        es: '• Clientes en Corea: transferencia bancaria\n• Clientes en el extranjero: transferencia internacional\n• Criptomonedas: consúltenos por separado.\nLe enviaremos los datos de la cuenta y los pasos por Telegram en [@foket_center_bot](https://t.me/foket_center_bot).',
        ru: '• Клиенты в Корее: банковский перевод\n• Зарубежные клиенты: международный перевод\n• Криптовалюта: уточняйте отдельно.\nРеквизиты и порядок оплаты пришлём в Telegram: [@foket_center_bot](https://t.me/foket_center_bot).'
      }
    },
    {
      id: 'refund', cat: 'pricing',
      q: {
        ko: '중간에 그만두면 환불되나요?',
        en: 'Can I get a refund if I stop early?',
        de: 'Bekomme ich eine Rückerstattung, wenn ich vorzeitig aufhöre?',
        ja: '途中でやめた場合、返金されますか？',
        zh: '中途停止可以退款吗？',
        fr: 'Suis-je remboursé si j’arrête en cours de route ?',
        es: '¿Me reembolsan si lo dejo antes?',
        ru: 'Вернут ли деньги, если я прекращу раньше?'
      },
      a: {
        ko: '네. 이미 서비스된 거래일만큼을 빼고 남은 거래일만큼 환불해 드립니다.\n예: 20거래일 50만원이면 하루 2만 5천원입니다. 8거래일을 이용하셨다면 남은 12거래일분 30만원을 돌려드립니다. (해외 고객은 $300 기준 하루 $15)',
        en: 'Yes. We refund the remaining trading days, minus the days already served.\nExample: KRW 500,000 for 20 trading days is KRW 25,000 per day. If you used 8 trading days, we refund the remaining 12 days, KRW 300,000. (For overseas customers, $300 works out to $15 per day.)',
        de: 'Ja. Wir erstatten die verbleibenden Handelstage, abzüglich der bereits genutzten Tage.\nBeispiel: 500.000 KRW für 20 Handelstage sind 25.000 KRW pro Tag. Nach 8 genutzten Handelstagen erstatten wir die restlichen 12 Tage, also 300.000 KRW. (Für Kunden im Ausland: 300 $ entsprechen 15 $ pro Tag.)',
        ja: 'はい。すでに提供した取引日分を差し引き、残りの取引日分を返金します。\n例：20取引日で50万ウォンなら1日2万5千ウォンです。8取引日ご利用の場合、残り12取引日分の30万ウォンを返金します。（海外のお客様は$300基準で1日$15）',
        zh: '可以。扣除已提供服务的交易日后，按剩余交易日退款。\n例如：20 个交易日 50 万韩元，即每天 2.5 万韩元。若已使用 8 个交易日，将退还剩余 12 个交易日的 30 万韩元。（海外客户按 300 美元计，每天 15 美元）',
        fr: 'Oui. Nous remboursons les jours de bourse restants, déduction faite des jours déjà servis.\nExemple : 500 000 KRW pour 20 jours de bourse, soit 25 000 KRW par jour. Après 8 jours utilisés, nous remboursons les 12 jours restants, soit 300 000 KRW. (Pour les clients étrangers, 300 $ font 15 $ par jour.)',
        es: 'Sí. Reembolsamos los días hábiles restantes, descontando los días ya prestados.\nEjemplo: 500.000 KRW por 20 días hábiles son 25.000 KRW por día. Si usó 8 días, le devolvemos los 12 restantes, 300.000 KRW. (Para clientes extranjeros, 300 $ equivalen a 15 $ por día.)',
        ru: 'Да. Мы возвращаем оплату за оставшиеся торговые дни, за вычетом уже оказанных.\nПример: 500 000 KRW за 20 торговых дней — это 25 000 KRW в день. Если вы использовали 8 торговых дней, мы вернём за оставшиеся 12 дней 300 000 KRW. (Для зарубежных клиентов $300 — это $15 в день.)'
      }
    },

    /* ── 신호·포지션 ── */
    {
      id: 'signal-how', cat: 'signals',
      q: {
        ko: '신호는 어떻게 받나요?',
        en: 'How are signals delivered?',
        de: 'Wie werden Signale übermittelt?',
        ja: 'シグナルはどのように届きますか？',
        zh: '信号如何发送？',
        fr: 'Comment les signaux sont-ils envoyés ?',
        es: '¿Cómo se envían las señales?',
        ru: 'Как приходят сигналы?'
      },
      a: {
        ko: '상담 텔레그램으로 1:1 실시간 전달됩니다. 진입과 청산은 사전 정의된 알고리즘에 따라 결정되며, 포지션은 당일 청산합니다.',
        en: 'Signals are sent one-to-one on Telegram in real time. Entries and exits follow predefined algorithms, and positions are closed on the same day.',
        de: 'Signale werden in Echtzeit persönlich per Telegram gesendet. Ein- und Ausstiege folgen vordefinierten Algorithmen; Positionen werden am selben Tag geschlossen.',
        ja: 'Telegramで1対1、リアルタイムでお届けします。エントリーと決済はあらかじめ定めたアルゴリズムに従い、ポジションは当日中に決済します。',
        zh: '通过 Telegram 一对一实时发送。开仓和平仓均按照预先设定的算法执行，持仓当日平仓。',
        fr: 'Les signaux sont envoyés en direct sur Telegram, en temps réel. Entrées et sorties suivent des algorithmes prédéfinis, et les positions sont clôturées le jour même.',
        es: 'Se envían de forma individual por Telegram en tiempo real. Las entradas y salidas siguen algoritmos predefinidos y las posiciones se cierran el mismo día.',
        ru: 'Сигналы приходят лично в Telegram в реальном времени. Входы и выходы определяются заранее заданными алгоритмами, позиции закрываются в тот же день.'
      }
    },
    {
      id: 'signal-when', cat: 'signals',
      q: {
        ko: '신호는 하루에 몇 번, 몇 시에 오나요?',
        en: 'How many signals come per day, and at what time?',
        de: 'Wie viele Signale kommen pro Tag und wann?',
        ja: 'シグナルは1日に何回、何時ごろ届きますか？',
        zh: '每天发几次信号？什么时间？',
        fr: 'Combien de signaux par jour, et à quelle heure ?',
        es: '¿Cuántas señales llegan al día y a qué hora?',
        ru: 'Сколько сигналов в день и в какое время?'
      },
      a: {
        ko: '정해져 있지 않습니다. 외부 시장 개입이나 옵션 체결처럼 미리 알 수 없는 변수에 따라 신호가 나오는 시점과 횟수가 달라지기 때문입니다. 신호를 놓치지 않도록 텔레그램 알림을 켜 두시고, 놓치셨을 때는 \'현재 포지션 보기\'로 확인해 주십시오.',
        en: 'There is no fixed number or time. When signals come and how many depends on things that cannot be predicted in advance, such as outside market interventions and option executions. Keep Telegram notifications on so you do not miss one, and if you do, check the "Current position" button.',
        de: 'Es gibt keine feste Anzahl oder Uhrzeit. Zeitpunkt und Anzahl hängen von nicht vorhersehbaren Faktoren ab, etwa externen Markteingriffen oder Optionsausübungen. Lassen Sie Telegram-Benachrichtigungen eingeschaltet; falls Sie doch ein Signal verpassen, nutzen Sie „Aktuelle Position“.',
        ja: '決まっていません。外部からの市場介入やオプションの約定など、事前に予測できない要因によって、シグナルが出るタイミングと回数が変わるためです。見逃さないようTelegramの通知をオンにし、見逃したときは「現在のポジション」で確認してください。',
        zh: '没有固定的次数和时间。因为信号出现的时间和次数会受外部市场干预、期权成交等无法预知的因素影响。请开启 Telegram 通知以免错过；如果错过了，可用“当前持仓”查看。',
        fr: 'Il n’y a ni nombre ni horaire fixes. Le moment et le nombre de signaux dépendent de facteurs imprévisibles, comme les interventions extérieures sur le marché ou l’exercice d’options. Gardez les notifications Telegram activées, et si vous manquez un signal, consultez « Position actuelle ».',
        es: 'No hay un número ni una hora fijos. Cuándo y cuántas señales llegan depende de factores imprevisibles, como intervenciones externas en el mercado o la ejecución de opciones. Mantenga activadas las notificaciones de Telegram y, si se pierde una, consulte «Posición actual».',
        ru: 'Фиксированного числа и времени нет. Когда и сколько сигналов придёт, зависит от непредсказуемых факторов — внешних вмешательств в рынок, исполнения опционов и т. п. Держите уведомления Telegram включёнными, а если пропустили сигнал, нажмите «Текущая позиция».'
      }
    },
    {
      id: 'position', cat: 'signals',
      q: {
        ko: '\'현재 포지션 보기\'는 무엇인가요?',
        en: 'What is the "Current position" button?',
        de: 'Was ist die Schaltfläche „Aktuelle Position“?',
        ja: '「現在のポジション」ボタンとは？',
        zh: '“当前持仓”按钮是什么？',
        fr: 'Qu’est-ce que le bouton « Position actuelle » ?',
        es: '¿Qué es el botón «Posición actual»?',
        ru: 'Что такое кнопка «Текущая позиция»?'
      },
      a: {
        ko: '상담 텔레그램에 있는 버튼으로, 지금 보유 중인 신호 포지션과 평가손익을 실시간으로 보여 줍니다. 신호를 놓치셨을 때도 현재 상태를 바로 확인하실 수 있습니다.',
        en: 'It is a button in our Telegram chat that shows the open signal positions and their unrealized P&L in real time. Even if you missed a signal, you can see where things stand right away.',
        de: 'Eine Schaltfläche im Telegram-Chat, die offene Signalpositionen und deren unrealisierte G/V in Echtzeit zeigt. Auch wenn Sie ein Signal verpasst haben, sehen Sie sofort den aktuellen Stand.',
        ja: 'Telegramのボタンで、現在保有中のシグナルポジションと評価損益をリアルタイムで表示します。シグナルを見逃したときも、今の状況をすぐ確認できます。',
        zh: '这是 Telegram 中的一个按钮，可实时显示当前持有的信号仓位及浮动盈亏。即使错过了信号，也能马上了解当前状况。',
        fr: 'C’est un bouton du chat Telegram qui affiche en temps réel les positions ouvertes et leur P&L latent. Même si vous avez manqué un signal, vous voyez tout de suite où en sont les choses.',
        es: 'Es un botón del chat de Telegram que muestra en tiempo real las posiciones abiertas y su P&L no realizado. Aunque se haya perdido una señal, puede ver al instante la situación.',
        ru: 'Это кнопка в чате Telegram, которая показывает открытые позиции по сигналам и их нереализованный P&L в реальном времени. Даже если вы пропустили сигнал, сразу видно текущее состояние.'
      }
    },
    {
      id: 'change-symbol', cat: 'signals',
      q: {
        ko: '셀렉트 시그널 종목은 바꿀 수 있나요?',
        en: 'Can I change my Select Signal symbol?',
        de: 'Kann ich das Symbol bei Select Signal wechseln?',
        ja: 'セレクトシグナルの銘柄は変更できますか？',
        zh: '精选信号的品种可以更换吗？',
        fr: 'Puis-je changer de symbole avec Select Signal ?',
        es: '¿Puedo cambiar el símbolo de Select Signal?',
        ru: 'Можно ли сменить инструмент в Select Signal?'
      },
      a: {
        ko: '네. 이용 중에도 종목을 바꾸실 수 있습니다. 상담 텔레그램으로 요청해 주십시오.',
        en: 'Yes. You can change the symbol while using the service. Just ask on Telegram.',
        de: 'Ja. Sie können das Symbol auch während der Nutzung wechseln. Schreiben Sie uns einfach per Telegram.',
        ja: 'はい。ご利用中でも銘柄を変更できます。Telegramでお申し付けください。',
        zh: '可以。使用期间也可以更换品种，请通过 Telegram 告诉我们。',
        fr: 'Oui. Vous pouvez changer de symbole en cours d’utilisation. Il suffit de le demander sur Telegram.',
        es: 'Sí. Puede cambiar el símbolo durante el uso del servicio. Solo pídalo por Telegram.',
        ru: 'Да. Инструмент можно сменить в любое время. Просто напишите нам в Telegram.'
      }
    },
    {
      id: 'performance', cat: 'signals',
      q: {
        ko: '지난 성과는 어디서 볼 수 있나요?',
        en: 'Where can I see past results?',
        de: 'Wo sehe ich frühere Ergebnisse?',
        ja: '過去の成果はどこで見られますか？',
        zh: '在哪里查看过往业绩？',
        fr: 'Où voir les résultats passés ?',
        es: '¿Dónde veo los resultados anteriores?',
        ru: 'Где посмотреть прошлые результаты?'
      },
      a: {
        ko: '[실적 조회](performance.html) 페이지에서 날짜별 기록을 보실 수 있습니다. 포켓 자동 시스템의 결과를 손실까지 그대로 공개합니다.',
        en: 'See the [Performance](performance.html) page for results by date. Results of the Foket automated system are published as they are, losses included.',
        de: 'Auf der Seite [Performance](performance.html) finden Sie die Ergebnisse nach Datum. Die Ergebnisse des automatisierten Foket-Systems werden unverändert veröffentlicht, Verluste eingeschlossen.',
        ja: '[実績照会](performance.html)ページで日付ごとの記録をご覧いただけます。Foket自動システムの結果を、損失も含めてそのまま公開しています。',
        zh: '请在 [业绩查询](performance.html) 页面按日期查看记录。Foket自动系统的结果连同亏损一并如实公开。',
        fr: 'Consultez la page [Performances](performance.html) pour les résultats par date. Les résultats du système automatisé Foket sont publiés tels quels, pertes comprises.',
        es: 'Consulte la página de [Rendimiento](performance.html) para ver los resultados por fecha. Los resultados del sistema automatizado de Foket se publican tal cual, pérdidas incluidas.',
        ru: 'Результаты по датам — на странице [Результаты](performance.html). Результаты автоматической системы Foket публикуются как есть, включая убытки.'
      }
    },
    /* ── 위험·책임 ── */
    {
      id: 'guarantee', cat: 'risk',
      q: {
        ko: '수익이 보장되나요?',
        en: 'Are profits guaranteed?',
        de: 'Sind Gewinne garantiert?',
        ja: '利益は保証されますか？',
        zh: '收益有保证吗？',
        fr: 'Les gains sont-ils garantis ?',
        es: '¿Se garantizan las ganancias?',
        ru: 'Гарантирована ли прибыль?'
      },
      a: {
        ko: '아니요. 포켓의 신호는 투자 참고용 정보이며 수익을 보장하지 않습니다. 선물·파생상품 거래는 원금을 넘는 손실이 날 수 있는 고위험 거래이고, 과거 성과가 미래 수익을 보장하지 않습니다.',
        en: 'No. Foket signals are reference information and do not guarantee profits. Futures and derivatives are high-risk products in which you can lose more than your initial deposit, and past performance does not guarantee future results.',
        de: 'Nein. Foket-Signale sind Referenzinformationen und garantieren keine Gewinne. Futures und Derivate sind Hochrisikoprodukte, bei denen Verluste über die Einlage hinaus möglich sind; vergangene Ergebnisse garantieren keine zukünftigen Erträge.',
        ja: 'いいえ。Foketのシグナルは投資の参考情報であり、利益を保証するものではありません。先物・デリバティブ取引は元本を超える損失が生じうる高リスクの取引であり、過去の成果は将来の利益を保証しません。',
        zh: '不保证。Foket 的信号仅供投资参考，不保证收益。期货及衍生品交易风险很高，亏损可能超过本金；过往业绩不代表未来收益。',
        fr: 'Non. Les signaux Foket sont une information de référence et ne garantissent aucun gain. Les futures et dérivés sont des produits à haut risque où l’on peut perdre plus que son dépôt initial, et les performances passées ne préjugent pas des résultats futurs.',
        es: 'No. Las señales de Foket son información de referencia y no garantizan ganancias. Los futuros y derivados son productos de alto riesgo en los que se puede perder más que el depósito inicial, y los resultados pasados no garantizan resultados futuros.',
        ru: 'Нет. Сигналы Foket — справочная информация и не гарантируют прибыль. Фьючерсы и деривативы — высокорисковые инструменты, убыток по которым может превысить вложенные средства; прошлые результаты не гарантируют будущих.'
      }
    },
    {
      id: 'responsibility', cat: 'risk',
      q: {
        ko: '거래는 누가 하고, 책임은 누구에게 있나요?',
        en: 'Who places the trades, and who is responsible?',
        de: 'Wer handelt, und wer trägt die Verantwortung?',
        ja: '取引は誰が行い、責任は誰にありますか？',
        zh: '由谁下单？责任由谁承担？',
        fr: 'Qui passe les ordres et qui en est responsable ?',
        es: '¿Quién opera y quién es responsable?',
        ru: 'Кто совершает сделки и кто за них отвечает?'
      },
      a: {
        ko: '시그널 서비스에서는 이용자께서 본인 계좌로 직접 거래하십니다. 신호를 따를지, 얼마나 거래할지는 이용자 본인이 판단하시며, 거래 결과의 책임도 이용자 본인에게 있습니다. 자세한 내용은 [투자위험고지](risk.html)를 확인해 주십시오.',
        en: 'With the signal services, you trade in your own account. Whether to follow a signal and how much to trade is your decision, and you are responsible for the results. Please read our [Risk Disclosure](risk.html).',
        de: 'Bei den Signaldiensten handeln Sie selbst auf Ihrem eigenen Konto. Ob Sie einem Signal folgen und in welchem Umfang, entscheiden Sie, und Sie tragen die Verantwortung für die Ergebnisse. Bitte lesen Sie unseren [Risikohinweis](risk.html).',
        ja: 'シグナルサービスでは、ご本人の口座でご自身が取引します。シグナルに従うか、どれだけ取引するかはご本人の判断であり、取引結果の責任もご本人にあります。詳しくは[投資リスク告知](risk.html)をご確認ください。',
        zh: '在信号服务中，由用户本人在自己的账户中交易。是否跟随信号、交易多少均由用户自行判断，交易结果亦由用户本人负责。详情请参阅 [投资风险提示](risk.html)。',
        fr: 'Avec les services de signaux, vous tradez vous-même sur votre propre compte. Suivre un signal et le volume à engager relèvent de votre décision, et vous êtes responsable des résultats. Consultez notre [avertissement sur les risques](risk.html).',
        es: 'Con los servicios de señales, usted opera en su propia cuenta. Seguir una señal y cuánto operar es decisión suya, y usted es responsable de los resultados. Lea nuestro [aviso de riesgos](risk.html).',
        ru: 'В сигнальных сервисах вы торгуете сами на своём счёте. Следовать ли сигналу и каким объёмом — решаете вы, и ответственность за результат лежит на вас. Ознакомьтесь с [уведомлением о рисках](risk.html).'
      }
    }
  ]
};
