 // --- Инициализация при загрузке ---
 document.addEventListener('DOMContentLoaded', () => {
  // Инициализация Telegram WebApp
  const tg = window.Telegram.WebApp;
  
  // 1. Сначала расширяем
  tg.expand();

  // 2. 🔥 ВАЖНО: Устанавливаем цвета ДО tg.ready() если возможно, 
  // или сразу же. Цвета должны совпадать с вашим CSS #0f1419
  tg.setBackgroundColor('#0f1419'); 
  tg.setHeaderColor('#1e2936'); // Убедитесь, что это совпадает с .app-header background
  
  // Включаем подтверждение закрытия, чтобы свайп случайно не закрыл апп
  tg.enableClosingConfirmation(); 

  tg.ready();

  loadData();
  updateDashboardCounters();
  setupTabs();
  renderAllCategoryStats();
  generateHeatmap('heatmapGridMonth');
  generateYearHeatmap('heatmapGridYear');
  // resizeAppContent();
  // window.addEventListener('resize', resizeAppContent);

  initModalEventListeners();
  initGoalModalEventListeners();
  initAvatarPicker();
  initCategoriesUI();
  initSmartBackButton();
  initAllModalsSwipe();
  // 🔥 НОВОЕ: Специальная инициализация кнопки UNDO для мобильных
  initUndoButton();
});
 
 // --- НОВАЯ ФУНКЦИЯ ДЛЯ КНОПКИ ОТМЕНЫ ---
function initUndoButton() {
  const undoBtn = document.getElementById('toastUndo');
  if (!undoBtn) return;

  // Обработчик события
  const handleUndo = (e) => {
    // Предотвращаем любые побочные эффекты (скролл, зум, двойной клик)
    e.preventDefault();
    e.stopPropagation();
    
    // Вызываем функцию отмены
    undoAction();
  };

  // Вешаем обработчик и на касание (для скорости на телефоне), и на клик (для ПК)
  // { passive: false } важно, чтобы e.preventDefault() сработал
  undoBtn.addEventListener('touchend', handleUndo, { passive: false });
  undoBtn.addEventListener('click', handleUndo);
}
 
let isUndoing = false;
 
 
 /* --- ============================================ --- */
    /* --- ЛОГИКА СТАРОГО КОДА (Профиль, Статистика) --- */
    /* --- ============================================ --- */

    const defaultAvatarSymbol = '🌸';
    let avatarFileInput = null;
    let lastDeletedData = null;

// Глобальные хранилища и состояние списков
let tasksDB = [];
let goalsDB = [];
let profileCategories = [];
let totalCompletedTasksCount = 0; // Хранит общее число выполненных за всё время

let currentGoalsFilter = null; // 'active' | 'achieved' | null
let currentTasksFilter = null; // 'today' | 'tomorrow' | 'week' | 'all' | 'completed-7days' | null

    function setDefaultAvatar() {
      const avatar = document.querySelector('.avatar');
      const profileAvatar = document.querySelector('.profile-avatar-img');
      if (avatar) {
        avatar.textContent = defaultAvatarSymbol;
        avatar.style.backgroundImage = '';
        avatar.classList.remove('has-image');
      }
      if (profileAvatar) {
        profileAvatar.textContent = defaultAvatarSymbol;
        profileAvatar.style.backgroundImage = '';
        profileAvatar.classList.remove('has-image');
      }
    }

    function applyAvatarFromFile(file) {
      if (!file) {
        if (avatarFileInput) avatarFileInput.value = '';
        return;
      }
    
      // Проверка размера файла (не более 1.5 МБ, чтобы не забивать базу)
      if (file.size > 1.5 * 1024 * 1024) {
        showToast('Файл слишком большой (макс 1.5МБ)');
        if (avatarFileInput) avatarFileInput.value = '';
        return;
      }
    
      if (!file.type.startsWith('image/')) {
        showToast('Выберите изображение');
        if (avatarFileInput) avatarFileInput.value = '';
        return;
      }
    
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result;
    
        // 1. Обновляем UI мгновенно
        updateAvatarUI(base64String);
    
        // 2. Сохраняем в базу данных
        await saveUserAvatarToDB(base64String);
    
        if (avatarFileInput) avatarFileInput.value = '';
      };
      reader.readAsDataURL(file);
    }
    
    // Вспомогательная функция для обновления DOM (используется и при загрузке, и при выборе)
    function updateAvatarUI(imageSrc) {
      const avatar = document.querySelector('.avatar');
      const profileAvatar = document.querySelector('.profile-avatar-img');
      
      if (avatar) {
        avatar.style.backgroundImage = `url(${imageSrc})`;
        avatar.classList.add('has-image');
        avatar.textContent = '';
      }
      if (profileAvatar) {
        profileAvatar.style.backgroundImage = `url(${imageSrc})`;
        profileAvatar.classList.add('has-image');
        profileAvatar.textContent = '';
      }
    }
    
    // Сохранение аватара в таблицу users
async function saveUserAvatarToDB(base64String) {
  try {
    const { error } = await supabase
      .from('users')
      .update({ avatar_url: base64String })
      .eq('user_id', CURRENT_USER_ID);

    if (error) throw error;
    console.log('✅ Аватар сохранен в базе');
    showToast('Аватар обновлен');
  } catch (e) {
    console.error('Ошибка сохранения аватара:', e);
    showToast('Не удалось сохранить аватар');
  }
}

