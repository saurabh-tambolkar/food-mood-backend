const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Orders = require("../models/UserOrders");
const Payment = require("../models/PaymentModel");
const Cart = require("../models/CartModel");
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const authenticateUser = (req, res, next) => {
  // Retrieve token from cookie/header
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided.", success: false });
  }

  try {
    // console.log(token)
    // Verify token and attach decoded user info to request object
    const decoded = jwt.verify(token, jwtSecretKey);
    req.user = decoded.user.id; // assuming 'user' is the payload in your token
    next();
  } catch (error) {
    console.log(error);
    return res
      .status(401)
      .json({ message: "Invalid token.", error, success: false });
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

router.post("/place-order/:paymentId", authenticateUser, async (req, res) => {

    const session = await Orders.startSession(); // Start a MongoDB session
    session.startTransaction(); // Start the transaction

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
      let orderExist = await Orders.find({paymentId:paymentId})
      if(orderExist.length !== 0){
          console.log(orderExist.length)
          res.status(400).json({message:"Order already exist",success:false,orderExist})
      }
      else{
          if (cart) {
              let prodArr = cart.products;
          let totalAmount = cart.totalAmount;
          const dataToSave = { totalAmount,paymentId,products:prodArr,userId: userId, paid: true };
          const newOrder = new Orders(dataToSave);
          await newOrder.save();
          let delCart = await Cart.findOneAndDelete({ userId });
          res
            .status(200)
            .json({ message: "Order placed successfully", success: true });
          }
          else {
            res.status(404).json({ message: "No cart found", success: false });
          }
    }
}
  } catch (error) {
    console.log(error)
    res.status(400).json({error, message: "Cant place Order", success: false });
  }
});


  
  

module.exports = router;
