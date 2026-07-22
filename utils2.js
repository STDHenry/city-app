// =================================================================
// INDEPENDENT CITY NETWORK - KHO 2 (MAIN APP) - UTILS2.JS (ĐỒNG BỘ MINI CHAT)
// =================================================================

const SUPABASE_URL = "https://accvbywalbbkowbwuspd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnRua3Buc3VsYXd4eGlnY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTA2NjksImV4cCI6MjA5OTg2NjY2OX0.rPsGAcSt3Yv049dxUTVNaUlpw8hHEpTpr84HYv7dHEg";

let cachedSupabaseClient = null;

export let CITY_STATE = {
    LOGGED_IN_USER: "",
    USER_EMAIL: "",
    CURRENT_BALANCE: 1000000,
    GLOBAL_PRODUCTS_LIST: []
};

// Hàm Getter hoãn giờ nạp biến, bốc thẳng đối tượng window.supabase giống dự án mini chat [🗎1]
export function getDB() {
    if (cachedSupabaseClient) return cachedSupabaseClient;
    
    const supabaseEngine = window.supabase;
    if (!supabaseEngine) {
        console.warn("⚠️ Trạm Kho 2 utils2.js: Đang chờ thư viện cdnjs nạp ngầm...");
        return null;
    }
    // Khởi tạo chìa khóa kết nối clientDB bách phát bách trúng theo phom cũ của bạn
    cachedSupabaseClient = supabaseEngine.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return cachedSupabaseClient;
}
