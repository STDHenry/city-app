// =================================================================
// INDEPENDENT CITY NETWORK - KHO 2 (MAIN APP) - UTILS.JS (ĐH 1)
// =================================================================

const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnRua3Buc3VsYXd4eGlnY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTA2NjksImV4cCI6MjA5OTg2NjY2OX0.rPsGAcSt3Yv049dxUTVNaUlpw8hHEpTpr84HYv7dHEg";
let cachedSupabaseClient = null;

// Bộ nhớ đệm tập trung (State) cô lập quản lý riêng cho không gian nội bộ Kho 2
export let CITY_STATE = {
    LOGGED_IN_USER: "",
    USER_EMAIL: "",
    CURRENT_BALANCE: 1000000,
    GLOBAL_PRODUCTS_LIST: []
};

// Hàm Getter hoãn giờ bốc biến toàn cục, đợi cdnjs nạp xong thư viện đám mây [🗎1]
export function getDB() {
    if (cachedSupabaseClient) return cachedSupabaseClient;
    const supabaseEngine = window.supabase || window.parent.supabase;
    if (!supabaseEngine) {
        console.warn("⚠️ Trạm Kho 2 utils.js: Đang đợi thư viện đám mây nạp ngầm...");
        return null;
    }
    cachedSupabaseClient = supabaseEngine.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return cachedSupabaseClient;
}

// =========================================================
// THUẬT TOÁN TỐI CAO: BỐC TÁCH VÀ THẨM ĐỊNH MÃ CHIP TOKEN ID TỪ THANH URL [🗎1]
// =========================================================
export async function validateSessionTokenAndGetIdentity() {
    const db = getDB();
    if (!db) return { valid: false, message: "Trạm kết nối mây chưa sẵn sàng!" };

    // 1. Tự động trích xuất chuỗi mã nằm sau dấu ?id= trên thanh địa chỉ URL của trình duyệt [🗎1]
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('id');

    // Lá chắn bảo vệ: Nếu thanh URL trống không hoặc chứa mã rác, chặn cửa đuổi ra sảnh ngay
    if (!tokenFromUrl) {
        return { valid: false, message: "⚠️ Cảnh báo bảo mật: Không tìm thấy Token ID nhận diện hợp lệ của phiên làm việc!" };
    }

    try {
        // 2. Bắn lệnh truy quét lên bảng trung gian city_sessions xem mã chip này có tồn tại không [🗎1]
        const { data: sessionRecords, error: sessErr } = await db
            .from('city_sessions')
            .select('*')
            .eq('token', tokenFromUrl);

        if (sessErr || !sessionRecords || sessionRecords.length === 0) {
            return { valid: false, message: "⚠️ Phiên làm việc đã hết hạn hoặc bị từ chối truy cập! Vui lòng đăng nhập lại." };
        }

        // 3. Nếu tìm thấy mã Token hợp lệ, bốc ngay tên chủ sở hữu danh tính ra
        const validSession = sessionRecords[0];
        CITY_STATE.LOGGED_IN_USER = validSession.username;

        // 4. Liên thông thọc sang bảng city_users lấy hòm thư Email đổ về cấu hình
        const { data: userProfiles } = await db.from('city_users').select('email').eq('username', CITY_STATE.LOGGED_IN_USER);
        if (userProfiles && userProfiles.length > 0) {
            CITY_STATE.USER_EMAIL = userProfiles[0].email;
        }

        return { valid: true, username: CITY_STATE.LOGGED_IN_USER, token: tokenFromUrl };

    } catch (err) {
        return { valid: false, message: "Lỗi thẩm định đường truyền bảo mật: " + err.message };
    }
}
/* KHÓA ĐỢT 1 CỦA KHO 2: BỘ NÃO PHÂN TÁCH TOKEN URL ĐÃ HOÀN THÀNH. ĐỢT 2 SẼ KHỞI TẠO KHUNG CSS VÀ LỚP VỎ FILE HUB.HTML MẶT TIỀN */
