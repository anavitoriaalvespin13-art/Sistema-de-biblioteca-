// ─── Utilitários de UI ────────────────────────────────────────────────────────

function telaAtiva(tela, linkClicado) {
    const ativo = document.querySelector('.ativo');
    if (ativo) ativo.classList.remove('ativo');
    linkClicado.classList.add('ativo');

    document.getElementById('tabela1').style.display = 'none';
    document.getElementById('tabela2').style.display = 'none';
    document.getElementById(tela).style.display = 'block';

   
    if (tela === 'tabela2') carregarEmprestimos();
}

function abrirModal(idLivro) {
    document.getElementById('id_livro_selecionado').value = idLivro;
    document.getElementById('modal').style.display = 'flex';
    document.getElementById('fundoModal').style.display = 'flex';
}

function fecharModal(event) {
    event.preventDefault();
    document.getElementById('modal').style.display = 'none';
    document.getElementById('fundoModal').style.display = 'none';
    document.getElementById('formulario').reset();
}

function feedbackconfirmado(texto) {
    let el = document.getElementById('mensagensConfirm');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mensagensConfirm';
        el.style.cssText = 'position:fixed;top:20px;right:20px;background:#2ecc71;color:#fff;padding:12px 20px;border-radius:8px;z-index:9999;display:none';
        document.body.appendChild(el);
    }
    el.textContent = texto;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function feedbackerro(texto) {
    let el = document.getElementById('mensagensErro');
    if (!el) {
        el = document.createElement('div');
        el.id = 'mensagensErro';
        el.style.cssText = 'position:fixed;top:20px;right:20px;background:#e74c3c;color:#fff;padding:12px 20px;border-radius:8px;z-index:9999;display:none';
        document.body.appendChild(el);
    }
    el.textContent = texto;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}



function getUsuario() {
    const raw = sessionStorage.getItem('usuario');
    return raw ? JSON.parse(raw) : null;
}


document.addEventListener('DOMContentLoaded', () => {
    const usuario = getUsuario();
    if (usuario) {
        document.getElementById('nomeLeitor').textContent = usuario.nome;
    }
    livros(); 
});


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
                <button onclick="abrirModal(${livro.id})"
                    ${livro.quantidade_disponivel <= 0 ? 'disabled title="Sem unidades disponíveis"' : ''}>
                    SOLICITAR
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

//emprestimos do leitor (nao toque nisso por favor)

async function carregarEmprestimos() {
    const tabela = document.getElementById('tabelaEmprestimo');
    tabela.innerHTML = '';

    const usuario = getUsuario();
    if (!usuario) {
        tabela.innerHTML = '<tr><td colspan="6">Sessão expirada. Faça login novamente.</td></tr>';
        return;
    }

    const resposta = await fetch(`http://localhost:3000/emprestimos?leitor_id=${usuario.id}`);
    const listaEmprestimos = await resposta.json();

    if (listaEmprestimos.length === 0) {
        tabela.innerHTML = '<tr><td colspan="6" style="text-align:center">Nenhum empréstimo registrado.</td></tr>';
        return;
    }

    listaEmprestimos.forEach(emp => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${emp.nome_leitor}</td>
            <td>${emp.titulo_livro}</td>
            <td>${emp.data_emprestimo ?? '—'}</td>
            <td>${emp.data_devolucao_prevista ?? '—'}</td>
            <td>${emp.data_devolucao_real ?? '—'}</td>
            <td><span class="badge status-${emp.status}">${traduzirStatus(emp.status)}</span></td>
        `;
        tabela.appendChild(linha);
    });
}



async function solicitarEmprestimo(event) {
    event.preventDefault();

    const usuario = getUsuario();
    if (!usuario) return feedbackerro('Sessão expirada. Faça login novamente.');

    const id_livro            = document.getElementById('id_livro_selecionado').value;
    const data_emprestimo     = document.getElementById('data_emprestimo').value;
    const data_devolucao_p    = document.getElementById('data_devolucao_p').value;

    if (!id_livro || !data_emprestimo || !data_devolucao_p)
        return feedbackerro('Preencha todos os campos do empréstimo.');

    const resposta = await fetch('http://localhost:3000/emprestimos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id_livro,
            id_leitor: usuario.id,
            data_emprestimo,
            data_devolucao_prevista: data_devolucao_p
        })
    });

    const data = await resposta.json();

    if (resposta.ok) {
        feedbackconfirmado(data.message);
        fecharModal(event);
    } else {
        feedbackerro(data.erro);
    }
}

// status 

function traduzirStatus(status) {
    const mapa = {
        em_espera: '⏳ Em Espera',
        ativo:     '✅ Ativo',
        devolvido: '📦 Devolvido',
        atrasado:  '⚠️ Atrasado'
    };
    return mapa[status] ?? status;
}
