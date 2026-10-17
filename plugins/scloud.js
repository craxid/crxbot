const fetch = require('node-fetch');

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `*Usage : ${usedPrefix + command} query/link*\n\nExample pencarian:\n${usedPrefix + command} anji dia\n\nExample link:\n${usedPrefix + command} https://on.soundcloud.com/7PPdUj5CKbd2tuZDpA`;

  try {
    await m.reply(wait);

    // 🔍 1. JIKA INPUT BUKAN LINK SOUNDCLOUD (MODE PENCARIAN)
    if (!text.match(/soundcloud\.com/i)) {
      const searchRes = await fetch(`https://api.siputzx.my.id/api/s/soundcloud?query=${encodeURIComponent(text)}`);
      const searchJson = await searchRes.json();
      
      if (!searchJson.status || !searchJson.data || searchJson.data.length === 0) {
        throw 'Lagu tidak ditemukan di pencarian SoundCloud!';
      }
      
      let txt = `*${global.htki || '≡'} SOUNDCLOUD SEARCH ${global.htka || '≡'}*\n\n`;
      let limit = Math.min(10, searchJson.data.length); // Menampilkan maksimal 10 hasil
      
      for (let i = 0; i < limit; i++) {
        let res = searchJson.data[i];
        
        // Memformat durasi untuk list
        let mnt = Math.floor(res.duration / 60000);
        let dtk = Math.floor((res.duration % 60000) / 1000);
        
        // Karena API search tidak memiliki properti 'title', kita menggunakan 'permalink' sebagai judul
        let titleStr = res.permalink ? res.permalink.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown Title';
        
        txt += `*${i + 1}. ${titleStr}*\n`;
        txt += `⭔ *Duration:* ${mnt}:${dtk.toString().padStart(2, '0')}\n`;
        txt += `⭔ *URL:* ${res.permalink_url}\n\n`;
      }
      
      txt += `_Ketik *${usedPrefix}${command} <url>* untuk mengunduh lagu._\n_Contoh: ${usedPrefix}${command} ${searchJson.data[0].permalink_url}_`;
      
      // Mengirim hasil pencarian lalu BERHENTI (return) agar tidak lanjut download
      return conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: { 
            forwardingScore: 9999, 
            isForwarded: true 
        } 
      }, { 
        quoted: m, 
        ephemeralExpiration: 86400 
      });
    }

    // 📥 2. JIKA INPUT ADALAH LINK (MODE DOWNLOAD)
    let finalUrl = text;

    if (text.includes('on.soundcloud.com')) {
      const resolve = await fetch(text, { method: 'HEAD' }); 
      finalUrl = resolve.url; 
    }

    const response = await fetch(`https://api.siputzx.my.id/api/d/soundcloud?url=${encodeURIComponent(finalUrl)}`);
    const data = await response.json();
    
    if (!data.status || !data.data) throw 'Gagal mengambil data dari API atau lagu tidak dapat diunduh!';
    
    const video = data.data;
    const audioUrl = video.url;

    // Konversi durasi 
    let ms = video.duration;
    let mnt = Math.floor(ms / 60000);
    let dtk = Math.floor((ms % 60000) / 1000);
    let formatDurasi = `${mnt}:${dtk.toString().padStart(2, '0')}`;

    // 🖼️ 3. MENGAMBIL THUMBNAIL (Sebagai Buffer)
    const thumbnailUrl = video.thumbnail;
    let thumbBuffer;
    
    try {
      const thumbRes = await fetch(thumbnailUrl);
      thumbBuffer = Buffer.from(await thumbRes.arrayBuffer());
    } catch (err) {
      console.error('Gagal fetch thumbnail manual:', err);
    }

    const caption = `*${global.htki || '≡'} SoundCloud Play ${global.htka || '≡'}*\n\n*Title:* ${video.title}\n*Duration:* ${formatDurasi}\n*User:* ${video.user}\n*URL:* ${finalUrl}\n\n_File sedang dikirim..._`;
    const caption2 = `*${global.htki || '≡'} SoundCloud Play ${global.htka || '≡'}*\n\n*Title:* ${video.title}\n*Duration:* ${formatDurasi}\n*User:* ${video.user}\n*URL:* ${finalUrl}`;

    // 📤 4. MENGIRIM GAMBAR THUMBNAIL (Jeda 2 detik)
    setTimeout(() => {
      conn.sendPresenceUpdate('composing', m.chat);
      conn.sendMessage(m.chat, {
        image: thumbBuffer || { url: thumbnailUrl },
        caption: caption,
        contextInfo: { 
            forwardingScore: 9999, 
            isForwarded: true 
        } 
      }, { 
        quoted: m, 
        ephemeralExpiration: 86400 
      });
    }, 2000);

    // 🎵 5. MENGIRIM AUDIO (Jeda 5 detik)
    setTimeout(() => {
      conn.sendPresenceUpdate('recording', m.chat);
      conn.sendMessage(m.chat, {
        audio: { url: audioUrl },
        caption: caption2, 
        mimetype: 'audio/mpeg',
        fileName: `${global.kki || ''} CraXID Bot ${global.kka || ''} ${video.title}.mp3`
      }, { 
        quoted: m, 
        ephemeralExpiration: 86400 
      });
    }, 5000);

  } catch (e) {
    m.reply(`Ada yang eror nih: ${e.message || e}`);
  }
};

handler.help = ['soundcloud <query/url>'];
handler.tags = ['downloader'];
handler.command = /^(s(ound)?cloud)$/i;
handler.exp = 0;
handler.limit = true;
handler.premium = false;
handler.register = true;

module.exports = handler;
