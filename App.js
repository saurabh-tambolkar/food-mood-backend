const express = require("express");
const app = express();

const ConnectDb = require('./ConnectDb')
ConnectDb();

const cors = require('cors')
// const corsOptions = {
//     origin: "https://food-mood-frontend.vercel.app",
//     methods: "GET,POST,PUT,DELETE",
//     credentials: true, // Allows cookies to be sent from frontend
// };
const corsOptions = {
    origin:  ["http://localhost:3000", "http://localhost:3001"], // Replace with your frontend origin
    credentials: true, // Allows cookies to be sent from frontend
};
app.use(cors(corsOptions))

var cookieParser = require('cookie-parser')
app.use(cookieParser());

require('dotenv').config()
const port = process.env.PORT_NUMBER || 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))

const DataRouter=require('./routes/DisplayData')
app.use('/api',DataRouter)

const OrderRouter = require('./routes/CreateOrder')
app.use('/api',OrderRouter);

const PaymentRouter = require('./routes/PaymentRoutes')
app.use('/api',PaymentRouter);

const CreateUser = require("./routes/CreateUser")
app.use("/api",CreateUser)

const Cart = require('./routes/AddCart')
app.use("/api",Cart)


app.get('/',(req,res)=>{
    res.send('Hello this is server of food mood')
})

app.listen(port,()=>{
    console.log("server is running on port No. ",port)
})

