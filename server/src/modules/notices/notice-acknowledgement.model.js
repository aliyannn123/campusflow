import mongoose from "mongoose";

const noticeAcknowledgementSchema =
  new mongoose.Schema(
    {
      noticeId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Notice",

        required: true,
      },

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      acknowledgedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

noticeAcknowledgementSchema.index(
  {
    noticeId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

const NoticeAcknowledgement =
  mongoose.model(
    "NoticeAcknowledgement",
    noticeAcknowledgementSchema
  );

export default NoticeAcknowledgement;
