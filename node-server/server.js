const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Port = 4000;

const app = express();
app.use(express.json()); // Use Express's built-in body 
app.use(cors());

const connectDB = async () => {
  try {
    // Replace <username>, <password>, and <dbname> with your actual MongoDB credentials and database name
    await mongoose.connect(
      "mongodb+srv://dbUser:dbUserPassword@cluster0.z5cj0z3.mongodb.net/node?retryWrites=true&w=majority&appName=Cluster0"
    );
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
};

connectDB();

const eventSchema = new mongoose.Schema({
  action: String, // Changed from eventType to action
  request_id: String, // Added request_id field
  author: String,
  fromBranch: String,
  toBranch: String,
  timestamp: Date,
});

const Event = mongoose.model("Event", eventSchema);

// Webhook endpoint
app.post("/webhook", async (req, res) => {
  console.log("Webhook event received:", req.body);
  
  const { action, sender, repository, pull_request, head_commit } = req.body;
  let eventType;
  let fromBranch;
  let toBranch;
  let request_id;

  switch (req.headers["x-github-event"]) {
    case "push":
      action = "PUSH";
      fromBranch = null;
      toBranch = req.body.ref.split("/").pop();
      request_id = head_commit.id; // Use commit hash for push event
      break;
    case "pull_request":
      action = "PULL";
      fromBranch = pull_request.head.ref;
      toBranch = pull_request.base.ref;
      request_id = pull_request.id; // Use PR ID for pull request event
      break;
    case "pull_request_review":
      if (action === "closed" && pull_request.merged) {
        action = "MERGE";
        fromBranch = pull_request.head.ref;
        toBranch = pull_request.base.ref;
      }
      break;
    default:
      return res.sendStatus(400);
  }

  const newEvent = new Event({
    action,
    author: sender.login,
    fromBranch,
    toBranch,
    timestamp: new Date(),
    request_id,
  });

  try {
    await newEvent.save();
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// Endpoint to fetch events
app.get("/events", async (req, res) => {
  try {
    const events = await Event.find({});
    res.json(events);
  } catch (err) {
    res.sendStatus(500);
  }
});

app.listen(Port, () => {
  console.log(`Server listening on port ${Port}`);
});
