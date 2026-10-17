let fetch = require('node-fetch')
let handler = async (m, { text }) => {
if (!text) throw `Masukan pesan!`
try {

  let res = await fetch(`https://aemt.uk.to/simi?text=${text}`)

  let json = await res.json()
  let hasil = `🐤 Simi: ${json.result}`

  m.reply(hasil)

} catch (e) {
throw `Internal server eror!`
  }
}
handler.help = ['simi', 'simsimi', 'simih'].map(v => v + ' <teks>')
handler.tags = ['fun']
handler.command = /^((sim)?simi|simih)$/i
handler.premium = true
module.exports = handler