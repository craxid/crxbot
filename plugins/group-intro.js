let handler = async m => {
  // Ambil teks setelah perintah
  let text = m.text.split(' ').slice(1).join(' ')
  if (!text) {
    return m.reply(`Silakan isi data dengan format:\nintro Nama|Gender|Umur|Hobby|Kelas|Asal|Agama|Status`)
}

  let [nama, gender, umur, hobby, kelas, asal, agama, status] = text.split('|').map(v => v.trim())

  if ([nama, gender, umur, hobby, kelas, asal, agama, status].includes(undefined)) {
    return m.reply(`Format tidak lengkap. Gunakan format:\nintro Nama|Gender|Umur|Hobby|Kelas|Asal|Agama|Status`)
}

  let intro = `╭─── *「 Kartu Intro 」*
│
│ *Nama:* ${nama}
│ *Gender:* ${gender}
│ *Umur:* ${umur}
│ *Hobby:* ${hobby}
│ *Kelas:* ${kelas}
│ *Asal:* ${asal}
│ *Agama:* ${agama}
│ *Status:* ${status}
╰──────────────`

  m.reply(intro)
}

handler.command = /^(intro)$/i

module.exports = handler