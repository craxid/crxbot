const crypto = require('crypto')

// Nilai reward referal
const XP_PERTAMA = 5000 // uang untuk pengguna yang memakai kode referal
const LIMIT_PERTAMA = 10 // limit untuk pengguna yang memakai kode referal
const XP_PEMILIK = 30000 // untuk pemilik kode, setiap ada yang memakai
const XP_BONUS = { // bonus tambahan saat jumlah pemakai mencapai angka berikut
    5: 40000,
    10: 100000,
    20: 250000,
    50: 1000000,
    100: 10000000,
}
const PREMIUM_MILESTONE = { // milestone yang juga memberi premium, nilainya jumlah hari
    50: 7,
    100: 30,
}

const rupiah = n => 'Rp' + n.toLocaleString('id-ID')
const bikinKode = () => Array.from({ length: 11 }, () => '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[crypto.randomInt(62)]).join('')

let handler = async (m, { conn, usedPrefix, text }) => {
    let users = global.db.data.users
    let user = users[m.sender]

    // Jika ada argumen, berarti pengguna sedang mengklaim kode milik orang lain
    if (text) {
        if ('ref_count' in user) throw '❌ Kamu sudah pernah menggunakan kode referal dan tidak dapat menggunakannya lagi.'

        let pemilik = Object.keys(users).find(jid => users[jid].ref_code === text.trim())
        if (!pemilik) throw '❌ Kode referal tidak valid. Periksa kembali kode yang kamu masukkan.'

        let total = ++users[pemilik].ref_count
        let bonus = XP_BONUS[total] || 0
        users[pemilik].money += XP_PEMILIK + bonus
        user.money += XP_PERTAMA
        user.limit += LIMIT_PERTAMA
        user.ref_count = 0

        // milestone tertentu (50 & 100) juga kasih premium, numpuk dari sisa yg masih aktif
        let hariPremium = PREMIUM_MILESTONE[total] || 0
        let sampaiPremium = null
        if (hariPremium) {
            let data = users[pemilik]
            let dari = (data.premium && data.premiumTime > Date.now()) ? data.premiumTime : Date.now()
            data.premium = true
            data.premiumTime = dari + hariPremium * 24 * 60 * 60 * 1000
            sampaiPremium = new Date(data.premiumTime).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')
        }

        await m.reply(`✅ *Kode referal berhasil digunakan.*
🎁 Bonus untuk kamu: ${rupiah(XP_PERTAMA)} + ${LIMIT_PERTAMA} Limit`)

        let kabar = `🎉 *Kode referal kamu digunakan oleh pengguna lain.*
💰 Bonus yang kamu terima: ${rupiah(XP_PEMILIK + bonus)}`
        if (bonus) kabar += `\n🏆 Bonus milestone: ${rupiah(bonus)} (total pemakai kode kamu saat ini ${total} orang).`
        if (hariPremium) kabar += `\n✨ Kamu juga mendapatkan Premium ${hariPremium} hari, aktif sampai ${sampaiPremium} WIB.`
        await m.reply(kabar, pemilik)
        return
    }

    // Tanpa argumen, tampilkan kode referal milik pengguna sendiri
    user.ref_code = user.ref_code || bikinKode()
    user.ref_count = user.ref_count ? user.ref_count : 0

    let kode = user.ref_code
    let linkKlaim = `wa.me/${conn.user.jid.split('@')[0]}?text=${encodeURIComponent(`${usedPrefix}ref ${kode}`)}`
    let teksBagikan = `🎁 Gunakan kode referal saya dan dapatkan ${rupiah(XP_PERTAMA)} + ${LIMIT_PERTAMA} Limit.

🔑 Kode referal: *${kode}*
${linkKlaim}`
    let linkBagikan = `wa.me/?text=${encodeURIComponent(teksBagikan)}`
    let daftarBonus = Object.entries(XP_BONUS).map(([n, xp]) => `• ${n} orang: ${rupiah(xp)}${PREMIUM_MILESTONE[n] ? ` + Premium ${PREMIUM_MILESTONE[n]} hari` : ''}`).join('\n')

    await m.reply(`🎁 *Kode Referal Kamu*

🔑 Kode: \`${kode}\`
👥 Telah digunakan oleh: ${user.ref_count} orang
💰 Reward: ${rupiah(XP_PEMILIK)} untuk setiap pengguna yang memakai kode kamu, dan pengguna kode memperoleh ${rupiah(XP_PERTAMA)} + ${LIMIT_PERTAMA} Limit.

🔗 *Tautan klaim langsung:*
${linkKlaim}

📤 *Tautan untuk membagikan kepada teman:*
${linkBagikan}

🏆 *Bonus Milestone:*
${daftarBonus}`)
}

handler.help = ['ref', 'referal']
handler.tags = ['main']
handler.command = ['ref', 'referal']
handler.register = true

module.exports = handler
