const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Orders = require("../models/UserOrders");
const Payment = require("../models/PaymentModel");
const Cart = require("../models/CartModel");
const jwtSecretKey = process.env.JWT_SECRET_KEY;

// const authenticateUser = (req, res, next) => {
//     console.log(req.headers);
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
    const cookies = req.headers.cookie.split(";").reduce((acc, cookieStr) => {
      const [key, value] = cookieStr.trim().split("=");
      acc[key] = value;
      return acc;
    }, {});

    token = cookies.fmCookie; // only the fmCookie value
  }

  // ✅ Fallback to Authorization header (if provided)
  if (!token && req.headers?.authorization) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided.", success: false });
  }

  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    req.user = decoded.user.id; // assuming your token payload has user.id
    next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({ message: "Invalid token.", success: false });
  }
};

router.get("/get-Orders", authenticateUser, async (req, res) => {
  try {
    let userId = req.user;
    // res.send(userId)
    let orders = await Orders.find({ userId: userId }).populate(
      "products.productId"
    );
    if (orders.length == 0) {
      return res
        .status(404)
        .json({ message: "No orders found", success: false });
    } else {
      res.status(200).json({ orders: orders, success: true });
    }
  } catch (err) {
    console.log(err);
    res.json({ err: err });
  }
});

router.get("/get-admin-orders", async (req, res) => {
  // res.send("hello order ")
  try {
    //admin get all orders api
    let orders = await Orders.find()
      .populate("userId")
      .populate("products.productId")
      .sort({ orderDate: -1 });
    if (orders.length == 0) {
      return res
        .status(404)
        .json({ message: "No orders found", success: false });
    } else {
      res.status(200).json({ orders: orders, success: true });
    }
  } catch (err) {
    console.log(err);
    res.json({ err: err });
  }
});

router.put("/update-order-status/:orderId/:status/:user", async (req, res) => {
  try {
    let { status, orderId, user } = req.params;
    console.log("user is ", user);
    let order = await Orders.findByIdAndUpdate(
      orderId,
      { $set: { status: status } },
      { new: true }
    );
    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found", success: false });
    } else {
      const userSocketId = global.onlineUsers[user];
      if (userSocketId) {
        global.io.to(userSocketId).emit("orderStatusChange", {
          message: "Your order status has been updated",
          status: status,
          orderId: orderId,
        });
        console.log("📢 Emitted 'orderStatusChange' to socket:", userSocketId);
      } else {
        console.log("⚠️ User not online:", user);
      }
      res.status(200).json({ order: order, success: true });
    }
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ message: "cant change the status", err: err, success: false });
  }
});

router.post("/place-order/:paymentId", authenticateUser, async (req, res) => {
  const session = await Orders.startSession(); // Start a MongoDB session
  session.startTransaction(); // Start the transaction
  console.log("placing order at backend");

  try {
    let { paymentId } = req.params;
    let userId = req.user;
    console.log(paymentId);
    const isPaid = await Payment.findOne({ razorpay_payment_id: paymentId });
    if (isPaid == null) {
      return res
        .status(400)
        .json({ message: "Payment Id is null,payment is not successfull" });
    } else {
      const cart = await Cart.findOne({ userId: userId });
      console.log(cart)
      let orderExist = await Orders.find({ paymentId: paymentId });
      if (orderExist.length !== 0) {
        console.log(orderExist.length);
        res
          .status(400)
          .json({ message: "Order already exist", success: false, orderExist });
      } else {
        if (cart) {
          let prodArr = cart.products;
          let totalAmount = cart.totalAmount;
          const dataToSave = {
            totalAmount,
            paymentId,
            products: prodArr,
            userId: userId,
            paid: true,
          };
          const newOrder = new Orders(dataToSave);
          await newOrder.save();

          let prodToSendAsResponse = await Orders.findById(
            newOrder._id
          ).populate("products.productId");

          let delCart = await Cart.findOneAndDelete({ userId });
          res
            .status(200)
            .json({
              message: "Order placed successfully",
              success: true,
              data: prodToSendAsResponse,
            });
        } else {
          res.status(404).json({ message: "No cart found", success: false });
        }
      }
    }
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ error, message: "Cant place Order", success: false });
  }
});

module.exports = router;
