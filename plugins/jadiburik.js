const jimp = require("jimp")
const uploadImage = require("../lib/uploadImage.js")
const uploadFile = require("../lib/uploadFile.js")

let handler = async (m, { conn, usedPrefix, args }) => {
  try {
    let maxSize = 16

    let quotedMsg = m.quoted ? m.quoted : m
    let mime = (quotedMsg.msg || quotedMsg).mimetype || ''
    if (!mime) throw "Media not found."

    let media = await quotedMsg.download()
    let isMedia = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime)
    if (!isMedia) throw `The "${mime}" type is not supported.`

    let image = await jimp.read(media)
    let sizeBefore = { width: image.bitmap.width, height: image.bitmap.height }

    let width, height
    if (sizeBefore.width > sizeBefore.height) {
      width = maxSize
      height = Math.round((maxSize / sizeBefore.width) * sizeBefore.height)
    } else {
      height = maxSize
      width = Math.round((maxSize / sizeBefore.height) * sizeBefore.width)
    }

    let resizedImage = await image.resize(width, height)
    let buffer = await resizedImage.getBufferAsync(jimp.MIME_JPEG)
    let sizeAfter = { width: width, height: height }
    let link = await (isMedia ? uploadImage : uploadFile)(media)
    let linkCompres = await (isMedia ? uploadImage : uploadFile)(buffer)

    conn.sendFile(m.chat, buffer, null, `• BEFORE 
*+* Width : ${sizeBefore.width} 
*+* Height : ${sizeBefore.height} 

• AFTER 
*+* Width : ${sizeAfter.width} 
*+* Height : ${sizeAfter.height}

• LINK 
*+* Original: ${link} 
*+* Compressed: ${linkCompres}

Kalo mau dijadiin stiker wajib di resize dulu minimal 512x512 pixel

caranya:
Ketik .resize 512 512

Setelah itu ketik .s
`, m)
  } catch (e) {
    console.error(e)
    throw `${e}`
  }
}

handler.help = ['jadiburik (reply|caption)']
handler.tags = ['tools']
handler.command = /^(jadiburik)$/i

module.exports = handler