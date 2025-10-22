// utils/tokenUtils.js
import { jwtDecode } from "jwt-decode";

/**
 * Kiểm tra JWT còn hạn hay không
 * @param {string} idToken 
 * @param {number} bufferSeconds - thời gian dự phòng (mặc định 5 phút)
 * @returns {boolean} true nếu hết hạn hoặc lỗi, false nếu còn hạn
 */
export function isIdTokenExpired(idToken, bufferSeconds = 300) {
  if (!idToken || typeof idToken !== "string") return true;

  const parts = idToken.split(".");
  if (parts.length !== 3) {
    console.error("❌ idToken không đúng định dạng JWT:", idToken);
    return true;
  }

  try {
    const decoded = jwtDecode(idToken);
    if (!decoded.exp) return true;

    const currentTime = Date.now() / 1000;
    const timeLeft = decoded.exp - currentTime;

    console.log(`⏳ Token còn hạn khoảng ${Math.max(0, Math.floor(timeLeft))} giây`);

    return decoded.exp < currentTime + bufferSeconds; // true nếu sắp hết hạn
  } catch (err) {
    console.error("❌ Không thể decode idToken:", err);
    return true;
  }
}
