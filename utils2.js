/* =========================================================
   BỘ NÃO VẬN HÀNH KHO 2 - CHUẨN ES MODULE TINH KHIẾT (utils2.js) [🗎1]
   ========================================================= */
// ĐỒNG BỘ TỌA ĐỘ MẠNG LÕI GIỮA HAI KHO CHUẨN XÁC 100% [🗎1]
const SUPABASE_URL = "https://lzvtnkpnsulawxxigcpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnRua3Buc3VsYXd4eGlnY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTA2NjksImV4cCI6MjA5OTg2NjY2OX0.rPsGAcSt3Yv049dxUTVNaUlpw8hHEpTpr84HYv7dHEg";

let cachedSupabaseClient = null;

// TRẠM TRẠNG THÁI TOÀN CỤC CỦA SẢNH CHÍNH KHO 2 [🗎1]
window.CITY_STATE = {
    LOGGED_IN_USER: "",                  // Tên nick cư dân lọt qua trạm gác SSO
    CURRENT_BALANCE: 0,                  // Hạn mức số dư ví AD nhảy số nhảy số thời gian thực
    GLOBAL_PRODUCTS_LIST: [],            // Kho lưu bản ghi mảng hàng hóa Chợ mây
    GLOBAL_MARKET_CLOCK_INTERVAL_ID: null, // ID bộ định thời giây trượt sảnh Chợ
    GLOBAL_TASK_CLOCK_INTERVAL_ID: null   // ID bộ định thời đồng hồ 25h nhiệm vụ
};

// HÀM GETTER ĐƯỢC XUẤT KHẨU SANG HUB.HTML: Bốc động cơ kết nối đám mây bách phát bách trúng [🗎1]
export function getDB() {
    if (cachedSupabaseClient) return cachedSupabaseClient;
    
    const supabaseEngine = window.supabase;
    if (!supabaseEngine) {
        console.warn("⚠️ Trạm sảnh Hub utils2.js: Đang chờ thư viện cdnjs nạp ngầm...");
        return null;
    }
    cachedSupabaseClient = supabaseEngine.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return cachedSupabaseClient;
}
// =========================================================
// ĐỢT 2: HÀM KIỂM TOÁN VÀ ĐỐI CHIẾU MÃ TOKEN ID NHẬN DIỆN TIA CHỚP [🗎1]
// =========================================================
export async function validateSessionTokenAndGetIdentity() {
    // Bốc tách chuỗi mã phiên Token ID găm trên đuôi URL trình duyệt
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('id');

    // Lá chắn kiểm toán đầu vào: Nếu trống chip nhận diện, phát lệnh từ chối thông mạch
    if (!token) {
        return { valid: false, message: "🚨 MẠNG LÕI: Chip nhận diện trống rỗng! Trục xuất quay đầu sảnh cũ." };
    }

    try {
        const db = getDB();
        if (!db) return { valid: false, message: "🚨 MẠNG LÕI: Chưa kết nối được database đám mây!" };

        // Quét đối chiếu trực tiếp mã Token với bảng quản lý phiên public.city_sessions trên đám mây [🗎1]
        const { data: session, error } = await db.from('city_sessions').select('username').eq('token', token).maybeSingle();

        if (error || !session) {
            return { valid: false, message: "🚨 MẠNG LÕI: Mã phiên Token ID sai lệch hoặc đã hết hạn! Vui lòng đăng nhập lại." };
        }

        // Đồng bộ ghi nhận danh tính cư dân độc lập vào trạm trạng thái toàn cục liên trang
        window.CITY_STATE.LOGGED_IN_USER = session.username;
        return { valid: true, token: token };
    } catch (err) {
        return { valid: false, message: "Sự cố trạm quét danh tính mạng lõi: " + err.message };
    }
}
// =========================================================
// ĐỢT 3: HÀM THỰC THI GIAO DỊCH TÀI CHÍNH LIÊN CƯ DÂN KHÔNG REFRESH TRANG [🗎1]
// =========================================================
export async function executeTransactionCloud(receiverInput, amountInput) {
    const db = getDB();
    const sender = window.CITY_STATE.LOGGED_IN_USER;

    // Lá chắn chặn hành vi tự chuyển khoản cho chính mình gây lỗi mạch vòng [🗎1]
    if (sender === receiverInput) {
        return { success: false, message: "Không thể tự chuyển tiền AD cho chính bản thân mình!" };
    }

    // Lá chắn kiểm toán hạn mức số dư ví máy con hiện thời [🗎1]
    if (window.CITY_STATE.CURRENT_BALANCE < amountInput) {
        return { success: false, message: "Tài khoản thâm hụt! Số dư ví AD không đủ hạn mức thực thi." };
    }

    try {
        // 1. Đối chiếu tra cứu xem đối phương nhận tiền có tồn tại trên thành phố mạng không [🗎1]
        const { data: receiverUser } = await db.from('city_users').select('username').eq('username', receiverInput).maybeSingle();
        if (!receiverUser) {
            return { success: false, message: `Cư dân @${receiverInput} không tồn tại trên mạng lưới mạng lõi!` };
        }

        // 2. Khấu trừ hạn mức ví AD của người khởi phát lệnh gửi [🗎1]
        const targetSenderBal = window.CITY_STATE.CURRENT_BALANCE - amountInput;
        await db.from('city_bank').update({ balance: targetSenderBal }).eq('username', sender);

        // 3. Tra cứu bốc số dư cũ và thực hiện cộng dồn tiền AD cho cư dân tiếp đón nhận [🗎1]
        const { data: recBank } = await db.from('city_bank').select('balance').eq('username', receiverInput).single();
        const targetRecBal = (recBank ? recBank.balance : 0) + amountInput;
        await db.from('city_bank').update({ balance: targetRecBal }).eq('username', receiverInput);

        // Đồng bộ ghi nhận hạn mức mới lót lòng bộ nhớ đệm
        window.CITY_STATE.CURRENT_BALANCE = targetSenderBal;
        return { success: true, newBalance: targetSenderBal };

    } catch (err) {
        return { success: false, message: "Mạch luân chuyển Ngân hàng gặp sự cố: " + err.message };
    }
}
// =========================================================
// ĐỢT 4: ĐỘNG CƠ MUA HÀNG NHỒI MẢNG JSONB VÀ BỘ ĐIỀU PHỐI TAB SẢNH [🗎1]
// =========================================================

