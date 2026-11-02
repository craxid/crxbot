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

// ===== Cek badword di voice note (gratis, jalan lokal pake Whisper) =====
// Butuh: npm i @huggingface/transformers  +  ffmpeg kepasang
// Model diunduh sekali pas VN pertama masuk, abis itu di-cache di memori.

const WHISPER_MODEL = 'Xenova/whisper-tiny' // kalo spek server kuat bisa ganti ke Xenova/whisper-small
const MAX_VN_DETIK = 60 // VN lebih panjang dari ini cuma ditranskrip 60 detik pertama

let _transcriber = null
let _sttNgalor = false // penanda kalo package STT gak kepasang, biar gak nyoba terus

async function getTranscriber() {
  if (_transcriber) return _transcriber
  if (_sttNgalor) return null
  try {
    const { pipeline } = await import('@huggingface/transformers')
    _transcriber = await pipeline('automatic-speech-recognition', WHISPER_MODEL)
    return _transcriber
  } catch (e) {
    // package belum di-install -> skip cek VN permanen sampe restart;
    // error lain (mis. unduh model gagal) biar dicoba lagi di VN berikutnya
    console.error('[antibadword] STT gak tersedia:', e.message)
    if (e.code === 'ERR_MODULE_NOT_FOUND' || /cannot find module/i.test(e.message || '')) _sttNgalor = true
    return null
  }
}

// ubah audio VN (ogg/opus) jadi PCM 16kHz mono, format yg diminta whisper
function vnToPcm16k(buf) {
  const { execFile } = require('child_process')
  return new Promise((resolve, reject) => {
    const proc = execFile('ffmpeg',
      ['-y', '-loglevel', 'error', '-i', 'pipe:0', '-ar', '16000', '-ac', '1', '-f', 's16le', 'pipe:1'],
      { encoding: 'buffer', maxBuffer: 100 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(err)
        const s16 = new Int16Array(stdout.buffer, stdout.byteOffset, Math.floor(stdout.length / 2))
        const f32 = new Float32Array(s16.length)
        for (let i = 0; i < s16.length; i++) f32[i] = s16[i] / 32768
        resolve(f32)
      })
    proc.stdin.on('error', () => {})
    proc.stdin.write(buf)
    proc.stdin.end()
  })
}

async function transkripVN(audioBuf) {
  const pipe = await getTranscriber()
  if (!pipe) return ''
  const pcm = await vnToPcm16k(audioBuf)
  const batas = 16000 * MAX_VN_DETIK
  const potong = pcm.length > batas ? pcm.slice(0, batas) : pcm
  const hasil = await pipe(potong, { language: 'indonesian' })
  return (hasil.text || '').trim()
}
// ===== akhir blok VN =====

handler.before = async function (m, { conn, isAdmin, isBotAdmin}) {
  if ((m.isBaileys && m.fromMe) || m.fromMe ||!m.isGroup) return true

  let chat = global.db.data.chats[m.chat]
  let user = global.db.data.users[m.sender] // Akses database user

  if (!chat.antitoxic) return true

  let text = (m.text || '').toLowerCase()
  let dariVN = false

  // kalo pesannya voice note, transkrip dulu baru dicek
  if (!text && m.mtype === 'audioMessage' && m.msg && m.msg.ptt) {
    try {
      const audioBuf = await m.download()
      const hasil = await transkripVN(audioBuf)
      if (hasil) {
        text = hasil.toLowerCase()
        dariVN = true
      }
    } catch (e) {
      console.error('[antibadword] gagal transkrip VN:', e.message)
      return true // gagal transkrip = lewatin, jangan asal nuduh
    }
  }

  let found = text.match(badwordPattern)
  if (!found) return true

  let nama = `@${m.sender.split('@')[0]}`
  let sumberKata = dariVN ? '_terdeteksi dari voice note_\n\n' : ''

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
    await m.reply(`⚠️ *KATA KASAR TERDETEKSI*\n${sumberKata}${nama} baru saja mengetik kata tidak pantas\n\n${getMotivationalWarningByTime()}\n\n*Peringatan:* [ ${user.warn} / ${maxWarn} ]\n_Jika peringatan mencapai batas maksimum, kamu akan otomatis dikick!_\n\n_Untuk mematikan fitur ini, ketik *!disable antitoxic*_\n\n🕒 ${timestamp} WIB`,
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
