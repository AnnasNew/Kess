# ===============================================
# |                 WEBOT.PY                    |
# |      BACKEND PYTHON + SERVER FLASK          |
# ===============================================
import os
import asyncio
import json
import requests
from threading import Thread
from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError
from telethon.tl.functions.channels import JoinChannelRequest
from telethon.tl.functions.messages import SendReactionRequest
from telethon.tl.types import ReactionEmoji
from flask import Flask, render_template, request, jsonify
from colorama import init, Fore
import socket
from urllib.parse import urlparse
import aiohttp
import html
import random
import time
import logging

# ==================== LOGGING & SETTINGS ====================
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
import settings

# ==================== GLOBAL VARIABLES & INITIALIZATION ====================
SESSIONS_DIR = "sessions"
if not os.path.exists(SESSIONS_DIR):
    os.makedirs(SESSIONS_DIR)

app = Flask(__name__, template_folder='templates')
active_clients = {}

# ==================== TELETHON CLIENT SETUP ====================
client = TelegramClient("ubot_session", settings.API_ID, settings.API_HASH)

# ==================== ASYNC HELPER FUNCTIONS ====================
async def send_owner_only(event):
    await event.reply(
        "<blockquote>❌ <b>Akses ditolak</b>\nFitur hanya untuk owner.</blockquote>",
        parse_mode="html"
    )

async def send_message_to_owner(message_text):
    """Mengirim pesan ke owner melalui bot."""
    try:
        if client and client.is_connected():
            await client.send_message(settings.OWNER_ID, message_text, parse_mode='html')
    except Exception as e:
        logging.error(f"Gagal mengirim pesan ke owner: {e}")

