const mongoose=require("mongoose");
const CategorySchema=mongoose.Schema({
    categoryName:{
        type:String,
        required:true,
        unique:true
    },
    imageUrl:{
        type:String,
        required:true
    }
},{timestamps:true});

const Category = mongoose.model("Category",CategorySchema);
module.exports = Category;