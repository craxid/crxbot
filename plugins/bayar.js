let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
    let user = global.db.data.users[m.sender]
    
    // Inisialisasi data 
    user.pinjaman = user.pinjaman || 0
    user.money = user.money || 0

    let count = args[0]
    
    // Jika tidak punya hutang
    if (user.pinjaman === 0) return m.reply('Hebat! Kamu tidak memiliki hutang/pinjaman di Bank Bot saat ini.')
    
    // Validasi input
    if (!count) return m.reply(`Masukkan nominal uang yang ingin dibayar!\nTotal hutangmu saat ini: *${user.pinjaman}*\n\n*Contoh penggunaan:*\n${usedPrefix + command} 10000`)
    if (isNaN(count)) return m.reply('Nominal harus berupa angka!')
    
    let nominal = parseInt(count)

    if (nominal < 1) return m.reply('Nominal pembayaran tidak valid!')
    if (nominal > user.money) return m.reply(`Uang kamu tidak cukup untuk membayar hutang sebesar *${nominal}*!\nUang kamu saat ini cuma: *${user.money}*`)
    if (nominal > user.pinjaman) return m.reply(`Nominal yang kamu masukkan melebihi total hutangmu!\nTotal hutangmu saat ini: *${user.pinjaman}*`)

    // Proses potong uang dan potong hutang
    user.money -= nominal
    user.pinjaman -= nominal

    let caption = `✅ *PEMBAYARAN BERHASIL* ✅\n\n`
    caption += `Berhasil membayar hutang sebesar *${nominal}*.\n\n`
    caption += `💳 *Sisa Hutang Kamu:* ${user.pinjaman == 0 ? 'LUNAS' : user.pinjaman}\n`
    caption += `💰 *Sisa Uang Kamu:* ${user.money}`

    m.reply(caption)
  } catch (e) {
    throw `${e}`
  }
}

handler.help = ['bayar <nominal>', 'bayarhutang <nominal>']
handler.tags = ['game']
handler.command = /^(bayar|bayarhutang|lunasi)$/i
handler.premium = false
handler.group = false

module.exports = handler