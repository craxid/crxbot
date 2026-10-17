let handler = async (m, { conn, isROwner, text }) => {
    const delay = time => new Promise(res => setTimeout(res, time))
    
    // Ambil data semua grup
    let getGroups = await conn.groupFetchAllParticipating()
    // Object.values lebih simpel untuk mengambil array dari object getGroups
    let groups = Object.values(getGroups) 
    let anu = groups.map(v => v.id)
    
    // Deteksi media (gambar) dari pesan saat ini atau pesan yang di-reply
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''
    
    // Ambil teks caption/pesan
    let pesan = (m.quoted && m.quoted.text) ? m.quoted.text : text
    
    if (!pesan && !/image/.test(mime)) throw 'Teks atau gambarnya mana?'
    
    m.reply(`Mengirim Broadcast Ke ${anu.length} Chat, Estimasi Waktu ${anu.length * 0.5 } detik`)
    
    // Jika ada gambar, download medianya terlebih dahulu
    let media = false
    if (/image/.test(mime)) {
        media = await q.download()
    }
    
    for (let group of groups) {
        await delay(500)
        
        // Ekstrak ID semua member di grup tersebut untuk dimention
        let participants = group.participants || []
        let mentions = participants.map(u => u.id)
        
        try {
            if (media) {
                // Kirim broadcast berupa gambar beserta caption dan tag
                await conn.sendMessage(group.id, { 
                    image: media, 
                    caption: pesan || '', 
                    mentions: mentions 
                })
            } else {
                // Kirim broadcast berupa teks murni dan tag
                await conn.sendMessage(group.id, { 
                    text: pesan, 
                    mentions: mentions 
                })
            }
        } catch (e) {
            console.log(`Gagal mengirim BC ke ${group.id}:`, e)
        }
    }
    
    m.reply(`Sukses Mengirim Broadcast Ke ${anu.length} Group`)
}

handler.help = ['bcgcbot <teks/reply gambar>']
handler.tags = ['owner']
handler.command = /^((broadcastgc|bcgc)bot)$/i

handler.owner = true

module.exports = handler