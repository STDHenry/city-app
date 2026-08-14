// =================================================================
// INDEPENDENT CITY NETWORK - KHO 1 (GATEWAY) - UTILS.JS (ĐỒNG BỘ MINI CHAT)
// =================================================================

const SUPABASE_URL = "https://lzvtnkpnsulawxxigcpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnRua3Buc3VsYXd4eGlnY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTA2NjksImV4cCI6MjA5OTg2NjY2OX0.rPsGAcSt3Yv049dxUTVNaUlpw8hHEpTpr84HYv7dHEg";

let cachedSupabaseClient = null;

// Hàm Getter hoãn giờ nạp biến, bốc thẳng đối tượng window.supabase giống dự án mini chat [🗎1]
export function getDB() {
    if (cachedSupabaseClient) return cachedSupabaseClient;
    
    // ĐỒNG BỘ: Trích xuất công cụ từ cửa sổ window toàn cục của trình duyệt
    const supabaseEngine = window.supabase;
    if (!supabaseEngine) {
        console.warn("⚠️ Trạm Gateway utils.js: Đang chờ thư viện cdnjs nạp ngầm...");
        return null;
    }
    // Khởi tạo chìa khóa kết nối clientDB bách phát bách trúng theo phom cũ của bạn
    cachedSupabaseClient = supabaseEngine.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return cachedSupabaseClient;
}

// THUẬT TOÁN TỰ SINH CHUỖI TOKEN ID NGẪU NHIÊN SIÊU BẢO MẬT
function generateRandomTokenID() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'IC_TOKEN_';
    for (let i = 0; i < 24; i++) { token += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return token + '_' + Date.now();
}

// =========================================================
// CHỨC NĂNG A: XỬ LÝ ĐĂNG KÝ TÀI KHOẢN MẬT KHẨU TĨNH MỚI
// =========================================================
export async function registerCitizenCloud(username, email, password) {
    const clientDB = getDB(); // Đổi tên biến hứng sang clientDB giống dự án mini chat [🗎1]
    if (!clientDB) return { success: false, message: "Hệ thống đang kết nối đám mây, vui lòng đợi 1 giây rồi bấm lại!" };

    try {
        const { data: existUser } = await clientDB.from('city_users').select('username').eq('username', username);
        if (existUser && existUser.length > 0) {
            return { success: false, message: "Lỗi: Tên tài khoản này đã được sử dụng bởi cư dân khác!" };
        }

        await clientDB.from('city_users').insert([{ 
            username: username, email: email, password: password,
            bio: "Chào mừng đến với Independent City!", is_hidden: false
        }]);

        await clientDB.from('city_bank').insert([{ username: username, balance: 1000000 }]);
        return { success: true };
    } catch (err) { return { success: false, message: "Trục trặc ghi nhận dữ liệu: " + err.message }; }
}

// =========================================================
// CHỨC NĂNG B: LÕI THUẬT TOÁN ĐĂNG NHẬP SINGLE SIGN-ON (SSO) TỰ CHẾ
// =========================================================
export async function loginCitizenAndCreateSession(userOrEmail, password) {
    const clientDB = getDB(); // Đổi tên biến hứng sang clientDB giống dự án mini chat [🗎1]
    if (!clientDB) return { success: false, message: "Hệ thống đang kết nối đám mây, vui lòng đợi 1 giây rồi bấm lại!" };

    try {
        const { data: users, error } = await clientDB
            .from('city_users').select('*').eq('password', password)
            .or(`username.eq."${userOrEmail}",email.eq."${userOrEmail}"`);

        if (error || !users || users.length === 0) {
            return { success: false, message: "⚠️ Đăng nhập thất bại: Sai tài khoản, email hoặc mật khẩu bảo mật!" };
        }

        const loggedUser = users[0]; 
        const sessionToken = generateRandomTokenID();

        await clientDB.from('city_sessions').insert([{ username: loggedUser.username, token: sessionToken }]);
        return { success: true, username: loggedUser.username, token: sessionToken };
    } catch (err) { return { success: false, message: "Lỗi kết nối trạm dữ liệu: " + err.message }; }
}
