const fetch = require('node-fetch');

var handler = async (m, { conn, text }) => {
  if (!text) throw 'Format: !cekresi <resi> <ekspedisi>\nContoh: !cekresi SPXID054330680586 shopee-express';

  const [resi, ekspedisi] = text.split(/\s+/);
  if (!resi || !ekspedisi) throw 'Harap masukkan nomor resi dan ekspedisi.\nContoh: !cekresi SPXID054330680586 shopee-express';

  try {
    await m.reply(global.wait || 'Sedang mengecek resi...');

    const url = `https://api.ferdev.my.id/tools/cekresi?resi=${encodeURIComponent(resi)}&ekspedisi=${encodeURIComponent(ekspedisi)}&apikey=${global.ferdev}`;
    const res = await fetch(url);
    const json = await res.json(); // baca body meski status bukan 200

    if (!res.ok || !json.success) {
      let errMsg = `❌ *Gagal cek resi*\n\n${json.message || `Error ${res.status}`}`;
      await conn.sendMessage(m.chat, { text: errMsg }, { quoted: m });
      return;
    }

    const data = json.data;
    let info = `📦 *Cek Resi*\n\n`;
    info += `• Resi: ${data.resi}\n`;
    info += `• Ekspedisi: ${data.ekspedisi}\n`;
    info += `• Status: ${data.status}\n`;
    info += `• Tanggal Kirim: ${data.tanggalKirim}\n`;
    info += `• CS: ${data.customerService}\n`;
    info += `• Posisi Terakhir: ${data.lastPosition}\n`;
    info += `• Link: ${data.shareLink}\n\n`;

    info += `📝 *Riwayat Pengiriman:*\n`;
    for (let h of data.history.slice(0, 5)) {
      info += `- ${h.tanggal}: ${h.keterangan}\n`;
    }

    await conn.sendMessage(m.chat, { text: info }, { quoted: m });

  } catch (e) {
    console.error(e);
    await conn.sendMessage(m.chat, { text: 'Terjadi kesalahan saat cek resi.' }, { quoted: m });
  }
};

handler.command = handler.help = ['cekresi','cariresi','tracking'];
handler.tags = ['tools'];
handler.limit = true;

module.exports = handler;
