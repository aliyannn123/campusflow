import mongoose from "mongoose";

const questionSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        required: true,
      },

      askedById: {
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
        minlength: 5,
        maxlength: 180,
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
          "OPEN",
          "ANSWERED",
          "RESOLVED",
        ],

        default: "OPEN",
      },

      acceptedAnswerId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Answer",

        default: null,
      },

      answerCount: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

questionSchema.index({
  spaceId: 1,
  status: 1,
  createdAt: -1,
});

const Question =
  mongoose.model(
    "Question",
    questionSchema
  );

export default Question;
