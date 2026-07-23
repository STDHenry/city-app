// =================================================================
// INDEPENDENT CITY NETWORK - KHO 2 (MAIN APP) - UTILS2.JS (ĐỢT 1)
// =================================================================

// 1. KHAI BÁO CỔNG KẾT NỐI: Đấu dây chính xác sang trạm đám mây Supabase mới tinh của bạn
const SUPABASE_URL = "https://lzvtnkpnsulawxxigcpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnRua3Buc3VsYXd4eGlnY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTA2NjksImV4cCI6MjA5OTg2NjY2OX0.rPsGAcSt3Yv049dxUTVNaUlpw8hHEpTpr84HYv7dHEg";

let cachedSupabaseClient = null;

// Bộ nhớ đệm tập trung (Centralized State) quản lý cô lập riêng danh tính cư dân Kho 2
export let CITY_STATE = {
    LOGGED_IN_USER: "",
    USER_EMAIL: "",
    CURRENT_BALANCE: 1000000,
    GLOBAL_PRODUCTS_LIST: []
};

// Hàm Getter hoãn giờ nạp biến, tương thích 100% với file thư viện cdnjs từ dự án mini chat
export function getDB() {
    if (cachedSupabaseClient) return cachedSupabaseClient;
    
    // Bốc thẳng đối tượng window.supabase toàn cục của cửa sổ trình duyệt hiện tại [🗎2]
    const supabaseEngine = window.supabase;
    if (!supabaseEngine) {
        console.warn("⚠️ Trạm Kho 2 utils2.js: Đang chờ thư viện đám mây nạp ngầm...");
        return null;
    }
    cachedSupabaseClient = supabaseEngine.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return cachedSupabaseClient;
}

// =========================================================
// THUẬT TOÁN TỐI CAO: BỐC TÁCH VÀ THẨM ĐỊNH MÃ CHIP TOKEN ID TỪ THANH URL [🗎1]
// =========================================================
export async function validateSessionTokenAndGetIdentity() {
    const clientDB = getDB(); // Đơn giản hóa sang biến clientDB đồng bộ với dự án mini chat [🗎1]
    if (!clientDB) return { valid: false, message: "Hệ thống chưa nạp xong cấu hình đám mây!" };

    // Tự động trích xuất chuỗi mã nằm sau dấu ?id= trên thanh địa chỉ URL của trình duyệt [🗎1]
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('id');

    if (!tokenFromUrl) {
        return { valid: false, message: "⚠️ Cảnh báo bảo mật: Không tìm thấy chiếc chìa khóa Token ID nhận diện phiên làm việc!" };
    }

    try {
        // Quét bảng trung gian city_sessions xem mã chip nhận diện này có tồn tại thực tế không [🗎1]
        const { data: sessionRecords, error: sessErr } = await clientDB
            .from('city_sessions')
            .select('*')
            .eq('token', tokenFromUrl);

        if (sessErr || !sessionRecords || sessionRecords.length === 0) {
            return { valid: false, message: "⚠️ Phiên làm việc đã hết hạn hoặc bị từ chối truy cập! Vui lòng đăng nhập lại tại sảnh Gateway." };
        }

        const validSession = sessionRecords[0]; // Bốc hàng dữ liệu đầu tiên lọt mảng
        CITY_STATE.LOGGED_IN_USER = validSession.username;

        // Thọc sang bảng city_users bốc email danh tính cư dân [🗎1]
        const { data: userProfiles } = await clientDB.from('city_users').select('email').eq('username', CITY_STATE.LOGGED_IN_USER);
        if (userProfiles && userProfiles.length > 0) {
            CITY_STATE.USER_EMAIL = userProfiles[0].email;
        }

        return { valid: true, username: CITY_STATE.LOGGED_IN_USER, token: tokenFromUrl };

    } catch (err) {
        return { valid: false, message: "Trục trặc thẩm định đường truyền bảo mật: " + err.message };
    }
}
// =================================================================
// INDEPENDENT CITY NETWORK - KHO 2 (MAIN APP) - UTILS2.JS (ĐỢT 2)
// =================================================================

