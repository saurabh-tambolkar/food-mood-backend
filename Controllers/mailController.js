const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: "madge.bernier@ethereal.email",
    pass: "nsH5P47ACwtNUDeSzz",
  },
});

const sendMail = async ({ email, otp }) => {
  console.log("Sending OTP to:", email);
  console.log("OTP:", otp);

  try {
    const info = await transporter.sendMail({
      from: '"Food Mood 👻" <foodmood@ethereal.email>', // sender address
      to: email, // recipient's email address
      subject: "Verify your account ✔", // Subject line
      text: `Your OTP is: ${otp}`, // plain text body
      html: `<b>Your OTP to verify your account is: ${otp}</b>`, // HTML body
    });

    console.log("Message sent: %s", info.messageId);
    return info; // Returning the info in case you want to log or handle it later
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send OTP email: " + error.message); // Throw error to be handled elsewhere
  }
};

const sendPassLink = async ({email,token}) => {
  console.log("Sending link to:", email,token);

  try {
    const info = await transporter.sendMail({
      from: '"Food Mood👻" <foodmood@ethereal.email>', // sender address
      to: email, // recipient's email address
      subject: "Reset your password ✔", // Subject line
      text: `Click below to reset your password`, // plain text body
      html: `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #333;">Reset Your Password</h2>
      <p style="color: #555;">Click the button below to reset your password. The link will expire in <strong>10 minutes</strong>.</p>
      <a href="http://localhost:3000/reset-password/${token}" target="_blank" 
         style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px; font-weight: bold;">
        Reset Password
      </a>
      <p style="color: #999; margin-top: 20px; font-size: 14px;">
        If you didn’t request a password reset, you can safely ignore this email.
      </p>
    </div>`, // HTML body with proper template literal
    });
    

    console.log("Message sent: %s", info.messageId);
    return info; // Returning the info in case you want to log or handle it later
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send OTP email: " + error.message); // Throw error to be handled elsewhere
  }
};

module.exports = {
  sendMail,
  sendPassLink,
};
