const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const ModelRegistry = require('./services/model_registry');
const ConnectionManager = require('./services/connection_manager');

class MCPServer {
  constructor() {
    this.app = express();
    this.config = this.loadConfig();
    this.setupSupabase();
    this.setupServices();
    this.setupMiddleware();
    this.setupRoutes();
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '../config/mcp_config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
      process.exit(1);
    }
  }

  setupSupabase() {
    this.supabase = createClient(
      this.config.supabase.url,
      this.config.supabase.anon_key
    );
  }

  setupServices() {
    this.modelRegistry = new ModelRegistry(this.supabase);
    this.connectionManager = new ConnectionManager(this.supabase);
  }

  async setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(async (req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`${timestamp} - ${req.method} ${req.path}`);
      next();
    });
  }

  async setupRoutes() {
    // Rota de status
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'online',
        version: this.config.api.version,
        timestamp: new Date().toISOString()
      });
    });

    // Rota para registrar modelo
    this.app.post('/api/models', async (req, res) => {
      const { manifest, capabilities, metadata } = req.body;
      const result = await this.modelRegistry.registerModel(manifest, capabilities, metadata);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    });

    // Rota para descobrir modelos
    this.app.post('/api/discover', async (req, res) => {
      const { intent, required_capabilities, constraints } = req.body;
      const result = await this.modelRegistry.discoverModels(
        intent,
        required_capabilities,
        constraints
      );
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    });

    // Rota para estabelecer conexão
    this.app.post('/api/connections', async (req, res) => {
      const { source_model_id, target_model_id, intent, connection_params } = req.body;
      const result = await this.connectionManager.establishConnection(
        source_model_id,
        target_model_id,
        intent,
        connection_params
      );
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    });

    // Rota para listar conexões de um modelo
    this.app.get('/api/models/:modelId/connections', async (req, res) => {
      const result = await this.connectionManager.listConnections(req.params.modelId);
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    });

    // Rota para registrar interação
    this.app.post('/api/connections/:connectionId/interactions', async (req, res) => {
      const { interaction_type, request_data, response_data } = req.body;
      const result = await this.connectionManager.recordInteraction(
        req.params.connectionId,
        interaction_type,
        request_data,
        response_data
      );
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
    });
  }

  async start() {
    try {
      const { host, port } = this.config.server;
      this.app.listen(port, host, () => {
        console.log(`Servidor MCP rodando em http://${host}:${port}`);
        console.log('Versão:', this.config.api.version);
      });
    } catch (error) {
      console.error('Erro ao iniciar o servidor:', error);
      process.exit(1);
    }
  }
}

// Criar e iniciar o servidor
const server = new MCPServer();
server.start();