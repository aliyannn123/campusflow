export function fail(statusCode, message) {
  throw Object.assign(new Error(message), { statusCode });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.statusCode || error.status || 500;
  let message = error.message;
  if (error.name === "MulterError") {
    status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    message = error.code === "LIMIT_FILE_SIZE" ? "Files must be 10 MB or smaller." : "Invalid upload.";
  } else if (error.name === "ZodError") {
    status = 400;
    message = error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  } else if (["ValidationError", "CastError"].includes(error.name)) {
    status = 400;
    message = "Please check the supplied fields.";
  } else if (error.code === 11000) {
    status = 409;
    message = "A record with these details already exists.";
  }
  if (status >= 500) {
    console.error("Request failed:", error.name);
    message = "Something went wrong. Please try again.";
  }
  res.status(status).json({ success: false, message });
}
