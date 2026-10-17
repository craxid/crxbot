
let fs = require('fs')
let handler = async (m, { conn }) => {
let name = await conn.getName(m.sender)
let thumb = 'https://telegra.ph/file/bd044275940ed1b62efcd.jpg'
let mikapp = 'https://telegra.ph/file/a9a78b769836fe10fa62d.jpg'

// Dapatkan semua file dalam folder sessions
const files = fs.readdirSync("./sessions");

// Filter file yang tidak ingin dihapus
const filesToDelete = files.filter(file => file !== "creds.json");

// Hapus semua file yang difilter
filesToDelete.forEach(file => {
  fs.unlinkSync(`./sessions/${file}`);
});

setTimeout (() => {
conn.sendPresenceUpdate('composing', m.chat)
m.reply(`Sesi berhasil dihapus`)
}, 1500 )
}
handler.customPrefix = /^(rmsesi|removesesi)$/i
handler.command = new RegExp
handler.owner = true
module.exports = handler