//jshint esversion:6
require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const { Pool } = require('pg');
const LocalStrategy = require('passport-local').Strategy;
 
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


const connectionString = process.env.SQL_CONNECTION_STRING;

const pool = new Pool({
  connectionString
});

// passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

(function initialize(passport) {
  const authenticateUser = (username, password, done) => {
    pool.query(`SELECT * FROM secrets WHERE username = $1`, [username], (err, results) => {
      if (err) {
        throw err;
      } else {
        console.log(results.rows)
        if (results.rows.length > 0) {
          const user = results.rows[0];
          bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
              throw err;
            } else {
              if (isMatch) {
                return done(null, user);
              } else {
                return done(null, false);
              }
            }
          })
        } else {
          return done(null, false);
        }
      }
    })
  }
  passport.use(new LocalStrategy(
    {
      usernameField: "username",
      passwordField: "password"
    },
    authenticateUser
  ))
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => {
    pool.query(`SELECT * FROM secrets WHERE id = $1`, [id], (err, results) => {
      if (err) {
        throw err;
      }
      return done(null, results.rows[0])
    })
  })
})(passport);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/secrets');
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    console.log('not auth');
    return res.redirect('/');
  }
  next();
}


app.get('/', (req, res) => {
  res.render('home');
});

app.get('/login', checkAuthenticated, (req, res) => {
  res.render('login');
});

app.post('/login',
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login"
  }),
  (req, res) => {
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
})

app.get("/secrets", function(req, res){
  pool.query(`SELECT secret FROM secrets WHERE secret IS NOT NULL`, (err, results) => {
    if (err){
      console.log(err);
    } else {
      if (results) {
        res.render("secrets", { secrets: results.rows });
      }
    }
  })
});

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  let hashedPW = await bcrypt.hash(password, 10);
  pool.query(`INSERT INTO secrets (username, password) VALUES ($1, $2) RETURNING id, password`, [username, hashedPW], (err, results) => {
    if (err) {
      res.redirect('/register');
      throw err;
    } else {
      console.log(results.rows);
      res.redirect('/login')
    }
  })
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const { secret } = req.body;
  const { id } = req.user;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  pool.query(`UPDATE secrets SET secret = $1 WHERE id = $2`, [ secret, id ], (error) => {
    if (error) {
      console.error(error);
    } else {
      res.redirect('/secrets');
    }
  })
});

 
app.listen(port, () => console.log(`Server started at port: ${port}`)
); 
