import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zpdyiwcvdkdgglywmztm.supabase.co';
const supabaseAnonKey = 'sb_publishable_Ijt9VDp2zGn1gokHAEeUig_op2GR1Sr';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
