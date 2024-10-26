require("dotenv").config();

const express = require("express");
const passport = require("passport");
const session = require("express-session");
const bodyParser = require("body-parser");
const { User } = require("./models/user.model");
const multer = require("multer");
const File = require("./models/file.model");
const connectDB = require("./db");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const app = express();
const fileUpload = require("express-fileupload");
const path = require("path");

app.use(fileUpload());

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

app.get("/profile", async (req, res) => {
  try {
    let user = await User.findOne({ googleId: req.user.id });
    if (!user) {
      user = await User.create({
        username: req.user.displayName,
        googleId: req.user.id,
        email: req.user.emails[0].value,
      });
    }

    // Find files uploaded by the logged-in user
    const userFiles = await File.find({ uploader: user.email });

    // Generate HTML for file list with download buttons
    const filesHtml = userFiles
      .map(
        (file) => `
      <li>
        ${file.fileName} (${(file.size / 1024).toFixed(2)} KB)
        <a href="/download/${file._id}">
          <button type="button">Download</button>
        </a>
      </li>
    `
      )
      .join("");

    // Respond with HTML content including the form, user information, and file list
    res.send(`
      <div>
        <h1>Profile Page</h1>
        <p>Welcome, ${req.user.displayName}</p>
        <p>Email: ${req.user.emails[0].value}</p>

        <div>
          <h3>Upload Section</h3><br>
          <!-- Form to upload a file, posting to /upload route -->
          <form action="/upload" method="post" enctype="multipart/form-data">
            File to be uploaded: <input type="file" name="uploadFile" id=""><br><br>
            <button type="submit">Upload</button>
          </form>
          <br>
        </div>

        <div>
          <h3>Your Uploaded Files</h3>
          <ul>
            ${filesHtml || "<p>No files uploaded yet.</p>"}
          </ul>
        </div>
      </div>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// For handling the upload request
app.post("/upload", function (req, res) {
  // Check if any files are uploaded
  if (req.files && Object.keys(req.files).length !== 0) {
    // Retrieve the uploaded file
    const uploadedFile = req.files.uploadFile;

    // Log uploaded file data for debugging
    console.log("Uploaded file:", uploadedFile);

    // Define the path to save the uploaded file
    const uploadPath = __dirname + "/uploads/" + uploadedFile.name;

    // Save the file using mv() function
    uploadedFile.mv(uploadPath, async function (err) {
      if (err) {
        console.log("File move error:", err);
        res.status(500).send("File upload failed.");
      } else {
        try {
          const user = req.user; // Assuming req.user is populated with the logged-in user data

          // Create a new file document in MongoDB
          const fileDocument = new File({
            fileName: uploadedFile.name, // Corrected to use `name` property
            url: "/uploads/" + uploadedFile.name, // Adjust to suit your URL structure
            size: uploadedFile.size,
            folder: "/", // Modify if you have specific folder structure requirements
            fileType: uploadedFile.mimetype,
            uploader: req.user.emails[0].value, // Assuming the user's email is used as the uploader
          });

          await fileDocument.save();
          res.send("File uploaded and metadata saved successfully!");
        } catch (dbError) {
          console.error("Database save error:", dbError);
          res
            .status(500)
            .send("File upload succeeded, but saving metadata failed.");
        }
      }
    });
  } else {
    res.status(400).send("No file uploaded.");
  }
});

app.get("/download/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;

    // Find the file in the database using the file ID
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).send("File not found");
    }

    // Construct the file path based on the file's URL field
    const filePath = path.join(__dirname, file.url);

    // Use res.download to serve the file
    res.download(filePath, file.fileName, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).send("An error occurred during the download");
      }
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    res.status(500).send("An error occurred");
  }
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
