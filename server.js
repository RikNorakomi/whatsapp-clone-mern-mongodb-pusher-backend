// imports
import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Pusher from "pusher";
import cors from "cors";

// app config
const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
  appId: "1068563",
  key: "a87a1c1a2aec326fcd61",
  secret: "37a06c133f2b7d4989cc",
  cluster: "eu",
  encrypted: true,
});

// middleware
app.use(express.json());
app.use(cors());

// Cors sets the headers for us so the below can be omitted!!

// app.use((req, res, next) => {
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Headers", "*");
//   next();
// });

// DB configuration
const userName = "admin";
const pw = "Y0q1UOcf8sXCNdov";
const connection_url = `mongodb+srv://${userName}:${pw}@cluster0.vrgur.mongodb.net/whatsappclonedb?retryWrites=true&w=majority`;

mongoose.connect(connection_url, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Pusher
const db = mongoose.connection;
db.once("open", () => {
  console.log("DB is connected");

  const messageCollection = db.collection("messagecontents");
  const changeStream = messageCollection.watch();

  changeStream.on("change", (change) => {
    console.log("A change occured: ", change);

    if (change.operationType === "insert") {
      const messageDetails = change.fullDocument;
      pusher.trigger("messages", "inserted", {
        name: messageDetails.name,
        message: messageDetails.message,
        timestamp: messageDetails.timestamp,
        received: messageDetails.received,
      });
    } else {
      console.log("Error triggering pusher!");
    }
  });
});

// api routes
// base url health check that returns hello world in the browser
app.get("/", (req, res) =>
  res.status(200).send(`Hello world! on port:${port}`)
);

app.get("/messages/sync", (req, res) => {
  Messages.find((err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

app.post("/messages/new", (req, res) => {
  const dbMessage = req.body;

  Messages.create(dbMessage, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(201).send(data);
    }
  });
});

// listener
app.listen(port, console.log(`Listening on localhost:${port}`));
