const axios = require('axios');

var handler = async (m, { conn, usedPrefix, command, text }) => {
  try {
    let url;
    if (text) {
      url = `https://fufufafapi.vanirvan.my.id/api?content=${text}`;
    } else {
      url = 'https://fufufafapi.vanirvan.my.id/api/random';
    }
    let response = await axios.get(url);
    let data = response.data;
    if (Array.isArray(data)) {
      data = data[0]; // Mengambil data pertama dari array
    }
    let datetime = new Date(parseInt(data.datetime));
    let hari = datetime.toLocaleString('id-ID', { weekday: 'long' });
    let tanggal = datetime.getDate();
    let bulan = datetime.toLocaleString('id-ID', { month: 'long' });
    let tahun = datetime.getFullYear();
    let jam = datetime.getHours().toString().padStart(2, '0');
    let menit = datetime.getMinutes().toString().padStart(2, '0');
    let detik = datetime.getSeconds().toString().padStart(2, '0');
    let waktu = `${hari}, ${tanggal} ${bulan} ${tahun} ${jam}:${menit}:${detik}`;
    let hasil = `*ID:* ${data.id}\n*Content:* ${data.content}\n*Date:* ${waktu}\n*Doksli:* ${data.doksli}`;
    await conn.sendMessage(m.chat, { image: { url: data.image_url }, caption: hasil, mentions: [m.sender] }, { quoted: m });
  } catch (err) {
    console.error(err);
    m.reply(`Error: Gagal mengambil data dari API\n\n${err}`);
  }
}

handler.command = handler.help = ['fufufafa'];
handler.tags = ['tools', 'internet'];

module.exports = handler;