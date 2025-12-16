const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

require("dotenv").config();

const port = process.env.PORT || 4000;

// mongodb uri connect
const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("welcome");
});

async function run() {
  try {
    await client.connect();
    const database = client.db("clubify");
    const usersCollection = database.collection("users");
    const clubsCollection = database.collection("clubs");

    // create user with default role
    app.post("/users", async (req, res) => {
      try {
        const info = req.body;
        const query = { email: info.email };
        const existedEmail = await usersCollection.findOne(query);
        console.log(existedEmail);

        if (existedEmail) {
          return res.status(409).json({
            message: "User already exist.",
          });
        }

        info.role = "member";
        info.createdAt = new Date();

        console.log(info);
        const result = await usersCollection.insertOne(info);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    //  user role
    app.get("/users/:email/role", async (req, res) => {
      try {
        const { email } = req.params;

        const query = { email };

        const result = await usersCollection.findOne(query);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // ------------------club related api--------------------

    // create club api
    app.post("/clubs", async (req, res) => {
      try {
        const clubInfo = req.body;
        clubInfo.status = "pending";
        clubInfo.createdAt = new Date();

        console.log(clubInfo);
        const result = await clubsCollection.insertOne(clubInfo);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // edit club api
    app.patch("/clubs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const updatedData = req.body;
        console.log({ ...updatedData });
        const update = { $set: { ...updatedData } };
        const result = await clubsCollection.updateOne(query, update);
        res.json(result);
        console.log(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get all clubs
    app.get("/clubs", async (req, res) => {
      try {
        const { email } = req.query;
        console.log(email);
        const query = {};
        if (email) {
          query.managerEmail = email;
        }
        console.log(query);

        const cursor = clubsCollection.find(query);
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // delete club
    app.delete("/clubs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await clubsCollection.deleteOne(query);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`App listening on port : ${port}`);
});
