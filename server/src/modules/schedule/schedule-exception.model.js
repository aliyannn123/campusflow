import mongoose from "mongoose";

const scheduleExceptionSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Space",

        required: true,
      },

      scheduleId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "SubjectSchedule",

        default: null,
      },

      createdById: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      type: {
        type: String,

        enum: [
          "CANCELLED",
          "MOVED",
          "EXTRA",
        ],

        required: true,
      },

      localDate: {
        type: String,
        required: true,
      },

      startMinutes: {
        type: Number,
        min: 0,
        max: 1439,
        default: null,
      },

      endMinutes: {
        type: Number,
        min: 1,
        max: 1440,
        default: null,
      },

      location: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      reason: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      status: {
        type: String,

        enum: [
          "ACTIVE",
          "REMOVED",
        ],

        default: "ACTIVE",
      },
    },
    {
      timestamps: true,
    }
  );

scheduleExceptionSchema.index({
  spaceId: 1,
  status: 1,
  localDate: 1,
});

scheduleExceptionSchema.index({ scheduleId: 1, localDate: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE", scheduleId: { $type: "objectId" } } });

const ScheduleException =
  mongoose.model(
    "ScheduleException",
    scheduleExceptionSchema
  );

export default ScheduleException;
