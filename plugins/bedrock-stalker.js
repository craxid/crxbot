const fetch = require('node-fetch')
let handler = async (m, { conn, args, text, usedPrefix, command }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}
let thumb = 'https://telegra.ph/file/016c521fb63069af28cec.jpg'

await m.reply(wait)

if (!text) throw `*Minecraft Bedrock Stalker*

Masukan IP/Host dan Port Server Minecraft-mu

Contoh: ${usedPrefix + command} play.hosting.com:19132`

let host = args.join(' ').trim()
let port = 19132
if (host.includes(':')) {
let potong = host.split(':')
host = potong[0]
port = parseInt(potong[1]) || 19132
}

// server bedrock sekarang (26.50+) transportnya nethernet,
// statusnya dicek lewat endpoint /v1/join, ping raknet udah ga jalan
async function cekNetherNet() {
let res = await fetch(`http://${host}:${port}/v1/join`, { timeout: 10000 })
if (!res.ok) throw new Error('HTTP ' + res.status)
return await res.json()
}

// server jadul yg masih raknet tetep dicek kayak dulu via mcsrvstat
async function cekRakNet() {
let res = await fetch(`https://api.mcsrvstat.us/bedrock/3/${host}:${port}`, { timeout: 15000 })
return await res.json()
}

let modeList = ['Survival', 'Creative', 'Adventure']
let hasil = null
let metode = ''

try {
let j = await cekNetherNet()
hasil = {
versi: j.version,
nama: j.name,
dunia: j.level,
mode: modeList[j.gameType] || '-',
pemain: `${j.players}/${j.maxPlayers}`
}
metode = 'NetherNet'
} catch (e) {
try {
let s = await cekRakNet()
if (s && s.online) {
hasil = {
versi: s.version,
nama: s.motd ? s.motd.clean : '-',
dunia: s.map ? s.map.clean : '-',
mode: s.gamemode || '-',
pemain: s.players ? `${s.players.online}/${s.players.max}` : '-'
}
metode = 'RakNet'
}
} catch (e2) {}
}

let tegs
if (hasil) {
tegs = `
${global.htki} *Bedrock Server Stalker* ${global.htka}
${global.gz} *Nama Server:* ${hasil.nama}
${global.gz} *Versi:* ${hasil.versi}
${global.gz} *Nama Dunia:* ${hasil.dunia}
${global.gz} *Mode:* ${hasil.mode}
${global.gz} *Pemain:* ${hasil.pemain}
${global.gz} *Status:* Online
${global.gz} *Transport:* ${metode}
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${host}
${global.gz} *Port:* ${port}
${global.sb}
`
} else {
tegs = `
${global.htki} *Bedrock Server Stalker* ${global.htka}
${global.gz} *Status:* Offline
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${host}
${global.gz} *Port:* ${port}
${global.sb}

Server tidak menjawab lewat NetherNet maupun RakNet. Pastikan IP dan portnya benar dan servernya sedang menyala.
`
}

conn.sendMessage(m.chat, {
text: tegs,
contextInfo: {
forwardingScore: 9999,
isForwarded: true,
}}, { quoted: fkonn })

}
handler.help = ['brstalk']
handler.command = /^(brstalk|bedrockstalk)$/i
handler.group = false

module.exports = handler
