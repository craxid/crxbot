const fetch = require('node-fetch');

let handler = async (m, { text, usedPrefix, command, args }) => {
let response = args.join(' '.split(' - '))

  if (!args[0]) throw `🚩 *Masukan detail gambar!* 

Contoh: ${usedPrefix + command} prompt`

/*if (!text.includes(' - ')) throw `Masukan prompt dan negative prompt, pisahkan Prompt dan Negative Prompt dengan -

Contoh
${usedPrefix + command} 1girl - bad anatomy, bad hand, extra finger`*/

  try {

await conn.sendPresenceUpdate('composing', m.chat)
await m.reply('_Sedang diproses..._')

let negatif = `bad fingers, bad anatomy, bad hand, high contrast, low quality, low definition, bad lighting`

//const res = await fetch(`https://api.yanzbotz.live/api/text2img/yanzbotz?prompt=${text}&apiKey=yanzdev`)

let res = await conn.getFile(`https://api.yanzbotz.live/api/text2img/yanzbotz?prompt=${text}&apiKey=yanzdev`)

let gmbr = await res.data

//let { model, steps, sampler } = await mentah.data.data;

//let gmbr = await mentah.data

let tegs = `*[ Stable Diffusion ]*

*PROMPT*:
${text}

©CraXID Bot`

setTimeout (() => {
conn.sendPresenceUpdate('composing', m.chat)
conn.sendFile(m.chat, gmbr, 'image.jpg', tegs, m);
}, 3000)

  } catch (error) {
    m.reply(`Error`);
  }
};

handler.command = handler.help = ['stabledif','stablediffusion','stablediff'];
handler.tags = ['tools'];
handler.limit = 5;
module.exports = handler;