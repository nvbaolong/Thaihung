document.addEventListener('DOMContentLoaded', async () => {
    await db.init();

    let state = {
        products: [],
        suppliers: [],
        allPurchases: [], // <-- THÊM DÒNG NÀY    
        purchaseTabs: [], // Quản lý nhiều tab
        activePurchaseId: 1,
        nextPurchaseId: 2,
    };

    // --- DOM ELEMENTS ---
    const productSearchInput = document.getElementById('product-search');
    const autocompleteResultsContainer = document.getElementById('autocomplete-results');
    const currentPurchaseItemsContainer = document.getElementById('current-purchase-items');
    const savePurchaseBtn = document.getElementById('save-purchase-btn');
    const supplierNameSearchInput = document.getElementById('supplier-name-search');
    const supplierAutocompleteResults = document.getElementById('supplier-autocomplete-results');
    const summaryTotalEl = document.getElementById('summary-total');
    const summaryItemCountEl = document.getElementById('summary-item-count');
    const purchaseTabsContainer = document.getElementById('purchase-tabs-container');
    const newPurchaseBtn = document.getElementById('new-purchase-btn');
    
    // Quick Add Supplier Modal
    const quickSupplierModal = document.getElementById('quick-supplier-modal');
    const quickAddSupplierBtn = document.getElementById('quick-add-supplier-btn');
    const closeQuickSupplierModalBtn = document.getElementById('close-quick-supplier-modal-btn');
    const saveQuickSupplierBtn = document.getElementById('save-quick-supplier-btn');
    const quickSupplierNameInput = document.getElementById('quick-supplier-name');

    // --- DATA HANDLING & STATE ---
    const saveUiState = () => {
        const uiState = {
            purchaseTabs: state.purchaseTabs,
            nextPurchaseId: state.nextPurchaseId,
            activePurchaseId: state.activePurchaseId,
        };
        localStorage.setItem('purchaseDashboardUiState', JSON.stringify(uiState));
    };

    const loadData = async () => {
        state.products = await db.getAllProducts();
        state.suppliers = await db.getAllSuppliers();
        state.allPurchases = await db.getAllPurchases(); // <-- THÊM DÒNG NÀY    
        
        const uiStateData = localStorage.getItem('purchaseDashboardUiState');
        if (uiStateData) {
            const parsed = JSON.parse(uiStateData);
            state.purchaseTabs = parsed.purchaseTabs.length > 0 ? parsed.purchaseTabs : [{ id: 1, items: [], supplierName: '', total: 0 }];
            state.nextPurchaseId = parsed.nextPurchaseId || 2;
            state.activePurchaseId = parsed.activePurchaseId || 1;
        } else {
            state.purchaseTabs = [{ id: 1, items: [], supplierName: '', total: 0 }];
        }
    };
    
    const getActivePurchase = () => state.purchaseTabs.find(p => p.id === state.activePurchaseId);
    
    // --- FORMATTING ---
    const formatNumber = (value) => new Intl.NumberFormat('vi-VN').format(value || 0);

    // --- RENDER FUNCTIONS ---
    const updatePurchaseSummary = () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase) return;

        const total = activePurchase.items.reduce((sum, item) => sum + (item.importPrice * item.quantity), 0);
        const itemCount = activePurchase.items.length;
        
        activePurchase.total = total;
        
        summaryTotalEl.textContent = formatNumber(total);
        summaryItemCountEl.textContent = itemCount;
        savePurchaseBtn.disabled = itemCount === 0;
        saveUiState();
    };

    const renderCurrentPurchaseItems = () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase || activePurchase.items.length === 0) {
            currentPurchaseItemsContainer.innerHTML = `<p class="text-gray-900 text-center py-4">Chưa có sản phẩm nào</p>`;
        } else {
            const table = document.createElement('table');
            table.className = 'w-full text-left text-sm';
            table.innerHTML = `<thead class="uppercase bg-gray-50 text-xs"><tr><th class="px-2 py-2">Tên hàng</th><th class="px-2 py-2 text-center">SL</th><th class="px-2 py-2 text-right">Giá nhập</th><th class="px-2 py-2 text-right">Thành tiền</th><th class="px-2 py-2 text-center">Xóa</th></tr></thead><tbody></tbody>`;
            const tbody = table.querySelector('tbody');

            activePurchase.items.forEach(item => {
                const row = document.createElement('tr');
                row.className = 'bg-white border-b';
                row.innerHTML = `
                    <td class="px-2 py-2 font-medium">${item.name}</td>
                    <td class="px-2 py-2 text-center"><input type="number" min="1" value="${item.quantity}" data-id="${item.id}" class="w-16 text-center border rounded-md quantity-input"></td>
                    <td class="px-2 py-2 text-right"><input type="text" value="${formatNumber(item.importPrice)}" data-id="${item.id}" class="w-28 text-right border rounded-md px-1 py-1 import-price-input bg-gray-50 focus:bg-white"></td>
                    <td class="px-2 py-2 font-semibold text-right">${formatNumber(item.importPrice * item.quantity)}</td>
                    <td class="px-2 py-2 text-center"><button class="text-red-500" data-id="${item.id}" onclick="app.removeFromPurchase('${item.id}')"><i class="fas fa-trash-alt"></i></button></td>
                `;
                tbody.appendChild(row);
            });
            currentPurchaseItemsContainer.innerHTML = '';
            currentPurchaseItemsContainer.appendChild(table);
        }
        updatePurchaseSummary();
    };
    
    const renderPurchaseTabs = () => {
        Array.from(purchaseTabsContainer.children).forEach(child => {
            if (child.id !== 'new-purchase-btn') purchaseTabsContainer.removeChild(child);
        });

        state.purchaseTabs.forEach((purchase, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `px-4 py-2 text-sm font-medium border-r border-gray-200 ${purchase.id === state.activePurchaseId ? 'bg-white text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`;
            tabButton.textContent = `Phiếu ${index + 1}`;
            tabButton.dataset.id = purchase.id;

            tabButton.addEventListener('click', () => {
                state.activePurchaseId = purchase.id;
                renderActivePurchaseUI();
            });

            if (state.purchaseTabs.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.innerHTML = '&times;';
                closeBtn.className = 'ml-2 px-1 rounded-full hover:bg-red-200 text-red-500 font-bold';
                closeBtn.onclick = (e) => {
                    e.stopPropagation();
                    closePurchaseTab(purchase.id);
                };
                tabButton.appendChild(closeBtn);
            }
            purchaseTabsContainer.insertBefore(tabButton, newPurchaseBtn);
        });
    };
    
    const renderActivePurchaseUI = () => {
        const activePurchase = getActivePurchase();
        if (!activePurchase) return;

        supplierNameSearchInput.value = activePurchase.supplierName;
        renderPurchaseTabs();
        renderCurrentPurchaseItems();
    };

    const renderAutocompleteResults = (results, container, clickHandler, nameField = 'name') => {
        container.innerHTML = '';
        if (results.length === 0) container.innerHTML = `<div class="p-3 text-gray-500">Không tìm thấy</div>`;
        else {
            results.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'p-3 hover:bg-blue-50 cursor-pointer border-b last:border-0';
                itemEl.innerHTML = `<div class="font-semibold">${item[nameField]}</div>`;
                itemEl.addEventListener('click', () => clickHandler(item));
                container.appendChild(itemEl);
            });
        }
    };
    
    const closePurchaseTab = (purchaseId) => {
        const index = state.purchaseTabs.findIndex(p => p.id === purchaseId);
        if (index > -1) state.purchaseTabs.splice(index, 1);
        
        if (state.purchaseTabs.length === 0) {
            const newPurchase = { id: state.nextPurchaseId++, items: [], supplierName: '', total: 0 };
            state.purchaseTabs.push(newPurchase);
            state.activePurchaseId = newPurchase.id;
        } else if (state.activePurchaseId === purchaseId) {
            state.activePurchaseId = state.purchaseTabs[0].id;
        }
        renderActivePurchaseUI();
    };

    // --- LOGIC & EVENT HANDLERS ---
    window.app = {
        addToPurchase: (productId) => {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            const product = state.products.find(p => p.id === productId);
            if (!product) return;
            
            const existingItem = activePurchase.items.find(item => item.id === productId);
            if (existingItem) existingItem.quantity++;
            else {
                activePurchase.items.push({
                    id: product.id, name: product.name,
                    importPrice: product.importPrice || 0, quantity: 1,
                });
            }
            renderCurrentPurchaseItems();
        },
        removeFromPurchase: (productId) => {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            activePurchase.items = activePurchase.items.filter(item => item.id !== productId);
            renderCurrentPurchaseItems();
        },
    };
    
    newPurchaseBtn.addEventListener('click', () => {
        const newPurchase = { id: state.nextPurchaseId++, items: [], supplierName: '', total: 0 };
        state.purchaseTabs.push(newPurchase);
        state.activePurchaseId = newPurchase.id;
        renderActivePurchaseUI();
    });

    // --- TÌM KIẾM NÂNG CAO CHO SẢN PHẨM NHẬP HÀNG ---