// Загрузка аватара при старте
async function loadUserAvatar() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('user_id', CURRENT_USER_ID)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = нет данных, это не критично
        console.error('Ошибка загрузки аватара:', error);
        return;
    }

    if (data && data.avatar_url) {
      updateAvatarUI(data.avatar_url);
    } else {
      // Если аватара нет, ставим дефолтный
      setDefaultAvatar();
    }
  } catch (e) {
    console.error('Ошибка в loadUserAvatar:', e);
  }
}
    function initAvatarPicker() {
      avatarFileInput = document.getElementById('avatarFileInput');
      if (!avatarFileInput) return;
      setDefaultAvatar();
      avatarFileInput.addEventListener('change', (event) => {
        const file = event.target.files && event.target.files[0];
        applyAvatarFromFile(file);
      });
    }

    function openAvatarPicker() {
      if (!avatarFileInput) {
        avatarFileInput = document.getElementById('avatarFileInput');
      }
      if (avatarFileInput) {
        avatarFileInput.click();
      }
    }

    // ОТКРЫТИЕ ЭКРАНА ПРОФИЛЯ
    function toggleProfileMenu(event) {
      if (event) event.stopPropagation();
      openProfilePage();
    }

    function openProfilePage() {
      const profilePage = document.getElementById('profilePage');
      if (!profilePage) return;
      profilePage.classList.add('active');
      profilePage.setAttribute('aria-hidden', 'false');
      setFabVisible(false);
      animateProfileRing();
    }

    function closeProfilePage() {
      const profilePage = document.getElementById('profilePage');
      if (!profilePage) return;
    
      // --- ИСПРАВЛЕНИЕ ---
      // Если текущий элемент в фокусе находится внутри профиля, снимаем фокус
      if (document.activeElement && profilePage.contains(document.activeElement)) {
        document.activeElement.blur(); // Снимаем фокус с кнопки "Назад"
      }
      // -------------------
    
      profilePage.classList.remove('active');
      profilePage.setAttribute('aria-hidden', 'true');
      setFabVisible(true);
    }

    function animateProfileRing() {
      const ring = document.getElementById('profileLevelRing');
      if (!ring) return;
      const radius = 54;
      const circumference = 2 * Math.PI * radius;
      const percent = 62;
      const offset = circumference - (percent / 100) * circumference;

      ring.style.strokeDasharray = `${circumference}`;
      ring.style.strokeDashoffset = circumference;

      requestAnimationFrame(() => {
        ring.style.strokeDashoffset = offset;
      });
    }

    /* --- Категории в профиле --- */
    const categoryColors = [
      '#667eea', '#4facfe', '#43e97b', '#fa709a', '#ffa726',
      '#ef5350', '#ab47bc', '#26c6da', '#ff9f43', '#1dd1a1',
      '#5f27cd', '#54a0ff', '#ff6b81', '#8395a7', '#222f3e'
    ];

    const availableIcons = [
      '📂', '💼', '🏠', '🎓', '💪', '✈️', '🛒', '🎮',
      '💰', '🍕', '🐶', '❤️', '⭐', '🚗', '💊', '📚',
      '🔧', '💻', '🎨', '🎵', '🎁', '👶', '💳', '🌲',
      '🔥', '🔑', '💡', '📷', '🍔', '🏖️', '📅', '💸'
    ];

    let BASE_CATEGORY_ID = null;

  

    let newCategoryState = { name: '', icon: availableIcons[0], color: categoryColors[0] };
    let lastDeletedCategory = null;
    let toastTimer = null;

    function initCategoriesUI() {
      renderCategoriesList();
      renderColorSelector();
      renderIconSelector();
      updatePreview();
    
      // LIVE PREVIEW: Слушатель ввода имени
      const nameInput = document.getElementById('newCatName');
      if (nameInput) {
        // Клонируем, чтобы удалить старые слушатели
        const newNameInput = nameInput.cloneNode(true);
        nameInput.parentNode.replaceChild(newNameInput, nameInput);
    
        newNameInput.addEventListener('input', (e) => {
          newCategoryState.name = e.target.value;
          if (newNameInput.classList.contains('error')) newNameInput.classList.remove('error');
          updatePreview();
        });
      }
    }
    function renderIconSelector() {
      const container = document.getElementById('iconSelector');
      if (!container) return;
      container.innerHTML = '';
      availableIcons.forEach(icon => {
        const btn = document.createElement('div');
        btn.className = `icon-btn ${icon === newCategoryState.icon ? 'active' : ''}`;
        btn.textContent = icon;
        btn.onclick = () => selectIcon(icon, btn);
        container.appendChild(btn);
      });
    }

    function selectIcon(icon, el) {
      const btns = document.querySelectorAll('.icon-btn');
      btns.forEach((b) => b.classList.remove('active'));
      el.classList.add('active');

      newCategoryState.icon = icon;
      updatePreview();
      vibrate(5);
    }

    

    function openCategoryModal() {
      const overlay = document.getElementById('catModalOverlay');
      const modal = document.getElementById('catModal');
      if (!overlay || !modal) return;
      overlay.classList.add('active');
      modal.style.transform = '';
      vibrate(10);
    }

    function closeCategoryModal() {
      const overlay = document.getElementById('catModalOverlay');
      if (!overlay) return;
      overlay.classList.remove('active');
    }

    function getDefaultCategoryId() {
      const def = profileCategories.find(c => c.isDefault);
      return def ? def.id : (profileCategories[0]?.id || null);
  }

    function ensureUniqueCategoryId(name) {
      const slug = (name || 'cat')
        .toLowerCase()
        .replace(/[^a-z0-9а-яё]+/gi, '-');

      const cleaned = slug.replace(/^-+|-+$/g, '') || 'cat';
      let uniqueId = cleaned;
      let suffix = 1;
      while (profileCategories.some((cat) => String(cat.id) === String(uniqueId))) {
        uniqueId = `${cleaned}-${suffix++}`;
      }
      return uniqueId;
    }

    // 1. Асинхронное создание категории
    async function addCategory() {
      const input = document.getElementById('newCatName');
      if (!input) return;
      const name = newCategoryState.name.trim();
    
      // Валидация
      if (!name) {
        input.classList.add('error'); // Запускает CSS анимацию shake
        vibrate([30, 50, 30]);
        setTimeout(() => input.classList.remove('error'), 500); // Снимаем класс после анимации
        return;
      }
    
      const saveBtn = document.querySelector('.new-cat-section .add-btn');
      if(saveBtn) saveBtn.disabled = true;
    
      try {
        // A. Отправка в Supabase
        const { data, error } = await supabase
          .from('categories')
          .insert([{
            user_id: CURRENT_USER_ID,
            name: name,
            icon: newCategoryState.icon,
            color: newCategoryState.color,
            is_default: false
          }])
          .select()
          .single();
    
        if (error) throw error;
    
        // B. Обновление локального массива
        const mappedCat = mapCategoryFromDB(data);
        profileCategories.push(mappedCat);
    
        // C. Сброс UI
        input.value = '';
        newCategoryState.name = '';
        // Сбрасываем на дефолты
        newCategoryState.icon = availableIcons[0]; 
        newCategoryState.color = categoryColors[0];
        
        renderIconSelector();
        renderColorSelector();
        updatePreview();
    
        // D. Перерисовка списка и АНИМАЦИЯ ПОЯВЛЕНИЯ
        renderCategoriesList(); // Строит список заново
    
        // Находим только что добавленный элемент (последний в списке)
        const list = document.getElementById('categoriesList');
        if (list && list.lastElementChild) {
            // Добавляем класс для анимации выезда
            list.lastElementChild.classList.add('new-item');
            
            // Автоскролл вниз к новой категории
            setTimeout(() => {
                list.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    
        // Обновляем селекторы в других модалках (задачи/цели)
        if (typeof refreshAllCategoryUI === 'function') refreshAllCategoryUI();
    
        showToast('Категория создана');
        vibrate(20);
    
      } catch (e) {
        console.error('Ошибка создания категории:', e);
        showToast('Ошибка при создании');
      } finally {
        if(saveBtn) saveBtn.disabled = false;
      }
    }

    // 2. Асинхронное удаление категории
    async function deleteCategory(idStr) {
      const targetId = String(idStr);
      
      const catIndex = profileCategories.findIndex(c => String(c.id) === targetId);
      if (catIndex === -1) return;
      const catToDelete = profileCategories[catIndex];
    
      if (catToDelete.isDefault) {
        showToast('Базовую категорию нельзя удалить');
        return;
      }
    
      // --- 1. ЗАПОМИНАЕМ СВЯЗИ (До того, как их изменим) ---
      // Находим все задачи и цели, которые сейчас принадлежат удаляемой категории
      const affectedTaskIds = tasksDB
          .filter(t => String(t.category) === targetId)
          .map(t => t.id);
    
      const affectedGoalIds = goalsDB
          .filter(g => String(g.category) === targetId)
          .map(g => g.id);
    
      // --- 2. Сохраняем расширенный бэкап для Undo ---
      lastDeletedData = {
        type: 'category',
        item: catToDelete,
        index: catIndex,
        movedTasks: affectedTaskIds, // <--- Сохранили ID задач
        movedGoals: affectedGoalIds  // <--- Сохранили ID целей
      };
    
      try {
        // 3. ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ UI
        const defaultCat = profileCategories.find(c => c.isDefault) || profileCategories[0];
        const fallbackId = defaultCat ? String(defaultCat.id) : null;
    
        if (fallbackId) {
            // А. Локальный перенос (визуально меняем на "Другое")
            tasksDB.forEach(task => {
                if (String(task.category) === targetId) task.category = fallbackId;
            });
            goalsDB.forEach(goal => {
                if (String(goal.category) === targetId) {
                    goal.category = fallbackId;
                    goal.icon = '⭐'; 
                }
            });
    
            // Б. Перенос в БД (чтобы данные не потерялись при перезагрузке)
            if (fallbackId !== 'other' && !isNaN(parseInt(fallbackId)) && !isNaN(parseInt(targetId))) {
                 await supabase
                    .from('tasks')
                    .update({ category_id: parseInt(fallbackId) })
                    .eq('category_id', parseInt(targetId));
    
                 await supabase
                    .from('goals')
                    .update({ category_id: parseInt(fallbackId) })
                    .eq('category_id', parseInt(targetId));
            }
        }
    
        // В. Удаляем из массива категорий локально
        profileCategories.splice(catIndex, 1);
    
        // Г. Обновляем UI
        renderCategoriesList();
        if (typeof refreshAllCategoryUI === 'function') refreshAllCategoryUI();
        if (typeof refreshOpenContextAfterTaskChange === 'function') refreshOpenContextAfterTaskChange();
        if (typeof refreshOpenContextAfterGoalChange === 'function') refreshOpenContextAfterGoalChange();
    
        showToast('Категория удалена', true); 
        vibrate(10);
    
        // 4. Удаляем саму категорию из БД
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', targetId);
    
        if (error) throw error;
    
        console.log(`✅ Категория удалена. Затронуто задач: ${affectedTaskIds.length}`);
    
      } catch (e) {
        console.error('Ошибка удаления:', e);
        showToast('Не удалось удалить', false);
        
        // 1. Возвращаем категорию назад в массив
        profileCategories.splice(catIndex, 0, catToDelete);
        
        // 2. [УЛУЧШЕНИЕ] Возвращаем задачам и целям старую категорию (Откат локальных изменений)
        // targetId - это ID категории, которую мы пытались удалить
        if (lastDeletedData && lastDeletedData.movedTasks) {
            lastDeletedData.movedTasks.forEach(taskId => {
                const t = tasksDB.find(x => x.id === taskId);
                if (t) t.category = targetId; 
            });
        }
        if (lastDeletedData && lastDeletedData.movedGoals) {
            lastDeletedData.movedGoals.forEach(goalId => {
                const g = goalsDB.find(x => x.id === goalId);
                if (g) {
                    g.category = targetId;
                    // Иконку вернуть сложнее, если не сохранили, но категория важнее
                }
            });
        }
    
        // 3. Перерисовываем UI
        renderCategoriesList();
        if (typeof refreshOpenContextAfterTaskChange === 'function') refreshOpenContextAfterTaskChange();
        if (typeof refreshOpenContextAfterGoalChange === 'function') refreshOpenContextAfterGoalChange();
      }
    }





/* --- Обновленная функция undoAction (core.js) --- */
async function undoAction() {
  // 1. Проверки безопасности
  if (!lastDeletedData) return;
  if (isUndoing) return; // Блокировка: если уже восстанавливаем, игнорируем новые клики

  // 2. Блокировка интерфейса
  isUndoing = true; 
  const undoBtn = document.getElementById('toastUndo');
  if (undoBtn) undoBtn.style.opacity = '0.5'; // Визуальный отклик

  const item = lastDeletedData.item;
  const index = lastDeletedData.index;
  const type = lastDeletedData.type;

  // Хелпер для приоритетов
  const PRIORITY_LEVELS = { low: 1, medium: 2, high: 3, extreme: 4 };

  try {
    // ============================================
    // 1. Восстановление КАТЕГОРИИ
    // ============================================
    if (type === 'category') {
      // UI
      profileCategories.splice(index, 0, item);
      renderCategoriesList(); 

      // БД
      const { error } = await supabase.from('categories').insert([{
          id: item.id,
          user_id: CURRENT_USER_ID,
          name: item.name,
          icon: item.icon,
          color: item.color,
          is_default: false
      }]);
      if (error) throw error;

      // Восстановление связей
      const restoredCatId = String(item.id);
      const movedTasks = lastDeletedData.movedTasks || [];
      const movedGoals = lastDeletedData.movedGoals || [];

      if (movedTasks.length > 0) {
          await supabase.from('tasks').update({ category_id: parseInt(restoredCatId) }).in('id', movedTasks);
          movedTasks.forEach(taskId => {
              const t = tasksDB.find(x => x.id === taskId);
              if (t) t.category = restoredCatId;
          });
      }

      if (movedGoals.length > 0) {
          await supabase.from('goals').update({ category_id: parseInt(restoredCatId) }).in('id', movedGoals);
          movedGoals.forEach(goalId => {
              const g = goalsDB.find(x => x.id === goalId);
              if (g) { g.category = restoredCatId; g.icon = item.icon || '🎯'; }
          });
      }

      refreshAllCategoryUI(); 
      // Обновляем списки, если они открыты
      const listContent = document.getElementById('listModalContent');
      const isListOpen = listContent && document.getElementById('listModalOverlay').classList.contains('active');
      if (isListOpen && typeof applyFilters === 'function') {
        applyFilters();
      }
      
      showToast('Категория восстановлена');
    }

    // ============================================
    // 2. Восстановление ЗАДАЧИ (ОДИНОЧНОЙ)
    // ============================================
    else if (type === 'task') {
      const subtasks = lastDeletedData.subtasks || [];
      
      // А. Возвращаем в массив памяти
      tasksDB.splice(index, 0, item);
      
      // Б. Восстанавливаем счетчик выполненных, если нужно
      if (item.completed && typeof totalCompletedTasksCount !== 'undefined') {
        totalCompletedTasksCount++;
      }
      
      // В. Обновляем счетчики на дашборде и в фильтрах
      updateDashboardCounters();
      updateFilterCounts();

      // Г. 🔥 ИСПРАВЛЕНИЕ UI: Полная перерисовка списка вместо ручной вставки
      // Это гарантирует, что задача попадет в правильную "day-group" (группу даты)
      const listContent = document.getElementById('listModalContent');
      const isListOpen = listContent && document.getElementById('listModalOverlay').classList.contains('active');

      if (isListOpen && currentTasksFilter && typeof applyFilters === 'function') {
          // applyFilters заново отрендерит список (включая таймлайны выполненных)
          applyFilters();
      }

      // Д. БД: Восстановление задачи
      let catId = parseInt(item.category);
      if (isNaN(catId)) {
         const def = profileCategories.find(c => c.isDefault) || profileCategories[0];
         catId = def ? parseInt(def.id) : null;
      }

      const restorePayload = {
        id: item.id,
        user_id: CURRENT_USER_ID,
        title: item.title,
        date_for: item.date,
        duration: item.duration_min,
        priority: item.priority,
        priority_level: PRIORITY_LEVELS[item.priority] || 1,
        category_id: catId,
        completed: item.completed,
        completed_at: item.completedAt,
        created_at: new Date().toISOString() 
      };

      const { error } = await supabase.from('tasks').insert([restorePayload]);
      if (error) throw error;

      // Е. БД: Восстановление подзадач
      if (subtasks.length > 0) {
        const subtasksPayload = subtasks.map((st, i) => ({
          id: st.id,
          task_id: item.id,
          title: st.title,
          completed: st.completed,
          position: st.position !== undefined ? st.position : i
        }));
        const { error: subError } = await supabase.from('subtasks').insert(subtasksPayload);
        if (subError) throw subError;
      }
      
      showToast('Задача восстановлена');
    }

    // ============================================
    // 3. Восстановление ЦЕЛИ (goal-complete / goal)
    // ============================================
    else if (type === 'goal-complete' || type === 'goal-reactivate') {
      goalsDB[index] = item;
      updateDashboardCounters();
      
      await supabase.from('goals').update({ 
          completed: (type === 'goal-reactivate'), 
          completed_at: item.completedAt,
          progress: item.progress 
        }).eq('id', item.id);

      if (type === 'goal-complete' && item.subgoals && item.subgoals.length > 0) {
         const subgoalsPayload = item.subgoals.map(sg => ({
          id: sg.id, goal_id: item.id, title: sg.title, deadline: sg.deadline,
          completed: sg.completed, completed_at: sg.completedAt
        }));
        await supabase.from('subgoals').upsert(subgoalsPayload);
      } else if (type === 'goal-reactivate') {
         await supabase.from('subgoals').update({ completed: true, completed_at: item.completedAt }).eq('goal_id', item.id);
      }

      if (typeof rerenderGoalsListIfOpen === 'function') rerenderGoalsListIfOpen();
      showToast('Статус цели восстановлен');
    }
    
    // ============================================
    // 4. Восстановление УДАЛЕННОЙ ЦЕЛИ
    // ============================================
    else if (type === 'goal') {
      // UI
      goalsDB.splice(index, 0, item);
      updateDashboardCounters();
      if (typeof rerenderGoalsListIfOpen === 'function') rerenderGoalsListIfOpen();

      // БД
      let catId = parseInt(item.category);
      if (isNaN(catId)) {
          const def = profileCategories.find(c => c.isDefault) || profileCategories[0];
          catId = def ? parseInt(def.id) : null;
      }

      const goalPayload = {
        id: item.id, user_id: CURRENT_USER_ID, title: item.title, deadline: item.deadline,
        description: item.description, icon: item.icon, progress: item.progress,
        category_id: catId, completed: !item.active, completed_at: item.completedAt,
        created_at: item.createdAt || new Date().toISOString()
      };

      const { error: goalError } = await supabase.from('goals').insert([goalPayload]);
      if (goalError) throw goalError;

      if (item.subgoals && item.subgoals.length > 0) {
        const subgoalsPayload = item.subgoals.map(sg => ({
           id: sg.id, goal_id: item.id, title: sg.title, deadline: sg.deadline,
           completed: sg.completed, completed_at: sg.completedAt
        }));
        const { error: subError } = await supabase.from('subgoals').insert(subgoalsPayload);
        if (subError) throw subError;
      }
      showToast('Цель восстановлена');
    }

    // ============================================
    // 5. Восстановление ПОДЦЕЛИ (в деталях)
    // ============================================
    else if (type === 'subgoal-detail') {
      const goal = goalsDB.find(g => g.id === lastDeletedData.goalId);
      if (goal) {
        if (!goal.subgoals) goal.subgoals = [];
        goal.subgoals.splice(index, 0, item);
        
        goal.totalSubgoals = goal.subgoals.length;
        if (item.completed) goal.completedSubgoals = (goal.completedSubgoals || 0) + 1;
        goal.progress = goal.totalSubgoals > 0 ? Math.round((goal.completedSubgoals / goal.totalSubgoals) * 100) : 0;

        updateDashboardCounters();
        if (typeof openGoalDetail === 'function') openGoalDetail(goal.id);
        
        const { error } = await supabase.from('subgoals').insert([{
            id: item.id, goal_id: goal.id, title: item.title, deadline: item.deadline,
            completed: item.completed, completed_at: item.completedAt
          }]);
        if(error) throw error;
        
        await supabase.from('goals').update({ progress: goal.progress }).eq('id', goal.id);
        showToast('Подцель восстановлена');
      }
    }
    
    // ============================================
    // 6. Восстановление ПОДЗАДАЧИ (в списке)
    // ============================================
    else if (type === 'subtask-list') { 
      const task = tasksDB.find(t => t.id === lastDeletedData.taskId);
      if (task) {
          if (!task.subtasks) task.subtasks = [];
          if (typeof index === 'number' && index >= 0) task.subtasks.splice(index, 0, item);
          else task.subtasks.push(item);

          task.totalSubtasks = task.subtasks.length;
          task.completedSubtasks = task.subtasks.filter(st => st.completed).length;
          
          updateDashboardCounters();
          // Здесь используем безопасное обновление списка задач
          if (typeof rerenderTasksListIfOpen === 'function') rerenderTasksListIfOpen();
          
          const { error } = await supabase.from('subtasks').insert([{
                id: item.id, task_id: task.id, title: item.title,
                completed: item.completed, position: item.position || 0
            }]);
          if (error) throw error;
          showToast('Подзадача восстановлена');
      }
    }

    // ============================================
    // 7. ВОССТАНОВЛЕНИЕ СЕРИИ ЗАДАЧ
    // ============================================
    else if (type === 'task-series') {
      const restoredTasks = lastDeletedData.tasks || [];
      const groupId = lastDeletedData.groupId;
      
      // А. Оптимистичное возвращение в массив данных
      restoredTasks.forEach(t => {
          const exists = tasksDB.some(existing => existing.id === t.id);
          if (!exists) tasksDB.push(t);
      });

      // Б. Восстанавливаем счетчик для серии
      const completedInSeries = restoredTasks.filter(t => t.completed).length;
      if (completedInSeries > 0 && typeof totalCompletedTasksCount !== 'undefined') {
          totalCompletedTasksCount += completedInSeries;
      }
      // Сортируем массив данных (для порядка)
      tasksDB.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

      updateDashboardCounters();
      updateFilterCounts();

      // В. 🔥 ИСПРАВЛЕНИЕ UI: Полная перерисовка списка
      const listContent = document.getElementById('listModalContent');
      const isListOpen = listContent && document.getElementById('listModalOverlay').classList.contains('active');

      if (isListOpen && currentTasksFilter && typeof applyFilters === 'function') {
          // applyFilters заново построит структуру, включая day-group для выполненных
          applyFilters();
      }

      // Г. Восстановление в БД (Используем UPSERT)
      // 1. ГРУППА
      const groupDesc = restoredTasks[0] ? `Series: ${restoredTasks[0].title}` : 'Restored Series';
      const { error: groupError } = await supabase.from('task_groups').upsert([{ 
            id: groupId, user_id: CURRENT_USER_ID, description: groupDesc 
        }]);
      if (groupError) throw groupError;

      // 2. ЗАДАЧИ
      const tasksPayload = restoredTasks.map(t => {
          let catId = parseInt(t.category);
          if (isNaN(catId)) {
             const def = profileCategories.find(c => c.isDefault) || profileCategories[0];
             catId = def ? parseInt(def.id) : null;
          }
          return {
            id: t.id, user_id: CURRENT_USER_ID, title: t.title, date_for: t.date,
            duration: t.duration_min, priority: t.priority,
            priority_level: PRIORITY_LEVELS[t.priority] || 1,
            category_id: catId, completed: t.completed, completed_at: t.completedAt,
            group_id: groupId, created_at: new Date().toISOString()
          };
      });
      const { error: tasksError } = await supabase.from('tasks').upsert(tasksPayload);
      if (tasksError) throw tasksError;

      // 3. ПОДЗАДАЧИ
      const subtasksPayload = [];
      restoredTasks.forEach(t => {
          if (t.subtasks && t.subtasks.length > 0) {
              t.subtasks.forEach((st, i) => {
                  subtasksPayload.push({
                      id: st.id, task_id: t.id, title: st.title,
                      completed: st.completed, position: st.position !== undefined ? st.position : i
                  });
              });
          }
      });

      if (subtasksPayload.length > 0) {
          const { error: subError } = await supabase.from('subtasks').upsert(subtasksPayload);
          if (subError) throw subError;
      }

      showToast('Серия задач восстановлена');
    }
    // ============================================
    // 8. Восстановление ЖЕЛАНИЯ (WISH)
    // ============================================
    else if (type === 'wish') {
      // А. Возвращаем в локальный массив по индексу
      wishesDB.splice(index, 0, item);
      
      // Б. Обновляем UI
      updateWishCounters();
      // Если открыт список желаний, перерисовываем его
      if (document.getElementById('listModalOverlay').classList.contains('active')) {
          // Определяем, какой фильтр сейчас активен в желаниях
          const filter = typeof currentWishesFilter !== 'undefined' ? currentWishesFilter : 'active';
          renderWishesList(filter);
      }

      // В. Восстановление в БД (Supabase)
      // Вставляем объект целиком, включая оригинальный id и даты
      const { error } = await supabase.from('wishes').insert([{
          id: item.id,
          user_id: CURRENT_USER_ID,
          title: item.title,
          desire_level: item.desire_level,
          created_at: item.created_at || new Date().toISOString(),
          achieved_at: item.achieved_at // Восстановит статус "Исполнено", если он был
      }]);

      if (error) throw error;
      showToast('✨ Желание восстановлено');
    }

  } catch (e) {
    console.error('Ошибка при отмене действия (undo):', e);
    showToast('Не удалось отменить действие', false);
  } finally {
    isUndoing = false;
    lastDeletedData = null;
    if (undoBtn) undoBtn.style.opacity = '1';
    
    // Скрываем тост
    const t = document.getElementById('toast');
    if (t) {
        t.classList.remove('visible');
        if(window.toastTimer) clearTimeout(window.toastTimer);
    }
    vibrate(10);
  }
}
function renderCategoriesList() {
  const list = document.getElementById('categoriesList');
  if (!list) return;
  list.innerHTML = '';

  profileCategories.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'cat-item';
    
    // Генерируем полупрозрачный фон для иконки
    const iconBg = hexToRgba(cat.color, 0.12); // 12% opacity
    const iconBorder = hexToRgba(cat.color, 0.3);

    // Определяем, является ли категория базовой (нельзя удалить)
    const isDefault = cat.isDefault || String(cat.id) === String(BASE_CATEGORY_ID);
    const deleteClass = isDefault ? 'cat-item-delete disabled' : 'cat-item-delete';
    const deleteAction = isDefault ? '' : `onclick="deleteCategory('${cat.id}')"`;

    div.innerHTML = `
      <div class="cat-item-left">
        <div class="cat-item-icon" style="background: ${iconBg}; color: ${cat.color}; border: 1px solid ${iconBorder};">
          ${cat.icon}
        </div>
        <div class="cat-item-name">${cat.name}</div>
      </div>
      <div class="${deleteClass}" ${deleteAction} title="${isDefault ? 'Базовую категорию нельзя удалить' : 'Удалить категорию'}">
        ✕
      </div>
    `;
    
    list.appendChild(div);
  });
}

    function renderProfileDots() {
      const c = document.getElementById('profilePreviewDots');
      if (!c) return;
      c.innerHTML = '';
      profileCategories.slice(0, 4).forEach((cat) => {
        const d = document.createElement('div');
        d.className = 'profile-cat-dot';
        d.style.background = cat.color;
        c.appendChild(d);
      });
    }

    function ensureSelectedCategoriesValid() {
      const availableIds = new Set(profileCategories.map((cat) => String(cat.id)));

      if (!availableIds.has(taskState.category)) {
        taskState.category = getDefaultCategoryId();
      }

      if (!availableIds.has(goalState.category)) {
        goalState.category = getDefaultCategoryId();
      }

      activeFilters.categories = new Set(
        Array.from(activeFilters.categories || []).filter((cat) => availableIds.has(cat))
      );
    }

    function refreshAllCategoryUI() {
      // 1. Список в профиле (удаление/просмотр)
      renderCategoriesList();
      
      // 2. Точки предпросмотра в меню профиля
      renderProfileDots();
      
      // 3. Чипы в модалке создания ЗАДАЧИ (функция из tasks.js)
      if (typeof renderTaskCategoryChips === 'function') {
        renderTaskCategoryChips();
      }
      
      // 4. Чипы в модалке создания ЦЕЛИ (функция из tasks.js)
      if (typeof renderGoalCategoryChips === 'function') {
        renderGoalCategoryChips();
      }
      
      // 5. Чипы в фильтрах (функция из tasks.js)
      if (typeof renderFilterCategoryChips === 'function') {
        renderFilterCategoryChips();
      }
    
      // 6. Валидация текущего выбора (если выбранная категория была удалена)
      ensureSelectedCategoriesValid();
      
      // 7. Обновление UI текущих открытых форм
      updateUI();      // tasks.js
      updateGoalUI();  // goals.js
    }

    function renderColorSelector() {
      const c = document.getElementById('colorSelector');
      if (!c) return;
      c.innerHTML = '';
      categoryColors.forEach((col) => {
        const btn = document.createElement('div');
        btn.className = `color-btn ${col === newCategoryState.color ? 'active' : ''}`;
        btn.style.background = col;
        btn.onclick = () => {
          newCategoryState.color = col;
          renderColorSelector();
          updatePreview();
          vibrate(5);
        };
        c.appendChild(btn);
      });
    }

    function updatePreview() {
      const chip = document.getElementById('previewChip');
      const nameEl = document.getElementById('previewName');
      const iconEl = document.getElementById('previewIcon');
      
      if (!chip || !nameEl || !iconEl) return;
    
      // 1. Меняем текст
      nameEl.textContent = newCategoryState.name.trim() || 'Название...';
      
      // 2. Меняем иконку
      iconEl.textContent = newCategoryState.icon;
      
      // 3. Меняем цвет фона чипа
      chip.style.background = newCategoryState.color; // Текст будет белым из CSS
      chip.style.color = '#fff';
    
      // 4. ✨ Создаем красивое свечение (тень) именно выбранным цветом
      // Добавляем прозрачность к HEX цвету для тени (например 50 = ~30%)
      chip.style.boxShadow = `0 8px 20px ${newCategoryState.color}60`; 
    }

    function showToast(msg, undo = false) {
      const t = document.getElementById('toast');
      const msgEl = document.getElementById('toastMessage');
      const undoEl = document.getElementById('toastUndo');
      if (!t || !msgEl) return;
      
      msgEl.textContent = msg;
      if(undoEl) undoEl.style.display = undo ? 'block' : 'none';
      
      t.classList.add('visible');
      if(window.toastTimer) clearTimeout(window.toastTimer);
      window.toastTimer = setTimeout(() => t.classList.remove('visible'), 3000);
  }

    function vibrate(ms) {
      if (navigator.vibrate) navigator.vibrate(ms);
  }

    function openCategory(category) {
      const titles = { all: 'Все задачи', today: 'Сегодня', tomorrow: 'Завтра', week: 'Следующие 7 дней', completed: 'Выполненные', overdue: 'Просроченные' };
      console.log(`📂 Открыта категория: ${titles[category]}`);
    }

    async function validateAndFixCategories() { // Добавляем async
      const validCategoryIds = new Set(profileCategories.map(c => c.id));
      
      // Списки ID для массового обновления в БД
      const tasksToFix = [];
      const goalsToFix = [];
    
      tasksDB.forEach(task => {
        if (!task.category || !validCategoryIds.has(task.category)) {
          task.category = BASE_CATEGORY_ID; 
          tasksToFix.push(task.id); // Запоминаем ID
        }
      });
    
      goalsDB.forEach(goal => {
        if (!goal.category || !validCategoryIds.has(goal.category)) {
          goal.category = BASE_CATEGORY_ID;
          goal.icon = '⭐'; 
          goalsToFix.push(goal.id); // Запоминаем ID
        }
      });
    
      if (tasksToFix.length > 0 || goalsToFix.length > 0) {
        console.log('🧹 Исправление целостности данных в БД...');
        
        // Если есть числовой BASE_CATEGORY_ID, сохраняем в базу
        const baseIdNum = parseInt(BASE_CATEGORY_ID);
        if (!isNaN(baseIdNum)) {
            if (tasksToFix.length > 0) {
                await supabase.from('tasks').update({ category_id: baseIdNum }).in('id', tasksToFix);
            }
            if (goalsToFix.length > 0) {
                await supabase.from('goals').update({ category_id: baseIdNum }).in('id', goalsToFix);
            }
        }
      }
    }


// --- Глобальные мапперы (преобразователи данных) ---


    // 1. Категории
    function mapCategoryFromDB(dbCat) {
      return {
        id: String(dbCat.id),
        name: dbCat.name,
        icon: dbCat.icon,
        color: dbCat.color,
        isDefault: dbCat.is_default || false
      };
    }

    // 2. Преобразование Задачи из БД в App
    function mapTaskFromDB(dbTask) {
      const sortedSubtasks = (dbTask.subtasks || []).sort((a, b) => a.position - b.position);
      return {
        id: dbTask.id,
        groupId: dbTask.group_id,
        title: dbTask.title,
        date: dbTask.date_for,
        duration_min: dbTask.duration,
        priority: dbTask.priority || 'low',
        category: String(dbTask.category_id || getDefaultCategoryId()),
        completed: dbTask.completed,
        completedAt: dbTask.completed_at,
        subtasks: sortedSubtasks.map(st => ({
          id: st.id, title: st.title, completed: st.completed, position: st.position
        })),
        totalSubtasks: sortedSubtasks.length,
        completedSubtasks: sortedSubtasks.filter(s => s.completed).length
      };
    }

    // 3. Преобразование Цели из БД в App
    function mapGoalFromDB(dbGoal) {
      // В базе completed=true -> значит цель достигнута.
      // В приложении active=true -> значит цель в работе.
      const isActive = dbGoal.completed === false; // Строгая проверка
      
      const mappedSubgoals = (dbGoal.subgoals || [])
        .sort((a, b) => a.id - b.id)
        .map(sg => ({
          id: sg.id,
          title: sg.title,
          deadline: sg.deadline,
          completed: sg.completed,
          completedAt: sg.completed_at
      }));
    
      // Расчет прогресса на клиенте, если база вернула null
      const total = mappedSubgoals.length;
      const done = mappedSubgoals.filter(s => s.completed).length;
      const calcProgress = total > 0 ? Math.round((done / total) * 100) : (dbGoal.completed ? 100 : 0);
    
      return {
        id: dbGoal.id,
        title: dbGoal.title,
        deadline: dbGoal.deadline,
        description: dbGoal.description,
        active: isActive, 
        completedAt: dbGoal.completed_at,
        createdAt: dbGoal.created_at,
        // Преобразуем ID категории в строку для UI
        category: dbGoal.category_id ? String(dbGoal.category_id) : (getDefaultCategoryId() || null),
        icon: dbGoal.icon || '🎯', 
        subgoals: mappedSubgoals,
        
        totalSubgoals: total,
        completedSubgoals: done,
        // Если в базе есть прогресс, берем его, иначе используем расчетный
        progress: (dbGoal.progress !== null && dbGoal.progress !== undefined) ? dbGoal.progress : calcProgress
      };
    }

    // --- Вспомогательная функция: Загружаем ВСЕ активные задачи (с защитой от лимита 1000) ---
    async function fetchActiveTasksSafe() {
      let activeTasks = [];
      let from = 0;
      const step = 1000;
      let fetchMore = true;
    
      while (fetchMore) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*, subtasks(*)')
          .eq('user_id', CURRENT_USER_ID)
          .eq('completed', false) // <--- ТОЛЬКО АКТИВНЫЕ
          .order('date_for', { ascending: true })
          .range(from, from + step - 1);
    
        if (error) throw error;
    
        if (data && data.length > 0) {
          activeTasks = activeTasks.concat(data);
          from += step;
          if (data.length < step) fetchMore = false;
        } else {
          fetchMore = false;
        }
      }
      return activeTasks;
    }

    async function loadData() {
      try {
        console.log('🔄 Загрузка данных из Supabase...');
    
        await ensureUserExists();
        await moveOverdueTasksToToday();
        loadUserAvatar();
    
        // 1. ЗАГРУЗКА КАТЕГОРИЙ
        let { data: catsData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', CURRENT_USER_ID)
        .order('is_default', { ascending: false }) // Сначала дефолтная, потом остальные
        .order('id', { ascending: true });

        if (catError) throw catError;

        // АВТО-СОЗДАНИЕ: Если категорий вообще нет (новый юзер), создаем "Другое" в базе
        if (!catsData || catsData.length === 0) {
        console.log('Категории не найдены. Создаем базовую категорию в БД...');
        const { data: newDefault, error: createErr } = await supabase
          .from('categories')
          .insert([{
            user_id: CURRENT_USER_ID,
            name: 'Другое',
            icon: '⭐',
            color: '#ffd32a',
            is_default: true
          }])
          .select();

        if (createErr) {
          console.error('Не удалось создать дефолтную категорию:', createErr);
        } else {
          catsData = newDefault; // Используем созданную категорию
        }
        }

      let loadedCategories = catsData || [];
      profileCategories = loadedCategories.map(mapCategoryFromDB);

      // Определяем ID базовой категории для логики приложения
      const defCatObj = profileCategories.find(c => c.isDefault);
      BASE_CATEGORY_ID = defCatObj ? defCatObj.id : profileCategories[0]?.id;

      initCategoriesUI();
    
        // 2. УМНАЯ ЗАГРУЗКА ЗАДАЧ И ЦЕЛЕЙ
        console.log('🔄 Начинаем оптимизированную загрузку...');
    
        // A. Вычисляем дату "7 дней назад" для выполненных задач
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 8); // Берем 8 дней для надежности перекрытия часовых поясов
        weekAgo.setHours(0, 0, 0, 0); // 🔥 ИСПРАВЛЕНИЕ: Сбрасываем часы, чтобы взять всё утро того дня
        const weekAgoISO = weekAgo.toISOString();
    
        // B. Формируем 5 параллельных запроса
        
        // 1. Цели (все, их обычно мало)
        const goalsPromise = supabase
          .from('goals')
          .select('*, subgoals(*)')
          .eq('user_id', CURRENT_USER_ID)
          .order('created_at', { ascending: false });
    
        // 2. Активные задачи (все, через цикл пагинации)
        const activeTasksPromise = fetchActiveTasksSafe();
    
        // 3. Недавние выполненные задачи (последние 7 дней)
        const recentCompletedPromise = supabase
          .from('tasks')
          .select('*, subtasks(*)')
          .eq('user_id', CURRENT_USER_ID)
          .eq('completed', true)
          .gte('completed_at', weekAgoISO) // >= 7 дней назад
          .order('completed_at', { ascending: false });
    
        // 4. 🔥 СЧЕТЧИК ВСЕХ ВЫПОЛНЕННЫХ (только число!)
        const totalCountPromise = supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true }) // head: true не скачивает данные, только count
          .eq('user_id', CURRENT_USER_ID)
          .eq('completed', true);

        // 5. ЖЕЛАНИЯ (НОВОЕ)
        const wishesPromise = supabase
        .from('wishes')
        .select('*')
        .eq('user_id', CURRENT_USER_ID)
        .order('created_at', { ascending: false });

    
        // Выполняем запросы
        const [goalsResp, activeTasksArr, recentCompletedResp, totalCountResp, wishesResp] = await Promise.all([
          goalsPromise,
          activeTasksPromise,
          recentCompletedPromise,
          totalCountPromise,
          wishesPromise
        ]);
        
    
        if (goalsResp.error) throw goalsResp.error;
        if (recentCompletedResp.error) throw recentCompletedResp.error;
        if (totalCountResp.error) throw totalCountResp.error;

        if (wishesResp.error) console.error('Wish error', wishesResp.error);

        // Сохраняем желания
        wishesDB = wishesResp.data || [];
        updateWishCounters(); // <-- Обновляем цифры на карточках желаний
    
        // С. Обработка результатов
        goalsDB = (goalsResp.data || []).map(mapGoalFromDB);
    
        const activeMapped = activeTasksArr.map(mapTaskFromDB);
        const recentCompletedMapped = (recentCompletedResp.data || []).map(mapTaskFromDB);
    
        // Объединяем: В памяти держим Активные + Свежие Выполненные
        tasksDB = [...activeMapped, ...recentCompletedMapped];
    
        // D. Сохраняем "магическое число" 930 в глобальную переменную
        totalCompletedTasksCount = totalCountResp.count || 0;
    
        console.log(`✅ Загружено: ${activeMapped.length} активных, ${recentCompletedMapped.length} недавних выполненных.`);
        console.log(`📊 Всего выполнено в базе: ${totalCompletedTasksCount}`);
    
        // D. Финальные обновления UI
        await validateAndFixCategories();
        
        // Эта функция теперь возьмет totalCompletedTasksCount для карточки "Выполненные"
        updateDashboardCounters(); 
    
        if (typeof refreshAllCategoryUI === 'function') refreshAllCategoryUI();
        if (typeof refreshOpenContextAfterGoalChange === 'function') refreshOpenContextAfterGoalChange();
        if (typeof refreshOpenContextAfterTaskChange === 'function') refreshOpenContextAfterTaskChange();
    
        console.log('✅ Данные успешно загружены');
    
      } catch (e) {
        console.error('❌ Ошибка загрузки данных:', e);
        showToast('Ошибка связи с сервером');
      }
    }



