require("dotenv").config();

const express = require("express");
const passport = require("passport");
const session = require("express-session");
const bodyParser = require("body-parser");
const { User } = require("./models/user.model");
const connectDB = require("./db");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const app = express();

app.use(bodyParser.json());

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile); // passes the profile data to serializeUser
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.get("/", (req, res) => {
  res.send("<a href='/auth/google'> Login To Google  </a>");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/profile");
  }
);

app.get("/profile", (req, res) => {
  const userAlreadyPresent = User.find({ googleId: req.user.id });
  if (!userAlreadyPresent.length) {
    User.create({
      username: req.user.displayName,
      googleId: req.user.id,
      email: req.user.emails[0].value,
    });
  }

  res.send(`Profile Page ${req.user.displayName}`);
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

connectDB()
  .then(() => {
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  })
  .catch((err) => {
    console.log(err);
  });
