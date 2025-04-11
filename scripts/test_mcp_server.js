const axios = require('axios');

const API_URL = 'http://localhost:8080/api';

async function runTests() {
  try {
    console.log('🧪 Iniciando testes do servidor MCP...\n');

    // Teste 1: Verificar status do servidor
    console.log('Teste 1: Verificando status do servidor...');
    const statusResponse = await axios.get(`${API_URL}/status`);
    console.log('✅ Servidor online:', statusResponse.data);

    // Teste 2: Registrar um modelo
    console.log('\nTeste 2: Registrando modelo de teste...');
    const modelData = {
      manifest: {
        project_info: {
          name: 'Modelo de Teste',
          version: '1.0.0',
          description: 'Modelo para teste de integração',
          tags: ['teste', 'integração']
        },
        communication_details: {
          access_interfaces: [{
            type: 1,
            base_url_or_address: 'http://localhost:5000',
            available_methods_or_operations: ['/predict']
          }]
        }
      },
      capabilities: ['text-generation', 'sentiment-analysis'],
      metadata: {
        environment: 'test'
      }
    };

    const registerResponse = await axios.post(`${API_URL}/models`, modelData);
    console.log('✅ Modelo registrado:', registerResponse.data);
    const modelId = registerResponse.data.model_id;

    // Teste 3: Descobrir modelos
    console.log('\nTeste 3: Testando descoberta de modelos...');
    const discoveryData = {
      intent: 'processar-texto',
      required_capabilities: ['text-generation'],
      constraints: {
        environment: 'test'
      }
    };

    const discoveryResponse = await axios.post(`${API_URL}/discover`, discoveryData);
    console.log('✅ Modelos encontrados:', discoveryResponse.data);

    // Teste 4: Estabelecer conexão
    console.log('\nTeste 4: Estabelecendo conexão entre modelos...');
    const connectionData = {
      source_model_id: modelId,
      target_model_id: modelId, // Auto-conexão para teste
      intent: 'teste-conexao',
      connection_params: {
        test_param: 'valor_teste'
      }
    };

    const connectionResponse = await axios.post(`${API_URL}/connections`, connectionData);
    console.log('✅ Conexão estabelecida:', connectionResponse.data);
    const connectionId = connectionResponse.data.connection_id;

    // Teste 5: Registrar interação
    console.log('\nTeste 5: Registrando interação...');
    const interactionData = {
      interaction_type: 'test_interaction',
      request_data: { input: 'teste' },
      response_data: { output: 'resultado teste' }
    };

    const interactionResponse = await axios.post(
      `${API_URL}/connections/${connectionId}/interactions`,
      interactionData
    );
    console.log('✅ Interação registrada:', interactionResponse.data);

    // Teste 6: Listar conexões
    console.log('\nTeste 6: Listando conexões do modelo...');
    const connectionsResponse = await axios.get(`${API_URL}/models/${modelId}/connections`);
    console.log('✅ Conexões listadas:', connectionsResponse.data);

    console.log('\n🎉 Todos os testes completados com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro durante os testes:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Executar os testes
runTests();