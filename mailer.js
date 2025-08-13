const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS  // Gmail App Password
  }
});

async function sendEmail(to, subject, text, html) {
  try {
    await transporter.sendMail({
      from: `"The Daily Dairy" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error('Email send error:', err);
  }
}

module.exports = sendEmail;
