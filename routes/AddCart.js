const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Cart = require("../models/CartModel");
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const authenticateUser = (req, res, next) => {
  // Retrieve token from cookie/header
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided.", success: false });
  }

  try {
    // console.log(token);
    // Verify token and attach decoded user info to request object
    const decoded = jwt.verify(token, jwtSecretKey);
    req.user = decoded.user.id; // assuming 'user' is the payload in your token
    next();
  } catch (error) {
    console.log(error);
    return res
      .status(401)
      .json({ message: "Invalid token.", error, success: false });
  }
};

router.post("/addToCart", authenticateUser, async (req, res) => {
  try {
    const userId = req.user;
    const item = req.body;
    let cartPresent = await Cart.findOne({ userId: userId });
    if (cartPresent) {
      let prodArr = cartPresent.products;
      let isProdInCart = prodArr.some(
        (prod) => prod.productId == item.productId && prod.size == item.size
      );
      if (isProdInCart) {
        // console.log("yes",item,prodArr)
        let updatedProducts = prodArr.map((prod) => {
          if (
            prod.productId.toString() === item.productId && // Compare as strings
            prod.size === item.size
          ) {
            prod.quantity = Number(prod.quantity) + Number(item.quantity); // Increment quantity
            prod.price =
              Number(prod.price) + Number(item.price) * Number(item.quantity); // Update price for the added quantity
          }
          // console.log(prod)
          return prod;
        });
        let updatedCart = await Cart.findByIdAndUpdate(
          cartPresent._id,
          {
            products: updatedProducts,
            totalAmount: Number(cartPresent.totalAmount) + Number(item.price),
          },
          { new: true }
        );

        return res.status(200).json({
          message: "Product quantity updated in the cart",
          success: true,
          cart: updatedCart,
        });
      } else {
        let newTotalPrice =
          Number(cartPresent.totalAmount) + Number(item.price);
        let newProductArray = [...cartPresent.products, item];
        let updatedCart = await Cart.findByIdAndUpdate(
          cartPresent._id,
          { totalAmount: newTotalPrice, products: newProductArray },
          { new: true }
        );
        res
          .status(200)
          .json({ message: "Item has been added to the cart", success: true });
        // res.json({newProductArray,newTotalPrice})
      }
    } else {
      let newCart = new Cart({
        userId,
        products: item,
        totalAmount: item.price,
      });
      await newCart.save();
      res
        .status(200)
        .json({ message: "Item added to cart successfully", success: true });
    }
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ error, message: "Cant add product to cart", success: false });
  }
});

router.get("/getCart", authenticateUser, async (req, res) => {
  try {
    let userId = req.user;
    let cart = await Cart.findOne({ userId }).populate("products.productId");
    if (cart !== null) {
      res.status(201).json({ cart, success: true });
    } else {
      res.status(404).json({ message: "Cart is empty", success: false });
    }
  } catch (err) {
    console.log(err);
    res
      .status(404)
      .json({ message: "Cant get the cart items", success: false });
  }
});

router.delete("/empty-cart", authenticateUser, async (req, res) => {
  try {
    let userId = req.user;
    let cart = await Cart.findOneAndDelete({ userId });
    res.status(200).json({ message: "Cart has been emptied.", success: true });
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({ message: "Cart cannot be emptied.", success: false });
  }
});

router.get("/getCartLength", authenticateUser, async (req, res) => {
  try {
    let userId = req.user;
    let cart = await Cart.findOne({ userId });
    if (cart !== null) {
      let numberOfItemsInCart = cart.products.length || 0;
      res.status(201).json({ numberOfItemsInCart, success: true });
    } else {
      res.status(400).json({ message: "Cart is empty", success: false });
    }
  } catch (err) {
    console.log(err);
    res
      .status(404)
      .json({ message: "Cant get the cart items", success: false });
  }
});

router.post("/updateQuantity/:opr", authenticateUser, async (req, res) => {
  try {
    let { opr } = req.params;
    let userId = req.user;
    let item = req.body;

    let cart = await Cart.findOne({ userId });
    let prodArr = cart.products;

    let isProdInCart = prodArr.some(
      (prod) => prod.productId == item.productId && prod.size == item.size
    );

    if (isProdInCart) {
      if (opr == "dec") {
        let updatedProducts = prodArr.map((prod) => {
          if (
            prod.productId.toString() === item.productId &&
            prod.size === item.size
          ) {
            let currentQuantity = Number(prod.quantity);
            let currentPrice = Number(prod.price);

            prod.quantity = currentQuantity - 1;
            if (prod.quantity > 0) {
                prod.price = currentPrice - (currentPrice / currentQuantity);
                return prod;
            } else {
                // Handle case where quantity becomes 0 (optional)
                // prod.price = 0;
                return null;
            }
          }
          return prod;
        }).filter((prod) => prod !== null);
        let updatedTotalAmount = updatedProducts.reduce(
            (acc, prod) => acc + Number(prod.price),
            0
          );

        let updatedCart = await Cart.findByIdAndUpdate(
            cart._id,
            {
              products: updatedProducts,
              totalAmount:updatedTotalAmount
            },
            { new: true }
          );
  
          return res.status(200).json({
            message: "Product quantity updated in the cart",
            success: true,
            cart: updatedCart,
          });
      }
      else{
        let updatedProducts = prodArr.map((prod) => {
            if (
              prod.productId.toString() === item.productId &&
              prod.size === item.size
            ) {
              let currentQuantity = Number(prod.quantity);
              let currentPrice = Number(prod.price);
  
              prod.quantity = currentQuantity + 1;
              if (prod.quantity > 0) {
                  prod.price = currentPrice + (currentPrice / currentQuantity);
              } else {
                  // Handle case where quantity becomes 0 (optional)
                  prod.price = 0;
              }
            }
            console.log("this is prod", prod, prod.price);
            return prod;
          });
          let updatedTotalAmount = updatedProducts.reduce(
              (acc, prod) => acc + Number(prod.price),
              0
            );
  
          let updatedCart = await Cart.findByIdAndUpdate(
              cart._id,
              {
                products: updatedProducts,
                totalAmount:updatedTotalAmount
              },
              { new: true }
            );
    
            return res.status(200).json({
              message: "Product quantity updated in the cart",
              success: true,
              cart: updatedCart,
            });
      }
    }
  } catch (err) {
    console.log(err);
    res
      .status(400)
      .json({
        err,
        message: "Cant update the quantity of the item.",
        success: false,
      });
  }
});

module.exports = router;
