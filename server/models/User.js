import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  _id: Number, // 对应数据库中的整数 ID
  uname: { type: String, required: true }, // 对应 uname
  mail: { type: String },
  hash: { type: String, required: true }, // 密码哈希
  salt: { type: String }, // 盐
  hashType: { type: String }, // 哈希类型，如 'hydro'
  priv: { type: Number, default: 0 }, // 权限字段
  
  // 其他字段作为非必须字段保留，以便读取
  avatar: String,
  regat: Date,
  loginat: Date,
  loginip: String
}, { 
  collection: 'user', // 指定集合名称为 'user'
  strict: false // 允许 schema 中未定义的字段存在于文档中
})

const User = mongoose.model('User', userSchema)

export default User
