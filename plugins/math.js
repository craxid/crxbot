let handler = async (m, { conn, args, usedPrefix, command }) => {
    conn.math = conn.math ? conn.math : {}
    
    if (args.length < 1) throw `
  🧮 Kesulitan yang tersedia : 
  
${Object.keys(modes).join(' | ')} 

_📌 Contoh : ${usedPrefix+command} normal_
`.trim()
  let mode = args[0].toLowerCase()
  if (!(mode in modes)) throw `
  🧮 Kesulitan yang tersedia : 
  
 ${Object.keys(modes).join(' | ')}

_📌 Contoh : ${usedPrefix+command} normal_
`.trim()
    
  let id = m.chat
    if (id in conn.math) return conn.reply(m.chat, '⚠️ Masih ada pertanyaan yang belum terjawab dalam obrolan ini', conn.math[id][0])
    let math = genMath(mode)
await conn.sendPresenceUpdate('composing', m.chat)
    conn.math[id] = [
        await conn.reply(m.chat, `▢ Jawab matematika berikut

 *${math.str}*= \n\n_Waktu:_ ${(math.time / 1000).toFixed(2)} detik\n\n🎁 Reward : Rp ${math.bonus}`, m),
        math, 4,
        setTimeout(() => {
            if (conn.math[id]) conn.reply(m.chat, `⏳ Waktu habis\nJawabannya adalah : *${math.result}*`, conn.math[id][0])
      delete conn.math[id]
        }, math.time)
    ]
}
handler.help = ['matematika','math']
handler.tags = ['game']
handler.group = true
handler.register = true
handler.command = ['mates', 'mate', 'matematika', 'math'] 

let modes = {
  // Durasi (ms) dipersingkat agar lebih mepet
  noob: [-3, 3, -3, 3, '+-', 10000, 100],            // 10 detik, Rp 100
  mudah: [-10, 10, -10, 10, '*/+-', 15000, 500],     // 15 detik, Rp 500
  normal: [-40, 40, -20, 20, '*/+-', 20000, 2500],   // 20 detik, Rp 2.500
  susah: [-100, 100, -70, 70, '*/+-', 25000, 10000], // 25 detik, Rp 10.000
  sulit: [-999999, 999999, -999999, 999999, '*/', 30000, 25000], // 30 detik, Rp 25.000
  impossible: [-99999999999, 99999999999, -99999999999, 999999999999, '*/', 35000, 50000], // 35 detik, Rp 50.000
  god: [-999999999999999, 999999999999999, -999, 999, '/', 8000, 100000] // 8 detik, Rp 100.000
}

let operators = {
    '+': '+',
    '-': '-',
    '*': '×',
    '/': '÷'
}

function genMath(mode) {
    let [a1, a2, b1, b2, ops, time, bonus] = modes[mode]
    let a = randomInt(a1, a2)
    let b = randomInt(b1, b2)
    let op = pickRandom([...ops])
    let result = (new Function(`return ${a} ${op.replace('/', '*')} ${b < 0 ? `(${b})` : b}`))()
    if (op == '/') [a, result] = [result, a]
    return {
        str: `${a} ${operators[op]} ${b}`,
        mode,
        time,
        bonus,
        result
    }
}

function randomInt(from, to) {
    if (from > to) [from, to] = [to, from]
    from = Math.floor(from)
    to = Math.floor(to)
    return Math.floor((to - from) * Math.random() + from)
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}

handler.modes = modes

module.exports = handler