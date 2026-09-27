import mongoose from "mongoose";

const targetSnapshotSchema =
  new mongoose.Schema(
    {
      authorId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      title: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },

      body: {
        type: String,
        maxlength: 5000,
        default: "",
      },
    },
    {
      _id: false,
    }
  );

const reportSchema =
  new mongoose.Schema(
    {
      reporterId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      targetType: {
        type: String,

        enum: [
          "MESSAGE",
          "LOST_FOUND_ITEM",
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

      targetAuthorId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      reason: {
        type: String,

        enum: [
          "SPAM",
          "HARASSMENT",
          "INAPPROPRIATE",
          "MISINFORMATION",
          "PRIVACY",
          "OTHER",
        ],

        required: true,
      },

      details: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      targetSnapshot: {
        type:
          targetSnapshotSchema,

        required: true,
      },

      status: {
        type: String,

        enum: [
          "OPEN",
          "RESOLVED",
        ],

        default: "OPEN",
      },

      resolutionAction: {
        type: String,

        enum: [
          "DISMISSED",
          "CONTENT_REMOVED",
          "USER_SUSPENDED",
          "CONTENT_REMOVED_AND_USER_SUSPENDED",
        ],

        default: undefined,
      },

      resolutionNote: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },

      resolvedById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      resolvedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

reportSchema.index({
  status: 1,
  createdAt: -1,
});

reportSchema.index({
  targetType: 1,
  targetId: 1,
});

reportSchema.index({
  reporterId: 1,
  createdAt: -1,
});

const Report =
  mongoose.model(
    "Report",
    reportSchema
  );

export default Report;
