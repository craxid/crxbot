const axios = require('axios')
const FormData = require('form-data')

const API = 'https://api.gofile.io'
const MAX_SIZE = 100 * 1024 * 1024 // 100MB, biar vps gak keberatan

// pending konfirmasi hapus, pola sama kayak plugin transfer
let confirmation = {}

// ambil server upload paling bagus
async function getServer() {
  let { data } = await axios.get(`${API}/servers`, { timeout: 15000 })
  if (data.status !== 'ok') throw 'Gagal dapat server Gofile'
  return data.data.servers[0].name
}

// root folder akun, buat indukan folder tiap user
// gofile pakai 2 langkah: getid dulu baru info akun
async function getRoot(token) {
  let auth = { Authorization: `Bearer ${token}` }
  let { data: d1 } = await axios.get(`${API}/accounts/getid`, { headers: auth, timeout: 15000 })
  if (d1.status !== 'ok' || !d1.data.id) throw 'Token Gofile tidak valid'
  let { data: d2 } = await axios.get(`${API}/accounts/${d1.data.id}`, { headers: auth, timeout: 15000 })
  if (d2.status !== 'ok' || !d2.data.rootFolder) throw 'Gagal baca info akun Gofile'
  return d2.data.rootFolder
}

// pastikan user punya folder sendiri sesuai nomor hp
// folder diset public biar file bisa diakses lewat link
async function ensureFolder(m, user, token) {
  let folderId = user.gofileFolder
  if (!folderId) {
    let root = await getRoot(token)
    let phone = m.sender.split('@')[0]
    let { data } = await axios.post(`${API}/contents/createFolder`, {
      parentFolderId: root,
      folderName: phone
    }, { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 })
    if (data.status !== 'ok') throw 'Gagal buat folder di Gofile'
    folderId = data.data.id
    user.gofileFolder = folderId
  }
  // pastikan folder public (idempoten, aman dipanggil berulang)
  // atribut public hanya berlaku untuk folder, bukan file
  try {
    await axios.put(`${API}/contents/${folderId}/update`, {
      attribute: 'public',
      attributeValue: 'true'
    }, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 })
  } catch (e) {
    console.error('gofile set public gagal:', e.message)
  }
  return folderId
}

async function uploadFile(buffer, filename, folderId, token) {
  let server = await getServer()
  let form = new FormData()
  form.append('file', buffer, filename)
  form.append('token', token)
  form.append('folderId', folderId)
  let { data } = await axios.post(`https://${server}.gofile.io/contents/uploadfile`, form, {
    headers: form.getHeaders(),
    timeout: 180000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  })
  if (data.status !== 'ok') throw 'Upload ke Gofile gagal'
  return data.data
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  let u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < u.length - 1) { bytes /= 1024; i++ }
  return bytes.toFixed(2) + ' ' + u[i]
}

// hapus satu file dari gofile + db, dipakai setelah konfirmasi
async function doDelete(token, user, idx) {
  let f = user.gofileFiles[idx]
  try {
    await axios.delete(`${API}/contents`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { contentsId: f.id },
      timeout: 20000
    })
  } catch (e) {
    // file mungkin sudah tidak ada di gofile, tetap hapus dari db
  }
  user.gofileFiles.splice(idx, 1)
  return f
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

function helpText(prefix) {
  return `📁 *GOFILE* 📁

*User:*
${prefix}gofile up — upload (reply ke foto/video/audio/dokumen)
${prefix}gofile list — lihat file kamu
${prefix}gofile get <nomor> — ambil link download
${prefix}gofile del <nomor> — hapus file kamu
${prefix}gofile del all — hapus semua file kamu

*Owner:*
${prefix}gofile mkdir <nama> — buat folder baru
${prefix}gofile users — lihat pengguna gofile`
}

