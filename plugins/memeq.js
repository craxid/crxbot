
const uploadImage = require('../lib/uploadImage.js')
const fetch = require('node-fetch')

let handler = async (m, { conn, text, command, usedPrefix }) => {
 try {
     await m.reply('_Sedang dibuat..._')
  let teks1 = text.split('|')[0] ? text.split('|')[0] : '-'
  let teks2 = text.split('|')[1] ? text.split('|')[1] : '-'
  
  let q = m.quoted ? m.quoted : m
  let mime = (q.msg || q).mimetype || ''
  if (!mime) throw 'Tidak ada foto'
  if (!/image\/(jpe?g|png)/.test(mime)) throw `Mime ${mime} tidak support`
  let img = await q.download()
  let url = await uploadImage(img)
  let memeq = `https://api.memegen.link/images/custom/${encodeURIComponent(teks1)}/${encodeURIComponent(teks2)}.png?background=${url}`
 /*let memeq = await conn.getFile(`https://api.zahwazein.xyz/creator/smeme?text=${encodeURIComponent(teks1)}&text2=${encodeURIComponent(teks2)}&url=${url}&apikey=${global.andarazCekapi || "zenzkey_f59c1aacf2"}`)*/
  
setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
conn.sendFile(m.chat, memeq, 'meme_picture.jpg', 'Meme Maker by CraXID Bot', m)
}, 3000)

 } catch (e) {
   m.reply(`Reply gambar dengan caption ${usedPrefix + command} teks atas|teks bawah\n*Jangan reply sticker*`)
  }
}

handler.command = handler.help = ['mememaker']
handler.tags = ['sticker','maker','tools']
/*handler.command = /^(mememaker|memeq)$/i*/
handler.limit = true

module.exports = handler
