import mongoose from "mongoose";

const organizationSchema =
  new mongoose.Schema(
    {
      organizationKey: {
        type: String,
        required: true,
        unique: true,
        default: "PRIMARY",
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
      },

      shortName: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        maxlength: 30,
      },

      logoFileId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "FileAsset",

        default: null,
      },

      allowedEmailDomain: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      studentRegistrationEnabled: {
        type: Boolean,
        default: true,
      },

      currentAcademicYear: {
        type: String,
        required: true,
        trim: true,
      },

      timezone: {
        type: String,
        required: true,
        default:
          "Asia/Kolkata",
      },

      supportEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
        ],

        default:
          "ACTIVE",
      },

      updatedById: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

const Organization =
  mongoose.model(
    "Organization",
    organizationSchema
  );

export default Organization;
