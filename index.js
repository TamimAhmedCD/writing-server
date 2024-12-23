const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k9pcb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    // Blog Collection
    const blogCollection = client.db("blogDb").collection("blog");

    // get all Blog api
    app.get("/blog", async (req, res) => {
      const cursor = blogCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // get recent Blog post api
    app.get("/recentBlog", async (req, res) => {
      const recentBlog = await blogCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();
      res.send(recentBlog);
    });

    // get blog using id
    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    // get blog using userEmail
    app.get("/blogs", async (req, res) => {
      const email = req.query.email;

      let query = {};

      if (email) {
        query = { userEmail: email };
      }

      const cursor = blogCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    // get blog using category
    app.get("/blogCategory", async (req, res) => {
      const category = req.query.category; // Retrieve the category from the query string
      
      let query = {};
    
      if (category) {
        query = { category: category }; // Filter blogs based on category
      }
    
      const cursor = blogCollection.find(query); // Execute the query on the blog collection
      const result = await cursor.toArray(); // Convert the result to an array
    
      res.send(result); // Send the filtered data as a response
    });
    

    // Blog post api
    app.post("/blog", async (req, res) => {
      const newBlog = req.body;
      const result = blogCollection.insertOne(newBlog);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Blogger are Writing Blogs");
});

app.listen(port, () => {
  console.log(`Blogger writing Blog on port: ${port}`);
});
