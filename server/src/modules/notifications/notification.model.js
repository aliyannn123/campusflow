import mongoose from "mongoose";

const notificationSchema =
  new mongoose.Schema(
    {
      recipientId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      actorId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },

      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        default: null,
      },

      type: {
        type: String,

        enum: [
          "ANNOUNCEMENT",
          "ASSIGNMENT",
          "SCHEDULE_CHANGE",
          "REPLY", "ANSWER", "MENTION", "NOTICE", "EVENT", "PLACEMENT", "REMINDER",
        ],

        required: true,
      },

      priority: {
        type: String,

        enum: [
          "NORMAL",
          "IMPORTANT",
          "URGENT",
        ],

        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000,
      },

      destination: {
        type: String,
        required: true,
        trim: true,
      },

      sourceType: {
        type: String,

        enum: [
          "ANNOUNCEMENT",
          "ASSIGNMENT",
          "SUBJECT_SCHEDULE",
          "SCHEDULE_EXCEPTION",
          "SCHEDULE_CHANGE", "REPLY", "ANSWER", "MENTION", "NOTICE", "EVENT", "PLACEMENT", "REMINDER",
        ],

        required: true,
      },

      sourceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        required: true,
      },

      readAt: {
        type: Date,
        default: null,
      },
      dedupeKey: { type: String, required: true },
    },
    {
      timestamps: true,
    }
  );

notificationSchema.index({
  recipientId: 1,
  readAt: 1,
  createdAt: -1,
});

notificationSchema.index({
  recipientId: 1,
  createdAt: -1,
});

notificationSchema.index({ recipientId: 1, dedupeKey: 1 }, { unique: true });

const Notification =
  // A recipient receives each source notification at most once.
  mongoose.model(
    "Notification",
    notificationSchema
  );

export default Notification;
