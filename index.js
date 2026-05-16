const express = require("express");
const cors = require("cors");
const { chats } = require("./data/data");
const dbConnect = require("./config/db");

const app = express();
dbConnect();
app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello World");
});
app.get("/about", (req, res) => {
  res.send("welcome to about page of techyvercity");
});

app.get("/chats", (req, res) => {
  res.send(chats);
});

app.get("/chats/:id", (req, res) => {
  const chat = chats.find((c) => c._id === req.params.id);
  if (chat) {
    res.send(chat);
  } else {
    res.status(404).send("Chat not found");
  }
});

app.use("/api/auth", require("./routes/Auth"));
app.use("/api/products", require("./routes/Product"));

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
