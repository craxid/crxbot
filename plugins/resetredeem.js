let handler = async (m, { args }) => {
  if (!args[0]) throw 'Masukkan kode yang mau di-reset/hapus!'
  
  let input = args[0].toLowerCase()
  let redeemDb = global.db.data.redeem || {}
  
  // Cari key asli di database yang cocok (Case-Insensitive)
  let allCodes = Object.keys(redeemDb)
  let foundKey = allCodes.find(key => key.toLowerCase() === input)

  if (!foundKey) throw '❌ Kode tidak ditemukan dalam database!'
  
  // Hapus menggunakan key asli yang ditemukan (misal: "8A2X9P")
  delete global.db.data.redeem[foundKey]
  
  m.reply(`✅ Kode *${foundKey}* telah berhasil dihapus dari database.`)
}

handler.help = ['resetredeem']
handler.tags = ['owner']
handler.command = /^(reset|del)redeem$/i
handler.owner = true // Menggunakan owner agar sesuai dengan setredeem kamu

module.exports = handler