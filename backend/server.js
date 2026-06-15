const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..')));



app.post('/usuario/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha)
        return res.status(400).json({ error: 'Preencha todos os campos' });

    const consulta = 'SELECT * FROM usuario WHERE email = ? AND senha = ?';

    db.query(consulta, [email, senha], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Erro ao conectar no banco de dados' });
        }

        if (results.length > 0) {
            const user = results[0];
            const redirecionamento = user.perfil === 'leitor'
                ? '/frontend/leitor.html'
                : '/frontend/bibliotecario.html';

            res.status(200).json({
                message: 'Login bem-sucedido!',
                redirect: redirecionamento,
                user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil }
            });
        } else {
            res.status(401).json({ error: 'Usuário ou senha incorretos' });
        }
    });
});

app.post('/usuario/cadastro', (req, res) => {
    const { nome, email, senha, perfil } = req.body;

    if (!nome || !email || !senha || !perfil)
        return res.status(400).json({ message: 'Preencha todos os campos' });

    const consulta = 'INSERT INTO usuario (nome, email, senha, perfil) VALUES (?,?,?,?)';

    db.query(consulta, [nome, email, senha, perfil], (err) => {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err);
            return res.status(500).json({ message: 'Erro ao cadastrar usuário' });
        }
        res.status(201).json({ message: 'Usuário cadastrado com sucesso!' });
    });
});


app.get('/livros', (req, res) => {
    const { busca } = req.query;

    let consulta = 'SELECT * FROM livros';
    let params = [];

    if (busca && busca.trim() !== '') {
        consulta += ' WHERE titulo LIKE ? OR autor LIKE ?';
        params = [`%${busca}%`, `%${busca}%`];
    }

    db.query(consulta, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao conectar com o servidor' });
        }
        res.json(result);
    });
});

