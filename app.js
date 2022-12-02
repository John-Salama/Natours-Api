const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mondoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const tourRouter = require('./routers/tourRouter');
const userRouter = require('./routers/userRouter');
const reviewRouter = require('./routers/reviewRouter');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();
//-----------------------------------------------------------------------------------------------------------------
//GLOBAL MIDDLEWARE
//set secure http header
app.use(helmet());

//body parser and limit the body to 10kb only
app.use(express.json({ limit: '10kb' }));

//pares the cookie coming in req
app.use(cookieParser());

//data sensitization against noSQL query injection
app.use(mondoSanitize());

//data sensitization against XSS
app.use(xssClean());

//prevent parameter pollution (?sort=name&sort=email)
app.use(
  hpp({
    whitelist: [
      'ratingsAverage',
      'ratingsQuantity',
      'duration',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

//serving static files
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  // add date property to req object
  req.requestTime = new Date().toISOString();
  //console.log(req.headers);
  //console.log(process.env);
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limit the req rate per hour
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'you reached the max number of request please try again in hour',
});
app.use('/api', limiter);
//-----------------------------------------------------------------------------------------------------------------
//mounting middleware
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

//global middleware to handle unhandled routes
app.all('*', (req, res, next) => {
  //if next receive a value it will be treated as an error and will skip all the middleware and go to the global error handling middleware
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//middleware error handling if middleware with four parameters
app.use(globalErrorHandler);
//-----------------------------------------------------------------------------------------------------------------
module.exports = app;
