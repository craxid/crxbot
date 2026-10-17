const fetch = require('node-fetch');

let handler = async (m, { text, usedPrefix, command, args }) => {
let response = args.join(' '.split(' - '))

  if (!args[0]) throw `*Masukan detail gambar!* 

Contoh: ${usedPrefix + command} prompt`

/*if (!text.includes(' - ')) throw `Masukan prompt dan negative prompt, pisahkan Prompt dan Negative Prompt dengan -

Contoh
${usedPrefix + command} 1girl - bad anatomy, bad hand, extra finger`*/

  try {

await conn.sendPresenceUpdate('composing', m.chat)
await m.reply('_Sedang diproses..._')

let negatif = `bad fingers, bad anatomy, bad hand, bad leg, out of the frame, high contrast, low quality, low definition, bad lighting`

//const res = await fetch(`https://itzpire.com/ai/prodia?model=meinamix_meinaV11.safetensors%20%5Bb56ce717%5D&sampler=Euler%20a&prompt=${text}&negative_prompt=${negatif}`)

const res = await fetch(`https://api.yanzbotz.live/api/text2img/meta-ai?prompt=${text}&apiKey=yanzdev`)

let mentah = await res.json()
let gambarnya = await mentah.result[0]

//let { prompt, model, steps, sampler } = await mentah.data.data;

//let { img } = await mentah.data

let tegs = `*[ META AI Generate Image ]*

*PROMPT*:
${text}

©CraXID Bot`

setTimeout (() => {
conn.sendPresenceUpdate('composing', m.chat)
conn.sendMessage(m.chat, {
image: { url: gambarnya },
caption: tegs,
mimetype: 'image/jpeg',
fileName: 'gambar.jpg',
}, {quoted: m})
}, 3000)

  } catch (e) {
    m.reply(`Error: ada yang error nih`);
  }
};
handler.command = handler.help = ['metaimage','imgmeta','metaimg'];
handler.tags = ['tools'];
handler.limit = 5;
module.exports = handler;