app.post('/criar/livro', (req, res) => {
    const { titulo, autor, ano, quantidade_inicial } = req.body;

    if (!titulo || !autor || !ano || !quantidade_inicial)
        return res.status(400).json({ erro: 'Preencha todos os campos do livro' });

    const consulta = `
        INSERT INTO livros (titulo, autor, ano, quantidade_inicial, quantidade_disponivel)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(consulta, [titulo, autor, ano, quantidade_inicial, quantidade_inicial], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar livro:', err);
            return res.status(500).json({ erro: 'Erro ao cadastrar livro' });
        }
        res.status(201).json({ message: 'Livro cadastrado com sucesso!' });
    });
});


app.put('/editar/:id', (req, res) => {
    const { id } = req.params;
    const { titulo, autor, ano, quantidade_inicial } = req.body;

    if (!titulo || !autor || !ano || !quantidade_inicial)
        return res.status(400).json({ erro: 'Preencha todos os campos' });

    const consulta = `
        UPDATE livros
        SET titulo = ?, autor = ?, ano = ?, quantidade_inicial = ?
        WHERE id = ?
    `;

    db.query(consulta, [titulo, autor, ano, quantidade_inicial, id], (err) => {
        if (err) {
            console.error('Erro ao editar livro:', err);
            return res.status(500).json({ erro: 'Erro ao editar livro' });
        }
        res.status(200).json({ message: 'Livro atualizado com sucesso!' });
    });
});

app.delete('/livro/:id', (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM livros WHERE id = ?', [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ erro: 'Erro ao deletar livro' });
        }
        res.status(200).json({ message: 'Livro deletado com sucesso' });
    });
});


app.get('/emprestimos', (req, res) => {
    const { leitor_id } = req.query;

    
    const atualizaAtrasados = `
        UPDATE emprestimos
        SET status = 'atrasado'
        WHERE status = 'ativo'
          AND data_devolucao_prevista < CURDATE()
          AND data_devolucao_real IS NULL
    `;

    db.query(atualizaAtrasados, [], (errAtualiza) => {
        if (errAtualiza) console.error('Erro ao atualizar atrasados:', errAtualiza);

        
        let consulta = `
            SELECT
                e.id,
                u.nome      AS nome_leitor,
                l.titulo    AS titulo_livro,
                e.data_emprestimo,
                e.data_devolucao_prevista,
                e.data_devolucao_real,
                e.status
            FROM emprestimos e
            INNER JOIN usuario u ON e.id_leitor = u.id
            INNER JOIN livros  l ON e.id_livro  = l.id
        `;
        let params = [];

        if (leitor_id) {
            consulta += ' WHERE e.id_leitor = ?';
            params = [leitor_id];
        }

        consulta += ' ORDER BY e.id DESC';

        db.query(consulta, params, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ erro: 'Erro ao buscar empréstimos' });
            }

            const emprestimos = result.map(item => ({
                id: item.id,
                nome_leitor: item.nome_leitor,
                titulo_livro: item.titulo_livro,
                data_emprestimo: item.data_emprestimo?.toISOString().split('T')[0],
                data_devolucao_prevista: item.data_devolucao_prevista?.toISOString().split('T')[0],
                data_devolucao_real: item.data_devolucao_real
                    ? item.data_devolucao_real.toISOString().split('T')[0]
                    : null,
                status: item.status
            }));

            res.json(emprestimos);
        });
    });
});


app.post('/emprestimos', (req, res) => {
    const { id_livro, id_leitor, data_emprestimo, data_devolucao_prevista } = req.body;

    if (!id_livro || !id_leitor || !data_emprestimo || !data_devolucao_prevista)
        return res.status(400).json({ erro: 'Preencha todos os campos do empréstimo' });

    
    db.query('SELECT quantidade_disponivel FROM livros WHERE id = ?', [id_livro], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao verificar livro' });
        if (rows.length === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
        if (rows[0].quantidade_disponivel <= 0)
            return res.status(400).json({ erro: 'Livro sem unidades disponíveis no momento' });

        const consulta = `
            INSERT INTO emprestimos (id_livro, id_leitor, data_emprestimo, data_devolucao_prevista, status)
            VALUES (?, ?, ?, ?, 'em_espera')
        `;

        db.query(consulta, [id_livro, id_leitor, data_emprestimo, data_devolucao_prevista], (errInsert) => {
            if (errInsert) {
                console.error('Erro ao criar empréstimo:', errInsert);
                return res.status(500).json({ erro: 'Erro ao solicitar empréstimo' });
            }
            res.status(201).json({ message: 'Empréstimo solicitado com sucesso! Aguarde aprovação.' });
        });
    });
});


app.put('/emprestimos/:id/aprovar', (req, res) => {
    const { id } = req.params;

   
    db.query('SELECT * FROM emprestimos WHERE id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar empréstimo' });
        if (rows.length === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

        const emprestimo = rows[0];

        if (emprestimo.status !== 'em_espera')
            return res.status(400).json({ erro: 'Apenas empréstimos em espera podem ser aprovados' });

        db.query('SELECT quantidade_disponivel FROM livros WHERE id = ?', [emprestimo.id_livro], (errLivro, livros) => {
            if (errLivro) return res.status(500).json({ erro: 'Erro ao verificar estoque' });
            if (livros[0].quantidade_disponivel <= 0)
                return res.status(400).json({ erro: 'Estoque insuficiente para aprovar' });

         
            db.query("UPDATE emprestimos SET status = 'ativo' WHERE id = ?", [id], (errStatus) => {
                if (errStatus) return res.status(500).json({ erro: 'Erro ao aprovar empréstimo' });

                db.query(
                    'UPDATE livros SET quantidade_disponivel = quantidade_disponivel - 1 WHERE id = ?',
                    [emprestimo.id_livro],
                    (errEstoque) => {
                        if (errEstoque) return res.status(500).json({ erro: 'Erro ao atualizar estoque' });
                        res.status(200).json({ message: 'Empréstimo aprovado! Estoque atualizado.' });
                    }
                );
            });
        });
    });
});


app.put('/emprestimos/:id/devolver', (req, res) => {
    const { id } = req.params;

    db.query('SELECT * FROM emprestimos WHERE id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ erro: 'Erro ao buscar empréstimo' });
        if (rows.length === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado' });

        const emprestimo = rows[0];

        if (emprestimo.status !== 'ativo' && emprestimo.status !== 'atrasado')
            return res.status(400).json({ erro: 'Apenas empréstimos ativos ou atrasados podem ser devolvidos' });

        const hoje = new Date().toISOString().split('T')[0];

        
        db.query(
            "UPDATE emprestimos SET status = 'devolvido', data_devolucao_real = ? WHERE id = ?",
            [hoje, id],
            (errStatus) => {
                if (errStatus) return res.status(500).json({ erro: 'Erro ao registrar devolução' });

                db.query(
                    'UPDATE livros SET quantidade_disponivel = quantidade_disponivel + 1 WHERE id = ?',
                    [emprestimo.id_livro],
                    (errEstoque) => {
                        if (errEstoque) return res.status(500).json({ erro: 'Erro ao atualizar estoque' });
                        res.status(200).json({ message: 'Devolução registrada com sucesso!' });
                    }
                );
            }
        );
    });
});


app.listen(3000, () => {
    console.log('Servidor rodando em http://localhost:3000');
});
