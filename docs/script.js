let inventory = JSON.parse(localStorage.getItem("inventory")) || {};
let history = JSON.parse(localStorage.getItem("history")) || [];
let alertMessage = document.getElementById("alertMessage");

function exportCSV() {
const inventoryData = Object.values(inventory).map(item => ({
Código: item.code,
Nome: item.name,
Quantidade: item.quantity
}));

const header = ['Código', 'Nome', 'Quantidade'];
const rows = inventoryData.map(item => [item.Código, item.Nome, item.Quantidade]);

let csvContent = "data:text/csv;charset=utf-8," + header.join(",") + "\n";
rows.forEach(row => {
csvContent += row.join(",") + "\n";
});

const encodedUri = encodeURI(csvContent);
const link = document.createElement("a");
link.setAttribute("href", encodedUri);
link.setAttribute("download", "estoque.csv");
link.click();
}

// Configuração do Firebase
const firebaseConfig = {
apiKey: "YOUR_API_KEY",
authDomain: "YOUR_AUTH_DOMAIN",
databaseURL: "YOUR_DATABASE_URL",
projectId: "YOUR_PROJECT_ID",
storageBucket: "YOUR_STORAGE_BUCKET",
messagingSenderId: "YOUR_SENDER_ID",
appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Função para carregar os dados do Firebase
function loadData() {
db.ref("estoque").on("value", function(snapshot) {
inventory = snapshot.val() || {};
updateTable();
});

db.ref("historico").on("value", function(snapshot) {
history = snapshot.val() || [];
updateHistoryTable();
});
}

// Função para salvar dados no Firebase
function saveData() {
db.ref("estoque").set(inventory);
db.ref("historico").set(history);
}

// Enviar dados via WebSocket
function sendToWebSocket(data) {
socket.send(JSON.stringify(data));
}

// WebSocket
const socket = new WebSocket('ws://localhost:8080');

// Função para receber e sincronizar os dados do WebSocket
socket.onmessage = function(event) {
const data = JSON.parse(event.data);
inventory = data.estoque;
history = data.historico;
updateTable();
updateHistoryTable();
};

// Função chamada ao adicionar um item
function addItem(event) {
event.preventDefault();

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

if (inventory[code] || Object.values(inventory).some(item => item.name.toLowerCase() === name.toLowerCase())) {
showAlert("Produto já cadastrado com o mesmo código ou nome.", true);
return;
}

inventory[code] = { name, quantity, responsible };
addHistory(code, name, "Entrada", quantity, responsible);

// Salvar no Firebase
saveData();

// Enviar os dados via WebSocket
sendToWebSocket({ estoque: inventory, historico: history });

updateTable();
clearInputFields();
showAlert("Produto cadastrado com sucesso!", false);
}

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', ws => {
console.log('Novo cliente conectado');
ws.on('message', message => {
console.log('Recebido: %s', message);
// Enviar dados para todos os clientes conectados
wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
    }
});
});
ws.send(JSON.stringify({ message: 'Conectado ao servidor WebSocket' }));
});


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

    // Verifica se o produto já existe pelo código ou nome
    if (inventory[code] || Object.values(inventory).some(item => item.name.toLowerCase() === name.toLowerCase())) {
        showAlert("Produto já cadastrado com o mesmo código ou nome.", true);
        return;
    }

    // Adiciona o produto ao estoque
    inventory[code] = { name, quantity };
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
        // Adiciona a classe de estoque baixo se necessário
        if (inventory[code].quantity < 20) {
            row.classList.add("low-stock");
            showAlert(`Estoque baixo para o item: ${inventory[code].name}`, true);
        }
        inventoryBody.appendChild(row);
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

    // Verifica se o estoque está baixo após a atualização
    if (inventory[code].quantity < 20) {
        showAlert(`Estoque baixo para o item: ${inventory[code].name}`, true);
    } else {
        // Remove a classe de estoque baixo se a quantidade for suficiente
        const rows = document.querySelectorAll("#inventoryBody tr");
        rows.forEach(row => {
            if (row.cells[0].textContent === code) {
                row.classList.remove("low-stock");
            }
        });
    }
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

    // Ocultar a notificação após 3 segundos
    setTimeout(() => {
        alertMessage.style.display = "none";
    }, 3000);
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
