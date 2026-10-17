const similarity = require('similarity')
const threshold = 0.72
let handler = m => m
handler.before = async function (m) {
    let id = m.chat
    if (!m.quoted || !m.quoted.fromMe || !m.quoted.isBaileys || !/Ketik.*teka/i.test(m.quoted.text)) return !0
    this.tebakkata = this.tebakkata ? this.tebakkata : {}
    if (!(id in this.tebakkata)) return m.reply('Soal itu telah berakhir')
    let _qid = this.tebakkata[id][0].key ? this.tebakkata[id][0].key.id : this.tebakkata[id][0].id // baileys baru ngembaliin full message, id-nya pindah ke .key.id
    if (m.quoted.id == _qid) {
        let json = JSON.parse(JSON.stringify(this.tebakkata[id][1]))
        // m.reply(JSON.stringify(json, null, '\t'))
        if (m.text.toLowerCase() == json.jawaban.toLowerCase().trim()) {
            global.db.data.users[m.sender].exp += this.tebakkata[id][2]
            global.db.data.users[m.sender].money += 100
            global.db.data.users[m.sender].limit += 0
            m.reply(`
*Jawaban Benar! 🎉*
            
Kamu mendapatkan
🧬 EXP: *${this.tebakkata[id][2]} XP*
💰 Uang: *Rp100,-*
`)
            clearTimeout(this.tebakkata[id][3])
            delete this.tebakkata[id]
        } else if (similarity(m.text.toLowerCase(), json.jawaban.toLowerCase().trim()) >= threshold) m.reply(`*Dikit Lagi!*`)
        else m.reply(`*Jawaban Salah!*`)
    }
    return !0
}
handler.exp = 0

module.exports = handler 