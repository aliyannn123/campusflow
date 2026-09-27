import mongoose from "mongoose";

const imageMetadataSchema =
  new mongoose.Schema(
    {
      storageKey: {
        type: String,
        trim: true,
      },

      originalName: {
        type: String,
        trim: true,
      },

      mimeType: {
        type: String,
        trim: true,
      },

      sizeBytes: {
        type: Number,
        min: 0,
      },
    },
    {
      _id: false,
    }
  );

const lostFoundItemSchema =
  new mongoose.Schema(
    {
      postedById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      type: {
        type: String,

        enum: [
          "LOST",
          "FOUND",
        ],

        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 180,
      },

      description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000,
      },

      category: {
        type: String,

        enum: [
          "ID_CARD",
          "ELECTRONICS",
          "KEYS",
          "BOOKS",
          "BAG",
          "ACCESSORIES",
          "CLOTHING",
          "OTHER",
        ],

        default: "OTHER",
      },

      locationText: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      occurredAt: {
        type: Date,
        required: true,
      },

      handoverNote: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      image: {
        type:
          imageMetadataSchema,

        default:
          undefined,
      },

      resolutionNote: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      resolvedAt: {
        type: Date,
        default: null,
      },

      status: {
        type: String,

        enum: [
          "OPEN",
          "RESOLVED",
          "REMOVED",
        ],

        default: "OPEN",
      },
    },
    {
      timestamps: true,
    }
  );

lostFoundItemSchema.index({
  status: 1,
  type: 1,
  createdAt: -1,
});

lostFoundItemSchema.index({
  category: 1,
  status: 1,
});

lostFoundItemSchema.index({
  title: "text",
  description: "text",
  locationText: "text",
});

const LostFoundItem =
  mongoose.model(
    "LostFoundItem",
    lostFoundItemSchema
  );

export default LostFoundItem;
