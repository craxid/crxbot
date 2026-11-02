const fs = require('fs')
const path = require('path')
const os = require('os')
const { execFile } = require('child_process')

// mesinnya pake pdf2docx di venv terpisah, biar ga ganggu node_modules bot
const PY = path.join(os.homedir(), 'pdf2word-venv', 'bin', 'python')
const SCRIPT = path.join(__dirname, '..', 'lib', 'pdf2word.py')
const MAX_MB = 20

function jalaninPython(input, output) {
    return new Promise((resolve, reject) => {
        execFile(PY, [SCRIPT, input, output], { timeout: 180 * 1000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) return reject(new Error((stderr || err.message || 'konversi gagal').toString().trim().split('\n').slice(-3).join('\n')))
            resolve(stdout)
        })
    })
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    let q = m.quoted ? m.quoted : m
    let mime = q.mimetype || (q.msg && q.msg.mimetype) || ''
    let namaAsli = q.fileName || (q.msg && q.msg.fileName) || ''
    let isPdf = /pdf/i.test(mime) || /\.pdf$/i.test(namaAsli)

    if (!isPdf) throw `Reply dokumen *PDF* dengan perintah ini, atau kirim PDF-nya langsung pake caption *${usedPrefix}${command}*\n\nContoh: reply file PDF lalu ketik *${usedPrefix}${command}*`

    if (!fs.existsSync(PY) || !fs.existsSync(SCRIPT)) throw 'Mesin konversi PDF ke Word belum siap di server, lapor owner ya.'

    let buffer
    try {
        buffer = await q.download()
    } catch (e) {
        throw 'Gagal ngunduh file PDF-nya, coba kirim ulang filenya.'
    }
    if (!buffer || !buffer.length) throw 'File PDF-nya kosong / gagal terbaca.'
    if (buffer.length > MAX_MB * 1024 * 1024) throw `PDF-nya kegedean, maksimal ${MAX_MB} MB ya.`

    // nama output: dari argumen kalo ada, kalo ga dari nama file aslinya
    let bersih = (s) => s.replace(/\.pdf$/i, '').replace(/\.docx$/i, '').replace(/[\\/:*?"<>|]/g, '').trim()
    let namaOut = bersih(text || '') || bersih(namaAsli) || 'dokumen'
    let fileName = namaOut + '.docx'

    if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })
    let unik = Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
    let inPath = path.join('./tmp', `pdf2word-${unik}.pdf`)
    let outPath = path.join('./tmp', `pdf2word-${unik}.docx`)

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })
    try {
        fs.writeFileSync(inPath, buffer)
        await jalaninPython(inPath, outPath)
        if (!fs.existsSync(outPath) || !fs.statSync(outPath).size) throw new Error('Hasil konversi kosong')

        let hasil = fs.readFileSync(outPath)
        await conn.sendMessage(m.chat, {
            document: hasil,
            fileName,
            mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            caption: `✅ *PDF → Word beres*\n\n📄 *File:* ${fileName}\n📦 *Ukuran:* ${(hasil.length / 1024).toFixed(1)} KB\n\n_Catatan: PDF hasil scan (gambar) teksnya tidak ikut terkonversi, karena isinya memang bukan teks._`
        }, { quoted: m })
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (e) {
        console.error('pdf2word:', e)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {})
        throw `Gagal mengubah PDF ke Word.\n\n*Penyebab:* ${e.message}`
    } finally {
        try { fs.unlinkSync(inPath) } catch {}
        try { fs.unlinkSync(outPath) } catch {}
    }
}

handler.help = ['pdf2word']
handler.tags = ['tools']
handler.command = /^(pdf2(word|docx|doc))$/i
handler.limit = true

module.exports = handler
