const nodemailer = require('nodemailer');

// Create transporter based on environment variables
const createTransporter = () => {
    // Validate required environment variables
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        throw new Error('EMAIL_USER and EMAIL_PASSWORD are required');
    }

    // Use SMTP as default service (unless Gmail is explicitly specified)
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    }

    // SMTP configuration (default)
    if (!process.env.SMTP_HOST) {
        throw new Error('SMTP_HOST is required for SMTP email service');
    }

    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: secure,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        // Additional options for better compatibility with nodemailer 7.x
        tls: {
            rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false'
        }
    });
};

/**
 * Send shortlist notification email to candidate
 */
const sendShortlistNotification = async (candidateEmail, candidateName, jobTitle, companyName, language = 'en') => {
    try {
        const transporter = createTransporter();

        let subject, html;

        if (language === 'ar') {
            subject = `تم ترشيحك لوظيفة ${jobTitle}`;
            html = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>مرحباً ${candidateName}،</h2>
          <p>خبر رائع — تم ترشيحك للوظيفة:</p>
          <p><strong>${jobTitle}</strong> في <strong>${companyName}</strong></p>
          <p>قام صاحب العمل بمراجعة ملفك في دوامي وسيتواصل معك مباشرة بخصوص الخطوات القادمة.</p>
          <p>مع أطيب التمنيات بالتوفيق،</p>
          <p><strong>فريق دوامي</strong></p>
          <p><em>هنا الفرص تلقاك</em></p>
        </div>
      `;
        } else {
            subject = `You've been shortlisted for ${jobTitle}`;
            html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Hi ${candidateName},</h2>
          <p>Great news — you've been shortlisted for the position:</p>
          <p><strong>${jobTitle}</strong> at <strong>${companyName}</strong></p>
          <p>The employer has reviewed your Jobzat profile and will contact you directly for the next steps.</p>
          <p>Wishing you the best,</p>
          <p><strong>Jobzat</strong></p>
          <p><em>Where opportunity finds you</em></p>
        </div>
      `;
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: candidateEmail,
            subject: subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Shortlist notification email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending shortlist notification email:', error);
        // Provide more detailed error information
        if (error.code) {
            throw new Error(`Failed to send notification email: ${error.code} - ${error.message}`);
        }
        throw new Error(`Failed to send notification email: ${error.message}`);
    }
};

/**
 * Send account verification email (for future use)
 */
const sendVerificationEmail = async (email, token) => {
    try {
        const transporter = createTransporter();
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your Jobzat account',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Jobzat!</h2>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationUrl}">Verify Email</a></p>
          <p>If you didn't create an account, please ignore this email.</p>
        </div>
      `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Verification email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending verification email:', error);
        // Provide more detailed error information
        if (error.code) {
            throw new Error(`Failed to send verification email: ${error.code} - ${error.message}`);
        }
        throw new Error(`Failed to send verification email: ${error.message}`);
    }
};

module.exports = {
    sendShortlistNotification,
    sendVerificationEmail
};