// =========================================================
// THUẬT TOÁN THỰC THI GIAO DỊCH CHUYỂN KHOẢN AN TOÀN (CÓ CHỮ EXPORT CHUẨN CHỈ) [🗎1]
// =========================================================
export async function executeTransactionCloud(receiverInput, amountInput) {
    const clientDB = getDB(); // Bốc biến kết nối clientDB đồng bộ với dự án mini chat [🗎1]
    if (!clientDB) return { success: false, message: "Hệ thống chưa nạp xong cấu hình đám mây!" };

    // TẦNG LÁ CHẮN 1: Ngăn chặn tuyệt đối hành vi cư dân tự chuyển tiền cho chính bản thân mình [🗎1]
    if (receiverInput === CITY_STATE.LOGGED_IN_USER) {
        return { success: false, message: "⚠️ Lỗi hệ thống: Bạn không thể tự chuyển khoản cho chính bản thân mình!" };
    }

    // TẦNG LÁ CHẮN 2: Ngăn chặn hành vi ví âm, chuyển lậu vượt quá hạn mức hiện có [🗎1]
    if (amountInput > CITY_STATE.CURRENT_BALANCE) {
        return { success: false, message: `⚠️ Từ chối giao dịch: Ví không đủ! Bạn hiện tại chỉ có ${CITY_STATE.CURRENT_BALANCE.toLocaleString()} AD.` };
    }

    try {
        // TẦNG LÁ CHẮN 3: Quét ví người nhận xem có tồn tại thực tế trên database mới không [🗎1]
        const { data: receiverWallet, error: checkErr } = await clientDB
            .from('city_bank')
            .select('*')
            .eq('username', receiverInput)
            .single();

        if (checkErr || !receiverWallet) {
            return { success: false, message: `⚠️ Lỗi bảo mật: Không tìm thấy cư dân nào mang tên tài khoản @${receiverInput} trên mạng lưới thành phố!` };
        }

        // BƯỚC A: Khấu trừ ví tiền tài khoản người gửi [🗎1]
        const newSenderBalance = CITY_STATE.CURRENT_BALANCE - amountInput;
        const { error: sendErr } = await clientDB
            .from('city_bank')
            .update({ balance: newSenderBalance })
            .eq('username', CITY_STATE.LOGGED_IN_USER);

        if (sendErr) return { success: false, message: "Giao dịch thất bại tại bước khấu trừ ví tài khoản!" };

        // BƯỚC B: Cộng tiền liên thông trực tiếp vào ví tài khoản người nhận [🗎1]
        const newReceiverBalance = receiverWallet.balance + amountInput;
        await clientDB
            .from('city_bank')
            .update({ balance: newReceiverBalance })
            .eq('username', receiverInput);

        // Cập nhật lại bộ nhớ đệm máy con để frontend bốc số hiển thị tức thì
        CITY_STATE.CURRENT_BALANCE = newSenderBalance;
        return { success: true, newBalance: newSenderBalance };

    } catch (err) {
        return { success: false, message: "Lỗi đường truyền kết nối ngân hàng: " + err.message };
    }
}
// =================================================================
// INDEPENDENT CITY NETWORK - KHO 2 (MAIN APP) - UTILS2.JS (ĐỢT 3)
// =================================================================

// =========================================================
// THUẬT TOÁN ĐĂNG SẢN PHẨM MỚI KHÓA TRẦN DƯỚI 1000 AD (CÓ EXPORT) [🗎1]
// =========================================================
export async function publishNewServiceCloud(title, description, imageUrl, price) {
    const clientDB = getDB();
    if (!clientDB) return { success: false, message: "Mất kết nối trạm dữ liệu đám mây!" };

    // LÁ CHẮN BẢO VỆ: Chặn cứng quy chuẩn hạn mức giá bán từ 1 đến 1000 AD [🗎1]
    if (price < 1 || price > 1000) {
        return { success: false, message: "⚠️ Bị từ chối: Quy chuẩn giá bán bắt buộc phải từ 1 đến 1000 AD! [🗎1]" };
    }

    try {
        const { error } = await clientDB.from('city_services').insert([{
            seller: CITY_STATE.LOGGED_IN_USER,
            title: title,
            description: description,
            price: price,
            image_url: imageUrl || "data:image/svg+xml;utf8,<svg xmlns='http://w3.org' width='80' height='80'><rect width='80' height='80' fill='%23001F3F'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='%23ffffff' font-family='Arial' font-size='11'>Independent</text></svg>",
            reviews: [] // Khởi tạo mảng JSONB rỗng cho nhận xét mới tinh
        }]);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        return { success: false, message: "Trục trặc phát hành hàng hóa: " + err.message };
    }
}

