const express = require("express");
const bcrypt = require("bcryptjs");
const sendMail = require("../utils/mailer");

const router = express.Router();
// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP (simulated - in production, use SMS/email service)
async function sendOTP(email, otp) {
  try {
    await sendMail(
      email,
      "Password Reset OTP",
      `
      <h2>Password Reset Request</h2>
      <p>Your OTP for resetting password is:</p>
      <h1>${otp}</h1>
      <p>This OTP will expire in <b>10 minutes</b>.</p>
      <p>If you didn't request this, ignore this email.</p>
      `,
    );
  } catch (err) {
    console.error("OTP email error:", err);
    throw err;
  }
}

// Request password reset OTP
router.post("/forgot", async (req, res) => {
  const { email } = req.body;
  const supabase = req.app.locals.supabase;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    // Check if user exists
    const { data: user } = await supabase
      .from("users")
      .select("email")
      .eq("email", email)
      .single();

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({
        message: "If this email exists, an OTP has been sent",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP in database
    await supabase.from("password_reset_otp").insert([
      {
        email,
        otp,
        expires_at: expiresAt,
        used: false,
      },
    ]);

    // Send OTP
    await sendOTP(email, otp);

    res.json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("password_reset_otp")
      .select("*")
      .eq("email", email)
      .eq("otp", otp)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({
      message: "OTP verified successfully",
      verified: true,
      resetToken: data.id, // Use OTP record ID as reset token
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset password
router.post("/reset", async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  const supabase = req.app.locals.supabase;

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  try {
    // Verify reset token
    const { data: otpRecord } = await supabase
      .from("password_reset_otp")
      .select("*")
      .eq("id", resetToken)
      .eq("email", email)
      .eq("used", false)
      .single();

    if (!otpRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const { error: updateError } = await supabase
      .from("users")
      .update({ password: hashedPassword })
      .eq("email", email);

    if (updateError) throw updateError;

    // Mark OTP as used
    await supabase
      .from("password_reset_otp")
      .update({ used: true })
      .eq("id", resetToken);

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
