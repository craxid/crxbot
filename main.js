// main.js - direkonstruksi dari versi obfuscate (16 Okt 2026)
// Entry point bot: koneksi Baileys, database, plugin loader, pairing code.

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1'

require('./config')

;(async () => {
  // Baileys dimuat dinamis biar gampang ganti versi tanpa ubah kode inti
  const { loadBaileys } = await import('./baileys-loader.mjs')
  const baileys = await loadBaileys()
  const {
    useMultiFileAuthState, DisconnectReason,
    generateForwardMessageContent, prepareWAMessageMedia,
    generateWAMessageFromContent, generateMessageID,
    downloadContentFromMessage, makeCacheableSignalKeyStore,
    makeInMemoryStore, jidDecode, fetchLatestBaileysVersion,
    proto, Browsers,
  } = baileys

  const NodeCache = require('node-cache')
  const pino = require('pino')
  const WS = require('ws')
  const path = require('path')
  const fs = require('fs')
  const os = require('os')
  const yargs = require('yargs/yargs')
  const childProcess = require('child_process')
  const lodash = require('lodash')
  const syntaxError = require('syntax-error')
  const nodeFetch = require('node-fetch')
  const chalk = require('chalk')
  const simple = require('./lib/simple')

  // lowdb: coba yg di node_modules dulu, fallback ke lib lokal
  let lowdbLib
  try { lowdbLib = require('lowdb') }
  catch { lowdbLib = require('./lib/lowdb') }
  const { Low, JSONFile } = lowdbLib
  const MongoAdapter = require('./lib/mongoDB')

  const readline = require('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const question = (text) => new Promise((resolve) => rl.question(text, resolve))

  // helper global buat manggil API: global.API('nama', '/path', {q:1}, 'apikey')
  global.API = (name, path = '/', query = {}, apikey) =>
    (name in global.APIs ? global.APIs[name] : name) + path +
    ((query || apikey)
      ? '?' + new URLSearchParams(Object.entries({
          ...query,
          ...(apikey ? { [apikey]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}),
        }))
      : '')

  global.timestamp = { start: new Date() }

  // argumen CLI, misal: node main.js --db mongodb://... --prefix .
  global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())

  // prefix command, default karakter aneh2 biar fleksibel
  global.prefix = new RegExp(
    '^[' + (opts.prefix || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&') + ']'
  )

  // database: dukung URL (cloud), mongodb, atau file JSON lokal
  global.db = new Low(
    /https?:\/\//.test(opts.db || '')
      ? new cloudDBAdapter(opts.db)
      : /mongodb/.test(opts.db)
        ? new MongoAdapter(opts.db)
        : new JSONFile((opts._[0] ? opts._[0] + '_' : '') + 'database.json')
  )
  global.DATABASE = global.db

  global.loadDatabase = async function loadDatabase() {
    if (global.db.READ) {
      // lagi dibaca proses lain, tungguin aja
      return new Promise((resolve) => setInterval(function () {
        if (!global.db.READ) {
          clearInterval(this)
          resolve(global.db.data == null ? global.loadDatabase() : global.db.data)
        }
      }, 1000))
    }
    if (global.db.data !== null) return
    global.db.READ = true
    await global.db.read()
    global.db.READ = false
    global.db.data = {
      users: {}, chats: {}, stats: {}, msgs: {}, sticker: {},
      ...global.db.data || {},
    }
    global.db.chain = lodash.chain(global.db.data)
  }
  loadDatabase()

  // info browser yg dikirim ke WhatsApp pas konek
  const getBrowser = (name = 'Chrome') => {
    const platform = os.platform()
    const osName = platform === 'win32' ? 'Windows' : platform === 'darwin' ? 'MacOS' : 'Linux'
    const version = osName === 'Linux' ? Browsers.ubuntu(name)[2] : 'N/A'
    return [osName, name, version]
  }

  // sesi login tersimpan per folder (default 'sessions')
  const sessionFolder = '' + (opts._[0] || 'sessions')
  global.isInit = !fs.existsSync(sessionFolder)
  const { state, saveState, saveCreds } = await useMultiFileAuthState(sessionFolder)
  const { version, isLatest } = await fetchLatestBaileysVersion()
  console.log(chalk.magenta('-- using WA v' + version.join('.') + ', isLatest: ' + isLatest + ' --'))

  const msgRetryCache = new NodeCache()
  const sockConfig = {
    printQRInTerminal: false,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    generateHighQualityLinkPreview: true,
    // bungkus view-once biar bisa di-forward
    patchMessageBeforeSending: (msg) => {
      const isViewOnce = !!(msg.buttonsMessage || msg.templateMessage || msg.listMessage)
      if (isViewOnce) {
        msg = {
          viewOnceMessage: {
            message: {
              messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} },
              ...msg,
            },
          },
        }
      }
      return msg
    },
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'silent', stream: 'store' })),
    },
    msgRetryCounterCache: msgRetryCache,
    browser: getBrowser(),
    logger: pino({ level: 'silent' }),
    version,
  }

  global.conn = simple.makeWASocket(sockConfig)

  // autosave db tiap 30 detik + bersih2 file tmp tiap 30 detik
  if (!opts.test && global.db) {
    setInterval(async () => {
      if (global.db.data) await global.db.write()
      if (!opts.tmp && (global.support || {}).find) {
        for (const dir of [os.tmpdir(), 'tmp']) {
          childProcess.spawn('find', [dir, '-amin', '3', '-type', 'f', '-delete'])
        }
      }
    }, 30000)
  }

  // handler tiap status koneksi berubah
  async function onConnectionUpdate({ connection, lastDisconnect }) {
    global.timestamp.connect = new Date()
    const loggedOut = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
    if (lastDisconnect?.error && loggedOut && conn.ws.readyState !== WS.CONNECTING) {
      console.log(global.reloadHandler(true))
    }
    if (global.db.data == null) await loadDatabase()
  }

  // sesi rusak? suruh hapus dulu
  if (fs.existsSync('./sessions/creds.json') && !conn.authState.creds.registered) {
    console.log(chalk.yellow('-- WARNING: creds.json is broken, please delete it first --'))
    process.exit(0)
  }

  // belum login? minta nomor HP terus kasih pairing code
  if (!conn.authState.creds.registered) {
    let phone = ''
    do {
      phone = await question(chalk.blueBright('ENTER A VALID NUMBER START WITH REGION CODE. Example : 62xxx:\n'))
      if (!/^\d+$/.test(phone) || phone.length < 10) {
        console.log(chalk.red('Invalid phone number. Please enter a valid number.'))
      }
    } while (!/^\d+$/.test(phone) || phone.length < 10)
    rl.close()
    phone = phone.replace(/\D/g, '')
    console.log(chalk.bgWhite(chalk.blue('-- Please wait, generating code... --')))
    setTimeout(async () => {
      const acakKode = () => Array.from({length: 8}, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
      const code = await conn.requestPairingCode(phone, acakKode())
      const pretty = code?.match(/.{1,4}/g)?.join('-') || code
      console.log(chalk.black(chalk.bgGreen('Your Pairing Code : ')), chalk.black(chalk.white(pretty)))
    }, 3000)
  }

  process.on('uncaughtException', console.error)

  // require yg maksa fresh (buang cache dulu), dicoba sampai 10x
  const uncacheRequire = (file) => {
    file = require.resolve(file)
    let mod, tries = 0
    do {
      if (file in require.cache) delete require.cache[file]
      mod = require(file)
      tries++
    } while (
      (!mod ||
        (Array.isArray(mod) || mod instanceof String) ? !(mod || []).length
        : typeof mod == 'object' && !Buffer.isBuffer(mod) ? !Object.keys(mod || {}).length
        : false) && tries <= 10
    )
    return mod
  }

  let firstInit = true
  global.reloadHandler = function (restartConn) {
    const handler = uncacheRequire('./handler')
    if (restartConn) {
      try { global.conn.ws.close() } catch {}
      global.conn = { ...global.conn, ...simple.makeWASocket(sockConfig) }
    }
    // lepas listener lama biar gak dobel
    if (!firstInit) {
      conn.ev.off('messages.upsert', conn.handler)
      conn.ev.off('group-participants.update', conn.participantsUpdate)
      conn.ev.off('message.delete', conn.onDelete)
      conn.ev.off('connection.update', conn.connectionUpdate)
      conn.ev.off('creds.update', conn.credsUpdate)
    }
    // teks sapaan grup
    conn.welcome = 'Selamat datang @user di group @subject utamakan baca desk ya \n@desc'
    conn.bye = 'Selamat tinggal @user 👋'
    conn.promote = '@user sekarang admin!'
    conn.demote = '@user sekarang bukan admin!'
    // pasang handler baru
    conn.handler = handler.handler.bind(conn)
    conn.participantsUpdate = handler.participantsUpdate.bind(conn)
    conn.onDelete = handler.delete.bind(conn)
    conn.connectionUpdate = onConnectionUpdate.bind(conn)
    conn.credsUpdate = saveCreds.bind(conn)
    conn.ev.on('messages.upsert', conn.handler)
    conn.ev.on('group-participants.update', conn.participantsUpdate)
    conn.ev.on('message.delete', conn.onDelete)
    conn.ev.on('connection.update', conn.connectionUpdate)
    conn.ev.on('creds.update', conn.credsUpdate)
    firstInit = false
    return true
  }

  // muat semua plugin, yg error diskip aja biar bot tetap jalan
  const pluginsDir = path.join(__dirname, 'plugins')
  const isJs = (f) => /\.js$/.test(f)
  global.plugins = {}
  for (const file of fs.readdirSync(pluginsDir).filter(isJs)) {
    try {
      global.plugins[file] = require(path.join(pluginsDir, file))
    } catch (e) {
      conn.logger.error(e)
      delete global.plugins[file]
    }
  }
  console.log(Object.keys(global.plugins))

  // hot-reload: tiap ada file plugin berubah, muat ulang otomatis
  global.reload = (_ev, filename) => {
    if (!isJs(filename)) return
    const full = path.join(pluginsDir, filename)
    if (full in require.cache) {
      delete require.cache[full]
      if (fs.existsSync(full)) {
        conn.logger.info("re - require plugin '" + filename + "'")
      } else {
        conn.logger.warn("deleted plugin '" + filename + "'")
        delete global.plugins[filename]
        return
      }
    } else {
      conn.logger.info("requiring new plugin '" + filename + "'")
    }
    const err = syntaxError(fs.readFileSync(full), filename)
    if (err) {
      conn.logger.error("syntax error while loading '" + filename + "'\n" + err)
    } else {
      try {
        global.plugins[filename] = require(full)
      } catch (e) {
        conn.logger.error(e)
      } finally {
        // urutkan biar konsisten
        global.plugins = Object.fromEntries(
          Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b))
        )
      }
    }
  }
  Object.freeze(global.reload)
  fs.watch(path.join(__dirname, 'plugins'), global.reload)

  global.reloadHandler()

  // cek binary pendukung (ffmpeg, imagemagick, dll) sekali pas start
  async function checkBinaries() {
    const procs = [
      childProcess.spawn('ffmpeg'),
      childProcess.spawn('ffprobe'),
      childProcess.spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
      childProcess.spawn('convert'),
      childProcess.spawn('magick'),
      childProcess.spawn('gm'),
      childProcess.spawn('find', ['--version']),
    ]
    const results = await Promise.all(procs.map((p) =>
      Promise.race([
        new Promise((resolve) => p.on('close', (code) => resolve(code !== 127))),
        new Promise((resolve) => p.on('error', () => resolve(false))),
      ])
    ))
    const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = results
    console.log(results)
    global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find }
    Object.freeze(global.support)
    if (!ffmpeg) conn.logger.warn('Please install ffmpeg for sending videos (pkg install ffmpeg)')
    if (ffmpeg && !ffmpegWebp) conn.logger.warn('Stickers may not animated without libwebp on ffmpeg (--enable-ibwebp while compiling ffmpeg)')
    if (!convert && !magick && !gm) conn.logger.warn("Stickers may not work without imagemagick if libwebp on ffmpeg doesnt isntalled (pkg install imagemagick)")
  }
  checkBinaries().then(() => conn.logger.info('Quick Test Done')).catch('done')
})()
