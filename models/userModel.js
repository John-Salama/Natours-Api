const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'user must have a name'],
    unique: true,
    trim: true,
    maxlength: [40, 'a user name must have less or equal then 40 characters'],
    minlength: [5, 'a user name must have more or equal then 5 characters'],
  },
  email: {
    type: String,
    required: [true, 'user must have an email'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: [validator.isEmail, 'please provide a valid email'],
  },
  photo: {
    type: String,
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'guide', 'lead-guide'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'user must have a password'],
    minlength: [8, 'password must have more or equal then 8 characters'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'user must have a password'],
    minlength: [8, 'password must have more or equal then 8 characters'],
    //work only at save or create into DB
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: 'passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//check if password is modified and hash it
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

//update passwordChangedAt when password is changed
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//check if the password is the same as enc or not
//instance function in available in all User docs
userSchema.methods.checkPassword = async (encPass, userPass) =>
  await bcrypt.compare(encPass, userPass);

userSchema.methods.changePasswordAfter = function (JWTTimeStamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  //create the random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  //hash and save it in db
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  //console.log({ resetToken }, this.passwordResetToken);
  //make expire time in db
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  //return the unHashed token
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
