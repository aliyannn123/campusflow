import mongoose from "mongoose";

const clubSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },

      slug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true,
      },

      description: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
      },

      category: {
        type: String,

        enum: [
          "TECHNICAL",
          "CULTURAL",
          "SPORTS",
          "CREATIVE",
          "SOCIAL",
          "ENTREPRENEURSHIP",
          "OTHER",
        ],

        required: true,
      },

      joinPolicy: {
        type: String,

        enum: [
          "OPEN",
          "APPROVAL_REQUIRED",
        ],

        default: "OPEN",
      },

      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        default: null,

        unique: true,
        sparse: true,
      },

      createdById: {
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

clubSchema.index({
  status: 1,
  category: 1,
  name: 1,
});

const Club =
  mongoose.model(
    "Club",
    clubSchema
  );

export default Club;
