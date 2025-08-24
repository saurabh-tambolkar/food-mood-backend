const express = require('express');
const Category = require('../models/CategoryModel');
const router = express.Router();

router.get("/categories",async(req,res)=>{
    try {
        let categories = await Category.find();
        console.log(categories)
        let catToSend = categories.map((cat)=>({
            catId:cat._id,
            catName: cat.categoryName,
            imageUrl:cat.imageUrl
        }))
        res.status(200).json({message:"Categories fetched successfully",totalCategories:categories.length,categories:catToSend,success:true})
    } catch (error) {
        console.log(error)
         res.status(401).json({message:"Unable to fetch categories right now",success:false})
    }
})

router.post("/add-category",async(req,res)=>{
    try{
        const {catName,imageUrl} = req.body;
        const newCategory = new Category({
            categoryName:catName,
            imageUrl
        })
        await newCategory.save();
        console.log(newCategory)
        res.status(200).json({message:"Category added successfully!",success:true})
    }
    catch(err){
        console.log(err)
        res.status(401).json({message:"Coundn't add new category right now",success:false})
    }
})

module.exports = router;