
const TABLES = ['products', 'orders', 'customers', 'purchases', 'suppliers'];

// Hàm chính: Tạo bản sao lưu mới (Snapshot)
async function syncData(isSilent = false) {
    if (!window.supabaseClient) {
        if (!isSilent) alert('Vui lòng cấu hình Supabase URL và Key trong file supabase-client.js');
        return;
    }

    const syncBtn = document.getElementById('sync-btn');
    let originalText = '';
    if (syncBtn) {
        originalText = syncBtn.innerHTML;
        syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Đang sao lưu...';
        syncBtn.disabled = true;
    }

    try {
        console.log('Bắt đầu tạo bản sao lưu...');

        // 1. Thu thập toàn bộ dữ liệu từ IndexedDB
        const backupData = {
            products: await db.getAllProducts(),
            orders: await db.getAllOrders(),
            customers: await db.getAllCustomers(),
            purchases: await db.getAllPurchases(),
            suppliers: await db.getAllSuppliers(),
            timestamp: Date.now()
        };

        // 2. Gửi lên Supabase (bảng backups)
        const { error: insertError } = await window.supabaseClient
            .from('backups')
            .insert([{ data: backupData }]);

        if (insertError) throw insertError;

        console.log('Đã tạo bản sao lưu mới.');

        // 3. Giới hạn 5 bản backup (Xóa các bản cũ)
        await cleanupOldBackups();

        if (!isSilent) alert('Sao lưu thành công!');

        // Lưu thời gian
        localStorage.setItem('lastSyncTime', Date.now());

    } catch (err) {
        console.error('Lỗi sao lưu:', err);
        if (!isSilent) alert('Có lỗi xảy ra khi sao lưu: ' + err.message);
    } finally {
        if (syncBtn) {
            syncBtn.innerHTML = originalText;
            syncBtn.disabled = false;
        }
    }
}

// Hàm xóa các bản backup cũ, chỉ giữ lại 5 bản mới nhất
async function cleanupOldBackups() {
    try {
        // Lấy danh sách ID và thời gian, sắp xếp cũ nhất trước
        const { data: backups, error } = await window.supabaseClient
            .from('backups')
            .select('id')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (backups.length > 5) {
            const toDeleteCount = backups.length - 5;
            const toDeleteIds = backups.slice(0, toDeleteCount).map(b => b.id);

            const { error: deleteError } = await window.supabaseClient
                .from('backups')
                .delete()
                .in('id', toDeleteIds);

            if (deleteError) throw deleteError;
            console.log(`Đã xóa ${toDeleteCount} bản sao lưu cũ.`);
        }
    } catch (err) {
        console.error('Lỗi khi dọn dẹp backup cũ:', err);
    }
}

// Hàm lấy danh sách các bản backup để hiển thị
async function getBackupList() {
    const { data, error } = await window.supabaseClient
        .from('backups')
        .select('id, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        alert('Lỗi lấy danh sách backup: ' + error.message);
        return [];
    }
    return data;
}

// Hàm khôi phục dữ liệu từ một bản backup cụ thể
async function restoreBackup(backupId) {
    if (!confirm('CẢNH BÁO: Dữ liệu hiện tại trên máy này sẽ bị ghi đè hoàn toàn bằng bản backup đã chọn. Bạn có chắc chắn không?')) {
        return;
    }

    try {
        // 1. Lấy dữ liệu backup từ Supabase
        const { data, error } = await window.supabaseClient
            .from('backups')
            .select('data')
            .eq('id', backupId)
            .single();

        if (error) throw error;
        if (!data || !data.data) throw new Error('Bản backup không có dữ liệu.');

        const backupContent = data.data;

        // 2. Ghi đè vào IndexedDB
        console.log('Đang khôi phục dữ liệu...');

        if (backupContent.products) await db.overwriteStore(db.STORES.products, backupContent.products);
        if (backupContent.orders) await db.overwriteStore(db.STORES.orders, backupContent.orders);
        if (backupContent.customers) await db.overwriteStore(db.STORES.customers, backupContent.customers);
        if (backupContent.purchases) await db.overwriteStore(db.STORES.purchases, backupContent.purchases);
        if (backupContent.suppliers) await db.overwriteStore(db.STORES.suppliers, backupContent.suppliers);

        alert('Khôi phục thành công! Trang sẽ tải lại.');
        location.reload();

    } catch (err) {
        console.error('Lỗi khôi phục:', err);
        alert('Lỗi khi khôi phục dữ liệu: ' + err.message);
    }
}

// --- UI LOGIC CHO RESTORE ---

async function showRestoreModal() {
    const modal = document.getElementById('restore-modal');
    const listContainer = document.getElementById('backup-list');

    // Reset danh sách
    listContainer.innerHTML = '<p class="text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin"></i> Đang tải danh sách...</p>';
    modal.classList.remove('hidden');

    const backups = await getBackupList();

    if (backups.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Chưa có bản sao lưu nào.</p>';
        return;
    }

    listContainer.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'divide-y divide-gray-200';

    backups.forEach((backup, index) => {
        const date = new Date(backup.created_at);
        const dateStr = date.toLocaleDateString('vi-VN');
        const timeStr = date.toLocaleTimeString('vi-VN');

        const li = document.createElement('li');
        li.className = 'py-3 flex justify-between items-center hover:bg-gray-50 px-2 rounded';
        li.innerHTML = `
            <div>
                <p class="font-medium text-gray-900">Phiên bản ${index + 1} ${index === 0 ? '(Mới nhất)' : ''}</p>
                <p class="text-sm text-gray-500">${timeStr} - ${dateStr}</p>
            </div>
            <button class="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-sm font-medium transition-colors" 
                onclick="restoreBackup('${backup.id}')">
                Khôi phục
            </button>
        `;
        ul.appendChild(li);
    });

    listContainer.appendChild(ul);
}

// Hàm kiểm tra và chạy đồng bộ định kỳ (Giữ nguyên)
function checkAndRunPeriodicSync() {
    const lastSyncTime = localStorage.getItem('lastSyncTime');
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

    if (!lastSyncTime || (Date.now() - parseInt(lastSyncTime) > THREE_DAYS_MS)) {
        console.log('Đã quá 3 ngày chưa đồng bộ. Đang tự động đồng bộ...');

        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-bounce';
        toast.innerHTML = '<i class="fas fa-sync fa-spin mr-2"></i> Đang sao lưu định kỳ...';
        document.body.appendChild(toast);

        syncData(true);
    }
}

// Gắn sự kiện
document.addEventListener('DOMContentLoaded', () => {
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', () => syncData(false));
    }

    const restoreBtn = document.getElementById('restore-btn');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', showRestoreModal);
    }

    const closeRestoreBtn = document.getElementById('close-restore-modal');
    if (closeRestoreBtn) {
        closeRestoreBtn.addEventListener('click', () => {
            document.getElementById('restore-modal').classList.add('hidden');
        });
    }

    setTimeout(checkAndRunPeriodicSync, 5000);
});
