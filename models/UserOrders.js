const mongoose = require("mongoose");
const FoodItem = require("./FoodItems")

const OrderSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  orderDate:{
    type:Date,
    default:Date.now()
  },
  paymentId:{
    type:String,
    required:true,
    unique:true
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FoodItem', // Reference to a Product collection
      },
      size: {
        type: String,
        required: true,
      },
      price:{
        type:Number,
        required:true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  paid:{
    type:Boolean,
    default:false
  }
},{timestamps: true});

OrderSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
  });

const Orders = mongoose.model("Orders",OrderSchema)  ;
module.exports = Orders;