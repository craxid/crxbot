const jimp = require("jimp") // gunakan destructuring untuk ambil class Jimp
const uploadImage = require("../lib/uploadImage.js")
const uploadFile = require("../lib/uploadFile.js")

let handler = async (m, { conn, usedPrefix, args}) => {
  try {
    let toWidth = parseInt(args[0])
    let toHeight = parseInt(args[1])
    if (!toWidth) throw 'Please provide the width.'
    if (!toHeight) throw 'Please provide the height.'

    let quotedMsg = m.quoted? m.quoted: m
    let mime = (quotedMsg.msg || quotedMsg).mimetype || ''
    if (!mime) throw "Media not found."

    let media = await quotedMsg.download()
    let isMedia = /image\/(png|jpe?g|gif)|video\/mp4/.test(mime)
    if (!isMedia) throw `The "${mime}" type is not supported.`

    let image = await jimp.read(media)
    let sizeBefore = {
      width: image.bitmap.width,
      height: image.bitmap.height
}

    let resizedImage = await image.resize(toWidth, toHeight)
    let buffer = await resizedImage.getBufferAsync(jimp.MIME_JPEG)
    let sizeAfter = {
      width: toWidth,
      height: toHeight
}

    let link = await (isMedia? uploadImage: uploadFile)(media)
    let linkCompres = await (isMedia? uploadImage: uploadFile)(buffer)

    conn.sendFile(m.chat, buffer, null, ` • BEFORE
*+* Width: ${sizeBefore.width}
*+* Height: ${sizeBefore.height}

• AFTER
*+* Width: ${sizeAfter.width}
*+* Height: ${sizeAfter.height}

• LINK
*+* Original: ${link}
*+* Compressed: ${linkCompres}`, m)
} catch (e) {
    console.error(e)
    throw `${e}`
}
}

handler.help = ['resize <width> <height> (reply|caption)']
handler.tags = ['tools']
handler.command = /^(resize)$/i

module.exports = handler