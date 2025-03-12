let inventory = JSON.parse(localStorage.getItem("inventory")) || {};
let history = JSON.parse(localStorage.getItem("history")) || [];
let alertMessage = document.getElementById("alertMessage");

function addItem() {
    const code = document.getElementById("productCode").value;
    const name = document.getElementById("itemName").value;
    const quantity = parseInt(document.getElementById("itemQuantity").value);
    const responsible = document.getElementById("responsiblePerson").value;

    if (!code || !name || !quantity || !responsible) {
        showAlert("Todos os campos são obrigatórios.", true);
        return;
    }

    if (quantity <= 0) {
        showAlert("A quantidade deve ser maior que zero.", true);
        return;
    }

    if (inventory[code]) {
        inventory[code].quantity += quantity;
    } else {
        inventory[code] = { name, quantity };
    }

    addHistory(code, name, "Entrada", quantity, responsible);
    saveData();
    updateTable();
    clearInputFields();
    showAlert("Produto cadastrado com sucesso!", false);
}

function addHistory(code, name, type, quantity, responsible) {
    const date = new Date().toISOString(); // Armazena a data em formato ISO
    history.push({ code, name, type, quantity, responsible, date });
    saveData();
    updateHistoryTable();
}

function saveData() {
    localStorage.setItem("inventory", JSON.stringify(inventory));
    localStorage.setItem("history", JSON.stringify(history));
}

function updateTable() {
    const inventoryBody = document.getElementById("inventoryBody");
    inventoryBody.innerHTML = "";
    for (const code in inventory) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${code}</td>
            <td>${inventory[code].name}</td>
            <td>${inventory[code].quantity}</td>
            <td>
                <button class="btn-entry" onclick="updateQuantity('${code}', 'Entrada')">Entrada</button>
                <button class="btn-exit" onclick="updateQuantity('${code}', 'Saída')">Saída</button>
                <button class="btn-delete" onclick="deleteItem('${code}')">Excluir</button>
            </td>
        `;
        inventoryBody.appendChild(row);

        // Notificação de estoque baixo
        if (inventory[code].quantity < 5) {
            row.style.backgroundColor = "#f39c12"; // Alerta visual
            showAlert(`Estoque baixo para o item: ${inventory[code].name}`, true);
        }
    }
}

function deleteItem(code) {
    const itemName = inventory[code].name;
    delete inventory[code];
    addHistory(code, itemName, "Exclusão", 0, "Usuário");
    saveData();
    updateTable();
    showAlert(`${itemName} foi excluído do estoque!`, false);
}

function updateQuantity(code, type) {
    const quantity = parseInt(prompt(`Digite a quantidade de ${type.toLowerCase()} para o item ${inventory[code].name}:`));

    if (isNaN(quantity) || quantity <= 0) {
        showAlert("A quantidade deve ser maior que zero.", true);
        return;
    }

    if (type === "Saída" && inventory[code].quantity < quantity) {
        showAlert("Quantidade insuficiente em estoque.", true);
        return;
    }

    inventory[code].quantity += (type === "Entrada" ? quantity : -quantity);
    const responsible = "Usuário"; // Pode ser modificado com base no sistema de login
    addHistory(code, inventory[code].name, type, quantity, responsible);
    saveData();
    updateTable();
}

function updateHistoryTable() {
    const historyBody = document.getElementById("historyBody");
    historyBody.innerHTML = "";
    for (const item of history) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${item.type}</td>
            <td>${item.quantity}</td>
            <td>${item.responsible}</td>
            <td>${new Date(item.date).toLocaleString()}</td> <!-- Formato de data legível -->
        `;
        historyBody.appendChild(row);
    }
}

function filterHistory() {
    const filterType = document.getElementById("filterType").value;
    const filterValue = document.getElementById("filterValue").value.toLowerCase();
    const historyBody = document.getElementById("historyBody");
    historyBody.innerHTML = "";

    history.forEach(item => {
        let matches = false;

        if (filterType === "nome") {
            matches = item.name.toLowerCase().includes(filterValue);
        } else if (filterType === "responsavel") {
            matches = item.responsible.toLowerCase().includes(filterValue);
        } else if (filterType === "data") {
            const itemDate = new Date(item.date).toLocaleDateString();
            matches = itemDate.includes(filterValue);
        }

        if (matches) {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.code}</td>
                <td>${item.name}</td>
                <td>${item.type}</td>
                <td>${item.quantity}</td>
                <td>${item.responsible}</td>
                <td>${new Date(item.date).toLocaleString()}</td>
            `;
            historyBody.appendChild(row);
        }
    });

    // Se nenhum resultado for encontrado
    if (historyBody.innerHTML === "") {
        const row = document.createElement("tr");
        row.innerHTML = `<td colspan="6" style="text-align:center;">Nenhum registro encontrado.</td>`;
        historyBody.appendChild(row);
    }
}

function showAlert(message, isError) {
    alertMessage.textContent = message;
    alertMessage.style.display = "block";
    alertMessage.className = isError ? "alert error" : "alert success";
}

function showTab(tab) {
    document.querySelectorAll(".tab-content").forEach(content => content.classList.remove("active"));
    document.getElementById(tab).classList.add("active");
    document.querySelectorAll(".menu button").forEach(button => button.classList.remove("active"));
    document.getElementById(tab + "Tab").classList.add("active");
}

function updateFilterPlaceholder() {
    const filterType = document.getElementById("filterType").value;
    const filterValue = document.getElementById("filterValue");
    if (filterType === "data") {
        filterValue.type = "date";
        filterValue.placeholder = "Selecione uma data";
    } else {
        filterValue.type = "text";
        filterValue.placeholder = "Digite o valor";
    }
}

updateTable();
updateHistoryTable();
