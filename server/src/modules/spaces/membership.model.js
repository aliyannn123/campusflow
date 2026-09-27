import mongoose from "mongoose";

const membershipSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        required: true,
      },

      roles: {
        type: [
          {
            type: String,

            enum: [
              "STUDENT",
              "FACULTY",
              "CR",
              "CLASS_COORDINATOR",
              "MEMBER",
              "CORE_TEAM",
              "CLUB_LEAD",
            ],
          },
        ],

        required: true,
      },

      notificationPreference: { type: String, enum: ["ALL", "IMPORTANT_ONLY", "MUTED"], default: "ALL" },
      status: {
        type: String,

        enum: [
          "ACTIVE",
          "INACTIVE",
          "PENDING",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

membershipSchema.index(
  {
    userId: 1,
    spaceId: 1,
  },
  {
    unique: true,
  }
);

membershipSchema.index({
  spaceId: 1,
  status: 1,
});

const Membership =
  mongoose.model(
    "Membership",
    membershipSchema
  );

export default Membership;
