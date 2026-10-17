let fs = require('fs')
let fetch = require('node-fetch')
let handler = async(m, { conn, usedPrefix, text, participants }) => {

if (!text) throw `Teksnya mana? Coba pake ${usedPrefix}hidetag2 sambil balas pesannya jadi lu gak usah ngetik lagi`

try {
var name = m.name
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: 'status@broadcast' } : {}) }, message: { contactMessage: { displayName: `${name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}

/*const fkontak = {
	"key": {
    "participants":"0@s.whatsapp.net",
		"remoteJid": "status@broadcast",
		"fromMe": false,
		"id": "Halo"
	},
	"message": {
		"contactMessage": {
			"vcard": `BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
		}
	},
	"participant": "0@s.whatsapp.net"
}*/

   
//var tegs = m.quoted.text
await conn.sendPresenceUpdate('composing', m.chat)
setTimeout(() => {
conn.sendMessage(m.chat, { text: `${text}`, mentions: participants.map(a => a.id) }, { quoted: fkonn })
}, 5000)
    } catch (e) {
console.error(e)
throw `Mana teksnya?`
}
}

handler.help = ['hidetag <pesan>']
handler.tags = ['group']
handler.command = /^(hidetag)$/i
handler.botAdmin = true
handler.group = true
handler.admin = true
module.exports = handler