#!/bin/bash
clear
# Warna-warna
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m" # reset

# Cek apakah webot.py ada
if [ ! -f "webot.py" ]; then
    echo -e "${RED}[ERROR]${NC} File webot.py tidak ditemukan!"
    exit 1
fi

# Paksa install module
echo -e "${CYAN}📦 Menginstal module Python yang diperlukan...${NC}"
pip install --upgrade pip > /dev/null 2>&1
pip install telethon colorama requests Flask aiohttp > /dev/null 2>&1

clear

echo -e "${CYAN}══════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📌 INFORMASI:${NC}"
echo -e "Saat login nanti:"
echo -e " - Input ${GREEN}nomor Telegram${NC},"
echo -e " - Input ${GREEN}kode OTP${NC},"
echo -e " - Input ${GREEN}password 2FA (jika ada)${NC}."
echo -e ""
echo -e "${RED}⚠️ Semua input tidak akan terlihat saat diketik.${NC}"
echo -e "Ketik saja langsung lalu tekan ENTER."
echo -e "${CYAN}══════════════════════════════════════════════${NC}"

read -p "Tekan ENTER untuk melanjutkan..."

echo "Menjalankan server web dan bot..."
python webot.py
