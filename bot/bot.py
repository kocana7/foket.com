"""포켓 상담·신호 텔레그램 봇 (개발팀 아이티)

하는 일
- 8개 언어 상담 (AI 응답, 어려운 문의·결제 문의는 운영자에게 전달)
- 무료체험 신청 → 운영자 승인 버튼 → 다음 거래일부터 10거래일 신호
- 8거래일째 종료·요금 안내 → 결제 안내 → 입금 확인 버튼 → 20거래일 유료 신호
- 만료 3거래일 전 갱신 안내, 만료 처리
- 포켓 로직(엑셀 VBA)이 보내는 신호를 받아 이용 중인 회원에게 전송 (POST /signal)
- 매일 아침 운영자에게 회원 현황 요약

실행: python3 bot.py   (설정은 같은 폴더의 .env 또는 환경변수)
"""
import asyncio, datetime as dt, json, logging, os, sqlite3
from zoneinfo import ZoneInfo

from aiohttp import web
from telegram import (InlineKeyboardButton as B, InlineKeyboardMarkup as KM, KeyboardButton,
                      ReplyKeyboardMarkup, ReplyKeyboardRemove, Update)
from telegram.ext import (Application, CallbackQueryHandler, CommandHandler, ContextTypes,
                          MessageHandler, filters)

HERE = os.path.dirname(os.path.abspath(__file__))
KST = ZoneInfo("Asia/Seoul")
logging.basicConfig(format="%(asctime)s %(levelname)s %(message)s", level=logging.INFO)
log = logging.getLogger("foket")


# ---------------------------------------------------------------- 설정
def load_env():
    p = os.path.join(HERE, ".env")
    if os.path.exists(p):
        for line in open(p, encoding="utf-8"):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


load_env()
TOKEN = os.environ.get("BOT_TOKEN", "")
ADMIN_ID = int(os.environ.get("ADMIN_CHAT_ID", "0") or 0)       # Sean 텔레그램 번호
SIGNAL_KEY = os.environ.get("SIGNAL_KEY", "")                    # 엑셀이 신호 보낼 때 쓰는 비밀 키
PORT = int(os.environ.get("PORT", "8080"))
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "claude-haiku-5-5")
BANK_INFO = os.environ.get("BANK_INFO", "(입금 계좌 미정)")
OVERSEAS_INFO = os.environ.get("OVERSEAS_INFO", "(해외 결제 방법 미정)")
PRICE_KRW = os.environ.get("PRICE_KRW", "500,000")
PRICE_USD = os.environ.get("PRICE_USD", "300")
TRIAL_DAYS = int(os.environ.get("TRIAL_DAYS", "10"))
PAID_DAYS = int(os.environ.get("PAID_DAYS", "20"))
TRIAL_NOTICE_DAY = int(os.environ.get("TRIAL_NOTICE_DAY", "8"))
RENEW_NOTICE_BEFORE = int(os.environ.get("RENEW_NOTICE_BEFORE", "3"))
DB_PATH = os.environ.get("DB_PATH", os.path.join(HERE, "foket_bot.db"))
HOLIDAYS_PATH = os.path.join(HERE, "holidays.txt")
SERVICES = {"daily": "데일리", "select": "셀렉트"}

LANGS = {"ko": "한국어", "en": "English", "ja": "日本語", "zh": "中文",
         "ru": "Русский", "es": "Español", "de": "Deutsch", "fr": "Français"}


# ---------------------------------------------------------------- 거래일
def holidays():
    if not os.path.exists(HOLIDAYS_PATH):
        return set()
    return {l.strip()[:10] for l in open(HOLIDAYS_PATH, encoding="utf-8")
            if l.strip() and not l.startswith("#")}


def is_trading(d):
    return d.weekday() < 5 and d.isoformat() not in holidays()


def next_trading(d):
    d += dt.timedelta(days=1)
    while not is_trading(d):
        d += dt.timedelta(days=1)
    return d


def add_trading(start, n):
    """start(거래일)를 1일째로 쳐서 n거래일째 날짜."""
    d = start
    for _ in range(n - 1):
        d = next_trading(d)
    return d


def trading_index(start, today):
    """start부터 today까지 몇 번째 거래일인지 (start=1). today가 거래일이 아니면 None."""
    if not is_trading(today) or today < start:
        return None
    i, d = 1, start
    while d < today:
        d = next_trading(d)
        i += 1
    return i


def trading_left(today, end):
    """today 다음 거래일부터 end까지 남은 거래일 수."""
    n, d = 0, today
    while True:
        d = next_trading(d)
        if d > end:
            return n
        n += 1


