const jimp = require("jimp")
const uploadImage = require("../lib/uploadImage.js")
const uploadFile = require("../lib/uploadFile.js")

let handler = async (m, { conn, usedPrefix }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    if (!mime) throw "where the media?"
    let media = await q.download()
    let isMedia = /image\/(png|jpe?g|gif)/.test(mime)
    if (!isMedia) throw `The "${mime}" type is not supported.`
    let image = await jimp.read(media)
    let height = image.bitmap.height
    let width = image.bitmap.width
    let link = await uploadImage(media)
    m.reply(`*_RESOLUSI:_* ${width} x ${height} 
*> Lebar :* ${width} 
*> Tinggi :* ${height} 
*> Link :* ${link}`)
  } catch (e) {
    console.error(e)
    throw `${e}`
  }
}

handler.help = ['cekresolution *<foto>*', 'cekreso *<foto>*']
handler.tags = ['tools']
handler.command = /^(cekreso(lution)?)$/i

module.exports = handler