// antispam perintah: user yg spam command >3x dalam 10 detik dikasih peringatan
let handler = m => m

handler.all = async function (m) {
    if (!m.text || m.fromMe) return
    // owner bebas, gak dihitung spam
    if (Array.isArray(global.owner) && global.owner.includes(m.sender.split('@')[0])) return

    // cuma perintah yg dihitung, chat biasa dilewatin
    let prefix = global.prefix
    let isCmd = prefix instanceof RegExp ? prefix.test(m.text)
        : Array.isArray(prefix) ? prefix.some(p => m.text.startsWith(p))
        : typeof prefix === 'string' && prefix ? m.text.startsWith(prefix)
        : /^[.]/.test(m.text)
    if (!isCmd) return

    this.antispam = this.antispam || {}
    let now = Date.now()
    let rec = this.antispam[m.sender]

    if (rec && now - rec.last < 10000) {
        rec.count++
        if (rec.count > 3) {
            await m.reply('Jangan spam, beri jeda 10 detik!')
            rec.count = 0
            rec.last = now
        }
    } else {
        this.antispam[m.sender] = { count: 1, last: now }
    }
}

module.exports = handler
