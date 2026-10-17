const fetch = require('node-fetch')

let handler = async (m, { conn, command, text, customPrefix }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}

let thumb = 'https://telegra.ph/file/016c521fb63069af28cec.jpg'
await m.reply(wait)

let db = 'https://mcpedl.org/uploads_files/21-06-2024/minecraft-1-21-1.apk'

try {
let tegs = `
${global.htki} *NCNL Realm* ${global.htka}
${global.gz} Versi: *TERBARU*
${global.gz} Mode: *Survival*
${global.gz} Status: *Online*
${global.sb}

${global.htki} *LINK REALM* ${global.htka}
${global.gz} *https://realms.gg/9XgPQTmXgqw9Zus*
${global.sb}

_⏳ SEDANG MENGIRIM MINECRAFT VERSI TERBARU..._
`
    
conn.sendMessage(m.chat, {
text: tegs,
contextInfo: {
forwardingScore: 9999,
isForwarded: true,
}}, { quoted: fkonn })

let nama = 'minecraft-1-21-1.apk'

//conn.sendMessage(m.chat, { document: { url: db }, mimetype: 'application/vnd.android.package-archive', fileName: nama }, { quoted: fkonn })

	}
	catch {
		m.reply(`👾 Error`)
	}
//end
}
handler.help = ['realm']
handler.customPrefix = /^(realm)$/i
handler.command = new RegExp
handler.group = true

module.exports = handler
