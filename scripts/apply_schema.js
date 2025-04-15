const fs = require('fs');
const path = require('path');
const { supabase } = require('../src/config/supabase');

async function applySchema() {
    try {
        console.log('📚 Lendo arquivo schema.sql...');
        const schemaPath = path.join(__dirname, '../MCP_Servers/supabase/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('🔨 Aplicando schema no Supabase...');
        const { error } = await supabase.rpc('exec_sql', { sql: schema });

        if (error) {
            console.error('❌ Erro ao aplicar schema:', error.message);
            return false;
        }

        console.log('✅ Schema aplicado com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro:', error.message);
        return false;
    }
}

applySchema();