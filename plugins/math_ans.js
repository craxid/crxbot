//import db from '../lib/database.js'

let handler = m => m
handler.before = async function (m) {
    if (!/^-?[0-9]+(\.[0-9]+)?$/.test(m.text)) return !0
    let id = m.chat
    if (!m.quoted || !m.quoted.fromMe || !m.text || !/^▢ Jawab matematika berikut/i.test(m.quoted.text)) return !0
    this.math = this.math ? this.math : {}
    if (!(id in this.math)) return this.reply(m.chat, 'permainan sudah berakhir', m)
    let _qid = this.math[id][0].key ? this.math[id][0].key.id : this.math[id][0].id // baileys baru ngembaliin full message, id-nya pindah ke .key.id
    if (m.quoted.id == _qid) {
        let math = JSON.parse(JSON.stringify(this.math[id][1]))
        if (m.text == math.result) {
            global.db.data.users[m.sender].money += math.bonus
            clearTimeout(this.math[id][3])
            await this.sendPresenceUpdate('composing', m.chat) // dulu conn, jelas error
            delete this.math[id]
            m.reply(`✅ *Jawaban benar 🎉*\n\n‣ Kamu mendapatkan : *Rp ${math.bonus}*`)
        } else {
            if (--this.math[id][2] == 0) {
                clearTimeout(this.math[id][3])
                delete this.math[id]
                m.reply(`*Kesempatan sudah habis*\n\n Jawaban : *${math.result}*`)
      } else m.reply(`❎ *Jawaban salah*\n\nSisa ${this.math[id][2]} kesempatan lagi`)
        }
    }
    return !0
}

module.exports = handler