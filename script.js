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

// URL do seu Web App do Google Sheets (Mantido para backup se desejar)
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
const inputWhatsApp = document.getElementById('cad-whatsapp');

let usuarioLogadoUid = null;
let dadosClienteAtual = {};

// Máscara em tempo real para o campo de WhatsApp: (00) 00000-0000
inputWhatsApp.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
    } else if (value.length > 2) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    } else if (value.length > 0) {
        value = `(${value}`;
    }
    e.target.value = value;
});

// ==========================================================================
// FILTRO CIRÚRGICO DE PROVEDORES DE E-MAIL CONVENCIONAIS
// ==========================================================================
function validarProvedorEmail(email) {
    const emailLimpo = email.trim().toLowerCase();
    
    // Libera o seu usuário de testes padrão
    if (emailLimpo === "teste@teste.com") return true;
    
    // Lista de domínios reais e convencionais do mercado
    const provedoresValidos = [
        "gmail.com", 
        "hotmail.com", 
        "outlook.com", 
        "outlook.com.br",
        "yahoo.com", 
        "yahoo.com.br", 
        "icloud.com", 
        "live.com", 
        "uol.com.br", 
        "terra.com.br",
        "bol.com.br",
        "ig.com.br",
        "oi.com.br"
    ];
    
    // Extrai o domínio que vem após a @
    const dominio = emailLimpo.split('@')[1];
    return provedoresValidos.includes(dominio);
}