productSearchInput.addEventListener('input', (e) => {
    const rawQuery = e.target.value.trim();
    const query = rawQuery.toLowerCase();

    if (!query) {
        autocompleteResultsContainer.classList.add('hidden');
        return;
    }

    const removeDiacritics = (str) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

    const normalizedQuery = removeDiacritics(query);
    const keywords = normalizedQuery.split(/\s+/).filter(Boolean);
    let results = state.products;

    // --- Lọc theo nhiều từ khóa ---
    results = results.filter(p => {
        const normalizedName = removeDiacritics(p.name.toLowerCase());
        const unit = (p.unit || '').toLowerCase();
        return keywords.every(kw =>
            normalizedName.includes(kw) ||
            String(p.id).toLowerCase().includes(kw) ||
            unit.includes(kw)
        );
    });

    // --- Lọc theo giá nhập ---
    const priceMatch = rawQuery.match(/[<>]=?\s*\d+/);
    if (priceMatch) {
        const expr = priceMatch[0].replace(/\s/g, '');
        const num = parseFloat(expr.match(/\d+/)?.[0] || 0);
        if (expr.startsWith('<')) {
            results = results.filter(p => p.importPrice < num);
        } else if (expr.startsWith('>')) {
            results = results.filter(p => p.importPrice > num);
        } else if (expr.startsWith('=')) {
            results = results.filter(p => p.importPrice === num);
        }
    }

    // --- Hiển thị kết quả ---
    const topResults = results.slice(0, 15);
    autocompleteResultsContainer.innerHTML = topResults.map(p => `
        <div class="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0" data-id="${p.id}">
            <div class="font-semibold">${p.name} <span class="text-sm text-gray-500">(${p.unit || ''})</span></div>
            <div class="flex justify-between text-sm text-gray-700">
                <span>Mã: ${p.id}</span>
                <span>Giá nhập: <span class="text-blue-600 font-semibold">${new Intl.NumberFormat('vi-VN').format(p.importPrice)}đ</span></span>
            </div>
        </div>
    `).join('');

    autocompleteResultsContainer.classList.remove('hidden');

    // --- Khi click chọn ---
    autocompleteResultsContainer.querySelectorAll('[data-id]').forEach(el => {
        el.addEventListener('click', () => {
            app.addToPurchase(el.dataset.id);
            productSearchInput.value = '';
            autocompleteResultsContainer.classList.add('hidden');
        });
    });
});


    supplierNameSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const activePurchase = getActivePurchase();
        if(activePurchase) activePurchase.supplierName = query;
        saveUiState();
        
        if(query) {
            const results = state.suppliers.filter(s => s.name.toLowerCase().includes(query));
            renderAutocompleteResults(results.slice(0, 10), supplierAutocompleteResults, (supplier) => {
                supplierNameSearchInput.value = supplier.name;
                if(activePurchase) activePurchase.supplierName = supplier.name;
                supplierAutocompleteResults.classList.add('hidden');
                saveUiState();
            });
            supplierAutocompleteResults.classList.remove('hidden');
        } else {
            supplierAutocompleteResults.classList.add('hidden');
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!productSearchInput.contains(e.target)) autocompleteResultsContainer.classList.add('hidden');
        if (!supplierNameSearchInput.contains(e.target)) supplierAutocompleteResults.classList.add('hidden');
    });

    currentPurchaseItemsContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            const id = e.target.dataset.id;
            const quantity = parseInt(e.target.value, 10);
            const item = activePurchase.items.find(i => i.id === id);
            if (item) {
                if (quantity > 0) item.quantity = quantity;
                else app.removeFromPurchase(id);
                renderCurrentPurchaseItems();
            }
        }
    });

    currentPurchaseItemsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('import-price-input')) {
            const activePurchase = getActivePurchase();
            if (!activePurchase) return;
            const id = e.target.dataset.id;
            const input = e.target;
            
            let value = input.value.replace(/\D/g, '');
            input.value = value ? formatNumber(value) : '';

            const newPrice = parseFloat(value) || 0;
            const item = activePurchase.items.find(i => i.id === id);
            if (item) {
                item.importPrice = newPrice;
                const row = input.closest('tr');
                if (row) {
                    const totalCell = row.querySelector('td:nth-child(4)');
                    totalCell.textContent = formatNumber(item.importPrice * item.quantity);
                }
                updatePurchaseSummary();
            }
        }
    });

    // THAY THẾ TOÀN BỘ HÀM savePurchaseBtn CŨ BẰNG HÀM MỚI NÀY