def today_kst():
    return dt.datetime.now(KST).date()


# ---------------------------------------------------------------- DB
def db():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init_db():
    with db() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS users(
          tg_id INTEGER PRIMARY KEY, username TEXT, lang TEXT DEFAULT 'ko',
          name TEXT, phone TEXT, service TEXT, agreed_at TEXT,
          status TEXT DEFAULT 'new',      -- new, trial_pending, trial, trial_ended, pay_pending, paid, expired, rejected
          trial_used INTEGER DEFAULT 0,
          trial_start TEXT, trial_end TEXT, paid_start TEXT, paid_end TEXT,
          depositor TEXT, notified TEXT DEFAULT '', created_at TEXT, step TEXT);
        CREATE TABLE IF NOT EXISTS signals(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT,
          service TEXT, text TEXT, sent INTEGER);
        CREATE TABLE IF NOT EXISTS i18n(lang TEXT, key TEXT, text TEXT, PRIMARY KEY(lang, key));
        CREATE TABLE IF NOT EXISTS position(id INTEGER PRIMARY KEY, at TEXT, data TEXT);
        CREATE TABLE IF NOT EXISTS relay(admin_msg_id INTEGER PRIMARY KEY, tg_id INTEGER);
        """)


def get_user(uid):
    with db() as c:
        return c.execute("SELECT * FROM users WHERE tg_id=?", (uid,)).fetchone()


def upsert_user(uid, **kw):
    with db() as c:
        if not c.execute("SELECT 1 FROM users WHERE tg_id=?", (uid,)).fetchone():
            c.execute("INSERT INTO users(tg_id, created_at) VALUES(?,?)",
                      (uid, dt.datetime.now(KST).isoformat(timespec="seconds")))
        for k, v in kw.items():
            c.execute(f"UPDATE users SET {k}=? WHERE tg_id=?", (v, uid))


# ---------------------------------------------------------------- 문구 (ko/en 직접, 나머지는 AI 번역 후 저장)
T = {
 "choose_lang": ("언어를 선택해 주세요.", "Please choose your language."),
 "welcome": ("포켓닷컴입니다. 시스템 트레이딩 신호(해외선물 1종목 + 코스피200)를 텔레그램으로 보내 드립니다.\n"
             "궁금한 점은 편하게 글로 물어보세요.",
             "Welcome to Foket.com. We send system-trading signals (one overseas future + KOSPI200) via Telegram.\n"
             "Feel free to type any question."),
 "btn_trial": ("무료체험 신청 (10거래일)", "Free trial (10 trading days)"),
 "btn_price": ("요금 안내", "Pricing"),
 "btn_status": ("내 이용 현황", "My status"),
 "btn_pay": ("결제하기", "Pay"),
 "btn_lang": ("언어 변경", "Language"),
 "price": ("유료 이용권: 20거래일 {krw}원 (계좌이체) 또는 해외 ${usd}.\n무료체험: 10거래일, 텔레그램 계정당 1회.",
           "Paid pass: 20 trading days for KRW {krw} (bank transfer) or USD {usd} overseas.\n"
           "Free trial: 10 trading days, once per Telegram account."),
 "ask_name": ("이름을 입력해 주세요.", "Please enter your name."),
 "ask_phone": ("연락처를 보내 주세요. 아래 버튼을 누르거나 번호를 입력하시면 됩니다.",
               "Please share your phone number with the button below, or type it."),
 "btn_share_phone": ("연락처 보내기", "Share phone number"),
 "ask_service": ("받으실 서비스를 골라 주세요.", "Choose a service."),
 "terms": ("[위험 고지 및 약관]\n"
           "1. 포켓 신호는 투자 판단을 돕는 참고 정보이며, 매매 여부와 결과의 책임은 이용자에게 있습니다.\n"
           "2. 선물 거래는 원금 이상의 손실이 날 수 있습니다. 과거 성과는 미래 수익을 보장하지 않습니다.\n"
           "3. 수익 보장이나 손실 보전은 하지 않습니다.\n"
           "4. 신호 내용을 다른 사람에게 전달하거나 공개하지 않습니다.\n"
           "5. 무료체험은 텔레그램 계정당 1회입니다.\n"
           "위 내용에 동의하십니까?",
           "[Risk disclosure & terms]\n"
           "1. Foket signals are reference information only; trading decisions and results are your own responsibility.\n"
           "2. Futures trading can lose more than your initial capital. Past performance does not guarantee future results.\n"
           "3. We do not guarantee profits or cover losses.\n"
           "4. Do not forward or publish the signals.\n"
           "5. The free trial is limited to once per Telegram account.\n"
           "Do you agree?"),
 "btn_agree": ("동의합니다", "I agree"),
 "btn_disagree": ("동의하지 않습니다", "I do not agree"),
 "trial_used": ("무료체험은 계정당 한 번만 가능합니다. 유료 이용을 원하시면 '결제하기'를 눌러 주세요.",
                "The free trial is available only once per account. Tap 'Pay' to subscribe."),
 "trial_requested": ("신청이 접수되었습니다. 승인되면 바로 알려 드립니다.",
                     "Your request has been received. We will notify you once it is approved."),
 "trial_approved": ("무료체험이 승인되었습니다. {start}부터 {end}까지 ({n}거래일) 신호를 보내 드립니다.",
                    "Your free trial is approved. Signals will be sent from {start} to {end} ({n} trading days)."),
 "trial_rejected": ("죄송합니다. 이번 신청은 승인되지 않았습니다. 문의는 글로 남겨 주세요.",
                    "Sorry, this request was not approved. Please leave a message if you have questions."),
 "trial_ending": ("무료체험이 {end}에 끝납니다 (남은 거래일 {left}일).\n계속 받으시려면 유료 이용권을 결제해 주세요.\n",
                  "Your free trial ends on {end} ({left} trading days left).\nTo keep receiving signals, please purchase a pass.\n"),
 "trial_over": ("무료체험이 끝났습니다. 이용해 주셔서 감사합니다. 계속 받으시려면 '결제하기'를 눌러 주세요.",
                "Your free trial has ended. Thank you. Tap 'Pay' to continue."),
 "pay_info": ("[결제 안내] 20거래일 이용권\n국내 계좌이체: {krw}원\n{bank}\n해외: ${usd}\n{overseas}\n\n"
              "입금하신 뒤 아래 버튼을 누르고 입금자명을 보내 주세요.",
              "[Payment] 20-trading-day pass\nKorean bank transfer: KRW {krw}\n{bank}\nOverseas: USD {usd}\n{overseas}\n\n"
              "After paying, tap the button below and send the payer's name."),
 "btn_paid": ("입금했습니다", "I have paid"),
 "ask_depositor": ("입금자명(해외는 결제자 이름)을 입력해 주세요.", "Please enter the payer's name."),
 "pay_requested": ("확인 요청이 접수되었습니다. 입금이 확인되면 바로 알려 드립니다.",
                   "Received. We will notify you as soon as the payment is confirmed."),
 "paid_ok": ("입금이 확인되었습니다. {start}부터 {end}까지 ({n}거래일) 신호를 보내 드립니다.",
             "Payment confirmed. Signals will be sent from {start} to {end} ({n} trading days)."),
 "renew": ("이용권이 {end}에 끝납니다 (남은 거래일 {left}일). 계속 받으시려면 미리 갱신해 주세요.\n",
           "Your pass ends on {end} ({left} trading days left). Please renew in advance.\n"),
 "paid_over": ("이용권이 끝났습니다. 이용해 주셔서 감사합니다. 갱신은 '결제하기'를 눌러 주세요.",
               "Your pass has ended. Thank you. Tap 'Pay' to renew."),
 "status_none": ("현재 이용 중인 서비스가 없습니다.", "You have no active service."),
 "status_trial": ("무료체험 중: {start} ~ {end}", "Free trial: {start} ~ {end}"),
 "status_paid": ("유료 이용 중: {start} ~ {end}", "Paid: {start} ~ {end}"),
 "status_pending": ("승인 대기 중입니다.", "Awaiting approval."),
 "forwarded": ("담당자에게 전달했습니다. 답변이 오면 이 대화창으로 보내 드립니다.",
               "Your message has been forwarded to our staff. The reply will come here."),
 "signal_head": ("[포켓 신호]", "[Foket signal]"),
 "btn_position": ("현재 포지션 보기", "Current position"),
 "position_head": ("[현재 포지션] {at} 기준", "[Current position] as of {at}"),
 "position_none": ("아직 받은 포지션 정보가 없습니다. 잠시 뒤 다시 눌러 주세요.", "No position data yet. Please try again shortly."),
 "position_stale": ("(엑셀 연결이 {min}분째 끊겨 있어 최신 정보가 아닐 수 있습니다)", "(Data may be outdated: no update for {min} min)"),
 "members_only": ("체험 또는 유료 이용 중인 회원만 볼 수 있습니다.", "Available to trial or paid members only."),
}


def tr_ai(text, lang):
    if not ANTHROPIC_KEY:
        return None
    try:
        import anthropic
        r = anthropic.Anthropic(api_key=ANTHROPIC_KEY).messages.create(
            model=AI_MODEL, max_tokens=1500,
            system=f"Translate the user's text into {LANGS[lang]}. Keep placeholders like {{start}} and "
                   "line breaks unchanged. Output only the translation.",
            messages=[{"role": "user", "content": text}])
        return r.content[0].text.strip()
    except Exception as e:
        log.warning("translate failed: %s", e)
        return None


def t(lang, key, **kw):
    ko, en = T[key]
    if lang == "ko":
        s = ko
    elif lang == "en" or lang not in LANGS:
        s = en
    else:
        with db() as c:
            row = c.execute("SELECT text FROM i18n WHERE lang=? AND key=?", (lang, key)).fetchone()
        if row:
            s = row["text"]
        else:
            s = tr_ai(en, lang)
            if s:
                with db() as c:
                    c.execute("INSERT OR REPLACE INTO i18n VALUES(?,?,?)", (lang, key, s))
            else:
                s = en
    try:
        return s.format(**kw) if kw else s
    except (KeyError, IndexError):
        return en.format(**kw) if kw else en


def lang_of(uid):
    u = get_user(uid)
    return (u["lang"] if u and u["lang"] else "ko")


def menu(lang):
    return KM([[B(t(lang, "btn_position"), callback_data="position")],
               [B(t(lang, "btn_trial"), callback_data="trial")],
               [B(t(lang, "btn_price"), callback_data="price"), B(t(lang, "btn_pay"), callback_data="pay")],
               [B(t(lang, "btn_status"), callback_data="status"), B(t(lang, "btn_lang"), callback_data="lang")]])


def fmt_d(s):
    return s or "-"


# ---------------------------------------------------------------- 회원 화면
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    u = update.effective_user
    if update.effective_chat.type != "private":
        return
    upsert_user(u.id, username=u.username or "")
    rows = [[B(v, callback_data=f"setlang:{k}") for k, v in list(LANGS.items())[i:i + 4]] for i in (0, 4)]
    await update.message.reply_text("언어를 선택해 주세요. / Please choose your language.", reply_markup=KM(rows))


async def on_button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    await q.answer()
    uid, data = q.from_user.id, q.data
    if data.startswith("adm:"):
        return await admin_button(update, ctx)
    upsert_user(uid, username=q.from_user.username or "")
    lang = lang_of(uid)
    u = get_user(uid)

    if data.startswith("setlang:"):
        lang = data.split(":")[1]
        upsert_user(uid, lang=lang, step=None)
        return await q.message.reply_text(t(lang, "welcome"), reply_markup=menu(lang))
    if data == "lang":
        rows = [[B(v, callback_data=f"setlang:{k}") for k, v in list(LANGS.items())[i:i + 4]] for i in (0, 4)]
        return await q.message.reply_text(t(lang, "choose_lang"), reply_markup=KM(rows))
    if data == "price":
        return await q.message.reply_text(t(lang, "price", krw=PRICE_KRW, usd=PRICE_USD), reply_markup=menu(lang))
    if data == "status":
        return await q.message.reply_text(status_text(u, lang), reply_markup=menu(lang))
    if data == "position":
        return await q.message.reply_text(position_text(u, lang), reply_markup=menu(lang))
    if data == "trial":
        if u["trial_used"] or u["status"] in ("trial_pending", "trial", "paid", "pay_pending"):
            return await q.message.reply_text(t(lang, "trial_used"), reply_markup=menu(lang))
        upsert_user(uid, step="name")
        return await q.message.reply_text(t(lang, "ask_name"))
    if data.startswith("svc:"):
        upsert_user(uid, service=data.split(":")[1], step="terms")
        return await q.message.reply_text(t(lang, "terms"), reply_markup=KM([
            [B(t(lang, "btn_agree"), callback_data="agree")],
            [B(t(lang, "btn_disagree"), callback_data="disagree")]]))
    if data == "disagree":
        upsert_user(uid, step=None)
        return await q.message.reply_text(t(lang, "welcome"), reply_markup=menu(lang))
    if data == "agree" and u["step"] == "terms":
        if u["trial_used"]:
            return await q.message.reply_text(t(lang, "trial_used"), reply_markup=menu(lang))
        upsert_user(uid, agreed_at=dt.datetime.now(KST).isoformat(timespec="seconds"),
                    status="trial_pending", step=None)
        await q.message.reply_text(t(lang, "trial_requested"))
        u = get_user(uid)
        await admin_send(ctx, f"[무료체험 신청]\n{who(u)}\n서비스: {SERVICES.get(u['service'], u['service'])}\n"
                              f"연락처: {u['phone']}\n언어: {LANGS.get(u['lang'])}",
                         KM([[B("승인", callback_data=f"adm:trial_ok:{uid}"),
                              B("거절", callback_data=f"adm:trial_no:{uid}")]]))
        return
    if data == "pay":
        return await q.message.reply_text(
            t(lang, "pay_info", krw=PRICE_KRW, usd=PRICE_USD, bank=BANK_INFO, overseas=OVERSEAS_INFO),
            reply_markup=KM([[B(t(lang, "btn_paid"), callback_data="paid")]]))
    if data == "paid":
        upsert_user(uid, step="depositor")
        return await q.message.reply_text(t(lang, "ask_depositor"))


def status_text(u, lang):
    if u["status"] == "trial":
        return t(lang, "status_trial", start=fmt_d(u["trial_start"]), end=fmt_d(u["trial_end"]))
    if u["status"] == "paid":
        return t(lang, "status_paid", start=fmt_d(u["paid_start"]), end=fmt_d(u["paid_end"]))
    if u["status"] in ("trial_pending", "pay_pending"):
        return t(lang, "status_pending")
    return t(lang, "status_none")


def who(u):
    return f"{u['name'] or '(이름 없음)'} @{u['username'] or '-'} (번호 {u['tg_id']})"


async def on_contact(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    u = get_user(uid)
    if u and u["step"] == "phone":
        await got_phone(update, uid, update.message.contact.phone_number)


async def got_phone(update, uid, phone):
    lang = lang_of(uid)
    upsert_user(uid, phone=phone, step="service")
    await update.message.reply_text("✓", reply_markup=ReplyKeyboardRemove())
    await update.message.reply_text(t(lang, "ask_service"), reply_markup=KM(
        [[B(v, callback_data=f"svc:{k}") for k, v in SERVICES.items()]]))


async def on_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.message
    uid = update.effective_user.id
    # 운영자가 전달된 문의에 '답장'하면 회원에게 보냄
    if uid == ADMIN_ID and msg.reply_to_message:
        with db() as c:
            r = c.execute("SELECT tg_id FROM relay WHERE admin_msg_id=?",
                          (msg.reply_to_message.message_id,)).fetchone()
        if r:
            await ctx.bot.send_message(r["tg_id"], msg.text)
            return await msg.reply_text("회원에게 보냈습니다.")
    if update.effective_chat.type != "private":
        return
    upsert_user(uid, username=update.effective_user.username or "")
    u = get_user(uid)
    lang = lang_of(uid)
    step = u["step"]
    if step == "name":
        upsert_user(uid, name=msg.text.strip()[:50], step="phone")
        kb = ReplyKeyboardMarkup([[KeyboardButton(t(lang, "btn_share_phone"), request_contact=True)]],
                                 resize_keyboard=True, one_time_keyboard=True)
        return await msg.reply_text(t(lang, "ask_phone"), reply_markup=kb)
    if step == "phone":
        return await got_phone(update, uid, msg.text.strip()[:30])
    if step == "depositor":
        upsert_user(uid, depositor=msg.text.strip()[:50], status="pay_pending" if u["status"] != "paid" else "paid",
                    step=None)
        await msg.reply_text(t(lang, "pay_requested"))
        return await admin_send(ctx, f"[입금 확인 요청]\n{who(u)}\n입금자명: {msg.text.strip()}\n"
                                     f"현재 상태: {u['status']}",
                                KM([[B("입금 확인", callback_data=f"adm:pay_ok:{uid}"),
                                     B("미확인", callback_data=f"adm:pay_no:{uid}")]]))
    if is_position_ask(msg.text):
        return await msg.reply_text(position_text(u, lang), reply_markup=menu(lang))
    await answer_question(update, ctx, u, lang)


# 회원이 이런 말을 쓰면 AI 없이 바로 현재 포지션을 보냄 (8개 언어)
POSITION_WORDS = ["포지션", "포지숀", "현재상태", "잔고", "평가손익", "지금상황",
                  "position", "pos", "현재가",
                  "ポジション", "建玉", "持仓", "仓位", "頭寸", "позиц", "posición", "posicion",
                  "stellung", "positionen"]


def is_position_ask(text):
    s = (text or "").lower().replace(" ", "")
    return len(s) <= 40 and any(w in s for w in POSITION_WORDS)


# ---------------------------------------------------------------- AI 상담
FAQ = f"""You are the customer support assistant of Foket.com (포켓닷컴), a Korean system-trading signal service.
Facts:
- Signals: one overseas futures product (selected daily) + KOSPI200 futures, sent via this Telegram bot.
- Services: Daily (데일리) and Select (셀렉트).
- Free trial: {TRIAL_DAYS} trading days, starting the next trading day after approval, once per Telegram account.
  Apply with the 'Free trial' button (name, phone, service, agree to risk disclosure).
