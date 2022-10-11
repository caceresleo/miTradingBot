const mongoose = require('mongoose');
const bcrypt = require('bcrypt-nodejs');
//const bcrypt = require ('bcryptjs');

const { Schema } = mongoose;

const userSchema = new Schema({
  email: String,
  password: String,
  telefono: String,
  alias: String,
  lastLogin: Date,
  KEY: String, 
  SECRET: String
  });

userSchema.methods.encryptPassword = (password) => {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
};

userSchema.methods.comparePassword= function (password) {
  return bcrypt.compareSync(password, this.password);
};



module.exports = mongoose.model('user', userSchema);
