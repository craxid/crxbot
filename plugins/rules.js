const fetch = require('node-fetch')
let handler = async (m, { conn }) => {
    
let tegs = `乂 *Rules CraXID Bot:*

❃ 1. Dilarang Melakukan Spam Kepada Bot, Jika Ketahuan Akan Di Banned

❃ 2. Jika Bot Tidak Menjawab 1x, Silahkan Di Coba Lagi, Tapi Jika Bot Tidak Menjawab 2x Itu Artinya Delay, Jangan Di Pakai Dulu, Lapor Ke Owner Jika Perlu

❃ 3. Jangan Spam Bot, Kalau Belum Donasi, Sadar Diri Aja Makenya :)

❃ 4. Jika Limit Habis Silahkan Bermain Game, Untuk Mendapatkan Money & Limit
Contoh Game:
Asah Otak
Tebak Tebakan
Slot
Dll

❃ 5. Dilarang Mengirim Virtex/Bug Ke Bot, Walau Gaada Efek :v

❃ 6. Dilarang Keras Menelpon Bot, Jika Menelpon Akan Otomatis Di Block

❃ 7. Jika Tidak Mengerti Cara Menggunakan Bot, Silahkan Bertanya Pada Member Lain, Atau Jika Tidak Join Group Bot Silahkan Ketik #gcbot Dan Masuk Group Bot

❃ 8. Jika Ada Fitur Error/Tidak Mengerti Cara Menggunakannya Silahkan Laporkan/Tanyakan Kepada Owner

❃ 9. Jika Bot Delay Jangan Di Spam Terlebih Dahulu

❃ 10. Peraturan khusus Grup Bot: dilarang spam chat yang gak perlu, kalo mau chatan di grup lu sendiri aja.

❃ 11. Jika nomor kamu di banned oleh bot, kamu dapat membuka bannednya dengan menyewa bot dengan durasi 30 Hari.

*12 Juni 2024*
`
    
/*let data = fs.readFileSync('./lib/bebeb.js');
let jsonData = JSON.parse(data);
     let randIndex = Math.floor(Math.random() * jsonData.length);
     let json = jsonData[randIndex];
    
let rndm = await getBuffer(json.link)*/
    
var name = m.name
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '628119072423@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}

await conn.sendPresenceUpdate('composing', m.chat)
setTimeout (() => {
conn.sendMessage(m.chat, {
text: tegs,
contextInfo: {
forwardingScore: 9999,
isForwarded: true,
}}, {quoted: m})
}, 3000)

}
handler.help = ['rules']
handler.tags = ['main']
handler.command = /^(rules)$/i

module.exports = handler
