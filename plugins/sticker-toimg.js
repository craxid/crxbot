const { format } = require('util')
const { webp2mp4 } = require('../lib/webp2mp4')
const sharp = require('sharp') // Import library sharp

let handler = async (m, { conn, command, usedPrefix }) => {
    let q = m.quoted
    
    if (q && /sticker/.test(q.mtype)) {
        let isImg = /^(toim(g|age))$/i.test(command)
        let isVid = /^(tovid|tomp4|togif)$/i.test(command)
        
        let isAnimated = q.isAnimated || (q.msg && q.msg.isAnimated) || false

        // --- JIKA COMMAND: .toimg / .toimage ---
        if (isImg) {
            if (isAnimated) return m.reply(`Gunakan *${usedPrefix}togif* atau *${usedPrefix}tovid* untuk stiker bergerak`)
            
            try {
                let img = await q.download()
                // Menggunakan sharp untuk konversi buffer webp ke png
                let bufferPng = await sharp(img).png().toBuffer()
                
                await conn.sendFile(m.chat, bufferPng, 'image.png', '*DONE*', m)
            } catch (e) {
                console.error(e)
                m.reply('Gagal mengonversi gambar menggunakan Sharp: ' + e.message)
            }
        } 
        // --- JIKA COMMAND: .tovid / .tomp4 / .togif ---
        else if (isVid) {
            try {
                let media = await q.download()
                let out = await webp2mp4(media)
                let isGif = /gif/i.test(command) 
                
                await conn.sendMessage(m.chat, { 
                    video: { url: out }, 
                    gifPlayback: isGif, 
                    caption: '*DONE*' 
                }, { quoted: m })
            } catch (e) {
                console.error(e)
                m.reply(`Gagal mengonversi stiker: ${e.message}`)
            }
        }
    } else return m.reply('Reply / tag Sticker')
}

handler.help = ['toimg', 'tovid', 'togif']
handler.tags = ['sticker']
handler.command = /^(toim(g|age)|tovid|tomp4|togif)$/i

module.exports = handler