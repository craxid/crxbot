const axios = require('axios')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `Masukkan domain yang ingin dicek\n\nContoh: ${usedPrefix + command} crax.my.id`

    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

    try {
        const apiKey = 'ISI_API_KEY_DISINI'
        const url = `https://api.ip2whois.com/v2?key=${apiKey}&domain=${text}`
        
        const { data } = await axios.get(url)

        if (!data.domain) throw 'Data WHOIS tidak ditemukan atau domain tidak valid.'

        const formatDate = (dateStr) => dateStr ? dateStr.replace('T', ' ').replace('Z', '') : '-'

        let resultText = `┌──「 *WHOIS* 」
▢ *🌐 Domain:* ${data.domain}
▢ *🆔 ID:* ${data.domain_id || '-'}
▢ *📜 Status:* ${data.status || '-'}
▢ *⏳ Age:* ${data.domain_age} Days
▢ *🖥️ WHOIS Server:* ${data.whois_server || '-'}

*--- 🏢 REGISTRAR ---*
▢ *Name:* ${data.registrar.name || '-'}
▢ *IANA ID:* ${data.registrar.iana_id || '-'}
▢ *URL:* ${data.registrar.url || '-'}

*--- 📅 DATES ---*
▢ *Registered:* ${formatDate(data.create_date)}
▢ *Updated:* ${formatDate(data.update_date)}
▢ *Expiry:* ${formatDate(data.expire_date)}

*--- 👤 REGISTRANT ---*
▢ *Name:* ${data.registrant.name || '-'}
▢ *Org:* ${data.registrant.organization || '-'}
▢ *Country:* ${data.registrant.country || '-'} (${data.registrant.city || '-'})
▢ *Email:* ${data.registrant.email || '-'}

*--- 🛠️ TECHNICAL ---*
▢ *Name:* ${data.tech.name || '-'}
▢ *Email:* ${data.tech.email || '-'}

*--- 💳 BILLING ---*
▢ *Name:* ${data.billing.name || '-'}
▢ *Email:* ${data.billing.email || '-'}

*--- 🌐 NAME SERVERS ---*
${data.nameservers && data.nameservers.length > 0 
    ? data.nameservers.map(ns => `▢ ${ns}`).join('\n') 
    : '▢ (Not Found)'}
└────────────`

        await conn.reply(m.chat, resultText, m)
        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
        console.error(e)
        let msg = e.response && e.response.data ? e.response.data.error?.error_message : e.message
        m.reply(`Terjadi kesalahan: ${msg || e}`)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    }
}

handler.help = ['whois']
handler.tags = ['tools']
handler.command = /^(whois|whoislookup)$/i

module.exports = handler