const fetch = require('node-fetch')
let handler = async (m, { conn, args, text, usedPrefix, command }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
let thumb = 'https://telegra.ph/file/016c521fb63069af28cec.jpg'

await m.reply(wait)

if (!text) throw `*Minecraft Bedrock Stalker*

Masukan IP/Host dan Port Server Minecraft-mu

Contoh: ${usedPrefix + command} play.hosting.com:19132`

try {
let response = args.join(' ').split(':')

let ncnlstat = await fetch(`https://api.mcsrvstat.us/bedrock/3/${response[0]}:${response[1]}`)

let sevre = await

ncnlstat.json()

let tegs = `
${global.htki} *Bedrock Server Stalker* ${global.htka}
${global.gz} *Versi:* ${sevre.version}
${global.gz} *MOTD:* ${sevre.motd.clean}
${global.gz} *Nama Dunia:* ${sevre.map.clean}
${global.gz} *Mode:* ${sevre.gamemode}
${global.gz} *Pemain:* ${sevre.players.online}/${sevre.players.max}
${global.gz} *Status:* ${sevre.online}
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${sevre.hostname}
${global.gz} *Port:* ${sevre.port}
${global.sb}
`
    
conn.sendMessage(m.chat, {
text: (`${tegs}`).replace('true','Online','false','Offline'),
contextInfo: {
forwardingScore: 9999,
isForwarded: true,
}}, { quoted: fkonn })

	}
	catch (error) {
  console.error(error)
  throw `Error: ${error}`
}
//end

}
handler.help = ['brstalk']
handler.command = /^(brstalk|bedrockstalk)$/i
handler.group = false

module.exports = handler
