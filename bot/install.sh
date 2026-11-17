#!/usr/bin/env bash
# 포켓 봇 서버 설치·갱신 (Ubuntu 22.04/24.04)
#  - 자동: 홈페이지 배포(GitHub Actions)가 GitHub Secrets 값으로  sudo bash install.sh --env <파일>  실행
#  - 수동: 서버 터미널에서  sudo bash install.sh  (값을 하나씩 물어봄)
# 봇은 127.0.0.1:8091 에서만 열리고, 외부에서는 https://foket.com/bot-api/ (nginx) 로 들어옵니다.
set -e
cd "$(dirname "$0")"
DIR=/opt/foket-bot
PORT=8091
mkdir -p $DIR
cp bot.py requirements.txt holidays.txt $DIR/
if [ ! -x $DIR/venv/bin/python ]; then
  apt-get update -y -q && apt-get install -y -q python3-venv python3-pip
  python3 -m venv $DIR/venv
fi
$DIR/venv/bin/pip install -q -r $DIR/requirements.txt

# 엑셀 비밀 키: 한 번 만들고 계속 유지
[ -f $DIR/signal_key ] || (head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32 > $DIR/signal_key)
SKEY=$(cat $DIR/signal_key)

write_env() {  # $1=토큰 $2=관리자번호 $3=API키 $4=계좌 $5=해외결제
  umask 077
  {
    echo "BOT_TOKEN=$1"
    echo "ADMIN_CHAT_ID=$2"
    echo "SIGNAL_KEY=$SKEY"
    echo "ANTHROPIC_API_KEY=$3"
    echo "BANK_INFO=${4:-입금 계좌는 문의해 주세요}"
    echo "OVERSEAS_INFO=${5:-해외 결제는 문의해 주세요}"
    echo "PRICE_KRW=500,000"
    echo "PRICE_USD=300"
    echo 'POSITION_LABELS=["코드","종목","포지션","진입가","현재가","평가손익","진입시간"]'
    echo "PORT=$PORT"
    echo "BIND=127.0.0.1"
    echo "PUBLIC_URL=https://foket.com/bot-api"
  } > $DIR/.env
  chmod 600 $DIR/.env
}

if [ "$1" = "--env" ]; then
  # 배포가 넘겨준 값 (KEY=VALUE 줄). 파일은 읽고 바로 지움
  set -a; . "$2"; set +a; rm -f "$2"
  if [ -z "$BOT_TOKEN" ]; then echo "BOT_TOKEN 없음: 봇 설치를 건너뜁니다"; exit 0; fi
  write_env "$BOT_TOKEN" "$BOT_ADMIN_CHAT_ID" "$ANTHROPIC_API_KEY" "$BOT_BANK_INFO" "$BOT_OVERSEAS_INFO"
elif [ ! -f $DIR/.env ]; then
  echo "== 설정 입력 (입력한 값은 이 서버에만 저장됩니다) =="
  read -rsp "1) BotFather 토큰 붙여넣기 (화면에 안 보입니다): " TOKEN; echo
  read -rp  "2) Sean님 텔레그램 번호 (@userinfobot 이 알려 주는 Id 숫자): " ADMIN
  read -rsp "3) Claude API 키 (없으면 그냥 Enter): " AKEY; echo
  read -rp  "4) 입금 계좌 (예: OO은행 000-00-0000 예금주 포켓닷컴): " BANK
  read -rp  "5) 해외 결제 방법 (없으면 Enter): " OVS
  write_env "$TOKEN" "$ADMIN" "$AKEY" "$BANK" "$OVS"
fi

cat > /etc/systemd/system/foket-bot.service <<SVC
[Unit]
Description=Foket Telegram bot
After=network-online.target
[Service]
WorkingDirectory=$DIR
ExecStart=$DIR/venv/bin/python $DIR/bot.py
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SVC
systemctl daemon-reload
systemctl enable -q foket-bot
systemctl restart foket-bot
sleep 4
if curl -fsS http://127.0.0.1:$PORT/health > /dev/null; then
  echo "포켓 봇 실행 중. 엑셀 연결 값은 봇에 /excel 을 보내면 Sean님께만 보입니다."
else
  echo "포켓 봇이 아직 응답하지 않습니다. 기록:"; journalctl -u foket-bot -n 30 --no-pager; exit 1
fi
