let handler = async (m, { conn, text, usedPrefix, command }) => {
  // Validasi input teks
  if (!text) {
    throw `*Cara penggunaan:*\nKetik ${usedPrefix + command} <teks bio>\n\n*Contoh:*\n${usedPrefix + command} 🟢 Bot Aktif | crax.my.id`;
  }

  // Validasi panjang maksimal bio WhatsApp TERBARU (50 karakter)
  if (text.length > 50) {
    throw `⚠️ Teks terlalu panjang! WhatsApp sekarang membatasi maksimal 50 karakter. (Teks kamu: ${text.length} karakter)`;
  }

  try {
    // Memperbarui bio/status profil WA
    await conn.updateProfileStatus(text);
    m.reply(`✅ *Bio berhasil diperbarui menjadi:*\n\n"${text}"`);
    console.log('Bio diubah secara manual oleh Owner:', text);
  } catch (e) {
    // Penanganan Error Baileys v7 (@hapi/boom)
    const statusCode = e?.output?.statusCode;
    const isRateLimit = statusCode === 429 || (e?.message && String(e.message).includes('rate-overlimit'));

    if (isRateLimit) {
      console.warn('⚠️ Gagal manual update bio (Rate Limit 429).');
      m.reply('⚠️ *Gagal update bio:* Terlalu sering mengubah bio (Rate Limit 429). Server menolak *request*. Silakan tunggu beberapa menit sebelum mencoba lagi.');
    } else {
      console.error('❌ Gagal manual update bio:', e?.message || e);
      m.reply(`❌ *Terjadi kesalahan saat memperbarui bio:*\n${e?.message || e}`);
    }
  }
};

handler.help = ['setbio <teks>'];
handler.tags = ['owner'];
handler.command = /^(setbio|setstatus)$/i;

// Fitur ini khusus untuk owner
handler.owner = true; 

module.exports = handler;