// Обновление счетчиков на главном экране
function updateDashboardCounters() {
  // 1. Считаем цели (тут всё по-старому, их мало)
  const activeGoals = goalsDB.filter(g => g.active).length;
  const achievedGoals = goalsDB.filter(g => !g.active).length;
  
  // 2. Считаем ЗАДАЧИ
  // Активные берем из локального массива (мы их загрузили все)
  const activeTasks = tasksDB.filter(t => !t.completed).length;
  
  // 🔥 Выполненные берем из глобальной переменной, которую получили "легким" запросом
  // Если переменная еще не инициализирована, показываем 0
  const completedTasks = typeof totalCompletedTasksCount !== 'undefined' 
      ? totalCompletedTasksCount 
      : 0;

  // 3. Обновляем карточки ЗАДАЧ
  const taskActiveCard = document.querySelector('.category-card[onclick="openTasks(\'active\')"]');
  if (taskActiveCard) {
      const countEl = taskActiveCard.querySelector('.count-number');
      if (countEl) countEl.textContent = activeTasks;
  }

  // Обновляем карточку ВЫПОЛНЕННЫХ
  const taskCompletedCard = document.querySelector('.category-card[onclick="openTasks(\'completed\')"]');
  if (taskCompletedCard) {
      const countEl = taskCompletedCard.querySelector('.count-number');
      if (countEl) countEl.textContent = completedTasks; // <--- Сюда встанет 930
  }

  // 4. Обновляем карточки ЦЕЛЕЙ
  const goalActiveCard = document.querySelector('.category-card[onclick="openGoals(\'active\')"]');
  if (goalActiveCard) {
      const countEl = goalActiveCard.querySelector('.count-number');
      if (countEl) countEl.textContent = activeGoals;
  }

  const goalAchievedCard = document.querySelector('.category-card[onclick="openGoals(\'achieved\')"]');
  if (goalAchievedCard) {
      const countEl = goalAchievedCard.querySelector('.count-number');
      if (countEl) countEl.textContent = achievedGoals;
  }
}
//  Инициализация обработчиков событий для модалки задач и общих оверлеев
function initModalEventListeners() {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeTaskModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const subtasksPopupOverlay = document.getElementById('subtasksPopupOverlay');
      const wishModal = document.getElementById('wishModalOverlay');
      if (durationPickerOverlay && durationPickerOverlay.classList.contains('active')) {
        closeDurationPicker();
      } 
      else if (wishModal && wishModal.classList.contains('active')) {
        closeCreateWishModal(); // Закрываем желание
      }
      else if (calendarOverlay && calendarOverlay.classList.contains('active')) {
        closeCalendar();
      } else if (subtasksPopupOverlay && subtasksPopupOverlay.classList.contains('active')) {
        closeSubtasksPopup();
      } else if (document.getElementById('goalDetailOverlay').classList.contains('active')) {
        closeGoalDetail();
      } else if (document.getElementById('goalModalOverlay').classList.contains('active')) {
        closeGoalModal();
      } else if (modalOverlay.classList.contains('active')) {
        closeTaskModal();
      } else if (document.getElementById('createChoiceOverlay').classList.contains('active')) {
        closeCreateChoiceModal();
      } else if (document.getElementById('listModalOverlay').classList.contains('active')) {
        closeListModal();
      } else if (document.getElementById('filterModalOverlay').classList.contains('active')) {
        closeFilterModal();
      }
    }
  });

  // --- ДОБАВИТЬ ЭТОТ БЛОК ---
  const seriesOverlay = document.getElementById('seriesActionSheetOverlay');
  if (seriesOverlay) {
    seriesOverlay.addEventListener('click', (e) => {
      // Проверяем, что клик был именно по затемненному фону, а не по карточке
      if (e.target === seriesOverlay) {
        // Функция closeSeriesActionSheet находится в tasks.js и глобально доступна
        if (typeof closeSeriesActionSheet === 'function') {
            closeSeriesActionSheet();
        }
      }
    });
  }

  titleInput.addEventListener('input', (e) => {
    taskState.title = e.target.value;
    if (taskState.title.length >= 2) {
      titleInput.classList.remove('invalid');
      titleError.style.display = 'none';
    }
    autoGrowTaskTitle();
    updateUI();
  });

  dateChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.date === 'custom') {
      openCalendar(getSelectedDates().length ? getSelectedDates() : getToday(), (dateStr) => {
        const dates = Array.isArray(dateStr) ? dateStr : (dateStr ? [dateStr] : []);
        setSelectedDates(dates);
        updateUI();
      }, () => {
        setSelectedDates([]);
        updateUI();
      });
      return;
    }
    const value = chip.dataset.date === 'today' ? getToday() : getTomorrow();
    const selected = getSelectedDates();
    if (selected.length === 1 && selected[0] === value) {
      setSelectedDates([]);
    } else {
      setSelectedDates([value]);
    }
    updateUI();
  });

  durationChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    if (chip.dataset.duration) {
      const value = parseInt(chip.dataset.duration, 10);
      taskState.duration_min = taskState.duration_min === value ? null : value;
      updateUI();
    } else if (chip.id === 'durationCustomChip') {
      openDurationPicker();
    }
  });

  priorityChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    taskState.priority = chip.dataset.priority;
    updateUI();
  });

  categoryChipsContainer.addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-story');
    if (!chip) return;
    taskState.category = chip.dataset.category;
    updateUI();
  });

  if (durationPickerOverlay) {
    durationPickerOverlay.addEventListener('click', (e) => {
      if (e.target === durationPickerOverlay) closeDurationPicker();
    });
  }
  if (durationPickerClose) {
    durationPickerClose.addEventListener('click', closeDurationPicker);
  }
  if (durationHoursInput && durationMinutesInput) {
    durationHoursInput.addEventListener('change', syncDurationFromInputs);
    durationMinutesInput.addEventListener('change', syncDurationFromInputs);
    durationHoursInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') syncDurationFromInputs();
    });
    durationMinutesInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') syncDurationFromInputs();
    });
  }
  if (durationPickerOverlay) {
    durationPickerOverlay.querySelectorAll('.duration-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.step, 10) || 0;
        const target = btn.dataset.target;
        const currentHours = parseInt(durationHoursInput.value, 10) || 0;
        const currentMinutes = parseInt(durationMinutesInput.value, 10) || 0;

        let nextHours = currentHours;
        let nextMinutes = currentMinutes;

        if (target === 'hours') {
          nextHours = Math.max(0, Math.min(8, currentHours + step));
        } else {
          nextMinutes = Math.max(0, Math.min(55, currentMinutes + step));
        }

        const total = clampDuration((nextHours * 60) + nextMinutes);
        if (total === null) return;

        durationHoursInput.value = Math.floor(total / 60);
        durationMinutesInput.value = total % 60;
        applyDuration(total);
      });
    });
  }
  if (calendarOverlay) {
    calendarOverlay.addEventListener('click', (e) => {
      if (e.target === calendarOverlay) closeCalendar();
    });
  }

  document.querySelectorAll('.calendar-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.direction === 'prev' ? -1 : 1;
      calendarVisibleDate.setMonth(calendarVisibleDate.getMonth() + dir);
      renderCalendar();
    });
  });

  if (calendarGrid) {
    calendarGrid.addEventListener('click', (e) => {
      const day = e.target.closest('.calendar-day');
      if (!day) return;
      const dateISO = day.dataset.date;
      if (calendarRangeMode) {
        if (!calendarRangeAnchor) {
          calendarRangeAnchor = dateISO;
          calendarSelectedDates = [dateISO];
        } else {
          calendarSelectedDates = buildDateRange(calendarRangeAnchor, dateISO);
          calendarRangeAnchor = null;
        }
        renderCalendar();
        updateCalendarFooterState();
      } else if (calendarMultiMode) {
        const set = new Set(calendarSelectedDates);
        if (set.has(dateISO)) {
          set.delete(dateISO);
        } else {
          set.add(dateISO);
        }
        calendarSelectedDates = Array.from(set).sort((a, b) => new Date(a) - new Date(b));
        renderCalendar();
        updateCalendarFooterState();
      } else {
        calendarSelectedDates = [dateISO];
        if (calendarOnSelect) calendarOnSelect(dateISO);
        closeCalendar();
      }
    });
  }

  const calendarFooter = calendarOverlay ? calendarOverlay.querySelector('.calendar-footer') : null;
  if (calendarFooter) {
    calendarFooter.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (!action) return;
      if (action === 'clear') {
        calendarSelectedDates = [];
        calendarRangeAnchor = null;
        calendarMultiMode = false;
        calendarRangeMode = false;
        if (calendarMultiMode) {
          renderCalendar();
          updateCalendarFooterState();
          return;
        }
        if (calendarOnClear) calendarOnClear();
        else if (calendarOnSelect) calendarOnSelect(null);
      } else if (action === 'multi') {
        const togglingOff = calendarMultiMode && !calendarRangeMode;
        if (togglingOff) {
          calendarMultiMode = false;
          calendarRangeMode = false;
          calendarRangeAnchor = null;
          if (calendarSelectedDates.length > 1) {
            calendarSelectedDates = calendarSelectedDates.length ? [calendarSelectedDates[0]] : [];
          }
        } else {
          calendarRangeMode = false;
          calendarRangeAnchor = null;
          calendarMultiMode = true;
        }
        renderCalendar();
        updateCalendarFooterState();
        return;
      } else if (action === 'range') {
        const togglingOff = calendarRangeMode;
        if (togglingOff) {
          calendarRangeMode = false;
          calendarMultiMode = false;
          calendarRangeAnchor = null;
          if (calendarSelectedDates.length > 1) {
            calendarSelectedDates = calendarSelectedDates.length ? [calendarSelectedDates[0]] : [];
          }
        } else {
          calendarRangeMode = true;
          calendarMultiMode = true;
          calendarRangeAnchor = null;
          calendarSelectedDates = [];
        }
        renderCalendar();
        updateCalendarFooterState();
        return;
      } else if (action === 'save') {
        const payload = calendarMultiMode ? [...calendarSelectedDates] : (calendarSelectedDates[0] || null);
        if (calendarOnClear && !payload) {
          calendarOnClear();
        } else if (calendarOnSelect) {
          calendarOnSelect(payload);
        }
      }
      closeCalendar();
    });
  }
  const wishModalOverlay = document.getElementById('wishModalOverlay');
  if (wishModalOverlay) {
    wishModalOverlay.addEventListener('click', (e) => {
      // Если целью клика является сам оверлей (фон), а не контент внутри
      if (e.target === wishModalOverlay) {
        closeCreateWishModal();
      }
    });
  }
}

  // --- Заглушка для уведомлений ---
