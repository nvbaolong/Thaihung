document.addEventListener('DOMContentLoaded', async () => { // Thay đổi 1: Chuyển sang async

    // Helper function to remove Vietnamese diacritics
    const removeDiacritics = (str) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    };

    const defaultProducts = [
        { id: "239", name: "3X5 V", unit: "CÁI", importPrice: 0, wholesalePrice: 90000, retailPrice: 95000 }, { id: "240", name: "3X6 V", unit: "CÁI", importPrice: 0, wholesalePrice: 100000, retailPrice: 105000 }, { id: "849", name: "4X10", unit: "TẤM", importPrice: 0, wholesalePrice: 195000, retailPrice: 200000 }, { id: "241", name: "4X10 n", unit: "CÁI", importPrice: 0, wholesalePrice: 175000, retailPrice: 185000 }, { id: "244", name: "4X12", unit: "TẤM", importPrice: 0, wholesalePrice: 215000, retailPrice: 230000 }, { id: "243", name: "4X12 n", unit: "CÁI", importPrice: 0, wholesalePrice: 205000, retailPrice: 215000 }, { id: "246", name: "4X6", unit: "TẤM", importPrice: 0, wholesalePrice: 110000, retailPrice: 120000 }, { id: "245", name: "4X6 n", unit: "CÁI", importPrice: 0, wholesalePrice: 105000, retailPrice: 110000 }, { id: "248", name: "4X8", unit: "TẤM", importPrice: 0, wholesalePrice: 150000, retailPrice: 160000 }, { id: "247", name: "4X8 n", unit: "CÁI", importPrice: 0, wholesalePrice: 140000, retailPrice: 150000 }, { id: "8905", name: "XỬNG M.PHƯƠNG 56", unit: "CÁI", importPrice: 0, wholesalePrice: 115000, retailPrice: 125000 }, { id: "8906", name: "XỬNG M.PHƯƠNG 60", unit: "CÁI", importPrice: 0, wholesalePrice: 145000, retailPrice: 155000 }, { id: "8907", name: "XỬNG M.PHƯƠNG 64", unit: "CÁI", importPrice: 0, wholesalePrice: 190000, retailPrice: 200000 }, { id: "8908", name: "XỬNG M.PHƯƠNG 70", unit: "CÁI", importPrice: 0, wholesalePrice: 220000, retailPrice: 230000 }, { id: "8910", name: "XỬNG T.TIẾN 20", unit: "CÁI", importPrice: 0, wholesalePrice: 13000, retailPrice: 15000 }, { id: "8911", name: "XỬNG TT 40", unit: "CÁI", importPrice: 0, wholesalePrice: 40000, retailPrice: 45000 }, { id: "8912", name: "XỬNG TT 44", unit: "CÁI", importPrice: 0, wholesalePrice: 36000, retailPrice: 40000 }, { id: "8913", name: "XỬNG TT 46", unit: "CÁI", importPrice: 0, wholesalePrice: 40000, retailPrice: 45000 }, { id: "8914", name: "XỬNG TT 48", unit: "CÁI", importPrice: 0, wholesalePrice: 44000, retailPrice: 50000 }, { id: "8915", name: "XỬNG TT 50", unit: "CÁI", importPrice: 0, wholesalePrice: 52000, retailPrice: 60000 }
    ];

    let state = {
        products: [],
        orders: [],
        customers: [],
        invoiceTabs: [],
        activeInvoiceId: 1,
        nextInvoiceId: 2,
    };

    // --- DOM ELEMENTS (giữ nguyên) ---
    const orderProductSearchInput = document.getElementById('order-product-search');
    const autocompleteResultsContainer = document.getElementById('autocomplete-results');
    const currentOrderItemsContainer = document.getElementById('current-order-items');
    const saveOrderBtn = document.getElementById('save-order-btn');
    const priceToggle = document.getElementById('price-toggle');
    const customerNameSearchInput = document.getElementById('customer-name-search');
    const customerAutocompleteResults = document.getElementById('customer-autocomplete-results');
    const customerNameWrapper = document.getElementById('customer-name-wrapper');
    const summaryTotalEl = document.getElementById('summary-total');
    const amountPaidInput = document.getElementById('amount-paid');
    const debtAmountEl = document.getElementById('debt-amount');
    const payAllBtn = document.getElementById('pay-all-btn');
    const debtRow = document.getElementById('debt-row');
    const orderDetailModal = document.getElementById('order-detail-modal');
    const closeDetailModalBtn = document.getElementById('close-detail-modal-btn');
    const closeDetailModalBtnFooter = document.getElementById('close-detail-modal-btn-footer');
    const detailModalContent = document.getElementById('detail-modal-content');
    const detailModalTitle = document.getElementById('detail-modal-title');
    const customerDebtDisplay = document.getElementById('customer-debt-display');
    const customerCurrentDebt = document.getElementById('customer-current-debt');
    const invoiceTabsContainer = document.getElementById('invoice-tabs-container');
    const newInvoiceBtn = document.getElementById('new-invoice-btn');
    const printInvoiceContainer = document.getElementById('print-invoice');
    const quickCustomerModal = document.getElementById('quick-customer-modal');
    const closeQuickCustomerModalBtn = document.getElementById('close-quick-customer-modal-btn');
    const saveQuickCustomerBtn = document.getElementById('save-quick-customer-btn');
    const quickAddCustomerBtn = document.getElementById('quick-add-customer-btn');
    const quickCustomerNameInput = document.getElementById('quick-customer-name');
    const quickCustomerInitialDebtInput = document.getElementById('quick-customer-initial-debt');
    const quickAddProductBtn = document.getElementById('quick-add-product-btn');
    const quickProductModal = document.getElementById('quick-product-modal');
    const closeQuickProductModalBtn = document.getElementById('close-quick-product-modal-btn');
    const saveQuickProductBtn = document.getElementById('save-quick-product-btn');
    const quickProductNameInput = document.getElementById('quick-product-name');
    const quickProductWholesalePriceInput = document.getElementById('quick-product-wholesale-price');
    const quickProductRetailPriceInput = document.getElementById('quick-product-retail-price');

    // --- DATA HANDLING ---

    // Thay đổi 2: Xóa hàm saveData() cũ. Tạo hàm mới chỉ để lưu trạng thái UI (các tab hóa đơn)
    const saveUiState = () => {
        const uiState = {
            invoiceTabs: state.invoiceTabs,
            nextInvoiceId: state.nextInvoiceId,
            activeInvoiceId: state.activeInvoiceId,
        };
        localStorage.setItem('salesDashboardUiState', JSON.stringify(uiState));
    };

    // Thay đổi 3: Viết lại hoàn toàn hàm loadData để đọc từ IndexedDB
    const loadData = async () => {
        // Lấy dữ liệu chính từ IndexedDB
        state.products = await db.getAllProducts();
        state.orders = await db.getAllOrders();
        state.customers = await db.getAllCustomers();

        // Nếu không có sản phẩm nào, tự động thêm dữ liệu mặc định
        if (state.products.length === 0) {
            console.log('Không có sản phẩm, đang thêm dữ liệu mặc định...');
            for (const product of defaultProducts) {
                await db.addProduct(product);
            }
            state.products = await db.getAllProducts(); // Tải lại danh sách sản phẩm
        }

        // Tải trạng thái UI từ localStorage (vẫn giữ lại cho tiện)
        const uiStateData = localStorage.getItem('salesDashboardUiState');
        if (uiStateData) {
            const parsedUiState = JSON.parse(uiStateData);
            state.invoiceTabs = parsedUiState.invoiceTabs && parsedUiState.invoiceTabs.length > 0 ? parsedUiState.invoiceTabs : [{ id: 1, items: [], customerName: '', total: 0, paidAmount: 0, debtAmount: 0, priceType: 'retail', originalOrderId: null }];
            state.nextInvoiceId = parsedUiState.nextInvoiceId || 2;
            state.activeInvoiceId = parsedUiState.activeInvoiceId || 1;
        } else {
            // Nếu không có gì, khởi tạo tab đầu tiên
            state.invoiceTabs = [{ id: 1, items: [], customerName: '', total: 0, paidAmount: 0, debtAmount: 0, priceType: 'retail', originalOrderId: null }];
            state.activeInvoiceId = 1;
            state.nextInvoiceId = 2;
        }
    };

    // --- Các hàm tính toán và định dạng (giữ nguyên) ---
    const formatCurrency = (value) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return '0 VNĐ';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numValue);
    };

    const formatCurrencyForPrint = (value) => {
        const numValue = Number(value);
        if (isNaN(numValue)) return '0';
        return new Intl.NumberFormat('vi-VN').format(numValue);
    };

    const calculateCustomerDebts = () => {
        const customerDebts = {};
        state.orders.forEach(order => {
            if (order.customerName) {
                if (!customerDebts[order.customerName]) {
                    customerDebts[order.customerName] = 0;
                }
                customerDebts[order.customerName] += order.debtAmount || 0;
            }
        });
        return customerDebts;
    };

    const getActiveInvoice = () => state.invoiceTabs.find(inv => inv.id === state.activeInvoiceId);

    // --- RENDER FUNCTIONS (hầu hết giữ nguyên) ---
    const updatePaymentSummary = () => {
        const activeInvoice = getActiveInvoice();
        if (!activeInvoice) return;

        const total = activeInvoice.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        let paidAmount;

        if (activeInvoice.priceType === 'retail') {
            paidAmount = total;
            amountPaidInput.value = new Intl.NumberFormat('vi-VN').format(total);
        } else {
            paidAmount = parseFloat(amountPaidInput.value.replace(/\./g, '')) || 0;
        }

        const debtAmount = total - paidAmount;

        activeInvoice.total = total;
        activeInvoice.paidAmount = paidAmount;
        activeInvoice.debtAmount = debtAmount < 0 ? 0 : debtAmount;

        summaryTotalEl.textContent = formatCurrency(total);
        debtAmountEl.textContent = formatCurrency(activeInvoice.debtAmount);
        saveUiState(); // Chỉ lưu UI state
    };

    const renderCurrentOrder = () => {
        const activeInvoice = getActiveInvoice();
        if (!activeInvoice) {
            currentOrderItemsContainer.innerHTML = `<p class="text-gray-900 text-center py-4">Không có hóa đơn nào được chọn.</p>`;
            return;
        }

        const hasItems = activeInvoice.items.length > 0;
        saveOrderBtn.disabled = !hasItems;

        if (!hasItems) {
            currentOrderItemsContainer.innerHTML = `<p class="text-gray-900 text-center py-4">Chưa có sản phẩm nào</p>`;
        } else {
            const table = document.createElement('table');
            table.className = 'w-full text-left text-lg text-gray-900';
            table.innerHTML = `<thead class="uppercase bg-gray-50 text-base"><tr><th class="px-2 py-2 text-center">STT</th><th class="px-2 py-2">Tên hàng</th><th class="px-2 py-2 text-center">SL</th><th class="px-2 py-2 text-right">Giá</th><th class="px-2 py-2 text-right">Thành tiền</th><th class="px-2 py-2 text-center">Xóa</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');
            activeInvoice.items.forEach((item, index) => {
                const row = document.createElement('tr');
                row.className = 'bg-white border-b';
                row.innerHTML = `<td class="px-2 py-2 text-center">${index + 1}</td><td class="px-2 py-2 font-medium">${item.name}</td><td class="px-2 py-2 text-center"><input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="w-16 text-center border rounded-md quantity-input"></td><td class="px-2 py-2 text-right"><input type="text" value="${new Intl.NumberFormat('vi-VN').format(item.price)}" data-id="${item.id}" class="w-28 text-right border rounded-md px-1 py-1 price-input bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"></td><td class="px-2 py-2 font-semibold text-right">${formatCurrency(item.price * item.quantity)}</td><td class="px-2 py-2 text-center"><button class="text-red-500" data-id="${item.id}" onclick="app.removeFromOrder(this.dataset.id)"><i class="fas fa-trash-alt"></i></button></td>`; tbody.appendChild(row);
            });
            currentOrderItemsContainer.innerHTML = '';
            currentOrderItemsContainer.appendChild(table);
        }
        updatePaymentSummary();
    };

    const renderAutocompleteResults = (results, container, clickHandler) => {
        container.innerHTML = '';
        if (results.length === 0) {
            container.innerHTML = `<div class="p-3 text-gray-900">Không tìm thấy</div>`;
            return;
        }
        results.forEach(item => {
            const activeInvoice = getActiveInvoice();
            const price = activeInvoice ? (activeInvoice.priceType === 'retail' ? item.retailPrice : item.wholesalePrice) : 0;
            const itemEl = document.createElement('div');
            itemEl.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0';

            if (item.hasOwnProperty('retailPrice')) {
                itemEl.innerHTML = `<div class="font-semibold">${item.name} <span class="text-sm">(${item.id})</span></div><div class="text-blue-600">${formatCurrency(price)}</div>`;
            } else {
                itemEl.innerHTML = `<div class="font-semibold">${item.name}</div>`;
            }

            itemEl.addEventListener('click', () => clickHandler(item));
            container.appendChild(itemEl);
        });
    };

    const updateCustomerDebtDisplay = (customerName) => {
        if (!customerName) {
            customerDebtDisplay.classList.add('hidden');
            return;
        }

        const customer = state.customers.find(c => c.name === customerName);
        if (customer) {
            const customerDebts = calculateCustomerDebts();
            const debtFromOrders = customerDebts[customer.name] || 0;
            const totalDebt = (customer.initialDebt || 0) + debtFromOrders;

            customerCurrentDebt.textContent = formatCurrency(totalDebt);
            customerDebtDisplay.classList.remove('hidden');
        } else {
            customerDebtDisplay.classList.add('hidden');
        }
    };

    const renderInvoiceTabs = () => {
        Array.from(invoiceTabsContainer.children).forEach(child => {
            if (child.id !== 'new-invoice-btn') {
                invoiceTabsContainer.removeChild(child);
            }
        });

        state.invoiceTabs.forEach((invoice, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `px-4 py-2 text-sm font-medium border-r border-gray-200 ${invoice.id === state.activeInvoiceId ? 'bg-white text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`;
            const tabName = invoice.originalOrderId ? `Sửa ĐH ${invoice.originalOrderId.slice(-4)}` : `Hóa đơn ${index + 1}`;
            tabButton.textContent = tabName;
            tabButton.dataset.id = invoice.id;

            tabButton.addEventListener('click', () => {
                state.activeInvoiceId = invoice.id;
                renderActiveInvoiceUI();
            });

            if (state.invoiceTabs.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.innerHTML = '&times;';
                closeBtn.className = 'ml-2 px-1 rounded-full hover:bg-red-200 text-red-500 font-bold';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    closeInvoiceTab(invoice.id);
                };
                tabButton.appendChild(closeBtn);
            }

            invoiceTabsContainer.insertBefore(tabButton, newInvoiceBtn);
        });
    };

    const renderActiveInvoiceUI = () => {
        const activeInvoice = getActiveInvoice();
        if (!activeInvoice) return;

        priceToggle.checked = activeInvoice.priceType === 'wholesale';
        const isRetail = activeInvoice.priceType === 'retail';
        customerNameWrapper.classList.toggle('hidden', isRetail);
        amountPaidInput.disabled = isRetail;
        payAllBtn.style.display = isRetail ? 'none' : 'flex';
        debtRow.classList.toggle('hidden', isRetail);

        customerNameSearchInput.value = activeInvoice.customerName;
        amountPaidInput.value = activeInvoice.paidAmount > 0 ? new Intl.NumberFormat('vi-VN').format(activeInvoice.paidAmount) : '';

        updateCustomerDebtDisplay(activeInvoice.customerName);
        renderCurrentOrder();
        renderInvoiceTabs();
        saveUiState();
    };

    const populateAndPrintInvoice = (order) => {
        // (Giữ nguyên không đổi)
        if (!printInvoiceContainer || order.priceType === 'payment') return;
        const today = new Date(order.date).toLocaleDateString('vi-VN');
        const isWholesale = order.priceType === 'wholesale';

        let itemsHtml = order.items.map((item, index) => `
            <tr style="border-top: 1px dashed #333;">
                <td style="padding: 6px 4px; text-align: center;">${index + 1}</td>
                <td style="padding: 6px 4px;">${item.name}</td>
                <td style="padding: 6px 4px; text-align: center;">${item.quantity}</td>
                <td style="padding: 6px 4px; text-align: right;">${formatCurrencyForPrint(item.price)}</td>
                <td style="padding: 6px 4px; text-align: right;">${formatCurrencyForPrint(item.price * item.quantity)}</td>
            </tr>
        `).join('');

        let summaryHtml = `
            <tr style="border-top: 2px solid #000; font-weight: bold;">
                <td style="text-align: right; padding: 6px 4px;" colspan="4">Tổng cộng:</td>
                <td style="text-align: right; padding: 6px 4px;">${formatCurrency(order.total)}</td>
            </tr>
        `;
        if (isWholesale) {
            summaryHtml += `
                <tr style="border-top: 1px dashed #333;">
                    <td style="text-align: right; padding: 6px 4px;" colspan="4">Đã trả:</td>
                    <td style="text-align: right; padding: 6px 4px;">${formatCurrency(order.paidAmount)}</td>
                </tr>
                <tr style="border-top: 1px dashed #333; font-weight: bold;">
                    <td style="text-align: right; padding: 6px 4px;" colspan="4">Còn lại:</td>
                    <td style="text-align: right; padding: 6px 4px;">${formatCurrency(order.debtAmount)}</td>
                </tr>
            `;
        }

        const invoiceHtml = `
            <div style="font-family: 'Times New Roman', Times, serif; font-size: 14pt; color: #000; width: 100%; margin: auto;">
                <header style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 10px; text-align: center;">
                    <div style="text-align: left; flex: 1;"><p style="margin: 0; font-weight: bold;">CỬA HÀNG THÁI HƯNG</p><p style="margin: 0;">ĐC: ........................</p><p style="margin: 0;">SĐT: ........................</p></div>
                    <div style="flex: 2;"><h1 style="margin: 0; font-size: 20pt; font-weight: bold;">HOÁ ĐƠN BÁN HÀNG</h1></div>
                    <div style="flex: 1;"></div>
                </header>
                <section style="margin: 15px 0;">
                    <p style="margin: 3px 0;"><strong>Đơn hàng:</strong> ${order.id}</p>
                    <p style="margin: 3px 0;"><strong>Khách hàng:</strong> ${order.customerName || 'Khách lẻ'}</p>
                    <p style="margin: 3px 0;"><strong>Ngày:</strong> ${today}</p>
                    <p style="margin: 3px 0;"><strong>Loại:</strong> ${isWholesale ? 'Giá Sỉ' : 'Giá Lẻ'}</p>
                </section>
                <table style="width: 100%; border-collapse: collapse; font-size: 14pt;">
                    <thead style="border-top: 2px solid #000; border-bottom: 2px solid #000;">
                        <tr><th style="padding: 8px 4px; text-align: center;">STT</th><th style="padding: 8px 4px; text-align: left;">Tên hàng</th><th style="padding: 8px 4px; text-align: center;">SL</th><th style="padding: 8px 4px; text-align: right;">Đơn giá</th><th style="padding: 8px 4px; text-align: right;">Thành tiền</th></tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                    <tfoot>${summaryHtml}</tfoot>
                </table>
                <footer style="margin-top: 40px; display: flex; justify-content: space-around; font-weight: bold;">
                    <div style="text-align: center;"><p style="margin: 0;">Khách hàng</p><p style="font-style: italic; font-weight: normal; font-size: 10pt;">(Ký, ghi rõ họ tên)</p></div>
                    <div style="text-align: center;"><p style="margin: 0;">Người bán hàng</p><p style="font-style: italic; font-weight: normal; font-size: 10pt;">(Ký, ghi rõ họ tên)</p></div>
                </footer>
            </div>
        `;
        printInvoiceContainer.innerHTML = invoiceHtml;
        window.print();
        printInvoiceContainer.innerHTML = '';
    };

    // --- EVENT HANDLERS & LOGIC (hầu hết giữ nguyên) ---
    const setPriceType = (type) => {
        const activeInvoice = getActiveInvoice();
        if (!activeInvoice) return;

        activeInvoice.priceType = type;
        amountPaidInput.value = '';

        if (activeInvoice.items.length > 0) {
            activeInvoice.items.forEach(item => {
                const product = state.products.find(p => p.id === item.id);
                if (product) {
                    item.price = type === 'retail' ? product.retailPrice : product.wholesalePrice;
                }
            });
        }
        renderActiveInvoiceUI();
    };

    priceToggle.addEventListener('change', (e) => setPriceType(e.target.checked ? 'wholesale' : 'retail'));

    amountPaidInput.addEventListener('input', (e) => {
        const input = e.target;
        let value = input.value.replace(/\D/g, '');
        input.value = value ? new Intl.NumberFormat('vi-VN').format(value) : '';
        updatePaymentSummary();
    });

    payAllBtn.addEventListener('click', () => {
        const activeInvoice = getActiveInvoice();
        if (!activeInvoice) return;
        amountPaidInput.value = new Intl.NumberFormat('vi-VN').format(activeInvoice.total);
        updatePaymentSummary();
    });

    // Thay đổi 4: Chuyển hàm saveCurrentOrder sang async và dùng db.js
    const saveCurrentOrder = async () => {
        const activeInvoice = getActiveInvoice();
        if (!activeInvoice || activeInvoice.items.length === 0) return null;
        if (activeInvoice.priceType === 'wholesale' && !activeInvoice.customerName.trim()) {
            alert('Vui lòng nhập tên khách hàng cho đơn hàng giá sỉ.');
            customerNameSearchInput.focus();
            return null;
        }

        updatePaymentSummary();

        if (activeInvoice.originalOrderId) {
            const orderToUpdate = state.orders.find(o => o.id === activeInvoice.originalOrderId);
            if (orderToUpdate) {
                orderToUpdate.date = new Date().toISOString();
                orderToUpdate.customerName = activeInvoice.customerName.trim();
                orderToUpdate.items = activeInvoice.items;
                orderToUpdate.total = activeInvoice.total;
                orderToUpdate.priceType = activeInvoice.priceType;
                orderToUpdate.paidAmount = activeInvoice.paidAmount;
                orderToUpdate.debtAmount = activeInvoice.debtAmount;

                await db.updateOrder(orderToUpdate); // LƯU VÀO DB
                return orderToUpdate;
            }
        } else {
            const newOrder = {
                id: `DH-${Date.now()}`,
                date: new Date().toISOString(),
                customerName: activeInvoice.customerName.trim(),
                items: activeInvoice.items,
                total: activeInvoice.total,
                priceType: activeInvoice.priceType,
                paidAmount: activeInvoice.paidAmount,
                debtAmount: activeInvoice.debtAmount,
            };
            await db.addOrder(newOrder); // LƯU VÀO DB
            state.orders.push(newOrder); // Cập nhật state tạm thời
            return newOrder;
        }
        return null;
    };

    const closeInvoiceTab = (invoiceId) => {
        const index = state.invoiceTabs.findIndex(inv => inv.id === invoiceId);

        if (index > -1) {
            state.invoiceTabs.splice(index, 1);
        }

        if (state.invoiceTabs.length === 0) {
            const newInvoice = { id: state.nextInvoiceId++, items: [], customerName: '', total: 0, paidAmount: 0, debtAmount: 0, priceType: 'retail', originalOrderId: null };
            state.invoiceTabs.push(newInvoice);
            state.activeInvoiceId = newInvoice.id;
        } else if (state.activeInvoiceId === invoiceId) {
            state.activeInvoiceId = state.invoiceTabs[0].id;
        }

        renderActiveInvoiceUI();
    };

    saveOrderBtn.addEventListener('click', async () => {
        const savedOrder = await saveCurrentOrder();
        if (savedOrder) {
            const invoiceThatWasSaved = state.invoiceTabs.find(inv => inv.id === state.activeInvoiceId);

            if (invoiceThatWasSaved && invoiceThatWasSaved.originalOrderId) {
                alert(`Đã cập nhật đơn hàng ${savedOrder.id}`);
                // Sau khi cập nhật, có thể điều hướng về trang lịch sử để xem lại
                window.location.href = `history.html`;
            } else {
                // Chuyển hướng đến trang chi tiết mới và truyền ID của đơn hàng qua URL
                window.location.href = `order-detail.html?id=${savedOrder.id}`;
            }

            // Xóa tab hóa đơn sau khi đã lưu
            closeInvoiceTab(state.activeInvoiceId);
        }
    });

    // --- Search Logic ---
    orderProductSearchInput.addEventListener('input', (e) => {
        const rawQuery = e.target.value.trim();
        const query = removeDiacritics(rawQuery.toLowerCase());

        if (!query) {
            autocompleteResultsContainer.classList.add('hidden');
            return;
        }

        // --- Phân tích từ khóa nâng cao ---
        const keywords = query.split(/\s+/).filter(Boolean);
        let results = state.products;

        // --- Lọc theo từ khóa ---
        results = results.filter(p => {
            const normalizedName = removeDiacritics(p.name.toLowerCase());
            const unit = (p.unit || '').toLowerCase();

            // Kiểm tra tất cả các từ phải khớp
            const allKeywordsMatch = keywords.every(kw =>
                normalizedName.includes(kw) || String(p.id).includes(kw) || unit.includes(kw)
            );
            return allKeywordsMatch;
        });

        // --- Hỗ trợ tìm theo giá ---
        const priceQuery = rawQuery.match(/[<>]=?\s*\d+/);
        if (priceQuery) {
            const expr = priceQuery[0].replace(/\s/g, '');
            const num = parseFloat(expr.match(/\d+/)?.[0] || 0);
            if (expr.startsWith('<')) {
                results = results.filter(p => p.retailPrice < num);
            } else if (expr.startsWith('>')) {
                results = results.filter(p => p.retailPrice > num);
            }
        }

        // --- Giới hạn và hiển thị kết quả ---
        const topResults = results.slice(0, 15);
        autocompleteResultsContainer.innerHTML = topResults.map(p => `
        <div class="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0" data-id="${p.id}">
            <div class="font-semibold">${p.name} <span class="text-sm text-gray-500">(${p.unit || ''})</span></div>
            <div class="flex justify-between text-sm text-gray-700">
                <span>Mã: ${p.id}</span>
                <span>Giá lẻ: <span class="text-blue-600 font-semibold">${new Intl.NumberFormat('vi-VN').format(p.retailPrice)}đ</span></span>
            </div>
        </div>
    `).join('');

        autocompleteResultsContainer.classList.remove('hidden');

        // --- Click chọn sản phẩm ---
        autocompleteResultsContainer.querySelectorAll('[data-id]').forEach(el => {
            el.addEventListener('click', () => {
                app.addToOrder(el.dataset.id);
                orderProductSearchInput.value = '';
                autocompleteResultsContainer.classList.add('hidden');
            });
        });
    });

    customerNameSearchInput.addEventListener('input', (e) => {
        const query = removeDiacritics(e.target.value.toLowerCase().trim());
        const results = query
            ? state.customers.filter(c => removeDiacritics(c.name.toLowerCase()).includes(query))
            : state.customers;

        renderAutocompleteResults(results.slice(0, 10), customerAutocompleteResults, (customer) => {
            customerNameSearchInput.value = customer.name;
            const activeInvoice = getActiveInvoice();
            if (activeInvoice) activeInvoice.customerName = customer.name;
            customerAutocompleteResults.classList.add('hidden');
            updateCustomerDebtDisplay(customer.name);
            saveUiState();
        });
        customerAutocompleteResults.classList.remove('hidden');
        updateCustomerDebtDisplay(null);
    });

    customerNameSearchInput.addEventListener('focus', (e) => {
        if (!e.target.value.trim()) {
            renderAutocompleteResults(state.customers.slice(0, 10), customerAutocompleteResults, (customer) => {
                customerNameSearchInput.value = customer.name;
                const activeInvoice = getActiveInvoice();
                if (activeInvoice) activeInvoice.customerName = customer.name;
                customerAutocompleteResults.classList.add('hidden');
                updateCustomerDebtDisplay(customer.name);
                saveUiState();
            });
            customerAutocompleteResults.classList.remove('hidden');
        }
    });

    customerNameSearchInput.addEventListener('change', (e) => {
        const activeInvoice = getActiveInvoice();
        if (activeInvoice) activeInvoice.customerName = e.target.value;
        updateCustomerDebtDisplay(e.target.value);
        saveUiState();
    });

    document.addEventListener('click', (e) => {
        if (!orderProductSearchInput.contains(e.target) && !autocompleteResultsContainer.contains(e.target)) {
            autocompleteResultsContainer.classList.add('hidden');
        }
        if (!customerNameSearchInput.contains(e.target) && !customerAutocompleteResults.contains(e.target)) {
            customerAutocompleteResults.classList.add('hidden');
        }
    });

    currentOrderItemsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            app.updateOrderQuantity(e.target.dataset.id, parseInt(e.target.value, 10));
        }
    });

    currentOrderItemsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('price-input')) {
            const input = e.target;
            const id = input.dataset.id;
            const originalValue = input.value;
            const cursorPosition = input.selectionStart;

            let value = input.value.replace(/\D/g, '');
            input.value = value ? new Intl.NumberFormat('vi-VN').format(value) : '';

            const newValue = input.value;
            const diff = newValue.length - originalValue.length;
            input.setSelectionRange(cursorPosition + diff, cursorPosition + diff);

            const activeInvoice = getActiveInvoice();
            if (!activeInvoice) return;

            const item = activeInvoice.items.find(item => item.id === id);
            if (item) {
                const newPrice = parseFloat(value) || 0;
                item.price = newPrice;
            }

            const row = input.closest('tr');
            if (row) {
                const totalCell = row.querySelector('td:nth-child(5)');
                totalCell.textContent = formatCurrency(item.price * item.quantity);
            }

            updatePaymentSummary();
        }
    });

    // --- Modal Logic ---
    const formatNumberInput = (e) => {
        const input = e.target;
        let value = input.value.replace(/\D/g, '');
        input.value = value ? new Intl.NumberFormat('vi-VN').format(value) : '';
    };
    quickCustomerInitialDebtInput.addEventListener('input', formatNumberInput);

    quickAddCustomerBtn.addEventListener('click', () => {
        // Lấy tên khách hàng từ ô tìm kiếm
        const customerNameFromSearch = customerNameSearchInput.value.trim();

        // Điền tên đó vào ô "Tên khách hàng" trong popup
        quickCustomerNameInput.value = customerNameFromSearch;

        // Hiển thị popup
        quickCustomerModal.classList.remove('hidden');

        // (Cải tiến nhỏ) Tự động focus vào ô nợ ban đầu nếu tên đã được điền
        if (customerNameFromSearch) {
            quickCustomerInitialDebtInput.focus();
        } else {
            quickCustomerNameInput.focus();
        }
    });
    closeQuickCustomerModalBtn.addEventListener('click', () => quickCustomerModal.classList.add('hidden'));

    // Thay đổi 5: Chuyển hàm lưu khách hàng nhanh sang async và dùng db.js
    // File: script.js

    // TÌM VÀ THAY THẾ TOÀN BỘ HÀM NÀY
    saveQuickCustomerBtn.addEventListener('click', async () => {
        const name = quickCustomerNameInput.value.trim();
        const initialDebtRaw = quickCustomerInitialDebtInput.value.replace(/\./g, '');
        const initialDebt = parseFloat(initialDebtRaw) || 0;

        if (!name) {
            alert('Tên khách hàng là bắt buộc.');
            return;
        }

        // --- LOGIC KIỂM TRA TÊN TRÙNG LẶP ---
        const normalizedNewName = name.toLowerCase();
        const isDuplicate = state.customers.some(customer => customer.name.toLowerCase() === normalizedNewName);

        if (isDuplicate) {
            alert(`Tên khách hàng "${name}" đã tồn tại. Vui lòng nhập tên khác.`);
            return; // Dừng hàm nếu phát hiện tên trùng lặp
        }
        // --- KẾT THÚC LOGIC KIỂM TRA ---

        // Nếu tên hợp lệ, tiếp tục tạo mới khách hàng
        const newCustomer = {
            id: `KH-${Date.now()}`,
            name: name,
            initialDebt: initialDebt,
        };
        await db.addCustomer(newCustomer);
        state.customers.push(newCustomer);

        quickCustomerModal.classList.add('hidden');

        const activeInvoice = getActiveInvoice();
        if (activeInvoice) {
            activeInvoice.customerName = name;
            customerNameSearchInput.value = name;
            updateCustomerDebtDisplay(name);
        }
        alert(`Đã thêm khách hàng mới: ${name}`);
    });

    newInvoiceBtn.addEventListener('click', () => {
        const newInvoice = {
            id: state.nextInvoiceId++,
            items: [], customerName: '', total: 0, paidAmount: 0, debtAmount: 0, priceType: 'retail', originalOrderId: null
        };
        state.invoiceTabs.push(newInvoice);
        state.activeInvoiceId = newInvoice.id;
        renderActiveInvoiceUI();
    });

    // --- GLOBAL API (giữ nguyên) ---
    window.app = {
        addToOrder: (id) => {
            const activeInvoice = getActiveInvoice();
            if (!activeInvoice) return;

            const product = state.products.find(p => p.id === id);
            if (!product) return;
            const existingItem = activeInvoice.items.find(item => item.id === id);
            if (existingItem) {
                existingItem.quantity++;
            } else {
                activeInvoice.items.push({
                    id: product.id, name: product.name,
                    price: activeInvoice.priceType === 'retail' ? product.retailPrice : product.wholesalePrice,
                    quantity: 1,
                });
            }
            renderCurrentOrder();
        },
        removeFromOrder: (id) => {
            const activeInvoice = getActiveInvoice();
            if (!activeInvoice) return;
            activeInvoice.items = activeInvoice.items.filter(item => item.id !== id);
            renderCurrentOrder();
        },
        updateOrderQuantity: (id, quantity) => {
            const activeInvoice = getActiveInvoice();
            if (!activeInvoice) return;
            const item = activeInvoice.items.find(item => item.id === id);
            if (item && quantity > 0) item.quantity = quantity;
            else if (item) app.removeFromOrder(id);
            renderCurrentOrder();
        },
        showOrderDetailModal: (order) => {
            detailModalTitle.textContent = `Chi Tiết Đơn Hàng: ${order.id}`;
            let itemsHtml = order.items.map((item, index) => `
                <tr class="border-b">
                    <td class="p-2 text-center">${index + 1}</td>
                    <td class="p-2">${item.name}</td>
                    <td class="p-2 text-center">${item.quantity}</td>
                    <td class="p-2 text-right">${formatCurrency(item.price)}</td>
                    <td class="p-2 text-right">${formatCurrency(item.price * item.quantity)}</td>
                </tr>
            `).join('');

            const isWholesale = order.priceType === 'wholesale';
            detailModalContent.innerHTML = `
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div><strong>Khách hàng:</strong> ${order.customerName || 'Khách Lẻ'}</div>
                    <div><strong>Ngày tạo:</strong> ${new Date(order.date).toLocaleString('vi-VN')}</div>
                </div>
                <table class="w-full">
                    <thead class="uppercase bg-gray-100">
                        <tr><th class="p-2 text-center">STT</th><th class="p-2">Tên hàng</th><th class="p-2 text-center">SL</th><th class="p-2 text-right">Đơn giá</th><th class="p-2 text-right">Thành tiền</th></tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <div class="mt-4 pt-4 border-t text-right space-y-2 text-lg">
                    <div class="flex justify-end"><span class="font-semibold w-32">Tổng cộng:</span><span class="font-bold w-40">${formatCurrency(order.total)}</span></div>
                    ${isWholesale ? `
                    <div class="flex justify-end"><span class="font-semibold w-32">Đã trả:</span><span class="w-40">${formatCurrency(order.paidAmount)}</span></div>
                    <div class="flex justify-end text-red-600"><span class="font-semibold w-32">Còn nợ:</span><span class="font-bold w-40">${formatCurrency(order.debtAmount)}</span></div>` : ''}
                </div>`;

            const printBtn = document.getElementById('print-order-btn');
            const newPrintBtn = printBtn.cloneNode(true);
            printBtn.parentNode.replaceChild(newPrintBtn, printBtn);
            newPrintBtn.addEventListener('click', () => {
                populateAndPrintInvoice(order);
            });

            orderDetailModal.classList.remove('hidden');
        }
    };

    // Thay đổi 6: Viết lại hàm khởi tạo để đảm bảo DB sẵn sàng trước khi chạy
    const init = async () => {
        await db.init(); // Đợi DB kết nối xong
        await loadData(); // Đợi tải dữ liệu xong

        const urlParams = new URLSearchParams(window.location.search);
        const orderIdToEdit = urlParams.get('edit');

        if (orderIdToEdit) {
            const orderToEdit = state.orders.find(o => o.id === orderIdToEdit);
            if (orderToEdit) {
                const newInvoice = {
                    id: state.nextInvoiceId++,
                    items: JSON.parse(JSON.stringify(orderToEdit.items)),
                    customerName: orderToEdit.customerName,
                    priceType: orderToEdit.priceType,
                    total: orderToEdit.total,
                    paidAmount: orderToEdit.paidAmount,
                    debtAmount: orderToEdit.debtAmount,
                    originalOrderId: orderIdToEdit
                };
                state.invoiceTabs.push(newInvoice);
                state.activeInvoiceId = newInvoice.id;
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        renderActiveInvoiceUI();
        closeDetailModalBtn.addEventListener('click', () => orderDetailModal.classList.add('hidden'));
        closeDetailModalBtnFooter.addEventListener('click', () => orderDetailModal.classList.add('hidden'));
    };
    // DÁN VÀO KHU VỰC --- MODAL LOGIC ---

    // Tự động định dạng số cho các ô giá trong popup sản phẩm
    quickProductWholesalePriceInput.addEventListener('input', formatNumberInput);
    quickProductRetailPriceInput.addEventListener('input', formatNumberInput);

    // Sự kiện mở popup
    quickAddProductBtn.addEventListener('click', () => {
        // Gợi ý: Lấy text từ ô tìm kiếm điền vào tên sản phẩm
        quickProductNameInput.value = orderProductSearchInput.value.trim();
        quickProductModal.classList.remove('hidden');
        quickProductNameInput.focus();
    });

    // Sự kiện đóng popup
    closeQuickProductModalBtn.addEventListener('click', () => {
        quickProductModal.classList.add('hidden');
    });

    // Sự kiện lưu sản phẩm mới
    saveQuickProductBtn.addEventListener('click', async () => {
        const name = quickProductNameInput.value.trim();
        if (!name) {
            alert('Tên sản phẩm không được để trống.');
            return;
        }

        const wholesalePrice = parseFloat(quickProductWholesalePriceInput.value.replace(/\./g, '')) || 0;
        const retailPrice = parseFloat(quickProductRetailPriceInput.value.replace(/\./g, '')) || 0;

        const newProduct = {
            id: Date.now().toString(),
            name: name,
            unit: 'Cái', // Đơn vị mặc định, bạn có thể thay đổi
            importPrice: 0, // Giá nhập mặc định
            wholesalePrice: wholesalePrice,
            retailPrice: retailPrice,
        };

        // 1. Lưu vào cơ sở dữ liệu
        await db.addProduct(newProduct);
        // 2. Cập nhật state hiện tại để không cần tải lại trang
        state.products.push(newProduct);
        // 3. Tự động thêm sản phẩm vừa tạo vào đơn hàng hiện tại
        app.addToOrder(newProduct.id);

        // 4. Đóng và dọn dẹp popup
        quickProductModal.classList.add('hidden');
        document.getElementById('quick-product-form').reset();

        alert(`Đã thêm sản phẩm "${name}" và đưa vào đơn hàng.`);
    });
    // Thay đổi 7: Viết lại logic xuất/nhập dữ liệu
    const exportAllBtn = document.getElementById('export-all-btn');
    const importAllBtn = document.getElementById('import-all-btn');
    const importAllInput = document.getElementById('import-all-input');

    // File: script.js

    // TÌM VÀ THAY THẾ TOÀN BỘ 2 HÀM NÀY Ở CUỐI TỆP

    const exportAllData = async () => {
        try {
            alert('Đang chuẩn bị dữ liệu để xuất, vui lòng chờ...');
            // Lấy TOÀN BỘ dữ liệu từ DB
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
        } catch (error) {
            console.error("Lỗi khi xuất dữ liệu:", error);
            alert("Đã xảy ra lỗi trong quá trình xuất dữ liệu.");
        }
    };

    // 👇 DÒNG QUAN TRỌNG: giúp toast gọi được hàm này
    window.exportAllData = exportAllData;


    const importAllData = (file) => {
        if (!confirm('CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ dữ liệu hiện tại (Bán Hàng, Nhập Hàng, Khách Hàng,...) và thay thế bằng dữ liệu từ tệp Excel. Bạn có chắc chắn muốn tiếp tục?')) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Lấy dữ liệu từ tất cả các sheet
                const productsSheet = workbook.Sheets["Products"];
                const ordersSheet = workbook.Sheets["Orders"];
                const customersSheet = workbook.Sheets["Customers"];
                const purchasesSheet = workbook.Sheets["Purchases"]; // <-- THÊM MỚI
                const suppliersSheet = workbook.Sheets["Suppliers"]; // <-- THÊM MỚI

                if (!productsSheet || !ordersSheet || !customersSheet || !purchasesSheet || !suppliersSheet) {
                    alert("File không hợp lệ. Hãy đảm bảo có đủ 5 sheet: Products, Orders, Customers, Purchases, và Suppliers.");
                    return;
                }

                const products = XLSX.utils.sheet_to_json(productsSheet);
                const orders = XLSX.utils.sheet_to_json(ordersSheet);
                const customers = XLSX.utils.sheet_to_json(customersSheet);
                const purchases = XLSX.utils.sheet_to_json(purchasesSheet); // <-- THÊM MỚI
                const suppliers = XLSX.utils.sheet_to_json(suppliersSheet); // <-- THÊM MỚI

                // Ghi đè toàn bộ dữ liệu vào DB
                await db.overwriteStore(db.STORES.products, products);
                await db.overwriteStore(db.STORES.orders, orders);
                await db.overwriteStore(db.STORES.customers, customers);
                await db.overwriteStore(db.STORES.purchases, purchases); // <-- THÊM MỚI
                await db.overwriteStore(db.STORES.suppliers, suppliers); // <-- THÊM MỚI

                // Xóa trạng thái tab cũ
                localStorage.removeItem('salesDashboardUiState');
                localStorage.removeItem('purchaseDashboardUiState'); // <-- THÊM MỚI

                alert('Đã nhập dữ liệu thành công! Trang sẽ được tải lại.');
                location.reload();

            } catch (error) {
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

    // --- KHỞI CHẠY ỨNG DỤNG ---
    init();
    // --- ĐĂNG KÝ SERVICE WORKER ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => {
                    console.log('Service worker registered successfully.', reg);
                }).catch((err) => {
                    console.log('Service worker registration failed: ', err);
                });
        });
    }
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


// --- NÚT FLOATING: LÀM MỚI ỨNG DỤNG (KHÔNG MẤT DỮ LIỆU) ---
document.addEventListener('DOMContentLoaded', async () => {
    const refreshBtn = document.getElementById('refresh-float-btn');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', async () => {
        if (!confirm("🔄 Làm mới ứng dụng?\n\nCác dữ liệu trong kho (đơn hàng, khách hàng, hàng hóa...) sẽ được GIỮ LẠI.")) return;

        try {
            const cacheNames = await caches.keys();
            for (const name of cacheNames) await caches.delete(name);
            alert("✅ Cache đã được xóa. Ứng dụng sẽ tải lại phiên bản mới nhất.");
            location.reload(true);
        } catch (err) {
            console.error("Lỗi khi làm mới cache:", err);
            alert("❌ Không thể làm mới ứng dụng. Vui lòng thử lại.");
        }
    });
});
