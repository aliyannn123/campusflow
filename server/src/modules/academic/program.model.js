import mongoose from "mongoose";

const programSchema =
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

      shortName: {
        type: String,
        required: true,
        trim: true,
      },

      durationYears: {
        type: Number,
        required: true,
        min: 1,
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

programSchema.index(
  {
    departmentId: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const Program =
  mongoose.model(
    "Program",
    programSchema
  );

export default Program;
