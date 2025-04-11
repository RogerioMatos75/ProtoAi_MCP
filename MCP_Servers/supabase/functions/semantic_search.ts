import { serve } from "https://deno.land/std@0.217.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Tipos
export interface SearchRequest {
    query: string;
    intent?: string;
    capabilities?: string[];
    filters?: {
        tags?: string[];
        payment_required?: boolean;
        auth_methods?: string[];
    };
}

export interface SearchResult {
    manifest_id: string;
    score: number;
    manifest: any;
    matched_capabilities: string[];
}

// Configuração do Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Handler principal
serve(async (req) => {
    try {
        const { query, intent, capabilities, filters } = await req.json() as SearchRequest;

        // Verifica cache primeiro
        const queryHash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify({ query, intent, capabilities, filters }))
        );
        const queryHashHex = Array.from(new Uint8Array(queryHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const { data: cachedResult } = await supabase
            .from('semantic_cache')
            .select('results')
            .eq('query_hash', queryHashHex)
            .single();

        if (cachedResult) {
            return new Response(
                JSON.stringify(cachedResult.results),
                { status: 200 }
            );
        }

        // Busca semântica em manifestos
        let query_builder = supabase
            .from('mcp_manifests')
            .select('*');

        // Aplica filtros
        if (filters?.tags) {
            query_builder = query_builder.contains('manifest->metadata->tags', filters.tags);
        }

        if (filters?.payment_required !== undefined) {
            query_builder = query_builder.eq('manifest->auth->requires_payment', filters.payment_required);
        }

        if (filters?.auth_methods) {
            query_builder = query_builder.contains('manifest->auth->methods', filters.auth_methods);
        }

        const { data: manifests, error } = await query_builder;

        if (error) {
            throw error;
        }

        // Calcula relevância semântica
        const results: SearchResult[] = manifests
            .map(record => {
                const manifest = record.manifest;

                // Calcula score baseado em vários fatores
                let score = 0;

                // Matching de texto
                if (manifest.description?.toLowerCase().includes(query.toLowerCase())) {
                    score += 0.3;
                }

                if (manifest.semantic_purpose?.toLowerCase().includes(query.toLowerCase())) {
                    score += 0.4;
                }

                // Matching de intenção
                if (intent && manifest.capabilities?.semantic_discovery) {
                    score += 0.5;
                }

                // Matching de capacidades
                const matched_capabilities = capabilities?.filter(cap =>
                    manifest.capabilities?.[cap] === true
                ) ?? [];

                score += (matched_capabilities.length / (capabilities?.length ?? 1)) * 0.4;

                return {
                    manifest_id: record.id,
                    score,
                    manifest,
                    matched_capabilities
                };
            })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // Limita a 10 resultados

        // Salva no cache
        await supabase
            .from('semantic_cache')
            .insert({
                query_hash: queryHashHex,
                results,
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
            });

        return new Response(
            JSON.stringify(results),
            { status: 200 }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Erro interno no servidor' }),
            { status: 500 }
        );
    }
});