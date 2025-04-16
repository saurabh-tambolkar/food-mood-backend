const Razorpay = require("razorpay");
const crypto = require("crypto");
const Payment = require("../models/PaymentModel");
const jwt = require("jsonwebtoken");
const jwtSecretKey = process.env.JWT_SECRET_KEY

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY, // Add your Razorpay Key ID in .env
  key_secret: process.env.RAZORPAY_API_SECRET, // Add your Razorpay Key Secret in .env
});

// Create Order
const createOrder = async (req, res) => {
  try {
    const { amount, currency } = req.body; // Amount in smallest currency unit (e.g., paise for INR)
    const options = {
      amount: amount * 100, // Convert to paise (if INR)
      currency: currency || "INR",
      receipt: `receipt_${Date.now()}`,
    };
    const order = await razorpayInstance.orders.create(options);
    res.status(200).json({order,success:true});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// Verify Payment
    const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature,notes } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const fmCookie = req.cookies.fmCookie;
        const decodedId = jwt.verify(fmCookie,jwtSecretKey)
        let userId = decodedId.user.id;
       
        // Validate signature
        const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
        .update(body.toString())
        .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const dataOfPayment={...req.body,userId:userId}
            const newPayment = new Payment(dataOfPayment)
            await newPayment.save();
            res.redirect(`http://localhost:3000/paymentsuccess?refrence=${razorpay_payment_id}`)
            // res.redirect(`https://food-mood-backend.onrender.com/paymentsuccess?refrence=${razorpay_payment_id}`)
        } else {
          res.status(400).json({ success: false, message: "Invalid payment signature" });
        }
        // res.json({success:true})
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Something went wrong" });
    }
    };

      

module.exports = { createOrder, verifyPayment };
