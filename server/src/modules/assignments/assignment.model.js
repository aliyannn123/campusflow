import mongoose from "mongoose";

const assignmentSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        required: true,
      },

      createdById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 180,
      },

      instructions: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },

      dueAt: {
        type: Date,
        required: true,
      },

      priority: {
        type: String,

        enum: [
          "NORMAL",
          "IMPORTANT",
        ],

        default: "NORMAL",
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "CANCELLED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

assignmentSchema.index({
  spaceId: 1,
  status: 1,
  dueAt: 1,
});

const Assignment =
  mongoose.model(
    "Assignment",
    assignmentSchema
  );

export default Assignment;
