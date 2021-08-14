const express = require("express");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");

const app = express();

//helmet
app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("tiny"));
}

app.use(hpp());
app.use(mongoSanitize());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

//rate limit
app.use("/api/", limiter);
app.use(xss());

if (process.env.NODE_ENV === "production") {
  //set static folder
  app.use(express.static("./public"));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/index.html"));
  });
}

module.exports = app;
