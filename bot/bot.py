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
import asyncio, datetime as dt, json, logging, os, secrets, sqlite3, string
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
logging.getLogger("httpx").setLevel(logging.WARNING)   # 요청 주소에 봇 토큰이 들어가므로 기록하지 않음


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
PORT = int(os.environ.get("PORT", "8091"))
BIND = os.environ.get("BIND", "127.0.0.1")
NOTICE_CHANNEL = os.environ.get("NOTICE_CHANNEL", "")   # 비우면 운영자가 단체방에서 /setnotice 한 곳을 씀
PUBLIC_URL = os.environ.get("PUBLIC_URL", "https://foket.com/bot-api")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "claude-haiku-5-5")
BANK_INFO = os.environ.get("BANK_INFO", "(입금 계좌 미정)")
OVERSEAS_INFO = os.environ.get("OVERSEAS_INFO", "(해외 결제 방법 미정)")
PRICE_KRW = os.environ.get("PRICE_KRW", "500,000")
PRICE_USD = os.environ.get("PRICE_USD", "300")
TRIAL_DAYS = int(os.environ.get("TRIAL_DAYS", "10"))
EDU_DAYS = int(os.environ.get("EDU_DAYS", "120"))              # ROF 교육회원 신호 기간 (거래일)
EDU_PRICE_KRW = os.environ.get("EDU_PRICE_KRW", "3,000,000")
EDU_PRICE_USD = os.environ.get("EDU_PRICE_USD", "2,000")
PAID_DAYS = int(os.environ.get("PAID_DAYS", "20"))
TRIAL_NOTICE_DAY = int(os.environ.get("TRIAL_NOTICE_DAY", "8"))
RENEW_NOTICE_BEFORE = int(os.environ.get("RENEW_NOTICE_BEFORE", "3"))
DB_PATH = os.environ.get("DB_PATH", os.path.join(HERE, "foket_bot.db"))
HOLIDAYS_PATH = os.path.join(HERE, "holidays.txt")
SERVICES = {"daily": "데일리", "select": "셀렉트"}
DAILY_COL = int(os.environ.get("DAILY_COL", "7"))   # 0=A열 … 7=H열: Y 표시 = 오늘 데일리 종목

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
          depositor TEXT, notified TEXT DEFAULT '', created_at TEXT, step TEXT,
          symbols TEXT DEFAULT '');      -- 셀렉트 회원이 고른 종목 코드 (쉼표 구분)
        CREATE TABLE IF NOT EXISTS signals(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT,
          service TEXT, text TEXT, sent INTEGER);
        CREATE TABLE IF NOT EXISTS i18n(lang TEXT, key TEXT, text TEXT, PRIMARY KEY(lang, key));
        CREATE TABLE IF NOT EXISTS positions(code TEXT PRIMARY KEY, data TEXT, daily INTEGER, at TEXT);
        CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT);
        CREATE TABLE IF NOT EXISTS relay(admin_msg_id INTEGER PRIMARY KEY, tg_id INTEGER);
        """)


def migrate_db():
    with db() as c:
        cols = [r[1] for r in c.execute("PRAGMA table_info(users)")]
        if "plan" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT ''")      # '' = 신호 이용권, 'edu' = ROF 교육회원
        if "edu_start_req" not in cols:
            c.execute("ALTER TABLE users ADD COLUMN edu_start_req TEXT DEFAULT ''")
        if not c.execute("SELECT 1 FROM settings WHERE k='i18n_v2'").fetchone():   # 문구가 바뀐 번역은 다시 만들기
            c.execute("DELETE FROM i18n WHERE key IN ('price','trial_used')")
            c.execute("INSERT INTO settings VALUES('i18n_v2','1')")


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
 "price": ("유료 이용권: 20거래일 {krw}원 (계좌이체) 또는 해외 ${usd}.\n무료체험: 10거래일, 1인(휴대폰 번호) 1회.",
           "Paid pass: 20 trading days for KRW {krw} (bank transfer) or USD {usd} overseas.\n"
           "Free trial: 10 trading days, once per person (phone number)."),
 "ask_name": ("이름을 입력해 주세요.", "Please enter your name."),
 "ask_phone": ("연락처를 보내 주세요. 아래 버튼을 누르거나 번호를 입력하시면 됩니다.",
               "Please share your phone number with the button below, or type it."),
 "btn_share_phone": ("연락처 보내기", "Share phone number"),
 "ask_phone_btn": ("본인 확인을 위해 아래 '연락처 보내기' 버튼을 눌러 주세요. 이 텔레그램 계정의 번호가 전달됩니다.",
                   "To verify, please tap the 'Share phone number' button below. It sends this Telegram account's number."),
 "phone_button_only": ("번호를 직접 입력하실 수 없습니다. 아래 '연락처 보내기' 버튼을 눌러 주세요.",
                       "Typing the number is not accepted. Please tap the 'Share phone number' button below."),
 "phone_not_own": ("본인 계정의 연락처만 받을 수 있습니다. 아래 버튼을 눌러 주세요.",
                   "Only your own account's number can be accepted. Please tap the button below."),
 "phone_used": ("이 휴대폰 번호로 이미 무료체험을 이용하셨습니다. 무료체험은 1인 1회입니다. 유료 이용을 원하시면 '결제하기'를 눌러 주세요.",
                "This phone number has already used the free trial (one per person). Tap 'Pay' to subscribe."),
 "ask_service": ("받으실 서비스를 골라 주세요. 언제든 메뉴에서 바꿀 수 있습니다.\n\n"
                 "• 데일리: 포켓이 매일 고른 해외선물 1종목 + 한국선물(코스피200) 1종목, 모두 2종목\n"
                 "• 셀렉트: 회원님이 직접 고른 1종목 (매일 바꿀 수 있음)",
                 "Choose a service. You can change it any time from the menu.\n\n"
                 "• Daily: one overseas future picked by Foket each day + one Korean future (KOSPI200), 2 products\n"
                 "• Select: one product of your choice (changeable every day)"),
 "btn_daily": ("데일리 (포켓 선정 해외 1 + 한국 1)", "Daily (Foket pick + KOSPI200)"),
 "btn_select": ("셀렉트 (내가 고른 1종목)", "Select (1 product of my choice)"),
 "now_daily": ("데일리로 설정되었습니다. 포켓이 매일 고른 해외선물 1종목 + 코스피200 신호를 받습니다.",
               "Set to Daily: Foket's daily overseas pick + KOSPI200."),
 "now_select": ("셀렉트로 설정되었습니다. 받는 종목: {code}\n다른 종목으로 바꾸려면 메뉴의 '서비스·종목 바꾸기'를 누르세요.",
                "Set to Select: {code}\nTo change it, tap 'Change service' in the menu."),
 "no_products": ("종목 목록을 준비 중입니다. 우선 데일리로 설정하고, 준비되면 셀렉트로 바꾸실 수 있습니다.",
                 "The product list is not ready yet. You are set to Daily for now."),
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
 "trial_used": ("무료체험은 1인 1회만 가능합니다. 유료 이용을 원하시면 '결제하기'를 눌러 주세요.",
                "The free trial is available only once per person. Tap 'Pay' to subscribe."),
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
 "btn_edu": ("ROF 교육 신청", "ROF course"),
 "edu_info": ("[포켓 ROF 이론 교육]\n수강료: {krw}원 (해외 수강생 ${usd})\n"
              "수강생은 원하시는 날부터 {n}거래일 동안 데일리 또는 셀렉트 시그널을 받습니다.\n\n"
              "국내 계좌이체: {bank}\n해외: {overseas}\n\n입금하신 뒤 아래 버튼을 눌러 주세요.",
              "[Foket ROF course]\nFee: KRW {krw} (overseas students USD {usd})\n"
              "Students receive Daily or Select signals for {n} trading days from the date they choose.\n\n"
              "Korean bank transfer: {bank}\nOverseas: {overseas}\n\nAfter paying, tap the button below."),
 "btn_edu_paid": ("교육비 입금했습니다", "I have paid the course fee"),
 "ask_edu_start": ("신호를 받기 시작할 날짜를 적어 주세요 (예: 2026-12-01). 바로 시작하려면 '바로'라고 적어 주세요.",
                   "Enter the date to start receiving signals (e.g. 2026-12-01), or type 'now'."),
 "bad_date": ("날짜를 2026-12-01 처럼 적어 주세요.", "Please enter a date like 2026-12-01."),
 "edu_ok": ("교육비 입금이 확인되었습니다. ROF 교육회원으로 {start}부터 {end}까지 ({n}거래일) 신호를 보내 드립니다.\n"
            "데일리/셀렉트는 메뉴의 '서비스·종목 바꾸기'에서 언제든 고르실 수 있습니다.",
            "Course payment confirmed. As an ROF student you will receive signals from {start} to {end} ({n} trading days).\n"
            "Choose Daily or Select any time with 'Change service' in the menu."),
 "status_edu": ("ROF 교육회원: {start} ~ {end}", "ROF student: {start} ~ {end}"),
 "btn_position": ("현재 포지션 보기", "Current position"),
 "position_head": ("[현재 포지션] {at} 기준", "[Current position] as of {at}"),
 "position_none": ("아직 받은 포지션 정보가 없습니다. 잠시 뒤 다시 눌러 주세요.", "No position data yet. Please try again shortly."),
 "position_stale": ("(엑셀 연결이 {min}분째 끊겨 있어 최신 정보가 아닐 수 있습니다)", "(Data may be outdated: no update for {min} min)"),
 "ask_symbols": ("받으실 종목 1개를 눌러 주세요.", "Tap the one product you want."),
 "btn_symbols": ("서비스·종목 바꾸기", "Change service"),
 "my_symbols": ("받는 종목: {codes}", "Products: {codes}"),
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
               [B(t(lang, "btn_status"), callback_data="status"), B(t(lang, "btn_symbols"), callback_data="symbols")],
               [B(t(lang, "btn_edu"), callback_data="edu"), B(t(lang, "btn_lang"), callback_data="lang")]])


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
    if data == "symbols":   # 메뉴: 데일리 <-> 셀렉트, 종목 바꾸기 (언제든)
        upsert_user(uid, step="change")
        return await q.message.reply_text(t(lang, "ask_service"), reply_markup=service_kb(lang))
    if data.startswith("svc:"):
        svc = data.split(":")[1]
        signup = u["step"] == "service"
        if svc == "select":
            if all_codes():
                upsert_user(uid, step="pick_signup" if signup else "pick")
                return await q.message.reply_text(t(lang, "ask_symbols"),
                                                  reply_markup=symbol_kb(lang, split_codes(u["symbols"])))
            await q.message.reply_text(t(lang, "no_products"))
        upsert_user(uid, service="daily", step="terms" if signup else None)
        if signup:
            return await send_terms(q.message, lang)
        return await q.message.reply_text(t(lang, "now_daily"), reply_markup=menu(lang))
    if data.startswith("sym:"):
        code = data[4:]
        if code not in [c for c, _ in all_codes()]:
            return
        signup = u["step"] == "pick_signup"
        upsert_user(uid, service="select", symbols=code, step="terms" if signup else None)
        await q.edit_message_text(t(lang, "now_select", code=code_name(code)))
        if signup:
            return await send_terms(q.message, lang)
        return await q.message.reply_text(t(lang, "welcome"), reply_markup=menu(lang))
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
        await admin_send(ctx, f"[무료체험 신청]\n{who(u)}\n서비스: {SERVICES.get(u['service'], u['service'])}"
                              f"{' (' + u['symbols'] + ')' if u['service'] == 'select' else ''}\n"
                              f"연락처: {u['phone']}\n언어: {LANGS.get(u['lang'])}",
                         KM([[B("승인", callback_data=f"adm:trial_ok:{uid}"),
                              B("거절", callback_data=f"adm:trial_no:{uid}")]]))
        return
    if data == "pay":
        return await q.message.reply_text(
            t(lang, "pay_info", krw=PRICE_KRW, usd=PRICE_USD, bank=BANK_INFO, overseas=OVERSEAS_INFO),
            reply_markup=KM([[B(t(lang, "btn_paid"), callback_data="paid")]]))
    if data == "edu":
        return await q.message.reply_text(
            t(lang, "edu_info", krw=EDU_PRICE_KRW, usd=EDU_PRICE_USD, n=EDU_DAYS, bank=BANK_INFO, overseas=OVERSEAS_INFO),
            reply_markup=KM([[B(t(lang, "btn_edu_paid"), callback_data="edu_paid")]]))
    if data == "edu_paid":
        upsert_user(uid, step="edu_start")
        return await q.message.reply_text(t(lang, "ask_edu_start"))
    if data == "paid":
        upsert_user(uid, step="depositor")
        return await q.message.reply_text(t(lang, "ask_depositor"))


async def send_terms(message, lang):
    await message.reply_text(t(lang, "terms"), reply_markup=KM([
        [B(t(lang, "btn_agree"), callback_data="agree")],
        [B(t(lang, "btn_disagree"), callback_data="disagree")]]))


def service_kb(lang):
    return KM([[B(t(lang, "btn_daily"), callback_data="svc:daily")],
               [B(t(lang, "btn_select"), callback_data="svc:select")]])


def code_name(code):
    n = dict(all_codes()).get(code, "")
    return f"{code} {n}" if n and n != code else code


def symbol_kb(lang, chosen):
    btns = [B(("✅ " if c in chosen else "") + code_name(c), callback_data=f"sym:{c}") for c, _ in all_codes()]
    return KM([btns[i:i + 2] for i in range(0, len(btns), 2)])


def status_text(u, lang):
    if u["status"] == "trial":
        return t(lang, "status_trial", start=fmt_d(u["trial_start"]), end=fmt_d(u["trial_end"])) + \
            "\n" + t(lang, "my_symbols", codes=", ".join(member_codes(u)) or "-")
    if u["status"] == "paid" and (u["plan"] or "") == "edu":
        return t(lang, "status_edu", start=fmt_d(u["paid_start"]), end=fmt_d(u["paid_end"])) + \
            "\n" + t(lang, "my_symbols", codes=", ".join(member_codes(u)) or "-")
    if u["status"] == "paid":
        return t(lang, "status_paid", start=fmt_d(u["paid_start"]), end=fmt_d(u["paid_end"])) + \
            "\n" + t(lang, "my_symbols", codes=", ".join(member_codes(u)) or "-")
    if u["status"] in ("trial_pending", "pay_pending"):
        return t(lang, "status_pending")
    return t(lang, "status_none")


def who(u):
    return f"{u['name'] or '(이름 없음)'} @{u['username'] or '-'} (번호 {u['tg_id']})"


def phone_kb(lang):
    return ReplyKeyboardMarkup([[KeyboardButton(t(lang, "btn_share_phone"), request_contact=True)]],
                               resize_keyboard=True, one_time_keyboard=True)


def norm_phone(p):
    """번호 비교용: 숫자만, 한국 국가번호 82 는 0 으로 (+82 10-1234-5678 → 01012345678)."""
    d = "".join(ch for ch in str(p or "") if ch.isdigit())
    if d.startswith("82") and len(d) >= 11:
        d = "0" + d[2:].lstrip("0")
    return d


def phone_trial_used(uid, phone):
    """같은 번호로 다른 텔레그램 계정이 이미 체험을 받았거나 신청 중인지."""
    with db() as c:
        rows = c.execute("SELECT phone FROM users WHERE tg_id<>? AND phone IS NOT NULL AND phone<>'' AND "
                         "(trial_used=1 OR status IN ('trial_pending','trial','trial_ended'))", (uid,)).fetchall()
    return any(norm_phone(r["phone"]) == phone for r in rows)


async def on_contact(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    u = get_user(uid)
    if not (u and u["step"] == "phone"):
        return
    ct = update.message.contact
    if ct.user_id != uid:       # 다른 사람 연락처를 보낸 경우 (버튼은 항상 본인 번호를 보냄)
        lang = lang_of(uid)
        return await update.message.reply_text(t(lang, "phone_not_own"), reply_markup=phone_kb(lang))
    await got_phone(update, uid, ct.phone_number)


async def got_phone(update, uid, phone):
    lang = lang_of(uid)
    phone = norm_phone(phone)
    if phone_trial_used(uid, phone):
        upsert_user(uid, phone=phone, trial_used=1, step=None)
        await update.message.reply_text(t(lang, "phone_used"), reply_markup=ReplyKeyboardRemove())
        await update.message.reply_text(t(lang, "welcome"), reply_markup=menu(lang))
        return
    upsert_user(uid, phone=phone, step="service")
    await update.message.reply_text("✓", reply_markup=ReplyKeyboardRemove())
    await update.message.reply_text(t(lang, "ask_service"), reply_markup=service_kb(lang))


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
        return await msg.reply_text(t(lang, "ask_phone_btn"), reply_markup=phone_kb(lang))
    if step == "phone":     # 직접 입력한 번호는 본인 확인이 안 되므로 받지 않음
        return await msg.reply_text(t(lang, "phone_button_only"), reply_markup=phone_kb(lang))
    if step == "edu_start":
        txt = msg.text.strip()
        if txt.lower() in ("바로", "now", "지금", "today"):
            start = ""
        else:
            try:
                start = dt.date.fromisoformat(txt.replace(".", "-").replace("/", "-")).isoformat()
            except ValueError:
                return await msg.reply_text(t(lang, "bad_date"))
        upsert_user(uid, edu_start_req=start, step="edu_depositor")
        return await msg.reply_text(t(lang, "ask_depositor"))
    if step == "edu_depositor":
        upsert_user(uid, depositor=msg.text.strip()[:50], step=None)
        u = get_user(uid)
        await msg.reply_text(t(lang, "pay_requested"))
        return await admin_send(ctx, f"[ROF 교육비 입금 확인 요청]\n{who(u)}\n입금자명: {msg.text.strip()}\n"
                                     f"희망 시작일: {u['edu_start_req'] or '바로'}\n"
                                     f"수강료 {EDU_PRICE_KRW}원 / 해외 ${EDU_PRICE_USD}",
                                KM([[B("교육비 입금 확인", callback_data=f"adm:edu_ok:{uid}"),
                                     B("미확인", callback_data=f"adm:edu_no:{uid}")]]))
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
- Services (members can switch any time from the menu button 'Change service'):
  Daily (데일리) = one overseas futures product Foket selects each day + one Korean future (KOSPI200), 2 products.
  Select (셀렉트) = exactly one product the member picks from all products Foket covers; can be changed every day.
- Free trial: {TRIAL_DAYS} trading days, starting the next trading day after approval, once per Telegram account.
  Apply with the 'Free trial' button (name, phone, service, agree to risk disclosure).
- Paid pass: {PAID_DAYS} trading days, KRW {PRICE_KRW} by Korean bank transfer or USD {PRICE_USD} overseas. Use the 'Pay' button.
- ROF theory course (포켓 ROF 교육): KRW {EDU_PRICE_KRW} (overseas USD {EDU_PRICE_USD}). Students get Daily or Select
  signals for {EDU_DAYS} trading days from a start date they choose. Apply with the 'ROF course' menu button.
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
    if act in ("notice_go", "notice_no"):
        return await notice_button(q, ctx, act, uid)
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
    if act == "edu_ok":
        s = next_trading(today)
        if u["edu_start_req"]:
            want = dt.date.fromisoformat(u["edu_start_req"])
            if want > today:
                s = want if is_trading(want) else next_trading(want)
        e = add_trading(s, EDU_DAYS)
        # 이용 중인 유료권이 더 늦게 끝나면 그 날짜를 유지
        if u["status"] == "paid" and u["paid_end"] and dt.date.fromisoformat(u["paid_end"]) > e:
            e = dt.date.fromisoformat(u["paid_end"])
        upsert_user(uid, status="paid", plan="edu", paid_start=s.isoformat(), paid_end=e.isoformat(), notified="",
                    service=u["service"] or "daily")
        await ctx.bot.send_message(uid, t(lang, "edu_ok", start=s, end=e, n=EDU_DAYS), reply_markup=menu(lang))
        return await q.edit_message_text(q.message.text + f"\n\n✅ ROF 교육회원 ({s} ~ {e}, {EDU_DAYS}거래일)")
    if act == "edu_no":
        return await q.edit_message_text(q.message.text + "\n\n⏸ 미확인 (회원에게는 따로 알리지 않음)")
    if act == "pay_no":
        if u["status"] == "pay_pending":
            upsert_user(uid, status="trial_ended" if u["trial_used"] else "new")
        return await q.edit_message_text(q.message.text + "\n\n⏸ 미확인 (회원에게는 따로 알리지 않음)")


# ---------------------------------------------------------------- 종목·신호·포지션
# 엑셀 '봇' 표: 한 줄 = 한 종목. A열 종목코드, B열 종목명, C~G열 정보(포지션, 진입가, 현재가, 평가손익, 진입시간),
# H열에 Y = 오늘 데일리 시그널 종목 (해외 1 + 한국 1).
# 봇은 줄 위치가 아니라 A열 코드로 종목을 알아보므로 줄을 더하거나 순서를 바꿔도 됩니다.
def split_codes(s):
    return [c.strip().upper() for c in (s or "").split(",") if c.strip()]


def all_codes():
    """[(코드, 종목명)] 엑셀이 보낸 모든 종목."""
    with db() as c:
        rows = c.execute("SELECT code, data FROM positions ORDER BY rowid").fetchall()
    out = []
    for r in rows:
        d = json.loads(r["data"])
        out.append((r["code"], d[1] if len(d) > 1 else ""))
    return out


def daily_codes():
    with db() as c:
        return [r["code"] for r in c.execute("SELECT code FROM positions WHERE daily=1 ORDER BY rowid")]


def member_codes(u):
    """회원이 받는 종목. 데일리 = 오늘 G열에 Y 표시된 종목(해외 1 + 한국 1), 셀렉트 = 회원이 고른 종목."""
    if u["service"] == "select":
        return split_codes(u["symbols"])[:1]
    return daily_codes()


def is_active(u):
    today = today_kst().isoformat()
    s, e = (u["trial_start"], u["trial_end"]) if u["status"] == "trial" else (u["paid_start"], u["paid_end"])
    return u["status"] in ("trial", "paid") and bool(s and e and s <= today <= e)


def active_members(code=None):
    """code 종목을 받는 이용 중 회원. code가 없거나 ALL이면 이용 중 회원 전체."""
    with db() as c:
        rows = c.execute("SELECT * FROM users WHERE status IN ('trial','paid')").fetchall()
    code = (code or "").upper()
    return [u for u in rows if is_active(u) and (code in ("", "ALL") or code in member_codes(u))]


async def broadcast_signal(app, code, text):
    sent = 0
    for u in active_members(code):
        try:
            await app.bot.send_message(u["tg_id"], f"{t(u['lang'], 'signal_head')}\n{text}", protect_content=True)
            sent += 1
        except Exception as e:
            log.warning("signal to %s failed: %s", u["tg_id"], e)
        await asyncio.sleep(0.05)  # 텔레그램 초당 전송 제한
    with db() as c:
        c.execute("INSERT INTO signals(at, service, text, sent) VALUES(?,?,?,?)",
                  (dt.datetime.now(KST).isoformat(timespec="seconds"), code or "ALL", text, sent))
    if ADMIN_ID:   # Sean님께도 사본: 신호가 실제로 나갔는지 바로 확인
        try:
            await app.bot.send_message(ADMIN_ID, f"[신호 발송 · {code or 'ALL'} · {sent}명]\n{text}")
        except Exception as e:
            log.warning("signal copy to admin failed: %s", e)
    return sent


def position_text(u, lang):
    """회원이 받는 종목의 현재 정보(엑셀 표의 해당 줄)만 보여 줌. 운영자는 전체."""
    is_admin = u["tg_id"] == ADMIN_ID
    if not is_admin and not is_active(u):
        return t(lang, "members_only")
    codes = [c for c, _ in all_codes()] if is_admin else member_codes(u)
    with db() as c:
        rows = {r["code"]: r for r in c.execute("SELECT * FROM positions")}
    rows = [rows[c] for c in codes if c in rows]
    if not rows:
        return t(lang, "position_none")
    labels = json.loads(os.environ.get("POSITION_LABELS", "[]") or "[]")
    at = max(dt.datetime.fromisoformat(r["at"]) for r in rows)
    lines = [t(lang, "position_head", at=at.strftime("%m-%d %H:%M:%S"))]
    for r in rows:
        d = json.loads(r["data"])
        lines.append("")
        lines.append(f"■ {d[0]}" + (f" {d[1]}" if len(d) > 1 and d[1] else ""))
        for i in range(2, len(d)):
            if str(d[i]).strip() == "" or i == DAILY_COL:   # 데일리 표시 열은 회원에게 안 보임
                continue
            lab = labels[i] if i < len(labels) and labels[i] else ""
            lines.append(f"  {lab}: {d[i]}" if lab else f"  {d[i]}")
    age = (dt.datetime.now(KST) - at).total_seconds() / 60
    if age > int(os.environ.get("POSITION_STALE_MIN", "5")):
        lines.append("")
        lines.append(t(lang, "position_stale", min=int(age)))
    return "\n".join(lines)


async def read_body(request):
    try:
        return await request.json()
    except Exception:
        return dict(await request.post())


async def http_position(request):
    """엑셀이 표 전체를 몇 초마다 보냄: {"key":..., "rows":[["NQ","미니나스닥","매수",...,"Y"], ...]}"""
    d = await read_body(request)
    if not SIGNAL_KEY or d.get("key") != SIGNAL_KEY:
        return web.json_response({"ok": False, "error": "bad key"}, status=403)
    rows = d.get("rows")
    if rows is None and isinstance(d.get("cells"), list):
        rows = [d["cells"]]
    if not isinstance(rows, list):
        return web.json_response({"ok": False, "error": "rows"}, status=400)
    now = dt.datetime.now(KST).isoformat(timespec="seconds")
    n = 0
    with db() as c:
        if d.get("full", True):
            c.execute("DELETE FROM positions")   # 표에서 지운 종목은 봇에서도 지움
        for r in rows[:200]:
            if not isinstance(r, list) or not r or not str(r[0]).strip():
                continue
            cells = [str(x)[:200] for x in r[:12]]
            cells[0] = cells[0].strip().upper()
            daily = 1 if len(cells) > DAILY_COL and cells[DAILY_COL].strip().upper() in ("Y", "O", "1", "데일리") else 0
            c.execute("INSERT OR REPLACE INTO positions(code, data, daily, at) VALUES(?,?,?,?)",
                      (cells[0], json.dumps(cells, ensure_ascii=False), daily, now))
            n += 1
    return web.json_response({"ok": True, "rows": n})


def signal_text(d):
    """엑셀이 보내는 값: text 하나 또는 sym/side/price/time/memo 항목."""
    if d.get("text"):
        return str(d["text"])[:1000]
    parts = [d.get("time", ""), d.get("sym", ""), d.get("side", ""),
             f"@ {d['price']}" if d.get("price") else "", d.get("memo", "")]
    return " ".join(str(p) for p in parts if p).strip()


async def http_signal(request):
    """{"key":..., "sym":"NQ", "text":"NQ 매수 진입 21000"} → NQ를 받는 회원에게만 보냄."""
    app = request.app["tg"]
    d = await read_body(request)
    if not SIGNAL_KEY or d.get("key") != SIGNAL_KEY:
        return web.json_response({"ok": False, "error": "bad key"}, status=403)
    text = signal_text(d)
    if not text:
        return web.json_response({"ok": False, "error": "empty"}, status=400)
    n = await broadcast_signal(app, d.get("sym", ""), text)
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
        edu = c.execute("SELECT COUNT(*) FROM users WHERE status='paid' AND plan='edu'").fetchone()[0]
        soon = c.execute("SELECT name, username, paid_end FROM users WHERE status='paid' ORDER BY paid_end LIMIT 5").fetchall()
    lines = [f"[포켓 봇 회원 현황 {today_kst()}]",
             f"체험 중 {cnt.get('trial', 0)} · 유료 {cnt.get('paid', 0)} (그중 ROF 교육회원 {edu}) · 체험 종료(미전환) {cnt.get('trial_ended', 0)}",
             f"승인 대기 {cnt.get('trial_pending', 0)} · 입금 확인 대기 {cnt.get('pay_pending', 0)} · 만료 {cnt.get('expired', 0)}"]
    if soon:
        lines.append("만료 가까운 유료 회원: " + ", ".join(f"{r['name'] or r['username']}({r['paid_end']})" for r in soon))
    return "\n".join(lines)


async def cmd_stats(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id == ADMIN_ID:
        await update.message.reply_text(summary())


async def cmd_excel(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자에게만: 엑셀 VBA에 넣을 주소와 키."""
    if update.effective_user.id == ADMIN_ID:
        await update.message.reply_text(f"엑셀 FoketBot 모듈에 넣을 값\nBOT_URL = {PUBLIC_URL}\nBOT_KEY = {SIGNAL_KEY}",
                                        protect_content=True)


