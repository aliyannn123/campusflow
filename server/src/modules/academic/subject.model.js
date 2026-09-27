import mongoose from "mongoose";

const subjectSchema =
  new mongoose.Schema(
    {
      departmentId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Department",

        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        unique: true,
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "INACTIVE",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

const Subject =
  mongoose.model(
    "Subject",
    subjectSchema
  );

export default Subject;
