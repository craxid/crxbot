const fs = require('fs')
const path = require('path')

let handler = async (m, { conn, text, usedPrefix, command, isOwner }) => {
    // Keamanan ekstra: Pastikan hanya owner yang bisa pakai
    if (!isOwner) throw 'Maaf, fitur ini khusus Owner bot!'

    if (!text) throw `*Format salah!*\n\nContoh penggunaan:\n${usedPrefix}${command} handler.js\n${usedPrefix}${command} plugins/rpg-lamarkerja.js`

    let filePath = path.resolve(text.trim())

    // Mengecek apakah file ada di server
    if (!fs.existsSync(filePath)) {
        throw `File *${text}* tidak ditemukan di direktori bot.`
    }

    // Mengecek apakah yang diminta adalah folder (bukan file)
    let stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
        throw `Itu adalah folder, bukan file! Harap masukkan path file yang spesifik.`
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    try {
        let fileBuffer = fs.readFileSync(filePath)
        let fileName = path.basename(filePath)

        await conn.sendMessage(m.chat, {
            document: fileBuffer,
            fileName: fileName,
            mimetype: 'application/octet-stream', // Format dokumen universal
            caption: `乂 *G E T  F I L E*\n\n📄 *Nama File:* ${fileName}\n📁 *Path:* ${text}`
        }, { quoted: m })
        
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (e) {
        console.error(e)
        throw `Gagal mengambil file!\n\n*Log Error:* ${e.message}`
    }
}

handler.help = ['getfile <path>']
handler.tags = ['owner']
handler.command = /^(getfile|gf|ambilfile)$/i

handler.rowner = true // Mengunci command ini KHUSUS untuk Real Owner

module.exports = handler