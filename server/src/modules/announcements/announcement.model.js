import mongoose from "mongoose";

const announcementSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        required: true,
      },

      authorId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 150,
      },

      body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },

      priority: {
        type: String,

        enum: [
          "NORMAL",
          "IMPORTANT",
          "URGENT",
        ],

        default: "NORMAL",
      },

      acknowledgementRequired: { type: Boolean, default: false },
      targetedUserIds: { type: [mongoose.Schema.Types.ObjectId], default: undefined, select: false },
      targetedRecipientCount: { type: Number, default: null },
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

announcementSchema.index({
  spaceId: 1,
  status: 1,
  createdAt: -1,
});

const Announcement =
  mongoose.model(
    "Announcement",
    announcementSchema
  );

export default Announcement;
