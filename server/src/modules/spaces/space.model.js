import mongoose from "mongoose";

const spaceSchema =
  new mongoose.Schema(
    {
      spaceKey: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      type: {
        type: String,

        enum: [
          "CLASS",
          "SUBJECT",
          "CLUB",
        ],

        required: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      sectionId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Section",

        default: null,
      },

      subjectOfferingId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "SubjectOffering",

        default: null,
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "ARCHIVED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

spaceSchema.index({
  type: 1,
  status: 1,
});

const Space =
  mongoose.model(
    "Space",
    spaceSchema
  );

export default Space;