function toggleNotifications(event) {
  // Получаем элемент, на который кликнули
  const switchEl = event.currentTarget;
  
  // Переключаем визуальный класс
  switchEl.classList.toggle('active');
  
  // Проверяем текущее состояние
  const isActive = switchEl.classList.contains('active');
  
  // Логика заглушки (вывод в консоль)
  console.log(`🔔 Настройка уведомлений изменена: ${isActive ? 'ВКЛ' : 'ВЫКЛ'}`);
  
  // Показываем пользователю тост (используем вашу функцию showToast)
  if (typeof showToast === 'function') {
    showToast(`Уведомления ${isActive ? 'включены' : 'выключены'}`);
  }
}

/**
 * Умный контроллер кнопки "Назад"
 * Автоматически отслеживает открытые модальные окна по их ID
 * и назначает действие на кнопку Telegram BackButton.
 */
function initSmartBackButton() {
  const tg = window.Telegram.WebApp;

  // Список всех модальных окон и функций их закрытия.
  // Порядок важен: чем выше Z-Index (поверх других), тем выше приоритет.
  // priority: условное число, соответствующее z-index в CSS.
  const modalsMap = [
    { id: 'calendarOverlay',       close: closeCalendar,          priority: 9000 },
    { id: 'durationPickerOverlay', close: closeDurationPicker,    priority: 9050 },
    { id: 'subtasksPopupOverlay',  close: closeSubtasksPopup,     priority: 7000 },
    { id: 'taskModalOverlay',      close: closeTaskModal,         priority: 6500 },
    { id: 'goalModalOverlay',      close: closeGoalModal,         priority: 6500 },
    { id: 'createChoiceOverlay',   close: closeCreateChoiceModal, priority: 6000 },
    { id: 'filtersPanel',          close: toggleFilterPanel,      priority: 5000 }, // Сайдбар фильтров
    { id: 'filterModalOverlay',    close: closeFilterModal,       priority: 3000 },
    { id: 'goalDetailOverlay',     close: closeGoalDetail,        priority: 4500 },
    { id: 'listModalOverlay',      close: closeListModal,         priority: 4000 }, // Списки задач/целей
    { id: 'catModalOverlay',       close: closeCategoryModal,     priority: 1500 },
    { id: 'wishModalOverlay', close: closeCreateWishModal, priority: 6000 },
    { id: 'statsPanel',            close: closeStats,             priority: 100 },
    { id: 'profilePage',           close: closeProfilePage,       priority: 50 },
  ];

  // Функция, которая проверяет, какие окна открыты, и обновляет кнопку
  const updateBackButtonState = () => {
    // Находим все активные окна
    const activeModals = modalsMap.filter(modal => {
      const el = document.getElementById(modal.id);
      // Проверяем класс 'active'
      return el && el.classList.contains('active');
    });

    if (activeModals.length > 0) {
      // Если есть открытые окна, показываем кнопку
      tg.BackButton.show();
      
      // Сортируем по приоритету (закрываем самое верхнее окно)
      activeModals.sort((a, b) => b.priority - a.priority);
      const topModal = activeModals[0];

      // Перезаписываем обработчик клика (удаляем старые, ставим новый)
      tg.BackButton.offClick(); 
      tg.BackButton.onClick(() => {
        // Вызываем функцию закрытия для самого верхнего окна
        if (typeof topModal.close === 'function') {
          topModal.close();
        }
      });
    } else {
      // Если окон нет, прячем кнопку
      tg.BackButton.hide();
      tg.BackButton.offClick();
    }
  };

  // --- МАГИЯ: MutationObserver ---
  // Вместо того чтобы править 20 функций в коде, мы просто следим за изменениями классов в DOM.
  // Как только где-то появляется класс "active", кнопка обновляется сама.
  
  const observer = new MutationObserver(() => {
    // Небольшая задержка, чтобы UI успел обновиться
    setTimeout(updateBackButtonState, 50); 
  });

  // Начинаем следить за каждым элементом из списка
  modalsMap.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) {
      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    }
  });

  // Первичная проверка при запуске
  updateBackButtonState();
}


