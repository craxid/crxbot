module.exports = {
    async all(m) {
        if (!m.isGroup) return

        let chats = global.db.data.chats[m.chat]
        if (!chats || !chats.expired) return

        if (Date.now() > chats.expired) {
            // Hapus expired agar tidak spam
            chats.expired = null

            await m.reply(
                `⏰ *Masa sewa bot telah berakhir!*\n\n` +
                `Bot *${this.user.name}* akan keluar dari grup ini.\n` +
                `Untuk perpanjangan sewa, silakan hubungi owner:\n` +
                `📞 wa.me/6281234567890 (@6281234567890)\n\n` +
                `Terima kasih telah menggunakan layanan kami.`
            )

            await this.delay(5000)
            await this.groupLeave(m.chat)
        }
    }
}