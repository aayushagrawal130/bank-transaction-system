const nodemailer = require('nodemailer');

let transporter = null;
let emailReady = false;

// Attempt to configure email transporter if credentials exist
if (process.env.EMAIL_USER && process.env.CLIENT_ID && process.env.REFRESH_TOKEN) {
  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
      },
    });

    transporter.verify((error) => {
      if (error) {
        console.warn('⚠️  Email OAuth2 notice: Google Refresh Token is expired or unauthorized. Falling back to Console Logger mode for emails.');
        emailReady = false;
      } else {
        console.log('✅ Email server is ready to send messages');
        emailReady = true;
      }
    });
  } catch (err) {
    console.warn('⚠️  Could not initialize email transporter. Using Console Logger mode.');
    emailReady = false;
  }
} else {
  console.log('ℹ️  No OAuth2 credentials provided. Email service running in Console Logger mode.');
}

// Resilient Send Email Function
const sendEmail = async (to, subject, text, html) => {
  if (emailReady && transporter) {
    try {
      const info = await transporter.sendMail({
        from: `"Apex Horizon Bank" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      });
      console.log('📧 Message sent: %s', info.messageId);
      return;
    } catch (error) {
      console.warn('⚠️  Email delivery via Gmail failed, logging to console instead:', error.message);
    }
  }

  // Graceful fallback: Console output so nothing ever fails or crashes
  console.log('----------------------------------------------------');
  console.log(`📧 [MOCK EMAIL DISPATCH] To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${text}`);
  console.log('----------------------------------------------------');
};

async function sendRegistrationEmail(userEmail, name) {
  const subject = 'Welcome to Apex Horizon Bank & Trust!';
  const text = `Hello ${name},\n\nThank you for opening an account with Apex Horizon Bank. Your secure ledger account has been initialized.\n\nBest regards,\nApex Horizon Vault Team`;
  const html = `<p>Hello ${name},</p><p>Thank you for opening an account with Apex Horizon Bank. Your secure ledger account has been initialized.</p><p>Best regards,<br>Apex Horizon Vault Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
  const subject = 'Transaction Successful!';
  const text = `Hello ${name},\n\nYour transfer of INR ${amount} to account ${toAccount} has been committed to the ledger.\n\nBest regards,\nApex Horizon Vault Team`;
  const html = `<p>Hello ${name},</p><p>Your transfer of INR ${amount} to account ${toAccount} has been committed to the ledger.</p><p>Best regards,<br>Apex Horizon Vault Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
  const subject = 'Transaction Failed';
  const text = `Hello ${name},\n\nWe regret to inform you that your transfer of INR ${amount} to account ${toAccount} failed and was rolled back.\n\nBest regards,\nApex Horizon Vault Team`;
  const html = `<p>Hello ${name},</p><p>We regret to inform you that your transfer of INR ${amount} to account ${toAccount} failed and was rolled back.</p><p>Best regards,<br>Apex Horizon Vault Team</p>`;

  await sendEmail(userEmail, subject, text, html);
}

module.exports = {
  sendRegistrationEmail,
  sendTransactionEmail,
  sendTransactionFailureEmail
};
