// family100 - game survei, soalnya ngambil dari scraper bochilteam
let { family100 } = require('@bochilteam/scraper')
let winScore = 500
let rewardAmount = 100

async function handler(m, { conn }) {
    conn.family = conn.family || {}
    let id = m.chat

    if (id in conn.family) {
        // masih ada sesi yang jalan, jangan numpuk
        if (conn.family[id].msg !== undefined)
            return conn.reply(m.chat, 'Masih ada kuis yang belum terjawab di chat ini\nTunggu 3 menit untuk mengakhiri', conn.family[id].msg)
        delete conn.family[id]
        throw false
    }

    // ambil soal random
    let json = await family100()

    let caption = `
┌─⊷ *FAMILY 100*
▢ *Soal:* ${json.soal}
▢ Terdapat *${json.jawaban.length}* jawaban${json.jawaban.find(v => v.includes(' ')) ? `
▢ (beberapa jawaban ada spasinya)` : ''}
▢ Waktu 3 menit, ketik *nyerah* buat menyerah
└──────────────

+${rewardAmount} Money! tiap jawaban benar
    `.trim()

    let msg = await m.reply(caption)
    conn.family[id] = {
        ...json,
        msg,
        terjawab: Array.from(json.jawaban, () => false),
        winScore,
        rewardAmount,
        timeout: setTimeout(() => {
            if (conn.family[id]) {
                conn.reply(m.chat, 'Waktu habis! Game berakhir.', conn.family[id].msg)
                delete conn.family[id]
            }
        }, 180000) // 3 menit
    }
}

handler.help = ['family100']
handler.tags = ['game']
handler.group = true
handler.register = true
handler.command = /^family100$/i

handler.nyerah = async function (m, { conn }) {
    let id = m.chat
    if (id in conn.family) {
        conn.reply(m.chat, 'Permainan berakhir karena kamu menyerah.', conn.family[id].msg)
        clearTimeout(conn.family[id].timeout)
        delete conn.family[id]
    } else {
        conn.reply(m.chat, 'Tidak ada permainan yang sedang berlangsung.', m)
    }
}

module.exports = handler
