import mongoose from "mongoose";

const subjectScheduleSchema =
  new mongoose.Schema(
    {
      spaceId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "Space",

        required: true,
      },

      createdById: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,
      },

      dayOfWeek: {
        type: Number,

        min: 1,
        max: 7,

        required: true,
      },

      startMinutes: {
        type: Number,

        min: 0,
        max: 1439,

        required: true,
      },

      endMinutes: {
        type: Number,

        min: 1,
        max: 1440,

        required: true,
      },

      location: {
        type: String,
        trim: true,
        maxlength: 150,
        default: "",
      },

      mode: {
        type: String,

        enum: [
          "OFFLINE",
          "ONLINE",
        ],

        default: "OFFLINE",
      },

      meetingUrl: {
        type: String,
        trim: true,
        default: null,
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

subjectScheduleSchema.index({
  spaceId: 1,
  status: 1,
  dayOfWeek: 1,
  startMinutes: 1,
});

const SubjectSchedule =
  mongoose.model(
    "SubjectSchedule",
    subjectScheduleSchema
  );

export default SubjectSchedule;
