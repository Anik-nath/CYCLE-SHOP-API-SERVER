const express = require("express");
const { MongoClient } = require("mongodb");
const app = express();
var cors = require("cors");
require("dotenv").config();
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8qp7t.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
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

    //all data
    app.get("/cycles", async(req, res) => {
      const cursor = cycleCollection.find({});
      const allcycle = await cursor.toArray();
      res.send(allcycle);
    });

    //single data 
    app.get("/cycles/:id",async(req,res)=>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)}
        const oneBooking = await cycleCollection.findOne(query);
        res.json(oneBooking);
    });

     
    //order insert into database
    app.post('/orders',async(req,res)=>{
        const newOrder = req.body;
        const result  = await orderCollection.insertOne(newOrder);
        res.send(result)
    })

    //load orders
    app.get("/orders", async(req, res) => {
      const email = req.query.email;
      const query = {email : email};
      const cursor = orderCollection.find(query);
      const allOrder = await cursor.toArray();
      res.send(allOrder);
    });

    //save user data
    app.post('/users',async(req,res)=>{
      const User = req.body;
      const result = await userCollection.insertOne(User)
      res.json(result);
    })

//upsert
app.put('/users',async(req,res)=>{
  const user= req.body;
  const query = {email : user.email} 
  const options = {upsert : true}
  const updateDoc ={$set : user};
  const result  = await userCollection.updateOne(query,updateDoc,options)
  res.json(result);
})

//add role
app.put('/users/admin',async (req,res)=>{
  const user = req.body;
  const filter = {email: user.email}
  const updateDoc = {$set : {role : 'admin'}}
  const result = await userCollection.updateOne(filter,updateDoc);
  res.json(result);
})
//admin or not admin
    app.get('/users/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email : email};
      const user = await userCollection.findOne(query);
      let isAdmin = false;
      if(user?.role === 'admin'){
        isAdmin = true;
      }
      res.json({admin : isAdmin});
    }) 

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
