const express = require("express");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const cors = require("cors");
const redis = require("redis");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);

const authRoute = require("./routes/auth");
const globalError = require("./utils/globalError");

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_POST,
  auth_pass: process.env.REDIS_PASS,
});

const app = express();

//helmet
app.use(helmet());
app.use(cors());

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
    cookie: {
      secure: process.env.NODE_ENV === "production" ? true : false,
      httpOnly: true,
      maxAge: 300000000,
    },
  })
);

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

app.use("/api/v1/auth", authRoute);
app.use(globalError);

if (process.env.NODE_ENV === "production") {
  //set static folder
  app.use(express.static("./public"));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "/public/index.html"));
  });
}

module.exports = app;