let handler = async (m, { conn, args, usedPrefix, isOwner, isROwner }) => {
  let token = global.gofile
  if (!token) throw 'Token Gofile belum dipasang.\nOwner: daftar di gofile.io, ambil token di profil, isi global.gofile di config.js'

  let user = global.db.data.users[m.sender]
  if (!Array.isArray(user.gofileFiles)) user.gofileFiles = []
  let isOw = isOwner || isROwner

  let cmd = (args[0] || '').toLowerCase()
  let rest = args.slice(1).join(' ').trim()

  if (!cmd) throw helpText(usedPrefix)

  // ---- upload ----
  if (cmd === 'up' || cmd === 'upload') {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    if (!mime) throw 'Reply ke foto/video/audio/dokumen yang mau diupload'
    let media = await q.download()
    if (!media) throw 'Gagal download media'
    if (media.length > MAX_SIZE) throw 'Ukuran file maksimal 100MB'
    let filename = q.fileName || (q.msg || q).fileName
    if (!filename) {
      let ext = extFromMime(mime)
      filename = `file_${Date.now()}${ext ? '.' + ext : ''}`
    }
    await m.reply('⏳ Mengupload ke Gofile...')
    let folderId = await ensureFolder(m, user, token)
    let res = await uploadFile(media, filename, folderId, token)
    user.gofileFiles.push({
      id: res.id,
      name: res.name,
      size: res.size,
      page: res.downloadPage,
      time: Date.now()
    })
    return m.reply(`✅ *Berhasil diupload!*\n\n📄 ${res.name}\n📦 ${formatSize(res.size)}\n🔗 ${res.downloadPage}`)
  }

  // ---- list file sendiri ----
  if (cmd === 'list' || cmd === 'ls') {
    if (!user.gofileFiles.length) throw 'Kamu belum punya file di Gofile.\nUpload dulu dengan ' + usedPrefix + 'gofile up (reply ke media)'
    let list = user.gofileFiles.map((f, i) => `${i + 1}. ${f.name} (${formatSize(f.size)})`).join('\n')
    return m.reply(`📁 *File kamu di Gofile:*\n\n${list}\n\nAmbil link: ${usedPrefix}gofile get <nomor>\nHapus: ${usedPrefix}gofile del <nomor>`)
  }

  // ---- ambil link download ----
  if (cmd === 'get' || cmd === 'dl' || cmd === 'download') {
    let idx = parseInt(rest) - 1
    let f = user.gofileFiles[idx]
    if (!f) throw 'Nomor tidak valid. Cek dengan ' + usedPrefix + 'gofile list'
    return m.reply(`📄 *${f.name}*\n📦 ${formatSize(f.size)}\n🔗 ${f.page}`)
  }

  // ---- hapus file sendiri (pakai konfirmasi kayak transfer) ----
  if (cmd === 'del' || cmd === 'delete' || cmd === 'hapus') {
    if (confirmation[m.sender]) return m.reply('Kamu sedang menunggu konfirmasi hapus!')
    if (!user.gofileFiles.length) throw 'Kamu belum punya file di Gofile.'

    // hapus semua
    if (rest.toLowerCase() === 'all' || rest.toLowerCase() === 'semua') {
      let total = user.gofileFiles.length
      let size = user.gofileFiles.reduce((a, f) => a + (f.size || 0), 0)
      await m.reply(`⚠️ Yakin hapus *semua* file kamu di Gofile?\n\n📦 ${total} file (${formatSize(size)})\n\nKamu punya waktu *60 detik*.\nBalas _*ya*_ atau _*tidak*_`)
      confirmation[m.sender] = {
        sender: m.sender, mode: 'all', message: m,
        timeout: setTimeout(() => (m.reply('⏳ Waktu habis, penghapusan dibatalkan.'), delete confirmation[m.sender]), 60 * 1000)
      }
      return
    }

    // hapus satu
    let idx = parseInt(rest) - 1
    let f = user.gofileFiles[idx]
    if (!f) throw 'Nomor tidak valid. Cek dengan ' + usedPrefix + 'gofile list'
    await m.reply(`⚠️ Yakin hapus file ini dari Gofile?\n\n📄 ${f.name} (${formatSize(f.size)})\n\nKamu punya waktu *60 detik*.\nBalas _*ya*_ atau _*tidak*_`)
    confirmation[m.sender] = {
      sender: m.sender, mode: 'one', idx, message: m,
      timeout: setTimeout(() => (m.reply('⏳ Waktu habis, penghapusan dibatalkan.'), delete confirmation[m.sender]), 60 * 1000)
    }
    return
  }

  // ---- owner: buat folder ----
  if (cmd === 'mkdir') {
    if (!isOw) throw 'Fitur ini khusus owner'
    if (!rest) throw 'Kasih nama foldernya.\nContoh: ' + usedPrefix + 'gofile mkdir dokumen'
    let root = await getRoot(token)
    let { data } = await axios.post(`${API}/contents/createFolder`, {
      parentFolderId: root,
      folderName: rest
    }, { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 })
    if (data.status !== 'ok') throw 'Gagal buat folder'
    return m.reply(`📁 Folder *${rest}* dibuat di Gofile`)
  }

  // ---- owner: daftar pengguna ----
  if (cmd === 'users') {
    if (!isOw) throw 'Fitur ini khusus owner'
    let all = Object.entries(global.db.data.users).filter(([_, u]) => u.gofileFolder)
    if (!all.length) throw 'Belum ada user yang pakai Gofile'
    let list = all.map(([jid, u], i) => `${i + 1}. ${jid.split('@')[0]} — ${u.gofileFiles?.length || 0} file`).join('\n')
    return m.reply(`👥 *Pengguna Gofile:*\n\n${list}`)
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
    let token = global.gofile
    let user = global.db.data.users[sender]
    if (!Array.isArray(user.gofileFiles)) user.gofileFiles = []

    if (mode === 'all') {
      let total = user.gofileFiles.length
      let ids = user.gofileFiles.map(f => f.id).filter(Boolean).join(',')
      if (ids) {
        try {
          await axios.delete(`${API}/contents`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { contentsId: ids },
            timeout: 30000
          })
        } catch (e) {}
      }
      user.gofileFiles = []
      return m.reply(`🗑️ Semua file (${total}) dihapus dari Gofile`)
    } else {
      let f = user.gofileFiles[idx]
      if (!f) return m.reply('File sudah tidak ada.')
      await doDelete(token, user, idx)
      return m.reply(`🗑️ *${f.name}* dihapus dari Gofile`)
    }
  }
}

handler.help = ['gofile']
handler.tags = ['tools']
handler.command = /^gofile$/i

module.exports = handler
