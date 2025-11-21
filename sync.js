
const TABLES = ['products', 'orders', 'customers', 'purchases', 'suppliers'];

async function syncData() {
    if (!window.supabaseClient) {
        alert('Vui lòng cấu hình Supabase URL và Key trong file supabase-client.js');
        return;
    }

    const syncBtn = document.getElementById('sync-btn');
    const originalText = syncBtn.innerHTML;
    syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang đồng bộ...';
    syncBtn.disabled = true;

    try {
        console.log('Bắt đầu đồng bộ...');

        for (const table of TABLES) {
            // 1. PULL: Lấy dữ liệu từ Supabase về
            const { data: remoteData, error: pullError } = await window.supabaseClient
                .from(table)
                .select('*');

            if (pullError) {
                console.error(`Lỗi khi lấy dữ liệu bảng ${table}:`, pullError);
                continue;
            }

            if (remoteData && remoteData.length > 0) {
                console.log(`Đã tải ${remoteData.length} dòng từ bảng ${table}`);
                // Cập nhật vào IndexedDB (ghi đè hoặc thêm mới)
                // Lưu ý: db.js cần có hàm hỗ trợ update hàng loạt hoặc loop
                // Ở đây ta loop update từng item
                for (const item of remoteData) {
                    // Cần mapping tên hàm update tương ứng
                    // products -> updateProduct, orders -> updateOrder, etc.
                    // Tuy nhiên db.js dùng storeName giống tên bảng, ta có thể dùng db.add hoặc db.put trực tiếp nếu expose
                    // Hiện tại db.js expose các hàm cụ thể. Ta sẽ dùng switch case hoặc dynamic call

                    await updateLocalItem(table, item);
                }
            }

            // 2. PUSH: Đẩy dữ liệu từ Local lên Supabase
            // Lấy toàn bộ dữ liệu local
            let localData = [];
            switch (table) {
                case 'products': localData = await db.getAllProducts(); break;
                case 'orders': localData = await db.getAllOrders(); break;
                case 'customers': localData = await db.getAllCustomers(); break;
                case 'purchases': localData = await db.getAllPurchases(); break;
                case 'suppliers': localData = await db.getAllSuppliers(); break;
            }

            if (localData.length > 0) {
                const { error: pushError } = await window.supabaseClient
                    .from(table)
                    .upsert(localData);

                if (pushError) {
                    console.error(`Lỗi khi đẩy dữ liệu bảng ${table}:`, pushError);
                } else {
                    console.log(`Đã đẩy ${localData.length} dòng lên bảng ${table}`);
                }
            }
        }

        alert('Đồng bộ thành công!');
        // Reload lại dữ liệu hiển thị nếu cần
        location.reload();

    } catch (err) {
        console.error('Lỗi đồng bộ:', err);
        alert('Có lỗi xảy ra khi đồng bộ. Xem console để biết chi tiết.');
    } finally {
        syncBtn.innerHTML = originalText;
        syncBtn.disabled = false;
    }
}

async function updateLocalItem(table, item) {
    // Helper để gọi hàm update tương ứng trong db.js
    // db.js expose: updateProduct, updateOrder, updateCustomer, updatePurchase, updateSupplier
    // Tên bảng: products, orders, customers, purchases, suppliers
    // => bỏ 's' cuối và viết hoa chữ cái đầu -> updateProduct

    // Tuy nhiên db.js dùng số nhiều cho store name nhưng hàm lại dùng số ít.
    // products -> updateProduct
    // orders -> updateOrder
    // customers -> updateCustomer
    // purchases -> updatePurchase
    // suppliers -> updateSupplier

    let funcName = '';
    switch (table) {
        case 'products': funcName = 'updateProduct'; break;
        case 'orders': funcName = 'updateOrder'; break;
        case 'customers': funcName = 'updateCustomer'; break;
        case 'purchases': funcName = 'updatePurchase'; break;
        case 'suppliers': funcName = 'updateSupplier'; break;
    }

    if (db[funcName]) {
        await db[funcName](item);
    }
}

// Gắn sự kiện click cho nút sync
document.addEventListener('DOMContentLoaded', () => {
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', syncData);
    }
});
