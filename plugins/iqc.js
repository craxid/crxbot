let axios = require('axios')
let moment = require('moment-timezone')

let handler = async (m, { conn, text, args }) => {
    try {
        // Cek input teks
        let qText = text ? text : (m.quoted && m.quoted.text ? m.quoted.text : null)
        if (!qText) throw 'Masukkan teks atau balas pesan yang ingin dijadikan IQC!'
        if (qText.length > 50) return m.reply('Maksimal 50 Karakter!')

        // Ambil waktu saat ini
        let time = moment().tz('Asia/Jakarta').format('HH:mm')

        await conn.sendPresenceUpdate('composing', m.chat)

        // URL API
        let api = `https://api.deline.web.id/maker/iqc?text=${encodeURIComponent(qText)}&chatTime=${time}&statusBarTime=${time}`

        // Mengambil data gambar
        let { data } = await axios.get(api, {
            responseType: 'arraybuffer'
        })

        // Kirim langsung sebagai gambar (png)
        await conn.sendFile(m.chat, data, 'iqc.png', 'Nih IQC-nya!', m)

    } catch (e) {
        console.error(e)
        throw `Ups, ada yang error nih:\n${e.message}`
    }
}

handler.help = ['iqc']
handler.tags = ['maker']
handler.command = /^(iqc)$/i
handler.limit = true
handler.register = true

module.exports = handler