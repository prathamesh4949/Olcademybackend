import express from "express";
import Subscriber from "../models/Subscriber.js";
import isValidEmail from "../utils/emailValidator.js";

const router = express.Router();

router.post("/subscribe", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    await Subscriber.create({ email });

    res.status(201).json({
      success: true,
      message: "Successfully joined the inner circle",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

export default router;
