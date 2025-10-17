document.addEventListener('DOMContentLoaded', async () => {
    await db.init();

    const purchaseContentEl = document.getElementById('purchase-content');
    const printBtn = document.getElementById('print-btn');
    const backBtnHeader = document.getElementById('back-btn-header');
    const closeBtnFooter = document.getElementById('close-btn-footer');
    const cloneBtn = document.getElementById('clone-btn');

    // --- LOGIC NÚT QUAY LẠI ---
    const goBack = (event) => {
        event.preventDefault(); // Ngăn hành vi mặc định của thẻ <a>
        history.back();
    };

    backBtnHeader.addEventListener('click', goBack);
    // Nút "Đóng" bây giờ là một thẻ <a> trỏ trực tiếp đến purchase.html, không cần JS.

    const formatCurrency = (value) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numValue);
    };

    const urlParams = new URLSearchParams(window.location.search);
    const purchaseId = urlParams.get('id');

    if (!purchaseId) {
        purchaseContentEl.innerHTML = '<p class="text-red-500 text-center">Không tìm thấy ID phiếu nhập.</p>';
        return;
    }

    // --- LOGIC NÚT SAO CHÉP ---
    if (cloneBtn) {
        cloneBtn.addEventListener('click', () => {
            if(purchaseId){
                window.location.href = `purchase.html?clone=${purchaseId}`;
            }
        });
    }

    const allPurchases = await db.getAllPurchases();
    const purchase = allPurchases.find(p => p.id === purchaseId);

    if (!purchase) {
        purchaseContentEl.innerHTML = `<p class="text-red-500 text-center">Không tìm thấy phiếu nhập với ID: ${purchaseId}</p>`;
        return;
    }

    // --- Render chi tiết phiếu nhập ra HTML ---
    const renderPurchaseDetails = (purchase) => {
        let itemsHtml = purchase.items.map((item, index) => `
            <tr class="border-b">
                <td class="p-2 text-center">${index + 1}</td>
                <td class="p-2">${item.name}</td>
                <td class="p-2 text-center">${item.quantity}</td>
                <td class="p-2 text-right">${formatCurrency(item.importPrice)}</td>
                <td class="p-2 text-right font-semibold">${formatCurrency(item.importPrice * item.quantity)}</td>
            </tr>
        `).join('');

        const detailsHtml = `
            <div class="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                    <h2 class="text-3xl font-bold text-gray-800">Chi Tiết Phiếu Nhập</h2>
                    <p class="text-gray-500">${purchase.id}</p>
                </div>
                <div class="text-right">
                    <p><strong>Ngày nhập:</strong> ${new Date(purchase.date).toLocaleString('vi-VN')}</p>
                    <p><strong>Nhà cung cấp:</strong> ${purchase.supplierName || 'N/A'}</p>
                </div>
            </div>

            <table class="w-full mb-6">
                <thead class="uppercase bg-gray-100 text-sm">
                    <tr>
                        <th class="p-2 text-center w-12">STT</th>
                        <th class="p-2 text-left">Tên hàng</th>
                        <th class="p-2 text-center w-20">SL</th>
                        <th class="p-2 text-right w-32">Giá nhập</th>
                        <th class="p-2 text-right w-40">Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div class="flex justify-end">
                 <div class="w-full max-w-sm space-y-3 text-lg">
                    <div class="flex justify-between font-bold">
                        <span class="text-gray-600">Tổng cộng:</span>
                        <span class="text-blue-600">${formatCurrency(purchase.total)}</span>
                    </div>
                </div>
            </div>
        `;
        purchaseContentEl.innerHTML = detailsHtml;
    };

    renderPurchaseDetails(purchase);

    printBtn.addEventListener('click', () => {
        window.print();
    });
});
// --- LOGIC KIỂM TRA VÀ THÔNG BÁO CẬP NHẬT ---
(() => {
    let newWorker;

    function showUpdateBar() {
        let toast = document.getElementById('update-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'update-toast';
            toast.innerHTML = `
                <span>Có phiên bản mới.</span>
                <button id="reload-button" class="ml-4 font-bold underline">Cập nhật ngay</button>
            `;
            document.body.appendChild(toast);

            document.getElementById('reload-button').addEventListener('click', () => {
                newWorker.postMessage({ action: 'skipWaiting' });
            });
        }
        // Thêm class để kích hoạt animation
        toast.classList.add('show');
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.addEventListener('updatefound', () => {
                newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBar();
                    }
                });
            });
        });

        let refreshing;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            window.location.reload();
            refreshing = true;
        });
    }
})();

