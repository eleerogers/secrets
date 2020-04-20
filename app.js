//jshint esversion:6
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");
 
const app = express();
 
const port = process.env.PORT || 3000;
 
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String,
  password: String
})

const secret = process.env.ENCRYPT_SECRET;

userSchema.plugin(encrypt, { secret, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  User.findOne( { username }, (err, foundUser) => {
    if (err) {
      throw err;
    } else {
      if (foundUser) {
        if (password === foundUser.password) {
          res.render('secrets');
        }
      } else {

      }
    }
  })
})

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const newUser = new User({ username, password });
  newUser.save((err, user) => {
    if (err) {
      throw err;
    } else {
      res.render('secrets');
    }
  })
});
 
app.listen(port, () => console.log(`Server started at port: ${port}`)
);
