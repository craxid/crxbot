let handler = async (m, { conn }) => {
    conn.tebakkimia = conn.tebakkimia ? conn.tebakkimia : {}
    let id = m.chat
    if (!(id in conn.tebakkimia)) throw false
    let json = conn.tebakkimia[id][1]

setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
m.reply('```' + json.unsur.replace(/[bcdfghjklmnpqrstvwxyz]/g, '_') + '```')
}, 2500)
}
handler.command = /^teki$/i
handler.limit = true
module.exports = handler