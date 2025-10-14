document.addEventListener('DOMContentLoaded', async () => {
    // Khởi tạo kết nối DB
    await db.init();

    const orderContentEl = document.getElementById('order-content');
    const printBtn = document.getElementById('print-btn');
    const backBtnHeader = document.getElementById('back-btn-header');
    const closeBtnFooter = document.getElementById('close-btn-footer');

    // --- LOGIC NÚT QUAY LẠI ---
    const goBack = (event) => {
        event.preventDefault(); // Ngăn hành vi mặc định của thẻ <a>
        history.back();
    };

    backBtnHeader.addEventListener('click', goBack);
    closeBtnFooter.addEventListener('click', goBack);
    // --- KẾT THÚC LOGIC NÚT QUAY LẠI ---


    // Hàm định dạng tiền tệ
    const formatCurrency = (value) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numValue);
    };

    // Lấy ID đơn hàng từ tham số URL
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        orderContentEl.innerHTML = '<p class="text-red-500 text-center">Không tìm thấy ID đơn hàng.</p>';
        return;
    }

    // Tìm đơn hàng trong cơ sở dữ liệu
    const allOrders = await db.getAllOrders();
    const order = allOrders.find(o => o.id === orderId);

    if (!order) {
        orderContentEl.innerHTML = `<p class="text-red-500 text-center">Không tìm thấy đơn hàng với ID: ${orderId}</p>`;
        return;
    }

    // --- Render chi tiết đơn hàng ra HTML ---
    const renderOrderDetails = (order) => {
        const isWholesale = order.priceType === 'wholesale';
        let itemsHtml = order.items.map((item, index) => `
            <tr class="border-b">
                <td class="p-2 text-center">${index + 1}</td>
                <td class="p-2">${item.name}</td>
                <td class="p-2 text-center">${item.quantity}</td>
                <td class="p-2 text-right">${formatCurrency(item.price)}</td>
                <td class="p-2 text-right font-semibold">${formatCurrency(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        const detailsHtml = `
            <div class="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                    <h2 class="text-xl font-bold text-gray-800">Chi Tiết Đơn Hàng</h2>
                    <p class="text-gray-500">${order.id}</p>
                </div>
                <div class="text-right text-base">
                    <p><strong>Ngày tạo:</strong> ${new Date(order.date).toLocaleString('vi-VN')}</p>
                    <p><strong>Khách hàng:</strong> ${order.customerName || 'Khách Lẻ'}</p>
                </div>
            </div>

            <div class="text-lg">
                <table class="w-full mb-6">
                    <thead class="uppercase bg-gray-100 text-sm">
                        <tr>
                            <th class="p-2 text-center w-[5%]">STT</th>
                            <th class="p-2 text-left w-[45%]">Tên hàng</th>
                            <th class="p-2 text-center w-[10%]">SL</th>
                            <th class="p-2 text-right w-[20%]">Đơn giá</th>
                            <th class="p-2 text-right w-[20%]">Thành tiền</th>
                        </tr>
                    </thead>
                    <tbody class="text-lg">
                        ${itemsHtml}
                    </tbody>
                </table>

                <div class="flex justify-end">
                    <div class="w-full max-w-sm space-y-3 text-xl">
                        <div class="flex justify-between">
                            <span class="font-semibold text-gray-600">Tổng cộng:</span>
                            <span class="font-bold text-blue-600">${formatCurrency(order.total)}</span>
                        </div>
                        ${isWholesale ? `
                        <div class="flex justify-between">
                            <span class="font-semibold text-gray-600">Đã trả:</span>
                            <span>${formatCurrency(order.paidAmount)}</span>
                        </div>
                        <div class="flex justify-between text-red-600">
                            <span class="font-bold">Còn nợ:</span>
                            <span class="font-bold">${formatCurrency(order.debtAmount)}</span>
                        </div>` : ''}
                    </div>
                </div>
            </div>
        `;
        orderContentEl.innerHTML = detailsHtml;
    };

    renderOrderDetails(order);

    // Thêm sự kiện cho nút In
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