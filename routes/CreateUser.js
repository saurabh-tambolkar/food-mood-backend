const express = require("express");
const router = express.Router();
const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { sendMail, sendPassLink } = require("../Controllers/mailController");
// const sendSMS = require("../Controllers/smsController");
const jwtSecretKey = process.env.JWT_SECRET_KEY;
const cloudinary = require("cloudinary").v2;
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateOtp = () => {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
};

const multer = require("multer");

const upload = require("../Controllers/cloudinaryStorage");

router.post("/sign-up", async (req, res) => {
  const { name, email, mobileNumber, password } = req.body;
  if (!email || !name || !mobileNumber || !password) {
    return res
      .status(400)
      .json({ message: "Please fill all the fields", success: false });
  } else {
    try {
      const userEmail = await User.findOne({ email });
      if (userEmail) {
        return res.status(400).json({
          message: "Email already exists,try signing in.",
          success: false,
        });
      } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const otp = generateOtp();
        const otpExpirationTime = Date.now() + 10 * 60 * 1000;
        const user = new User({
          name,
          email,
          mobileNumber,
          otp,
          otpExpiresOn: otpExpirationTime,
          password: hashedPassword,
        });
        await user.save();
        // console.log("email sending")
        // const response = await sendMail({email,otp})
        // console.log("email sent")
        res
          .status(200)
          .json({ message: "Verify yourself firstly", success: true });
      }
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: "can't sign up right now,try again later.",
        success: false,
      });
    }
  }
});

router.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please fill all the fields.", success: false });
  } else {
    try {
      const userEmail = await User.findOne({ email });
      if (!userEmail) {
        return res.status(400).json({
          message: "Email doesn't exist,try signing up.",
          success: false,
        });
      } else {
        console.log(userEmail);
        const isPasswordMatch = await bcrypt.compare(
          password,
          userEmail.password
        );
        if (!isPasswordMatch) {
          return res.status(400).json({
            message: "Credentials doesn't match,try again.",
            success: false,
          });
        } else {
          const data = {
            user: {
              id: userEmail.id,
            },
          };
          const accessToken = jwt.sign(data, jwtSecretKey, {
            expiresIn: "24h",
          });
          const refreshToken = jwt.sign(data, jwtSecretKey, {
            expiresIn: "7d",
          });

          let userDetails = {
            _id: userEmail.id,
            email: userEmail.email,
            mobileNumber: userEmail.mobileNumber,
            profileImage: userEmail.profileImage,
          };

          res.status(200).json({
            message: "User signed in successfully",
            user: userDetails,
            refreshToken: refreshToken,
            accessToken: accessToken,
            success: true,
          });
        }
      }
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: "Cant sign in now , try again later",
        success: false,
      });
    }
  }
});