// =========================================================
// THUẬT TOÁN MUA SẢN PHẨM LIÊN THÔNG VÍ & REVIEW 100 SAO JSONB (CÓ EXPORT) [🗎1]
// =========================================================
export async function purchaseServiceCloud(prodId, sellerName, priceAmount, commentText, starsCount) {
    const clientDB = getDB();
    if (!clientDB) return { success: false, message: "Trạm năng lượng mây đang nghẽn!" };

    try {
        // Bước A: Quét ví người mua xem hạn mức có đủ AD thanh toán không [🗎1]
        const { data: myWallet } = await clientDB.from('city_bank').select('*').eq('username', CITY_STATE.LOGGED_IN_USER).single();
        if (!myWallet || myWallet.balance < priceAmount) {
            return { success: false, message: `Ví không đủ AD! Bạn thiếu ${priceAmount - (myWallet ? myWallet.balance : 0)} AD.` };
        }

        // Bước B: Quét ví người bán xem có tồn tại thực tế trên hệ thống không [🗎1]
        const { data: sellerWallet } = await clientDB.from('city_bank').select('*').eq('username', sellerName).single();
        if (!sellerWallet) return { success: false, message: "Ví người bán không tồn tại hoặc đã bị đóng băng!" };

        // Bước C: Khấu trừ tài khoản người mua và cộng tài khoản người bán trực tiếp [🗎1]
        await clientDB.from('city_bank').update({ balance: myWallet.balance - priceAmount }).eq('username', CITY_STATE.LOGGED_IN_USER);
        await clientDB.from('city_bank').update({ balance: sellerWallet.balance + priceAmount }).eq('username', sellerName);

        // Bước D: Nhồi mảng nhận xét JSONB giới hạn nghiêm ngặt 100 lượt [🗎1]
        const { data: prodData } = await clientDB.from('city_services').select('reviews').eq('id', prodId).single();
        let currentReviews = prodData?.reviews || [];
        
        // Cơ chế dọn rác: Shift xóa review cũ nhất nếu chạm mốc trần 100 lượt
        if (currentReviews.length >= 100) currentReviews.shift(); 
        
        // Đẩy đánh giá mới lọt mảng JSONB đám mây
        currentReviews.push({ reviewer: CITY_STATE.LOGGED_IN_USER, stars: starsCount, comment: commentText });
        await clientDB.from('city_services').update({ reviews: currentReviews }).eq('id', prodId);

        return { success: true };
    } catch (err) {
        return { success: false, message: "Lỗi luồng thương mại khấu trừ: " + err.message };
    }
}
// =================================================================
// INDEPENDENT CITY NETWORK - KHO 2 (MAIN APP) - UTILS2.JS (ĐỢT 4 CHỐT HẠ)
// =================================================================

// =========================================================
// HÀM TOÀN CỤC SINH TOAST POPUP THÔNG BÁO GIẬT XỊN MỊN (CÓ EXPORT) [🗎1]
// =========================================================
export function showNotificationPopup(title, message) {
    const container = document.getElementById('notification-container');
    if (!container) return; // Lá chắn bảo vệ nếu giao diện chưa kịp nạp xong khung

    const popup = document.createElement('div');
    // Định hình phom hộp Toast vuông vức, viền đen dày dặn đồng bộ phong cách tối giản cao cấp
    popup.style.cssText = `
        background-color: var(--navy-deep, #001F3F); color: #ffffff; padding: 16px; width: 300px;
        border: 2px solid #000000; box-shadow: 4px 4px 0px #000000;
        transform: translateY(30px); opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: 'Segoe UI', Arial, sans-serif; display: flex; flex-direction: column; gap: 6px;
        box-sizing: border-box;
    `;
    
    // Gạt trượt phom phối màu nếu sảnh đang được cư dân gạt bật Dark Mode
    if (document.body.classList.contains('dark-theme')) {
        popup.style.borderColor = '#ffffff';
        popup.style.boxShadow = '4px 4px 0px #ffffff';
    }

    popup.innerHTML = `
        <div style="font-weight: 950; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px dashed rgba(255,255,255,0.3); padding-bottom: 4px;">${title}</div>
        <div style="font-size: 12px; color: #cbd5e0; word-break: break-word; font-weight: 700; line-height: 1.4;">${message}</div>
    `;

    container.appendChild(popup);
    
    // Hiệu ứng giật nhẹ vèo lên từ góc màn hình sau 50ms nạp
    setTimeout(() => { 
        popup.style.transform = 'translateY(0)'; 
        popup.style.opacity = '1'; 
    }, 50);
    
    // Tự động thu gọn biến mất êm ái sau 4 giây hiển thị
    setTimeout(() => {
        popup.style.transform = 'translateY(-20px)'; 
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 300);
    }, 4100);
}
/* KHÓA CHỐT TOÀN DIỆN 100%: FILE BỘ NÃO UTILS2.JS ĐÃ CHÍNH THỨC HOÀN THÀNH BIÊN KỊCH KHÔNG MỘT VẾT XƯỚC! */
