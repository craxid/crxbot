const Jimp = require('jimp');
const QrCode = require('qrcode-reader');

let handler = async (m, { conn}) => {
  try {
    const quoted = m.quoted? m.quoted: m;
    const mime = (quoted.msg || quoted).mimetype || '';

    if (!/image\/(jpe?g|png)/.test(mime)) {
      throw '⚠️ Kirim atau reply gambar QR code dengan format JPG atau PNG.';
}

    const buffer = await quoted.download();
    const image = await Jimp.read(buffer);

    const qr = new QrCode();
    qr.callback = async (err, value) => {
      if (err ||!value) {
        return conn.reply(m.chat, '❌ Gagal membaca QR code. Pastikan gambarnya jelas dan valid.', m);
}

      await conn.reply(m.chat, `✅ Isi QR code:\n\n${value.result}`, m);
};

    qr.decode(image.bitmap);
} catch (e) {
    console.error(e);
    conn.reply(m.chat, `❌ Terjadi kesalahan: ${e}`, m);
}
};

handler.command = ['qrtotxt'];
handler.tags = ['tools'];
handler.help = ['qrtotxt (reply gambar QR)'];

module.exports = handler;