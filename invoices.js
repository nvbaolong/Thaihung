document.addEventListener('DOMContentLoaded', async () => {
    // Helper function to remove Vietnamese diacritics
    const removeDiacritics = (str) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
    };

    const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);
    const formatDate = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('vi-VN'); // dd/mm/yyyy
    };

    let state = {
        invoices: [],
        suppliers: [],
        pagination: {
            currentPage: 1,
            rowsPerPage: 20,
            sortKey: 'date',
            sortDirection: 'desc'
        }
    };

    // --- DOM Elements ---
    const invoiceListBody = document.getElementById('invoice-list-body');
    const invoicePagination = document.getElementById('invoice-pagination');
    const invoiceSearchInput = document.getElementById('invoice-search');
    const addInvoiceBtn = document.getElementById('add-invoice-btn');

    // Invoice Modal
    const invoiceModal = document.getElementById('invoice-modal');
    const invoiceModalTitle = document.getElementById('invoice-modal-title');
    const closeInvoiceModalBtn = document.getElementById('close-invoice-modal-btn');
    const cancelInvoiceBtn = document.getElementById('cancel-invoice-btn');
    const saveInvoiceBtn = document.getElementById('save-invoice-btn');
    const invoiceForm = document.getElementById('invoice-form');

    // Inputs
    const invoiceIdInput = document.getElementById('invoice-id');
    const invoiceNumberInput = document.getElementById('invoice-number');
    const invoiceDateInput = document.getElementById('invoice-date');
    const invoiceSellerInput = document.getElementById('invoice-seller');
    const invoiceTotalInput = document.getElementById('invoice-total');
    const invoiceStatusInput = document.getElementById('invoice-status');
    const invoiceNoteInput = document.getElementById('invoice-note');

    // Supplier Autocomplete
    const sellerAutocompleteList = document.getElementById('seller-autocomplete-list');
    const quickAddSellerBtn = document.getElementById('quick-add-seller-btn');

    // Quick Supplier Modal
    const quickSupplierModal = document.getElementById('quick-supplier-modal');
    const quickSupplierNameInput = document.getElementById('quick-supplier-name');
    const closeQuickSupplierModalBtn = document.getElementById('close-quick-supplier-modal-btn');
    const saveQuickSupplierBtn = document.getElementById('save-quick-supplier-btn');

    // --- Data Loading ---
    const loadData = async () => {
        await db.init();
        state.invoices = await db.getAllInvoices();
        state.suppliers = await db.getAllSuppliers();
        renderInvoices();
    };

    // --- Rendering ---
    const renderInvoices = () => {
        let filtered = state.invoices;
        const query = removeDiacritics(invoiceSearchInput.value.toLowerCase().trim());

        if (query) {
            filtered = filtered.filter(inv =>
                removeDiacritics(inv.number.toLowerCase()).includes(query) ||
                removeDiacritics(inv.sellerName.toLowerCase()).includes(query)
            );
        }

        // Sorting
        filtered.sort((a, b) => {
            let valA = a[state.pagination.sortKey];
            let valB = b[state.pagination.sortKey];

            if (state.pagination.sortKey === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return state.pagination.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return state.pagination.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Pagination
        const start = (state.pagination.currentPage - 1) * state.pagination.rowsPerPage;
        const end = start + state.pagination.rowsPerPage;
        const paginated = filtered.slice(start, end);

        invoiceListBody.innerHTML = '';
        if (paginated.length === 0) {
            invoiceListBody.innerHTML = `<tr><td colspan="6" class="px-6 py-4 text-center text-gray-500">Không có hóa đơn nào</td></tr>`;
            return;
        }

        paginated.forEach(inv => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-gray-50 transition';

            let statusBadge = '';
            if (inv.status === 'paid') statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Đã Thanh Toán</span>`;
            else if (inv.status === 'partial') statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Thanh Toán 1 Phần</span>`;
            else statusBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Chưa Thanh Toán</span>`;

            row.innerHTML = `
                <td class="px-6 py-4 font-medium text-gray-900">${inv.number}</td>
                <td class="px-6 py-4">${inv.sellerName}</td>
                <td class="px-6 py-4 text-gray-500">${formatDate(inv.date)}</td>
                <td class="px-6 py-4 text-right font-bold text-gray-900">${formatCurrency(inv.total)}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4 text-center space-x-2">
                    <button class="text-blue-600 hover:text-blue-900" onclick="app.editInvoice('${inv.id}')"><i class="fas fa-edit"></i></button>
                    <button class="text-red-600 hover:text-red-900" onclick="app.deleteInvoice('${inv.id}')"><i class="fas fa-trash"></i></button>
                </td>
            `;
            invoiceListBody.appendChild(row);
        });

        renderPagination(filtered.length);
    };

    const renderPagination = (totalItems) => {
        invoicePagination.innerHTML = '';
        const totalPages = Math.ceil(totalItems / state.pagination.rowsPerPage);

        if (totalPages <= 1) return;

        const createBtn = (text, page, isActive = false) => {
            const btn = document.createElement('button');
            btn.className = `px-3 py-1 rounded border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`;
            btn.textContent = text;
            if (!isActive) {
                btn.onclick = () => {
                    state.pagination.currentPage = page;
                    renderInvoices();
                };
            }
            return btn;
        };

        if (state.pagination.currentPage > 1) {
            invoicePagination.appendChild(createBtn('«', state.pagination.currentPage - 1));
        }

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - state.pagination.currentPage) <= 1) {
                invoicePagination.appendChild(createBtn(i, i, i === state.pagination.currentPage));
            } else if (invoicePagination.lastChild.textContent !== '...') {
                const dots = document.createElement('span');
                dots.className = 'px-2';
                dots.textContent = '...';
                invoicePagination.appendChild(dots);
            }
        }

        if (state.pagination.currentPage < totalPages) {
            invoicePagination.appendChild(createBtn('»', state.pagination.currentPage + 1));
        }
    };

    // --- Actions ---
    const openModal = (invoice = null) => {
        invoiceForm.reset();
        sellerAutocompleteList.classList.add('hidden');

        if (invoice) {
            invoiceModalTitle.textContent = 'Chỉnh Sửa Hóa Đơn';
            invoiceIdInput.value = invoice.id;
            invoiceNumberInput.value = invoice.number;
            invoiceDateInput.value = invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : ''; // YYYY-MM-DD
            invoiceSellerInput.value = invoice.sellerName;
            invoiceTotalInput.value = new Intl.NumberFormat('vi-VN').format(invoice.total);
            invoiceStatusInput.value = invoice.status;
            invoiceNoteInput.value = invoice.note || '';
        } else {
            invoiceModalTitle.textContent = 'Tạo Hóa Đơn Mới';
            invoiceIdInput.value = '';
            invoiceDateInput.value = new Date().toISOString().split('T')[0]; // Today
        }
        invoiceModal.classList.remove('hidden');
    };

    const closeModal = () => {
        invoiceModal.classList.add('hidden');
    };

    const saveInvoice = async () => {
        const id = invoiceIdInput.value;
        const number = invoiceNumberInput.value.trim();
        const date = invoiceDateInput.value;
        const sellerName = invoiceSellerInput.value.trim();
        const totalRaw = invoiceTotalInput.value.replace(/\D/g, '');
        const total = parseFloat(totalRaw) || 0;
        const status = invoiceStatusInput.value;
        const note = invoiceNoteInput.value.trim();

        if (!number || !date || !sellerName) {
            alert('Vui lòng điền đầy đủ các trường bắt buộc (*)');
            return;
        }

        // Logic sync seller (optional: if seller doesn't exist, should we add it? 
        // Requirements said "seller part should be created new and managed synchronously".
        // Let's check if seller exists. If not, auto-add or just link by name?
        // Better to check and maybe auto-add if it's a simple text field action.
        // But to keep it consistent with "Quick Add", let's just save the name. 
        // Real syncing happens when we use the "Add Supplier" feature.
        // However, if the user types a new name, it technically "exists" on the invoice.
        // Let's assume strict syncing: user SHOULD pick from list or add new.
        // But for UX, if they type a name, let's allow it, but we won't add to Supplier DB automatically unless explicitly asked.
        // Wait, "quan ly dong bo" means they should be the same entity.
        // So I'll check if seller exists. If not, I'll silently add it to Suppliers?
        // Let's silently add it if it doesn't exist to ensure consistency.

        let seller = state.suppliers.find(s => s.name.toLowerCase() === sellerName.toLowerCase());
        if (!seller) {
            if (confirm(`Nhà cung cấp "${sellerName}" chưa có trong danh sách. Bạn có muốn thêm mới không?`)) {
                seller = { id: `NCC-${Date.now()}`, name: sellerName };
                await db.addSupplier(seller);
                state.suppliers.push(seller); // Update local state
            }
            // If they say no, should we block? Maybe just allow it as a text entry but warn?
            // Let's allow saving the invoice even if seller is not in DB, but prefer linking.
        }

        const invoiceData = {
            id: id || `INV-${Date.now()}`,
            number,
            date, // string YYYY-MM-DD
            sellerName,
            total,
            status,
            note
        };

        if (id) {
            await db.updateInvoice(invoiceData);
        } else {
            await db.addInvoice(invoiceData);
        }

        closeModal();
        await loadData();
    };

    const deleteInvoice = async (id) => {
        if (confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) {
            await db.deleteInvoice(id);
            await loadData();
        }
    };

    // --- Autocomplete Logic ---
    const showSellerAutocomplete = (query) => {
        const normalizedQuery = removeDiacritics(query.toLowerCase());
        const matches = state.suppliers.filter(s => removeDiacritics(s.name.toLowerCase()).includes(normalizedQuery));

        sellerAutocompleteList.innerHTML = '';
        if (matches.length > 0) {
            matches.forEach(s => {
                const div = document.createElement('div');
                div.className = 'px-3 py-2 hover:bg-blue-50 cursor-pointer text-gray-700';
                div.textContent = s.name;
                div.onclick = () => {
                    invoiceSellerInput.value = s.name;
                    sellerAutocompleteList.classList.add('hidden');
                };
                sellerAutocompleteList.appendChild(div);
            });
            sellerAutocompleteList.classList.remove('hidden');
        } else {
            sellerAutocompleteList.classList.add('hidden');
        }
    };

    // --- Event Listeners ---
    addInvoiceBtn.onclick = () => openModal();
    closeInvoiceModalBtn.onclick = closeModal;
    cancelInvoiceBtn.onclick = closeModal;
    saveInvoiceBtn.onclick = saveInvoice;

    invoiceSearchInput.oninput = () => {
        state.pagination.currentPage = 1;
        renderInvoices();
    };

    document.getElementById('sort-date').onclick = () => {
        if (state.pagination.sortKey === 'date') {
            state.pagination.sortDirection = state.pagination.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.pagination.sortKey = 'date';
            state.pagination.sortDirection = 'desc';
        }
        renderInvoices();
    };

    // Format money input
    invoiceTotalInput.oninput = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? new Intl.NumberFormat('vi-VN').format(val) : '';
    };

    // Autocomplete events
    invoiceSellerInput.oninput = (e) => showSellerAutocomplete(e.target.value);
    invoiceSellerInput.onfocus = (e) => showSellerAutocomplete(e.target.value); // Show all on focus? Maybe limit to top 10

    // Hide autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        if (!invoiceSellerInput.contains(e.target) && !sellerAutocompleteList.contains(e.target)) {
            sellerAutocompleteList.classList.add('hidden');
        }
    });

    // Quick Add Supplier Logic
    quickAddSellerBtn.onclick = () => {
        quickSupplierNameInput.value = invoiceSellerInput.value || '';
        quickSupplierModal.classList.remove('hidden');
        quickSupplierNameInput.focus();
    };

    closeQuickSupplierModalBtn.onclick = () => quickSupplierModal.classList.add('hidden');

    saveQuickSupplierBtn.onclick = async () => {
        const name = quickSupplierNameInput.value.trim();
        if (!name) return alert('Vui lòng nhập tên nhà cung cấp');

        // Check duplicate
        if (state.suppliers.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            return alert('Nhà cung cấp này đã tồn tại');
        }

        const newSupplier = { id: `NCC-${Date.now()}`, name };
        await db.addSupplier(newSupplier);
        state.suppliers.push(newSupplier);

        invoiceSellerInput.value = name; // Fill input
        quickSupplierModal.classList.add('hidden');
        alert('Đã thêm nhà cung cấp mới');
    }

    // Export Global
    window.app = {
        editInvoice: async (id) => {
            const invoice = state.invoices.find(i => i.id === id);
            if (invoice) openModal(invoice);
        },
        deleteInvoice: deleteInvoice
    };

    // --- Gemini AI Logic ---
    const scanInvoiceBtn = document.getElementById('scan-invoice-btn');
    const invoiceFileInput = document.getElementById('invoice-file-input');
    const apiKeyModal = document.getElementById('api-key-modal');
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const closeApiKeyModalBtn = document.getElementById('close-api-key-modal-btn');
    const processingOverlay = document.getElementById('processing-overlay');

    const GEMINI_API_KEY_KEY = 'gemini_api_key';

    const getGeminiKey = () => localStorage.getItem(GEMINI_API_KEY_KEY);
    const setGeminiKey = (key) => localStorage.setItem(GEMINI_API_KEY_KEY, key);

    scanInvoiceBtn.onclick = () => {
        const key = getGeminiKey();
        if (!key) {
            apiKeyModal.classList.remove('hidden');
        } else {
            invoiceFileInput.click();
        }
    };

    closeApiKeyModalBtn.onclick = () => apiKeyModal.classList.add('hidden');

    saveApiKeyBtn.onclick = () => {
        const key = geminiApiKeyInput.value.trim();
        if (!key) return alert('Vui lòng nhập API Key');
        setGeminiKey(key);
        apiKeyModal.classList.add('hidden');
        invoiceFileInput.click();
    };

    invoiceFileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset input for next selection
        e.target.value = '';

        processingOverlay.classList.remove('hidden');

        try {
            const base64 = await fileToBase64(file);
            const data = await analyzeInvoiceWithGemini(base64, file.type);

            processingOverlay.classList.add('hidden');

            if (data) {
                // Open modal and pre-fill
                openModal();
                if (data.invoice_number) invoiceNumberInput.value = data.invoice_number;
                if (data.date) {
                    // Try to parse date 'dd/mm/yyyy' or 'yyyy-mm-dd' to 'yyyy-mm-dd' for input type=date
                    // Simple heuristic
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                        invoiceDateInput.value = d.toISOString().split('T')[0];
                    }
                }
                if (data.seller_name) invoiceSellerInput.value = data.seller_name;
                if (data.total_amount) {
                    // Check if total_amount is number or string with currency
                    let amount = data.total_amount;
                    if (typeof amount === 'string') {
                        amount = parseFloat(amount.replace(/[^0-9.]/g, ''));
                    }
                    if (!isNaN(amount)) {
                        invoiceTotalInput.value = new Intl.NumberFormat('vi-VN').format(amount);
                    }
                }
                if (data.note) invoiceNoteInput.value = data.note;

                alert('Đã phân tích hóa đơn thành công! Vui lòng kiểm tra lại thông tin.');
            }
        } catch (error) {
            console.error(error);
            processingOverlay.classList.add('hidden');
            alert('Lỗi khi phân tích hóa đơn: ' + error.message);
        }
    };

    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
                if ((encoded.length % 4) > 0) {
                    encoded += '='.repeat(4 - (encoded.length % 4));
                }
                resolve(encoded);
            };
            reader.onerror = error => reject(error);
        });
    };

    const analyzeInvoiceWithGemini = async (base64Image, mimeType) => {
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error('API Key not found');

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        // Prompt for Gemini
        const promptText = `
            Please analyze this invoice image and extract the following information in JSON format:
            {
                "invoice_number": "string",
                "date": "YYYY-MM-DD",
                "seller_name": "string",
                "total_amount": number (integer or float),
                "note": "string (summary of items or any special note)"
            }
            If a field is missing, return null. 
            For date, try to convert to YYYY-MM-DD format.
            For seller_name, extract the main business name.
            For total_amount, just the final total number.
        `;

        const payload = {
            contents: [{
                parts: [
                    { text: promptText },
                    {
                        inline_data: {
                            mime_type: mimeType || 'image/jpeg',
                            data: base64Image
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errBody}`);
        }

        const result = await response.json();

        try {
            const textResponse = result.candidates[0].content.parts[0].text;
            // Extract JSON from potential markdown code blocks
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return JSON.parse(textResponse);
        } catch (e) {
            console.error('Failed to parse Gemini response:', result);
            throw new Error('Không thể đọc kết quả từ AI (Kết quả không đúng định dạng JSON).');
        }
    };

    // Init
    loadData();
});