savePurchaseBtn.addEventListener('click', async () => {
    const activePurchase = getActivePurchase();
    if (!activePurchase || activePurchase.items.length === 0) return;

    const newPurchase = {
        id: `PN-${Date.now()}`, 
        date: new Date().toISOString(),
        supplierName: activePurchase.supplierName.trim() || 'Không có', // Nếu trống thì ghi "Không có"
        items: activePurchase.items, 
        total: activePurchase.total,
    };

    await db.addPurchase(newPurchase);
    
    // Thay vì alert, gọi hàm hiển thị popup mới
    showPurchaseDetailModal(newPurchase); 
    
    closePurchaseTab(activePurchase.id);
});

    // Quick Add Supplier Modal Logic
    quickAddSupplierBtn.addEventListener('click', () => {
        quickSupplierNameInput.value = supplierNameSearchInput.value;
        quickSupplierModal.classList.remove('hidden');
        quickSupplierNameInput.focus();
    });
    closeQuickSupplierModalBtn.addEventListener('click', () => quickSupplierModal.classList.add('hidden'));
    saveQuickSupplierBtn.addEventListener('click', async () => {
        const name = quickSupplierNameInput.value.trim();
        if (!name) return alert('Tên Nhà Cung Cấp không được để trống.');

        const newSupplier = { id: `NCC-${Date.now()}`, name };
        await db.addSupplier(newSupplier);
        state.suppliers.push(newSupplier);
        
        const activePurchase = getActivePurchase();
        if(activePurchase) {
             supplierNameSearchInput.value = name;
             activePurchase.supplierName = name;
        }
       
        quickSupplierModal.classList.add('hidden');
        alert(`Đã thêm NCC mới: ${name}`);
    });

    // --- INITIALIZATION ---
    // THAY THẾ TOÀN BỘ HÀM INIT CŨ BẰNG HÀM NÀY
