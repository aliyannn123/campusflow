import mongoose from "mongoose";

const fileAssetSchema =
  new mongoose.Schema(
    {
      uploadedById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      provider: {
        type: String,

        enum: [
          "LOCAL",
          "S3",
        ],

        required: true,
      },

      storageKey: {
        type: String,
        required: true,
        unique: true,
      },

      originalName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      mimeType: {
        type: String,
        required: true,
      },

      extension: {
        type: String,
        required: true,
      },

      sizeBytes: {
        type: Number,
        required: true,
        min: 1,
      },

      purpose: {
        type: String,

        enum: [
          "RESOURCE_ATTACHMENT",
          "MESSAGE_ATTACHMENT",
          "LOST_FOUND_IMAGE",
          "ORGANIZATION_LOGO",
        ],

        required: true,
      },

      targetType: {
        type: String,

        enum: [
          "RESOURCE",
          "MESSAGE",
          "LOST_FOUND_ITEM",
          "ORGANIZATION",
        ],

        required: true,
      },

      targetId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        required: true,
      },

      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        default: null,
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "DELETED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

fileAssetSchema.index({
  targetType: 1,
  targetId: 1,
  status: 1,
});

fileAssetSchema.index({
  uploadedById: 1,
  createdAt: -1,
});

const FileAsset =
  mongoose.model(
    "FileAsset",
    fileAssetSchema
  );

export default FileAsset;
