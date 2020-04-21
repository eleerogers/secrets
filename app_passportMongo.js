//jshint esversion:6
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
 
const app = express();
 
const port = process.env.PORT || 3000;
 
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

const secret = process.env.ENCRYPT_SECRET;
app.use(session({
  secret,
  resave: false,
  saveUninitialized: false,

}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});

userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(encrypt, { secret, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = new User({ username, password });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/secrets');
      })
    }
  })
  // User.findOne( { username }, (err, foundUser) => {
  //   if (err) {
  //     throw err;
  //   } else {
  //     if (foundUser) {
  //       bcrypt.compare(password, foundUser.password, (err, result) => {
  //         if (result) {
  //           res.render('secrets');
  //         }
  //       })
  //     } else {

  //     }
  //   }
  // })
})

app.get('/secrets', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('secrets');
  } else {
    res.redirect('/login');
  }
})

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  User.register({ username }, password, (err, user) => {
    if (err) {
      console.error(err);
      res.redirect('/register');
    } else {
      passport.authenticate('local')(req, res, () => {
        res.redirect('/secrets');
      });
    }
  });
  // const saltRounds = 10;
  // bcrypt.hash(password, saltRounds, (err, hash) => {
  //   const newUser = new User({ username, password: hash });
  //   newUser.save((err, user) => {
  //     if (err) {
  //       throw err;
  //     } else {
  //       res.render('secrets');
  //     }
  //   })
  // })
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

 
app.listen(port, () => console.log(`Server started at port: ${port}`)
);