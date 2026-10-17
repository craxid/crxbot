const { VisualParadigmUpscaler } = require('../lib/remini'); // Sesuaikan path jika perlu

let handler = async (m, { conn, usedPrefix, command }) => {
  var q = m.quoted ? m.quoted : m;
  var mime = (q.msg || q).mimetype || q.mediaType || '';
  
  // Ambil durasi ephemeral secara otomatis dari pesan masuk atau chat metadata
  // Jika tidak terdeteksi, default ke 86400 (24 jam)
  let duration = m.expiration || conn.chats[m.chat]?.metadata?.ephemeralDuration || 86400;

  if (/image/g.test(mime)) {
    // Gunakan expiration juga pada pesan 'tunggu' agar sinkron
    await conn.reply(m.chat, global.wait, m, { expiration: duration, ephemeralExpiration: duration });

    try {
      // Mengunduh gambar menjadi bentuk Buffer
      let img = await q.download?.();
      
      // Memanggil library
      const upscaler = new VisualParadigmUpscaler();
      
      // Proses upscaling langsung menggunakan Buffer tanpa perlu uploadImage dulu
      let upscaledBuffer = await upscaler.upscale(img);

      if (upscaledBuffer) {
        // Parameter conn.sendFile: jid, file, filename, caption, quoted, ptt, options
        await conn.sendFile(
          m.chat, 
          upscaledBuffer, 
          'remini.jpg', 
          `*Photo Upscaler*\n\n© CraXID Bot`, 
          m, 
          false, 
          { 
            expiration: duration, 
            ephemeralExpiration: duration 
          }
        );
      } else {
        await conn.reply(m.chat, `Proses gagal :(\n\nRespon dari sistem upscaler kosong/tidak valid.`, m, { 
          expiration: duration, 
          ephemeralExpiration: duration 
        });
      }
    } catch (e) {
      console.log(e);
      await conn.reply(m.chat, `Proses gagal :(\n\n${e.message}`, m, { 
        expiration: duration, 
        ephemeralExpiration: duration 
      });
    }
  } else {
    await conn.reply(m.chat, `Kirim gambar dengan caption ${usedPrefix + command} atau tag gambar yang sudah dikirim`, m, { 
      expiration: duration, 
      ephemeralExpiration: duration 
    });
  }
};

handler.help = handler.command = ['remini', 'hdr', 'hd'];
handler.tags = ['tools'];
handler.limit = 5;
handler.premium = false;
handler.register = true;

module.exports = handler;