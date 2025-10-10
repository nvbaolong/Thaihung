document.addEventListener('DOMContentLoaded', async () => {
    await db.init();

    const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

    let state = {
        orders: [],
        purchases: [],
        activeView: 'sales', // 'sales' hoặc 'purchases'
        searchQuery: '',
        salesFilterType: 'all',
        currentPage: 1,
        rowsPerPage: 30,
        sortDirection: 'desc'
    };

    // --- DOM ELEMENTS ---
    const tableHead = document.getElementById('history-table-head');
    const tableBody = document.getElementById('history-table-body');
    const searchBar = document.getElementById('history-search-bar');
    const salesFilters = document.getElementById('sales-filters');
    const viewTabs = document.getElementById('view-tabs');
    const paginationControls = document.getElementById('pagination-controls');
    
    // Modal elements
    const detailModal = document.getElementById('order-detail-modal');
    const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');
    const closeDetailModalBtnFooter = document.getElementById('close-detail-modal-btn-footer');
    const detailModalContent = document.getElementById('detail-modal-content');
    const detailModalTitle = document.getElementById('detail-modal-title');
    const printInvoiceContainer = document.getElementById('print-invoice');
    
    // Delete History Modal elements
    const deleteHistoryBtn = document.getElementById('delete-history-btn');
    const deleteHistoryModal = document.getElementById('delete-history-modal');
    const deleteConfirmInput = document.getElementById('delete-confirm-input');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');


    // --- FORMATTING ---
    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
    const formatDateTime = (isoString) => new Date(isoString).toLocaleString('vi-VN');

    // --- RENDER PAGINATION ---
    const renderPagination = (totalItems) => {
        paginationControls.innerHTML = '';
        const totalPages = Math.ceil(totalItems / state.rowsPerPage);
        if (totalPages <= 1) return;

        const createButton = (content, pageNumber, isDisabled = false, isCurrent = false) => {
            const button = document.createElement('button');
            button.innerHTML = content;
            button.className = `px-3 py-1 rounded-md ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200'} ${isCurrent ? 'bg-blue-500 text-white' : ''}`;
            if (pageNumber && !isDisabled) {
                button.onclick = () => {
                    state.currentPage = pageNumber;
                    if (state.activeView === 'sales') renderSalesHistory();
                    else renderPurchaseHistory();
                };
            }
            return button;
        };

        paginationControls.appendChild(createButton('&laquo;', state.currentPage - 1, state.currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            paginationControls.appendChild(createButton(i, i, false, i === state.currentPage));
        }
        paginationControls.appendChild(createButton('&raquo;', state.currentPage + 1, state.currentPage === totalPages));
    };

    // --- RENDER SALES HISTORY ---
    const renderSalesHistory = () => {
        tableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3">ID Đơn Hàng</th>
                <th class="px-6 py-3">Khách Hàng</th>
                <th id="sort-by-date" class="px-6 py-3 cursor-pointer hover:bg-gray-100">Ngày Tạo <i id="sort-icon" class="fas fa-sort-down ml-1"></i></th>
                <th class="px-6 py-3 text-right">Tổng Tiền</th>
                <th class="px-6 py-3 text-right">Đã Trả</th>
                <th class="px-6 py-3 text-right">Công Nợ</th>
                <th class="px-6 py-3">Thao Tác</th>
            </tr>
        `;
        
        let filtered = state.orders;
        if (state.salesFilterType !== 'all') {
            filtered = state.orders.filter(order => state.salesFilterType === 'wholesale' ? (order.priceType === 'wholesale' || order.priceType === 'payment') : order.priceType === 'retail');
        }
        if (state.searchQuery) {
            const query = removeDiacritics(state.searchQuery.toLowerCase());
            filtered = filtered.filter(order => order.id.toLowerCase().includes(query) || (order.customerName && removeDiacritics(order.customerName.toLowerCase()).includes(query)));
        }
        
        filtered.sort((a, b) => state.sortDirection === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
        
        const paginated = filtered.slice((state.currentPage - 1) * state.rowsPerPage, state.currentPage * state.rowsPerPage);
        
        tableBody.innerHTML = paginated.map(order => {
            const isPayment = order.priceType === 'payment';
            const isWholesale = order.priceType === 'wholesale';
            return `
                <tr class="bg-white border-b hover:bg-gray-50">
                    <td class="px-6 py-4 font-medium">${order.id}</td>
                    <td class="px-6 py-4">${order.customerName || 'Khách Lẻ'}</td>
                    <td class="px-6 py-4">${formatDateTime(order.date)}</td>
                    <td class="px-6 py-4 font-semibold text-right ${isPayment ? 'text-green-600' : ''}">${isPayment ? '+' + formatCurrency(order.paidAmount) : formatCurrency(order.total)}</td>
                    <td class="px-6 py-4 text-right">${isWholesale || isPayment ? formatCurrency(order.paidAmount) : 'N/A'}</td>
                    <td class="px-6 py-4 font-bold text-right ${isWholesale ? 'text-red-500' : 'text-gray-400'}">${isWholesale ? formatCurrency(order.debtAmount) : 'N/A'}</td>
                    <td class="px-6 py-4 text-left whitespace-nowrap">
                        <button class="text-blue-500 hover:underline" onclick="app.viewOrderDetails('${order.id}')" ${isPayment ? 'disabled' : ''}>${isPayment ? 'Thanh toán' : 'Xem'}</button>
                        <button class="text-green-600 hover:underline ml-2" onclick="app.editOrder('${order.id}')" ${isPayment ? 'disabled style="display:none;"' : ''}>Sửa</button>
                    </td>
                </tr>
            `;
        }).join('');
        
        renderPagination(filtered.length);
    };

    // --- RENDER PURCHASE HISTORY ---
    const renderPurchaseHistory = () => {
        tableHead.innerHTML = `
            <tr>
                <th class="px-6 py-3">ID Phiếu Nhập</th>
                <th class="px-6 py-3">Nhà Cung Cấp</th>
                <th id="sort-by-date" class="px-6 py-3 cursor-pointer hover:bg-gray-100">Ngày Nhập <i id="sort-icon" class="fas fa-sort-down ml-1"></i></th>
                <th class="px-6 py-3 text-right">Tổng Tiền</th>
                <th class="px-6 py-3">Thao Tác</th>
            </tr>
        `;

        let filtered = state.purchases;
        if (state.searchQuery) {
            const query = removeDiacritics(state.searchQuery.toLowerCase());
            filtered = filtered.filter(p => p.id.toLowerCase().includes(query) || (p.supplierName && removeDiacritics(p.supplierName.toLowerCase()).includes(query)));
        }
        
        filtered.sort((a, b) => state.sortDirection === 'asc' ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));

        const paginated = filtered.slice((state.currentPage - 1) * state.rowsPerPage, state.currentPage * state.rowsPerPage);

        tableBody.innerHTML = paginated.map(p => `
            <tr class="bg-white border-b hover:bg-gray-50">
                <td class="px-6 py-4 font-medium">${p.id}</td>
                <td class="px-6 py-4">${p.supplierName || 'N/A'}</td>
                <td class="px-6 py-4">${formatDateTime(p.date)}</td>
                <td class="px-6 py-4 font-semibold text-right">${formatCurrency(p.total)}</td>
                <td class="px-6 py-4 text-left whitespace-nowrap">
                    <button class="text-blue-500 hover:underline" onclick="app.viewPurchaseDetails('${p.id}')">Xem</button>
                    <button class="text-green-600 hover:underline ml-2" onclick="app.editPurchase('${p.id}')">Sửa</button>
                </td>
            </tr>
        `).join('');

        renderPagination(filtered.length);
    };

    // --- MAIN RENDER FUNCTION ---
    const renderActiveView = () => {
        state.currentPage = 1; // Reset page on view change
        if (state.activeView === 'sales') {
            salesFilters.style.display = 'flex';
            searchBar.placeholder = "Tìm theo ID, tên khách hàng...";
            renderSalesHistory();
        } else {
            salesFilters.style.display = 'none';
            searchBar.placeholder = "Tìm theo ID, tên nhà cung cấp...";
            renderPurchaseHistory();
        }
        
        const sortByDateBtn = document.getElementById('sort-by-date');
        if (sortByDateBtn) {
            sortByDateBtn.onclick = () => {
                state.sortDirection = state.sortDirection === 'desc' ? 'asc' : 'desc';
                if (state.activeView === 'sales') renderSalesHistory();
                else renderPurchaseHistory();
            };
        }
    };

    // --- MODAL & GLOBAL APP ---
    window.app = {
        editOrder: (orderId) => { 
            window.location.href = `index.html?edit=${orderId}`; 
        },
        editPurchase: (purchaseId) => {
            window.location.href = `purchase.html?edit=${purchaseId}`;
        },
        viewOrderDetails: (orderId) => {
            const order = state.orders.find(o => o.id === orderId);
            if (!order) return;
            detailModalTitle.textContent = `Chi Tiết Đơn Hàng: ${order.id}`;
            const isWholesale = order.priceType === 'wholesale';
            const itemsHtml = order.items.map((item, index) => `<tr class="border-b"><td class="p-2 text-center">${index + 1}</td><td class="p-2">${item.name}</td><td class="p-2 text-center">${item.quantity}</td><td class="p-2 text-right">${formatCurrency(item.price)}</td><td class="p-2 text-right">${formatCurrency(item.price * item.quantity)}</td></tr>`).join('');
            detailModalContent.innerHTML = `<div class="grid grid-cols-2 gap-4 mb-4"><div><strong>Khách hàng:</strong> ${order.customerName || 'Khách Lẻ'}</div><div><strong>Ngày tạo:</strong> ${formatDateTime(order.date)}</div><div><strong>Loại giá:</strong> ${isWholesale ? 'Giá Sỉ' : 'Giá Lẻ'}</div></div><table class="w-full"><thead class="uppercase bg-gray-100"><tr><th class="p-2 text-center">STT</th><th class="p-2">Tên hàng</th><th class="p-2 text-center">SL</th><th class="p-2 text-right">Đơn giá</th><th class="p-2 text-right">Thành tiền</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="mt-4 pt-4 border-t text-right space-y-2 text-lg"><div class="flex justify-end"><span class="font-semibold w-32">Tổng cộng:</span><span class="font-bold w-40">${formatCurrency(order.total)}</span></div>${isWholesale ? `<div class="flex justify-end"><span class="font-semibold w-32">Đã trả:</span><span class="w-40">${formatCurrency(order.paidAmount)}</span></div><div class="flex justify-end text-red-600"><span class="font-semibold w-32">Còn nợ:</span><span class="font-bold w-40">${formatCurrency(order.debtAmount)}</span></div>` : ''}</div>`;
            const printBtn = document.getElementById('print-order-btn');
            const newPrintBtn = printBtn.cloneNode(true);
            printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
            newPrintBtn.addEventListener('click', () => { window.print(); });
            detailModal.classList.remove('hidden');
        },
        viewPurchaseDetails: (purchaseId) => {
            const purchase = state.purchases.find(p => p.id === purchaseId);
            if (!purchase) return;
            detailModalTitle.textContent = `Chi Tiết Phiếu Nhập: ${purchase.id}`;
            const itemsHtml = purchase.items.map((item, index) => `<tr class="border-b"><td class="p-2">${index + 1}</td><td class="p-2">${item.name}</td><td class="p-2 text-center">${item.quantity}</td><td class="p-2 text-right">${formatCurrency(item.importPrice)}</td><td class="p-2 text-right">${formatCurrency(item.importPrice * item.quantity)}</td></tr>`).join('');
            detailModalContent.innerHTML = `<p><strong>Nhà cung cấp:</strong> ${purchase.supplierName}</p><p><strong>Ngày nhập:</strong> ${formatDateTime(purchase.date)}</p><table class="w-full mt-4"><thead class="uppercase bg-gray-100"><tr><th class="p-2">STT</th><th class="p-2">Tên hàng</th><th class="p-2 text-center">SL</th><th class="p-2 text-right">Giá nhập</th><th class="p-2 text-right">Thành tiền</th></tr></thead><tbody>${itemsHtml}</tbody></table><div class="mt-4 text-right font-bold">Tổng cộng: ${formatCurrency(purchase.total)}</div>`;
            const printBtn = document.getElementById('print-order-btn');
            const newPrintBtn = printBtn.cloneNode(true);
            printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
            newPrintBtn.addEventListener('click', () => { window.print(); });
            detailModal.classList.remove('hidden');
        },
    };
    
    // --- INITIALIZATION ---
    const init = async () => {
        state.orders = await db.getAllOrders();
        state.purchases = await db.getAllPurchases();
        
        viewTabs.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                state.activeView = e.target.dataset.view;
                viewTabs.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('border-blue-500', 'text-blue-600');
                    btn.classList.add('border-transparent', 'text-gray-500');
                });
                e.target.classList.add('border-blue-500', 'text-blue-600');
                e.target.classList.remove('border-transparent', 'text-gray-500');
                renderActiveView();
            }
        });

        salesFilters.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                state.salesFilterType = e.target.dataset.filter;
                salesFilters.querySelectorAll('button').forEach(btn => btn.classList.remove('bg-blue-500', 'text-white'));
                e.target.classList.add('bg-blue-500', 'text-white');
                renderSalesHistory();
            }
        });
        
        searchBar.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            state.currentPage = 1;
            if (state.activeView === 'sales') renderSalesHistory();
            else renderPurchaseHistory();
        });

        closeDetailModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
        closeDetailModalBtnFooter.addEventListener('click', () => detailModal.classList.add('hidden'));

        // --- Logic cho việc xóa lịch sử ---
        deleteHistoryBtn.addEventListener('click', () => {
            deleteHistoryModal.classList.remove('hidden');
        });

        cancelDeleteBtn.addEventListener('click', () => {
            deleteHistoryModal.classList.add('hidden');
            deleteConfirmInput.value = '';
            confirmDeleteBtn.disabled = true;
        });

        deleteConfirmInput.addEventListener('input', (e) => {
            if (e.target.value.toLowerCase() === 'delete') {
                confirmDeleteBtn.disabled = false;
            } else {
                confirmDeleteBtn.disabled = true;
            }
        });

        confirmDeleteBtn.addEventListener('click', async () => {
            if (deleteConfirmInput.value.toLowerCase() !== 'delete') return;

            try {
                await db.overwriteStore(db.STORES.orders, []);
                await db.overwriteStore(db.STORES.purchases, []);
                state.orders = [];
                state.purchases = [];
                renderActiveView();
                cancelDeleteBtn.click();
                alert('Đã xóa toàn bộ lịch sử giao dịch thành công!');
            } catch (error) {
                console.error("Lỗi khi xóa lịch sử:", error);
                alert('Đã có lỗi xảy ra khi xóa lịch sử.');
            }
        });

        renderActiveView(); // Render lần đầu
    };

    init();
});