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
    const eventsCollection = database.collection("events");

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
    app.get("/users/role/:email", async (req, res) => {
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

    // user patch
    app.patch("/users/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const roleInfo = req.body;
        console.log(roleInfo.role);
        const updatedInfo = {
          $set: { role: roleInfo?.role },
        };
        const result = await usersCollection.updateOne(query, updatedInfo);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get all users
    app.get("/users", async (req, res) => {
      try {
        const cursor = usersCollection.find({});
        const result = await cursor.toArray();
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
        clubInfo.membersCount = 0;
        clubInfo.eventsCount = 0;

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

    // approve or reject club

    app.patch("/clubs/status/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const query = { _id: new ObjectId(id) };
        console.log(query);
        const statusInfo = req.body;
        const updatedInfo = {
          $set: { status: statusInfo.status, verifiedAt: new Date() },
        };
        const result = await clubsCollection.updateOne(query, updatedInfo);
        const managerQuery = { email: statusInfo?.managerEmail };
        const findAdmin = await usersCollection.findOne(managerQuery);
        if (statusInfo.status === "approved" && findAdmin.role !== "admin") {
          const roleUpdate = {
            $set: { role: "manager" },
          };
          await usersCollection.updateOne(managerQuery, roleUpdate);
        }
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
        // updtae events collection also
        const eventQuery = { clubId: id };
        const eventUpdate = {
          $set: {
            clubName: updatedData?.clubName,
            category: updatedData?.category,
          },
        };
        await eventsCollection.updateMany(eventQuery, eventUpdate);
        res.json(result);
        console.log(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get clubs by specefic email
    app.get("/clubs", async (req, res) => {
      try {
        const { email } = req.query;
        console.log(email);
        const query = {};
        if (email) {
          query.managerEmail = email;
        }
        console.log(query);

        const cursor = clubsCollection.find(query).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get all clubs
    app.get("/all-clubs", async (req, res) => {
      try {
        const {
          sort = "createdAt",
          order = "desc",
          filter,
          search,
        } = req.query;
        const sortOption = {};
        sortOption[sort || "createdAt"] = order === "asc" ? 1 : -1;
        const query = {};
        if (filter) {
          query.category = filter;
        }
        if (search) {
          query.clubName = { $regex: search, $options: "i" };
        }
        console.log(query);

        const cursor = clubsCollection.find(query).sort(sortOption);
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get all categories
    app.get("/all-categories", async (req, res) => {
      try {
        const projectField = { category: 1, _id: 0 };
        const cursor = clubsCollection.find().project(projectField);
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
        const clubDeleteResult = await clubsCollection.deleteOne(query);

        await eventsCollection.deleteMany({ clubId: id });

        res.json(clubDeleteResult);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // latest 8 clubs for all
    app.get("/latest-clubs", async (req, res) => {
      try {
        const sortFields = { createdAt: -1 };
        const query = { status: "approved" };
        const cursor = clubsCollection.find(query).sort(sortFields).limit(8);

        const result = await cursor.toArray();

        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // club details api
    app.get("clubs/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };
        const result = await clubsCollection.findOne(query);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // ---------event-----------
    app.post("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        console.log(id);
        const findId = { _id: new ObjectId(id) };
        const eventInfo = req.body;

        const findClub = await clubsCollection.findOne(findId);

        if (eventInfo && findClub) {
          eventInfo.clubName = findClub?.clubName;
          eventInfo.category = findClub?.category;
          eventInfo.createdAt = new Date();
          eventInfo.isPaid = false;
          eventInfo.managerEmail = findClub?.managerEmail;
        }

        const result = await eventsCollection.insertOne(eventInfo);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // events by manager
    app.get("/events", async (req, res) => {
      try {
        const { email } = req.query;
        console.log(email);
        const query = { managerEmail: email };
        console.log(query);
        const cursor = eventsCollection.find(query).sort({ createdAt: -1 });
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // update event

    app.patch("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = { _id: new ObjectId(id) };

        const updatedInfo = req.body;
        console.log(updatedInfo?.clubId);
        const findClub = await clubsCollection.findOne({
          _id: new ObjectId(updatedInfo?.clubId),
        });
        console.log(findClub);
        if (findClub) {
          updatedInfo.clubName = findClub?.clubName;
          updatedInfo.category = findClub?.category;
        }

        const info = {
          $set: { ...updatedInfo },
        };

        const result = await eventsCollection.updateOne(query, info);
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // delete event
    app.delete("/events/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const query = { _id: new ObjectId(id) };
        const result = await eventsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get upcoming events
    app.get("/upcoming-events", async (req, res) => {
      try {
        const cursor = eventsCollection
          .find({})
          .sort({ eventDate: 1 })
          .limit(3);
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // all events
    app.get("/all-events", async (req, res) => {
      try {
        const { sort = "eventDate", order = "asc", filter, search } = req.query;

        const sortOption = {};
        sortOption[sort] = order === "asc" ? 1 : -1;

        console.log(sortOption);
        const query = {};

        if (filter) {
          query.category = filter;
        }

        if (search) {
          query.title = { $regex: search, $options: "i" };
        }

        console.log(search);

        const cursor = eventsCollection.find(query).sort(sortOption);
        const result = await cursor.toArray();
        res.json(result);
      } catch (error) {
        console.log(error);
        res.status(500).json({
          message: "Internal server error.",
        });
      }
    });

    // get all events categories
    app.get("/event-categories", async (req, res) => {
      try {
        const projectField = { category: 1, _id: 0 };
        const cursor = eventsCollection.find().project(projectField);
        const result = await cursor.toArray();
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
