import users from "../../data/users.js";

const ALLOWED_EMAIL_DOMAIN = "@college.ac.in";

export function registerUser({
  name,
  email,
  accountType,
}) {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  const existingUser = users.find(
    (user) => user.email === normalizedEmail
  );

  if (existingUser) {
    const error = new Error(
      "An account with this email already exists."
    );

    error.statusCode = 409;

    throw error;
  }

  if (!normalizedEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    const error = new Error(
      "Please use your institutional college email."
    );

    error.statusCode = 400;

    throw error;
  }

  const user = {
    id: users.length + 1,
    name: name.trim(),
    email: normalizedEmail,
    accountType,
    emailVerified: false,
    status:
      accountType === "FACULTY"
        ? "PENDING"
        : "ACTIVE",
  };

  users.push(user);

  return user;
}
