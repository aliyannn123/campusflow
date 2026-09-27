import mongoose from "mongoose";

const placementTrackingSchema =
  new mongoose.Schema(
    {
      placementId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Placement",

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
          "APPLIED",
        ],

        default: "APPLIED",
      },

      appliedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

placementTrackingSchema.index(
  {
    placementId: 1,
    userId: 1,
  },
  {
    unique: true,
  }
);

const PlacementTracking =
  mongoose.model(
    "PlacementTracking",
    placementTrackingSchema
  );

export default PlacementTracking;
