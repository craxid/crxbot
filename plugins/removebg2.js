const fetch = require('node-fetch');
const FormData = require('form-data');
const { fromBuffer} = require('file-type');

let handler = async (m, { conn, usedPrefix, command}) => {
  try {
    let q = m.quoted? m.quoted: m;
    let mime = (q.msg || q).mimetype || '';
    if (!mime) throw `Kirim atau reply gambar dengan caption ${usedPrefix + command}`;

    m.reply('🧼 Menghapus background, tunggu sebentar...');

    let media = await q.download();
    let { ext} = await fromBuffer(media);

    let form = new FormData();
    form.append('image_file', media, `file.${ext}`);
    form.append('size', 'auto');

    let res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': global.nobgapi,
...form.getHeaders()
},
      body: form
});

    if (!res.ok) {
      let errorText = await res.text();
      throw `Gagal menghapus background:\n${errorText}`;
}

    let result = await res.buffer();
    await conn.sendFile(m.chat, result, 'nobg.png', '✅ Background berhasil dihapus!\n© CraXID Bot', m);
} catch (e) {
    console.error(e);
    m.reply(`❌ Terjadi kesalahan:\n${e}`);
}
};

handler.help = ['removebg2'];
handler.tags = ['tools'];
handler.command = /^(removebg2|nobg2)$/i;
handler.limit = 3;
handler.register = true;
module.exports = handler;