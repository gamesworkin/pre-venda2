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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// URL do seu Web App do Google Sheets (Mantido para fins de backup)
const GOOGLE_WEB_APP_URL = "COLE_AQUI_O_LINK_DO_APP_DA_WEB_DO_GOOGLE";

// Elementos HTML
const viewAuth = document.getElementById('view-auth');
const viewCliente = document.getElementById('view-cliente');
const viewAdmin = document.getElementById('view-admin');
const modalFormEnvio = document.getElementById('modal-formulario-envio');
const modalDetalhesJogo = document.getElementById('modal-detalhes-jogo');
const gridCardsCliente = document.getElementById('grid-cards-cliente');
const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');
const listaCardsCriados = document.getElementById('lista-cards-criados');
const inputWhatsApp = document.getElementById('cad-whatsapp');

let usuarioLogadoUid = null;
let dadosClienteAtual = {};
let filtroAdminAtual = "pendentes"; // Controla qual aba de clientes está ativa: 'pendentes' ou 'concluidos'

// Máscara WhatsApp em tempo real: (00) 00000-0000
inputWhatsApp.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 6) { value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`; }
    else if (value.length > 2) { value = `(${value.slice(0, 2)}) ${value.slice(2)}`; }
    else if (value.length > 0) { value = `(${value}`; }
    e.target.value = value;
});

// Filtro cirúrgico de provedores convencionais
function validarProvedorEmail(email) {
    const emailLimpo = email.trim().toLowerCase();
    if (emailLimpo === "teste@teste.com") return true; // Exceção autorizada
    const provedoresValidos = ["gmail.com", "hotmail.com", "outlook.com", "outlook.com.br", "yahoo.com", "yahoo.com.br", "icloud.com", "live.com", "uol.com.br", "terra.com.br", "bol.com.br"];
    const dominio = emailLimpo.split('@')[1];
    return provedoresValidos.includes(dominio);
}

function irParaTela(tela) {
    viewAuth.classList.remove('active');
    viewCliente.classList.remove('active');
    viewAdmin.classList.remove('active');
    tela.classList.add('active');
}

// Chaves de Abas Login/Cadastro
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
    document.getElementById('tab-login').classList.remove('active');
});

// Chaves de Abas do Gerenciador de Clientes (Admin)
document.getElementById('tab-solic-pendentes').addEventListener('click', () => {
    filtroAdminAtual = "pendentes";
    document.getElementById('tab-solic-pendentes').classList.add('active');
    document.getElementById('tab-solic-concluidos').classList.remove('active');
    inicializarPainelAdmin();
});
document.getElementById('tab-solic-concluidos').addEventListener('click', () => {
    filtroAdminAtual = "concluidos";
    document.getElementById('tab-solic-concluidos').classList.add('active');
    document.getElementById('tab-solic-pendentes').classList.remove('active');
    inicializarPainelAdmin();
});

// ==========================================================================
// MONITOR DE SESSÃO (FLUXO CONTÍNUO DE COMPRAS ATIVO)
// ==========================================================================
auth.onAuthStateChanged(user => {
    if (user) {
        usuarioLogadoUid = user.uid;
        if (user.email === "admin@admin.com") {
            irParaTela(viewAdmin);
            inicializarPainelAdmin();
            ouvirCardsGlobaisAdmin();
        } else {
            database.ref('usuarios/' + user.uid).on('value', snapshot => {
                const dados = snapshot.val();
                if (dados) {
                    dadosClienteAtual = dados;
                    document.getElementById('user-display-name').innerText = `${dados.nome} ${dados.sobrenome}`;
                    
                    // O container de alertas fica permanentemente visível para compras recorrentes
                    const areaPendente = document.getElementById('area-compra-pendente');
                    areaPendente.style.display = "block"; 
                    
                    // Ajuste de títulos e mensagens dinâmicas conforme o status da esteira contínua
                    if (dados.status_cadastro === "pago") {
                        areaPendente.querySelector('h3').innerText = "Adquira as Novas Versões!";
                        areaPendente.querySelector('p').innerText = "Deseja garantir o novo Patch lançado? Envie o comprovante abaixo!";
                    } else if (dados.status_cadastro === "comprovante_enviado") {
                        areaPendente.querySelector('h3').innerText = "⏳ Comprovante em Análise";
                        areaPendente.querySelector('p').innerText = "Seu comprovante foi enviado ao Admin. Aguarde a liberação do seu novo Card!";
                    } else {
                        areaPendente.querySelector('h3').innerText = "Você ainda não possui jogos ativos!";
                        areaPendente.querySelector('p').innerText = "Envie o seu comprovante para liberar o seu acesso instantâneo ao Hub.";
                    }
                    
                    irParaTela(viewCliente);
                    ouvirCardsDoCliente(user.uid);
                }
            });
        }
    } else {
        usuarioLogadoUid = null;
        irParaTela(viewAuth);
    }
});

function deslogar() { auth.signOut().then(() => location.reload()); }

// Registro e Login
document.getElementById('form-cadastro-auth').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('cad-nome').value.trim();
    const sobrenome = document.getElementById('cad-sobrenome').value.trim();
    const whatsapp = inputWhatsApp.value.replace(/\D/g, "");
    const email = document.getElementById('cad-email').value.trim();
    const senha = document.getElementById('cad-senha').value;

    if (!validarProvedorEmail(email)) {
        alert("⚠️ Inscrição Recusada! Utilize um e-mail legítimo/convencional (Gmail, Hotmail, etc) para garantir o suporte e redefinição de senha!");
        return;
    }
    try {
        const credencial = await auth.createUserWithEmailAndPassword(email, senha);
        await database.ref('usuarios/' + credencial.user.uid).set({
            nome: nome, sobrenome: sobrenome, whatsapp: whatsapp, email: email,
            status_cadastro: "pendente_pagamento", comprovante_base64: "", jogos_liberados: {}
        });
    } catch (error) { alert("Erro ao cadastrar: " + error.message); }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    try { await auth.signInWithEmailAndPassword(email, senha); } catch (error) { alert("Dados incorretos: " + error.message); }
});

// Envio de Mídia do Comprovante (Com Otimizador Integrado)
document.getElementById('btn-abrir-formulario').addEventListener('click', () => modalFormEnvio.classList.add('active'));
document.getElementById('btn-fechar-form').addEventListener('click', () => modalFormEnvio.classList.remove('active'));

const inputComprovante = document.getElementById('comprovante');
const dropZone = document.getElementById('drop-zone');
const fileInfo = document.getElementById('file-info');
dropZone.addEventListener('click', () => inputComprovante.click());
inputComprovante.addEventListener('change', (e) => verificarArquivo(e.target.files[0]));

function verificarArquivo(file) {
    if (!file) return;
    if (file.size > 1048576) { alert("Arquivo maior que 1MB."); inputComprovante.value = ""; return; }
    fileInfo.innerHTML = `✅ Selecionado: <strong>${file.name}</strong>`;
}

const converterBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result); reader.onerror = (err) => reject(err);
    });
};

document.getElementById('form-comprovante').addEventListener('submit', async (e) => {
    e.preventDefault();
    const arquivo = inputComprovante.files[0];
    if (!arquivo) return alert("Anexe o arquivo!");
    const btn = document.getElementById('btn-enviar-tudo');
    btn.innerText = "ENVIANDO..."; btn.disabled = true;

    try {
        const base64Str = await converterBase64(arquivo);
        // Garante margem segura de caracteres
        let base64Final = arquivo.type === "application/pdf" ? base64Str : base64Str.slice(0, 49000);

        // Injeta no banco e reseta o status para reanalisar no Admin (Fluxo contínuo)
        await database.ref(`usuarios/${usuarioLogadoUid}/comprovante_base64`).set(base64Final);
        await database.ref(`usuarios/${usuarioLogadoUid}/status_cadastro`).set("comprovante_enviado");
        
        alert("🚀 Comprovante enviado com sucesso! Aguarde a liberação do administrador.");
        modalFormEnvio.classList.remove('active');
    } catch (error) { alert("Erro: " + error.message); }
    finally { btn.innerText = "CONCLUIR INSCRIÇÃO"; btn.disabled = false; }
});

// Renderização dos Cards no Cliente
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
                    cardElement.innerHTML = `<img src="${card.capa_url}"><h4>${card.titulo}</h4>`;
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
    
    // CAMADA ANTI-PIRATARIA 2: Impede arrastar imagem/capa
    imgCapa.addEventListener('dragstart', (e) => e.preventDefault());

    const container = document.getElementById('modal-jogo-botoes');
    container.innerHTML = "";
    if (card.botoes) {
        card.botoes.forEach(btn => {
            const a = document.createElement('a');
            a.className = 'btn-download-dinamico'; a.href = btn.url; a.target = '_blank'; a.innerText = btn.texto;
            a.addEventListener('dragstart', (e) => e.preventDefault());
            container.appendChild(a);
        });
    }
    modalDetalhesJogo.classList.add('active');
}
function fecharModalJogo() { modalDetalhesJogo.classList.remove('active'); }

// CAMADA ANTI-PIRATARIA 1 & 3: Trava botão direito e atalhos F12/Ctrl+U
modalDetalhesJogo.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; });
window.addEventListener('keydown', (e) => {
    if (modalDetalhesJogo.classList.contains('active')) {
        if (e.key === "F12" || (e.ctrlKey && (e.shiftKey && e.key === "I" || e.key === "u" || e.key === "U"))) {
            e.preventDefault(); return false;
        }
    }
});

// ==========================================================================
// CONTROLE DE CARDS DE JOGOS (ADMIN) - CRIAR, EDITAR, DELETAR, EXPORTAR
// ==========================================================================
document.getElementById('form-criar-card').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idEdicao = document.getElementById('card-id-edicao').value;
    
    const botoes = [];
    for (let i = 1; i <= 4; i++) {
        const txt = document.getElementById(`btn-txt-${i}`).value.trim();
        const url = document.getElementById(`btn-url-${i}`).value.trim();
        if (txt && url) botoes.push({ texto: txt, url: url });
    }

    const dadosCard = {
        titulo: document.getElementById('card-titulo').value.trim(),
        capa_url: document.getElementById('card-capa').value.trim(),
        descricao: document.getElementById('card-descricao').value.trim(),
        botoes: botoes
    };

    try {
        if (idEdicao) {
            await database.ref(`cards_disponiveis/${idEdicao}`).set(dadosCard);
            alert("🔄 Card atualizado com sucesso em tempo real em todo o sistema!");
            cancelarEdicaoCard();
        } else {
            await database.ref('cards_disponiveis').push(dadosCard);
            alert("🎯 Novo Card de jogo criado com sucesso!");
            document.getElementById('form-criar-card').reset();
        }
    } catch (error) { alert("Erro ao salvar card: " + error.message); }
});

function ouvirCardsGlobaisAdmin() {
    database.ref('cards_disponiveis').on('value', snapshot => {
        listaCardsCriados.innerHTML = "";
        const cards = snapshot.val();
        if (!cards) {
            listaCardsCriados.innerHTML = `<p style="color:#aaa; font-size:0.9rem;">Nenhum card criado.</p>`;
            return;
        }
        Object.keys(cards).forEach(id => {
            const div = document.createElement('div');
            div.className = 'user-item';
            div.style.borderLeft = "3px solid #ffaa00";
            div.innerHTML = `
                <div style="display:flex; gap:10px; align-items:center;">
                    <img src="${cards[id].capa_url}" style="width:40px; height:50px; object-fit:cover; border-radius:4px;">
                    <div>
                        <p style="margin:0; font-weight:bold; color:#fff;">${cards[id].titulo}</p>
                        <p style="margin:0; font-size:0.75rem; color:#aaa;">${cards[id].botoes ? cards[id].botoes.length : 0} Versões/Links</p>
                    </div>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                    <button class="btn-visualizar-comprovante" style="margin:0; background:#24334c; border-color:#00ff66; color:#00ff66;" onclick="carregarCardParaEdicao('${id}')">✏️ Editar</button>
                    <button class="btn-visualizar-comprovante" style="margin:0; background:#3d1c1c; border-color:#ff3333; color:#ff3333;" onclick="deletarCardDoSistema('${id}')">🗑️ Apagar</button>
                </div>
            `;
            listaCardsCriados.appendChild(div);
        });
    });
}

function carregarCardParaEdicao(id) {
    database.ref(`cards_disponiveis/${id}`).once('value', snapshot => {
        const card = snapshot.val();
        if (!card) return;
        document.getElementById('card-id-edicao').value = id;
        document.getElementById('card-titulo').value = card.titulo;
        document.getElementById('card-capa').value = card.capa_url;
        document.getElementById('card-descricao').value = card.descricao;
        
        for(let i=1; i<=4; i++) {
            document.getElementById(`btn-txt-${i}`).value = "";
            document.getElementById(`btn-url-${i}`).value = "";
        }
        if (card.botoes) {
            card.botoes.forEach((btn, index) => {
                document.getElementById(`btn-txt-${index+1}`).value = btn.texto;
                document.getElementById(`btn-url-${index+1}`).value = btn.url;
            });
        }
        document.getElementById('titulo-form-card').innerText = "✏️ Editando Card de Jogo";
        document.getElementById('btn-cancelar-edicao').style.display = "block";
        document.getElementById('btn-salvar-card').innerText = "ATUALIZAR CARD";
    });
}

function cancelarEdicaoCard() {
    document.getElementById('card-id-edicao').value = "";
    document.getElementById('form-criar-card').reset();
    document.getElementById('titulo-form-card').innerText = "1. Criar Novo Card de Jogo";
    document.getElementById('btn-cancelar-edicao').style.display = "none";
    document.getElementById('btn-salvar-card').innerText = "SALVAR CARD";
}
document.getElementById('btn-cancelar-edicao').addEventListener('click', cancelarEdicaoCard);

async function deletarCardDoSistema(id) {
    if (confirm("⚠️ Tem certeza que quer APAGAR este card? Ele sumirá do sistema e de todas as contas vinculadas!")) {
        await database.ref(`cards_disponiveis/${id}`).remove();
        alert("Card excluído com sucesso.");
    }
}

document.getElementById('btn-exportar-cards').addEventListener('click', () => {
    database.ref('cards_disponiveis').once('value', snapshot => {
        const data = snapshot.val();
        if(!data) return alert("Nenhum card para exportar.");
        const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'backup-cards-streamhub.json'; a.click();
    });
});

// ==========================================================================
// PAINEL ADMINISTRATIVO: SEPARAÇÃO QUALIFICADA EM ABAS E CONTROLE INTEGRAL
// ==========================================================================
function inicializarPainelAdmin() {
    database.ref('usuarios').on('value', snapshot => {
        listaUsuariosAdmin.innerHTML = "";
        const users = snapshot.val();
        if (!users) {
            listaUsuariosAdmin.innerHTML = `<p style="color:#aaa; padding:15px;">Nenhum usuário registrado.</p>`;
            return;
        }

        let contagemFiltrados = 0;

        Object.keys(users).forEach(uid => {
            if (users[uid].email === "admin@admin.com") return;

            const isPago = users[uid].status_cadastro === "pago";
            
            // Separação cirúrgica de abas dinâmicas
            if (filtroAdminAtual === "pendentes" && isPago) return;
            if (filtroAdminAtual === "concluidos" && !isPago) return;

            contagemFiltrados++;
            const userBox = document.createElement('div');
            userBox.className = 'user-item';

            // ABA 1: PENDENTES / ENVIADOS
            if (filtroAdminAtual === "pendentes") {
                const temComp = users[uid].comprovante_base64 && users[uid].comprovante_base64.length > 10;
                const btnComp = temComp 
                    ? `<button class="btn-visualizar-comprovante" onclick="abrirComprovanteNovaAba('${uid}')">👁️ Ver Comprovante Enviado</button>`
                    : `<p style="color:#ffaa00; font-size:0.8rem; margin:5px 0;">⏳ Aguardando comprovante PIX...</p>`;

                userBox.innerHTML = `
                    <div class="user-info">
                        <p><strong>Jogador:</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                        <p><strong>E-mail:</strong> ${users[uid].email}</p>
                        <p><strong>WhatsApp:</strong> ${users[uid].whatsapp || 'Não cadastrado'}</p>
                        <p><strong>Status:</strong> <span style="color:#ffaa00">${(users[uid].status_cadastro || 'pendente').toUpperCase()}</span></p>
                        ${btnComp}
                    </div>
                    <select id="select-game-${uid}" style="margin-bottom:10px;">
                        <option value="">-- Selecione o Card para Injetar --</option>
                    </select>
                    <button class="btn-inject" onclick="injetarCardParaUsuario('${uid}')">Confirmar Pagamento & Liberar Hub</button>
                `;
            } 
            // ABA 2: ACESSOS JÁ LIBERADOS
            else {
                let listaJogosAtivosHtml = "";
                const jogos = users[uid].jogos_liberados || {};
                const keysJogos = Object.keys(jogos);

                if (keysJogos.length === 0) {
                    listaJogosAtivosHtml = "<li style='color:#ff3333;'>Nenhum card ativo no momento</li>";
                } else {
                    keysJogos.forEach(gameId => {
                        listaJogosAtivosHtml += `
                            <li style="display:flex; justify-content:space-between; align-items:center; background:#141d26; padding:5px; margin:3px 0; border-radius:4px; font-size:0.8rem;">
                                <span>🎮 ID: ${gameId.slice(-6)}...</span>
                                <button onclick="removerAcessoJogo('${uid}', '${gameId}')" style="background:none; border:none; color:#ff3333; cursor:pointer; font-weight:bold;">[Remover Acesso]</button>
                            </li>
                        `;
                    });
                }

                userBox.innerHTML = `
                    <div class="user-info">
                        <p><strong>Jogador Aprovado:</strong> ${users[uid].nome} ${users[uid].sobrenome}</p>
                        <p><strong>Contato WhatsApp:</strong> ${users[uid].whatsapp || 'Não cadastrado'}</p>
                        <p><strong>E-mail:</strong> ${users[uid].email}</p>
                        <div style="margin: 10px 0; background:#1b2430; padding:8px; border-radius:4px;">
                            <p style="margin:0 0 5px 0; font-size:0.8rem; font-weight:bold; color:#00ff66;">Cards Ativos na Conta:</p>
                            <ul style="margin:0; padding:0; list-style:none;">${listaJogosAtivosHtml}</ul>
                        </div>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <select id="select-game-${uid}" style="margin:0; flex:1; height:35px;">
                            <option value="">+ Injetar Novo Card Cumulativo</option>
                        </select>
                        <button class="btn-gamer" onclick="injetarCardParaUsuario('${uid}')" style="margin:0; height:35px; width:auto; padding:0 10px;">+</button>
                    </div>
                    <button class="btn-sair" onclick="excluirSolicitacaoEComprovante('${uid}')" style="width:100%; font-size:0.8rem; padding:6px; margin-top:10px; background:#2d1313; border:1px solid #ff3333; color:#ff3333;">🗑️ Resetar Solicitação / Limpar Armazenamento</button>
                `;
            }

            listaUsuariosAdmin.appendChild(userBox);
            alimentarSelectComCards(document.getElementById(`select-game-${uid}`), users[uid].jogos_liberados);
        });

        if (contagemFiltrados === 0) {
            listaUsuariosAdmin.innerHTML = `<p style="color:#aaa; padding:15px; text-align:center;">Nenhum registro nesta aba no momento.</p>`;
        }
    });
}

function abrirComprovanteNovaAba(uid) {
    database.ref(`usuarios/${uid}/comprovante_base64`).once('value', snapshot => {
        const base64Data = snapshot.val();
        if (base64Data) {
            const novaAba = window.open();
            if (base64Data.startsWith("data:application/pdf")) {
                novaAba.document.write(`<iframe src="${base64Data}" width="100%" height="100%" style="border:none;"></iframe>`);
            } else {
                novaAba.document.write(`<body style="background:#0b0e14; margin:0; display:flex; align-items:center; justify-content:center;"><img src="${base64Data}" style="max-width:100%; max-height:100vh; border:2px solid #00ff66; border-radius:8px;"></body>`);
            }
        } else { alert("Mídia indisponível ou corrompida."); }
    });
}

function alimentarSelectComCards(selectElement, jogosJaLiberados = {}) {
    if (!selectElement) return;
    database.ref('cards_disponiveis').once('value', snapshot => {
        const cards = snapshot.val() || {};
        Object.keys(cards).forEach(cardId => {
            const opt = document.createElement('option');
            opt.value = cardId;
            opt.innerText = cards[cardId].titulo + (jogosJaLiberados[cardId] ? " (Já Liberado)" : "");
            selectElement.appendChild(opt);
        });
    });
}

async function injetarCardParaUsuario(uid) {
    const selectedCardId = document.getElementById(`select-game-${uid}`).value;
    try {
        // Modifica o status para pago
        await database.ref(`usuarios/${uid}/status_cadastro`).set("pago");
        if (selectedCardId) {
            // Adiciona o novo card de forma cumulativa sem sobrescrever os anteriores
            await database.ref(`usuarios/${uid}/jogos_liberados/${selectedCardId}`).set(true);
            alert("🔥 Sucesso! Card injetado de forma contínua!");
        } else {
            alert("Status atualizado para PAGO!");
        }
    } catch (error) { alert("Erro: " + error.message); }
}

async function removerAcessoJogo(uid, gameId) {
    if (confirm("Quer realmente REMOVER o acesso deste card específico da conta deste jogador?")) {
        await database.ref(`usuarios/${uid}/jogos_liberados/${gameId}`).remove();
        alert("Acesso removido com sucesso!");
    }
}

async function excluirSolicitacaoEComprovante(uid) {
    if (confirm("🚨 ATENÇÃO: Deseja apagar os dados desta solicitação (limpar string pesada do comprovante e resetar status)?\n\nIsso deixará a conta dele como 'pendente_pagamento' novamente para novas compras, mas NÃO remove os jogos que ele já possui ativos.")) {
        try {
            await database.ref(`usuarios/${uid}/comprovante_base64`).set("");
            await database.ref(`usuarios/${uid}/status_cadastro`).set("pendente_pagamento");
            alert("Solicitação arquivada/resetada e armazenamento limpo.");
        } catch (error) { alert("Erro: " + error.message); }
    }
}
