const axios = require('axios')
const FormData = require('form-data')

const MAX_SIZE = 50 * 1024 * 1024 // 50MB, batas Bot API Telegram

// pending konfirmasi hapus, pola sama kayak plugin transfer
let confirmation = {}

function tgApi(token, method) {
  return `https://api.telegram.org/bot${token}/${method}`
}

// token jangan sampai nyangkut di teks error yg ke-log atau ke user:
// error axios bawa url lengkap termasuk token bot, bahaya kalo ke-forward ke chat
function tanpaToken(teks, token) {
  let s = String(teks || '')
  if (token) s = s.split(token).join('[token]')
  return s
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  let u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < u.length - 1) { bytes /= 1024; i++ }
  return bytes.toFixed(2) + ' ' + u[i]
}

// tebak ekstensi dari mimetype kalau nama file gak ada
function extFromMime(mime) {
  let map = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/3gpp': '3gp',
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a',
    'audio/x-wav': 'wav', 'audio/wav': 'wav', 'audio/aac': 'aac',
    'application/pdf': 'pdf', 'application/zip': 'zip',
    'text/plain': 'txt'
  }
  if (map[mime]) return map[mime]
  let parts = mime.split('/')
  if (parts[1]) return parts[1].split(';')[0].split('+')[0]
  return ''
}

// tebak mimetype dari nama file biar tidak jadi BIN
function mimeFromName(name) {
  let ext = ((name || '').match(/\.([a-z0-9]+)$/i) || [])[1] || ''
  ext = ext.toLowerCase()
  let map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp',
    mp4: 'video/mp4', webm: 'video/webm', '3gp': 'video/3gpp',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg',
    wav: 'audio/wav', aac: 'audio/aac',
    pdf: 'application/pdf', zip: 'application/zip', txt: 'text/plain'
  }
  return map[ext] || 'application/octet-stream'
}

// ambil file_path dari telegram dengan retry (kadang timeout sesaat)
async function tgGetFile(token, file_id, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      let { data } = await axios.get(tgApi(token, 'getFile'), {
        params: { file_id }, timeout: 45000
      })
      if (data.ok && data.result.file_path) return data.result.file_path
      throw new Error(data.description || 'getFile gagal')
    } catch (e) {
      lastErr = e
      if (i < tries - 1) await new Promise(r => setTimeout(r, 2000))
    }
  }
  throw lastErr
}

function helpText(prefix) {
  return `✈️ *TGFILE* ✈️
Simpan file ke Telegram.

${prefix}tgfile up <nama file> — upload dengan nama itu (reply ke foto/video/audio/dokumen/stiker, maks 50MB). Nama boleh dikosongkan, nanti pakai nama bawaan file
${prefix}tgfile list — lihat file kamu
${prefix}tgfile get <nomor> — ambil file
${prefix}tgfile del <nomor> — hapus satu file
${prefix}tgfile del all — hapus semua file
${prefix}tgfile rename <nomor> <nama baru> — ubah nama file
${prefix}tgfile share <nomor> <@tag user> — bagikan file ke user lain`
}

// hapus satu file dari telegram + db, dipakai setelah konfirmasi
async function doDelete(token, chatId, user, idx) {
  let f = user.tgFiles[idx]
  // file hasil share cuma referensi ke file pemiliknya; kalo pesan telegramnya
  // ikut dihapus, file di daftar pemilik asli jadi rusak. cukup lepas dr daftar user ini
  if (!f.shared) {
    try {
      await axios.post(tgApi(token, 'deleteMessage'), {
        chat_id: chatId, message_id: f.msg_id
      }, { timeout: 20000 })
    } catch (e) {
      // pesan mungkin sudah tidak ada, tetap hapus dari db
    }
  }
  user.tgFiles.splice(idx, 1)
  return f
}

