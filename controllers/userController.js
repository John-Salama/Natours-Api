const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const handlerFactory = require('./handlerFactory');
const awsFeatures = require('../utils/awsFeatures');
const Email = require('../utils/email');

//save the image in the memory
const multerStorage = multer.memoryStorage();

//allow only images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('not an image please upload only images', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  const imagePath = `images/users/${req.file.filename}`;
  const sharpResult = await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toBuffer();

  const signedURL = await awsFeatures.uploadAwsAndGetSignedURL(
    sharpResult,
    imagePath
  );
  req.photoPath = imagePath;
  req.signedURL = signedURL;
  next();
});

//only keep passed keys in the object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //create error if user post a password of passwordConfirm
  if (req.body.password || req.body.passwordConfirm)
    return next(
      new AppError(
        'you can change password from that route use /updateMyPassword',
        400
      )
    );
  //update user docs
  const filteredObj = filterObj(req.body, 'name', 'email');
  const user = await User.findById(req.user._id);
  if (!user.photo.startsWith('https://')) awsFeatures.deleteAwsFile(user.photo);

  if (req.file) filteredObj.photo = req.photoPath;
  if (filteredObj.email) {
    user.emailVerified = false;
    const verificationToken = user.createEmailVerificationToken();
    user.email = filteredObj.email;
    await user.save({ validateBeforeSave: false });

    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/verifyEmail/${verificationToken}`;
    try {
      await new Email(user, resetURL).sendEmailVerification();
    } catch {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError('error while sending the email please try again later'),
        500
      );
    }
  }
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredObj, {
    new: true,
    runValidators: true,
  });
  const finalUser = updatedUser;
  finalUser.photo = req.signedURL;
  res.status(200).json({
    status: 'success',
    data: {
      user: finalUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  const reactivateURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/reactivate/${req.user.email}`;
  await new Email(req.user, reactivateURL).sendReactivationEmail();
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    msg: 'not yet developed please use /signup',
  });
};

exports.getAllUsers = handlerFactory.getAll(User);
exports.getUser = handlerFactory.getOne(User);
// do not update user from here
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
