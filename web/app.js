// Configuração da API
const API_BASE_URL = 'http://localhost:8000';

// Elementos do DOM
const manifestoBtn = document.getElementById('manifestoBtn');
const manifestoContent = document.getElementById('manifestoContent');
const searchInput = document.getElementById('searchInput');
const tagFilter = document.getElementById('tagFilter');
const ownerFilter = document.getElementById('ownerFilter');
const searchBtn = document.getElementById('searchBtn');
const resultsContainer = document.getElementById('results');

// Função para carregar o manifesto
async function loadManifesto() {
    try {
        const response = await fetch(`${API_BASE_URL}/manifesto`);
        const data = await response.json();
        const manifestoText = JSON.stringify(data, null, 2);
        manifestoContent.querySelector('pre').textContent = manifestoText;
        manifestoContent.classList.toggle('hidden');
    } catch (error) {
        console.error('Erro ao carregar manifesto:', error);
        alert('Erro ao carregar o manifesto. Por favor, tente novamente.');
    }
}

// Função para realizar a busca
async function searchRepositories() {
    try {
        const searchTerm = searchInput.value;
        const tag = tagFilter.value;
        const owner = ownerFilter.value;

        const params = new URLSearchParams();
        if (searchTerm) params.append('q', searchTerm);
        if (tag) params.append('tag', tag);
        if (owner) params.append('owner', owner);

        const response = await fetch(`${API_BASE_URL}/search?${params.toString()}`);
        const data = await response.json();
        displayResults(data);
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
manifestoBtn.addEventListener('click', loadManifesto);
searchBtn.addEventListener('click', searchRepositories);

// Carregar filtros iniciais (simulado por enquanto)
const mockTags = ['API', 'Frontend', 'Backend', 'Database', 'Testing'];
const mockOwners = ['user1', 'user2', 'organization1'];

mockTags.forEach(tag => {
    const option = new Option(tag, tag);
    tagFilter.add(option);
});

mockOwners.forEach(owner => {
    const option = new Option(owner, owner);
    ownerFilter.add(option);
});