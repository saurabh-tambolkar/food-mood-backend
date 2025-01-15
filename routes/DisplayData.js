const express = require("express")
const router = new express.Router()

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

module.exports = router;