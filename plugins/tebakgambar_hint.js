let handler = async (m, { conn }) => {
    conn.tebakgambar = conn.tebakgambar ? conn.tebakgambar : {}
    let id = m.chat
    if (!(id in conn.tebakgambar)) throw false
    let json = conn.tebakgambar[id][1]
    
setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
m.reply('```' + json.jawaban.replace(/[bcdfghjklmnpqrstvwxyz]/gi, '_') + '```\nBALAS SOALNYA, BUKAN PESAN INI!')
}, 2500)
}
handler.command = /^tega$/i
handler.limit = true
module.exports = handler