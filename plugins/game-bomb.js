const fs = require('fs')
// Thanks To Kasan

let handler = async (m, { conn }) => {
var fkonn = { key: { fromMe: false, participant: `0@s.whatsapp.net`, ...(m.chat ? { remoteJid: '0@s.whatsapp.net' } : {}) }, message: { contactMessage: { displayName: `${m.name}`, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;a,;;;\nFN:${m.name}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`}}}

let users = global.db.data.users[m.sender]
let time = users.lastbomb + 900000
if (new Date - users.lastbomb < 900000) throw `⏳Tunggu *${msToTime(time - new Date())}*`

conn.bomb = conn.bomb ? conn.bomb : {};
let id = m.sender,
timeout = 180000;

if (id in conn.bomb) return conn.reply(m.chat, '*^ sesi ini belum selesai!*', conn.bomb[id][0]);

const bom = ['💥', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅'].sort(() => Math.random() - 0.5);

const number = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

const array = bom.map((v, i) => ({
emot: v,
number: number[i],
position: i + 1,
state: false
}));

let teks = `乂  *B O M B*\n\nKirim angka *1* - *9* untuk membuka *9* kotak nomor di bawah ini :\n\n`;

for (let i = 0; i < array.length; i += 3) teks += array.slice(i, i + 3).map(v => v.state ? v.emot : v.number).join('') + '\n';

teks += `\nTimeout : [ *${((timeout / 1000) / 60)} menit* ]\nApabila mendapat kotak yang berisi bom maka point akan di kurangi. Ketik suren untuk menyerah.`;

let msg = await conn.sendMessage(m.chat, {
text: teks,
contextInfo: {
forwardingScore: 9999,
isForwarded: true,
}},
{ quoted: fkonn })

let { key } = msg

let v;
conn.bomb[id] = [
msg,
array,
setTimeout(() => {
conn.sendPresenceUpdate('composing', m.chat)
v = array.find(v => v.emot == '💥');
if (conn.bomb[id]) conn.reply(m.chat, `*Waktu habis!*, Bom berada di kotak nomor ${v.number}.`, conn.bomb[id][0].key);
delete conn.bomb[id];
}, timeout),
key
];

}

handler.help = ["bomb"];
handler.tags = ["game"];
handler.command = /^(bomb)$/i;
handler.premium = true
handler.private = true

module.exports = handler;

function msToTime(duration) {
    var milliseconds = parseInt((duration % 1000) / 100),
        seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

    hours = (hours < 10) ? "0" + hours : hours
    minutes = (minutes < 10) ? "0" + minutes : minutes
    seconds = (seconds < 10) ? "0" + seconds : seconds

    return seconds + " Detik"
}
