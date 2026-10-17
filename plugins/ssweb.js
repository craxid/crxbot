const axios = require("axios");
const fetch = require("node-fetch");

let handler = async (m, { conn, command, args }) => {
  if (!args[0] || !args[0].startsWith("http")) {
    return conn.reply(m.chat, "Masukkan URL yang valid", m);
  }

  try {
    // panggil API ferdev, hasilnya langsung gambar PNG
    let apiUrl = `https://api.ferdev.my.id/tools/ssweb?url=${encodeURIComponent(args[0])}&apikey=${global.ferdev}`;
    let buffer = await getBuffer(apiUrl);

    if (!buffer) {
      return conn.reply(m.chat, "Gagal mengambil screenshot. Buffer kosong.", m);
    }

    conn.sendMessage(m.chat, { image: buffer, caption: wm }, { quoted: m });
  } catch (e) {
    console.error("Error saat mengambil screenshot:", e);
    conn.reply(
      m.chat,
      `Terjadi kesalahan saat mengambil screenshot:\n\n${e?.message || e}`,
      m
    );
  }
};

handler.help = ["ssweb"];
handler.tags = ["internet"];
handler.command = /^ss(web)?f?$/i;

handler.limit = true;
handler.register = true;
handler.fail = null;

module.exports = handler;

// Fungsi untuk mengambil buffer dari URL
const getBuffer = async (url, options = {}) => {
  try {
    const res = await axios({
      method: "get",
      url,
      headers: {
        DNT: 1,
        "User-Agent": "GoogleBot",
        "Upgrade-Insecure-Request": 1,
      },
      ...options,
      responseType: "arraybuffer",
    });
    return res.data;
  } catch (e) {
    console.log(`Error: ${e}`);
    throw e;
  }
};