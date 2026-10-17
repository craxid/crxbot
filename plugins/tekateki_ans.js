const similarity = require('similarity')
const threshold = 0.72
let handler = m => m
handler.before = async function (m) {
    let id = m.chat
    if (!m.quoted || !m.quoted.fromMe || !m.quoted.isBaileys || !/Ketik.*tekki/i.test(m.quoted.text)) return !0
    this.tekateki = this.tekateki ? this.tekateki : {}
    if (!(id in this.tekateki)) return m.reply('Soal itu telah berakhir')
    let _qid = this.tekateki[id][0].key ? this.tekateki[id][0].key.id : this.tekateki[id][0].id // baileys baru ngembaliin full message, id-nya pindah ke .key.id
    if (m.quoted.id == _qid) {
        let json = JSON.parse(JSON.stringify(this.tekateki[id][1]))
        // m.reply(JSON.stringify(json, null, '\t'))
        if (m.text.toLowerCase() == json.jawaban.toLowerCase().trim()) {
            global.db.data.users[m.sender].exp += this.tekateki[id][2]
            global.db.data.users[m.sender].money += 100
            global.db.data.users[m.sender].limit += 0
            m.reply(`
*Jawaban Benar! 🎉*
            
Kamu mendapatkan
🧬 EXP: *${this.tekateki[id][2]} XP*
💰 Uang: *Rp100,-*
`)
            clearTimeout(this.tekateki[id][3])
            delete this.tekateki[id]
        } else if (similarity(m.text.toLowerCase(), json.jawaban.toLowerCase().trim()) >= threshold) m.reply(`*Dikit Lagi!*`)
        else m.reply(`*Jawaban Salah!*`)
    }
    return !0
}
handler.exp = 0

module.exports = handler