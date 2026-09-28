import mongoose from "mongoose";

const noticeAudienceSchema =
  new mongoose.Schema(
    {
      accountTypes: {
        type: [
          {
            type: String,

            enum: [
              "STUDENT",
              "FACULTY",
            ],
          },
        ],

        default: [],
      },

      departmentIds: {
        type: [
          {
            type:
              mongoose.Schema.Types
                .ObjectId,

            ref: "Department",
          },
        ],

        default: [],
      },

      years: {
        type: [
          {
            type: Number,
            min: 1,
            max: 8,
          },
        ],

        default: [],
      },
    },
    {
      _id: false,
    }
  );

const noticeSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 180,
      },

      body: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },

      category: {
        type: String,

        enum: [
          "GENERAL",
          "ACADEMIC",
          "ADMINISTRATIVE",
          "EMERGENCY",
          "EVENT",
          "PLACEMENT",
          "OTHER",
        ],

        default: "GENERAL",
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

      audience: {
        type:
          noticeAudienceSchema,

        default: () => ({
          accountTypes: [],
          departmentIds: [],
          years: [],
        }),
      },

      acknowledgementRequired: {
        type: Boolean,
        default: false,
      },

      expiresAt: {
        type: Date,
        default: null,
      },

      publishedById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      closedAt: { type: Date, default: null },
      closedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      targetedUserIds: { type: [mongoose.Schema.Types.ObjectId], default: undefined, select: false },
      targetedRecipientCount: { type: Number, default: null },
      status: {
        type: String,

        enum: [
          "ACTIVE",
          "CLOSED",
          "REMOVED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

noticeSchema.index({
  status: 1,
  priority: 1,
  createdAt: -1,
});

noticeSchema.index({
  expiresAt: 1,
});

const Notice =
  mongoose.model(
    "Notice",
    noticeSchema
  );

export default Notice;
