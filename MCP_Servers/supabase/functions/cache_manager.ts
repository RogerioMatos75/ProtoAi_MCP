import { serve } from "https://deno.land/std@0.217.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Tipos
export interface CacheStats {
    total_entries: number;
    cache_size_kb: number;
    hit_rate: number;
    miss_rate: number;
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
        // Limpa cache expirado
        if (req.method === 'DELETE') {
            const { error } = await supabase
                .rpc('cleanup_expired_cache');

            if (error) throw error;

            return new Response(
                JSON.stringify({ message: 'Cache limpo com sucesso' }),
                { status: 200 }
            );
        }

        // Retorna estatísticas do cache
        if (req.method === 'GET') {
            const { data: entries, error: countError } = await supabase
                .from('semantic_cache')
                .select('*');

            if (countError) throw countError;

            const totalEntries = entries.length;
            const cacheSize = entries.reduce((acc, entry) =>
                acc + JSON.stringify(entry.results).length, 0) / 1024; // KB

            // Calcula taxa de hit/miss (últimas 24h)
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const { data: hits } = await supabase
                .from('cache_metrics')
                .select('*')
                .gt('timestamp', oneDayAgo.toISOString());

            const totalRequests = hits?.length ?? 0;
            const cacheHits = hits?.filter(h => h.hit_type === 'hit').length ?? 0;

            const stats: CacheStats = {
                total_entries: totalEntries,
                cache_size_kb: Math.round(cacheSize * 100) / 100,
                hit_rate: totalRequests ? (cacheHits / totalRequests) : 0,
                miss_rate: totalRequests ? ((totalRequests - cacheHits) / totalRequests) : 0
            };

            return new Response(
                JSON.stringify(stats),
                { status: 200 }
            );
        }

        // Registra métricas do cache
        if (req.method === 'POST') {
            const { hit_type } = await req.json();

            const { error } = await supabase
                .from('cache_metrics')
                .insert({
                    hit_type,
                    timestamp: new Date().toISOString()
                });

            if (error) throw error;

            return new Response(
                JSON.stringify({ message: 'Métrica registrada' }),
                { status: 200 }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Método não suportado' }),
            { status: 405 }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Erro interno no servidor' }),
            { status: 500 }
        );
    }
});