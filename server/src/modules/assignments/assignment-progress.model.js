import mongoose from "mongoose";

const assignmentProgressSchema =
  new mongoose.Schema(
    {
      assignmentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Assignment",

        required: true,
      },

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      status: {
        type: String,

        enum: [
          "PENDING",
          "COMPLETED",
        ],

        default: "PENDING",
      },

      completedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

assignmentProgressSchema.index(
  {
    assignmentId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

const AssignmentProgress =
  mongoose.model(
    "AssignmentProgress",
    assignmentProgressSchema
  );

export default AssignmentProgress;
