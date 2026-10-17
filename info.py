import psutil
import platform
import subprocess
import datetime
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes
from apscheduler.schedulers.asyncio import AsyncIOScheduler

BOT_TOKEN = 'ISI_TOKEN_DISINI'
CHAT_ID = 2007138982  # kirim langsung ke user ID kamu

start_time = datetime.datetime.now()

def get_vps_status():
    host = platform.node()

    ipv4 = subprocess.getoutput("hostname -I").split()[0]
    try:
        ipv6 = subprocess.getoutput("ip -6 addr show scope global | grep inet6 | awk '{print $2}' | cut -d/ -f1").split()[0]
    except:
        ipv6 = "-"

    uptime = datetime.datetime.now() - start_time
    uptime_days = uptime.days

    load1, load5, load15 = psutil.getloadavg()

    mem = psutil.virtual_memory()
    ram_used = round(mem.used / 1024 / 1024, 2)
    ram_total = round(mem.total / 1024 / 1024, 2)

    tcp_count = len([c for c in psutil.net_connections(kind='tcp')])
    udp_count = len([c for c in psutil.net_connections(kind='udp')])

    net_io = psutil.net_io_counters()
    upload = round(net_io.bytes_sent / 1024 / 1024, 2)
    download = round(net_io.bytes_recv / 1024 / 1024, 2)
    total = upload + download

    status = f"""
💻 Host: {host}
🌐 IPv4: {ipv4}
🌐 IPv6: {ipv6}
⏳ Waktu Aktif: {uptime_days} Hari
📈 Beban Sistem: {load1:.2f}, {load5:.2f}, {load15:.2f}
📋 RAM: {ram_used}MB/{ram_total}MB
🌐 Klien Online: 0
🔹 TCP: {tcp_count}
🔸 UDP: {udp_count}
🚦 Lalu Lintas: {total}MB (↑{upload}MB,↓{download}MB)
ℹ️ Status: running
"""
    return status

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    status = get_vps_status()
    await update.message.reply_text(status)

async def send_status(context: ContextTypes.DEFAULT_TYPE):
    status = get_vps_status()
    await context.bot.send_message(chat_id=CHAT_ID, text=status)

def main():
    app = Application.builder().token(BOT_TOKEN).build()

    # Command manual
    app.add_handler(CommandHandler("status", status_command))

    # Scheduler untuk auto-monitor
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_status, "interval", minutes=5, args=[app])
    scheduler.start()

    app.run_polling()

if __name__ == "__main__":
    main()