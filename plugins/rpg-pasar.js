let { MessageType } = require('@adiwajshing/baileys')
// Fungsi acak harga
const getPrice = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Harga Laut Acak (300 - 10000)
const Skepiting = getPrice(500, 2000)
const Slobster = getPrice(1000, 3000)
const Sudang = getPrice(300, 1500)
const Scumi = getPrice(800, 2500)
const Sgurita = getPrice(1000, 3000)
const Sbuntal = getPrice(1500, 4000)
const Sdory = getPrice(500, 2000)
const Sorca = getPrice(5000, 10000)
const Slumba = getPrice(3000, 7000)
const Spaus = getPrice(6000, 10000)
const Sikan = getPrice(300, 1000)
const Shiu = getPrice(4000, 9000)

// Harga Darat Acak (300 - 10000)
const Sbanteng = getPrice(4000, 8000)
const Sharimau = getPrice(5000, 10000)
const Sgajah = getPrice(6000, 10000)
const Skambing = getPrice(1500, 3500)
const Spanda = getPrice(4000, 9000)
const Sbuaya = getPrice(3000, 7000)
const Skerbau = getPrice(3000, 6000)
const Ssapi = getPrice(3000, 6000)
const Smonyet = getPrice(1000, 2500)
const Sbabihutan = getPrice(2000, 5000)
const Sbabi = getPrice(1500, 4000)
const Sayam = getPrice(300, 1500)


