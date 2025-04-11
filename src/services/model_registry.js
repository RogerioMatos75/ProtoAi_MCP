const { supabase, logAudit } = require('../config/supabase');

class ModelRegistry {
  constructor(supabase) {
    this.supabase = supabase;
  }

  async registerModel(manifest, capabilities, metadata = {}) {
    try {
      const { data, error } = await this.supabase
        .from('models')
        .insert([{
          manifest,
          capabilities,
          metadata,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      return {
        success: true,
        model_id: data[0].id,
        registration_time: data[0].created_at
      };
    } catch (error) {
      console.error('Erro ao registrar modelo:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async discoverModels(intent, requiredCapabilities, constraints = {}) {
    try {
      let query = this.supabase
        .from('models')
        .select('*');

      if (requiredCapabilities && requiredCapabilities.length > 0) {
        query = query.contains('capabilities', requiredCapabilities);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtra e pontua os modelos com base na intenção e restrições
      const matches = data
        .map(model => ({
          model_id: model.id,
          compatibility_score: this.calculateCompatibilityScore(model, intent, constraints),
          manifest: model.manifest,
          capability_mapping: this.mapCapabilities(model.capabilities, requiredCapabilities)
        }))
        .filter(match => match.compatibility_score > 0.5) // Filtra apenas matches relevantes
        .sort((a, b) => b.compatibility_score - a.compatibility_score); // Ordena por relevância

      return {
        success: true,
        matches
      };
    } catch (error) {
      console.error('Erro ao descobrir modelos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  calculateCompatibilityScore(model, intent, constraints) {
    let score = 0;
    
    // Verifica compatibilidade de intenção
    if (model.manifest.intent && model.manifest.intent === intent) {
      score += 0.6;
    }

    // Verifica restrições
    if (constraints) {
      const constraintScore = Object.entries(constraints).reduce((acc, [key, value]) => {
        if (model.metadata && model.metadata[key] === value) {
          return acc + 0.1;
        }
        return acc;
      }, 0);
      score += constraintScore;
    }

    // Adiciona pontuação base para capacidades
    if (model.capabilities && model.capabilities.length > 0) {
      score += 0.3;
    }

    return Math.min(score, 1.0); // Normaliza para máximo de 1.0
  }

  mapCapabilities(modelCaps, requiredCaps) {
    if (!modelCaps || !requiredCaps) return {};

    const mapping = {};
    requiredCaps.forEach(reqCap => {
      const matchingCap = modelCaps.find(cap => 
        cap.toLowerCase().includes(reqCap.toLowerCase()) ||
        reqCap.toLowerCase().includes(cap.toLowerCase())
      );
      if (matchingCap) {
        mapping[reqCap] = matchingCap;
      }
    });

    return mapping;
  }

  async registerBookAsModel(bookData, userId) {
    try {
      // Cria manifesto para o livro
      const manifest = {
        intent: 'book_content_provider',
        project_info: {
          name: bookData.title,
          version: '1.0',
          description: bookData.description,
          tags: ['book', 'content', bookData.language || 'unknown']
        },
        communication_details: {
          access_interfaces: [{
            type: 'GOOGLE_DRIVE',
            base_url_or_address: bookData.drive_file_id,
            available_methods_or_operations: ['READ']
          }],
          default_data_formats: ['text/plain', 'application/pdf']
        },
        security_info: {
          encryption_required: true
        },
        monetization_info: {
          model_type: bookData.is_free ? 'FREE' : 'PAY_PER_USE',
          currency: 'USD',
          base_price: bookData.price || 0
        },
        licensing_info: {
          license_type: bookData.license_type || 'proprietary',
          terms_url: bookData.terms_url
        },
        book_info: {
          title: bookData.title,
          author: bookData.author,
          description: bookData.description,
          drive_file_id: bookData.drive_file_id
        }
      };

      // Registra o modelo
      const { data: model, error } = await supabase
        .from('models')
        .insert({
          manifest: manifest,
          capabilities: ['provide_content', 'semantic_search'],
          metadata: {
            book_id: bookData.id,
            content_type: 'book',
            mime_type: bookData.mime_type
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Registra na auditoria
      await logAudit(userId, 'REGISTER_BOOK_MODEL', 'model', model.id, {
        book_id: bookData.id,
        title: bookData.title
      });

      return model;
    } catch (error) {
      console.error('Erro ao registrar livro como modelo:', error);
      throw error;
    }
  }

  async findModelsByIntent(intent, filters = {}) {
    try {
      let query = supabase
        .from('models')
        .select(`
          *,
          books:books!inner(*)
        `)
        .eq('manifest->intent', intent);

      // Aplica filtros adicionais
      if (filters.capabilities) {
        query = query.contains('capabilities', filters.capabilities);
      }
      if (filters.status) {
        query = query.eq('books.status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao buscar modelos por intent:', error);
      throw error;
    }
  }

  async searchModels(searchText) {
    try {
      const { data, error } = await supabase
        .from('models')
        .select(`
          *,
          books:books(*)
        `)
        .or(`
          manifest->project_info->name.ilike.%${searchText}%,
          manifest->project_info->description.ilike.%${searchText}%,
          manifest->book_info->author.ilike.%${searchText}%
        `);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao pesquisar modelos:', error);
      throw error;
    }
  }

  async updateModelManifest(modelId, updates, userId) {
    try {
      // Obtém manifesto atual
      const { data: currentModel } = await supabase
        .from('models')
        .select('manifest')
        .eq('id', modelId)
        .single();

      if (!currentModel) {
        throw new Error('Modelo não encontrado');
      }

      // Mescla atualizações com manifesto existente
      const updatedManifest = {
        ...currentModel.manifest,
        ...updates,
        project_info: {
          ...currentModel.manifest.project_info,
          ...updates.project_info
        },
        book_info: {
          ...currentModel.manifest.book_info,
          ...updates.book_info
        }
      };

      // Atualiza o manifesto
      const { data, error } = await supabase
        .from('models')
        .update({ manifest: updatedManifest })
        .eq('id', modelId)
        .select()
        .single();

      if (error) throw error;

      // Registra na auditoria
      await logAudit(userId, 'UPDATE_MODEL_MANIFEST', 'model', modelId, {
        updates: Object.keys(updates)
      });

      return data;
    } catch (error) {
      console.error('Erro ao atualizar manifesto do modelo:', error);
      throw error;
    }
  }

  async deleteModel(modelId, userId) {
    try {
      // Primeiro registra na auditoria (caso a deleção seja bem-sucedida)
      await logAudit(userId, 'DELETE_MODEL', 'model', modelId);

      // Remove o modelo
      const { error } = await supabase
        .from('models')
        .delete()
        .eq('id', modelId);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Erro ao deletar modelo:', error);
      throw error;
    }
  }
}

module.exports = new ModelRegistry();