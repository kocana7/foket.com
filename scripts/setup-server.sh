#!/bin/bash
# EC2 Ubuntu 22.04 초기 서버 설정 스크립트
set -e

echo "=== [1/6] 패키지 업데이트 ==="
sudo apt update && sudo apt upgrade -y

echo "=== [2/6] Node.js 20 설치 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

echo "=== [3/6] PM2 & Nginx 설치 ==="
sudo npm install -g pm2
sudo apt install -y nginx

echo "=== [4/6] MySQL 8 설치 ==="
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

echo "=== [5/6] MySQL DB/유저 생성 ==="
# 아래 비밀번호는 반드시 변경하세요
MYSQL_DB="foket_db"
MYSQL_USER="foket_user"
MYSQL_PASS="Foket@DB2024!"

sudo mysql -e "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASS}';"
sudo mysql -e "GRANT ALL PRIVILEGES ON \`${MYSQL_DB}\`.* TO '${MYSQL_USER}'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"

echo "=== [6/6] 앱 디렉토리 준비 ==="
sudo mkdir -p /var/www/foket
sudo chown -R ubuntu:ubuntu /var/www/foket

echo ""
echo "✓ 기본 설치 완료!"
echo "다음 단계: .env 파일 생성 후 schema.sql 을 import 하세요."
echo "  sudo mysql foket_db < /var/www/foket/database/schema.sql"
