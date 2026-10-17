const axios = require('axios');
const fs = require('fs');

let handler = async (m, { conn, args }) => {
  try {
    if (!args[0]) return m.reply('Teksnya mana njir? 🤔')
    let teks = encodeURIComponent(args.join` `)
    let response = await axios.get(`https://api-mininxd.vercel.app/brat?txt=${teks}`, { responseType: 'arraybuffer' })
    let buffer = Buffer.from(response.data, "binary")
    m.reply(stiker_wait)
    let stickerId = m.sender.replace(/[^0-9]/g, '')
    let categories = ['AI-' + stickerId.slice(0, 3)]
    let encmedia = await conn.sendImageAsSticker(m.chat, buffer, m, { packname: global.packname, author: global.author, isAiSticker: true, stickerId: stickerId, categories: categories })
    await fs.unlinkSync(encmedia)
  } catch (error) {
    console.error(`Error: ${error}`)
    m.reply(`Error: ${error}`)
  }
}

handler.help = ['brat <teks>']
handler.tags = ['sticker']
handler.command = /^brat$/i
handler.register = true
handler.limit = true

module.exports = handler