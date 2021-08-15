const express = require("express");
const protect = require("../middleware/protect");
const router = express.Router();

const auth = require("../controller/auth");

router.post("/signup", auth.signup);
router.post("/login", auth.login);
router.post("/social/:provider", auth.social);
router.post("/forgotPassword", auth.forgotPassword);
router.patch("/resetPassword/:token", auth.resetPassword);
router.patch("/updatePassword", protect, auth.updatePassword);

module.exports = router;
