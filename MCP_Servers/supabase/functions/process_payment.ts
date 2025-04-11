import { serve } from "https://deno.land/std@0.217.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

// Tipos
export interface PaymentRequest {
    manifest_id: string;
    amount: number;
    payment_method: 'token_transfer' | 'stream';
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
        const { manifest_id, amount, payment_method } = await req.json() as PaymentRequest;

        // Valida saldo $PAi
        const { data: balance, error: balanceError } = await supabase
            .from('pai_balances')
            .select('amount')
            .eq('user_id', req.headers.get('user_id'))
            .single();

        if (balanceError || !balance || balance.amount < amount) {
            return new Response(
                JSON.stringify({ error: 'Saldo $PAi insuficiente' }),
                { status: 400 }
            );
        }

        // Registra transação
        const { data: transaction, error: txError } = await supabase
            .from('mcp_transactions')
            .insert({
                manifest_id,
                pai_amount: amount,
                payment_method,
                status: 'processing'
            })
            .select()
            .single();

        if (txError) {
            throw txError;
        }

        // Processa pagamento (simulado nesta versão)
        const success = Math.random() > 0.1; // 90% de sucesso

        if (success) {
            // Atualiza saldo e status
            await Promise.all([
                supabase
                    .from('pai_balances')
                    .update({ amount: balance.amount - amount })
                    .eq('user_id', req.headers.get('user_id')),

                supabase
                    .from('mcp_transactions')
                    .update({ status: 'completed' })
                    .eq('id', transaction.id)
            ]);

            return new Response(
                JSON.stringify({
                    success: true,
                    transaction_id: transaction.id,
                    new_balance: balance.amount - amount
                }),
                { status: 200 }
            );
        } else {
            // Marca transação como falha
            await supabase
                .from('mcp_transactions')
                .update({ status: 'failed' })
                .eq('id', transaction.id);

            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Falha no processamento do pagamento'
                }),
                { status: 500 }
            );
        }

    } catch (error) {
        return new Response(
            JSON.stringify({ error: 'Erro interno no servidor' }),
            { status: 500 }
        );
    }
});