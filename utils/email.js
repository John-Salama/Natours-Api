const nodemailer = require('nodemailer');

const sendEmail = async (option) => {
  //1)create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  //2)Define the email options
  const emailOption = {
    from: 'John Salama <johnotaku100@gmail.com>',
    to: option.email,
    subject: option.subject,
    text: option.message,
  };
  //3)Actually send the email
  await transporter.sendMail(emailOption);
};

module.exports = sendEmail;
