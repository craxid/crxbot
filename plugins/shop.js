//import db from '../lib/database.js'

const uangkelimit = 1000 
let handler = async (m, { conn, command, args }) => {
  let count = command.replace(/^buy/i, '')
  count = count ? /all/i.test(count) ? Math.floor(global.db.data.users[m.sender].money / uangkelimit) : parseInt(count) : args[0] ? parseInt(args[0]) : 1
  count = Math.max(1, count)
  
  let mikapp = 'https://telegra.ph/file/a9a78b769836fe10fa62d.jpg'
  
  if (global.db.data.users[m.sender].money >= uangkelimit * count) {
    global.db.data.users[m.sender].money -= uangkelimit * count
    global.db.data.users[m.sender].limit += count
    conn.reply(m.chat, `
┌─「 *🛒 PEMBELIAN BERHASIL* 」
‣ Jumlah: *${count} Limit*
‣ Harga: *Rp${uangkelimit * count}*
└──────────────`, m)
  } else conn.reply(m.chat, `❎ Maaf, Kamu tidak memiliki *Uang* untuk membeli *${count}* Limit\n\nKamu bisa mendapatkan *Uang* dari game yang ada di bot.\n\nHarga 1 Limit adalah Rp1000,-`, m)
}
handler.help = ['buy', 'buyall']
handler.tags = ['main']
handler.command = ['buy', 'buyall'] 
handler.disabled = false
handler.register = true

module.exports = handler