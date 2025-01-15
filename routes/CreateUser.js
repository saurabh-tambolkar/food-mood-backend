const express = require("express")
const router = express.Router();
const User = require("../models/UserModel")
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {sendMail,sendPassLink} = require("../Controllers/mailController");
// const sendSMS = require("../Controllers/smsController");
const jwtSecretKey = process.env.JWT_SECRET_KEY

const generateOtp=()=>{
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp;
}

router.post("/sign-up",async(req,res)=>{
    const {name,email,mobileNumber,password} = req.body;
    if(!email || !name || !mobileNumber || !password){
        return res.status(400).json({message:"Please fill all the fields",success:false})
    }
    else{
        try{
            const userEmail=await User.findOne({email});
            if(userEmail){
                return res.status(400).json({message:"Email already exists,try signing in.",success:false})
            }
            else{
                const salt =await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password,salt)
                const otp = generateOtp();
                const otpExpirationTime = Date.now() + 10 * 60 * 1000;
                const user = new User({
                    name,
                    email,
                    mobileNumber,
                    otp,
                    otpExpiresOn:otpExpirationTime,
                    password:hashedPassword
                })
                await user.save();
                console.log("email sending")
                const response = await sendMail({email,otp})
                console.log("email sent")
                res.status(200).json({message:"Verify yourself firstly",success:true})
            }
        }
        catch(err){
            console.log(err)
            res.status(400).json({message:"can't sign up right now,try again later.",success:false})
        }
    }
})
  

router.post("/sign-in",async(req,res)=>{
    const {email,password} = req.body;
    if(!email || !password){
        return res.status(400).json({message:"Please fill all the fields",success:false})
    }
    else{
        try{
            const userEmail = await User.findOne({email});
            if(!userEmail){
                return res.status(400).json({message:"Email doesn't exist,try signing up.",success:false})
            }
            else{
                const isPasswordMatch = await bcrypt.compare(password,userEmail.password)
                if(!isPasswordMatch){
                    return res.status(400).json({message:"Credentials doesn't match,try again.",success:false})
                }
                else{
                    const data={
                        user:{
                            id:userEmail.id
                        }
                    }
                    const accessToken = jwt.sign(data,jwtSecretKey,{ expiresIn: '24h' })
                    const refreshToken = jwt.sign(data,jwtSecretKey,{ expiresIn: '7d' })
                    // res.cookie("fmCookie",authToken,{
                    //     expires:new Date(Date.now()+60000),
                    //     // httpOnly:false,
                    //     // secure:false,
                    //     // sameSite:"none"
                    // })
                    res.status(200).json({message:"User signed in successfully",user:userEmail,refreshToken:refreshToken,accessToken:accessToken,success:true})
                }    
            }
        }
        catch(err){
            console.log(err)
            res.status(400).json({message:"Cant sign in now , try again later",success:false})
        }
    }
})

router.get("/verify-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
  
      if (!token) {
        return res.status(400).json({ message: "Please provide token" });
      }
  
      // Verify the token
      jwt.verify(token, jwtSecretKey, async (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Unauthorized: Invalid token",err });
        }
  
        // Fetch the user from the database if token is valid
        try {
          const userId = decoded.user.id;
          const verifiedUser = await User.findOne({ _id: userId });
          if (!verifiedUser) {
            return res.status(404).json({ message: "User not found" });
          }
          
          const data={
            user:{
                id:userId
            }
        }
            const accessToken = jwt.sign(data,jwtSecretKey,{expiresIn:"24h"});
  
          res.status(200).json({
            message: "Token is valid",
            data: verifiedUser,
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

router.post('/verify-otp',async(req,res)=>{
    try {
        const {otp,email} = req.body;
        console.log(otp,email)
        const userFound = await User.findOne({email})
        if(!userFound){
            res.status(404).json({message:"User not found",success:false})
        }
        else{
            const otpToCheck = userFound.otp;
            const timeOfOtp = userFound.otpExpiresOn;
            const currentTime = Date.now();

            if(otp !== otpToCheck){
                res.status(400).json({message:"OTP is invalid",success:false})
            }
            else{
                if(timeOfOtp <= currentTime){
                    res.status(400).json({message:"Your provided OTP has been expired,kindly request another.",success:false})
                }
                else{
                    const updatedUser = await User.findByIdAndUpdate({_id:userFound._id},{verified:true})
                    res.status(200).json({message:"User has been verified successfully",success:true})
                }
            }
        }
    } catch (error) {
        console.log(error)
    }
})

router.get('/refresh/:refreshToken',async(req,res)=>{
    try{
        const {refreshToken} = req.params
        if(!refreshToken){
            res.json({message:"Refresh token is required"})
        }
        else{
            jwt.verify(refreshToken,jwtSecretKey,async(err,decoded)=>{
                if(err){
                    res.json({message:"Invalid refresh token,try logging in again."})
                }
                else{
                    const userId = decoded.user.id;
                    const user = await User.findById(userId);
                    if(!user){
                        res.json({message:"User not found"})
                    }
                    else{
                        const data={
                            user:{
                                id:userId
                            }
                        }
                            const accessToken = jwt.sign(data,jwtSecretKey,{expiresIn:"24h"});
                            res.json({message:"Access token generated successfully",accessToken})
                    }
                
                }
            })
        }
    }
    catch(err){
        console.log(err)
    }
})

//resend otp mail
router.post("/resend-mail/:email",async(req,res)=>{
    try {
        const {email} = req.params;
        console.log(email)
        const UserToFind = await User.findOne({email})
        if(!UserToFind){
            return res.status(400).json({message:"Email doesn't exist,try signing up.",success:false})
        }
        else{
            const otp = generateOtp();
            const otpExpirationTime = Date.now() + 10 * 60 * 1000;
            console.log(UserToFind._id)
            const updatedUser = await User.findByIdAndUpdate(UserToFind._id,{otp:otp,otpExpiresOn:otpExpirationTime},{new:true})
            const response = await sendMail({email,otp})
            res.status(200).json({message:"OTP has been Updated",success:true,updatedUser,response})
        }
    } catch (error) {
        console.log(error)
        res.status(400).json({message:"Can't send OTP.",success:false})
    }
})

router.post('/reset-password',async(req,res)=>{
    try{
        const {token,password} = req.body;
        const decoded = jwt.verify(token,jwtSecretKey);
        const userId = decoded.user.id;
        let userPresent = await User.findOne({_id:userId})
        if(!userPresent){
            res.status(404).json({message:"No user found",success:false})
        }
        else{
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password,salt);
            const updatedUser = await User.findByIdAndUpdate(userId,{password:hashedPassword},{new:true})
            res.status(200).json({message:"Password has been reset successfully",success:true})
        }
    }
    catch(err){
        console.log(err)
        res.status(400).json({message:'Cant reset your password right now',success:false})
    }
})

router.post('/send-pass-link/:email',async(req,res)=>{
    try {
        const {email} = req.params;
        let userEmail = await User.findOne({email});
        if(!userEmail){
            res.status(400).json({message:"Email is not registered",success:false})
        }
        else{
            let data={
                user:{
                    id:userEmail._id
                }
            }
            let tokenToSend = jwt.sign(data,jwtSecretKey,{expiresIn:'10m'})
            const response = await sendPassLink({email:email,token:tokenToSend})
            res.status(200).json({message:'Link sent successfully',success:true})
        }
    } catch (error) {
        console.log(error)
        res.status(400).json({message:"Cant send the link right now."})
    }
})

router.get('/secret',(req,res)=>{
    res.redirect("http://localhost:3000/menu")
})



module.exports = router;