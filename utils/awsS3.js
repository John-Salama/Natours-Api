const AWS = require('aws-sdk');

class AWS_S3 {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_KEY,
      region: process.env.AWS_BUCKET_REGION,
    });
  }

  //upload photo from multer buffer to s3
  async uploadPhoto(filename, folder, photo) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${folder}/${filename}`,
      Body: photo,
      ACL: 'public-read',
    };
    const result = await this.s3.upload(params).promise();
    return result.Location;
  }

  //download photo from s3 to local
  async downloadPhoto(key) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };
    const result = await this.s3.getObject(params).promise();
    return result.Body;
  }

  //delete photo from s3
  async deletePhoto(key) {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    };
    const result = await this.s3.deleteObject(params).promise();
    return result;
  }
}

module.exports = AWS_S3;
