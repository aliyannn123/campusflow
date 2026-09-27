import mongoose from "mongoose";

const eventRegistrationSchema =
  new mongoose.Schema(
    {
      eventId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Event",

        required: true,
      },

      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      status: {
        type: String,

        enum: [
          "REGISTERED",
          "CANCELLED",
        ],

        default: "REGISTERED",
      },

      registeredAt: {
        type: Date,
        default: Date.now,
      },

      cancelledAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

eventRegistrationSchema.index(
  {
    eventId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

const EventRegistration =
  mongoose.model(
    "EventRegistration",
    eventRegistrationSchema
  );

export default EventRegistration;
