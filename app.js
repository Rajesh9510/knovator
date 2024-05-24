const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const app = express();


//mongo connection
mongoose.connect("mongodb://127.0.0.1:27017/practice", {
}).then(() => {
  console.log("MongoDB connected");
}).catch(err => {
  console.error("MongoDB connection error:", err);
});

//model and schema
const User = mongoose.model("User", new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true }
}));

const Post = mongoose.model("Post", new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  active: { type: Boolean, default: true },
  geolocation: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  }
}));

const secretKey = "SECRETKEY";

app.use(bodyParser.json());

// Registration 
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  const newUser = new User({ username, password, email });
  newUser.save()
    .then(user => {
      res.json({ success: true, user });
    })
    .catch(err => {
      res.status(500).json({ success: false, message: err.message });
    });
});

// Login 
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  User.findOne({ username, password })
    .then(user => {
      if (!user) {
        res.status(401).json({ success: false, message: "Invalid username or password" });
      } else {
        jwt.sign({ user }, secretKey, { expiresIn: '10000s' }, (err, token) => {
          res.json({ success: true, token });
        });
      }
    })
    .catch(err => {
      res.status(500).json({ success: false, message: err.message });
    });
});

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const bearerHeader = req.headers['authorization'];
  if (typeof bearerHeader !== 'undefined') {
    const bearer = bearerHeader.split(" ");
    const token = bearer[1];
    req.token = token;
    next();
  } else {
    res.sendStatus(403); 
  }
}

// CRUD 

// Create a post
app.post('/posts', verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      res.sendStatus(403); 
    } else {
      const { title, body, geolocation } = req.body;
      const createdBy = decoded.user._id; 
      const newPost = new Post({ title, body, createdBy, geolocation });
      newPost.save()
        .then(post => {
          res.json({ success: true, post });
        })
        .catch(err => {
          res.status(500).json({ success: false, message: err.message });
        });
    }
  });
});

// Read all posts
app.get('/posts', verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      res.sendStatus(403);
    } else {
      Post.find({ createdBy: decoded.user._id })
        .then(posts => {
          res.json({ success: true, posts });
        })
        .catch(err => {
          res.status(500).json({ success: false, message: err.message });
        });
    }
  });
});

// Update a post
app.put('/posts/:id', verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      res.sendStatus(403); 
    } else {
      const { title, body, geolocation } = req.body;
      const postId = req.params.id;
      Post.findOneAndUpdate({ _id: postId, createdBy: decoded.user._id }, { title, body, geolocation }, { new: true })
        .then(post => {
          if (!post) {
            return res.status(404).json({ success: false, message: "Post not found or user not authorized" });
          }
          res.json({ success: true, post });
        })
        .catch(err => {
          res.status(500).json({ success: false, message: err.message });
        });
    }
  });
});

// Delete a post
app.delete('/posts/:id', verifyToken, (req, res) => {
  jwt.verify(req.token, secretKey, (err, decoded) => {
    if (err) {
      res.sendStatus(403);
    } else {
      const postId = req.params.id;
      Post.findOneAndDelete({ _id: postId, createdBy: decoded.user._id })
        .then(post => {
          if (!post) {
            return res.status(404).json({ success: false, message: "Post not found or user not authorized" });
          }
          res.json({ success: true, message: "Post deleted successfully" });
        })
        .catch(err => {
          res.status(500).json({ success: false, message: err.message });
        });
    }
  });
});

app.listen(2025, () => {
  console.log('Port running successfully');
});

