let handler = async (m, { conn, text, usedPrefix, command }) => {
    let redeemData = global.db.data.redeem

    if (!redeemData || Object.keys(redeemData).length === 0) {
        throw `Belum ada kode redeem di database.`
    }

    // Ambil semua kode redeem jadi array
    let codes = Object.keys(redeemData)

    // Jika user memasukkan nomor
    if (text) {
        let index = parseInt(text)

        if (isNaN(index)) {
            throw `❌ Ketik nomornya aja.\nContoh: ${usedPrefix + command} 1`
        }

        index -= 1 // karena array dimulai dari 0

        if (!codes[index]) {
            throw `❌ Nomornya gak ketemu.`
        }

        let code = codes[index]
        let data = redeemData[code]

        let listUsers = data.users.length
            ? data.users.map((v, i) => `${i + 1}. @${v.split('@')[0]}`).join('\n')
            : '- belum ada -'

        // tampilan beda tergantung tipenya
        let isMoney = data.type === 'money'
        let rewardParts = []
        if (isMoney) {
            if ((data.money || 0) > 0) rewardParts.push(`Money: Rp ${data.money.toLocaleString('id-ID')}`)
            if ((data.limit || 0) > 0) rewardParts.push(`Limit: ${data.limit.toLocaleString('id-ID')}`)
        }
        let reward = isMoney ? rewardParts.join('\n') : `Durasi: ${data.duration} hari`
        let typeName = !isMoney ? 'Premium'
            : (data.money > 0 && data.limit > 0) ? 'Money/Limit'
            : (data.money > 0 ? 'Money' : 'Limit')

        let teks = `*Detail Redeem*\n\n`
        teks += `Kode: ${code}\n`
        teks += `Tipe: ${typeName}\n`
        teks += `${reward}\n`
        teks += `Kuota: ${data.users.length}/${data.quota}\n\n`
        teks += `*Sudah diklaim oleh:*\n${listUsers}`

        return conn.reply(m.chat, teks, m, {
            contextInfo: {
                mentionedJid: data.users
            }
        })
    }

    // cuma ketik command doang -> kasih list
    let teks = `*Daftar Redeem*\n\n`

    codes.forEach((code, i) => {
        let data = redeemData[code]
        let icon = data.type === 'money' ? 'Ⓛ' : 'Ⓟ'
        teks += `${i + 1}. ${code} ${icon} (${data.users.length}/${data.quota})\n`
    })

    teks += `\nDetail: ${usedPrefix + command} 1`

    m.reply(teks)
}

handler.help = ['cekredeem']
handler.tags = ['main']
handler.command = /^(listredeem|cekredeem)$/i
handler.register = true

module.exports = handler