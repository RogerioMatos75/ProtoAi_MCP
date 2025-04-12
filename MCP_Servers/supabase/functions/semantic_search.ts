import { serve } from "https://deno.land/std@0.217.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { ManifestHandler } from "../../handlers/manifest_handler.ts";

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
}

const supabase = createClient(supabaseUrl, supabaseKey);
const manifestHandler = new ManifestHandler();

serve(async (req) => {
    if (req.method === 'POST') {
        try {
            const manifest = await req.json();
            const result = await manifestHandler.processManifest(manifest);

            if (!result.success) {
                return new Response(
                    JSON.stringify({
                        error: 'Manifesto inválido',
                        details: result.errors
                    }),
                    {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
            }

            // Armazena o manifesto validado
            const { data, error } = await supabase
                .from('mcp_manifests')
                .insert({
                    id: result.manifest_id,
                    manifest: manifest,
                    validation_result: result.validation_result
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    manifest_id: result.manifest_id,
                    data
                }),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } catch (_error) {
            return new Response(
                JSON.stringify({ error: 'Erro interno no servidor' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    } else if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('mcp_manifests')
                .select('*');

            if (error) {
                throw error;
            }

            return new Response(
                JSON.stringify(data),
                {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        } catch (_error) {
            return new Response(
                JSON.stringify({ error: 'Erro interno no servidor' }),
                {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }
    }

    return new Response(
        JSON.stringify({ error: 'Método não suportado' }),
        {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        }
    );
});