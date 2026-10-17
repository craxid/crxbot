let fetch = require('node-fetch')

let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) throw `*Example:* ${usedPrefix + command} mrbeast`   
    
    // Membersihkan input (menghapus spasi ekstra dan karakter @ jika user mengetik @mrbeast)
    let username = text.replace(/@/g, '').trim()
    
    try {     
        // Fetch menggunakan metode POST ke API siputzx dengan tambahan User-Agent
        let res = await fetch(`https://api.siputzx.my.id/api/stalk/tiktok`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: JSON.stringify({ username: username })
        })
        
        let json = await res.json()
        
        // Memunculkan pesan asli dari API jika status false, agar ketahuan masalah pastinya
        if (!json.status) {
            throw `API Error: ${json.message || JSON.stringify(json)}`
        }

        // Cek apakah data user benar-benar ada
        if (!json.data || !json.data.user) {
            throw 'Data user kosong atau struktur API berubah.'
        }

        let user = json.data.user
        // Menambahkan Fallback untuk stats jika sewaktu-waktu nama json-nya berubah
        let stats = json.data.stats || json.data.statsV2 || {}

        // Konversi Unix Timestamp (Fallback aman jika waktu kosong)
        let createDate = 'Unknown'
        if (user.createTime) {
            createDate = new Date(user.createTime * 1000).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) + ' WIB'
        }

        let caption = `⦿  *T I K T O K - P R O F I L E*\n\n`
        caption += `	◦  *ID* : ${user.id || '-'}\n`
        caption += `	◦  *Username* : ${user.uniqueId || username}\n`
        caption += `	◦  *Nickname* : ${user.nickname || '-'}\n`
        caption += `	◦  *Description* : ${user.signature ? user.signature.replace(/\n/g, ' | ') : '-'}\n`
        caption += `	◦  *Language* : ${user.language ? user.language.toUpperCase() : 'UNKNOWN'}\n`
        caption += `	◦  *Created At* : ${createDate}\n`
        caption += `	◦  *Verified* : ${user.verified ? 'Yes ✅' : 'No ❌'}\n`
        caption += `	◦  *Private Account* : ${user.privateAccount ? 'Yes ✅' : 'No ❌'}\n`
        caption += `	◦  *TikTok Seller* : ${user.ttSeller ? 'Yes ✅' : 'No ❌'}\n`
        caption += `	◦  *Commerce User* : ${user.commerceUserInfo?.commerceUser ? 'Yes ✅' : 'No ❌'}\n\n`
        
        caption += `⦿  *S T A T I S T I C S*\n\n`
        caption += `	◦  *Followers* : ${stats.followerCount || 0}\n`
        caption += `	◦  *Following* : ${stats.followingCount || 0}\n`
        caption += `	◦  *Mutual/Friends* : ${stats.friendCount || 0}\n`
        caption += `	◦  *Total Likes* : ${stats.heartCount || stats.heart || 0}\n`
        caption += `	◦  *Total Video* : ${stats.videoCount || 0}\n`
        caption += `	◦  *Digg Count* : ${stats.diggCount || 0}\n\n`
        
        caption += `⦿  *A D V A N C E D  I N F O*\n\n`
        caption += `	◦  *Sec UID* : ${user.secUid || '-'}\n`
        
        // --- FAKE CONTACT ---
        let name = m.pushName || conn.getName?.(m.sender) || 'User'
        let level = global.db?.data?.users[m.sender]?.level || 0 
        
        var fkonn = { 
            key: { 
                fromMe: false, 
                participant: `0@s.whatsapp.net`, 
                ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) 
            }, 
            message: { 
                contactMessage: { 
                    displayName: `${name} | lvl: ${level}`, 
                    vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
                }
            }
        }
        
        // --- PENGIRIMAN SEBAGAI GAMBAR ---
        // Fallback jika API gagal memberi link avatar
        let avatar = user.avatarLarger || user.avatarMedium || user.avatarThumb || 'https://i.ibb.co/C1XNqnM/default-avatar.png'
        
        conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        conn.sendPresenceUpdate('recording', m.chat)
        
        setTimeout(() => {
            conn.sendMessage(m.chat, {
                image: { url: avatar }, 
                caption: caption,
                contextInfo: {
                    expiration: 864000,
                    forwardingScore: 9999,
                    isForwarded: true,
                    mentionedJid: [m.sender],
                }
            }, { quoted: fkonn })
        }, 1000) // Waktu tunggu disingkat jadi 1 detik agar tidak terlalu lama
  
    } catch (e) {     
        // Melempar error spesifik
        throw `Error: ${e.message || e}` 
    }
}
handler.help = ['ttstalk <username>']
handler.tags = ['stalk']
handler.command = /^(ttstalk|tiktokstalk)$/i
handler.limit = true
handler.register = true

module.exports = handler