// ==========================================================================
// NAVEGAÇÃO ENTRE TELAS DO APP
// ==========================================================================
function irParaTela(tela) {
    viewAuth.classList.remove('active');
    viewCliente.classList.remove('active');
    viewAdmin.classList.remove('active');
    tela.classList.add('active');
}

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
// MONITOR DE SESSÃO
// ==========================================================================
auth.onAuthStateChanged(user => {
    if (user) {
        usuarioLogadoUid = user.uid;
        if (user.email === "admin@admin.com") {
            irParaTela(viewAdmin);
            inicializarPainelAdmin();
        } else {
            database.ref('usuarios/' + user.uid).on('value', snapshot => {
                const dados = snapshot.val();
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
// AUTENTICAÇÃO: CRIAR CONTA COM FILTRO DE PROVEDOR REAL
// ==========================================================================
document.getElementById('form-cadastro-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cad-nome').value.trim();
    const sobrenome = document.getElementById('cad-sobrenome').value.trim();
    const whatsapp = inputWhatsApp.value.replace(/\D/g, "");
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;

    // AQUI OCORRE O BLOQUEIO SE NÃO FOR UM PROVEDOR CONVENCIONAL RECONHECIDO
    if (!validarProvedorEmail(email)) {
        alert("⚠️ Inscrição Recusada!\n\nPor favor, utilize um e-mail convencional válido (ex: @gmail.com, @hotmail.com, @outlook.com).\n\nEste endereço é obrigatório para que você consiga recuperar sua senha no futuro caso seja necessário!");
        return;
    }

    if (whatsapp.length < 10) {
        alert("⚠️ Insira um número de WhatsApp válido com DDD.");
        return;
    }

    try {
        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await database.ref('usuarios/' + credencial.user.uid).set({
            nome: nome,
            sobrenome: sobrenome,
            whatsapp: whatsapp,
            email: email,
            status_cadastro: "pendente_pagamento",
            comprovante_base64: "", // Nasce vazio esperando o upload
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
// FORMULÁRIO DE COMPRA INTERNO (COMPRESSÃO & SALVAMENTO NO DATABASE)
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
        alert("⚠️ PDFs devem ter no máximo 35KB. Dica: Envie uma imagem (print screen) do PIX, elas são comprimidas automaticamente!");
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

        // SALVAMENTO DIRETAMENTE NO DATABASE DO USUÁRIO PARA O ADMIN VER
        await database.ref(`usuarios/${usuarioLogadoUid}/comprovante_base64`).set(base64Final);
        await database.ref(`usuarios/${usuarioLogadoUid}/status_cadastro`).set("comprovante_enviado");

        // Backup opcional na planilha
        fetch(GOOGLE_WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                nome: dadosClienteAtual.nome,
                sobrenome: dadosClienteAtual.sobrenome,
                whatsapp: dadosClienteAtual.whatsapp || "Não informado",
                cidade: "Plataforma", estado: "Hub",
                nomeArquivo: "comprovante.jpg", arquivoBase64: base64Final
            })
        }).catch(err => console.log("Erro backup planilha"));

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
// RENDERIZAÇÃO DE JOGOS E POPUP FLUTUANTE (CLIENTE)
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

modalDetalhesJogo.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
window.addEventListener('keydown', (e) => {
    if (modalDetalhesJogo.classList.contains('active')) {
        if (e.key === "F12" || (e.ctrlKey && (e.shiftKey && e.key === "I" || e.key === "u" || e.key === "U"))) {
            e.preventDefault(); return false;
        }
    }
});

// ==========================================================================
// PAINEL ADMINISTRATIVO: VISUALIZAR COMPROVANTE & CONCEDER ACESSO
// ==========================================================================
function inicializarPainelAdmin() {
    database.ref('usuarios').on('value', snapshot => {
        listaUsuariosAdmin.innerHTML = "";
        const users = snapshot.val() || {};
        
        Object.keys(users).forEach(uid => {
            if (users[uid].email === "admin@admin.com") return;

            const userBox = document.createElement('div');
            userBox.className = 'user-item';
            
            // Verifica se existe um comprovante salvo para gerar o botão dinâmico
            const temComprovante = users[uid].comprovante_base64 && users[uid].comprovante_base64.length > 10;
            const botaoComprovante = temComprovante 
                ? `<button class="btn-visualizar-comprovante" onclick="abrirComprovanteNovaAba('${uid}')">👁️ Ver Comprovante Enviado</button>` 
                : `<p style="color:#ff3333; font-size:0.85rem; margin:5px 0;">Nenhum comprovante anexado ainda</p>`;

            userBox.innerHTML = `
                <div class="user-info">
                    <p><strong>Nome Completo:</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                    <p><strong>E-mail Cadastrado:</strong> ${users[uid].email}</p>
                    <p><strong>WhatsApp:</strong> ${users[uid].whatsapp || 'Não cadastrado'}</p>
                    <p><strong>Status Atual:</strong> <span style="color: ${users[uid].status_cadastro === 'pago' ? '#00ff66' : '#ffaa00'}">${users[uid].status_cadastro.toUpperCase()}</span></p>
                    ${botaoComprovante}
                </div>
                <select id="select-game-${uid}">
                    <option value="">-- Selecione o Card para Injetar --</option>
                </select>
                <button class="btn-inject" onclick="injetarCardParaUsuario('${uid}')">Confirmar Pagamento & Injetar Card</button>
            `;
            listaUsuariosAdmin.appendChild(userBox);
            
            alimentarSelectComCards(document.getElementById(`select-game-${uid}`), users[uid].jogos_liberados);
        });
    });
}

// Abre a string Base64 decodificada em uma aba independente para auditoria do Admin
function abrirComprovanteNovaAba(uid) {
    database.ref(`usuarios/${uid}/comprovante_base64`).once('value', snapshot => {
        const base64Data = snapshot.val();
        if (base64Data) {
            const novaAba = window.open();
            // Cria um ambiente HTML básico na aba nova contendo a mídia pura
            if (base64Data.startsWith("data:application/pdf")) {
                novaAba.document.write(`<iframe src="${base64Data}" width="100%" height="100%" style="border:none;"></iframe>`);
            } else {
                novaAba.document.write(`<body style="background:#0b0e14; margin:0; display:flex; align-items:center; justify-content:center;"><img src="${base64Data}" style="max-width:100%; max-height:100vh; border:2px solid #00ff66; border-radius:8px;"></body>`);
            }
        } else {
            alert("Não foi possível carregar o arquivo.");
        }
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
            alert("🔥 Pagamento Confirmado e Card Injetado!");
        } else {
            alert("Status atualizado para PAGO!");
        }
    } catch (error) {
        alert("Erro na operação admin: " + error.message);
    }
}
