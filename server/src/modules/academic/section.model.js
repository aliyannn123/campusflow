import mongoose from "mongoose";

const sectionSchema =
  new mongoose.Schema(
    {
      programId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Program",

        required: true,
      },

      year: {
        type: Number,
        required: true,
        min: 1,
      },

      semester: {
        type: Number,
        required: true,
        min: 1,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
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

sectionSchema.index(
  {
    programId: 1,
    year: 1,
    semester: 1,
    name: 1,
  },
  {
    unique: true,
  }
);

const Section =
  mongoose.model(
    "Section",
    sectionSchema
  );

export default Section;
