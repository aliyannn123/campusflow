import mongoose from "mongoose";

const eligibilitySchema =
  new mongoose.Schema(
    {
      departmentIds: [
        {
          type:
            mongoose.Schema.Types
              .ObjectId,

          ref: "Department",
        },
      ],

      years: [
        {
          type: Number,
          min: 1,
          max: 8,
        },
      ],
    },
    {
      _id: false,
    }
  );

const eventSchema =
  new mongoose.Schema(
    {
      organizerType: {
        type: String,

        enum: [
          "CLUB",
          "CAMPUS",
        ],

        required: true,
      },

      clubId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Club",

        default: null,
      },

      spaceId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "Space",

        default: null,
      },

      createdById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
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
        maxlength: 5000,
      },

      category: {
        type: String,

        enum: [
          "TECHNICAL",
          "CULTURAL",
          "SPORTS",
          "ACADEMIC",
          "CAREER",
          "SOCIAL",
          "OTHER",
        ],

        default: "OTHER",
      },

      startAt: {
        type: Date,
        required: true,
      },

      endAt: {
        type: Date,
        required: true,
      },

      mode: {
        type: String,

        enum: [
          "OFFLINE",
          "ONLINE",
          "HYBRID",
        ],

        default: "OFFLINE",
      },

      location: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      meetingUrl: {
        type: String,
        trim: true,
        default: null,
      },

      registrationRequired: {
        type: Boolean,
        default: true,
      },

      capacity: {
        type: Number,
        min: 1,
        default: null,
      },

      registeredCount: {
        type: Number,
        min: 0,
        default: 0,
      },

      eligibility: {
        type:
          eligibilitySchema,

        default: () => ({
          departmentIds: [],
          years: [],
        }),
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "CANCELLED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

eventSchema.index({
  status: 1,
  startAt: 1,
});

eventSchema.index({
  clubId: 1,
  status: 1,
  startAt: 1,
});

const Event =
  mongoose.model(
    "Event",
    eventSchema
  );

export default Event;
