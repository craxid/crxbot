const fetch = require('node-fetch');

let handler = async (m, { conn}) => {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/top/anime?limit=10`);
    const json = await res.json();
    const topAnime = json.data;

    const top = topAnime[0];
    const studio = top.studios.map(s => s.name).join(', ') || 'Tidak diketahui';
    const genre = top.genres.map(g => g.name).join(', ') || 'Tidak tersedia';
    const produser = top.producers.map(p => p.name).join(', ') || 'Tidak tersedia';
    const demografi = top.demographics.map(d => d.name).join(', ') || 'Tidak tersedia';

    let teks = `*🏆 Anime #1: ${top.title}*\n\n` +
      `*Judul Inggris:* ${top.title_english}\n` +
      `*Judul Jepang:* ${top.title_japanese}\n` +
      `*Sinonim:* ${top.title_synonyms.join(', ')}\n` +
      `*Tipe:* ${top.type}\n` +
      `*Sumber:* ${top.source}\n` +
      `*Episode:* ${top.episodes}\n` +
      `*Status:* ${top.status}\n` +
      `*Durasi:* ${top.duration}\n` +
      `*Rating:* ${top.rating}\n` +
      `*Skor:* ${top.score} (${top.scored_by} pengguna)\n` +
      `*Popularitas:* ${top.popularity}\n` +
      `*Favorit:* ${top.favorites}\n` +
      `*Studio:* ${studio}\n` +
      `*Produser:* ${produser}\n` +
      `*Genre:* ${genre}\n` +
      `*Demografi:* ${demografi}\n` +
      `*Ditayangkan:* ${top.aired.string}\n` +
      `*Jadwal Tayang:* ${top.broadcast.string}\n` +
      `*Musim:* ${top.season} ${top.year}\n` +
      `*Link MAL:* ${top.url}\n\n` +
      `*📖 Sinopsis:*\n${top.synopsis}\n\n` +
      `*📚 Info Tambahan:*\n${top.background || 'Tidak tersedia.'}\n\n`;

    teks += '*📊 9 Anime Teratas Lainnya:*\n\n';
    for (let i = 1; i < topAnime.length; i++) {
      const a = topAnime[i];
      teks += `*${i + 1}. ${a.title}*\n`;
      teks += `📺 Tipe: ${a.type}\n`;
      teks += `⭐ Skor: ${a.score} (${a.scored_by} pengguna)\n`;
      teks += `🔗 ${a.url}\n\n`;
}

    await conn.sendFile(m.chat, top.images.jpg.large_image_url, 'topanime.jpg', teks.trim(), m);
} catch (err) {
    console.error(err);
    throw '*❌ ERROR:* Gagal mengambil data anime teratas.';
}
};

handler.help = ['topanime'];
handler.tags = ['internet'];
handler.command = ['topanime', 'topmal'];
handler.premium = false;
handler.group = true;
handler.limit = true;

module.exports = handler;