/* --- УНИВЕРСАЛЬНАЯ ЛОГИКА СВАЙПА ДЛЯ ЗАКРЫТИЯ (PULL-TO-CLOSE) --- */
/* --- УНИВЕРСАЛЬНАЯ ЛОГИКА СВАЙПА (PULL-TO-CLOSE) С ПОДДЕРЖКОЙ МЫШИ --- */

class SwipeToClose {
  constructor(modalSelector, handleSelector, closeCallback) {
    this.modal = document.querySelector(modalSelector);
    this.closeCallback = closeCallback;
    
    // ИСПРАВЛЕНИЕ 1: Если селектор ручки совпадает с селектором модалки,
    // или ручка не передана, считаем саму модалку ручкой.
    if (this.modal) {
        if (!handleSelector || modalSelector === handleSelector) {
            this.handle = this.modal;
        } else {
            this.handle = this.modal.querySelector(handleSelector);
        }
    }

    this.startY = 0;
    this.currentY = 0;
    this.isDragging = false;
    
    if (this.modal && this.handle) {
      this.init();
    }
  }

  init() {
    // Touch события (телефон)
    this.handle.addEventListener('touchstart', (e) => this.start(e.touches[0].clientY, e), { passive: false });
    document.addEventListener('touchmove', (e) => {
        if (this.isDragging) this.move(e, e.touches[0].clientY);
    }, { passive: false });
    document.addEventListener('touchend', () => this.end());

    // Mouse события (компьютер/тесты)
    this.handle.addEventListener('mousedown', (e) => this.start(e.clientY, e));
    document.addEventListener('mousemove', (e) => {
        if (this.isDragging) this.move(e, e.clientY);
    });
    document.addEventListener('mouseup', () => this.end());
  }

