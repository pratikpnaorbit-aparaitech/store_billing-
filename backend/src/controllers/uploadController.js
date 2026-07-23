const getCloudinary = require("../config/cloudinary");

exports.uploadProductImage = async (req, res) => {
  try {
    const image = String(req.body.image || "");
    if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(image)) {
      return res.status(400).json({ success: false, message: "A JPEG, PNG or WebP image is required" });
    }
    const encoded = image.slice(image.indexOf(",") + 1);
    if (!encoded || !/^[A-Za-z0-9+/=\r\n]+$/.test(encoded)) {
      return res.status(400).json({ success: false, message: "The selected image data is invalid" });
    }
    if (Buffer.from(encoded, "base64").byteLength > 5 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: "Image must be smaller than 5 MB" });
    }
    const cloudinary = getCloudinary();
    if (!cloudinary) {
      if (process.env.NODE_ENV === "production") {
        return res.status(503).json({ success: false, message: "Image storage is not configured" });
      }
      return res.status(201).json({ success: true, data: { url: image, publicId: "" } });
    }
    const result = await cloudinary.uploader.upload(image, {
      folder: `smart-billing/${req.userId}/products`,
      resource_type: "image",
      transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto", fetch_format: "auto" }],
    });
    res.status(201).json({ success: true, data: { url: result.secure_url, publicId: result.public_id } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Image upload failed" });
  }
};
