const express = require("express");
const { createOrder, verifyPayment } = require("../Controllers/paymentController");
const router = express.Router();

router.post("/create-order", createOrder);
router.post("/verify-payment", verifyPayment);
router.get('/get-key',(req,res)=>{
    try{
        const razorpay_key=process.env.RAZORPAY_API_KEY;
        res.status(200).json({key:razorpay_key,success:true})
    }
    catch(err){
        res.status(400).json({err:err,success:false})
    }
})

module.exports = router;
