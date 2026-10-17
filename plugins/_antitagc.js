let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin }) {
  // 1. Abaikan pesan dari bot sendiri atau jika bukan di grup
  if ((m.isBaileys && m.fromMe) || m.fromMe || !m.isGroup) return true

  // 2. Cek apakah database antitagstatus aktif di grup ini
  let chat = global.db.data.chats[m.chat]
  if (!chat.antiTagStatus) return true // <-- Fitur enable/disable ada di sini

  // 3. Cek apakah tipe pesan adalah tag status ke grup
  if (m.mtype === 'groupStatusMentionMessage') {
    
    // Inisialisasi database user untuk hitungan peringatan
    let user = global.db.data.users[m.sender]
    if (typeof user.warnTagStatus !== 'number') user.warnTagStatus = 0

    let nama = `@${m.sender.split('@')[0]}`

    // Pengecualian untuk Admin Grup
    if (isAdmin) {
      await conn.reply(m.chat, `😎 *${nama}* ngetag grup di statusnya. Untung lu admin bang, jadi aman dari sistem kick bot.`, m, { mentions: [m.sender] })
      return true
    }

    // Tambah hitungan pelanggaran
    user.warnTagStatus += 1

    // Jika peringatan masih di bawah 3 kali
    if (user.warnTagStatus < 3) {
      let sisa = 3 - user.warnTagStatus
      
      let warnMsg = `⚠️ *PERINGATAN* ⚠️\n\n`
      warnMsg += `Halo ${nama}, kamu terdeteksi membagikan *Status WhatsApp* yang men-tag grup ini.\n\n`
      warnMsg += `Tindakan ini dilarang untuk menjaga privasi grup. Ini adalah peringatan ke *${user.warnTagStatus}*.\n\n`
      warnMsg += `❗️ *Sisa kesempatanmu: ${sisa} kali.*\nJika mencapai peringatan ke-3, kamu akan otomatis dikeluarkan dari grup.\n\n`
      warnMsg += `_Untuk mematikan fitur ini, ketik *!disable antitaggc*_`

      await conn.reply(m.chat, warnMsg, m, { mentions: [m.sender] })

      // Hapus pesan tag statusnya
      if (isBotAdmin) {
        await conn.sendMessage(m.chat, { delete: m.key })
      }
      
    } else {
      // Eksekusi KICK jika sudah 3 kali
      if (isBotAdmin) {
        let kickMsg = `🚫 *BATAS PERINGATAN TERCAPAI* 🚫\n\n`
        kickMsg += `${nama} telah mengabaikan peringatan sebanyak 3 kali terkait larangan men-tag grup di Status WhatsApp.\n\nSelamat tinggal! 👋`

        await conn.reply(m.chat, kickMsg, null, { mentions: [m.sender] })
        
        // Hapus pesan pelanggaran terakhir
        await conn.sendMessage(m.chat, { delete: m.key })
        
        // Jeda 2 detik sebelum di-kick agar pesan perpisahan terbaca
        setTimeout(async () => {
          await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
          // Reset warning setelah di-kick
          user.warnTagStatus = 0 
        }, 2000)

      } else {
        // Jika bot bukan admin
        await conn.reply(m.chat, `⚠️ ${nama} telah melanggar aturan 3 kali (tag grup di status). Sayangnya bot *bukan admin*, jadi tidak bisa mengeluarkannya.\n\nMohon admin asli segera menindaklanjuti.`, m, { mentions: [m.sender] })
        user.warnTagStatus = 0 
      }
    }
  }
  
  return true
}

module.exports = handler