- Paid pass: {PAID_DAYS} trading days, KRW {PRICE_KRW} by Korean bank transfer or USD {PRICE_USD} overseas. Use the 'Pay' button.
- Website: https://www.foket.com (track record). Results shown are logic operation records, not real-money trading.
Rules:
- Reply in the user's language ({{lang}}), short and polite. Korean replies use the ~니다 style.
- Never promise or guarantee profits; never give personal investment advice.
- If the question is about a specific payment problem, refunds, complaints, partnerships, legal matters,
  or anything you cannot answer from the facts, reply with exactly: ESCALATE
"""


async def answer_question(update, ctx, u, lang):
    text = update.message.text
    reply = None
    if ANTHROPIC_KEY:
        try:
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)
            r = await client.messages.create(
                model=AI_MODEL, max_tokens=600, system=FAQ.replace("{lang}", LANGS.get(lang, "Korean")),
                messages=[{"role": "user", "content": text}])
            reply = r.content[0].text.strip()
        except Exception as e:
            log.warning("AI failed: %s", e)
    if not reply or "ESCALATE" in reply:
        m = await admin_send(ctx, f"[문의 전달] {who(u)}\n{text}\n\n(이 메시지에 '답장'하면 회원에게 전달됩니다)")
        if m:
            with db() as c:
                c.execute("INSERT OR REPLACE INTO relay VALUES(?,?)", (m.message_id, u["tg_id"]))
        return await update.message.reply_text(t(lang, "forwarded"), reply_markup=menu(lang))
    await update.message.reply_text(reply, reply_markup=menu(lang))


# ---------------------------------------------------------------- 운영자 버튼
async def admin_send(ctx, text, markup=None):
    if not ADMIN_ID:
        log.warning("ADMIN_CHAT_ID 없음: %s", text)
        return None
    try:
        return await ctx.bot.send_message(ADMIN_ID, text, reply_markup=markup)
    except Exception as e:
        log.warning("admin send failed: %s", e)


async def admin_button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    if q.from_user.id != ADMIN_ID:
        return
    _, act, uid = q.data.split(":")
    uid = int(uid)
    u = get_user(uid)
    lang = lang_of(uid)
    today = today_kst()
    if act == "trial_ok":
        if u["status"] != "trial_pending":
            return await q.edit_message_text(q.message.text + f"\n\n(이미 처리됨: {u['status']})")
        s = next_trading(today)
        e = add_trading(s, TRIAL_DAYS)
        upsert_user(uid, status="trial", trial_used=1, trial_start=s.isoformat(), trial_end=e.isoformat())
        await ctx.bot.send_message(uid, t(lang, "trial_approved", start=s, end=e, n=TRIAL_DAYS), reply_markup=menu(lang))
        return await q.edit_message_text(q.message.text + f"\n\n✅ 승인 ({s} ~ {e})")
    if act == "trial_no":
        upsert_user(uid, status="rejected")
        await ctx.bot.send_message(uid, t(lang, "trial_rejected"))
        return await q.edit_message_text(q.message.text + "\n\n❌ 거절")
    if act == "pay_ok":
        # 이용 중이면 끝난 다음 거래일부터 이어서, 아니면 다음 거래일부터
        if u["status"] == "paid" and u["paid_end"] and dt.date.fromisoformat(u["paid_end"]) >= today:
            s = next_trading(dt.date.fromisoformat(u["paid_end"]))
            start_keep = u["paid_start"]
        else:
            s = next_trading(today)
            start_keep = s.isoformat()
        e = add_trading(s, PAID_DAYS)
        upsert_user(uid, status="paid", paid_start=start_keep, paid_end=e.isoformat(), notified="")
        await ctx.bot.send_message(uid, t(lang, "paid_ok", start=s, end=e, n=PAID_DAYS), reply_markup=menu(lang))
        return await q.edit_message_text(q.message.text + f"\n\n✅ 입금 확인 ({s} ~ {e})")
    if act == "pay_no":
        if u["status"] == "pay_pending":
            upsert_user(uid, status="trial_ended" if u["trial_used"] else "new")
        return await q.edit_message_text(q.message.text + "\n\n⏸ 미확인 (회원에게는 따로 알리지 않음)")


# ---------------------------------------------------------------- 신호 전송
def active_members(service):
    today = today_kst().isoformat()
    with db() as c:
        rows = c.execute("SELECT * FROM users WHERE status IN ('trial','paid')").fetchall()
    out = []
    for u in rows:
        if service not in ("all", None, "") and u["service"] and u["service"] != service:
            continue
        s, e = (u["trial_start"], u["trial_end"]) if u["status"] == "trial" else (u["paid_start"], u["paid_end"])
        if s and e and s <= today <= e:
            out.append(u)
    return out


async def broadcast_signal(app, service, text):
    members = active_members(service)
    sent = 0
    for u in members:
        try:
            await app.bot.send_message(u["tg_id"], f"{t(u['lang'], 'signal_head')}\n{text}", protect_content=True)
            sent += 1
        except Exception as e:
            log.warning("signal to %s failed: %s", u["tg_id"], e)
        await asyncio.sleep(0.05)  # 텔레그램 초당 전송 제한
    with db() as c:
        c.execute("INSERT INTO signals(at, service, text, sent) VALUES(?,?,?,?)",
                  (dt.datetime.now(KST).isoformat(timespec="seconds"), service, text, sent))
    return sent


def is_active(u):
    today = today_kst().isoformat()
    s, e = (u["trial_start"], u["trial_end"]) if u["status"] == "trial" else (u["paid_start"], u["paid_end"])
    return u["status"] in ("trial", "paid") and bool(s and e and s <= today <= e)


def position_text(u, lang):
    """엑셀 A1~F1 값을 마지막으로 받은 그대로 보여 줌. 체험·유료 이용 중인 회원만."""
    if u["tg_id"] != ADMIN_ID and not is_active(u):
        return t(lang, "members_only")
    with db() as c:
        r = c.execute("SELECT at, data FROM position WHERE id=1").fetchone()
    if not r:
        return t(lang, "position_none")
    at = dt.datetime.fromisoformat(r["at"])
    cells = json.loads(r["data"])
    labels = json.loads(os.environ.get("POSITION_LABELS", "[]") or "[]")
    lines = [t(lang, "position_head", at=at.strftime("%m-%d %H:%M:%S"))]
    for i, v in enumerate(cells):
        lab = labels[i] if i < len(labels) and labels[i] else ""
        lines.append(f"{lab}: {v}" if lab else str(v))
    age = (dt.datetime.now(KST) - at).total_seconds() / 60
    if age > int(os.environ.get("POSITION_STALE_MIN", "5")):
        lines.append(t(lang, "position_stale", min=int(age)))
    return "\n".join(lines)


async def http_position(request):
    """엑셀이 A1~F1 값을 몇 초마다 보냄: {"key":..., "cells":["..",..]}"""
    try:
        d = await request.json()
    except Exception:
        d = dict(await request.post())
    if not SIGNAL_KEY or d.get("key") != SIGNAL_KEY:
        return web.json_response({"ok": False, "error": "bad key"}, status=403)
    cells = d.get("cells")
    if isinstance(cells, str):
        cells = cells.split("|")
    if not isinstance(cells, list):
        return web.json_response({"ok": False, "error": "cells"}, status=400)
    with db() as c:
        c.execute("INSERT OR REPLACE INTO position(id, at, data) VALUES(1,?,?)",
                  (dt.datetime.now(KST).isoformat(timespec="seconds"),
                   json.dumps([str(x)[:200] for x in cells[:20]], ensure_ascii=False)))
    return web.json_response({"ok": True})


def signal_text(d):
    """엑셀이 보내는 값: text 하나 또는 sym/side/price/time/memo 항목."""
    if d.get("text"):
        return str(d["text"])[:1000]
    parts = [d.get("time", ""), d.get("sym", ""), d.get("side", ""),
             f"@ {d['price']}" if d.get("price") else "", d.get("memo", "")]
    return " ".join(str(p) for p in parts if p).strip()


async def http_signal(request):
    app = request.app["tg"]
    try:
        d = await request.json()
    except Exception:
        d = dict(await request.post())
    if not SIGNAL_KEY or d.get("key") != SIGNAL_KEY:
        return web.json_response({"ok": False, "error": "bad key"}, status=403)
    text = signal_text(d)
    if not text:
        return web.json_response({"ok": False, "error": "empty"}, status=400)
    n = await broadcast_signal(app, d.get("service", "all"), text)
    return web.json_response({"ok": True, "sent": n})


async def http_health(request):
    return web.json_response({"ok": True})


# ---------------------------------------------------------------- 매일 기간 관리 (KST 07:00)
async def daily_job(ctx: ContextTypes.DEFAULT_TYPE):
    today = today_kst()
    with db() as c:
        rows = c.execute("SELECT * FROM users WHERE status IN ('trial','paid')").fetchall()
    for u in rows:
        uid, lang, note = u["tg_id"], u["lang"] or "ko", u["notified"] or ""
        pay_btn = KM([[B(t(lang, "btn_pay"), callback_data="pay")]])
        try:
            if u["status"] == "trial":
                s, e = dt.date.fromisoformat(u["trial_start"]), dt.date.fromisoformat(u["trial_end"])
                if today > e:
                    upsert_user(uid, status="trial_ended")
                    await ctx.bot.send_message(uid, t(lang, "trial_over"), reply_markup=pay_btn)
                elif trading_index(s, today) == TRIAL_NOTICE_DAY and "trial_notice" not in note:
                    upsert_user(uid, notified=note + ",trial_notice")
                    await ctx.bot.send_message(
                        uid, t(lang, "trial_ending", end=e, left=trading_left(today, e)) +
                        t(lang, "price", krw=PRICE_KRW, usd=PRICE_USD), reply_markup=pay_btn)
            else:
                e = dt.date.fromisoformat(u["paid_end"])
                if today > e:
                    upsert_user(uid, status="expired")
                    await ctx.bot.send_message(uid, t(lang, "paid_over"), reply_markup=pay_btn)
                elif is_trading(today) and trading_left(today, e) < RENEW_NOTICE_BEFORE and \
                        f"renew:{u['paid_end']}" not in note:
                    upsert_user(uid, notified=note + f",renew:{u['paid_end']}")
                    await ctx.bot.send_message(uid, t(lang, "renew", end=e, left=trading_left(today, e)) +
                                               t(lang, "price", krw=PRICE_KRW, usd=PRICE_USD), reply_markup=pay_btn)
        except Exception as ex:
            log.warning("daily job %s: %s", uid, ex)
    await admin_send(ctx, summary())


def summary():
    with db() as c:
        cnt = dict(c.execute("SELECT status, COUNT(*) FROM users GROUP BY status").fetchall())
        soon = c.execute("SELECT name, username, paid_end FROM users WHERE status='paid' ORDER BY paid_end LIMIT 5").fetchall()
    lines = [f"[포켓 봇 회원 현황 {today_kst()}]",
             f"체험 중 {cnt.get('trial', 0)} · 유료 {cnt.get('paid', 0)} · 체험 종료(미전환) {cnt.get('trial_ended', 0)}",
             f"승인 대기 {cnt.get('trial_pending', 0)} · 입금 확인 대기 {cnt.get('pay_pending', 0)} · 만료 {cnt.get('expired', 0)}"]
    if soon:
        lines.append("만료 가까운 유료 회원: " + ", ".join(f"{r['name'] or r['username']}({r['paid_end']})" for r in soon))
    return "\n".join(lines)


async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id == ADMIN_ID:
        await update.message.reply_text(summary())


async def cmd_myid(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"내 텔레그램 번호: {update.effective_user.id}")


async def cmd_signal(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자가 직접 신호 보내기: /signal 텍스트"""
    if update.effective_user.id != ADMIN_ID:
        return
    text = update.message.text.partition(" ")[2].strip()
    if text:
        n = await broadcast_signal(ctx.application, "all", text)
        await update.message.reply_text(f"{n}명에게 보냈습니다.")


async def cmd_position(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    u = get_user(update.effective_user.id)
    if u:
        await update.message.reply_text(position_text(u, u["lang"] or "ko"))


# ---------------------------------------------------------------- 실행
async def main():
    if not TOKEN:
        raise SystemExit("BOT_TOKEN이 없습니다. .env 파일을 확인해 주세요.")
    init_db()
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("myid", cmd_myid))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("signal", cmd_signal))
    app.add_handler(CommandHandler("position", cmd_position))
    app.add_handler(CallbackQueryHandler(on_button))
    app.add_handler(MessageHandler(filters.CONTACT, on_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.job_queue.run_daily(daily_job, time=dt.time(7, 0, tzinfo=KST))

    web_app = web.Application()
    web_app["tg"] = app
    web_app.add_routes([web.post("/signal", http_signal), web.post("/position", http_position), web.get("/health", http_health)])
    runner = web.AppRunner(web_app)

    async with app:
        await app.start()
        await app.updater.start_polling()
        await runner.setup()
        await web.TCPSite(runner, "0.0.0.0", PORT).start()
        log.info("포켓 봇 시작 (신호 받는 주소 포트 %s)", PORT)
        await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