// --- 1. THUẬT TOÁN MUA HÀNG VÀ BĂM NHỒI 100 REVIEW SAO JSONB CHẶN PHÌNH DỮ LIỆU ---
export async function purchaseServiceCloud(prodId, sellerName, priceAmount, comment, stars) {
    const db = getDB();
    const buyer = window.CITY_STATE.LOGGED_IN_USER;

    // Lá chắn kiểm toán hạn mức số dư tài sản người mua tại chỗ [🗎1]
    if (window.CITY_STATE.CURRENT_BALANCE < priceAmount) {
        return { success: false, message: "Ví điện tử AD của bạn không đủ số dư để mua mặt hàng này!" };
    }

    try {
        // Luân chuyển tiền: Khấu trừ tiền người mua đè trực tiếp lên bảng ngân hàng mây [🗎1]
        const targetBuyerBal = window.CITY_STATE.CURRENT_BALANCE - priceAmount;
        await db.from('city_bank').update({ balance: targetBuyerBal }).eq('username', buyer);

        // Tra cứu bốc số dư cũ và thực hiện cộng tiền cho chủ shop người bán [🗎1]
        const { data: selBank } = await db.from('city_bank').select('balance').eq('username', sellerName).single();
        const targetSellerBal = (selBank ? selBank.balance : 0) + priceAmount;
        await db.from('city_bank').update({ balance: targetSellerBal }).eq('username', sellerName);

        // Tra cứu bốc mảng JSONB nhận xét cũ của sản phẩm để găm nhồi thêm lượt review mới [🗎1]
        const { data: prod } = await db.from('city_services').select('reviews').eq('id', prodId).single();
        let currentReviews = prod ? (prod.reviews || []) : [];
        
        // Nhồi mảng cấu trúc bản ghi nhận xét mới tinh khiết
        currentReviews.push({
            reviewer: buyer,
            comment: comment,
            stars: stars,
            time: new Date().toISOString()
        });

        // Giới hạn trần khóa cứng chặn phình dữ liệu mảng JSONB tối đa 100 nhận xét mới nhất [🗎1]
        if (currentReviews.length > 100) {
            currentReviews = currentReviews.slice(-100);
        }

        // Đẩy đè mảng JSONB siêu sạch đã cập nhật ngược trở lại đám mây [🗎1]
        await db.from('city_services').update({ reviews: currentReviews }).eq('id', prodId);

        window.CITY_STATE.CURRENT_BALANCE = targetBuyerBal;
        return { success: true, newBalance: targetBuyerBal };

    } catch (err) {
        return { success: false, message: "Mạch giao thương Chợ mây gặp sự cố: " + err.message };
    }
}

