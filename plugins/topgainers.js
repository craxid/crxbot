const axios = require('axios')

let handler = async (m, { conn, usedPrefix, command }) => {
    // Deteksi jenis command untuk menentukan setingan visual dan endpoint
    const isGainers = /gain/i.test(command)
    
    const config = {
        url: isGainers ? 'https://stockanaly.vercel.app/api/gainers' : 'https://stockanaly.vercel.app/api/losers',
        title: isGainers ? 'TOP STOCK GAINERS' : 'TOP STOCK LOSERS',
        loadingEmoji: isGainers ? '🟢' : '🔴',
        changeEmoji: isGainers ? '🔺' : '🔻',
        sign: isGainers ? '+' : ''
    }

    // Reaksi loading sesuai jenis command
    await conn.sendMessage(m.chat, {
        react: { text: config.loadingEmoji, key: m.key }
    })

    try {
        const { data: res } = await axios.get(config.url)

        if (!res.success || !res.data || res.data.length === 0) {
            throw `Gagal mengambil data atau daftar ${isGainers ? 'gainers' : 'losers'} sedang kosong.`
        }

        // Ambil 10 saham teratas agar chat tidak kepanjangan
        const topStocks = res.data.slice(0, 10)

        let resultText = `┌──「 *${config.title}* 」\n`
        resultText += `▢ *Timeframe:* ${res.timeframe.toUpperCase()}\n`
        resultText += `▢ *Total Tracked:* ${res.total}\n`
        resultText += `└───────────────────\n\n`

        topStocks.forEach((stock) => {
            // Format Market Cap agar ringkas (Billion / Million)
            let formattedMarketCap = ''
            if (stock.marketCap >= 1e12) {
                formattedMarketCap = `${(stock.marketCap / 1e12).toFixed(2)} T`
            } else if (stock.marketCap >= 1e9) {
                formattedMarketCap = `${(stock.marketCap / 1e9).toFixed(2)} B`
            } else if (stock.marketCap >= 1e6) {
                formattedMarketCap = `${(stock.marketCap / 1e6).toFixed(2)} M`
            } else {
                formattedMarketCap = stock.marketCap.toLocaleString('id-ID')
            }

            // Format tampilan harga agar fleksibel untuk saham di bawah $1
            const formattedPrice = stock.price < 1 ? stock.price : stock.price.toLocaleString('id-ID')

            resultText += `*${stock.rank}. ${stock.symbol}* - ${stock.name}\n`
            resultText += `↳ ${config.changeEmoji} *Change:* ${config.sign}${stock.changePercent}%\n`
            resultText += `↳ 💵 *Price:* $${formattedPrice}\n`
            resultText += `↳ 💰 *Market Cap:* $${formattedMarketCap}\n`
            resultText += `↳ 🔄 *Volume:* ${stock.volume.toLocaleString('id-ID')}\n`
            resultText += `↳ 🔗 *Info:* ${stock.url}\n\n`
        })

        resultText += `_Gunakan *${usedPrefix}stocknews <symbol>* untuk melihat berita emiten._`

        // Kirim hasil teks ke WhatsApp
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

        m.reply(`Terjadi kesalahan saat mengambil data: ${msg || e}`)

        await conn.sendMessage(m.chat, {
            react: { text: '❌', key: m.key }
        })
    }
}

handler.help = ['gainers', 'losers']
handler.tags = ['tools', 'internet']
handler.command = /^(gainers|gainer|topgainer|losers|loser|toploser)$/i
handler.register = true
handler.group = true
handler.limit = true

module.exports = handler