  start(y, e) {
    // Проверка: активно ли окно (включая cat-modal-overlay и wish-modal-overlay)
    const overlay = this.modal.closest(
      '.filter-modal-overlay, .create-choice-overlay, .task-modal-overlay, .goal-modal-overlay, .goal-detail-overlay, .cat-modal-overlay, .action-sheet-overlay, .wish-modal-overlay'
    );
    if (!overlay || !overlay.classList.contains('active')) return;


    // ИСПРАВЛЕНИЕ 2: Если тянем за контент, который можно скроллить вверх, не запускаем свайп закрытия
    // (актуально, если ручкой является всё окно)
    let target = e.target;
    while (target && target !== this.handle) {
        if (target.scrollTop > 0) return; // Если элемент прокручен, даем скроллить
        target = target.parentNode;
    }

    this.startY = y;
    this.isDragging = true;
    this.modal.classList.add('is-dragging'); 
  }

  move(e, y) {
    if (!this.isDragging) return;

    const delta = y - this.startY;

    // Разрешаем только движение вниз (delta > 0)
    if (delta > 0) {
      if (e.cancelable) e.preventDefault(); // Блокируем скролл страницы
      this.currentY = delta;
      // Двигаем окно с небольшим сопротивлением (коэффициент 0.8)
      this.modal.style.transform = `translateY(${this.currentY}px)`;
    }
  }

