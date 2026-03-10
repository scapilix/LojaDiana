const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ebdcmiuzrrtmmphwxynw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImViZGNtaXV6cnJ0bW1waHd4eW53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzAyMjksImV4cCI6MjA4NDg0NjIyOX0.QNInacY_9ZhDUhNmiYTXVccYNxc0kk71EsdME9AKJW0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAllData() {
    console.log('=== LIMPEZA DE DADOS - Loja Diana ===');

    // 1. Clear orders from loja_app_state
    console.log('\n1. Limpando import_orders e import_stats...');
    const { data: stateRows } = await supabase.from('loja_app_state').select('key');
    if (stateRows) {
        console.log('   Keys em loja_app_state:', stateRows.map(r => r.key));
    }

    await supabase.from('loja_app_state').delete().eq('key', 'import_orders');
    await supabase.from('loja_app_state').insert({ key: 'import_orders', value: [] });
    await supabase.from('loja_app_state').delete().eq('key', 'import_stats');
    await supabase.from('loja_app_state').insert({ key: 'import_stats', value: [] });
    await supabase.from('loja_app_state').delete().eq('key', 'manual_products_catalog');
    await supabase.from('loja_app_state').insert({ key: 'manual_products_catalog', value: [] });
    console.log('   ✅ import_orders, import_stats e manual_products_catalog vazios');

    // 2. Clear loja_compras (stock)
    console.log('\n2. Limpando loja_compras (stock)...');
    const { error: comprasError } = await supabase.from('loja_compras').delete().gte('id', 0);
    if (comprasError) console.log('   Aviso loja_compras:', comprasError.message);
    else console.log('   ✅ loja_compras limpo');

    // 3. Verify
    console.log('\n=== VERIFICAÇÃO FINAL ===');
    const { data: orders } = await supabase.from('loja_app_state').select('key, value').eq('key', 'import_orders');
    console.log('import_orders:', JSON.stringify(orders));

    const { count: comprasCount } = await supabase.from('loja_compras').select('*', { count: 'exact', head: true });
    console.log('loja_compras count:', comprasCount);

    console.log('\n✅ Limpeza concluída!');
}

clearAllData();
