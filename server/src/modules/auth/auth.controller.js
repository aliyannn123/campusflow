import { registerUser } from "./auth.service.js";

export function register(req, res) {
  try {
    const {
      name,
      email,
      accountType,
      password,
    } = req.body || {};

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !email.trim() ||
      typeof accountType !== "string" || !accountType ||
      typeof password !== "string" || !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, account type and password are required.",
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message:
          "Name must contain at least 2 characters.",
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters.",
      });
    }

    const validAccountTypes = [
      "STUDENT",
      "FACULTY",
    ];

    if (
      !validAccountTypes.includes(accountType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type.",
      });
    }

    const user = registerUser({
      name,
      email,
      accountType,
    });

    return res.status(201).json({
      success: true,
      message:
        "Account created. Please verify your email.",
      data: {
        user,
      },
    });
  } catch (error) {
    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.message ||
          "Something went wrong.",
      });
  }
}
