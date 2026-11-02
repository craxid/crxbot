const fetch = require('node-fetch')

const HOST = 'play.ncnl.eu.cc'
const PORT = 19132

let handler = async (m, { conn }) => {
    let thumb = 'https://telegra.ph/file/016c521fb63069af28cec.jpg'

    // React loading
    await conn.sendMessage(m.chat, { react: { text: '👾', key: m.key } })

    // Timestamp biar pesan ga dianggap spam
    let timestamp = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    })

    let bersih = (x) => Array.isArray(x) ? x.join(' ') : (x || '-')
    let modeList = ['Survival', 'Creative', 'Adventure']

    // nama pemain diambil dari bridge konsol server sendiri (perintah list)
    async function ambilNamaPemain() {
        let opsi = { timeout: 8000, headers: { 'X-Token': global.ncnlToken || '' } }
        for (let coba = 0; coba < 2; coba++) {
            try {
                let r = await fetch(`http://${HOST}:19134/players`, opsi)
                let b = await r.json()
                if (b && Array.isArray(b.players)) return b.players
            } catch (e) { /* gagal, coba sekali lagi */ }
            await new Promise(res => setTimeout(res, 1500))
        }
        return null
    }

    // server sekarang transportnya nethernet, ceknya lewat /v1/join
    async function cekNetherNet() {
        let mulai = Date.now()
        let res = await fetch(`http://${HOST}:${PORT}/v1/join`, { timeout: 10000 })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        let j = await res.json()
        return {
            versi: j.version,
            dunia: j.level,
            mode: modeList[j.gameType] || '-',
            pemain: `${j.players}/${j.maxPlayers}`,
            ping: Date.now() - mulai,
            transport: 'NetherNet'
        }
    }

    // cadangan buat jaga-jaga kalo server balik ke raknet lagi
    async function cekRakNet() {
        let mulai = Date.now()
        let res = await fetch(`https://api.mcsrvstat.us/bedrock/3/${HOST}:${PORT}`, { timeout: 15000 })
        let s = await res.json()
        let ping = Date.now() - mulai
        if (!s || !s.online) return { offline: true, ping }
        return {
            versi: s.version,
            dunia: s.map ? bersih(s.map.clean) : '-',
            mode: s.gamemode || '-',
            pemain: s.players ? `${s.players.online}/${s.players.max}` : '-',
            ping,
            transport: 'RakNet'
        }
    }

    try {
        let hasil = null
        let pingOffline = 0
        try {
            hasil = await cekNetherNet()
        } catch (e) {
            let cadangan = await cekRakNet().catch(() => ({ offline: true, ping: 0 }))
            if (!cadangan.offline) hasil = cadangan
            else pingOffline = cadangan.ping
        }

        if (!hasil) {
            let offlineMsg = `
${global.htki} *NCNL Minecraft* ${global.htka}
${global.gz} *Status:* Offline
${global.gz} *Ping:* ${pingOffline} ms
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${HOST}
${global.gz} *Port:* ${PORT}
${global.sb}

🕒 *Diperbarui:* ${timestamp} WIB`.trim()

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
            return conn.sendMessage(m.chat, {
                image: { url: thumb },
                caption: offlineMsg,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true
                }
            }, { quoted: m })
        }

        let jumlah = parseInt(String(hasil.pemain).split('/')[0]) || 0
        let barisNama
        if (jumlah === 0) {
            barisNama = `${global.gz} *Pemain Online:* Tidak ada`
        } else {
            let nama = await ambilNamaPemain()
            if (nama && nama.length) barisNama = `${global.gz} *Pemain Online:*\n${nama.map(n => `${global.gy} ${n}`).join('\n')}`
            else barisNama = `${global.gz} *Pemain Online:* ${jumlah} orang (nama tidak tersedia)`
        }

        let onlineMsg = `
${global.htki} *NCNL Minecraft* ${global.htka}
${global.gz} *Status:* Online
${global.gz} *Versi:* ${hasil.versi || 'Tidak Diketahui'}
${global.gz} *Nama Dunia:* ${hasil.dunia || 'Tidak Diketahui'}
${global.gz} *Mode:* ${hasil.mode || 'Tidak Diketahui'}
${global.gz} *Pemain:* ${hasil.pemain}
${global.gz} *Ping:* ${hasil.ping} ms
${global.gz} *Transport:* ${hasil.transport}
${barisNama}
${global.sb}

${global.htki} *HOST & PORT* ${global.htka}
${global.gz} *Host:* ${HOST}
${global.gz} *Port:* ${PORT}
${global.sb}

🕒 *Diperbarui:* ${timestamp} WIB`.trim()

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
        await conn.sendMessage(m.chat, {
            image: { url: thumb },
            caption: onlineMsg,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: m })

    } catch (err) {
        console.error("Error fetching server status:", err)
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        m.reply('Terjadi kesalahan saat mengambil data dari API server.')
    }
}

handler.help = ['ncnl']
handler.customPrefix = /^ncnl$/i
handler.command = new RegExp
handler.group = true

module.exports = handler
