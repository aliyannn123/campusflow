import session from "express-session";
import MongoStore from "connect-mongo";
export const SESSION_COOKIE_NAME = "campusflow.sid";
export function createSessionMiddleware(store) {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return session({
    name: SESSION_COOKIE_NAME, secret: process.env.SESSION_SECRET,
    resave: false, saveUninitialized: false,
    store: store || MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: "sessions" }),
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000 },
  });
}
