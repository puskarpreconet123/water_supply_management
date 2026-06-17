const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
      user: process.env.SMTP_EMAIL || 'dummy_user',
      pass: process.env.SMTP_PASSWORD || 'dummy_pass'
    }
  });

  // Define the email options
  const message = {
    from: `${process.env.FROM_NAME || 'Water Supply Management'} <${process.env.FROM_EMAIL || 'noreply@watersupply.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html // Optional HTML body
  };

  // If credentials are dummy, log to console instead of sending
  if (process.env.SMTP_EMAIL === 'dummy_user' || !process.env.SMTP_EMAIL) {
    console.log('\n--- MOCK EMAIL INTERCEPTED ---');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:', options.message);
    console.log('------------------------------\n');
    return;
  }

  // Send the email
  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
