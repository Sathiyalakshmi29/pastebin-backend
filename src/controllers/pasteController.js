import Paste from "../models/paste.js";

// Helper: deterministic "now"
function getNow(req) {
  if (process.env.TEST_MODE === "1") {
    const testNow = req.headers["x-test-now-ms"];
    if (testNow) return new Date(Number(testNow));
  }
  return new Date();
}

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// CREATE paste
export const createPaste = async (req, res) => {
  try {
    const { title, content, ttl_seconds = 0, max_views = 0 } = req.body;

    if (!content || content.trim() === "") {
      return res.status(400).json({ status: "error", message: "Content is required", code: 400 });
    }

    if (ttl_seconds && (!Number.isInteger(ttl_seconds) || ttl_seconds < 1)) {
      return res.status(400).json({ status: "error", message: "ttl_seconds must be integer ≥ 1" });
    }

    if (max_views && (!Number.isInteger(max_views) || max_views < 1)) {
      return res.status(400).json({ status: "error", message: "max_views must be integer ≥ 1" });
    }

    let expires_at = ttl_seconds > 0 ? new Date(getNow(req).getTime() + ttl_seconds * 1000) : null;

    const paste = await Paste.create({ title, content, ttl_seconds, expires_at, max_views });

    res.status(201).json({
      status: "success",
      data: { id: paste._id, url: `${BASE_URL}/p/${paste._id}` },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// GET all pastes
export const getPastes = async (req, res) => {
  try {
    const pastes = await Paste.find({
      $or: [{ expires_at: null }, { expires_at: { $gt: getNow(req) } }],
    }).sort({ createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: pastes.map(p => ({
        _id: p._id,
        title: p.title,
        content: p.content,
        createdAt: p.createdAt,
        expires_at: p.expires_at,
        remaining_views: p.max_views > 0 ? p.max_views - p.views_count : null,
      })),
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// GET paste by ID + increment views
export const getPasteById = async (req, res) => {
  try {
    const paste = await Paste.findById(req.params.id);
    if (!paste) return res.status(404).json({ status: "error", message: "Paste not found" });

    const now = getNow(req);

    if (paste.expires_at && paste.expires_at < now) {
      return res.status(404).json({ status: "error", message: "Paste expired" });
    }

    if (paste.max_views > 0) {
      if (paste.views_count >= paste.max_views) {
        return res.status(404).json({ status: "error", message: "Paste expired (max views reached)" });
      }
      paste.views_count += 1;
      await paste.save();
    }

    res.status(200).json({
      title: paste.title,
      content: paste.content,
      createdAt: paste.createdAt,
      expires_at: paste.expires_at,
      remaining_views: paste.max_views > 0
        ? paste.max_views - paste.views_count
        : null,
    });

  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// GET paste HTML
export const getPasteHTML = async (req, res) => {
  try {
    const { id } = req.params;
    const paste = await Paste.findById(id);

    if (!paste) return res.status(404).send("Paste not found");

    const now = getNow(req);

    if (paste.expires_at && paste.expires_at <= now) return res.status(404).send("Paste expired");
    if (paste.max_views > 0 && paste.views_count >= paste.max_views) return res.status(404).send("View limit exceeded");

    paste.views_count += 1;
    await paste.save();

    res.setHeader("Content-Type", "text/html");
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${paste.title || "Untitled"}</title>
          <style>
            body { font-family: monospace; background: #0f172a; color: #e5e7eb; padding: 40px; }
            pre { white-space: pre-wrap; background: #020617; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h2>${paste.title || "Untitled"}</h2>
          <pre>${escapeHtml(paste.content)}</pre>
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Server error");
  }
};

// helper to prevent script execution
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
