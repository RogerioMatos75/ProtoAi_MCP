// Configuração da API
const API_BASE_URL = 'http://localhost:8000';

// Elementos do DOM
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const ownerFilter = document.getElementById('ownerFilter');
const searchBtn = document.getElementById('searchBtn');

const resultsContainer = document.getElementById('results');

// Função para realizar a busca
async function searchRepositories() {
    try {
        const searchTerm = searchInput.value;
        const tag = tagFilter.value;
        const owner = ownerFilter.value;

        const searchParams = {};
        if (searchTerm) searchParams.q = searchTerm;
        if (tag) searchParams.tag = tag;
        if (owner) searchParams.owner = owner;

        const intentPayload = {
            action: "BUSCAR",
            scope: "repositories",
            parameters: searchParams,
            response_format: "json"
        };

        const response = await fetch(`${API_BASE_URL}/intent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(intentPayload)
        });

        const data = await response.json();
        displayResults(data.resultado_busca || []);
    } catch (error) {
        console.error('Erro na busca:', error);
        alert('Erro ao realizar a busca. Por favor, tente novamente.');
    }
}

// Função para exibir os resultados
function displayResults(repositories) {
    resultsContainer.innerHTML = '';
    
    if (!repositories.length) {
        resultsContainer.innerHTML = `
            <div class="col-span-full text-center text-gray-600 py-8">
                Nenhum repositório encontrado.
            </div>
        `;
        return;
    }

    repositories.forEach(repo => {
        const card = document.createElement('div');
        card.className = 'card bg-white p-6 rounded-lg shadow-lg hover:shadow-xl';
        card.innerHTML = `
            <h3 class="text-xl font-semibold text-gray-800 mb-2">${repo.name}</h3>
            <p class="text-gray-600 mb-4">${repo.description || 'Sem descrição'}</p>
            <div class="flex flex-wrap gap-2 mb-4">
                ${repo.tags?.map(tag => `
                    <span class="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
                        ${tag}
                    </span>
                `).join('') || ''}
            </div>
            <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500">${repo.owner}</span>
                <a href="${repo.url}" target="_blank" 
                   class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Ver Repositório →
                </a>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}



// Event Listeners
searchBtn.addEventListener('click', searchRepositories);


// Adicionar event listener para busca ao pressionar Enter
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchRepositories();
    }
});