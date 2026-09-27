import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    globalRoles: {
      type: [
        {
          type: String,
          enum: [
            "STUDENT",
            "FACULTY",
            "DEPARTMENT_ADMIN",
            "PLACEMENT_COORDINATOR",
            "COLLEGE_ADMIN",
          ],
        },
      ],
      required: true,
    },

    requestedAccountType: {
      type: String,
      enum: ["STUDENT", "FACULTY"],
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    accountStatus: {
      type: String,
      enum: [
        "PENDING_EMAIL_VERIFICATION",
        "PENDING_APPROVAL",
        "ACTIVE",
        "SUSPENDED",
      ],
      default: "PENDING_EMAIL_VERIFICATION",
    },

    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    sessionVersion: { type: Number, default: 0 },
    profile: {
      bio: { type: String, maxlength: 300, default: "" },
      linkedInUrl: { type: String, default: "" },
      githubUrl: { type: String, default: "" },
      skills: [String], interests: [String],
    },
    passwordResetHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    academicProfile: {
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
      programId: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
      sectionId: { type: mongoose.Schema.Types.ObjectId, ref: "Section" },
      year: Number,
      semester: Number,
      graduationYear: Number,
      cgpa: { type: Number, min: 0, max: 10 },
      activeBacklogs: { type: Number, min: 0 },
      studentId: { type: String, trim: true, maxlength: 100 },
    },
    facultyProfile: {
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
      designation: { type: String, trim: true, maxlength: 100 },
      facultyId: { type: String, trim: true, maxlength: 100 },
    },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    emailVerificationLastSentAt: { type: Date, select: false },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
