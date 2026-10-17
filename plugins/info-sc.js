let handler = async (m, { conn }) => {
let ye = `@${m.sender.split`@`[0]}`
let esce = `
Halo kak ${ye}, Bot ini menggunakan script yang sudah dimodifikasi dari :\n• https://github.com/craxid/crxbot
`
m.reply(esce)
}
handler.help = ['sc', 'sourcecode']
handler.tags = ['info']
handler.command = /^(sc|sourcecode)$/i

module.exports = handler