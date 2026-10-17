let handler = m => m

handler.before = async function (m) {
  if (m.mtype === 'text' && m.text === '') {
    const mention = `@${m.sender.split`@`[0]}`
    await m.reply(`Pesan kosong tidak diizinkan maka dari itu ${mention}  akan di kick!`)
    await this.groupRemoveParticipant(m.chat, [m.sender])
  }
}

module.exports = handler