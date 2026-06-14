// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE (Substitua pelos dados do seu Console Firebase)
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBu7DKMzV-LwEKcnDYK7Y-1q9pNSCHE7jE",
    authDomain: "pre-venda-4168c.firebaseapp.com",
    databaseURL: "https://pre-venda-4168c-default-rtdb.firebaseio.com/",
    projectId: "pre-venda-4168c",
    storageBucket: "pre-venda-4168c.firebasestorage.app",
    messagingSenderId: "113812783935",
    appId: "1:113812783935:web:2b1229abdd35be7b73898a"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// URL do seu Web App do Google Sheets (Para onde vai o comprovante PIX)
const GOOGLE_WEB_APP_URL = "COLE_AQUI_O_LINK_DO_APP_DA_WEB_DO_GOOGLE";

// ==========================================================================
// SELEÇÃO DE ELEMENTOS INTERNOS
// ==========================================================================
const viewAuth = document.getElementById('view-auth');
const viewCliente = document.getElementById('view-cliente');
const viewAdmin = document.getElementById('view-admin');

const modalFormEnvio = document.getElementById('modal-formulario-envio');
const modalDetalhesJogo = document.getElementById('modal-detalhes-jogo');
const gridCardsCliente = document.getElementById('grid-cards-cliente');
const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');

let usuarioLogadoUid = null;
let dadosClienteAtual = {};

// ==========================================================================
// NAVEGAÇÃO ENTRE TELAS DO APP
// ==========================================================================
function irParaTela(tela) {
    viewAuth.classList.remove('active');
    viewCliente.classList.remove('active');
    viewAdmin.classList.remove('active');
    tela.classList.add('active');
}

// Controle das Abas de Login/Cadastro
document.getElementById('tab-login').addEventListener('click', () => {
    document.getElementById('form-login').classList.add('active');
    document.getElementById('form-cadastro-auth').classList.remove('active');
    document.getElementById('tab-login').classList.add('active');
    document.getElementById('tab-cadastro').classList.remove('active');
});

document.getElementById('tab-cadastro').addEventListener('click', () => {
    document.getElementById('form-cadastro-auth').classList.add('active');
    document.getElementById('form-login').classList.remove('active');
    document.getElementById('tab-cadastro').classList.add('active');
    document.getElementById('tab-login').classList.add('active');
});

// ==========================================================================
// MONITOR DE SESSÃO (CORRIGIDO ANTI-TRAVAMENTO)
// ==========================================================================
auth.onAuthStateChanged(user => {
    if (user) {
        usuarioLogadoUid = user.uid;
        if (user.email === "admin@admin.com") {
            irParaTela(viewAdmin);
            inicializarPainelAdmin();
        } else {
            // Monitora os dados cadastrais do cliente em tempo real
            database.ref('usuarios/' + user.uid).on('value', snapshot => {
                const dados = snapshot.val();
                
                // AJUSTE SEGURO: Se o usuário logou mas não tem dados no banco ainda
                if (dados) {
                    dadosClienteAtual = dados;
                    document.getElementById('user-display-name').innerText = `${dados.nome} ${dados.sobrenome}`;
                    
                    const areaPendente = document.getElementById('area-compra-pendente');
                    if (dados.status_cadastro === "pago") {
                        areaPendente.style.display = "none";
                    } else {
                        areaPendente.style.display = "block";
                    }
                    
                    irParaTela(viewCliente);
                    ouvirCardsDoCliente(user.uid);
                } else {
                    // Caso o registro no banco não exista, desloga por segurança ou limpa a tela
                    document.getElementById('user-display-name').innerText = "Jogador Novo";
                    document.getElementById('area-compra-pendente').style.display = "block";
                    irParaTela(viewCliente);
                }
            });
        }
    } else {
        usuarioLogadoUid = null;
        irParaTela(viewAuth);
    }
});


function deslogar() {
    auth.signOut().then(() => location.reload());
}

// ==========================================================================
// AUTENTICAÇÃO: CRIAR CONTA E ACESSAR
// ==========================================================================
document.getElementById('form-cadastro-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cad-nome').value.trim();
    const sobrenome = document.getElementById('cad-sobrenome').value.trim();
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;

    try {
        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await database.ref('usuarios/' + credencial.user.uid).set({
            nome: nome,
            sobrenome: sobrenome,
            email: email,
            status_cadastro: "pendente_pagamento",
            jogos_liberados: {}
        });
    } catch (error) {
        alert("Erro ao criar conta: " + error.message);
    }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;

    try {
        await auth.signInWithEmailAndPassword(email, senha);
    } catch (error) {
        alert("Dados incorretos ou utilizador não encontrado: " + error.message);
    }
});

