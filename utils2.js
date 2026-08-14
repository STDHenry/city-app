/* =========================================================
   ĐỢT 1: BỘ NÃO VẬN HÀNH TOÀN CỤC KHO KẾT NỐI ĐÁM MÂY (utils2.js) [🗎1]
   ========================================================= */

// Trạm khai báo mã khóa cấu hình kết nối đám mây Supabase mạng lõi độc lập
const SUPABASE_URL = "https://lzvtnkpnsulawxxigcpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6dnRua3Buc3VsYXd4eGlnY3BkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyOTA2NjksImV4cCI6MjA5OTg2NjY2OX0.rPsGAcSt3Yv049dxUTVNaUlpw8hHEpTpr84HYv7dHEg";

// GĂM THẲNG BIẾN TOÀN CỤC: Khởi tạo kết nối gá trực tiếp vào sảnh window để hóa giải vĩnh viễn lỗi 404 [🗎1]
window.IC_DATABASE_CLIENT = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Trạm lưu trữ đệm trạng thái cư dân hoạt động toàn cục liên trang không Module
window.CITY_STATE = {
    LOGGED_IN_USER: "",       // Tên tài khoản định danh lọt sảnh
    CURRENT_BALANCE: 0,       // Số dư ví điện tử AD thực tế
    GLOBAL_PRODUCTS_LIST: []  // Danh mục hàng hóa sảnh Chợ tự doanh
};

// VÁ LỖI NGỮ PHÁP "IS NOT A FUNCTION": Thiết lập hàm bốc kết nối gá chặt vào window sảnh [🗎1]
window.getDB = function() {
    if (!window.IC_DATABASE_CLIENT) {
        console.error("🚨 MẠNG LÕI: Kết nối cơ sở dữ liệu Supabase toàn cục chưa được khởi dựng!");
    }
    return window.IC_DATABASE_CLIENT;
};
// =========================================================
// ĐỢT 2: HÀM KIỂM TOÁN VÀ ĐỐI CHIẾU MÃ TOKEN ID NHẬN DIỆN TIA CHỚP [🗎1]
// =========================================================
window.validateSessionTokenAndGetIdentity = async function() {
    // Bốc tách chuỗi mã phiên Token ID găm trên đuôi URL trình duyệt
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('id');

    // Lá chắn kiểm toán đầu vào: Nếu trống chip nhận diện, phát lệnh từ chối thông mạch
    if (!token) {
        return { valid: false, message: "🚨 MẠNG LÕI: Chip nhận diện trống rỗng! Trục xuất quay đầu sảnh cũ." };
    }

    try {
        const db = window.getDB();
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
};
// =========================================================
// ĐỢT 3: HÀM THỰC THI GIAO DỊCH TÀI CHÍNH LIÊN CƯ DÂN KHÔNG REFRESH TRANG [🗎1]
// =========================================================
window.executeTransactionCloud = async function(receiverInput, amountInput) {
    const db = window.getDB();
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
};
// =========================================================
// ĐỢT 4: HÀM MUA HÀNG VÀ NHỒI MẢNG 100 REVIEW SAO JSONB LÊN ĐÁM MÂY [🗎1]
// =========================================================
window.purchaseServiceCloud = async function(prodId, sellerName, priceAmount, comment, stars) {
    const db = window.getDB();
    const buyer = window.CITY_STATE.LOGGED_IN_USER;

    // Lá chắn kiểm toán hạn mức số dư tài sản người mua tại chỗ
    if (window.CITY_STATE.CURRENT_BALANCE < priceAmount) {
        return { success: false, message: "Ví điện tử AD của bạn không đủ số dư để mua mặt hàng này!" };
    }

    try {
        // 1. Luân chuyển khoản: Khấu trừ tiền người mua đè trực tiếp lên bảng ngân hàng mây [🗎1]
        const targetBuyerBal = window.CITY_STATE.CURRENT_BALANCE - priceAmount;
        await db.from('city_bank').update({ balance: targetBuyerBal }).eq('username', buyer);

        // 2. Tra cứu bốc số dư cũ và thực hiện cộng tiền cho chủ shop người bán [🗎1]
        const { data: selBank } = await db.from('city_bank').select('balance').eq('username', sellerName).single();
        const targetSellerBal = (selBank ? selBank.balance : 0) + priceAmount;
        await db.from('city_bank').update({ balance: targetSellerBal }).eq('username', sellerName);

        // 3. Tra cứu bốc mảng JSONB nhận xét cũ của sản phẩm để găm nhồi thêm lượt review mới [🗎1]
        const { data: prod } = await db.from('city_services').select('reviews').eq('id', prodId).single();
        let currentReviews = prod ? (prod.reviews || []) : [];
        
        // Nhồi mảng cấu trúc bản ghi nhận xét mới tinh khiết
        currentReviews.push({
            reviewer: buyer,
            comment: comment,
            stars: stars,
            time: new Date().toISOString()
        });

        // Giới hạn trần khóa cứng chặn phình dữ liệu mảng JSONB tối đa 100 nhận xét mới nhất
        if (currentReviews.length > 100) {
            currentReviews = currentReviews.slice(-100);
        }

        // Đẩy đè mảng JSONB siêu sạch đã cập nhật ngược trở lại đám mây
        await db.from('city_services').update({ reviews: currentReviews }).eq('id', prodId);

        window.CITY_STATE.CURRENT_BALANCE = targetBuyerBal;
        return { success: true, newBalance: targetBuyerBal };

    } catch (err) {
        return { success: false, message: "Mạch giao thương Chợ mây gặp sự cố: " + err.message };
    }
};
// =========================================================
// ĐỢT 5: HÀM TẠO TOAST POPUP THÔNG BÁO GIẬT TỪ GÓC MÀN HÌNH LÊN MƯỢT MÀ [🗎1]
// =========================================================
window.showNotificationPopup = function(title, text) {
    const container = document.getElementById("notification-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = "city-card";
    // Thiết lập hệ màu sắc Pop-Art Lục quân phẳng khối gông viền đen dày dặn
    toast.style.cssText = "padding: 12px; background-color: #004040; color: #ffffff; border: 2px solid #000000; box-shadow: 4px 4px 0px #000000; font-size: 12px; min-width: 240px; animation: toastBayLên 0.2s ease-out; margin-bottom: 10px;";
    
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
};

// Nghiệm thu hoàn tất toàn bộ hạ tầng mạch vận hành quy nhất
console.log("Independent City Mạng Lõi: Bộ não rời utils2.js không Module đã chốt nòng vĩnh viễn! 🔓");

