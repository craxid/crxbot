const fetch = require('node-fetch');

// API gratis nekos.best, tanpa apikey
// https://nekos.best/api/v2/{waifu|neko|kitsune|husbando}

var handler = async (m, { conn, command }) => {
    m.reply(wait);
    try {
        let res = await fetch(`https://nekos.best/api/v2/${command}`);
        if (!res.ok) throw 'API error';
        let json = await res.json();
        let url = json.results && json.results[0] && json.results[0].url;
        if (!url) throw 'Gambar tidak ketemu';

        setTimeout(() => {
            conn.sendPresenceUpdate('composing', m.chat);
            conn.sendMessage(m.chat, { image: { url }, caption: `Random ${command}\n©CraXID Bot`, mimetype: 'image/jpeg', fileName: 'anime.jpg' }, { quoted: m });
        }, 3000);

    } catch (e) {
        conn.reply(m.chat, eror, m);
    }
}

handler.command = handler.help = ['waifu', 'neko', 'kitsune', 'husbando'];
handler.tags = ['image'];
handler.limit = true;
module.exports = handler;