async def cmd_newkey(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자에게만: 엑셀 키를 새로 만들어 바로 적용 (이전 키는 즉시 무효)."""
    global SIGNAL_KEY
    if update.effective_user.id != ADMIN_ID:
        return
    key = "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))
    old = os.umask(0o077)
    try:
        with open(os.path.join(HERE, "signal_key"), "w") as f:          # 다음 배포 때도 이 키를 유지
            f.write(key)
        envp = os.path.join(HERE, ".env")
        if os.path.exists(envp):                 # 봇이 다시 켜져도 이 키를 사용
            lines = open(envp, encoding="utf-8").read().splitlines()
            lines = [f"SIGNAL_KEY={key}" if l.startswith("SIGNAL_KEY=") else l for l in lines]
            open(envp, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    finally:
        os.umask(old)
    SIGNAL_KEY = key
    log.info("엑셀 키 교체됨")
    await update.message.reply_text(
        "엑셀 키를 새로 만들었습니다. 이전 키는 지금부터 쓸 수 없습니다.\n"
        "엑셀 FoketBot 모듈의 BOT_KEY 를 아래 값으로 바꾸고 저장해 주세요.\n\n"
        f"BOT_KEY = {key}", protect_content=True)


async def cmd_signals(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자에게만: 최근 발송 신호 20건."""
    if update.effective_user.id != ADMIN_ID:
        return
    with db() as c:
        rows = c.execute("SELECT at, service, text, sent FROM signals ORDER BY id DESC LIMIT 20").fetchall()
    if not rows:
        return await update.message.reply_text("아직 발송된 신호가 없습니다.")
    lines = [f"{r['at'][5:16].replace('T', ' ')} {r['service']} ({r['sent']}명) {r['text'][:80]}" for r in rows]
    await update.message.reply_text("최근 발송 신호\n" + "\n".join(lines))


async def cmd_myid(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(f"내 텔레그램 번호: {update.effective_user.id}")


# ---------------------------------------------------------------- 전체 공지
def notice_targets():
    """공지를 같이 올릴 단체방·채널 목록: 환경설정 + /setnotice 로 등록한 곳."""
    out = [c.strip() for c in NOTICE_CHANNEL.split(",") if c.strip()]
    with db() as c:
        r = c.execute("SELECT v FROM settings WHERE k='notice_chats'").fetchone()
    for x in (r["v"].split(",") if r and r["v"] else []):
        if x and x not in out:
            out.append(x)
    return out


async def cmd_setnotice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자가 단체방(또는 채널)에서 /setnotice → 그 방을 공지 게시 대상으로 등록. /unsetnotice 로 해제."""
    if update.effective_user is None or update.effective_user.id != ADMIN_ID:
        return
    chat = update.effective_chat
    if chat.type == "private":
        return await update.message.reply_text("공지를 올릴 단체방에 봇을 넣은 뒤, 그 단체방에서 /setnotice 를 보내 주세요.")
    cur = [x for x in notice_targets() if x not in NOTICE_CHANNEL.split(",")]
    cid = str(chat.id)
    unset = update.message.text.startswith("/unsetnotice")
    cur = [x for x in cur if x != cid] + ([] if unset else [cid])
    with db() as c:
        c.execute("INSERT OR REPLACE INTO settings VALUES('notice_chats', ?)", (",".join(cur),))
    await ctx.bot.send_message(ADMIN_ID, f"공지 게시 대상 {'해제' if unset else '등록'}: {chat.title}")
    try:
        await update.message.delete()
    except Exception:
        pass


async def cmd_notice(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자: /notice 공지 내용 → 미리보기 + [보내기][취소] → 봇을 쓴 모든 사람 + 공지 채널"""
    if update.effective_user.id != ADMIN_ID:
        return
    text = update.message.text.partition(" ")[2].strip()
    if not text:
        return await update.message.reply_text("사용법: /notice 공지 내용 (여러 줄 가능)")
    with db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, text TEXT, sent INTEGER)")
        nid = c.execute("INSERT INTO notices(at, text, sent) VALUES(?,?,NULL)",
                        (dt.datetime.now(KST).isoformat(timespec="seconds"), text)).lastrowid
        n = c.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    await update.message.reply_text(
        f"[공지 미리보기] 받는 사람: 봇 이용자 {n}명" + (f" + 단체방·채널 {len(notice_targets())}곳" if notice_targets() else "") +
        f"\n\n{text}", reply_markup=KM([[B("보내기", callback_data=f"adm:notice_go:{nid}"),
                                          B("취소", callback_data=f"adm:notice_no:{nid}")]]))


async def notice_button(q, ctx, act, nid):
    with db() as c:
        r = c.execute("SELECT text, sent FROM notices WHERE id=?", (int(nid),)).fetchone()
    if not r or r["sent"] is not None:
        return await q.edit_message_text(q.message.text + "\n\n(이미 처리됨)")
    if act == "notice_no":
        with db() as c:
            c.execute("UPDATE notices SET sent=-1 WHERE id=?", (int(nid),))
        return await q.edit_message_text(q.message.text + "\n\n❌ 취소")
    with db() as c:
        c.execute("UPDATE notices SET sent=0 WHERE id=?", (int(nid),))
    await q.edit_message_text(q.message.text + "\n\n⏳ 보내는 중...")
    await send_notice(ctx.bot, int(nid), r["text"], "all", "Sean님")


async def send_notice(bot, nid, text, audience="all", by=""):
    """공지 발송. audience: all(봇 이용자 전원+단체방) / members(체험·유료 이용 중만) / group(단체방만)"""
    if audience == "group":
        users = []
    else:
        with db() as c:
            rows = c.execute("SELECT * FROM users").fetchall()
        users = [u["tg_id"] for u in rows if audience == "all" or is_active(u)]
    sent = 0
    for uid in users:
        try:
            await bot.send_message(uid, f"[포켓 공지]\n{text}")
            sent += 1
        except Exception:
            pass
        await asyncio.sleep(0.05)
    ch = ""
    for target in ([] if audience == "members" else notice_targets()):
        try:
            await bot.send_message(int(target) if target.lstrip("-").isdigit() else target, text)
            ch += ", 단체방 게시"
        except Exception as e:
            ch += f", 단체방 게시 실패({e})"
    with db() as c:
        c.execute("UPDATE notices SET sent=? WHERE id=?", (sent, nid))
    if ADMIN_ID:
        await bot.send_message(ADMIN_ID, f"[공지 완료{' · ' + by if by else ''}] {sent}명{ch}\n\n{text[:300]}")
    return sent


async def http_notice(request):
    """자동 공지: {"key":..., "text":"...", "audience":"all|members|group"}. 키는 서버 안에만 있음."""
    d = await read_body(request)
    key = request.headers.get("X-Key") or d.get("key")
    if not SIGNAL_KEY or key != SIGNAL_KEY:
        return web.json_response({"ok": False, "error": "bad key"}, status=403)
    text = str(d.get("text", "")).strip()[:3500]
    audience = d.get("audience", "all")
    if not text or audience not in ("all", "members", "group"):
        return web.json_response({"ok": False, "error": "text/audience"}, status=400)
    with db() as c:
        c.execute("CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, text TEXT, sent INTEGER)")
        nid = c.execute("INSERT INTO notices(at, text, sent) VALUES(?,?,0)",
                        (dt.datetime.now(KST).isoformat(timespec="seconds"), text)).lastrowid
    n = await send_notice(request.app["tg"].bot, nid, text, audience, str(d.get("by", "자동"))[:40])
    return web.json_response({"ok": True, "sent": n})


async def cmd_signal(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자가 직접 신호 보내기: /signal NQ 매수 21000 (첫 단어가 종목코드면 그 종목 회원에게만)"""
    if update.effective_user.id != ADMIN_ID:
        return
    text = update.message.text.partition(" ")[2].strip()
    code = text.split(" ")[0].upper() if text else ""
    if code not in [c for c, _ in all_codes()]:
        code = "ALL"
    if text:
        n = await broadcast_signal(ctx.application, code, text)
        await update.message.reply_text(f"{n}명에게 보냈습니다.")


async def cmd_testsignal(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    """운영자에게만: 회원이 받는 모양 그대로 가상 신호를 Sean님께만 보냄. 회원·기록에는 남지 않음.
    /testsignal  또는  /testsignal NQ 매수 진입 21000"""
    if update.effective_user.id != ADMIN_ID:
        return
    text = update.message.text.partition(" ")[2].strip() or "코스피200 매수 진입 (가상 신호)"
    lang = lang_of(update.effective_user.id)
    await ctx.bot.send_message(ADMIN_ID, f"[테스트 · 회원에게는 가지 않습니다]\n{t(lang, 'signal_head')}\n{text}",
                               protect_content=True)


async def cmd_position(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    u = get_user(update.effective_user.id)
    if u:
        await update.message.reply_text(position_text(u, u["lang"] or "ko"))


# ---------------------------------------------------------------- 실행
async def main():
    if not TOKEN:
        raise SystemExit("BOT_TOKEN이 없습니다. .env 파일을 확인해 주세요.")
    init_db()
    migrate_db()
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("myid", cmd_myid))
    app.add_handler(CommandHandler("excel", cmd_excel))
    app.add_handler(CommandHandler("newkey", cmd_newkey))
    app.add_handler(CommandHandler("signals", cmd_signals))
    app.add_handler(CommandHandler("testsignal", cmd_testsignal))
    app.add_handler(CommandHandler("notice", cmd_notice))
    app.add_handler(CommandHandler(["setnotice", "unsetnotice"], cmd_setnotice))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("signal", cmd_signal))
    app.add_handler(CommandHandler("position", cmd_position))
    app.add_handler(CallbackQueryHandler(on_button))
    app.add_handler(MessageHandler(filters.CONTACT, on_contact))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))
    app.job_queue.run_daily(daily_job, time=dt.time(7, 0, tzinfo=KST))

    web_app = web.Application()
    web_app["tg"] = app
    web_app.add_routes([web.post("/signal", http_signal), web.post("/position", http_position), web.post("/notice", http_notice), web.get("/health", http_health)])
    runner = web.AppRunner(web_app)

    async with app:
        await app.start()
        await app.bot.delete_webhook()   # 예전에 다른 곳에 연결돼 있던 봇이어도 이 서버가 받도록
        await app.updater.start_polling()
        await runner.setup()
        await web.TCPSite(runner, BIND, PORT).start()
        log.info("포켓 봇 시작 (신호 받는 주소 포트 %s)", PORT)
        await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
