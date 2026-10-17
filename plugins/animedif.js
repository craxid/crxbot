const fetch = require('node-fetch');

let handler = async (m, { text, usedPrefix, command, args }) => {
  if (!args[0]) throw `🚩 *Masukan detail gambar!* Contoh: ${usedPrefix + command} 1 girl, sit`;

  try {
    await conn.sendPresenceUpdate('composing', m.chat);
    await m.reply('_Sedang diproses..._');

    //let prompt = args.join(', ');
    let type = 'Anime';
    let style = 'Mikoto Misaka';
    let visual = 'Detailed';

    //const res = await fetch(`https://itzpire.com/ai/animagine?prompt=${text}&type=${type}&style=${style}&visual=${visual}`);

const res = await fetch(`https://itzpire.com/ai/animagine?prompt=${text}&type=Anime&style=${style}&visual=${visual}`)

    let json = await res.json();

    if (json.status === 'success') {
      let imgUrl = json.result.replace('.webp', '.png'); // Ubah webp menjadi png
      let tegs = `*[ Anime Diffusion ]* *PROMPT*: ${prompt} *STYLE*: ${style}`;

      await conn.sendFile(m.chat, imgUrl, 'image.png', tegs, m);
    } else {
      m.reply(`Error: ${json.status}`);
    }
  } catch (e) {
    m.reply(`Error: ada yang error nih\n\n${e}`);
  }
};

handler.command = handler.help = ['animedif', 'animediffusion', 'animediff'];
handler.tags = ['tools'];
handler.limit = 5;

module.exports = handler;