import mongoose from "mongoose";

const pasteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },

    content: {
      type: String,
      required: true,
    },

    ttl_seconds: {
      type: Number,
      default: 0,
    },

    expires_at: {
      type: Date,
      default: null,
    },

    max_views: {
      type: Number,
      default: 0,
    },

    views_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // 🔥 REQUIRED for createdAt
  }
);

export default mongoose.model("Paste", pasteSchema);
