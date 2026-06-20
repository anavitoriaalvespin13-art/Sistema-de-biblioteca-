

function telaAtiva(tela, linkClicado) {
    const ativo = document.querySelector('.ativo');
    if (ativo) ativo.classList.remove('ativo');
    linkClicado.classList.add('ativo');

    document.getElementById('tabela1').style.display = 'none';
    document.getElementById('tabela2').style.display = 'none';
    document.getElementById(tela).style.display = 'block';

    if (tela === 'tabela2') emprestimos();
}

function abrirModal(){
    document.getElementById('livroEditandoId').value = '';
    document.getElementById('formulario').reset();
    document.querySelector('#modal h1').textContent = 'Cadastro de Livro';
    document.querySelector('#modal .criar').textContent = 'Salvar';
    document.getElementById('modal').style.display = 'flex';
    document.getElementById("fundoModal").style.display = "flex";
document.getElementById("modal").style.display = "flex";
}

function fecharModal(event) {
    event.preventDefault();
    document.getElementById('modal').style.display = 'none';
   document.getElementById("fundoModal").style.display = "none";
   document.getElementById("modal").style.display = "none";
    document.getElementById('formulario').reset();
}

function feedbackfirmado(texto) {
    const el = document.getElementById('mensagensConfirm');
    el.textContent = texto;
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function feedbackerro(texto) {
    const el = document.getElementById('mensagensErro');
    el.textContent = texto;
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}



async function livros(termoBusca = '') {
    const tabela = document.getElementById('tabelaLivros');
    tabela.innerHTML = '';

    const url = termoBusca
        ? `http://localhost:3000/livros?busca=${encodeURIComponent(termoBusca)}`
        : 'http://localhost:3000/livros';

    const resposta = await fetch(url);
    const listaLivros = await resposta.json();

    if (listaLivros.length === 0) {
        tabela.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum livro encontrado.</td></tr>';
        return;
    }

    listaLivros.forEach(livro => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${livro.id}</td>
            <td>${livro.titulo}</td>
            <td>${livro.autor}</td>
            <td>${livro.ano}</td>
            <td>${livro.quantidade_disponivel}</td>
            <td>
                <button onclick="abrirEdicao(${livro.id}, '${escapar(livro.titulo)}', '${escapar(livro.autor)}', ${livro.ano}, ${livro.quantidade_inicial})">
                    <i style="color:#ffff" class="bi bi-pen"></i>
                </button>
                <button onclick="deletar(${livro.id})">
                    <i style="color:brown" class="bi bi-trash3"></i>
                </button>
            </td>
        `;
        tabela.appendChild(linha);
    });
}

function buscarLivros() {
    const termo = document.getElementById('campoBusca').value;
    livros(termo);
}

async function criarLivro(event) {
    event.preventDefault();

    const titulo             = document.getElementById('titulo').value;
    const autor              = document.getElementById('autor').value;
    const ano                = document.getElementById('ano').value;
    const quantidade_inicial = document.getElementById('quantidade').value;
    const idEditando         = document.getElementById('livroEditandoId').value;

    if (!titulo || !autor || !ano || !quantidade_inicial)
        return feedbackerro('Preencha todos os campos.');

    if (idEditando) {
        
        const resposta = await fetch(`http://localhost:3000/editar/${idEditando}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, autor, ano, quantidade_inicial })
        });
        const data = await resposta.json();
        if (resposta.ok) {
            feedbackfirmado(data.message);
            fecharModal(event);
            livros();
        } else {
            feedbackerro(data.erro);
        }
    } else {
       
        const resposta = await fetch('http://localhost:3000/criar/livro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, autor, ano, quantidade_inicial })
        });
        const data = await resposta.json();
        if (resposta.ok) {
            feedbackfirmado(data.message);
            fecharModal(event);
            livros();
        } else {
            feedbackerro(data.erro);
        }
    }
}

function abrirEdicao(id, titulo, autor, ano, quantidade_inicial) {
    document.getElementById('livroEditandoId').value = id;
    document.getElementById('titulo').value = titulo;
    document.getElementById('autor').value = autor;
    document.getElementById('ano').value = ano;
    document.getElementById('quantidade').value = quantidade_inicial;
    document.querySelector('#modal h1').textContent = 'Editar Livro';
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('fundoModal').style.display = 'flex';
}

async function deletar(id) {
    if (!confirm('Deseja realmente excluir este livro?')) return;

    const resposta = await fetch(`http://localhost:3000/livro/${id}`, { method: 'DELETE' });
    const dados = await resposta.json();

    if (resposta.ok) {
        feedbackfirmado(dados.message);
        livros();
    } else {
        feedbackerro(dados.erro ?? 'Erro ao deletar.');
    }
}



async function emprestimos() {
    const tabela = document.getElementById('tabelaEmprestimo');
    tabela.innerHTML = '';

    const resposta = await fetch('http://localhost:3000/emprestimos');
    const listaEmprestimos = await resposta.json();

    if (listaEmprestimos.length === 0) {
        tabela.innerHTML = '<tr><td colspan="7" style="text-align:center">Nenhum empréstimo registrado.</td></tr>';
        return;
    }

    listaEmprestimos.forEach(emp => {
        const linha = document.createElement('tr');

        
        let botoes = '';
        if (emp.status === 'em_espera') {
            botoes = `<button onclick="aprovar(${emp.id})" title="Aprovar empréstimo">✅ Aprovar</button>`;
        } else if (emp.status === 'ativo' || emp.status === 'atrasado') {
            botoes = `<button onclick="devolver(${emp.id})" title="Registrar devolução">📦 Devolver</button>`;
        } else {
            botoes = '—';
        }

        linha.innerHTML = `
            <td>${emp.nome_leitor}</td>
            <td>${emp.titulo_livro}</td>
            <td>${emp.data_emprestimo ?? '—'}</td>
            <td>${emp.data_devolucao_prevista ?? '—'}</td>
            <td>${emp.data_devolucao_real ?? '—'}</td>
            <td><span class="badge status-${emp.status}">${traduzirStatus(emp.status)}</span></td>
            <td>${botoes}</td>
        `;
        tabela.appendChild(linha);
    });
}

async function aprovar(id) {
    const resposta = await fetch(`http://localhost:3000/emprestimos/${id}/aprovar`, { method: 'PUT' });
    const data = await resposta.json();

    if (resposta.ok) {
        feedbackfirmado(data.message);
        emprestimos();
        livros(); 
    } else {
        feedbackerro(data.erro);
    }
}

async function devolver(id) {
    const resposta = await fetch(`http://localhost:3000/emprestimos/${id}/devolver`, { method: 'PUT' });
    const data = await resposta.json();

    if (resposta.ok) {
        feedbackfirmado(data.message);
        emprestimos();
        livros(); 
    } else {
        feedbackerro(data.erro);
    }
}


function traduzirStatus(status) {
    const mapa = {
        em_espera: '⏳ Em Espera',
        ativo:     '✅ Ativo',
        devolvido: '📦 Devolvido',
        atrasado:  '⚠️ Atrasado'
    };
    return mapa[status] ?? status;
}

function escapar(str) {
    return String(str).replace(/'/g, "\\'");
}


livros();
