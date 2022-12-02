const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');
const sendEmail = require('../utils/email');

const catchAsync = require('../utils/catchAsync');
//thats to prevent anyone to signup as an admin

//function to generate token using id of user
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, status, res) => {
  const token = signToken(user._id);
  const cookieOption = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOption.secure = true;
  res.cookie('jwt', token, cookieOption);
  user.password = undefined; //remove password from show in response
  res.status(status).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
  });

  //create the token to send it to the user to login after the signup
  //payload = { id: newUser._id } user id
  //secret is = process.env.JWT_SECRET
  //token expire date = {expiresIn: process.env.JWT_EXPIRES_IN,}
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //if email and password is exist
  if (!email || !password)
    return next(new AppError('please enter email and password', 400));

  //if email and password is correct from db
  //we make password select property is false to make it did not appear in find
  //so we use select('+password') to include false select fields
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.checkPassword(password, user.password)))
    return next(new AppError('incorrect email or password', 401));

  //if all ok send token
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  //1)check if the token is exist
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token)
    return next(new AppError('you are not logged in, please log in.', 401));

  //2)verification token
  //verify is sync function we use promisify to turn it to async function and return a promise
  //error handled in errorController
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user still exist
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) return next(new AppError('user token dose not exist', 401));

  //4)check if user change the password after the token was issued
  if (currentUser.changePasswordAfter(decoded.iat)) {
    return next(
      new AppError('user change the password recently please log in again'),
      401
    );
  }

  //go to protected route
  req.user = currentUser;
  next();
});

//restrict some user from access routs
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    //roles is an array
    if (!roles.includes(req.user.role))
      return next(
        new AppError('you do not have permission to perform this action', 403)
      );
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1)get user  from posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user)
    return next(new AppError('there are no user with this email'), 404);

  //2)generate user token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //save the changes and leave the unchanged fields

  //3)send it to user email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `forgot your password submit a patch request to ${resetURL} with your new password and passwordConfirmation. if you did not forgot the password ignore that mail`;

  try {
    await sendEmail({
      email: req.body.email,
      subject: 'reset you password (valid for 10 min)',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'token sent to email',
    });
  } catch (err) {
    //delete the data we create in createPasswordResetToken(); from database
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError('error while sending the email please try again later'),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)get user passed on the token
  //hash the token to compare it with that in db
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  //get user thats matches the token and expires date greater than now
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2)if there is user and token dose not expires reset the password
  if (!user) return next(new AppError('Token is invalid or expires'), 400);
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3)update changedPasswordAt property at user
  //at mongo middleware

  //4)send the jwt and log the user in
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)get user form collection
  const user = await User.findOne(req.user._id).select('+password');

  //2)check if POSTed password is correct or not
  if (!(await user.checkPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('wrong password'), 401);

  //3)if so update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4)log user in send the token
  createSendToken(user, 200, res);
});
