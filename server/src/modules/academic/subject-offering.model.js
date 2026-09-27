import mongoose from "mongoose";

const subjectOfferingSchema =
  new mongoose.Schema(
    {
      subjectId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Subject",

        required: true,
      },

      programId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Program",

        required: true,
      },

      sectionId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Section",

        required: true,
      },

      year: {
        type: Number,
        required: true,
      },

      semester: {
        type: Number,
        required: true,
      },

      academicYear: {
        type: String,
        required: true,
        trim: true,
      },

      primaryFacultyId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
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

subjectOfferingSchema.index(
  {
    subjectId: 1,
    sectionId: 1,
    academicYear: 1,
  },
  {
    unique: true,
  }
);

const SubjectOffering =
  mongoose.model(
    "SubjectOffering",
    subjectOfferingSchema
  );

export default SubjectOffering;
