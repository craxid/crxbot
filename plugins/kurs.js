const axios = require('axios')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        throw `Masukkan kode mata uang\n\nContoh:\n${usedPrefix + command} JPY`
    }

    await conn.sendMessage(m.chat, {
        react: { text: '💱', key: m.key }
    })

    try {
        const url = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${global.kurs}`

        const { data } = await axios.get(url)

        const currency = text.trim().toUpperCase()
        const rateRaw = data.rates[currency]

        if (!rateRaw) {
            throw `Mata uang *${currency}* tidak ditemukan.`
        }

        // --- 1. FORMAT NOMINAL/RATE SESUAI SIMBOL MATA UANG ---
        let formattedRate;
        try {
            // Menggunakan Intl.NumberFormat agar simbol ($, ¥, €, Rp, dll) muncul otomatis
            formattedRate = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }).format(parseFloat(rateRaw))
        } catch (err) {
            // Fallback kalau kode mata uang agak asing/tidak terdaftar di Intl
            formattedRate = `${currency} ${parseFloat(rateRaw).toLocaleString('id-ID')}`
        }

        // --- 2. FORMAT TANGGAL (YYYY-MM-DD ... -> DD-MM-YYYY) ---
        const datePart = data.date.substring(0, 10) 
        const [year, month, day] = datePart.split('-')
        const formattedDate = `${day}-${month}-${year}`

        let resultText = `
┌──「 *KURS MATA UANG* 」
▢ *Base:* ${data.base}
▢ *Currency:* ${currency}
▢ *Rate:* ${formattedRate}
▢ *Date:* ${formattedDate}
└────────────`

        await conn.reply(m.chat, resultText, m)

        await conn.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        })

    } catch (e) {
        console.error(e)

        let msg = e.response && e.response.data
            ? e.response.data.message || e.response.data.error
            : e.message

        m.reply(`Terjadi kesalahan: ${msg || e}`)

        await conn.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        })
    }
}

handler.help = ['kurs']
handler.tags = ['tools']
handler.command = /^(kurs|rate)$/i
handler.register = true;
handler.group = true;

module.exports = handler