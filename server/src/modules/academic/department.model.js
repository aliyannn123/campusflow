import mongoose from "mongoose";

const departmentSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
        unique: true,
      },

      shortName: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },

      status: {
        type: String,
        enum: [
          "ACTIVE",
          "INACTIVE",
        ],
        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

const Department =
  mongoose.model(
    "Department",
    departmentSchema
  );

export default Department;
