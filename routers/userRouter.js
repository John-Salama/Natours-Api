const express = require('express');

const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

router.post(
  '/signup',
  authController.signup,
  authController.sendVerificationEmail
);
router.post(
  '/login',
  authController.isActivated,
  authController.isEmailVerified,
  authController.login
);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.get('/verifyEmail/:token', authController.verifyEmail);
router.get('/reactivate/:email', authController.activateAccount);
///api/v1/reactivate/

router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/getMe', userController.getMe, userController.getUser);
//photo is the name of the field that stores the image
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe
);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
