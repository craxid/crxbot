let handler = async (m, { args }) => {
  if (!args[0]) throw 'Masukkan kode yang mau di-reset/hapus!\n\nUntuk hapus semua kode kadaluarsa: .resetredeem all'

  let input = args[0].toLowerCase()
  let redeemDb = global.db.data.redeem || {}

  // hapus semua kode yang sudah habis kuotanya
  if (input === 'all') {
    let allCodes = Object.keys(redeemDb)
    if (!allCodes.length) return m.reply('Tidak ada kode redeem di database.')

    let deleted = []
    for (let code of allCodes) {
      let r = redeemDb[code]
      let used = (r.users || []).length
      let quota = r.quota || 0
      if (used >= quota) {
        delete redeemDb[code]
        deleted.push(code)
      }
    }

    if (!deleted.length) return m.reply('Tidak ada kode kadaluarsa/sudah diklaim.')
    return m.reply('Berhasil hapus ' + deleted.length + ' kode:\n' + deleted.map(c => '- ' + c).join('\n'))
  }

  // Cari key asli di database yang cocok (Case-Insensitive)
  let allCodes = Object.keys(redeemDb)
  let foundKey = allCodes.find(key => key.toLowerCase() === input)

  if (!foundKey) throw 'Kode tidak ditemukan dalam database!'

  // Hapus menggunakan key asli yang ditemukan
  delete global.db.data.redeem[foundKey]

  m.reply('Kode *' + foundKey + '* telah berhasil dihapus dari database.')
}

handler.help = ['resetredeem']
handler.tags = ['owner']
handler.command = /^(reset|del)redeem$/i
handler.owner = true

module.exports = handler
