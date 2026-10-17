const { GoogleGenAI } = require("@google/genai");

const wait = 'Sedang memproses... Mohon tunggu sebentar.';

const handler = async (m, { text, conn }) => {
  if (!text) throw `Masukkan Prompt!\n\n*Contoh:* !imagen A beautiful sunset over a mountain range`;

  try {
    await m.reply(wait);

    // Inisialisasi client dengan API key dari global.goapi
    const ai = new GoogleGenAI({ apiKey: global.goapi });

    // Generate gambar dari Gemini
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: text,
    });

    let buffer = null;
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        buffer = Buffer.from(imageData, "base64");
      }
    }

    if (!buffer) throw new Error("❌ Gemini tidak mengembalikan gambar.");

    // Kirim hasil ke chat langsung dari buffer
    await conn.sendMessage(
      m.chat,
      { image: buffer, caption: `${text}\n\n${global.wm}` },
      { quoted: m }
    );

  } catch (error) {
    console.error("Error generating content:", error);
    throw `Terjadi kesalahan saat membuat gambar:\n\n${error.message}`;
  }
};

handler.command = handler.help = ['imagen'];
handler.tags = ['tools'];
handler.limit = 3;
handler.register = true;
handler.premium = false;

module.exports = handler;