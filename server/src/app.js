import express from "express";
import cors from "cors";
import subjects from "./data/subjects.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "CampusFlow API is running",
  });
});

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
  });
});

app.get("/api/v1/subjects", (req, res) => {
  const { semester } = req.query;

  let result = subjects;

  if (semester) {
    result = subjects.filter(
      (subject) => subject.semester === Number(semester)
    );
  }

  res.status(200).json({
    success: true,
    count: result.length,
    data: result,
  });
});

app.get("/api/v1/subjects/:id", (req, res) => {
  const subjectId = Number(req.params.id);

  const subject = subjects.find(
    (subject) => subject.id === subjectId
  );

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: "Subject not found",
    });
  }

  res.status(200).json({
    success: true,
    data: subject,
  });
});

export default app;