const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  size: {
    type: Number, // File size in bytes
    required: true,
  },
  folder: {
    type: String,
    default: "/", // Root folder by default; can use a path structure like "/folder/subfolder"
  },
  uploadDate: {
    type: Date,
    default: Date.now,
  },
  fileType: {
    type: String, // Optional: to store file type, e.g., "image/jpeg", "application/pdf"
  },
  uploader: {
    type: String, // Email of the user who uploaded the files
    ref: "User", // Reference to the user who uploaded the file
    required: true,
  },
});

module.exports = mongoose.model("File", fileSchema);
