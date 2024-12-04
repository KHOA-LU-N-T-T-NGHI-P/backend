const nodemailer = require('nodemailer')
const asyncHandler = require('express-async-handler')
const sendMail = asyncHandler(async ({email, html}) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_NAME,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });
    try {
        let info = await transporter.sendMail({
            from: '"RESHOP" <no-replyRESHOP.com>',
            to: email,
            subject: "Confirm Registration",
            html: html,
        });
        console.log('Email sent: %s', info.messageId);
        return info
    } catch (error) {
        console.error('Error sending email: %s', error.message);
        return { success: false, error: error.message };
    }
})
module.exports = sendMail
