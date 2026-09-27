import mongoose from "mongoose";

const answerSchema =
  new mongoose.Schema(
    {
      questionId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Question",

        required: true,
      },

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

      body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
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

answerSchema.index({
  questionId: 1,
  status: 1,
  createdAt: 1,
});

const Answer =
  mongoose.model(
    "Answer",
    answerSchema
  );

export default Answer;
