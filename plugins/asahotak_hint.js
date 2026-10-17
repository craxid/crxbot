let handler = async (m, { conn }) => {
    
    conn.asahotak = conn.asahotak ? conn.asahotak : {}
    let id = m.chat
    if (!(id in conn.asahotak)) throw false
    let json = conn.asahotak[id][1]
    let ans = json.jawaban
    let clue = ans.replace(/[bcdfghjklmnpqrstvwxyz]/g, '_')
    
setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
    m.reply('```' + clue + '```\nBalas soalnya, bukan pesan ini')
},2500)
}
handler.command = /^ao$/i
handler.limit = true
module.exports = handler