router.get("/verify-token/:token", async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Please provide token" });
    }

    // Verify the token
    jwt.verify(token, jwtSecretKey, async (err, decoded) => {
      if (err) {
        return res
          .status(401)
          .json({ message: "Unauthorized: Invalid token", err });
      }

      // Fetch the user from the database if token is valid
      try {
        const userId = decoded.user.id;
        const verifiedUser = await User.findOne({ _id: userId });
        if (!verifiedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        const data = {
          user: {
            id: userId,
          },
        };
        const accessToken = jwt.sign(data, jwtSecretKey, { expiresIn: "24h" });
        let userDetails = {
          _id: verifiedUser.id,
          email: verifiedUser.email,
          mobileNumber: verifiedUser.mobileNumber,
          profileImage: verifiedUser.profileImage,
        };

        res.status(200).json({
          message: "Token is valid",
          data: userDetails,
          accessToken,
          success: true,
        });
      } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { otp, email } = req.body;
    console.log(otp, email);
    const userFound = await User.findOne({ email });
    if (!userFound) {
      res.status(404).json({ message: "User not found", success: false });
    } else {
      const otpToCheck = userFound.otp;
      const timeOfOtp = userFound.otpExpiresOn;
      const currentTime = Date.now();

      if (otp !== otpToCheck) {
        res.status(400).json({ message: "OTP is invalid", success: false });
      } else {
        if (timeOfOtp <= currentTime) {
          res.status(400).json({
            message:
              "Your provided OTP has been expired,kindly request another.",
            success: false,
          });
        } else {
          const updatedUser = await User.findByIdAndUpdate(
            { _id: userFound._id },
            { verified: true }
          );
          res.status(200).json({
            message: "User has been verified successfully",
            success: true,
          });
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/refresh/:refreshToken", async (req, res) => {
  try {
    const { refreshToken } = req.params;
    if (!refreshToken) {
      res.json({ message: "Refresh token is required" });
    } else {
      jwt.verify(refreshToken, jwtSecretKey, async (err, decoded) => {
        if (err) {
          res.json({ message: "Invalid refresh token,try logging in again." });
        } else {
          const userId = decoded.user.id;
          const user = await User.findById(userId);
          if (!user) {
            res.json({ message: "User not found" });
          } else {
            const data = {
              user: {
                id: userId,
              },
            };
            const accessToken = jwt.sign(data, jwtSecretKey, {
              expiresIn: "24h",
            });
            res.json({
              message: "Access token generated successfully",
              accessToken,
            });
          }
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//resend otp mail
router.post("/resend-mail/:email", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(email);
    const UserToFind = await User.findOne({ email });
    if (!UserToFind) {
      return res.status(400).json({
        message: "Email doesn't exist,try signing up.",
        success: false,
      });
    } else {
      const otp = generateOtp();
      const otpExpirationTime = Date.now() + 10 * 60 * 1000;
      console.log(UserToFind._id);
      const updatedUser = await User.findByIdAndUpdate(
        UserToFind._id,
        { otp: otp, otpExpiresOn: otpExpirationTime },
        { new: true }
      );
      const response = await sendMail({ email, otp });
      res.status(200).json({
        message: "OTP has been Updated",
        success: true,
        updatedUser,
        response,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Can't send OTP.", success: false });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    const decoded = jwt.verify(token, jwtSecretKey);
    const userId = decoded.user.id;
    let userPresent = await User.findOne({ _id: userId });
    if (!userPresent) {
      res.status(404).json({ message: "No user found", success: false });
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { password: hashedPassword },
        { new: true }
      );
      res.status(200).json({
        message: "Password has been reset successfully",
        success: true,
      });
    }
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ message: "Cant reset your password right now", success: false });
  }
});

router.post("/send-pass-link/:email", async (req, res) => {
  try {
    const { email } = req.params;
    let userEmail = await User.findOne({ email });
    if (!userEmail) {
      res
        .status(400)
        .json({ message: "Email is not registered", success: false });
    } else {
      let data = {
        user: {
          id: userEmail._id,
        },
      };
      let tokenToSend = jwt.sign(data, jwtSecretKey, { expiresIn: "10m" });
      const response = await sendPassLink({ email: email, token: tokenToSend });
      res
        .status(200)
        .json({ message: "Link sent successfully", success: true });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: "Cant send the link right now." });
  }
});

router.get("/secret", (req, res) => {
  res.redirect("http://localhost:3000/menu");
});

// const authenticateUser = (req, res, next) => {
//     // console.log(req.headers);
//   const token = req.headers?.cookie ? req.headers.cookie.split(" ")[1].split("=")[1] : req.headers?.authorization?.split(" ")[1];
//   // const token = req.headers?.authorization?.split(" ")[1];
// //   const token = req.cookies.fmCookie;
//   // console.log(token);

//   if (!token) {
//     return res
//       .status(401)
//       .json({ message: "Access denied. No token provided.", success: false });
//   }

//   try {
//     const decoded = jwt.verify(token, jwtSecretKey);
//     req.user = decoded.user.id; // assuming 'user' is the payload in your token
//     next();
//   } catch (error) {
//     console.log(error);
//     return res
//       .status(401)
//       .json({ message: "Invalid token.", error, success: false });
//   }
// };

const authenticateUser = (req, res, next) => {
  let token;

  // ✅ Parse cookies manually (safe way)
  if (req.headers?.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookieStr) => {
      const [key, value] = cookieStr.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    token = cookies.fmCookie; // only the fmCookie value
  }

  // ✅ Fallback to Authorization header (if provided)
  if (!token && req.headers?.authorization) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Access denied. No token provided.', success: false });
  }

  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    req.user = decoded.user.id; // assuming your token payload has user.id
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res
      .status(401)
      .json({ message: 'Invalid token.', success: false });
  }
};


router.post(
  "/upload-profile",
  authenticateUser,
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const userId = req.user;

      if (!req.file || !req.file.path) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      const user = await User.findById(userId);

      // ❌ Delete old image if it exists
      if (user?.profileImage?.public_id) {
        console.log("deleting image with", user?.profileImage?.public_id);
        await cloudinary.uploader.destroy(user.profileImage.public_id);
      }

      // ✅ Update with new image
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          profileImage: {
            url: req.file.path,
            public_id: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
          },
        },
        { new: true }
      );

      res.status(200).json({
        success: true,
        message: "Profile image uploaded successfully",
        user: updatedUser,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  }
);

router.get("/profile-image", authenticateUser, async (req, res) => {
  try {
    const userId = req.user;

    const user = await User.findById(userId);

    if (!user || !user.profileImage || !user.profileImage.data) {
      return res
        .status(404)
        .json({ success: false, message: "Profile image not found" });
    }

    const base64 = user.profileImage.data.toString("base64");
    const imageUrl = `data:${user.profileImage.contentType};base64,${base64}`;

    res.status(200).json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error("Error fetching profile image:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching image",
    });
  }
});

router.get("/user-details", authenticateUser, async (req, res) => {
  try {
    let userId = req.user;
    console.log(userId);
    const user = await User.findById({ _id: userId });
    let userDetails = {
      name: user.name,
      email: user.email,
      phone: user.mobileNumber,
      createdAt: user.createdAt,
    };
    res
      .status(200)
      .json({
        message: "User details fetched successfully.",
        user: userDetails,
        success: true,
      });
  } catch (err) {
    res.status(400),
      json({ message: "User details not found!", success: false });
  }
});

router.put("/update-profile", authenticateUser, async (req, res) => {
  try {
    let userId = req.user;
    const { name, mobileNumber } = req.body;
    console.log(name, mobileNumber);
    let updatedUser = await User.findByIdAndUpdate(
      { _id: userId },
      { name: name, mobileNumber: mobileNumber },
      { new: true }
    );
    res
      .status(200)
      .json({
        message: "Profile updated successfully!",
        user: updatedUser,
        success: true,
      });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error updating profile!", success: false });
  }
});

const verifyGoogleToken = async (idToken) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload(); // contains email, name, etc.
    // console.log('Verified Payload:', payload);
    return payload;
  } catch (err) {
    console.error("Invalid Google ID token:", err.message);
    throw new Error("Invalid Google token");
  }
};

router.post("/auth/google", async (req, res) => {
  try {
    const { idToken } = req.body;
    // console.log(idToken)
    const userData = await verifyGoogleToken(idToken);
    console.log(userData)
    // Find or create user in your DB
    const user = await User.findOne({ email: userData.email });
    console.log(user, userData.email);

    const data = {
      user: {
        id: user.id,
      },
    };
    const accessToken = jwt.sign(data, jwtSecretKey, {
            expiresIn: "24h",
          });
          const refreshToken = jwt.sign(data, jwtSecretKey, {
            expiresIn: "7d",
          });

    let userDetails = {
            _id: user.id,
            email: user.email,
            mobileNumber: user.mobileNumber,
            profileImage: user.profileImage?.url ? user.profileImage : userData.picture,
          };

          res.status(200).json({
            message: "User signed in successfully",
            user: userDetails,
            refreshToken: refreshToken,
            accessToken: accessToken,
            success: true,
          });

    // res.json({ token });
  } catch (error) {
    res.status(401).json({ message: "Invalid Google token" });
  }
});

module.exports = router;