// ==========================================================================
// MODAL INTERNO DO FORMULÁRIO DE COMPRA
// ==========================================================================
document.getElementById('btn-abrir-formulario').addEventListener('click', () => modalFormEnvio.classList.add('active'));
document.getElementById('btn-fechar-form').addEventListener('click', () => modalFormEnvio.classList.remove('active'));

const inputComprovante = document.getElementById('comprovante');
const dropZone = document.getElementById('drop-zone');
const fileInfo = document.getElementById('file-info');

dropZone.addEventListener('click', () => inputComprovante.click());
inputComprovante.addEventListener('change', (e) => verificarArquivo(e.target.files[0]));

['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
});
['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
});
dropZone.addEventListener('drop', (e) => {
    inputComprovante.files = e.dataTransfer.files;
    verificarArquivo(e.dataTransfer.files[0]);
});

function verificarArquivo(file) {
    if (!file) return;
    if (file.type === "application/pdf" && file.size > 35840) {
        alert("⚠️ PDFs devem ter no máximo 35KB. Dica: Envie um print screen (foto) do PIX, elas são auto-comprimidas!");
        inputComprovante.value = "";
        fileInfo.innerText = "Use uma imagem ou PDF pequeno";
        return;
    }
    if (file.size > 1048576) {
        alert("⚠️ Arquivo maior que 1MB.");
        inputComprovante.value = "";
        return;
    }
    fileInfo.innerHTML = `✅ Pronto: <strong>${file.name}</strong>`;
}

const otimizarEConvertreParaBase64 = (file) => {
    return new Promise((resolve, reject) => {
        if (file.type === "application/pdf") {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (err) => reject(err);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > height ? width > 900 : height > 900) {
                    if (width > height) { height *= 900 / width; width = 900; }
                    else { width *= 900 / height; height = 900; }
                }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
    });
};

document.getElementById('form-comprovante').addEventListener('submit', async (e) => {
    e.preventDefault();
    const arquivo = inputComprovante.files[0];
    if (!arquivo) return alert("Anexe o comprovante!");

    const btn = document.getElementById('btn-enviar-tudo');
    btn.innerText = "COMPRIMINDO E ENVIANDO...";
    btn.disabled = true;

    try {
        const base64Str = await otimizarEConvertreParaBase64(arquivo);
        let base64Final = arquivo.type === "application/pdf" ? base64Str : base64Str.slice(0, 49000);

        const ext = arquivo.name.split('.').pop();
        const nomeFinal = `${dadosClienteAtual.nome}_${dadosClienteAtual.sobrenome}`.replace(/\s+/g, '_').toLowerCase() + `.${ext}`;

        await fetch(GOOGLE_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                nome: dadosClienteAtual.nome,
                sobrenome: dadosClienteAtual.sobrenome,
                whatsapp: "Interno-Auth",
                cidade: "Plataforma",
                estado: "Hub",
                nomeArquivo: nomeFinal,
                arquivoBase64: base64Final
            })
        });

        alert("🚀 Comprovante enviado com sucesso! Aguarde a liberação do administrador.");
        modalFormEnvio.classList.remove('active');
    } catch (error) {
        alert("Erro no envio: " + error.message);
    } finally {
        btn.innerText = "CONCLUIR INSCRIÇÃO";
        btn.disabled = false;
    }
});

// ==========================================================================
// RENDERIZAÇÃO DE JOGOS E POPUP FLUTUANTE COM PROTEÇÃO ANTI-CÓPIA
// ==========================================================================
function ouvirCardsDoCliente(uid) {
    database.ref(`usuarios/${uid}/jogos_liberados`).on('value', snapshot => {
        gridCardsCliente.innerHTML = "";
        const liberados = snapshot.val() || {};
        
        Object.keys(liberados).forEach(cardId => {
            database.ref(`cards_disponiveis/${cardId}`).once('value', cardSnap => {
                const card = cardSnap.val();
                if (card) {
                    const cardElement = document.createElement('div');
                    cardElement.className = 'game-card';
                    cardElement.innerHTML = `
                        <img src="${card.capa_url}" alt="${card.titulo}">
                        <h4>${card.titulo}</h4>
                    `;
                    cardElement.addEventListener('click', () => abrirModalJogo(card));
                    gridCardsCliente.appendChild(cardElement);
                }
            });
        });
    });
}

