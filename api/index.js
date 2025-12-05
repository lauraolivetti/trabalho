// Configuração do Express e Middleware
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const crypto = require('crypto'); 
const app = express();
const port = 3000;

// Configuração do EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para processar dados do formulário
app.use(express.urlencoded({ extended: true }));
app.use(express.json());


app.use(cookieParser());
app.use(session({
    secret: 'chaveSecretaLol', 
    resave: false, 
    saveUninitialized: true,
    cookie: { 
        maxAge: 30 * 60 * 1000 // 30 minutos em milissegundos (mantém o login)
    }
}));


let equipes = [];
let jogadores = [];
let nextEquipeId = 1;

//Função Middleware de Autenticação 
function verificarAutenticacao(req, res, next) {
    if (req.session.usuario) {
        next(); 
    } else {
        res.redirect('/login'); 
    }
}

//Funções de Ajuda (Cookies)
function setUltimoAcessoCookie(res) {
    const agora = new Date().toLocaleString('pt-BR');
    res.cookie('ultimoAcesso', agora, { 
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });
}

function getUltimoAcessoCookie(req) {
    return req.cookies.ultimoAcesso || 'Primeiro acesso';
}

//ROTAS DE AUTENTICAÇÃO (Login / Logout)

//Rota GET /login
app.get('/login', (req, res) => {
    if (req.session.usuario) {
        return res.redirect('/');
    }
    res.render('login', { erro: null });
});

//Rota POST /login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    //Credenciais: admin/admin
    if (usuario === 'admin' && senha === 'admin') {
        req.session.usuario = usuario; 
        setUltimoAcessoCookie(res);
        res.redirect('/');
    } else {
        res.render('login', { erro: 'Credenciais inválidas. Tente novamente.' });
    }
});

//Rota GET /logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Erro ao destruir sessão:', err);
            return res.status(500).send('Erro ao fazer logout.');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

//ROTA PRINCIPAL (Menu)
app.get('/', verificarAutenticacao, (req, res) => {
    const ultimoAcesso = getUltimoAcessoCookie(req);
    res.render('menu', { ultimoAcesso });
});

//  ROTAS DE CADASTRO DE EQUIPES 

// Rota GET /equipes 
app.get('/equipes', verificarAutenticacao, (req, res) => {
    // É ESSENCIAL passar 'equipes' e 'erro' para a view.
    res.render('equipes', { equipes: equipes, erro: null });
});

// Rota POST /equipes 
app.post('/equipes', verificarAutenticacao, (req, res) => {
    const { nome, capitao, contato } = req.body;
    let erro = null;

    if (!nome || !capitao || !contato) {
        erro = 'Todos os campos (Nome, Capitão, Contato) são obrigatórios.';
    }

    if (!erro && equipes.some(e => e.nome.toLowerCase() === nome.toLowerCase())) {
        erro = `A equipe "${nome}" já está cadastrada.`;
    }

    if (erro) {a
        return res.render('equipes', { equipes: equipes, erro: erro });
    }

    const novaEquipe = {
        id: nextEquipeId++,
        nome: nome.trim(),
        capitao: capitao.trim(),
        contato: contato.trim()
    };
    equipes.push(novaEquipe);

    res.redirect('/equipes');
});

//ROTAS DE CADASTRO DE JOGADORES

// Rota GET /jogadores 
app.get('/jogadores', verificarAutenticacao, (req, res) => {
    res.render('jogadores', { equipes: equipes, jogadores: jogadores, erro: null });
});

// Rota POST /jogadores 
app.post('/jogadores', verificarAutenticacao, (req, res) => {
    const { nome, nickname, funcao, elo, genero, equipeId } = req.body;
    let erro = null;
    const equipeIDNum = parseInt(equipeId);

    if (!nome || !nickname || !funcao || !elo || !genero || !equipeId) {
        erro = 'Todos os campos do jogador são obrigatórios.';
    }

    const equipeSelecionada = equipes.find(e => e.id === equipeIDNum);
    if (!erro && !equipeSelecionada) {
        erro = 'A equipe selecionada é inválida.';
    }

    const jogadoresDoTime = jogadores.filter(j => j.equipeId === equipeIDNum);
    if (!erro && jogadoresDoTime.length >= 5) {
        erro = `A equipe "${equipeSelecionada.nome}" já atingiu o limite de 5 jogadores.`;
    }

    if (erro) {
        return res.render('jogadores', { equipes: equipes, jogadores: jogadores, erro: erro });
    }

    const novoJogador = {
        id: crypto.randomUUID(), 
        nome: nome.trim(),
        nickname: nickname.trim(),
        funcao,
        elo,
        genero,
        equipeId: equipeIDNum
    };
    jogadores.push(novoJogador);

    res.redirect('/jogadores');
});

//  INICIALIZAÇÃO DO SERVIDOR 
module.exports = app;