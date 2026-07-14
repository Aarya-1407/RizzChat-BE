require("dotenv").config();

let express = require("express");
let cors = require("cors");
let http = require("http");
let { Server } = require("socket.io");
let { ObjectId } = require("mongodb");

let { messageCollec, photoCollec, storiesCollec} = require("./config/db");
let { upload, cloudinary } = require("./config/cloudinary");

let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.post("/upload", upload.single("file"), (req,res)=>{
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  let obj = {
    username : req.body.username,
    caption : req.body.caption,
    file_url : req.file.path,
    file_name : req.file.filename
  }
  photoCollec.insertOne(obj)
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})

app.get("/files",(req,res)=>{
  photoCollec.find().toArray()
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err))
})

app.post("/story", upload.single("file"), (req,res)=>{
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  let obj = {
    username : req.body.username,
    caption : req.body.caption,
    file_url : req.file.path,
    file_name : req.file.filename,
    createdAt : new Date()
  }
  storiesCollec.insertOne(obj)
  .then((result)=> res.status(201).json(result))
  .catch((err)=> {
    console.error("Story insert failed:", err);
    res.status(500).json({ message: "Unable to save story right now." });
  })
})

app.get("/stories",(req,res)=>{
  storiesCollec.find().toArray()
  .then((result)=>res.json(result))
  .catch((err)=> {
    console.error("Stories fetch failed:", err);
    res.status(500).json({ message: "Unable to load stories right now." });
  })
})

app.delete("/delete/:id", (req,res)=>{
  let id = req.params.id;
  let _id = new ObjectId(id);
  photoCollec.findOne({_id})
  .then((obj)=>{
    cloudinary.uploader.destroy(obj.file_name);
    photoCollec.deleteOne({_id})
  })
  .then((result)=>res.send(result))
  .catch((err)=>res.send(err));
})

app.delete(["/story/:id", "/stories/:id"], async (req,res)=>{
  try {
    const id = req.params.id;
    let story = null;

    try {
      const _id = new ObjectId(id);
      story = await storiesCollec.findOne({ _id });
    } catch (err) {
      story = await storiesCollec.findOne({ _id: id });
    }

    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (story.file_name) {
      await cloudinary.uploader.destroy(story.file_name);
    }

    const deleteFilter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
    await storiesCollec.deleteOne(deleteFilter);
    res.status(200).json({ message: "Story deleted" });
  } catch(err) {
    console.error("Story delete failed:", err);
    res.status(500).json({ message: "Unable to delete story right now." });
  }
});

let httpServer = http.createServer(app);
let io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("getHistory", ()=>{
    messageCollec.find().toArray()
    .then((result)=>socket.emit("history",result))
    .catch((err)=>console.log(err))
  })

  socket.on("message", (data) => {
    messageCollec.insertOne(data)
    .then(()=>console.log("Saved"))
    .catch((err)=>console.log(err))
    io.emit("message", data);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

httpServer.listen(3000, () => console.log("Server is alive at 3000"));