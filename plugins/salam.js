let handler = async (m, { conn }) => {
let name = await conn.getName(m.sender)
let thumb = 'https://telegra.ph/file/bd044275940ed1b62efcd.jpg'
let mikapp = 'https://telegra.ph/file/a9a78b769836fe10fa62d.jpg'

let nama = `@${m.sender.split`@`[0]}`

setTimeout (() => {
conn.sendPresenceUpdate('recording', m.chat)
m.reply(`Waalaikumsalam kak ${nama}`)
}, 3500 )
}
handler.customPrefix = /^(assalamualaikum)$/i
handler.command = new RegExp

module.exports = handler