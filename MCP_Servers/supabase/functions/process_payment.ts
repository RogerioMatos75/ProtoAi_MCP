import { serve } from "https://deno.land/std@0.217.0/http/server.ts";

serve((_req) => {
    return new Response(
        JSON.stringify({
            error: 'Sistema de pagamentos ainda não implementado',
            status: 'not_implemented'
        }),
        {
            status: 501,
            headers: { 'Content-Type': 'application/json' }
        }
    );
});