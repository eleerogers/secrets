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
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
 
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
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt, { secret, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  console.log({profile});
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get('/', (req, res) => {
  res.render('home');
}); 

app.get('/auth/google', passport.authenticate('google', {
  scope: ['profile']
}));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
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
  User.find({"secret": {$ne: null}}, (err, foundUsers) => {
    if (err) {
      console.error(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
})

app.get('/submit', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
})

app.post('/submit', (req, res) => {
  const { secret } = req.body;
  User.findById(req.user.id, (err, foundUser) => {
    if (err) {
      console.error(err);
    } else {
      if (foundUser) {
        foundUser.secret = secret;
        foundUser.save(() => {
          res.redirect("/secrets");
        })
      }
    }
  })
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
