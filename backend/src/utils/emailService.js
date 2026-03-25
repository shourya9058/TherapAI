import nodemailer from 'nodemailer';

// Create a transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send verification email
export const sendVerificationEmail = async ({ email, name, token }) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
  
  const mailOptions = {
    from: `"TherapAI" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verify Your Email - TherapAI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to TherapAI, ${name}!</h2>
        <p>Thank you for registering as a professional on our platform. To complete your registration, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        
        <p>If you did not create an account with TherapAI, please ignore this email.</p>
        
        <p>Best regards,<br>The TherapAI Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #777;">
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

// Send password reset email
export const sendPasswordResetEmail = async ({ email, name, token }) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  
  const mailOptions = {
    from: `"TherapAI" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Password Reset Request - TherapAI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the button below to set a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p>${resetUrl}</p>
        
        <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        
        <p>Best regards,<br>The TherapAI Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #777;">
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

// Send welcome email (for anonymous users)
export const sendWelcomeEmail = async ({ email, username }) => {
  const mailOptions = {
    from: `"TherapAI" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Welcome to TherapAI!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to TherapAI!</h2>
        <p>Hello,</p>
        <p>Your anonymous account has been successfully created with the following details:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Username:</strong> ${username}</p>
          <p><strong>Account Type:</strong> Anonymous</p>
        </div>
        
        <p>You can now log in to your account and start using our services while maintaining your privacy.</p>
        
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        
        <p>Best regards,<br>The TherapAI Team</p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #777;">
          This is an automated message, please do not reply directly to this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    // Don't throw error for welcome email failures
  }
};
