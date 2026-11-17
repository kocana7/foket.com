#!/usr/bin/env bash
# 포켓 봇 서버 설치 (Ubuntu 22.04/24.04). 서버 터미널에서 이 파일이 있는 폴더에서: sudo bash install.sh
set -e
cd "$(dirname "$0")"
DIR=/opt/foket-bot
if ss -ltn 2>/dev/null | grep -q ":8080 " && ! systemctl is-active -q foket-bot; then
  echo "8080 포트를 이미 다른 프로그램이 쓰고 있습니다. 아이티에게 알려 주세요."; exit 1
fi
mkdir -p $DIR
cp bot.py requirements.txt holidays.txt $DIR/
apt-get update -y && apt-get install -y python3-venv python3-pip
python3 -m venv $DIR/venv
$DIR/venv/bin/pip install -q -r $DIR/requirements.txt

if [ ! -f $DIR/.env ]; then
  echo "== 설정 입력 (입력한 값은 이 서버에만 저장됩니다) =="
  read -rsp "1) BotFather 토큰 붙여넣기 (화면에 안 보입니다): " TOKEN; echo
  read -rp  "2) Sean님 텔레그램 번호 (@userinfobot 이 알려 주는 Id 숫자): " ADMIN
  read -rsp "3) Claude API 키 (없으면 그냥 Enter): " AKEY; echo
  read -rp  "4) 입금 계좌 (예: OO은행 000-00-0000 예금주 포켓닷컴): " BANK
  read -rp  "5) 해외 결제 방법 (없으면 Enter): " OVS
  SKEY=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)
  cat > $DIR/.env <<ENV
BOT_TOKEN=$TOKEN
ADMIN_CHAT_ID=$ADMIN
SIGNAL_KEY=$SKEY
ANTHROPIC_API_KEY=$AKEY
BANK_INFO=$BANK
OVERSEAS_INFO=${OVS:-해외 결제는 문의해 주세요}
PRICE_KRW=500,000
PRICE_USD=300
POSITION_LABELS=["종목","포지션","진입가","현재가","평가손익","시간"]
PORT=8080
ENV
  chmod 600 $DIR/.env
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
systemctl enable --now foket-bot
sleep 3
systemctl --no-pager status foket-bot | head -5
echo
echo "== 설치 끝 =="
echo "엑셀 VBA에 넣을 값:"
echo "  BOT_URL = http://$(curl -s ifconfig.me):8080"
echo "  BOT_KEY = $(grep SIGNAL_KEY $DIR/.env | cut -d= -f2)"
