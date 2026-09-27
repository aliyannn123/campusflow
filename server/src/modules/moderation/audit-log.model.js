import mongoose from "mongoose";

const auditLogSchema =
  new mongoose.Schema(
    {
      actorUserId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        ref: "User",

        required: true,
      },

      action: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      targetType: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      targetId: {
        type:
          mongoose.Schema.Types
            .ObjectId,

        default: null,
      },

      summary: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      metadata: {
        type:
          mongoose.Schema.Types
            .Mixed,

        default: {},
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    }
  );

auditLogSchema.index({
  createdAt: -1,
});

auditLogSchema.index({
  actorUserId: 1,
  createdAt: -1,
});

auditLogSchema.index({
  action: 1,
  createdAt: -1,
});

const AuditLog =
  mongoose.model(
    "AuditLog",
    auditLogSchema
  );

export default AuditLog;
