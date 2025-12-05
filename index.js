const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

//CORREÇÃO CRÍTICA PARA VERCEL (HTTPS/PROXY) 

app.set('trust proxy', 1);

// Configuração da Sessão (Requisito: 30 minutos)
app.use(session({
    secret: 'chave-secreta-do-campeonato',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 30 * 60 * 1000, // 30 minutos
        secure: true,
        sameSite: 'none'
    }
}));

//ARMAZENAMENTO EM MEMÓRIA 
const equipes = [];
const jogadores = [];

// MIDDLEWARE DE AUTENTICAÇÃO
const verificarAuth = (req, res, next) => {
    if (req.session.usuarioLogado) {
        next();
    } else {
        res.redirect('/login');
    }
};

// ROTAS DE ACESSO

// Tela de Login
app.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

// Processamento do Login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === 'admin') {
        req.session.usuarioLogado = true;
        res.cookie('ultimoAcesso', new Date().toLocaleString(), { maxAge: 900000 });
        res.redirect('/');
    } else {
        res.render('login', { erro: 'Usuário ou senha inválidos!' });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Erro ao destruir sessão:", err);
        }
        res.redirect('/login');
    });
});

// ROTAS DO SISTEMA (PROTEGIDAS)

// Menu Principal
app.get('/', verificarAuth, (req, res) => {
    // Lê o cookie do último acesso.
    const ultimoAcesso = req.cookies.ultimoAcesso || 'Primeiro Acesso';
    // Seta o novo valor do último acesso para a data e hora atuais.
    res.cookie('ultimoAcesso', new Date().toLocaleString());
    res.render('menu', { ultimoAcesso });
});

// CADASTRO DE EQUIPES
app.get('/equipes', verificarAuth, (req, res) => {
    res.render('equipes', { equipes, erro: null });
});

app.post('/equipes', verificarAuth, (req, res) => {
    const { nome, capitao, contato } = req.body;

    // Validação no Servidor
    if (!nome || !capitao || !contato) {
        return res.render('equipes', { equipes, erro: 'Todos os campos são obrigatórios!' });
    }

    equipes.push({ id: Date.now(), nome, capitao, contato });
    res.redirect('/equipes');
});

// CADASTRO DE JOGADORES
app.get('/jogadores', verificarAuth, (req, res) => {
    res.render('jogadores', { 
        equipes, 
        jogadores, 
        erro: null 
    });
});

app.post('/jogadores', verificarAuth, (req, res) => {
    const { nome, nickname, funcao, elo, genero, equipeId } = req.body;

    if (!nome || !nickname || !funcao || !elo || !genero || !equipeId) {
        return res.render('jogadores', { 
            equipes, 
            jogadores, 
            erro: 'Todos os campos são obrigatórios! Selecione uma equipe.' 
        });
    }

    const qtdJogadores = jogadores.filter(j => j.equipeId == equipeId).length;
    if (qtdJogadores >= 5) {
        return res.render('jogadores', { 
            equipes, 
            jogadores, 
            erro: 'A equipe selecionada já possui 5 jogadores!' 
        });
    }

    const nomeEquipe = equipes.find(e => e.id == equipeId)?.nome || 'Desconhecida';

    jogadores.push({ 
        nome, nickname, funcao, elo, genero, equipeId, nomeEquipe 
    });

    res.redirect('/jogadores');
});


// EXPORTAÇÃO E INICIALIZAÇÃO 
module.exports = app;

const PORT_FINAL = process.env.PORT || 3000;
app.listen(PORT_FINAL, () => {
    console.log(`Servidor rodando na porta ${PORT_FINAL}`);
});