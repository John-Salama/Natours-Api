const awsBucket = process.env.AWS_BUCKET_NAME;
const awsRegion = process.env.AWS_BUCKET_REGION;
/* Aws with cyclic */
const AWS = require('aws-sdk');

const options = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: awsRegion,
};
const cloudStorage = new AWS.S3(options);

exports.uploadAwsAndGetSignedURL = async (imageFile, filepathAws) => {
  // upload file to aws
  await cloudStorage
    .putObject({
      Body: imageFile,
      Bucket: awsBucket,
      Key: `${filepathAws}`,
    })
    .promise();

  // get public url , must open access to the bucket from the aws console
  //const imgeAwsUrl = `https://${awsBucket}.s3.${awsRegion}.amazonaws.com/${filepathAws}`;

  //get signed url if i secured the bucket this generate a signed link with maximum expirations a week
  const imgeAwsUrl = await cloudStorage.getSignedUrl('getObject', {
    Bucket: awsBucket,
    Key: `${filepathAws}`,
    Expires: 1 * 24 * 60 * 60,
  });
  return imgeAwsUrl;
};
exports.getSignedUrlAws = (filepathAws) => {
  const imgeAwsUrl = cloudStorage.getSignedUrl('getObject', {
    Bucket: awsBucket,
    Key: `${filepathAws}`,
    Expires: 1 * 24 * 60 * 60,
  });
  return imgeAwsUrl;
};

exports.deleteAwsFile = (filepathAws) => {
  cloudStorage.deleteObject(
    {
      Bucket: awsBucket,
      Key: `${filepathAws}`,
    },
    (err) => {
      if (err) console.log(err, err.stack); // an error occurred
    }
  );
};
