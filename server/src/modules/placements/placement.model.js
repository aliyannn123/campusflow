import mongoose from "mongoose";

const placementEligibilitySchema =
  new mongoose.Schema(
    {
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

      graduationYears: {
        type: [
          {
            type: Number,
            min: 2020,
            max: 2100,
          },
        ],

        default: [],
      },

      minCGPA: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
      },

      maxActiveBacklogs: {
        type: Number,
        min: 0,
        default: null,
      },
    },
    {
      _id: false,
    }
  );

const placementSchema =
  new mongoose.Schema(
    {
      companyName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
      },

      roleTitle: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
      },

      opportunityType: {
        type: String,

        enum: [
          "INTERNSHIP",
          "PLACEMENT",
        ],

        required: true,
      },

      compensation: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      location: {
        type: String,
        trim: true,
        maxlength: 200,
        default: "",
      },

      workMode: {
        type: String,

        enum: [
          "ONSITE",
          "REMOTE",
          "HYBRID",
        ],

        default: "ONSITE",
      },

      description: {
        type: String,
        trim: true,
        maxlength: 5000,
        default: "",
      },

      applicationUrl: {
        type: String,
        required: true,
        trim: true,
      },

      deadlineAt: {
        type: Date,
        required: true,
      },

      eligibility: {
        type:
          placementEligibilitySchema,

        default: () => ({
          departmentIds: [],
          years: [],
          graduationYears: [],
          minCGPA: null,
          maxActiveBacklogs:
            null,
        }),
      },

      createdById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "CLOSED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

placementSchema.index({
  status: 1,
  deadlineAt: 1,
});

placementSchema.index({
  companyName: 1,
  roleTitle: 1,
});

const Placement =
  mongoose.model(
    "Placement",
    placementSchema
  );

export default Placement;
