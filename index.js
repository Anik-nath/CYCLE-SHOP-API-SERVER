const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
var cors = require("cors");
// for stripe 
const bodyparser = require('body-parser')
const stripe = require("stripe")("sk_test_51JvoRLD2rkmj0KzmboKYKA0JMxjOu0GEOB1g0LvUGqihP5hOXr4KGTZD3NVfKEmjXt2EVYpZM5YRE4ALg1sPJqAn00isUy4mVk");
const uuid = require("uuid").v4;
require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

app.use(cors());
app.use(cors({origin: "*",}))
app.use(express.json());
//for stripe
app.use(bodyparser.urlencoded({ extended: false }))
app.use(bodyparser.json())

var uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-fpqkjij-shard-00-00.xbk29ye.mongodb.net:27017,ac-fpqkjij-shard-00-01.xbk29ye.mongodb.net:27017,ac-fpqkjij-shard-00-02.xbk29ye.mongodb.net:27017/?ssl=true&replicaSet=atlas-qjfq6h-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;
// console.log(uri); 

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    console.log("database connect success");
    const database = client.db("cycleShopdb");
    const cycleCollection = database.collection("cycles");
    const orderCollection = database.collection("orders");
    const userCollection = database.collection("users");
    const reviewCollection = database.collection("reviews");
    const cartCollection = database.collection("cartList");
    const subscribeEmail = database.collection("subscribeEmail");

    //all cart data
    app.get("/cartList", async (req, res) => {
      const cursor = cartCollection.find({});
      const allcycle = await cursor.toArray();
      res.send(allcycle);
    });

    app.post("/cartList", async (req, res) => {
      const newCart = req.body;
      console.log(newCart);
      const addCart = await cartCollection.insertOne(newCart);
      res.send(addCart);
    });
    // -------subscribed email--------//
    app.post("/subscribeEmail", async (req, res) => {
      const subscribeData = req.body;
      const result = await subscribeEmail.insertOne(subscribeData);
      res.send(result);
    });

    //all data
    app.get("/cycles", async (req, res) => {
      const cursor = cycleCollection.find({});
      const allcycle = await cursor.toArray();
      res.send(allcycle);
    });

    //single data
    app.get("/cycles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const oneBooking = await cycleCollection.findOne(query);
      res.json(oneBooking);
    });

    //delete
    app.delete("/cycles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const oneDelete = await cycleCollection.deleteOne(query);
      res.json(oneDelete);
    });

    //order or purchase insert
    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
    });
    //delete orders
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const oneDelete = await orderCollection.deleteOne(query);
      res.json(oneDelete);
    });
    //add product
    app.post("/cycles", async (req, res) => {
      const newCycle = req.body;
      const addOneCycle = await cycleCollection.insertOne(newCycle);
      res.send(addOneCycle);
    });
    //load orders
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = orderCollection.find(query);
      const allOrder = await cursor.toArray();
      res.send(allOrder);
    });

    //save user data
    app.post("/users", async (req, res) => {
      const User = req.body;
      const result = await userCollection.insertOne(User);
      res.json(result);
    });

    //review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.json(result);
    });

    //load review
    app.get("/reviews", async (req, res) => {
      const cursor = reviewCollection.find({});
      const allReview = await cursor.toArray();
      res.send(allReview);
    });

    //upsert
    app.put("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await userCollection.updateOne(query, updateDoc, options);
      res.json(result);
    });

    //add role
    app.put("/users/admin", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const updateDoc = { $set: { role: "admin" } };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.json(result);
    });
    //admin or not admin
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
     // -------------------stripe-----------------
     app.get("/", (req, res) => {
      res.send("Add your Stripe Secret Key to the .require('stripe') statement!");
    });
    app.post("/checkout", async (req, res) => {
      console.log("Request:", req.body);
     
      let error;
      let status;
      try {
        const { product, token } = req.body;
     
        const customer = await stripe.customers.create({
          email: token.email,
          source: token.id,
        });
     
        const idempotency_key = uuid();
        const charge = await stripe.charges.create(
          {
            amount: product.price * 100,
            currency: "usd",
            customer: customer.id,
            receipt_email: token.email,
            description: `Purchased the ${product.name}`,
            shipping: {
              name: token.card.name,
              address: {
                line1: token.card.address_line1,
                line2: token.card.address_line2,
                city: token.card.address_city,
                country: token.card.address_country,
                postal_code: token.card.address_zip,
              },
            },
          },
          {
            idempotency_key,
          }
        );
        console.log("Charge:", { charge });
        status = "success";
      } catch (error) {
        console.error("Error:", error);
        status = "failure";
      }
     
      res.json({ error, status });
    });
  } finally {
    //   await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("cylce shop !");
});

app.listen(port, () => {
  console.log(`cylce shop listening at http://localhost:${port}`);
});