const init = async () => {
    await loadData();

    const urlParams = new URLSearchParams(window.location.search);
    const purchaseIdToEdit = urlParams.get('edit');

    if (purchaseIdToEdit) {
        const purchaseToEdit = state.allPurchases.find(p => p.id === purchaseIdToEdit);
        if (purchaseToEdit) {
            const newPurchaseTab = {
                id: state.nextPurchaseId++,
                items: JSON.parse(JSON.stringify(purchaseToEdit.items)), // Tạo bản sao sâu
                supplierName: purchaseToEdit.supplierName,
                total: purchaseToEdit.total,
                originalPurchaseId: purchaseIdToEdit // Lưu lại ID gốc để xử lý cập nhật sau này
            };
            state.purchaseTabs.push(newPurchaseTab);
            state.activePurchaseId = newPurchaseTab.id;
        }
        // Xóa param khỏi URL để tránh load lại khi refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    renderActivePurchaseUI();
};

    init();
});// DÁN TOÀN BỘ ĐOẠN MÃ NÀY VÀO CUỐI TỆP purchase.js

const showPurchaseDetailModal = (purchase) => {
    // Lấy các element từ modal mới
    const modal = document.getElementById('purchase-detail-modal');
    const titleEl = document.getElementById('purchase-detail-modal-title');
    const contentEl = document.getElementById('purchase-detail-modal-content');
    const closeModalBtn = document.getElementById('close-purchase-detail-modal-btn');
    const closeModalBtnFooter = document.getElementById('close-purchase-detail-modal-btn-footer');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');

    // Cập nhật nội dung cho popup
    titleEl.textContent = `Chi Tiết Phiếu Nhập: ${purchase.id}`;
    
    const itemsHtml = purchase.items.map((item, index) => `
        <tr class="border-b">
            <td class="p-2 text-center">${index + 1}</td>
            <td class="p-2">${item.name}</td>
            <td class="p-2 text-center">${item.quantity}</td>
        </tr>
    `).join('');

    contentEl.innerHTML = `
        <div class="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
            <div><strong>Nhà cung cấp:</strong> ${purchase.supplierName}</div>
            <div><strong>Ngày tạo:</strong> ${new Date(purchase.date).toLocaleString('vi-VN')}</div>
        </div>
        <table class="w-full">
            <thead class="uppercase bg-gray-100">
                <tr>
                    <th class="p-2 text-center w-16">STT</th>
                    <th class="p-2">Tên hàng</th>
                    <th class="p-2 text-center w-24">Số Lượng</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
        <div class="mt-4 pt-4 border-t text-right font-bold text-lg">
            Tổng số loại hàng: ${purchase.items.length}
        </div>
    `;

    // Gán sự kiện cho các nút
    const closeModal = () => modal.classList.add('hidden');
    closeModalBtn.onclick = closeModal;
    closeModalBtnFooter.onclick = closeModal;

    // Xóa listener cũ và gán listener mới cho nút tải PDF
    const newDownloadBtn = downloadPdfBtn.cloneNode(true);
    downloadPdfBtn.parentNode.replaceChild(newDownloadBtn, downloadPdfBtn);
    newDownloadBtn.addEventListener('click', () => {
        generateAndDownloadPDF(purchase);
    });

    // Hiển thị modal
    modal.classList.remove('hidden');
};

const generateAndDownloadPDF = (purchase) => {
    const { jsPDF } = window.jspdf;
    const elementToCapture = document.getElementById('purchase-detail-modal-content');
    
    alert('Đang chuẩn bị file PDF, vui lòng chờ...');

    html2canvas(elementToCapture, { scale: 2 }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const ratio = canvasWidth / canvasHeight;

        let imgWidth = pdfWidth - 20; // Trừ lề 10mm mỗi bên
        let imgHeight = imgWidth / ratio;

        if (imgHeight > pdfHeight - 20) {
            imgHeight = pdfHeight - 20;
            imgWidth = imgHeight * ratio;
        }
        
        const x = (pdfWidth - imgWidth) / 2;
        const y = 10; // Căn lề trên 10mm

        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
        pdf.save(`phieu-nhap-${purchase.id}.pdf`);
    }).catch(err => {
        console.error("Lỗi khi tạo PDF:", err);
        alert("Đã xảy ra lỗi khi tạo file PDF.");
    });
};