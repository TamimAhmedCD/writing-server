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
      const { id } = req.params;  // Get the blog ID from the URL parameter
    
      try {
        // Convert the string ID to ObjectId type
        const objectId = new ObjectId(id);
    
        // Find the blog by ID
        const blog = await blogCollection.findOne({ _id: objectId });
    
        if (blog) {
          res.send(blog);  // Send the blog data if found
        } else {
          res.status(404).send({ error: "Blog not found" });  // If no blog found
        }
      } catch (error) {
        console.error("Error fetching blog by ID:", error);
        res.status(500).send({ error: "Failed to fetch blog" });
      }
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
