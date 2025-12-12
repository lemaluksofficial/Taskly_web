// 1. Конфигурация
const SUPABASE_URL = 'https://irvnqvxxnsoradhueril.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlydm5xdnh4bnNvcmFkaHVlcmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1NTYyMjcsImV4cCI6MjA4MTEzMjIyN30.xgfgkDd_b03KnZb1iBQmcSdmPBVqD2HXeqYSBdgnveM';

// 2. Инициализация
// ВАЖНО: Используем другое имя переменной (supabaseClient), чтобы создать подключение
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 3. Перезаписываем глобальную переменную, чтобы остальные скрипты (core.js, tasks.js) видели клиент
window.supabase = supabaseClient;

// 4. Текущий пользователь
let CURRENT_USER_ID = null; 

if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) {
    CURRENT_USER_ID = Telegram.WebApp.initDataUnsafe.user.id;
}

// === Функция проверки/создания пользователя ===
async function ensureUserExists() {
    if (!CURRENT_USER_ID) {
        console.error('Ошибка: ID пользователя не найден');
        return;
    }
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id')
            .eq('user_id', CURRENT_USER_ID)
            .single();

        if (!data) {
            console.log('Создаем нового пользователя:', CURRENT_USER_ID);
            const { error: insertError } = await supabase
                .from('users')
                .insert([{ user_id: CURRENT_USER_ID }]);
            
            if (insertError) {
                console.error('Ошибка создания пользователя:', insertError);
            }
        }
    } catch (e) {
        console.error('Ошибка в ensureUserExists:', e);
    }
}