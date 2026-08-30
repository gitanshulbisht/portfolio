import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://devops-react-render-portfolio.onrender.com";

/**
 * Send messages array to /api/ai/chat
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<{reply: string, suggested_followups: string[]}>}
 */
export async function sendChatMessage(messages) {
  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/ai/chat`,
      { messages },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      }
    );
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error("Backend is warming up on Render. Please wait a few seconds and retry!");
    }
    const msg = error.response?.data?.detail || "Could not reach Anshul's AI assistant. Please try again.";
    throw new Error(msg);
  }
}
