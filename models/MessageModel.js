const mongoose = require("mongoose");
const MessageSchema = new mongoose.Schema({
    sender:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    receiver:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
    },
    message:{
        type:String,
        required:true,
    },
    read:{
        type:Boolean,
        default:false,
    },
    time:{
        type:Date,
        default:Date.now,
    }
})

const Message = new mongoose.model("Message",MessageSchema);
module.exports = Message;