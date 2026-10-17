// adapter MongoDB buat lowdb — versi chunked (16 Okt 2026)
// Masalah: 1 dokumen MongoDB max 16MB, database bot 36MB+. Solusi: users dipecah
// jadi beberapa chunk @500 user, key lain (chats, stats, dst) 1 dokumen per key.
// Interface sama kayak sebelumnya: read() balikin objek data, write(data) simpan.
const mongoose = require('mongoose')
const { Schema } = mongoose

const CHUNK_SIZE = 500

module.exports = class mongoDB {
  constructor(url, options = {}) {
    this.url = url
    this.options = { serverSelectionTimeoutMS: 30000, ...options }
    this._model = null
  }

  async _connect() {
    if (this._model) return
    await mongoose.connect(this.url, this.options)
    const schema = new Schema({
      _id: { type: String, required: true },
      data: { type: Schema.Types.Mixed, default: {} },
    })
    try { this._model = mongoose.model('botdata', schema) }
    catch { this._model = mongoose.model('botdata') }
  }

  // pecah {users:{...}} jadi [{_id:'users_chunk_0',data:{...}}, ...]
  _split(key, obj) {
    if (key !== 'users') return [{ _id: key, data: obj || {} }]
    const ids = Object.keys(obj || {})
    const docs = []
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
      const slice = {}
      for (const id of ids.slice(i, i + CHUNK_SIZE)) slice[id] = obj[id]
      docs.push({ _id: `users_chunk_${i / CHUNK_SIZE}`, data: slice })
    }
    return docs.length ? docs : [{ _id: 'users_chunk_0', data: {} }]
  }

  async read() {
    await this._connect()
    const docs = await this._model.find({}).lean()
    const data = {}
    const users = {}
    for (const d of docs) {
      if (d._id.startsWith('users_chunk_')) Object.assign(users, d.data || {})
      else data[d._id] = d.data || {}
    }
    data.users = users
    return data
  }

  async write(data) {
    if (!data) return data
    await this._connect()
    const ops = []
    const wantedIds = new Set()
    for (const key of Object.keys(data)) {
      for (const doc of this._split(key, data[key])) {
        wantedIds.add(doc._id)
        ops.push({
          replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
        })
      }
    }
    if (ops.length) await this._model.bulkWrite(ops, { ordered: false })
    // hapus chunk sisa (misal user berkurang)
    const existing = await this._model.find({ _id: /^users_chunk_/ }, { _id: 1 }).lean()
    const stale = existing.map(d => d._id).filter(id => !wantedIds.has(id))
    if (stale.length) await this._model.deleteMany({ _id: { $in: stale } })
    return data
  }
}
