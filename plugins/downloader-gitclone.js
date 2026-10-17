let regex = /(?:https|git)(?::\/\/|@)github\.com[\/:]([^\/:]+)\/(.+)/i
let fetch = require('node-fetch')

let handler = async (m, { args, usedPrefix, command }) => {
    try {
        if (!args[0]) throw 'link githubnya mana? contoh: https://github.com/BOTCAHX/RTXZY-MD'

        if (!regex.test(args[0])) throw 'link salah!'

        let [, user, repo] = args[0].match(regex) || []
        repo = repo.replace(/.git$/, '')
        let url = `https://api.github.com/repos/${user}/${repo}/zipball`

        let headRes = await fetch(url, { method: 'HEAD' })
        if (!headRes.ok) throw `Gagal mengambil data dari GitHub! Status: ${headRes.status}`

        let disposition = headRes.headers.get('content-disposition')
        if (!disposition) throw 'Header content-disposition tidak ditemukan!'

        let filenameMatch = disposition.match(/attachment; filename=(.*)/)
        if (!filenameMatch) throw 'Nama file tidak bisa diparsing dari header!'
        
        let filename = filenameMatch[1]

        m.reply('Tunggu sebentar, sedang mengambil file...')
        await conn.sendMessage(
            m.chat,
            { document: { url: url }, mimetype: 'application/zip', fileName: filename.replace('.zip.zip', '.zip') },
            { quoted: m }
        )
    } catch (err) {
        m.reply(`Terjadi error: ${err}`)
    }
}

handler.help = ['gitclone <url>']
handler.tags = ['github']
handler.command = /gitclone/i
handler.limit = true

module.exports = handler