function abrirModalJogo(card) {
    const imgCapa = document.getElementById('modal-jogo-capa');
    imgCapa.src = card.capa_url;
    document.getElementById('modal-jogo-titulo').innerText = card.titulo;
    document.getElementById('modal-jogo-descricao').innerText = card.descricao;
    
    // CAMADA DE SEGURANÇA 2: Impede o usuário de clicar e arrastar a capa do jogo
    imgCapa.addEventListener('dragstart', (e) => e.preventDefault());

    const containerBotoes = document.getElementById('modal-jogo-botoes');
    containerBotoes.innerHTML = "";

    if (card.botoes && card.botoes.length > 0) {
        card.botoes.forEach(btn => {
            if (btn.texto && btn.url) {
                const a = document.createElement('a');
                a.className = 'btn-download-dinamico';
                a.href = btn.url;
                a.target = '_blank';
                a.innerText = btn.texto;
                
                // Anti-arrastar para os botões também (previne mover o link para a barra de abas)
                a.addEventListener('dragstart', (e) => e.preventDefault());
                
                containerBotoes.appendChild(a);
            }
        });
    }
    modalDetalhesJogo.classList.add('active');
}

function fecharModalJogo() {
    modalDetalhesJogo.classList.remove('active');
}

// CAMADA DE SEGURANÇA 1: Bloqueia 100% o Botão Direito (Menu de Contexto) dentro do Modal do Jogo
modalDetalhesJogo.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// CAMADA DE SEGURANÇA 3: Trava atalhos maliciosos de inspeção de código quando o modal está aberto
window.addEventListener('keydown', (e) => {
    if (modalDetalhesJogo.classList.contains('active')) {
        // Bloqueia F12
        if (e.key === "F12") {
            e.preventDefault();
            return false;
        }
        // Bloqueia Ctrl+Shift+I (Inspecionar) e Ctrl+U (Ver código-fonte)
        if (e.ctrlKey && (e.shiftKey && e.key === "I" || e.key === "u" || e.key === "U")) {
            e.preventDefault();
            return false;
        }
    }
});

// ==========================================================================
// PAINEL ADMINISTRATIVO: CRIAR CARDS E INJETAR EM USUÁRIOS
// ==========================================================================
function inicializarPainelAdmin() {
    database.ref('usuarios').on('value', snapshot => {
        listaUsuariosAdmin.innerHTML = "";
        const users = snapshot.val() || {};
        
        Object.keys(users).forEach(uid => {
            if (users[uid].email === "admin@admin.com") return;

            const userBox = document.createElement('div');
            userBox.className = 'user-item';
            
            userBox.innerHTML = `
                <div class="user-info">
                    <p><strong>Nome:</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                    <p><strong>E-mail:</strong> ${users[uid].email}</p>
                    <p><strong>Status:</strong> <span style="color: ${users[uid].status_cadastro === 'pago' ? '#00ff66' : '#ffaa00'}">${users[uid].status_cadastro.toUpperCase()}</span></p>
                </div>
                <select id="select-game-${uid}">
                    <option value="">-- Selecione o Card para Injetar --</option>
                </select>
                <button class="btn-inject" onclick="injetarCardParaUsuario('${uid}')">Liberar Jogo / Update Status</button>
            `;
            listaUsuariosAdmin.appendChild(userBox);
            
            alimentarSelectComCards(document.getElementById(`select-game-${uid}`), users[uid].jogos_liberados);
        });
    });
}

function alimentarSelectComCards(selectElement, jogosJaLiberados = {}) {
    database.ref('cards_disponiveis').once('value', snapshot => {
        const cards = snapshot.val() || {};
        Object.keys(cards).forEach(cardId => {
            const opt = document.createElement('option');
            opt.value = cardId;
            opt.innerText = cards[cardId].titulo + (jogosJaLiberados[cardId] ? " (Já Ativo)" : "");
            selectElement.appendChild(opt);
        });
    });
}

document.getElementById('form-criar-card').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const botoes = [];
    for (let i = 1; i <= 4; i++) {
        const txt = document.getElementById(`btn-txt-${i}`).value.trim();
        const url = document.getElementById(`btn-url-${i}`).value.trim();
        if (txt && url) botoes.push({ texto: txt, url: url });
    }

    const novoCard = {
        titulo: document.getElementById('card-titulo').value.trim(),
        capa_url: document.getElementById('card-capa').value.trim(),
        descricao: document.getElementById('card-descricao').value.trim(),
        botoes: botoes
    };

    try {
        await database.ref('cards_disponiveis').push(novoCard);
        alert("🎯 Card de Jogo criado com sucesso no Hub!");
        document.getElementById('form-criar-card').reset();
    } catch (error) {
        alert("Erro ao criar card: " + error.message);
    }
});

async function injetarCardParaUsuario(uid) {
    const selectedCardId = document.getElementById(`select-game-${uid}`).value;
    
    try {
        await database.ref(`usuarios/${uid}/status_cadastro`).set("pago");
        if (selectedCardId) {
            await database.ref(`usuarios/${uid}/jogos_liberados/${selectedCardId}`).set(true);
            alert("🔥 Card injetado e acesso concedido com sucesso!");
        } else {
            alert("Status atualizado para PAGO!");
        }
    } catch (error) {
        alert("Erro na operação admin: " + error.message);
    }
}
