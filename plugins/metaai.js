var fetch = require('node-fetch');
var { openai } = require('betabotz-tools')
var handler = async (m, {
 text, 
 usedPrefix, 
 command
 }) => {
if (!text) throw `Masukkan pertanyaan!\n\n*Contoh:* ${usedPrefix + command} Siapa presiden Indonesia? `
try {

let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.jid : m.sender

let nama = `@${m.sender.split`@`[0]}`
 
await conn.sendPresenceUpdate('composing', m.chat)
  await m.reply(wait)

let db = `{ character AI Logic: name: *CraXID Bot* based on ChatGPT from OpenAI, developed by: CraXID Bot or @${global.numberowner}, his fb is https://fb.me/dede2015k, jangan gunakan bahasa inggris saat membalas, AI ini tidak mendukung segala tindakan komunitas LGBT atau apapun itu yang berhubungan dengannya }`

let uid = await m.sender

let gpt = await fetch(`https://api.siputzx.my.id/api/ai/metaai?query=${text}`)

//let gpt = await fetch(`https://api.nyxs.pw/ai/gpt4?text=${db}%20,${nama}%20adalah%20nama%20user,%20${text}`)

//let raw = await fetch(`https://aemt.me/turbo?text=${text}`)

  var hasil = await gpt.json()

setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
m.reply(hasil.data)
}, 5000)

} catch (err) {
  console.error(err)
  throw (`Error: Tidak dapat menjawab pertanyaan!`)
}
}
handler.command = handler.help = ['metaai'];
handler.tags = ['tools'];
handler.premium = false
handler.limit = 1
handler.restrict = true
module.exports = handler;