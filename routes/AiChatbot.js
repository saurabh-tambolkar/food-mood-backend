const express = require("express");
const router = express.Router();


const { ChatMistralAI } = require("@langchain/mistralai");
const {
  HumanMessage,
  SystemMessage,
} = require("@langchain/core/messages");

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.7,
});

router.post("/chatbot", async (req, res) => {
    const {userQuery} = req.body;
    console.log(userQuery)
    if(!userQuery){
        return res.status(400).json({error: "Query is required"});
    }
    else{
        let messages= [
            new SystemMessage("You are a helpful assistant for a food delivery app. You help users find dishes, recommend meals based on their preferences,mood and diet too, and assist with any questions related to the menu or ordering process."),
            new HumanMessage(userQuery) 
        ]
        
        const response = await model.invoke(messages);
        return res.status(200).json({content:response.content,role:"Bot",success:true});
    }
}
);
module.exports = router;