async def create_pterodactyl_account(username, telegram_id, memory, disk, cpu, egg, nest):
    """Fungsi untuk membuat akun Pterodactyl."""
    payload = {
        "username": username,
        "email": f"{username}@example.com",
        "first_name": username,
        "last_name": "User",
        "password": "Password123!"
    }
    headers = {
        "Authorization": f"Bearer {settings.PLTA}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    url = f"{settings.DOMAIN}/api/application/users"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, data=json.dumps(payload), headers=headers) as resp:
                if resp.status != 201:
                    raise Exception(f"Gagal membuat user: {await resp.text()}")
                
                user_data = await resp.json()
                user_id = user_data["attributes"]["id"]
                
                server_payload = {
                    "name": username,
                    "user": user_id,
                    "egg": egg,
                    "docker_image": "ghcr.io/pterodactyl/yolks:java_17",
                    "startup": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
                    "environment": {
                        "MIN_RAM": "128",
                        "SERVER_JARFILE": "server.jar"
                    },
                    "limits": {
                        "memory": memory,
                        "swap": 0,
                        "disk": disk,
                        "io": 500,
                        "cpu": cpu
                    },
                    "feature_limits": {
                        "databases": 0,
                        "allocations": 1,
                        "backups": 0
                    },
                    "allocation": {
                        "default": 1
                    },
                    "deploy": {
                        "locations": [settings.LOC],
                        "dedicated_ip": False,
                        "port_range": []
                    }
                }
                
                server_url = f"{settings.DOMAIN}/api/application/servers"
                async with session.post(server_url, data=json.dumps(server_payload), headers=headers) as resp_server:
                    if resp_server.status != 201:
                        raise Exception(f"Gagal membuat server: {await resp_server.text()}")
                    
                    server_data = await resp_server.json()
                    await send_message_to_owner(f"✅ Userbot berhasil membuat akun: {username}")
                    return True, "Akun berhasil dibuat!"
    except Exception as e:
        await send_message_to_owner(f"❌ Userbot gagal membuat akun: {e}")
        return False, str(e)

# ==================== FLASK ROUTES & API ====================
@app.route("/")
def index():
    """Rute utama untuk menampilkan halaman web."""
    return render_template("index.html")

@app.route("/api/run_command", methods=["POST"])
async def run_command():
    """Endpoint API untuk menjalankan perintah bot dari web."""
    data = request.json
    command = data.get("command")
    username = data.get("username")
    telegram_id = data.get("telegram_id")
    
    if not command or not username or not telegram_id:
        return jsonify({"status": "error", "message": "Semua field harus diisi."}), 400
    
    logging.info(f"Menerima perintah dari web: {command} untuk {username}, {telegram_id}")
    
    # Menentukan parameter berdasarkan perintah
    if command == ".1gb":
        params = (username, telegram_id, 1024, 1024, 100, settings.EGGS, settings.LOC)
    elif command == ".2gb":
        params = (username, telegram_id, 2048, 2048, 100, settings.EGGS, settings.LOC)
    elif command == ".unli":
        params = (username, telegram_id, 99999, 99999, 100, settings.EGGS, settings.LOC)
    else:
        return jsonify({"status": "error", "message": "Perintah tidak valid."}), 400

    loop = asyncio.get_event_loop()
    try:
        success, message = await loop.run_in_executor(None, lambda: asyncio.run(create_pterodactyl_account(*params)))
        if success:
            return jsonify({"status": "success", "message": f"✅ Akun {username} berhasil dibuat!"})
        else:
            return jsonify({"status": "error", "message": f"❌ Gagal membuat akun: {message}"})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Terjadi kesalahan pada backend: {str(e)}"}), 500

# ==================== TELETHON EVENT HANDLERS ====================
@client.on(events.NewMessage(pattern=r'^\.menu$'))
async def menu_handler(event):
    if str(event.sender_id) != str(settings.OWNER_ID):
        return await send_owner_only(event)
    menu_text = f"""
<blockquote>

❒——————— PANEL MENU ————————❒
╰➤ .1gb nama,id
╰➤ .2gb nama,id
╰➤ .3gb nama,id
╰➤ .4gb nama,id
╰➤ .5gb nama,id
╰➤ .6gb nama,id
╰➤ .7gb nama,id
╰➤ .8gb nama,id
╰➤ .9gb nama,id
╰➤ .10gb nama,id
╰➤ .unli nama,id
——————————————————————————————
▢ .listserver ==> cek semua server yang tersedia
▢ .delserver id
▢ .listuser cek semua user yang tersedia
▢ .listadmin cek semua admin panel
▢ .cadmin nama,id
▢ .deladmin id
——————————————————————————————

❒——————— GROUP MENU ————————❒
▢ .kick reply/id
▢ .promote reply/id
▢ .demote reply/id
▢ .pin reply
▢ .unpin reply
▢ .liston ==> cek semua yang on ri group
▢ .mute reply
▢ .unmute reply

❒——————— OTHER MENU ————————❒
▢ .cfd all/group
▢ .afk reason
▢ .tt linkurl
▢ .song query
▢ .block id ==> blokir telegram penggunaa
▢ .unblock id ==> buka blokiran penggunaa
▢ .ai query
▢ .cekip domain
▢ .id
▢ .ipaddress IP
▢ .gimg generate IMG ( image )
▢ .rbg reply/caption ==> remove background 
▢ .cimg query
▢ .cgame query
——————————————————————————————

Notes : bot ini hanyalah bot biasa dan gunakan sewajarnya karena ini adalah telegram bukan Whatsapp yang bila kamu terkena blokir akan susah untuk di pulihkan, jika ingin tau lebih lanjut bisa hubungi <a href="https://t.me/junofficial354bot">Owner disini ✨</a>
</blockquote>
"""
    await event.reply(menu_text, parse_mode="html", link_preview=False)

# Tambahkan handler lainnya dari junn.py dan ubot.py di sini...
# Pastikan untuk mengganti semua input() dengan logika yang sesuai untuk web
# atau menggunakan input dari event Telegram jika diperlukan.

# ==================== UTILITY & MAIN EXECUTION ====================
def run_flask():
    """Fungsi untuk menjalankan server Flask."""
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)

def run_telethon():
    """Fungsi untuk menjalankan bot Telethon."""
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(client.start())
        logging.info("Bot Telethon berjalan...")
        loop.run_until_complete(client.run_until_disconnected())
    except Exception as e:
        logging.error(f"Error saat menjalankan bot Telethon: {e}")

if __name__ == "__main__":
    init(autoreset=True)
    flask_thread = Thread(target=run_flask)
    telethon_thread = Thread(target=run_telethon)
    
    flask_thread.start()
    telethon_thread.start()
