const mongoose = require('mongoose');

// Define the FoodItem Schema
const FoodItemSchema = new mongoose.Schema({
  CategoryName: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  img: {
    type: String,
    required: true,
  },
  description: { type: String },
  options: [
    {
      regular: { type: Number },
      medium: { type: Number },
      large: { type: Number },
    },
  ],
});

// Register the model and ensure it references the existing 'food_items' collection
const FoodItem = mongoose.model('FoodItem', FoodItemSchema, 'food_items');
module.exports = FoodItem;
