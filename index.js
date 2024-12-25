const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://writing-tamim.web.app",
      "https://writing-tamim.firebaseapp.com/",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log("inside the logger");
  next();
};

const verifyToken = (req, res, next) => {
  // console.log('inside verify token middleware', req.cookies);
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" });
    }
    req.user = decoded;
    next();
  });
};

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
    // await client.connect();

    // Blog Collection
    const blogCollection = client.db("blogDb").collection("blog");
    const wishListCollection = client.db("blogDb").collection("wish-list");
    const commentCollection = client.db("blogDb").collection("comment");

    // auth related apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    app.post("/logout", (req, res) => {
      res
        .clearCookie("token", {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // get all Blog api
    app.get("/blog", logger, async (req, res) => {
      console.log("inside the api callback");
      const cursor = blogCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Blog post api
    app.post("/blog", async (req, res) => {
      const newBlog = req.body;
      const result = blogCollection.insertOne(newBlog);
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

    // get all categories
    app.get("/categories", async (req, res) => {
      try {
        // Use aggregation to fetch distinct categories
        const categories = await blogCollection
          .aggregate([{ $group: { _id: "$category" } }])
          .toArray();

        // Extract categories from the aggregation result
        const categoryList = categories.map((item) => item._id);

        if (categoryList.length === 0) {
          return res.status(404).send({ message: "No categories found" });
        }

        res.send(categoryList);
      } catch (error) {
        console.error("Error fetching categories:", error);
        res
          .status(500)
          .send({ message: "Error fetching categories", error: error.message });
      }
    });

    // get blog using category
    app.get("/blogCategory", async (req, res) => {
      const category = req.query.category;

      let query = {};

      if (category) {
        query = { category: category };
      }

      const cursor = blogCollection.find(query);
      const result = await cursor.toArray();

      res.send(result);
    });

    // get blog by search
    app.get("/search", async (req, res) => {
      const searchQuery = req.query.q;

      try {
        // Perform a search query on the collection
        const blogsCursor = await blogCollection.find({
          $or: [
            { blogTitle: { $regex: searchQuery, $options: "i" } },
            { longDes: { $regex: searchQuery, $options: "i" } },
          ],
        });

        // Convert the cursor to an array
        const blogs = await blogsCursor.toArray();

        // Send the result as a JSON response
        res.json(blogs);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).json({ message: "Server Error" });
      }
    });

    // features blog
    app.get("/feature-blogs", async (req, res) => {
      const featuresBlog = await blogCollection
        .aggregate([
          {
            $addFields: {
              wordCount: {
                $cond: {
                  if: { $ifNull: ["$longDes", false] },
                  then: { $size: { $split: ["$longDes", " "] } }, // Split by space for word count
                  else: 0,
                },
              },
            },
          },
          { $sort: { wordCount: -1 } },
          { $limit: 10 },
        ])
        .toArray();

      res.send(featuresBlog);
    });

    // get all wishlist api
    app.get("/wishlist", verifyToken, async (req, res) => {
      const email = req.query.email;
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "Forbidden Access" });
      }
      const wishlist = await wishListCollection
        .find({ userEmail: email })
        .toArray();
      res.send(wishlist);
    });

    // wishlist post api
    app.post("/wishlist", async (req, res) => {
      const newWishlist = req.body;
      const result = wishListCollection.insertOne(newWishlist);
      res.send(result);
    });

    // Delete a wishlist item by blogId
    app.delete("/wishlist", async (req, res) => {
      const { userEmail, blogId } = req.body; // Expect userEmail and blogId in the request body

      const result = await wishListCollection.deleteOne({
        userEmail: userEmail,
        blogId: blogId, // Delete item based on blogId and userEmail
      });

      res.send(result);
    });

    // get comments api
    app.get("/comments/:blogId", async (req, res) => {
      const blogId = req.params.blogId;
      const comment = await commentCollection
        .find({ blogId: blogId })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(comment);
    });

    // post comments
    app.post("/comments", async (req, res) => {
      const newComment = req.body;
      const result = await commentCollection.insertOne(newComment);
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
