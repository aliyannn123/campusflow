import mongoose from "mongoose";

const reactionSchema =
  new mongoose.Schema(
    {
      emoji: {
        type: String,
        required: true,
      },

      userIds: [
        {
          type:
            mongoose.Schema.Types.ObjectId,

          ref: "User",
        },
      ],
    },
    {
      _id: false,
    }
  );

const messageSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Space",

        required: true,
      },

      senderId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 4000,
      },

      replyToMessageId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Message",

        default: null,
      },

      mentionedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      reactions: {
        type: [reactionSchema],
        default: [],
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "DELETED",
        ],

        default: "ACTIVE",
      },

      editedAt: {
        type: Date,
        default: null,
      },

      deletedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

messageSchema.index({
  spaceId: 1,
  _id: -1,
});

const Message =
  mongoose.model(
    "Message",
    messageSchema
  );

export default Message;
