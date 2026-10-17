const axios = require('axios');
const xml2js = require('xml2js');

const handler = async (m, { conn}) => {
  try {
    // Ambil data XML dari BMKG
    const res = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.xml');
    const xml = res.data;

    // Parsing XML ke JSON
    const parser = new xml2js.Parser({ explicitArray: false});
    const result = await parser.parseStringPromise(xml);
    const gempa = result.Infogempa.gempa;

    // Ambil data gempa
    const {
      Tanggal,
      Jam,
      Lintang,
      Bujur,
      Magnitude,
      Kedalaman,
      Wilayah,
      Potensi,
      Dirasakan,
      Shakemap
} = gempa;

    // Buat URL lengkap untuk shakemap
    const shakemapUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${Shakemap}`;

    // Format teks info gempa
    const teks = `${global.htki} GEMPA TERKINI ${global.htka}
📅 *Tanggal:* ${Tanggal}
🕒 *Jam:* ${Jam}
📍 *Lokasi:* ${Wilayah}
💥 *Magnitudo:* ${Magnitude}
🌊 *Kedalaman:* ${Kedalaman}
📌 *Lintang:* ${Lintang}
📌 *Bujur:* ${Bujur}
⚠️ *Potensi:* ${Potensi}
🤕 *Dirasakan:* ${Dirasakan}

${global.wm}`;

    // Kirim reaksi emoji sebelum mengirim pesan
    await conn.sendMessage(m.chat, {
      react: {
        text: '📡',
        key: m.key
}
});

    // Kirim pesan dengan gambar dan efek "diteruskan"
    await conn.sendMessage(m.chat, {
      image: { url: shakemapUrl},
      caption: teks,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true
}
}, { quoted: m});

} catch (err) {
    console.error(err);
    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
}
});
    m.reply(`*Error:* Gagal mengambil data gempa dari BMKG.\n\n${err}`);
}
};

handler.command = handler.help = ['infogempa', 'gempa'];
handler.tags = ['info'];
handler.premium = false;
handler.register = true;

module.exports = handler;