let handler  = async (m, { conn, command, args, usedPrefix, DevMode }) => {
    const _armor = global.db.data.users[m.sender].armor
    const armor = (_armor == 0 ? 20000 : '' || _armor == 1 ? 49999 : '' || _armor == 2 ? 99999 : '' || _armor == 3 ? 149999 : '' || _armor == 4 ? 299999 : '')
    let type = (args[0] || '').toLowerCase()
    let _type = (args[1] || '').toLowerCase()
    let jualbeli = (args[0] || '').toLowerCase()
    const Kchat = `━━━━━━━━━━━━━━━━━
*🌱 Hewan   | 💲 Harga Jual*
━━━━━━━━━━━━━━━━━

🦀 Kepiting:      ${Skepiting}
🦞 Lobster:       ${Slobster}
🦐 Udang:         ${Sudang}
🦑 Cumi:           ${Scumi}
🐙 Gurita:         ${Sgurita}
🐡 Buntal:         ${Sbuntal}
🐠 Dory:            ${Sdory}
🐳 Orca:            ${Sorca}
🐬 Lumba:        ${Slumba}
🐋 Paus:           ${Spaus}
🦈 Hiu:              ${Shiu}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐃 Banteng:      ${Sbanteng}
🐅 Harimau:      ${Sharimau}
🐘 Gajah:           ${Sgajah}
🐐 Kambing:     ${Skambing}
🐼 Panda:         ${Spanda}
🐃 Kerbau:        ${Skerbau}
🐊 Buaya:         ${Sbuaya}
🐂 Sapi:            ${Ssapi}
🐒 Monyet:       ${Smonyet}
🐗 Babi Hutan: ${Sbabihutan}
🐖 Babi:             ${Sbabi}
🐔 Ayam:           ${Sayam}
━━━━━━━━━━━━━━━━━
🧪 *Contoh penggunaan :*
#pasar jual ayam
#pasar jual all
`.trim()

    // Array pemetaan untuk fitur 'jual all'
    const allItems = [
        { id: 'kepiting', price: Skepiting, name: 'Kepiting' },
        { id: 'lobster', price: Slobster, name: 'Lobster' },
        { id: 'udang', price: Sudang, name: 'Udang' },
        { id: 'cumi', price: Scumi, name: 'Cumi' },
        { id: 'gurita', price: Sgurita, name: 'Gurita' },
        { id: 'buntal', price: Sbuntal, name: 'Buntal' },
        { id: 'dory', price: Sdory, name: 'Dory' },
        { id: 'orca', price: Sorca, name: 'Orca' },
        { id: 'lumba', price: Slumba, name: 'Lumba' },
        { id: 'paus', price: Spaus, name: 'Paus' },
        { id: 'ikan', price: Sikan, name: 'Ikan' },
        { id: 'hiu', price: Shiu, name: 'Hiu' },
        { id: 'banteng', price: Sbanteng, name: 'Banteng' },
        { id: 'harimau', price: Sharimau, name: 'Harimau' },
        { id: 'gajah', price: Sgajah, name: 'Gajah' },
        { id: 'kambing', price: Skambing, name: 'Kambing' },
        { id: 'panda', price: Spanda, name: 'Panda' },
        { id: 'buaya', price: Sbuaya, name: 'Buaya' },
        { id: 'kerbau', price: Skerbau, name: 'Kerbau' },
        { id: 'sapi', price: Ssapi, name: 'Sapi' },
        { id: 'monyet', price: Smonyet, name: 'Monyet' },
        { id: 'babihutan', price: Sbabihutan, name: 'Babi Hutan' },
        { id: 'babi', price: Sbabi, name: 'Babi' },
        { id: 'ayam', price: Sayam, name: 'Ayam' }
    ]

    try {
        if (/pasar|toko/i.test(command)) {
            const count = args[2] && args[2].length > 0 ? Math.min(99999999, Math.max(parseInt(args[2]), 1)) : !args[2] || args.length < 4 ? 1 : Math.min(1, count)
            switch (jualbeli) {
            case 'jual': 
                switch (_type) {                  
                    case 'all':
                        let totalTerjual = 0
                        let totalUangDapat = 0
                        let struk = ''
                        for (let item of allItems) {
                            let jumlah = global.db.data.users[m.sender][item.id] || 0
                            if (jumlah > 0) {
                                let hargaTotal = jumlah * item.price
                                global.db.data.users[m.sender].money += hargaTotal
                                global.db.data.users[m.sender][item.id] = 0 // Kuras inventory
                                totalUangDapat += hargaTotal
                                totalTerjual += jumlah
                                struk += `\n◦ ${jumlah} ${item.name} = ${hargaTotal} Money`
                            }
                        }
                        if (totalTerjual > 0) {
                            conn.reply(m.chat, `✅ *Sukses Menjual Semua Hewan!*\n${struk}\n\n💰 *Total Pendapatan:* ${totalUangDapat} Money`, m)
                        } else {
                            conn.reply(m.chat, `Kamu tidak memiliki hewan apapun di inventory untuk dijual.`, m)
                        }
                        break
                    case 'banteng':
                        if (global.db.data.users[m.sender].banteng >= count * 1) {
                            global.db.data.users[m.sender].money += Sbanteng * count
                            global.db.data.users[m.sender].banteng -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Banteng Dengan Harga ${Sbanteng * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Banteng Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'harimau':
                        if (global.db.data.users[m.sender].harimau >= count * 1) {
                            global.db.data.users[m.sender].money += Sharimau * count
                            global.db.data.users[m.sender].harimau -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Harimau Dengan Harga ${Sharimau * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Harimau Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'gajah':
                        if (global.db.data.users[m.sender].gajah >= count * 1) {
                            global.db.data.users[m.sender].money += Sgajah * count
                            global.db.data.users[m.sender].gajah -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Gajah Dengan Harga ${Sgajah * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Gajah Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'kambing':
                        if (global.db.data.users[m.sender].kambing >= count * 1) {
                            global.db.data.users[m.sender].money += Skambing * count
                            global.db.data.users[m.sender].kambing -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Kambing Dengan Harga ${Skambing * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Kambing Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'panda':
                        if (global.db.data.users[m.sender].panda >= count * 1) {
                            global.db.data.users[m.sender].money += Spanda * count
                            global.db.data.users[m.sender].panda -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Panda Dengan Harga ${Spanda * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Panda Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'buaya':
                        if (global.db.data.users[m.sender].buaya >= count * 1) {
                            global.db.data.users[m.sender].money += Sbuaya * count
                            global.db.data.users[m.sender].buaya -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Buaya Dengan Harga ${Sbuaya * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Buaya Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'kerbau':
                        if (global.db.data.users[m.sender].kerbau >= count * 1) {
                            global.db.data.users[m.sender].money += Skerbau * count
                            global.db.data.users[m.sender].kerbau -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Kerbau Dengan Harga ${Skerbau * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Kerbau Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'sapi':
                        if (global.db.data.users[m.sender].sapi >= count * 1) {
                            global.db.data.users[m.sender].money += Ssapi * count
                            global.db.data.users[m.sender].sapi -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Sapi Dengan Harga ${Ssapi * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Sapi Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'monyet':
                        if (global.db.data.users[m.sender].monyet >= count * 1) {
                            global.db.data.users[m.sender].money += Smonyet * count
                            global.db.data.users[m.sender].monyet -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Monyet Dengan Harga ${Smonyet * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Monyet Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'babi':
                        if (global.db.data.users[m.sender].babi >= count * 1) {
                            global.db.data.users[m.sender].money += Sbabi * count
                            global.db.data.users[m.sender].babi -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Babi Dengan Harga ${Sbabi * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Babi Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'babihutan':
                        if (global.db.data.users[m.sender].babihutan >= count * 1) {
                            global.db.data.users[m.sender].money += Sbabihutan * count
                            global.db.data.users[m.sender].babihutan -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Babi Hutan Dengan Harga ${Sbabihutan * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Babi Hutan Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'ayam':
                        if (global.db.data.users[m.sender].ayam >= count * 1) {
                            global.db.data.users[m.sender].money += Sayam * count
                            global.db.data.users[m.sender].ayam -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Ayam Dengan Harga ${Sayam * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Ayam Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'kepiting':
                        if (global.db.data.users[m.sender].kepiting >= count * 1) {
                            global.db.data.users[m.sender].money += Skepiting * count
                            global.db.data.users[m.sender].kepiting -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Kepiting Dengan Harga ${Skepiting * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Kepiting Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'ikan':
                        if (global.db.data.users[m.sender].ikan >= count * 1) {
                            global.db.data.users[m.sender].money += Sikan * count
                            global.db.data.users[m.sender].ikan -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Ikan Dengan Harga ${Sikan * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Ikan Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'dory':
                        if (global.db.data.users[m.sender].dory >= count * 1) {
                            global.db.data.users[m.sender].money += Sdory * count
                            global.db.data.users[m.sender].dory -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Ikan Dory Dengan Harga ${Sdory * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Ikan Dory Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'gurita':
                        if (global.db.data.users[m.sender].gurita >= count * 1) {
                            global.db.data.users[m.sender].money += Sgurita * count
                            global.db.data.users[m.sender].gurita -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Gurita Dengan Harga ${Sgurita * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Gurita Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'buntal':
                        if (global.db.data.users[m.sender].buntal >= count * 1) {
                            global.db.data.users[m.sender].money += Sbuntal * count
                            global.db.data.users[m.sender].buntal -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Ikan Buntal Dengan Harga ${Sbuntal * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Ikan Buntal Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'hiu':
                        if (global.db.data.users[m.sender].hiu >= count * 1) {
                            global.db.data.users[m.sender].money += Shiu * count
                            global.db.data.users[m.sender].hiu -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Hiu Dengan Harga ${Shiu * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Hiu Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'orca':
                        if (global.db.data.users[m.sender].orca >= count * 1) {
                            global.db.data.users[m.sender].money += Sorca * count
                            global.db.data.users[m.sender].orca -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Paus Orca Dengan Harga ${Sorca * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Paus Orca Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'lumba':
                        if (global.db.data.users[m.sender].lumba >= count * 1) {
                            global.db.data.users[m.sender].money += Slumba * count
                            global.db.data.users[m.sender].lumba -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Lumba Lumba Dengan Harga ${Slumba * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Lumba Lumba Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'paus':
                        if (global.db.data.users[m.sender].paus >= count * 1) {
                            global.db.data.users[m.sender].money += Spaus * count
                            global.db.data.users[m.sender].paus -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Paus Dengan Harga ${Spaus * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Paus Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'lobster':
                        if (global.db.data.users[m.sender].lobster >= count * 1) {
                            global.db.data.users[m.sender].money += Slobster * count
                            global.db.data.users[m.sender].lobster -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Lobster Dengan Harga ${Slobster * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Lobster Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'udang':
                        if (global.db.data.users[m.sender].udang >= count * 1) {
                            global.db.data.users[m.sender].money += Sudang * count
                            global.db.data.users[m.sender].udang -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Udang Dengan Harga ${Sudang * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Udang Kamu Tidak Cukup`.trim(), m)
                        break
                    case 'cumi':
                        if (global.db.data.users[m.sender].cumi >= count * 1) {
                            global.db.data.users[m.sender].money += Scumi * count
                            global.db.data.users[m.sender].cumi -= count * 1
                            conn.reply(m.chat, `Sukses Menjual ${count} Cumi Dengan Harga ${Scumi * count} Money `.trim(), m)
                        } else conn.reply(m.chat, `Cumi Kamu Tidak Cukup`.trim(), m)
                        break
                    default:
                        return conn.reply(m.chat, Kchat, m)
                }
                break
            default:
                return conn.reply(m.chat, Kchat, m)
            }
        } else if (/sell|jual/i.test(command)) {
            const count = args[1] && args[1].length > 0 ? Math.min(99999999, Math.max(parseInt(args[1]), 1)) : !args[1] || args.length < 3 ? 1 : Math.min(1, count)
            switch (type) { 
                case 'all':
                    let totalTerjual = 0
                    let totalUangDapat = 0
                    let struk = ''
                    for (let item of allItems) {
                        let jumlah = global.db.data.users[m.sender][item.id] || 0
                        if (jumlah > 0) {
                            let hargaTotal = jumlah * item.price
                            global.db.data.users[m.sender].money += hargaTotal
                            global.db.data.users[m.sender][item.id] = 0
                            totalUangDapat += hargaTotal
                            totalTerjual += jumlah
                            struk += `\n◦ ${jumlah} ${item.name} = ${hargaTotal} Money`
                        }
                    }
                    if (totalTerjual > 0) {
                        conn.reply(m.chat, `✅ *Sukses Menjual Semua Hewan!*\n${struk}\n\n💰 *Total Pendapatan:* ${totalUangDapat} Money`, m)
                    } else {
                        conn.reply(m.chat, `Kamu tidak memiliki hewan apapun di inventory untuk dijual.`, m)
                    }
                    break
                case 'banteng':
                    if (global.db.data.users[m.sender].banteng >= count * 1) {
                        global.db.data.users[m.sender].money += Sbanteng * count
                        global.db.data.users[m.sender].banteng -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Banteng Dengan Harga ${Sbanteng * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Banteng Kamu Tidak Cukup`.trim(), m)
                    break
                case 'harimau':
                    if (global.db.data.users[m.sender].harimau >= count * 1) {
                        global.db.data.users[m.sender].money += Sharimau * count
                        global.db.data.users[m.sender].harimau -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Harimau Dengan Harga ${Sharimau * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Harimau Kamu Tidak Cukup`.trim(), m)
                    break
                case 'gajah':
                    if (global.db.data.users[m.sender].gajah >= count * 1) {
                        global.db.data.users[m.sender].money += Sgajah * count
                        global.db.data.users[m.sender].gajah -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Gajah Dengan Harga ${Sgajah * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Gajah Kamu Tidak Cukup`.trim(), m)
                    break
                case 'kambing':
                    if (global.db.data.users[m.sender].kambing >= count * 1) {
                        global.db.data.users[m.sender].money += Skambing * count
                        global.db.data.users[m.sender].kambing -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Kambing Dengan Harga ${Skambing * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Kambing Kamu Tidak Cukup`.trim(), m)
                    break
                case 'panda':
                    if (global.db.data.users[m.sender].panda >= count * 1) {
                        global.db.data.users[m.sender].money += Spanda * count
                        global.db.data.users[m.sender].panda -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Panda Dengan Harga ${Spanda * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Panda Kamu Tidak Cukup`.trim(), m)
                    break
                case 'buaya':
                    if (global.db.data.users[m.sender].buaya >= count * 1) {
                        global.db.data.users[m.sender].money += Sbuaya * count
                        global.db.data.users[m.sender].buaya -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Buaya Dengan Harga ${Sbuaya * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Buaya Kamu Tidak Cukup`.trim(), m)
                    break
                case 'kerbau':
                    if (global.db.data.users[m.sender].kerbau >= count * 1) {
                        global.db.data.users[m.sender].money += Skerbau * count
                        global.db.data.users[m.sender].kerbau -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Kerbau Dengan Harga ${Skerbau * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Kerbau Kamu Tidak Cukup`.trim(), m)
                    break
                case 'sapi':
                    if (global.db.data.users[m.sender].sapi >= count * 1) {
                        global.db.data.users[m.sender].money += Ssapi * count
                        global.db.data.users[m.sender].sapi -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Sapi Dengan Harga ${Ssapi * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Sapi Kamu Tidak Cukup`.trim(), m)
                    break
                case 'monyet':
                    if (global.db.data.users[m.sender].monyet >= count * 1) {
                        global.db.data.users[m.sender].money += Smonyet * count
                        global.db.data.users[m.sender].monyet -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Monyet Dengan Harga ${Smonyet * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Monyet Kamu Tidak Cukup`.trim(), m)
                    break
                case 'babi':
                    if (global.db.data.users[m.sender].babi >= count * 1) {
                        global.db.data.users[m.sender].money += Sbabi * count
                        global.db.data.users[m.sender].babi -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Babi Dengan Harga ${Sbabi * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Babi Kamu Tidak Cukup`.trim(), m)
                    break
                case 'babihutan':
                    if (global.db.data.users[m.sender].babihutan >= count * 1) {
                        global.db.data.users[m.sender].money += Sbabihutan * count
                        global.db.data.users[m.sender].babihutan -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Babi Hutan Dengan Harga ${Sbabihutan * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Babi Hutan Kamu Tidak Cukup`.trim(), m)
                    break
                case 'ayam':
                    if (global.db.data.users[m.sender].ayam >= count * 1) {
                        global.db.data.users[m.sender].money += Sayam * count
                        global.db.data.users[m.sender].ayam -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Ayam Dengan Harga ${Sayam * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Ayam Kamu Tidak Cukup`.trim(), m)
                    break
                case 'kepiting':
                    if (global.db.data.users[m.sender].kepiting >= count * 1) {
                        global.db.data.users[m.sender].money += Skepiting * count
                        global.db.data.users[m.sender].kepiting -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Kepiting Dengan Harga ${Skepiting * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Kepiting Kamu Tidak Cukup`.trim(), m)
                    break
                case 'ikan':
                    if (global.db.data.users[m.sender].ikan >= count * 1) {
                        global.db.data.users[m.sender].money += Sikan * count
                        global.db.data.users[m.sender].ikan -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Ikan Dengan Harga ${Sikan * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Ikan Kamu Tidak Cukup`.trim(), m)
                    break
                case 'dory':
                    if (global.db.data.users[m.sender].dory >= count * 1) {
                        global.db.data.users[m.sender].money += Sdory * count
                        global.db.data.users[m.sender].dory -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Ikan Dory Dengan Harga ${Sdory * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Ikan Dory Kamu Tidak Cukup`.trim(), m)
                    break
                case 'gurita':
                    if (global.db.data.users[m.sender].gurita >= count * 1) {
                        global.db.data.users[m.sender].money += Sgurita * count
                        global.db.data.users[m.sender].gurita -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Gurita Dengan Harga ${Sgurita * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Gurita Kamu Tidak Cukup`.trim(), m)
                    break
                case 'buntal':
                    if (global.db.data.users[m.sender].buntal >= count * 1) {
                        global.db.data.users[m.sender].money += Sbuntal * count
                        global.db.data.users[m.sender].buntal -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Ikan Buntal Dengan Harga ${Sbuntal * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Ikan Buntal Kamu Tidak Cukup`.trim(), m)
                    break
                case 'hiu':
                    if (global.db.data.users[m.sender].hiu >= count * 1) {
                        global.db.data.users[m.sender].money += Shiu * count
                        global.db.data.users[m.sender].hiu -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Hiu Dengan Harga ${Shiu * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Hiu Kamu Tidak Cukup`.trim(), m)
                    break
                case 'orca':
                    if (global.db.data.users[m.sender].orca >= count * 1) {
                        global.db.data.users[m.sender].money += Sorca * count
                        global.db.data.users[m.sender].orca -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Paus Orca Dengan Harga ${Sorca * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Paus Orca Kamu Tidak Cukup`.trim(), m)
                    break
                case 'lumba':
                    if (global.db.data.users[m.sender].lumba >= count * 1) {
                        global.db.data.users[m.sender].money += Slumba * count
                        global.db.data.users[m.sender].lumba -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Lumba Lumba Dengan Harga ${Slumba * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Lumba Lumba Kamu Tidak Cukup`.trim(), m)
                    break
                case 'paus':
                    if (global.db.data.users[m.sender].paus >= count * 1) {
                        global.db.data.users[m.sender].money += Spaus * count
                        global.db.data.users[m.sender].paus -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Paus Dengan Harga ${Spaus * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Paus Kamu Tidak Cukup`.trim(), m)
                    break
                case 'lobster':
                    if (global.db.data.users[m.sender].lobster >= count * 1) {
                        global.db.data.users[m.sender].money += Slobster * count
                        global.db.data.users[m.sender].lobster -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Lobster Dengan Harga ${Slobster * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Lobster Kamu Tidak Cukup`.trim(), m)
                    break
                case 'udang':
                    if (global.db.data.users[m.sender].udang >= count * 1) {
                        global.db.data.users[m.sender].money += Sudang * count
                        global.db.data.users[m.sender].udang -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Udang Dengan Harga ${Sudang * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Udang Kamu Tidak Cukup`.trim(), m)
                    break
                case 'cumi':
                    if (global.db.data.users[m.sender].cumi >= count * 1) {
                        global.db.data.users[m.sender].money += Scumi * count
                        global.db.data.users[m.sender].cumi -= count * 1
                        conn.reply(m.chat, `Sukses Menjual ${count} Cumi Dengan Harga ${Scumi * count} Money `.trim(), m)
                    } else conn.reply(m.chat, `Cumi Kamu Tidak Cukup`.trim(), m)
                    break                                        
                default:
                    return conn.reply(m.chat, Kchat, m)
            }
        }
    } catch (e) {
        conn.reply(m.chat, Kchat, m)
        console.log(e)
        if (DevMode) {
            for (let jid of global.owner.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').filter(v => v != conn.user.jid)) {
                conn.sendMessage(jid, 'shop.js error\nNo: *' + m.sender.split`@`[0] + '*\nCommand: *' + m.text + '*\n\n*' + e + '*', MessageType.text)
            }
        }
    }
}

handler.help = ['pasar *<sell>|<args>*']
handler.tags = ['rpg']
handler.group = true
handler.command = /^(pasar|jual)$/i
module.exports = handler
