// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE (Substitua pelos dados do seu Console Firebase)
// ==========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBu7DKMzV-LwEKcnDYK7Y-1q9pNSCHE7jE",
  authDomain: "pre-venda-4168c.firebaseapp.com",
  projectId: "pre-venda-4168c",
  storageBucket: "pre-venda-4168c.firebasestorage.app",
  messagingSenderId: "113812783935",
  appId: "1:113812783935:web:2b1229abdd35be7b73898a"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ==========================================================================
// CONTROLE DE TELAS (VIVAS / DINÂMICAS)
// ==========================================================================
const viewAuth = document.getElementById('view-auth');
const viewCliente = document.getElementById('view-cliente');
const viewAdmin = document.getElementById('view-admin');

function irParaTela(tela) {
    viewAuth.classList.remove('active');
    viewCliente.classList.remove('active');
    viewAdmin.classList.remove('active');
    tela.classList.add('active');
}

// Alternar entre abas de Login e Cadastro na tela inicial
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

// ==========================================================================
// MONITOR DE AUTENTICAÇÃO (Sabe quem está logado em tempo real)
// ==========================================================================
auth.onAuthStateChanged(user => {
    if (user) {
        if (user.email === "admin@admin.com") {
            // Se for você, abre o painel administrador automaticamente
            irParaTela(viewAdmin);
            carregarUsuariosParaAdmin();
        } else {
            // Se for cliente, busca o nome exclusivo dele no Realtime Database
            database.ref('usuarios/' + user.uid).once('value').then(snapshot => {
                const dados = snapshot.val();
                if(dados) {
                    document.getElementById('user-display-name').innerText = `${dados.nome} ${dados.sobrenome}`;
                    irParaTela(viewCliente);
                    ouvirCardsDoCliente(user.uid);
                }
            });
        }
    } else {
        irParaTela(viewAuth);
    }
});

function deslogar() {
    auth.signOut();
}
