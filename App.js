const express = require("express");
const app = express();

const http = require("http");
const socketIO = require("socket.io");
const server = http.createServer(app);

const ConnectDb = require("./ConnectDb");
ConnectDb();

const cors = require("cors");
// const corsOptions = {
//     origin: "https://food-mood-frontend.vercel.app",
//     methods: "GET,POST,PUT,DELETE",
//     credentials: true, // Allows cookies to be sent from frontend
// };
const corsOptions = {
  origin: ["http://localhost:3000","http://192.168.1.11:3000", "http://admin.localhost:3001","https://food-mood-frontend.vercel.app"], // Replace with your frontend origin
  methods: "GET,POST,PUT,DELETE",
  credentials: true, // Allows cookies to be sent from frontend
};
app.use(cors(corsOptions));

var cookieParser = require("cookie-parser");
app.use(cookieParser());

require("dotenv").config();
const port = process.env.PORT_NUMBER || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DataRouter = require("./routes/DisplayData");
app.use("/api", DataRouter);

const OrderRouter = require("./routes/CreateOrder");
app.use("/api", OrderRouter);

const PaymentRouter = require("./routes/PaymentRoutes");
app.use("/api", PaymentRouter);

const CreateUser = require("./routes/CreateUser");
app.use("/api", CreateUser);

const Cart = require("./routes/AddCart");
app.use("/api", Cart);

const Message = require("./routes/Messages");
app.use("/api", Message);

const AdminStats = require("./routes/AdminStats");
app.use("/api", AdminStats);

const Categories = require("./routes/Categories");
app.use("/api", Categories);

app.get("/", (req, res) => {
  res.send("Hello this is server of food mood");
});

const io = socketIO(server, {
  cors: {
    origin: ["http://localhost:3000","http://192.168.1.11:3000","http://admin.localhost:3001","https://food-mood-frontend.vercel.app"],
    credentials: true,
  },
});
global.onlineUsers = {}; // 👈 Track all connected users
global.io = io;

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("addUser", (userId) => {
    global.onlineUsers[userId] = socket.id;
    console.log("✅ User added:", userId);
    console.log(
      "🧍 Total Online Users:",
      Object.keys(global.onlineUsers).length
    );
    console.log(
      "🧍 Online Users:",
      global.onlineUsers
    );
  });

  socket.on("sendMessage", ({ sender, receiver, message, time }) => {
    const receiverSocketId = global.onlineUsers[receiver];
    console.log(`📩 Message from ${sender} to ${receiver} ->`, message);

    if (receiverSocketId) {
      global.io.to(receiverSocketId).emit("receiveMessage", {
        sender,
        message,
        time,
      });
    } else {
      console.log("⚠️ Receiver not online:", receiver);
    }
  });

  socket.on("disconnect", () => {
    for (let [uid, sid] of Object.entries(global.onlineUsers)) {
      if (sid === socket.id) {
        delete global.onlineUsers[uid];
        break;
      }
    }
    console.log("🔴 User disconnected:", socket.id);
  });
});

// =======================
// 🔁 Start Server
// =======================
server.listen(port,"0.0.0.0", () => {
  console.log("Server is running on port No.", port);
});
module.exports = { io };

// app.listen(port,()=>{
//     console.log("server is running on port No. ",port)
// })
