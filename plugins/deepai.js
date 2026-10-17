const axios = require("axios");
const crypto = require("crypto");
const FormData = require("form-data");

const agent =
  "Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36";

function md5(string) {
  return crypto.createHash("md5").update(string).digest("hex");
}

function reverse(string) {
  return string.split("").reverse().join("");
}

function genKEY() {
  const randomStr = Math.round(Math.random() * 100000000000) + "";
  const salt =
    "hackers_become_a_little_stinkier_every_time_they_hack";

  const hashFn = (input) => reverse(md5(input));

  const h1 = hashFn(agent + randomStr + salt);
  const h2 = hashFn(agent + h1);
  const h3 = hashFn(agent + h2);

  return `tryit-${randomStr}-${h3}`;
}

async function generateImage(prompt) {
  const apiKey = genKEY();

  const headers = {
    "User-Agent": agent,
    Accept: "*/*",
    Origin: "https://deepai.org",
    Referer: "https://deepai.org/",
    "api-key": apiKey,
  };

  const fd = new FormData();
  fd.append("text", prompt);

  try {
    const res = await axios.post(
      "https://api.deepai.org/api/text2img",
      fd,
      {
        headers: {
          ...headers,
          ...fd.getHeaders(),
        },
      }
    );
    const data = res.data;

    return {
      status: true,
      url: data.output_url,
      id: data.id,
    };
  } catch (err) {
    return { status: false, error: err.message };
  }
}

let handler = async (m, { text, conn }) => {
  if (!text) throw `Masukkan Prompt!\n\n*Contoh:* ${usedPrefix + command} A cyberpunk cat wearing sunglasses`;

  try {
    await m.reply('⏳ Sedang memproses...');

    const result = await generateImage(text);

    if (!result.status) throw new Error(result.error);

    await conn.sendMessage(
      m.chat,
      { image: { url: result.url }, caption: `${text}\n\nID: ${result.id}` },
      { quoted: m }
    );

  } catch (error) {
    console.error("Error generating content:", error);
    throw `❌ Terjadi kesalahan saat membuat gambar:\n\n${error.message}`;
  }
};

handler.command = handler.help = ['deepai'];
handler.tags = ['tools'];
handler.limit = 3;
handler.register = true;
handler.premium = false;

module.exports = handler;