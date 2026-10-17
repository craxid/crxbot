let handler = m => m

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Simpan timestamp terakhir per pengguna
const lastUserWarning = {}

// Fungsi penentu waktu
function getTimePeriod() {
  const hour = new Date().getHours()
  if (hour>= 5 && hour < 10) return 'pagi'
  if (hour>= 10 && hour < 14) return 'siang'
  if (hour>= 14 && hour < 18) return 'sore'
  return 'malam'
}

// Kalimat teguran
const motivationalWarningsByTime = {
  pagi: [
    'Selamat pagi. Mari kita mulai hari dengan tutur kata yang baik.',
    'Pagi adalah waktu yang tepat untuk menjaga suasana tetap positif.',
    'Gunakan kata-kata yang membangun, bukan yang merusak semangat.'
  ],
  siang: [
    'Selamat siang. Mohon untuk menjaga etika dalam berkomunikasi.',
    'Mari kita ciptakan suasana grup yang nyaman dan saling menghargai.',
    'Gunakan bahasa yang sopan agar diskusi tetap produktif.'
  ],
  sore: [
    'Selamat sore. Komunikasi yang baik mencerminkan pribadi yang bijak.',
    'Menjelang malam, mari kita jaga suasana tetap tenang dan kondusif.',
    'Sore hari adalah waktu yang tepat untuk berbagi hal positif.'
  ],
  malam: [
    'Selamat malam. Mari tutup hari dengan kata-kata yang menenangkan.',
    'Komunikasi yang santun akan membawa kedamaian dalam grup.',
    'Gunakan malam untuk refleksi, bukan untuk konflik.'
  ]
}

function getMotivationalWarningByTime() {
  const period = getTimePeriod()
  const messages = motivationalWarningsByTime[period]
  return messages[Math.floor(Math.random() * messages.length)]
}

// Regex kata kasar
const badwordPattern = new RegExp(
  '\\b(' +
    [
      'anjing', 'anjeng', 'babi', 'bangsat', 'kontol', 'memek', 'goblok', 'tolol', 'kampret', 'sialan',
      'jembut', 'puki', 'tempek', 'tempik',  'peler', 'zakar', 'titit', 'peju', 'ngewe', 'ngentot', 'nenen','n3n3n','tete','tetek','t3t3','t3t3k',

      // Kata NSFW / CROT DLL
      'lonte', 'lnte', 'crot', 'croot', 'crott', 'crut', 'cr0t', 'cr00t', 'coli', 'colmek', 'c0li', 'c0lmek',

      'anjng', 'ajg', 'anj', 'anjg', 'bngst', 'bbi', 'kntl', 'kntol',
      'mmk', 'mek', 'gblk', 'gblg', 'tll', 'tlol', 'kmprt', 'jmbt', 'puk', 'plr', 'zkr', 't3t3',
      'p3ju', 'ngntt', 'ngntot', 'ngew', 'ngetot',
      '4nj1ng', 'k0nt0l', 'm3m3k', 'g0bl0k', 't010l', 'b4ngs4t', 'j3mbut', 'puk1', 'p3l3r',
      'idiot', 'bodoh', 'brengsek', 'cacat', 'bencong', 'banci', 'sinting', 'setan', 'laknat',
      'bdh', 'b0d0h', 'id10t', 'brngsk', 'bcn', 'bcni', 'stn', 'lknat', 'sntng',
      'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'dumbass', 'motherfucker', 'fucker',
      'slut', 'whore', 'dick', 'pussy', 'cunt', 'jerk', 'retard', 'moron', 'stupid', 'nigga', 'cock', 'ass', 'suck', 'sucker', 'fuk', 'fcuk', 'fck', 'fkn', 'fking', 'fcking', 'fckr',
      'a\\*\\*', 'b\\*\\*\\*', 'c\\*\\*\\*', 'd\\*\\*\\*', 'f\\*\\*\\*', 's\\*\\*\\*'
    ].join('|') +
  ')\\b',
  'i'
)


handler.before = async function (m, { conn, isAdmin, isBotAdmin}) {
  if ((m.isBaileys && m.fromMe) || m.fromMe ||!m.isGroup) return true

  let chat = global.db.data.chats[m.chat]
  let user = global.db.data.users[m.sender] // Akses database user

  if (!chat.antitoxic) return true

  let text = (m.text || '').toLowerCase()
  let found = text.match(badwordPattern)
  if (!found) return true

  let nama = `@${m.sender.split('@')[0]}`
  if (isAdmin) {
    return m.reply(`⚠️ *${nama}*, kalo kata gua mending lu tobat dah, admin gak pantes ngetik begitu.`)
  }

  const now = Date.now()
  const last = lastUserWarning[m.sender] || 0
  const cooldown = 15 * 1000

  if (now - last < cooldown) return true
  lastUserWarning[m.sender] = now

  // Inisialisasi fallback object user jika belum ada di DB (mencegah error)
  if (!user) {
    global.db.data.users[m.sender] = { warn: 0 }
    user = global.db.data.users[m.sender]
  }

  // Tambahkan jumlah peringatan
  user.warn = (user.warn || 0) + 1
  let maxWarn = global.maxwarn || 3 // Menggunakan global.maxwarn (fallback 3)

  let timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta'})

  await delay(2000)

  // Logika eksekusi jika batas peringatan tercapai
  if (user.warn >= maxWarn) {
    if (!isBotAdmin) {
      await m.reply(`⚠️ *BATAS PERINGATAN TERCAPAI*\n${nama} telah mengetik kata kotor sebanyak *${user.warn}/${maxWarn}* kali.\n\n_Bot tidak dapat mengeluarkan pelanggar karena bot belum menjadi admin._`, null, { mentions: [m.sender] })
    } else {
      user.warn = 0 // Reset warn kembali ke 0 setelah dikick
      await m.reply(`⛔ *TIDAK ADA TOLERANSI LAGI*\n${nama} telah melanggar batas aturan kata kasar sebanyak *${maxWarn} kali*.\n\nSelamat tinggal! 👋`, null, { mentions: [m.sender] })

      await delay(1500)

      // Kick user dari grup
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
    }
  } else {
    // Pesan peringatan normal jika belum mencapai maxwarn
    await m.reply(`⚠️ *KATA KASAR TERDETEKSI*\n${nama} baru saja mengetik kata tidak pantas\n\n${getMotivationalWarningByTime()}\n\n*Peringatan:* [ ${user.warn} / ${maxWarn} ]\n_Jika peringatan mencapai batas maksimum, kamu akan otomatis dikick!_\n\n_Untuk mematikan fitur ini, ketik *!disable antitoxic*_\n\n🕒 ${timestamp} WIB`,
      null,
      { mentions: [m.sender]}
    )
  }

  await delay(3000)

  // Hapus pesan yang mengandung kata kasar
  await conn.sendMessage(m.chat, {
    delete: m.key
  })

  return true
}

module.exports = handler
