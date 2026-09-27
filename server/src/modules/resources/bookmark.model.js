import mongoose from "mongoose";

const bookmarkSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      targetType: {
        type: String,

        enum: [
          "RESOURCE",
        ],

        required: true,
      },

      targetId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

bookmarkSchema.index(
  {
    userId: 1,
    targetType: 1,
    targetId: 1,
  },
  {
    unique: true,
  }
);

const Bookmark =
  mongoose.model(
    "Bookmark",
    bookmarkSchema
  );

export default Bookmark;
