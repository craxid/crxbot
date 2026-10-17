let handler = m => m

// Regex pintar: 
// - Menangkap semua URL yang diawali http://, https://, www.
// - ATAU menangkap teks berakhiran domain (seperti .com, .games, .xyz, .slot) tanpa http://
// - MENGABAIKAN ekstensi file seperti .js, .json, .jpg, dll jika tidak ada http://
let allLinkRegex = /(?:(?:https?:\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{2,10}\b|[-a-zA-Z0-9@:%._\+~#=]{1,256}\.(?:com|net|org|id|co|info|biz|me|tv|us|games|xyz|io|site|online|tech|vip|pro|cc|ws|to|asia|club|shop|store|live|bet|slot|gacor|link|click|top|run|space|world|my\.id|ac\.id)\b)([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i

// Daftar link yang DIIZINKAN (Whitelist)
let allowedLinks = [
  'tiktok.com', 'vt.tiktok.com', 'douyin.com',
  'instagram.com', 'ig.me',
  'youtube.com', 'youtu.be',
  'facebook.com', 'fb.com', 'fb.watch', 'fb.gg',
  'twitter.com', 'x.com',
  'threads.net',
  'pinterest.com', 'pin.it',
  'spotify.com', 'soundcloud.com', 'music.apple.com',
  'drive.google.com', 'docs.google.com',
  'mediafire.com', 'mega.nz', 'dropbox.com',
  'pixeldrain.com',
  'google.com', 'google.co.id', 'wikipedia.org',
  'kompas.com', 'detik.com', 'tribunnews.com', 'cnnindonesia.com',
  'shopee.co.id', 'tokopedia.com', 'lazada.co.id', 'blibli.com',
  'pixiv.com', 'pixiv.net',
  'kusonime.com', 'nekopoi.care', 'nhentai.net', 'myanimelist.net',
  'crax.my.id', 's.id', 'bit.ly', 'tinyurl.com', 'fast.com' ,'hxa.my.id', 'speedtest.com', 'tt.site',
]

handler.before = async function (m, { isBotAdmin, isAdmin, isOwner }) {
  if ((m.isBaileys && m.fromMe) || m.fromMe || !m.isGroup) return true
  
  // Pengecualian mutlak untuk Owner
  if (isOwner) return true 
  
  let chat = global.db.data.chats[m.chat]
  let user = global.db.data.users[m.sender]
  let nama = `@${m.sender.split`@`[0]}`
  
  // Mengambil batas maksimal warn dari config (bisa global.warn atau global.maxwarn, default 3)
  let maxWarn = global.warn || global.maxwarn || 3 

  // Jika fitur antiLink di grup menyala
  if (chat.antiLink) {
    let isAnyLink = allLinkRegex.exec(m.text)

    // Jika pesan mengandung link yang valid
    if (isAnyLink) {
      let link = isAnyLink[0].toLowerCase()

      // 1. Cek whitelist
      let isAllowedLink = allowedLinks.some(allowed => link.includes(allowed))

      // 2. Cek link grup WA
      let isWhatsAppLink = link.includes('chat.whatsapp.com') || link.includes('wa.me')
      let isThisGroupLink = false
      
      if (isWhatsAppLink) {
        try {
            let inviteCode = await conn.groupInviteCode(m.chat)
            let linkGC = ('chat.whatsapp.com/' + inviteCode).toLowerCase()
            if (link.includes(linkGC)) {
              isThisGroupLink = true
            }
        } catch (e) {
            console.log('Gagal mendapatkan invite code grup:', e)
        }
      }

      // Eksekusi jika BUKAN link yang diizinkan & BUKAN link grup ini
      if (!isAllowedLink && !isThisGroupLink) {
        
        if (isAdmin) return m.reply('*Untung kamu admin, bot tidak akan memberikan peringatan hehe...*')
        if (!isBotAdmin) return m.reply('*Bot bukan admin, saya tidak bisa menghapus pesan atau menendang pelanggar _-*')
        
        // Hapus pesan
        await conn.sendMessage(m.chat, { delete: m.key })
        
        // Tambah peringatan
        if (typeof user.warn !== 'number') user.warn = 0
        user.warn += 1

        // Kick jika peringatan batas maksimal
        if (user.warn >= maxWarn) {
            await m.reply(`*「 ANTI LINK / SPAM 」*\n\n*${nama}*, kamu telah mencapai batas maksimal peringatan (*${user.warn}/${maxWarn}*).\n\nSesuai aturan, kamu dikeluarkan dari grup!`)
            await conn.groupParticipantsUpdate(m.chat, [m.sender], "remove")
            user.warn = 0 // Reset setelah kick
        } else {
            // Peringatan saja
            await m.reply(`*「 ANTI LINK / SPAM 」*\n\n*${nama}*, kamu terdeteksi mengirim link yang tidak diizinkan!\n\n⚠️ *Peringatan: ${user.warn} / ${maxWarn}*\nJangan ulangi atau kamu akan dikeluarkan dari grup.`)
        }
      }
    }
  }
  return true
}

module.exports = handler