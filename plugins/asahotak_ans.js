const similarity = require('similarity')
const threshold = 0.72
let handler = m => m
handler.before = async function (m) {
    
    let id = m.chat
    if (!m.quoted || !m.quoted.fromMe || !m.quoted.isBaileys || !/Ketik.*ao/i.test(m.quoted.text)) return !0
    this.asahotak = this.asahotak ? this.asahotak : {}
    if (!(id in this.asahotak)) return m.reply('Soal itu telah berakhir')
    
    let _qid = this.asahotak[id][0].key ? this.asahotak[id][0].key.id : this.asahotak[id][0].id // baileys baru ngembaliin full message, id-nya pindah ke .key.id
    if (m.quoted.id == _qid) {
        let json = JSON.parse(JSON.stringify(this.asahotak[id][1]))
        
        // m.reply(JSON.stringify(json, null, '\t'))
        
        if (m.text.toLowerCase() == json.jawaban.toLowerCase().trim()) {
            global.db.data.users[m.sender].exp += this.asahotak[id][2]
            global.db.data.users[m.sender].limit += 0
            global.db.data.users[m.sender].money += 100

await this.sendPresenceUpdate('composing', m.chat) // dulu conn, jelas error
await m.reply(`
*Jawaban Benar! 🎉*
            
Kamu mendapatkan
🧬 EXP: *${this.asahotak[id][2]} XP*
💰 Uang: *Rp100,-*
`)
            clearTimeout(this.asahotak[id][3])
            delete this.asahotak[id]
        } else if (similarity(m.text.toLowerCase(), json.jawaban.toLowerCase().trim()) >= threshold) m.reply(`*Dikit Lagi!*`)
        else m.reply(`*Jawaban Salah!*`)
    }
    return !0
}
handler.exp = 0

module.exports = handler