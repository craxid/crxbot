const axios = require('axios')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // Memberikan reaksi loading saat memproses
    await conn.sendMessage(m.chat, {
        react: { text: '📰', key: m.key }
    })

    // Cek apakah user menginput simbol saham (argumen teks)
    const hasSymbol = !!text
    const symbol = hasSymbol ? text.trim().toUpperCase() : ''

    // Tentukan URL API secara dinamis berdasarkan input user
    const url = hasSymbol 
        ? `https://stockanaly.vercel.app/api/news/${symbol}`
        : 'https://stockanaly.vercel.app/api/news'

    try {
        const { data: res } = await axios.get(url)

        if (!res.success || !res.data || res.data.length === 0) {
            throw `Gagal mengambil data berita ${hasSymbol ? `untuk saham *${symbol}*` : 'pasar umum'}.`
        }

        // Membatasi berita yang ditampilkan (Ambil 5 berita teratas agar tidak spamming)
        const topNews = res.data.slice(0, 5)

        // Set judul header dinamis sesuai jenis berita yang ditarik
        let resultText = hasSymbol 
            ? `┌──「 *STOCK NEWS: ${res.symbol}* 」\n▢ *Company:* ${res.name}\n`
            : `┌──「 *STOCK MARKET NEWS* 」\n`
            
        resultText += `▢ *Total Berita:* ${res.total}\n`
        resultText += `└───────────────────\n\n`

        topNews.forEach((news, index) => {
            resultText += `*${index + 1}. ${news.title}*\n`
            resultText += `↳ 🏛️ *Source:* ${news.source} (${news.type})\n`
            resultText += `↳ 🕒 *Time:* ${news.relativeTime}\n`
            resultText += `↳ 📝 *Summary:* ${news.summary.trim()}\n`
            resultText += `↳ 🔗 *Link:* ${news.url}\n`
            
            if (index < topNews.length - 1) {
                resultText += `\n───────────────\n\n`
            }
        })

        if (!hasSymbol) {
            resultText += `\n\n_Tips: Gunakan *${usedPrefix + command} <symbol>* untuk mencari berita emiten spesifik (Contoh: ${usedPrefix + command} AAPL)_`
        }

        // Mengirimkan response ke chat
        await conn.reply(m.chat, resultText.trim(), m)

        // Reaksi sukses
        await conn.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        })

    } catch (e) {
        console.error(e)
        
        let msg = e.response && e.response.data
            ? e.response.data.message || e.response.data.error
            : e.message

        m.reply(hasSymbol 
            ? `Simbol saham *${symbol}* tidak valid atau terjadi kesalahan: ${msg || e}`
            : `Terjadi kesalahan saat mengambil berita: ${msg || e}`
        )

        await conn.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        })
    }
}

handler.help = ['stocknews', 'stocknews <symbol>']
handler.tags = ['tools', 'internet']
handler.command = /^(stocknews|snews|marketnews)$/i
handler.register = true
handler.group = true
handler.limit = true

module.exports = handler