  end() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.modal.classList.remove('is-dragging'); 

    // Порог закрытия (100px)
    if (this.currentY > 100) {
      this.closeCallback();
      // Сбрасываем стиль с задержкой
      setTimeout(() => { this.modal.style.transform = ''; }, 300);
    } else {
      // Пружиним назад
      this.modal.style.transform = '';
    }
    
    this.currentY = 0;
  }
}

// Функция для запуска свайпов на всех модалках
function initAllModalsSwipe() {
  // 1. Фильтр задач
  new SwipeToClose('.filter-modal', '.filter-modal-header', closeFilterModal);

  // 2. Выбор создания
  // Теперь это сработает корректно благодаря исправлению в классе
  new SwipeToClose('.create-choice-modal', '.create-choice-modal', closeCreateChoiceModal);
  
  // 3. Создание задачи
  new SwipeToClose('#taskModalOverlay .task-modal', '.modal-header', closeTaskModal);

  // 4. Создание цели
  new SwipeToClose('#goalModalOverlay .goal-modal', '.modal-header', closeGoalModal);

  // 5. Детали цели (тянем за хедер)
  new SwipeToClose('.goal-detail-modal', '.goal-detail-header', closeGoalDetail);

  // 6. Категории
  // ВАЖНО: Используем #catModal как ручку целиком, чтобы можно было тянуть и за заголовок, и за полоску
  new SwipeToClose('#catModal', '.cat-modal-header', closeCategoryModal);
  // Дополнительно вешаем на саму полоску, если попадем пальцем именно в нее
  new SwipeToClose('#catModal', '.modal-handle-bar', closeCategoryModal);
  // 7. Action Sheet серий
  
  // А) Привязываем свайп к "ручке" (.modal-handle)
  new SwipeToClose('#seriesActionSheetOverlay .action-sheet', '.modal-handle', closeSeriesActionSheet);

  // Б) (Опционально) Привязываем свайп к заголовку, чтобы было удобнее
  new SwipeToClose('#seriesActionSheetOverlay .action-sheet', '.action-sheet-header', closeSeriesActionSheet);

  // 8. Желания (НОВОЕ)
  new SwipeToClose('#wishModalOverlay .wish-modal', '.modal-header', closeCreateWishModal);
}


