const express = require("express");
const router = express.Router();
const Message = require("../models/MessageModel");
const jwt = require("jsonwebtoken");
const jwtSecretKey = process.env.JWT_SECRET_KEY;
const mongoose = require("mongoose");
// const { io } = require("../App")

// const authenticateUser = (req, res, next) => {
//   const token = req.headers?.authorization?.split(" ")[1];
//   console.log(token);

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

// const authenticateUser = (req, res, next) => {
//     // console.log(req.headers);
//   const token = req.headers?.cookie ? req.headers.cookie.split(" ")[1].split("=")[1] : req.headers?.authorization?.split(" ")[1];
// //   const token = req.headers?.authorization?.split(" ")[1];
// //   const token = req.cookies.fmCookie;
//   console.log(token);

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

router.get("/messages/:adminId", authenticateUser, async (req, res) => {
  const userId = req.user;
  const adminId = req.params.adminId;
  console.log(`getting msgs to from ${userId} to  ${adminId}`);

  try {
    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: adminId },
        { sender: adminId, receiver: userId },
      ],
    }).sort({ time: 1 });

    res.status(200).json({ messages, success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/send-message", authenticateUser, async (req, res) => {
  try {
    const userId = req.user;
    const { receiver, message } = req.body;
    console.log("🧍 All online users:", global.onlineUsers);
    console.log("📤 Attempting to send to:", receiver);

    const newMessage = new Message({
      sender: userId,
      receiver: receiver,
      message: message,
    });
console.log("sender",userId)
console.log("receiver",receiver)
console.log("new msg",newMessage)
    await newMessage.save();

    // console.log("emiting msg now");
    // // Emit the message to the receiver via Socket.IO
    const receiverSocketId = global.onlineUsers?.[receiver]; // store socket ids somewhere globally
    if (receiverSocketId) {
      global.io.to(receiverSocketId).emit("receiveMessage", newMessage);
    } else {
      console.log("⚠️ Receiver not online:", receiver);
    }

    res.status(200).json({
      message: `Message sent successfully to ${receiver} by ${userId}`,
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: `There was a problem sending message`,
      success: false,
      err: error,
    });
  }
});

router.get("/initiated-users", authenticateUser, async (req, res) => {
  const adminId = req.user; // Assuming admin is authenticated
  console.log(adminId);
  try {
    const users = await Message.aggregate([
      {
        $match: {
          receiver: new mongoose.Types.ObjectId(adminId), // 👈 important
        },
      },
      {
        $group: {
          _id: "$sender", // unique user IDs who messaged the admin
        },
      },
      {
        $lookup: {
          from: "users", // collection name (should be lowercase plural of your model)
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: "$userDetails",
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$userDetails.name",
          email: "$userDetails.email",
          image: "$userDetails.profileImage.url",
        },
      },
    ]);

    // console.log(users);

    res.status(200).json({ users: users, success: true });
  } catch (err) {
    console.error("Error fetching initiating users:", err);
    res.status(500).json({ message: "Failed to get initiating users", err });
  }
});

router.put("/messages/mark-read", authenticateUser, async (req, res) => {
  try {
    const userId = req.user;
    const { senderId } = req.body;

    const result = await Message.updateMany(
      {
        sender: new mongoose.Types.ObjectId(senderId),
        receiver: new mongoose.Types.ObjectId(userId),
        read: false,
      },
      { $set: { read: true } }
    );

    const senderSocketId = global.onlineUsers[senderId];
    if (senderSocketId) {
      global.io.to(senderSocketId).emit("messagesRead", {
        by: userId,
      });
      console.log(senderId);
      console.log("📢 Emitted 'messagesRead' to:", senderSocketId);
    } else {
      console.log("⚠️ Sender not online:", senderId);
    }

    res
      .status(200)
      .json({
        message: "Messages marked as read",
        updatedCount: result.modifiedCount,
      });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
