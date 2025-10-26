document.addEventListener('DOMContentLoaded', async () => {
    await db.init();

    const removeDiacritics = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

    let state = {
        orders: [],
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
    const paginationControls = document.getElementById('pagination-controls');

    // Modal elements
    const detailModal = document.getElementById('order-detail-modal');
    const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');
    const closeDetailModalBtnFooter = document.getElementById('close-detail-modal-btn-footer');

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

        const createBtn = (text, page, disabled = false, active = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.className = `px-3 py-1 rounded-md ${
                active ? 'bg-blue-600 text-white' : 'bg-gray-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-300'}`;
            btn.disabled = disabled;
            if (!disabled) {
                btn.onclick = () => {
                    state.currentPage = page;
                    renderSalesHistory(); // Always render sales history
                };
            }
            return btn;
        };

        paginationControls.appendChild(createBtn('«', state.currentPage - 1, state.currentPage === 1));

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - state.currentPage) <= 2) {
                paginationControls.appendChild(createBtn(i, i, false, i === state.currentPage));
            } else if (paginationControls.lastChild.textContent !== '...') {
                 if (i < state.currentPage && i === 2) {
                    paginationControls.appendChild(document.createTextNode('...'));
                } else if (i > state.currentPage && i === totalPages - 1) {
                     paginationControls.appendChild(document.createTextNode('...'));
                }
            }
        }

        paginationControls.appendChild(createBtn('»', state.currentPage + 1, state.currentPage === totalPages));
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

        const start = (state.currentPage - 1) * state.rowsPerPage;
        const end = start + state.rowsPerPage;
        const paginated = filtered.slice(start, end);

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
                        <button class="text-red-600 hover:underline ml-2" onclick="app.deleteOrder('${order.id}')">Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination(filtered.length);
        
        // Add sort event listener after rendering
        const sortByDateBtn = document.getElementById('sort-by-date');
        if (sortByDateBtn) {
            sortByDateBtn.onclick = () => {
                state.sortDirection = state.sortDirection === 'desc' ? 'asc' : 'desc';
                renderSalesHistory();
            };
        }
    };

    // --- MODAL & GLOBAL APP ---
    window.app = {
        editOrder: (orderId) => {
            window.location.href = `index.html?edit=${orderId}`;
        },
        viewOrderDetails: (orderId) => {
            window.location.href = `order-detail.html?id=${orderId}`;
        },
        // THAY ĐỔI: ĐÃ THÊM HÀM XÓA HÓA ĐƠN
        deleteOrder: async (orderId) => {
            const orderToDelete = state.orders.find(o => o.id === orderId);
            let confirmMessage = 'Bạn có chắc chắn muốn xóa hóa đơn này?';
            if (orderToDelete) {
                confirmMessage = `Bạn có chắc chắn muốn xóa hóa đơn "${orderToDelete.id}" (Khách: ${orderToDelete.customerName || 'Khách Lẻ'})?\n\nThao tác này không thể hoàn tác!`;
            }
            
            if (confirm(confirmMessage)) {
                try {
                    await db.deleteOrder(orderId); // Xóa khỏi DB
                    state.orders = state.orders.filter(o => o.id !== orderId); // Xóa khỏi state
                    renderSalesHistory(); // Vẽ lại bảng
                    alert('Đã xóa hóa đơn thành công!');
                } catch (error) {
                    console.error("Lỗi khi xóa hóa đơn:", error);
                    alert('Đã xảy ra lỗi khi xóa hóa đơn.');
                }
            }
        }
    };

    // --- INITIALIZATION ---
    const init = async () => {
        state.orders = await db.getAllOrders();

        salesFilters.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                state.salesFilterType = e.target.dataset.filter;
                salesFilters.querySelectorAll('button').forEach(btn => btn.classList.remove('bg-blue-500', 'text-white'));
                e.target.classList.add('bg-blue-500', 'text-white');
                state.currentPage = 1;
                renderSalesHistory();
            }
        });

        searchBar.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.trim();
            state.currentPage = 1;
            renderSalesHistory();
        });

        if(closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', () => detailModal.classList.add('hidden'));
        if(closeDetailModalBtnFooter) closeDetailModalBtnFooter.addEventListener('click', () => detailModal.classList.add('hidden'));

        // --- Logic for deleting history ---
        deleteHistoryBtn.addEventListener('click', () => {
            deleteHistoryModal.classList.remove('hidden');
        });

        cancelDeleteBtn.addEventListener('click', () => {
            deleteHistoryModal.classList.add('hidden');
            deleteConfirmInput.value = '';
            confirmDeleteBtn.disabled = true;
        });

        deleteConfirmInput.addEventListener('input', (e) => {
            confirmDeleteBtn.disabled = e.target.value.toLowerCase() !== 'delete';
        });

        confirmDeleteBtn.addEventListener('click', async () => {
            if (deleteConfirmInput.value.toLowerCase() !== 'delete') return;

            try {
                // Now only deletes orders, but keeps the prompt general
                await db.overwriteStore(db.STORES.orders, []);
                await db.overwriteStore(db.STORES.purchases, []); // Keep this to clear both stores
                state.orders = [];
                renderSalesHistory();
                cancelDeleteBtn.click();
                alert('Đã xóa toàn bộ lịch sử giao dịch thành công!');
            } catch (error) {
                console.error("Error deleting history:", error);
                alert('Đã có lỗi xảy ra khi xóa lịch sử.');
            }
        });

        renderSalesHistory(); // Initial render
    };

    // --- Export/Import Logic (unchanged) ---
    const exportAllBtn = document.getElementById('export-all-btn');
    const importAllBtn = document.getElementById('import-all-btn');
    const importAllInput = document.getElementById('import-all-input');

    const exportAllData = async () => {
        try {
            alert('Đang chuẩn bị dữ liệu để xuất, vui lòng chờ...');
            const products = await db.getAllProducts();
            const orders = await db.getAllOrders();
            const customers = await db.getAllCustomers();
            const purchases = await db.getAllPurchases();
            const suppliers = await db.getAllSuppliers();

            if (products.length === 0 && orders.length === 0 && customers.length === 0 && purchases.length === 0 && suppliers.length === 0) {
                alert('Chưa có dữ liệu để xuất.');
                return;
            }

            const wb = XLSX.utils.book_new();
            const wsProducts = XLSX.utils.json_to_sheet(products);
            const wsOrders = XLSX.utils.json_to_sheet(orders);
            const wsCustomers = XLSX.utils.json_to_sheet(customers);
            const wsPurchases = XLSX.utils.json_to_sheet(purchases);
            const wsSuppliers = XLSX.utils.json_to_sheet(suppliers);

            XLSX.utils.book_append_sheet(wb, wsProducts, "Products");
            XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");
            XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");
            XLSX.utils.book_append_sheet(wb, wsPurchases, "Purchases");
            XLSX.utils.book_append_sheet(wb, wsSuppliers, "Suppliers");

            const today = new Date().toISOString().split('T')[0];
            const filename = `SalesDashboard_Backup_${today}.xlsx`;
            XLSX.writeFile(wb, filename);
            alert('Đã xuất toàn bộ dữ liệu thành công!');
        } catch(error) {
            console.error("Lỗi khi xuất dữ liệu:", error);
            alert("Đã xảy ra lỗi trong quá trình xuất dữ liệu.");
        }
    };

    const importAllData = (file) => {
        if (!confirm('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ dữ liệu hiện tại và thay thế bằng dữ liệu từ tệp Excel. Bạn có chắc chắn muốn tiếp tục?')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                const productsSheet = workbook.Sheets["Products"];
                const ordersSheet = workbook.Sheets["Orders"];
                const customersSheet = workbook.Sheets["Customers"];
                const purchasesSheet = workbook.Sheets["Purchases"];
                const suppliersSheet = workbook.Sheets["Suppliers"];

                if (!productsSheet || !ordersSheet || !customersSheet || !purchasesSheet || !suppliersSheet) {
                    alert("File không hợp lệ. Hãy đảm bảo có đủ 5 sheet: Products, Orders, Customers, Purchases, và Suppliers.");
                    return;
                }

                const products = XLSX.utils.sheet_to_json(productsSheet);
                const orders = XLSX.utils.sheet_to_json(ordersSheet);
                const customers = XLSX.utils.sheet_to_json(customersSheet);
                const purchases = XLSX.utils.sheet_to_json(purchasesSheet);
                const suppliers = XLSX.utils.sheet_to_json(suppliersSheet);

                await db.overwriteStore(db.STORES.products, products);
                await db.overwriteStore(db.STORES.orders, orders);
                await db.overwriteStore(D.STORES.customers, customers);
                await db.overwriteStore(db.STORES.purchases, purchases);
                await db.overwriteStore(db.STORES.suppliers, suppliers);
                
                localStorage.removeItem('salesDashboardUiState');
                localStorage.removeItem('purchaseDashboardUiState');

                alert('Đã nhập dữ liệu thành công! Trang sẽ được tải lại.');
                location.reload();

            } catch(error) {
                console.error("Lỗi khi nhập dữ liệu:", error);
                alert("Đã xảy ra lỗi trong quá trình nhập dữ liệu. Vui lòng kiểm tra lại định dạng file.");
            }
        };
        reader.readAsArrayBuffer(file);
        importAllInput.value = '';
    };

    if (exportAllBtn) exportAllBtn.addEventListener('click', exportAllData);
    if (importAllBtn && importAllInput) {
        importAllBtn.addEventListener('click', () => importAllInput.click());
        importAllInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) importAllData(file);
        });
    }

    init();
});