let handler = async (m, { conn, args, usedPrefix }) => {
  let token = global.tgtoken
  let chatId = global.tgchat
  if (!token || !chatId) throw 'Telegram belum dikonfigurasi.\nOwner: isi global.tgtoken & global.tgchat di config.js'

  let user = global.db.data.users[m.sender]
  if (!Array.isArray(user.tgFiles)) user.tgFiles = []

  let cmd = (args[0] || '').toLowerCase()
  let rest = args.slice(1).join(' ').trim()

  if (!cmd) throw helpText(usedPrefix)

  // ---- upload ----
  if (cmd === 'up' || cmd === 'upload') {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    if (!mime) throw 'Reply ke foto/video/audio/dokumen yang mau disimpan'
    let media = await q.download()
    if (!media) throw 'Gagal download media'
    if (media.length > MAX_SIZE) throw 'Ukuran file maksimal 50MB (batas Telegram)'
    let filename = q.fileName || (q.msg || q).fileName
    let ext = extFromMime(mime)
    // nama dari user (.tgfile up <nama>) menang lawan nama bawaan file;
    // karakter yg ga aman buat nama file dibuang dulu
    let namaCustom = rest.replace(/[\\/:*?"<>|]/g, '').trim()
    if (namaCustom) {
      let extAsli = ((filename || '').match(/\.[a-z0-9]{2,5}$/i) || [])[0]?.slice(1) || ext
      filename = namaCustom
      if (extAsli && !/\.[a-z0-9]{2,5}$/i.test(filename)) filename += '.' + extAsli
    } else if (!filename) {
      filename = `file_${Date.now()}${ext ? '.' + ext : ''}`
    } else if (ext && !/\.[a-z0-9]{2,5}$/i.test(filename)) {
      // nama file ada tapi tanpa ekstensi (misal dari pesan audio), tambahkan
      filename += '.' + ext
    }
    await m.reply('⏳ Mengupload ke Telegram...')
    let form = new FormData()
    form.append('chat_id', chatId)
    form.append('document', media, filename)
    form.append('caption', `📁 ${m.sender.split('@')[0]}`)
    // stiker WA itu webp ukuran stiker; kalo dikirim polos telegram ngubahnya
    // jadi stiker beneran (respons API field sticker, bukan document) dan
    // uploadnya dianggap gagal. flag ini bikin file diterima apa adanya sbg webp
    if (mime === 'image/webp' || /\.webp$/i.test(filename)) form.append('disable_content_type_detection', 'true')
    // error axios di sini WAJIB ditangkap: kalo lolos ke handler utama,
    // objek errornya (termasuk url ber-token) bisa terkirim utuh ke chat
    let data
    try {
      ;({ data } = await axios.post(tgApi(token, 'sendDocument'), form, {
        headers: form.getHeaders(),
        timeout: 180000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }))
    } catch (e) {
      console.error('tgfile up error:', tanpaToken(e.message || e, token))
      throw '❌ Upload ke Telegram gagal. Coba lagi sebentar.'
    }
    if (!data.ok) throw 'Upload ke Telegram gagal: ' + (data.description || 'unknown')
    // telegram kadang taruh file di field audio/video/voice, bukan document
    let doc = data.result.document || data.result.audio || data.result.video || data.result.voice || data.result.video_note || data.result.animation || data.result.sticker
    if (!doc || !doc.file_id) throw 'Gagal baca info file dari Telegram'
    user.tgFiles.push({
      file_id: doc.file_id,
      msg_id: data.result.message_id,
      name: doc.file_name || filename,
      size: doc.file_size || media.length,
      time: Date.now()
    })
    return m.reply(`✅ *Tersimpan di Telegram!*\n\n📄 ${doc.file_name || filename}\n📦 ${formatSize(doc.file_size || media.length)}`)
  }

  // ---- list ----
  if (cmd === 'list' || cmd === 'ls') {
    if (!user.tgFiles.length) throw 'Kamu belum punya file di Telegram.\nUpload dulu dengan ' + usedPrefix + 'tgfile up (reply ke media)'
    let list = user.tgFiles.map((f, i) => `${i + 1}. ${f.name} (${formatSize(f.size)})`).join('\n')
    let totalSize = user.tgFiles.reduce((a, f) => a + (f.size || 0), 0)
    return m.reply(`✈️ *File kamu di Telegram:*\n\n${list}\n\n📦 Total penyimpanan: *${formatSize(totalSize)}* dari ${user.tgFiles.length} file\n\nAmbil: ${usedPrefix}tgfile get <nomor>\nHapus: ${usedPrefix}tgfile del <nomor>`)
  }

  // ---- ambil file ----
  if (cmd === 'get' || cmd === 'dl' || cmd === 'download') {
    let idx = parseInt(rest) - 1
    let f = user.tgFiles[idx]
    if (!f) throw 'Nomor tidak valid. Cek dengan ' + usedPrefix + 'tgfile list'
    await m.reply('⏳ Mengambil dari Telegram...')
    try {
    let filePath = await tgGetFile(token, f.file_id)
    let { data: buf } = await axios.get(`https://api.telegram.org/file/bot${token}/${filePath}`, {
      responseType: 'arraybuffer', timeout: 180000,
      maxContentLength: Infinity, maxBodyLength: Infinity
    })
    // kirim sesuai tipe file biar tidak jadi BIN
    let mime = mimeFromName(f.name)
    let buffer = Buffer.from(buf)
    if (/^audio\//.test(mime)) {
      await conn.sendMessage(m.chat, { audio: buffer, mimetype: mime, fileName: f.name }, { quoted: m })
    } else if (/^video\//.test(mime)) {
      await conn.sendMessage(m.chat, { video: buffer, mimetype: mime, fileName: f.name }, { quoted: m })
    } else if (/^image\//.test(mime)) {
      await conn.sendMessage(m.chat, { image: buffer, mimetype: mime, fileName: f.name }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { document: buffer, mimetype: mime, fileName: f.name }, { quoted: m })
    }
    } catch (e) {
      console.error('tgfile get error:', e.message || e)
      throw '❌ Gagal ambil file. Telegram sedang lambat, coba lagi sebentar.'
    }
    return
  }

  // ---- hapus (pakai konfirmasi kayak transfer) ----
  if (cmd === 'del' || cmd === 'delete' || cmd === 'hapus') {
    if (confirmation[m.sender]) return m.reply('Kamu sedang menunggu konfirmasi hapus!')
    if (!user.tgFiles.length) throw 'Kamu belum punya file di Telegram.'

    // hapus semua
    if (rest.toLowerCase() === 'all' || rest.toLowerCase() === 'semua') {
      let total = user.tgFiles.length
      let size = user.tgFiles.reduce((a, f) => a + (f.size || 0), 0)
      await m.reply(`⚠️ Yakin hapus *semua* file kamu di Telegram?\n\n📦 ${total} file (${formatSize(size)})\n\nKamu punya waktu *60 detik*.\nBalas _*ya*_ atau _*tidak*_`)
      confirmation[m.sender] = {
        sender: m.sender, mode: 'all', message: m,
        timeout: setTimeout(() => (m.reply('⏳ Waktu habis, penghapusan dibatalkan.'), delete confirmation[m.sender]), 60 * 1000)
      }
      return
    }

    // hapus satu
    let idx = parseInt(rest) - 1
    let f = user.tgFiles[idx]
    if (!f) throw 'Nomor tidak valid. Cek dengan ' + usedPrefix + 'tgfile list'
    await m.reply(`⚠️ Yakin hapus file ini dari Telegram?\n\n📄 ${f.name} (${formatSize(f.size)})\n\nKamu punya waktu *60 detik*.\nBalas _*ya*_ atau _*tidak*_`)
    confirmation[m.sender] = {
      sender: m.sender, mode: 'one', idx, message: m,
      timeout: setTimeout(() => (m.reply('⏳ Waktu habis, penghapusan dibatalkan.'), delete confirmation[m.sender]), 60 * 1000)
    }
    return
  }

  // ---- ubah nama (telegram gak ada api rename, jadi upload ulang) ----
  if (cmd === 'rename' || cmd === 'rn') {
    let parts = rest.split(' ')
    let idx = parseInt(parts[0]) - 1
    let newName = parts.slice(1).join(' ').trim()
    let f = user.tgFiles[idx]
    if (!f) throw 'Nomor tidak valid. Cek dengan ' + usedPrefix + 'tgfile list'
    if (!newName) throw `Contoh: ${usedPrefix}tgfile rename 2 lagu favorit.mp3`
    // pastikan ada ekstensi, kalau tidak pakai ekstensi lama
    if (!/\.[a-z0-9]{2,5}$/i.test(newName)) {
      let oldExt = (f.name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0]
      newName += oldExt
    }
    await m.reply('⏳ Mengubah nama (upload ulang ke Telegram)...')
    try {
    // 1. download file lama
    let filePath = await tgGetFile(token, f.file_id)
    let { data: buf } = await axios.get(`https://api.telegram.org/file/bot${token}/${filePath}`, {
      responseType: 'arraybuffer', timeout: 180000,
      maxContentLength: Infinity, maxBodyLength: Infinity
    })
    // 2. upload dengan nama baru
    let form = new FormData()
    form.append('chat_id', chatId)
    form.append('document', Buffer.from(buf), newName)
    form.append('caption', `📁 ${m.sender.split('@')[0]}`)
    // sama kayak upload: webp jangan sampai berubah jadi stiker di telegram
    if (/\.webp$/i.test(newName)) form.append('disable_content_type_detection', 'true')
    let { data: up } = await axios.post(tgApi(token, 'sendDocument'), form, {
      headers: form.getHeaders(), timeout: 180000,
      maxContentLength: Infinity, maxBodyLength: Infinity
    })
    if (!up.ok) throw new Error('Upload ulang gagal: ' + (up.description || 'unknown'))
    let doc = up.result.document || up.result.audio || up.result.video || up.result.voice || up.result.video_note || up.result.animation || up.result.sticker
    if (!doc || !doc.file_id) throw new Error('Gagal baca info file dari Telegram')
    // 3. hapus pesan lama (file hasil share jangan: itu pesan milik pengirim aslinya,
    // file ini sudah jadi unggahan sendiri lewat hasil upload ulang di atas)
    if (!f.shared) {
      try {
        await axios.post(tgApi(token, 'deleteMessage'), {
          chat_id: chatId, message_id: f.msg_id
        }, { timeout: 20000 })
      } catch (e) {}
    }
    // 4. update db
    let oldName = f.name
    f.file_id = doc.file_id
    f.msg_id = up.result.message_id
    f.name = doc.file_name || newName
    f.size = doc.file_size || buf.byteLength
    delete f.shared
    delete f.from
    return m.reply(`✅ Nama diubah!\n\n📄 ${oldName}\n➡️ ${f.name}`)
    } catch (e) {
      console.error('tgfile rename error:', e.message || e)
      throw '❌ Gagal mengubah nama. Telegram sedang lambat, coba lagi sebentar.'
    }
  }

  // ---- bagikan file ke user lain ----
  if (cmd === 'share' || cmd === 'bagikan') {
    let idx = parseInt(args[1]) - 1
    let f = user.tgFiles[idx]
    if (!f) throw 'Nomor tidak valid. Cek dengan ' + usedPrefix + 'tgfile list'
    // target dari mention di pesan; kalo ga ada, cari nomor yg ditulis user
    let target = (m.mentionedJid && m.mentionedJid[0]) || ''
    if (!target) {
      let nomor = (args.slice(2).join(' ').match(/\d{7,15}/) || [])[0]
      if (nomor) target = nomor + '@s.whatsapp.net'
    }
    if (!target) throw `Tag user tujuannya sekalian.\nContoh: ${usedPrefix}tgfile share 1 @user`
    if (target === m.sender) throw 'Tidak bisa membagikan file ke diri sendiri.'
    let penerima = global.db.data.users[target]
    if (!penerima || typeof penerima !== 'object') penerima = global.db.data.users[target] = {}
    if (!Array.isArray(penerima.tgFiles)) penerima.tgFiles = []
    if (penerima.tgFiles.some(x => x.file_id === f.file_id)) return m.reply('User itu sudah punya file ini di daftarnya.')
    // file fisiknya tetap satu di telegram, yg dibagikan aksesnya aja;
    // ditandai shared biar penerima ga bisa ngerusak file pemilik aslinya
    penerima.tgFiles.push({
      file_id: f.file_id,
      msg_id: f.msg_id,
      name: f.name,
      size: f.size,
      time: Date.now(),
      shared: true,
      from: m.sender
    })
    return conn.sendMessage(m.chat, {
      text: `📤 *File dibagikan!*\n\n📄 ${f.name} (${formatSize(f.size)})\nDari: @${m.sender.split('@')[0]}\nUntuk: @${target.split('@')[0]}\n\nFile-nya sudah masuk ke daftar @${target.split('@')[0]}, cek ${usedPrefix}tgfile list lalu ambil dengan ${usedPrefix}tgfile get <nomor>.`,
      mentions: [m.sender, target]
    }, { quoted: m })
  }

  throw helpText(usedPrefix)
}

// tangkap jawaban ya/tidak untuk konfirmasi hapus
handler.before = async m => {
  if (m.isBaileys) return
  if (!(m.sender in confirmation)) return
  if (!m.text) return
  let { timeout, sender, mode, idx, message } = confirmation[m.sender]
  if (m.id === message.id) return

  if (/^tidak?$/i.test(m.text.trim())) {
    clearTimeout(timeout)
    delete confirmation[sender]
    return m.reply('✅ Penghapusan dibatalkan')
  }
  if (/^ya$/i.test(m.text.trim())) {
    clearTimeout(timeout)
    delete confirmation[sender]
    let token = global.tgtoken
    let chatId = global.tgchat
    let user = global.db.data.users[sender]
    if (!Array.isArray(user.tgFiles)) user.tgFiles = []

    if (mode === 'all') {
      let total = user.tgFiles.length
      // hapus pesan telegram satu per satu (yg hasil share dilewati, bukan milik user ini)
      for (let f of user.tgFiles) {
        if (f.shared) continue
        try {
          await axios.post(tgApi(token, 'deleteMessage'), {
            chat_id: chatId, message_id: f.msg_id
          }, { timeout: 20000 })
        } catch (e) {}
      }
      user.tgFiles = []
      return m.reply(`🗑️ Semua file (${total}) dihapus dari Telegram`)
    } else {
      let f = user.tgFiles[idx]
      if (!f) return m.reply('File sudah tidak ada.')
      await doDelete(token, chatId, user, idx)
      return m.reply(`🗑️ *${f.name}* dihapus dari Telegram`)
    }
  }
}

handler.help = ['tgfile']
handler.tags = ['tools']
handler.command = /^tgfile$/i

module.exports = handler
