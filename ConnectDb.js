const mongoose = require("mongoose")

require('dotenv').config()

const ConnectDb=async()=>{
    try {
        const response = await mongoose.connect(process.env.MONGO_URI)
        if(response){
            console.log("Database connected");
            const foodSchema = mongoose.Schema({})
            const foodModel = mongoose.model("food_items", foodSchema)
            const foodItems = await foodModel.find({})
            // console.log(foodItems)
            if(foodItems){
                global.food_items=foodItems
            }
            else{
                console.log("no data")
            }
        }
        else{
            console.log("Database not connected")
        }
    } catch (error) {
        console.log(error)
    }
}
module.exports=ConnectDb;