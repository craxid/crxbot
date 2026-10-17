let handler = async (m, {conn, usedPrefix}) => {
	
    let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender
    let user = global.db.data.users[who]
    if (!(who in global.db.data.users)) throw `✳️ Pengguna tidak ada di database`

var name = m.name
var fkonn = { key: { fromMe: false, participant: `628119072423@s.whatsapp.net`, ...(m.chat ? { remoteJid: 'status@broadcast' } : {}) }, message: { contactMessage: { displayName: `${name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}

await conn.sendPresenceUpdate('composing', m.chat)
setTimeout (() => {
    conn.reply(m.chat, `
┌───⊷ *BALANCE* ⊶
▢ *📌 Nama*: _@${who.split('@')[0]}_
▢ *💰 Uang*: Rp ${user.money.toLocaleString('id-ID')},-
▢ *🔗 Limit*: ${user.limit.toLocaleString('id-ID')}
▢ *⬆️ XP*: Total ${user.exp.toLocaleString('id-ID')}
└──────────────

*Catatan:* 
Kamu bisa beli 🔗 Limit dengan perintah
❏ *${usedPrefix}buy <jumlah>*
❏ *${usedPrefix}buyall*

Harga 1 Limit adalah Rp1000,-`, m, { mentions: [who] })
}, 3000)
}
handler.help = ['balance']
handler.tags = ['main']
handler.command = ['balance'] 

module.exports = handler