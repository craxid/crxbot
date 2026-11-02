let handler = async (m, { conn, isOwner, isAdmin }) => {
  // datanya lumayan sensitif, khusus admin grup & owner bot aja
  if (!isOwner && !isAdmin) throw '❌ Perintah ini hanya bisa dipakai oleh admin grup atau owner bot!'

  m.reply(wait)

  let groups
  try {
    groups = Object.values(await conn.groupFetchAllParticipating())
  } catch (e) {
    console.error(e)
    throw '❌ Gagal mengambil daftar grup dari server WhatsApp.'
  }
  if (!groups.length) throw 'Bot belum masuk ke grup mana pun.'

  // urutin dari yang anggotanya paling rame
  groups.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0))

  // identitas bot ada dua bentuk sekarang: nomor hp (PN) & LID, samain dua-duanya
  const idBot = new Set([conn.user?.id, conn.user?.lid, conn.user?.jid].filter(Boolean).map(j => j.split('@')[0].split(':')[0]))
  const cachePN = new Map()
  // bot sendiri udah pasti tau pasangannya, tanam duluan biar ga ikut nyasar
  if (conn.user?.id && conn.user?.lid) cachePN.set(conn.user.lid.split(':')[0] + '@lid', rapikan(conn.user.id))

  let blok = [{ teks: `*DAFTAR SEMUA GRUP BOT*\nTotal: *${groups.length} grup*`, tag: [] }]
  let no = 0
  for (let g of groups) {
    no++
    let member = g.participants || []
    let admins = member.filter(p => p.admin)
    let botEntry = member.find(p => idBot.has((p.id || '').split('@')[0].split(':')[0]) || (p.phoneNumber && idBot.has(p.phoneNumber.split('@')[0].split(':')[0])))
    let botAdmin = !!(botEntry && botEntry.admin)
    let dibuat = g.creation ? new Date(g.creation * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'

    let tag = []
    let txt = `${no}. *${g.subject || '(tanpa nama)'}*\n`
    txt += `   ID: ${g.id}\n`
    txt += `   Anggota: ${member.length} | Bot: ${botAdmin ? 'Admin' : 'Anggota biasa'} | Dibuat: ${dibuat}\n`

    // link undangan cuma bisa diambil kalo botnya admin di grup itu
    let link = g.inviteCode ? `https://chat.whatsapp.com/${g.inviteCode}` : null
    if (!link && botAdmin) {
      try { link = `https://chat.whatsapp.com/${await conn.groupInviteCode(g.id)}` } catch { link = null }
    }
    txt += `   Link: ${link || '-'}\n`

    // pemilik grup, utamain ownerPn kalo ada
    let pemilikJid = g.ownerPn ? rapikan(g.ownerPn) : await kePN(conn, { id: g.owner }, cachePN)
    if (pemilikJid) {
      txt += `   Pemilik grup: ${await tampilNama(conn, pemilikJid, tag)}\n`
    } else if (g.owner) {
      txt += `   Pemilik grup: ${g.owner.split('@')[0]}\n`
    }

    let listAdmin = []
    for (let a of admins) {
      let pn = await kePN(conn, a, cachePN)
      listAdmin.push(pn ? await tampilNama(conn, pn, tag) : (a.id || '').split('@')[0])
    }
    txt += `   Admin (${admins.length}): ${listAdmin.join(', ') || '-'}`
    blok.push({ teks: txt, tag })
  }

  // kirim per potongan, satu pesan kepanjangan rawan gagal
  let potong = [], isi = null
  for (let b of blok) {
    if (isi && (isi.teks + '\n\n' + b.teks).length > 3000) { potong.push(isi); isi = null }
    if (!isi) isi = { teks: b.teks, tag: [...b.tag] }
    else { isi.teks += '\n\n' + b.teks; isi.tag.push(...b.tag) }
  }
  if (isi) potong.push(isi)

  for (let i = 0; i < potong.length; i++) {
    let p = potong[i]
    let mentions = [...new Set(p.tag)]
    if (i === 0) await conn.reply(m.chat, p.teks, m, { mentions })
    else await conn.sendMessage(m.chat, { text: p.teks, mentions })
  }
}

// samakan jid jadi bentuk 62xxx@s.whatsapp.net
function rapikan(jid) {
  return jid.split('@')[0].split(':')[0] + '@s.whatsapp.net'
}

// ubah peserta (yg id-nya bisa LID) jadi nomor hp asli
async function kePN(conn, p, cache) {
  if (!p) return null
  if (p.phoneNumber) return rapikan(p.phoneNumber)
  let id = p.id || ''
  if (id.endsWith('@s.whatsapp.net')) return rapikan(id)
  if (id.endsWith('@lid')) {
    let kunci = id.replace(/:\d+@/, '@')
    if (cache.has(kunci)) return cache.get(kunci)
    let pn = null
    try { pn = await conn.signalRepository?.lidMapping?.getPNForLID?.(id) } catch {}
    let hasil = pn ? rapikan(pn) : null
    cache.set(kunci, hasil)
    return hasil
  }
  return null
}

// tampilkan @nomor (+ nama kontak kalo ada) dan daftarkan ke mentions
async function tampilNama(conn, jidPN, tag) {
  let nomor = jidPN.split('@')[0]
  tag.push(jidPN)
  try {
    let n = await conn.getName(jidPN)
    return n && !n.includes('@') && n !== nomor ? `@${nomor} (${n})` : `@${nomor}`
  } catch {
    return `@${nomor}`
  }
}

handler.help = ['listgrupbot']
handler.tags = ['group']
handler.command = ['listgrupbot', 'daftargrup', 'grupbot']
handler.limit = false

module.exports = handler
