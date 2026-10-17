const axios = require('axios')

let handler = async (m, { conn, usedPrefix, command }) => {
    // Reaksi loading saat memproses data
    await conn.sendMessage(m.chat, {
        react: { text: '📈', key: m.key }
    })

    try {
        const url = 'https://stockanaly.vercel.app/api/trending'
        const { data: res } = await axios.get(url)

        if (!res.success || !res.data || res.data.length === 0) {
            throw 'Gagal mengambil data atau daftar trending sedang kosong.'
        }

        // Ambil 10 saham teratas agar chat tidak terlalu panjang
        const topTrending = res.data.slice(0, 10)

        let resultText = `┌──「 *TOP TRENDING STOCKS* 」\n`
        resultText += `▢ *Category:* ${res.category}\n`
        resultText += `▢ *Total Tracked:* ${res.total}\n`
        resultText += `└───────────────────\n\n`

        topTrending.forEach((stock) => {
            // Logika penanda arah pergerakan harga (naik/turun)
            const isPositive = stock.changePercent >= 0
            const emojiChange = isPositive ? '🔺' : '🔻'
            const sign = isPositive ? '+' : ''

            // Format Market Cap agar ringkas (Billion / Trillion)
            let formattedMarketCap = ''
            if (stock.marketCap >= 1e12) {
                formattedMarketCap = `${(stock.marketCap / 1e12).toFixed(2)} T`
            } else if (stock.marketCap >= 1e9) {
                formattedMarketCap = `${(stock.marketCap / 1e9).toFixed(2)} B`
            } else {
                formattedMarketCap = stock.marketCap.toLocaleString('id-ID')
            }

            resultText += `*${stock.rank}. ${stock.symbol}* - ${stock.name}\n`
            resultText += `↳ 📊 *Change:* ${emojiChange} ${sign}${stock.changePercent}%\n`
            resultText += `↳ 👁️ *Views Today:* ${stock.views.toLocaleString('id-ID')}\n`
            resultText += `↳ 💰 *Market Cap:* $${formattedMarketCap}\n`
            resultText += `↳ 🔄 *Volume:* ${stock.volume.toLocaleString('id-ID')}\n`
            resultText += `↳ 🔗 *Info:* ${stock.url}\n\n`
        })

        resultText += `_Gunakan *${usedPrefix}stocknews <symbol>* untuk melihat berita spesifik emiten._`

        // Kirim hasil text ke chat
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

        m.reply(`Terjadi kesalahan saat mengambil data trending: ${msg || e}`)

        await conn.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        })
    }
}

handler.help = ['trending', 'topstocks']
handler.tags = ['tools', 'internet']
handler.command = /^(trending|topstock|topstocks)$/i
handler.register = true
handler.group = true
handler.limit = true;

module.exports = handler