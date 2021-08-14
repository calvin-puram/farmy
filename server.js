const dotenv = require("dotenv");
const chalk = require("chalk");
const connectDB = require("./config/db");

process.on("uncaughtException", (err) => {
  console.log(chalk.red(`UNCAUGHTEXCEPTION: ${err.stack}`));
  process.exit(1);
});

dotenv.config({ path: "./.env" });
const app = require("./app");

//connect to DB
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    chalk.blue(
      `server running in ${process.env.NODE_ENV} & listening on port ${process.env.PORT}`
    )
  );
});

process.on("unhandledRejection", (err) => {
  console.log(chalk.red(`UNHANDLEDREJECTION: ${err.message}`));
  server.close(() => {
    process.exit(1);
  });
});
