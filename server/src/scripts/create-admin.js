import mongoose from "mongoose";
import { connectDatabase } from "../config/database.js";
import User from "../modules/users/user.model.js";
const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error("Usage: npm run admin:grant -- verified-email@walchandsangli.ac.in");
try {
  await connectDatabase();
  const user = await User.findOne({ email, emailVerified: true });
  if (!user) throw new Error("Register and verify this account before granting administrator access.");
  user.globalRoles = [...new Set([...user.globalRoles, "COLLEGE_ADMIN"])];
  user.accountStatus = "ACTIVE"; await user.save();
  console.log("Administrator access granted to the requested verified account.");
} finally { await mongoose.disconnect(); }
