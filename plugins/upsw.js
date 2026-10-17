const colors = ['#26c4dc', '#792138', '#8b6990', '#f0b330', '#ae8774', '#5696ff', '#ff7b6b', '#57c9ff'];

let handler = async (m, { conn, text }) => {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || '';
    let jid = 'status@broadcast';
    let botJid = conn.decodeJid ? conn.decodeJid(conn.user.id) : conn.user.id.split(':')[0] + '@s.whatsapp.net';
    let allContacts = [];
    allContacts.push(...Object.keys(conn.chats || {}));
    if (global.db && global.db.data && global.db.data.users) {
        allContacts.push(...Object.keys(global.db.data.users));
    }
    for (let id of Object.keys(conn.chats || {})) {
        if (id.endsWith('@g.us') && conn.chats[id].participants) {
            let members = conn.chats[id].participants.map(v => v.id || v);
            allContacts.push(...members);
        }
    }
    let participant = [...new Set(allContacts)].filter(v => v && v.endsWith('@s.whatsapp.net'));
    if (!participant.includes(m.sender)) participant.push(m.sender);
    if (!participant.includes(botJid)) participant.push(botJid);
    try {
        if (/image|video/.test(mime)) {
            let media = await q.download();
            if (!media) throw 'Gagal mengunduh media.';
            let caption = text || q.text || '';
            await conn.sendMessage(jid, {
                [/image/.test(mime) ? 'image' : 'video']: media,
                caption: caption
            }, { statusJidList: participant });
            m.reply('Done! Status media terkirim ke ' + participant.length + ' kontak.');
        } else if (text || (m.quoted && m.quoted.text)) {
            let txt = text || m.quoted.text;
            await conn.sendMessage(jid, { text: txt }, {
                statusJidList: participant,
                backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                font: 1
            });
            m.reply('Done! Status teks terkirim ke ' + participant.length + ' kontak.');
        } else {
            m.reply('Masukkan teks atau reply media yang ingin dijadikan status.');
        }
    } catch (e) {
        console.error(e);
        m.reply('Error: ' + (e.message || e));
    }
};

handler.help = ['upsw <text|reply>'];
handler.tags = ['owner'];
handler.command = /^upsw$/i;
handler.owner = true;
module.exports = handler;
