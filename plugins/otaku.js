const { searchAnime, scrapeAnime, getEpisodeDetail } = require('../lib/otaku.js');
                                                                           const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return m.reply(`❌ Masukkan judul anime!\n\n*Contoh:*\n${usedPrefix + command} saijaku tamer`);

  const waitMsg = await m.reply('⏳ Sedang mencari anime...');

  try {
    const aurl = await searchAnime(text);                                      if (!aurl) return m.reply(`❌ Anime "${text}" tidak ditemukan.`);

    const data = await scrapeAnime(aurl);
    if (!data || data.episodes.length === 0) return m.reply("❌ Gagal mengambil data episode.");

    let epList = `*🎥 ${data.title}*\n\n*Total Episode:* ${data.total_episode}\n*Genre:* ${data.genre}\n*Skor:* ${data.skor}\n\n`;
    epList += `*Silakan pilih episode dengan membalas angka (1-${data.episodes.length}):*\n\n`;
    data.episodes.slice(0, 10).forEach((ep, i) => {
        epList += `*${i + 1}.* ${ep.title || ep.url}\n`;
    });

    const msg = await conn.sendMessage(m.chat, {                                   image: { url: data.thumbnail },
        caption: epList
    }, { quoted: m });                                                     
    const selectedEp = await conn.awaitReply(m.chat, 'Ketik nomor episode yang ingin ditonton:', m.sender, 60000);

    if (!selectedEp || isNaN(selectedEp) || selectedEp < 1 || selectedEp > data.episodes.length) {
        return m.reply("❌ Pilihan tidak valid.");
    }

    const targetEp = data.episodes[selectedEp - 1];
    await m.reply(`⏳ Mengambil link streaming untuk ${targetEp.title || targetEp.url}...`);

    const epDetail = await getEpisodeDetail(targetEp.url);
    if (!epDetail) return m.reply("❌ Gagal mengambil data video.");

    let resultMsg = `*📺 ${targetEp.title || targetEp.url}*\n\n`;
    resultMsg += `*🔗 Embed:* ${epDetail.embed}\n\n`;
    resultMsg += `*📥 Download Links:*\n`;
    epDetail.downloads.forEach((link, i) => {
        resultMsg += `${i + 1}. ${link}\n`;
    });

    await conn.sendMessage(m.chat, { text: resultMsg }, { quoted: m });
    await conn.sendMessage(m.chat, { delete: waitMsg.key });

  } catch (err) {
    console.error('Error Handler:', err);
    m.reply(`❌ Terjadi kesalahan: ${err}`);
  }
};

handler.command = ['otaku', 'nonton'];
handler.help = ['otaku <judul>'];
handler.tags = ['anime'];
handler.register = true;
handler.limit = true;

module.exports = handler;
