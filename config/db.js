let { MongoClient } = require("mongodb");

let client = new MongoClient(process.env.MONGO_URL);
client.connect();

let db = client.db("project1");

const messageCollec = db.collection("messages");
const photoCollec = db.collection("files");
const storiesCollec = db.collection("stories");   // 👈 NEW collection

// TTL index: auto-delete after 24 hours (86400 seconds)
storiesCollec.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

module.exports = {
  messageCollec,
  photoCollec,
  storiesCollec   // 👈 Export it so server.js can use it
};