// --- 2. HÀM TẠO TOAST POPUP THÔNG BÁO GIẬT TỪ GÓC MÀN HÌNH LÊN MƯỢT MÀ ---
export function showNotificationPopup(title, text) {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "city-card";
    // Thiết lập hệ màu sắc Pop-Art Lục quân phẳng khối gông viền đen dày dặn [🗎1]
    toast.style.cssText = "padding: 12px; background-color: #004040; color: #ffffff; border: 2px solid #000000; box-shadow: 4px 4px 0px #000000; font-size: 12px; min-width: 240px; animation: toastBayLên 0.2s ease-out; margin-bottom: 10px; pointer-events: auto;";
    
    toast.innerHTML = `
        <div style="font-weight: 950; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px dashed #ffffff; padding-bottom: 2px;">⚡ ${title}</div>
        <div style="font-weight: bold; line-height: 1.4;">${text}</div>
    `;

    container.appendChild(toast);
    
    // Tự động kích nổ lệnh cơ học thu hồi xóa rác thông báo sau đúng 4 giây hiển thị
    setTimeout(() => {
        toast.style.animation = "toastBiếnMất 0.2s ease-in forwards";
        setTimeout(() => toast.remove(), 200);
    }, 4000);
}

// --- 3. ĐỘNG CƠ CƠ HỌC GẠT CÔNG TẮC LUÂN CHUYỂN 4 TAB ĐẠI SẢNH LỚN CHÍNH ---
export function switchMainHubTab(targetTabId) {
    // Ẩn toàn bộ các tab lớn ngoài sảnh
    document.querySelectorAll(".hub-body-tab").forEach(t => t.style.display = "none");
    // Tháo bỏ trạng thái sáng gông viền ở tất cả các nút Tab Navbar
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    // Bung mở hiển thị tab đích danh được nhấp chuột [🗎1]
    const activeTab = document.getElementById(targetTabId);
    if (activeTab) activeTab.style.display = "block";

    // Ép gạt bật sáng nút tab Navbar tương ứng [🗎1]
    const navBtnId = targetTabId.replace("tab-", "navTab-");
    const navBtn = document.getElementById(navBtnId);
    if (navBtn) navBtn.classList.add("active");
}

// --- 4. ĐỘNG CƠ CƠ HỌC GẠT CÔNG TẮC LUÂN CHUYỂN 3 PHÂN KHU CHAT CON PHỤ CHESS.COM ---
export function switchChessSubPanel(targetPanelId, activeBtnCtrlId) {
    // Ẩn toàn bộ 3 phân khu chat con lọt lòng sảnh viễn thông [🗎1]
    document.getElementById("panel-chat-general").style.display = "none";
    document.getElementById("panel-chat-mailbox").style.display = "none";
    document.getElementById("panel-chat-private").style.display = "none";

    // Bung mở hiển thị duy nhất phân khu chat con được gạt nút nhấp chọn [🗎1]
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) {
        if (targetPanelId === "panel-chat-mailbox") {
            targetPanel.style.display = "flex"; // Riêng hòm thư mật ép phom flex chia 2 cột Sidebar [🗎1]
        } else {
            targetPanel.style.display = "flex";
        }
    }

    // Luân hành mảng màu Pop-Art giật nút bấm lật tab phụ công khai
    const buttons = ["tabCtrlChatGeneral", "tabCtrlMailbox", "tabCtrlChatPrivate"];
    buttons.forEach(bId => {
        const btn = document.getElementById(bId);
        if (!btn) return;
        if (bId === activeBtnCtrlId) {
            // Nút đang chọn: Đóng dấu áo đen chữ trắng đanh thép [🗎1]
            btn.style.backgroundColor = "var(--black-pure)";
            btn.style.color = "var(--white-pure)";
            // Tự động thu hồi xóa rác chấm đỏ thông báo chưa xem khi cư dân đã chui tọt vào sảnh click xem [🗎1]
            if (typeof window.executeClearChessUnreadDotModule === 'function') {
                window.executeClearChessUnreadDotModule(bId);
            }
        } else {
            // Nút còn lại: Trả về nền trắng chữ đen thô bản Pop-Art
            btn.style.backgroundColor = "var(--white-pure)";
            btn.style.color = "var(--black-pure)";
        }
    });
}

console.log("Independent City Mạng Lõi: Bộ não rời utils2.js ES Module hoàn chỉnh đã chốt nòng vĩnh viễn! 🏆🔓");
