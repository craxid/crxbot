let handler = async (m, { conn}) => {
  let name = await conn.getName(m.sender)
  let thumb = 'https://telegra.ph/file/bd044275940ed1b62efcd.jpg'
  let mikapp = 'https://telegra.ph/file/a9a78b769836fe10fa62d.jpg'

  // Fungsi UUID v4 manual
  function randomUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = Math.random() * 16 | 0
      let v = c === 'x'? r: (r & 0x3 | 0x8)
      return v.toString(16)
})
}

  let hasil = randomUUID()
  let nama = `@${m.sender.split`@`[0]}`

  setTimeout(() => {
    m.reply(`${hasil}`)
}, 2000)
}

handler.customPrefix = /^(randomuuid)$/i
handler.command = new RegExp
module.exports = handler