// Функция переноса просроченных задач на сегодня
async function moveOverdueTasksToToday() {
  try {
    // 1. Получаем текущую дату в формате YYYY-MM-DD (локальное время пользователя)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    console.log(`🧹 Проверка просроченных задач до ${todayStr}...`);

    // 2. Выполняем UPDATE запрос в Supabase
    // "Обнови дату на todayStr, где дата < todayStr И задача не выполнена"
    const { data, error } = await supabase
      .from('tasks')
      .update({ date_for: todayStr })
      .lt('date_for', todayStr)   // date_for < сегодня
      .eq('completed', false)     // только активные
      .eq('user_id', CURRENT_USER_ID)
      .select();                  // Возвращает обновленные строки, чтобы мы могли их посчитать

    if (error) throw error;

    // 3. Если были перенесенные задачи, уведомляем пользователя
    if (data && data.length > 0) {
      console.log(`✅ Перенесено задач: ${data.length}`);
      // Небольшая задержка, чтобы интерфейс успел прогрузиться перед тостом
      setTimeout(() => {
        showToast(`📅 Перенесено задач с прошлых дней: ${data.length}`);
      }, 1500);
    } else {
      console.log('Нет просроченных задач.');
    }

  } catch (e) {
    console.error('Ошибка при переносе задач:', e);
  }
}
