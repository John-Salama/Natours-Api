const mongoose = require('mongoose');
const slugify = require('slugify');
//const User = require('./userModel');
//const validator = require('validator');
//make schema (bluePrint) from document all collections in document has the same shape as blueprint
const toursSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'a tour name must have less or equal then 40 characters'],
      minlength: [10, 'a tour name must have more or equal then 10 characters'],
      //validate: [validator.isAlpha, 'tour name must only contain characters'],
      //validator.isAlpha only allow characters in validator package
    },
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      required: [true, 'tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'tour must have a groupe size'],
    },
    difficulty: {
      type: String,
      required: [true, 'tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'tour must have a imageCover'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    startDates: [Date],
    //embedded doc as object
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    //embedded doc as array of object
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true }, //to make virtuals property show in output
    toObject: { virtuals: true },
  }
);

//single indexes
toursSchema.index({ slug: 1 });
//compound indexes
toursSchema.index({ price: 1, ratingsAverage: -1 });
toursSchema.index({ startLocation: '2dsphere' });

toursSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

//virtual population is like to make refrains array from reviews in tours but it make it virtually
//this is like i type ()
toursSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

//middleware to run before save and create
//this is the doc before save in db

//take the id from guides and replace it with actual data (embed data)
//toursSchema.pre('save', async function (next) {
//  const guidesPromise = this.guides.map(async (id) => await User.findById(id)); //any async function return promise
//  this.guides = await Promise.all(guidesPromise); //we should await the promise to get the result
//  next();
//});

toursSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

//doc is the doc after save in db
toursSchema.post('save', (doc, next) => {
  //console.log(doc);
  next();
});

//query middleware
//this is the query before run
//toursSchema.pre('find', function (next) { => this is for find method
//toursSchema.pre(/^find/, function (next) { => this is for all method start with find

toursSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

toursSchema.pre(/^find/, function (next) {
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

//this is the doc after run the query
//toursSchema.post(/^find/, function (docs, next) {
//  console.log(`query took ${Date.now() - this.start} milliseconds`);
//  next();
//});

//aggregation middleware
//this is the aggregation before run
/*toursSchema.pre('aggregate', function (next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  next();
});*/

//create model
const Tour = mongoose.model('Tour', toursSchema);

module.exports = Tour;
