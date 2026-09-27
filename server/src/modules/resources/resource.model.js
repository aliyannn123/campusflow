import mongoose from "mongoose";

const fileMetadataSchema =
  new mongoose.Schema(
    {
      storageKey: {
        type: String,
        trim: true,
      },

      originalName: {
        type: String,
        trim: true,
      },

      mimeType: {
        type: String,
        trim: true,
      },

      sizeBytes: {
        type: Number,
        min: 0,
      },
    },
    {
      _id: false,
    }
  );

const resourceSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Space",

        required: true,
      },

      createdById: {
        type:
          mongoose.Schema.Types.ObjectId,

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

      description: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
      },

      category: {
        type: String,

        enum: [
          "NOTES",
          "SLIDES",
          "REFERENCE",
          "RECORDING",
          "OTHER",
        ],

        default: "OTHER",
      },

      resourceType: {
        type: String,

        enum: [
          "LINK",
          "FILE",
        ],

        required: true,
      },

      url: {
        type: String,
        trim: true,
        default: null,
      },

      file: {
        type:
          fileMetadataSchema,

        default: undefined,
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "REMOVED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

resourceSchema.index({
  spaceId: 1,
  status: 1,
  createdAt: -1,
});

const Resource =
  mongoose.model(
    "Resource",
    resourceSchema
  );

export default Resource;
