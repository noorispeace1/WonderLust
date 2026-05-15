const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// =====================
// ENV
// =====================
const uri = process.env.MONGODB_URI;

// =====================
// MONGO (Vercel-safe cached connection)
// =====================
let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

// =====================
// JWT SETUP
// =====================
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
);

// =====================
// AUTH MIDDLEWARE
// =====================
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

// =====================
// ROUTES
// =====================
async function run() {
  try {
    const client = await clientPromise;
    const db = client.db("wanderlust");

    const destinationCollection = db.collection("destinations");
    const bookingCollection = db.collection("bookings");

    // ---------- DESTINATIONS ----------
    app.get("/destination", async (req, res) => {
      const result = await destinationCollection.find().toArray();
      res.json(result);
    });

    app.get("/destination/:id", async (req, res) => {
      const { id } = req.params;

      const result = await destinationCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });

    app.post("/destination", async (req, res) => {
      const result = await destinationCollection.insertOne(req.body);
      res.json(result);
    });

    app.post("/destinations", verifyToken, async (req, res) => {
      const result = await destinationCollection.insertOne(req.body);
      res.json(result);
    });

    app.patch("/destination/:id", async (req, res) => {
      const { id } = req.params;

      const result = await destinationCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: req.body }
      );

      res.json(result);
    });

    app.delete("/destination/:id", async (req, res) => {
      const { id } = req.params;

      const result = await destinationCollection.deleteOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });

    // ---------- BOOKINGS ----------
    app.get("/booking/:userId", async (req, res) => {
      const { userId } = req.params;

      const result = await bookingCollection.find({ userId }).toArray();
      res.json(result);
    });

    app.post("/booking", async (req, res) => {
      const result = await bookingCollection.insertOne(req.body);
      res.json(result);
    });

    app.delete("/booking/:bookingId", async (req, res) => {
      const { bookingId } = req.params;

      const result = await bookingCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });

      res.json(result);
    });

    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("Server Error:", err);
  }
}

run().catch(console.dir);

// =====================
// ROOT
// =====================
app.get("/", (req, res) => {
  res.send("Server is running fine!");
});
module.exports = app;
// app.listen(5000, () => {
//   console.log(`Server running on port ${5000}`);
// });