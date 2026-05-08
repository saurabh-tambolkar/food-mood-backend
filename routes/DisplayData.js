const express = require("express")
const router = new express.Router()
const FoodItem = require('../models/FoodItems')
const Category = require('../models/CategoryModel')

const foodCategory = [
  { _id: "657ad039f9254bc7e33f51ca", CategoryName: "Starter" },
  { _id: "657ad039f9254bc7e33f51cb", CategoryName: "Biryani/Rice" },
  { _id: "657ad039f9254bc7e33f51cc", CategoryName: "Pizza" }
];



router.get("/fooddata",(req,res)=>{
    try {
        global.food_category=[
            {"_id":{"$oid":"657ad039f9254bc7e33f51ca"},"CategoryName":"Starter"},
            {"_id":{"$oid":"657ad039f9254bc7e33f51cb"},"CategoryName":"Biryani/Rice"},
            {"_id":{"$oid":"657ad039f9254bc7e33f51cc"},"CategoryName":"Pizza"}
        ]
        // console.log("data sent")
        res.send([global.food_items,global.food_category])
    } catch (error) {
        console.log(error)
        res.send("server error")
    }
})

router.get('/getFood/:catId', async (req, res) => {
  try {
    const catId = req.params.catId;
    console.log(catId);

    const food = await FoodItem.find(
      { category: catId },
      { 'options._id': 0 } // <-- Exclude _id from each options element
    ).populate("category", "categoryName"); ;

    res.status(200).json({
      message: "Food items fetched successfully",
      food,
      success: true,
      numberOfDishes: food.length,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({
      message: "Unable to fetch dishes",
      success: false,
    });
  }
});


router.put('/update-food-item/:id', async (req, res) => {
  console.time("updateFoodItem");

  try {
    let { id } = req.params;
    let { catId,name } = req.body;
    console.log(catId,name)

    let updatedFoodItem = await FoodItem.findByIdAndUpdate(
      id,
      { category: catId,name:name},
      { new: true }
    );

    res.json({  
      status: true,
      updatedFoodItem
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ status: false });
  }
});



module.exports = router;