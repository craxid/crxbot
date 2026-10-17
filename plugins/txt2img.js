const fetch = require('node-fetch');

let handler = async (m, { text, usedPrefix, command, args }) => {
  if (!text) throw `🚩 *Masukan detail gambar!* 

Contoh: ${usedPrefix + command} 1 girl`;

/*if (!text.includes(' - ')) throw `Masukan `*/

  try {

await conn.sendPresenceUpdate('composing', m.chat)
await m.reply('_Sedang diproses..._')

let [model, prompt] = text.split` - `

   /* const res = await fetch(`https://hercai.onrender.com/${encodeURIComponent(model)}/text2image?prompt=${encodeURIComponent(prompt)}`)*/

const res = await conn.getFile(`https://aemt.me/v5/text2img?text=${text}`)

let imej = await res;
let tegs = `*[ Text to Image ]*

*PROMPT*:
${text}

©CraXID Bot`

setTimeout (() => {
conn.sendPresenceUpdate('composing', m.chat)
conn.sendFile(m.chat, res.data, 'image.jpg', `${tegs}`, m);
}, 3000)

  } catch (error) {
    m.reply(`Error: ${error}`);
  }
};

handler.command = handler.help = ['text2img','txt2img'];
handler.tags = ['tools'];
handler.limit = 5;
module.exports = handler;