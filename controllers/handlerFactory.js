const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const APIFeatures = require('../utils/apiFeatures');
const awsFeatures = require('../utils/awsFeatures');

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    if (
      doc.photo &&
      !doc.photo.startsWith('https://') &&
      doc.photo !== 'default.jpg'
    )
      awsFeatures.deleteAwsFile(doc.photo);

    await Model.findByIdAndDelete(req.params.id);

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    if (
      doc.photo &&
      !doc.photo.startsWith('https://') &&
      doc.photo !== 'default.jpg'
    )
      doc.photo = awsFeatures.getSignedUrlAws(doc.photo);

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);
    if (
      doc.photo &&
      !doc.photo.startsWith('https://') &&
      doc.photo !== 'default.jpg'
    )
      doc.photo = awsFeatures.getSignedUrlAws(doc.photo);
    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    if (
      doc.photo &&
      !doc.photo.startsWith('https://') &&
      doc.photo !== 'default.jpg'
    )
      doc.photo = awsFeatures.getSignedUrlAws(doc.photo);

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .select()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    const newDocs = doc.map((el) => {
      if (
        el.photo &&
        !el.photo.startsWith('https://') &&
        el.photo !== 'default.jpg'
      ) {
        el.photo = awsFeatures.getSignedUrlAws(el.photo);
      }
      return el;
    });
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: newDocs,
      },
    });
  });
