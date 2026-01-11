function openTasks(state) {
  if (state === 'active') {
    updateFilterCounts();
    document.getElementById('filterModalOverlay').classList.add('active');
    document.body.classList.add('body-modal-open');
    setFabVisible(false); // ← FAB не показываем в filter-modal-overlay
  } else if (state === 'completed') {
    showTasksList('completed-7days');
  }
}

// Обработчики для подзадач
const addSubtaskButton = document.getElementById('addSubtaskButton');

if (addSubtaskButton) {
  addSubtaskButton.addEventListener('click', () => {
    addSubtask();
  });
}

// Хелпер: затемнение/осветление цвета для градиента
function adjustColor(hex, amount) {
  return '#' + hex.replace(/^#/, '').replace(/../g, color => 
      ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

// Генерация стилей для категории "на лету"
function getCategoryStyle(categoryId) {
  // Ищем категорию в загруженном массиве profileCategories
  const cat = profileCategories.find(c => String(c.id) === String(categoryId));
  
  // Если не нашли (например, удалена), берем дефолтную или первую попавшуюся
  const fallback = profileCategories[0] || { name: 'Неизвестно', icon: '❓', color: '#bdc3c7' };
  const target = cat || fallback;

  return { 
    label: target.name, 
    icon: target.icon, 
    color: target.color, 
    // Генерируем градиент динамически на основе цвета из БД
    bg: `linear-gradient(135deg, ${target.color}, ${adjustColor(target.color, -40)})` 
  };
}

function openGoals(state) {
  if (state === 'active') {
    showGoalsList('active');
  } else if (state === 'achieved') {
    showGoalsList('achieved');
  }
}

function closeFilterModal() {
  document.getElementById('filterModalOverlay').classList.remove('active');
  document.body.classList.remove('body-modal-open');
  setFabVisible(true); // ← вернуть FAB
}

// Обновление счетчиков в фильтрах
function updateFilterCounts() {
  const today = getTasksFromCache('today').length;
  const tomorrow = getTasksFromCache('tomorrow').length;
  const week = getTasksFromCache('week').length;
  const all = getTasksFromCache('all').length;
  
  const todayEl = document.getElementById('filterCountToday');
  const tomorrowEl = document.getElementById('filterCountTomorrow');
  const weekEl = document.getElementById('filterCountWeek');
  const allEl = document.getElementById('filterCountAll');
  
  if (todayEl) todayEl.textContent = today;
  if (tomorrowEl) tomorrowEl.textContent = tomorrow;
  if (weekEl) weekEl.textContent = week;
  if (allEl) allEl.textContent = all;
}
// Вспомогательная функция для цветов приоритета
function getPriorityColor(priority) {
  const colors = {
    extreme: '#ff1744', // 🚨 Экстремальный
    high: '#ff6b6b',    // 🔴 Высокий
    medium: '#ffa726',  // 🟡 Средний
    low: '#4ecdc4',     // 🟢 Низкий
    default: '#4ecdc4'
  };
  return colors[priority] || colors.default;
}

function showTasksList(filter) {
  closeFilterModal();
  
  const listOverlay = document.getElementById('listModalOverlay');
  const listTitle = document.getElementById('listModalTitle');
  const listContent = document.getElementById('listModalContent');
  if (listContent) {
    listContent.classList.remove('glass-goals-list');
  }
  const filterButton = document.getElementById('filterToggleButton');
  const goalCreateButton = document.getElementById('goalCreateButton');
  const searchButton = document.getElementById('searchToggleButton');
  const searchWrapper = document.getElementById('listSearchWrapper');
  const searchInput = document.getElementById('listSearchInput');
  
  // Установить заголовок
  const titles = {
    'today': '📅 Задачи на сегодня',
    'tomorrow': '🌅 Задачи на завтра',
    'week': '📆 Задачи на 7 дней',
    'all': '📋 Все активные задачи',
    'completed-7days': '✅ Выполненные за 7 дней'
  };
  listTitle.textContent = titles[filter] || 'Задачи';

  // Сброс UI поиска
  if (searchButton) {
    searchButton.style.display = 'flex';
    searchButton.classList.remove('active');
  }
  if (searchWrapper) {
    searchWrapper.style.display = 'none';
    searchWrapper.classList.remove('active');
  }
  if (searchInput) {
    searchInput.value = '';
  }
  activeFilters.searchQuery = '';
  
  // Управление кнопками хедера
  if (filterButton) {
    filterButton.style.display = 'flex';
  }
  if (goalCreateButton) {
    goalCreateButton.style.display = 'none';
  }

  resetFilters(true);
  
  // Получаем задачи
  const tasks = getTasksFromCache(filter);
  
  currentTasksFilter = filter;
  currentGoalsFilter = null;

  // --- 🔥 ИСПРАВЛЕНИЕ: Вызываем функцию рендера, где живет логика таймлайна ---
  renderFilteredTasks(tasks); 
  // ---------------------------------------------------------------------------

  listOverlay.classList.add('active');
  document.body.classList.add('body-modal-open');
  setFabVisible(true);
}

// Состояние фильтров
let activeFilters = {
  priorities: new Set(),
  categories: new Set(),
  sort: null,
  searchQuery: ''   // 🔍 текущая строка поиска по названию задач
};


// Переключение панели фильтров
function toggleFilterPanel() {
  const panel = document.getElementById('filtersPanel');
  const overlay = document.getElementById('filtersOverlay');
  const button = document.getElementById('filterToggleButton');
  
  if (!panel || !overlay || !button) return;
  
  const isActive = panel.classList.toggle('active');
  overlay.classList.toggle('active', isActive);
  button.classList.toggle('active', isActive);
  
  // Блокировка/разблокировка скролла фона
  if (isActive) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
  
  console.log(`⚙️ Панель фильтров ${isActive ? 'открыта' : 'закрыта'}`);
}

// Переключение фильтра приоритета
function togglePriorityFilter(priority) {
  if (activeFilters.priorities.has(priority)) {
    activeFilters.priorities.delete(priority);
  } else {
    activeFilters.priorities.add(priority);
  }
  
  // Обновить визуальное состояние чипа
  const chip = document.querySelector(`.filter-chip[data-priority="${priority}"]`);
  if (chip) {
    chip.classList.toggle('active', activeFilters.priorities.has(priority));
  }
  
  // Применить фильтры
  applyFilters();
  
  console.log('🔥 Фильтр приоритета:', Array.from(activeFilters.priorities));
}

// Переключение фильтра категории
function toggleCategoryFilter(category) {
  category = String(category);
  if (activeFilters.categories.has(category)) {
    activeFilters.categories.delete(category);
  } else {
    activeFilters.categories.add(category);
  }
  
  // Обновить визуальное состояние чипа
  const chip = document.querySelector(`.filter-chip[data-category="${category}"]`);
  if (chip) {
    chip.classList.toggle('active', activeFilters.categories.has(category));
  }
  
  // Применить фильтры
  applyFilters();
  
  console.log('📂 Фильтр категории:', Array.from(activeFilters.categories));
}

// Переключение сортировки
function toggleSortFilter(sort) {
  // Если уже выбрана эта сортировка, сбросить
  if (activeFilters.sort === sort) {
    activeFilters.sort = null;
  } else {
    activeFilters.sort = sort;
  }
  
  // Обновить визуальное состояние всех чипов сортировки
  document.querySelectorAll('#sortFilterChips .filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });
  
  if (activeFilters.sort) {
    const chip = document.querySelector(`.filter-chip[data-sort="${sort}"]`);
    if (chip) {
      chip.classList.add('active');
    }
  }
  
  // Применить фильтры
  applyFilters();
  
  console.log('🔄 Сортировка:', activeFilters.sort || 'нет');
}

// Сброс всех фильтров

function resetFilters(silent = false) {
  activeFilters.priorities.clear();
  activeFilters.categories.clear();
  activeFilters.sort = null;
  activeFilters.searchQuery = '';

  // Сбросить состояние поля поиска
  const searchInput = document.getElementById('listSearchInput');
  const searchWrapper = document.getElementById('listSearchWrapper');
  const searchButton = document.getElementById('searchToggleButton');

  if (searchInput) {
    searchInput.value = '';
  }
  if (searchWrapper) {
    searchWrapper.style.display = 'none';
    searchWrapper.classList.remove('active');
  }
  if (searchButton) {
    searchButton.classList.remove('active');
  }

  // Сбросить визуальное состояние всех чипов
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });
  
  // Применить фильтры (покажет все задачи)
  applyFilters();
  
  if (!silent) {
    console.log('✕ Фильтры сброшены');
    showTaskNotification('✕ Фильтры сброшены', 'Показаны все задачи');
  }
}


// Применение фильтров
function applyFilters() {
  if (!currentTasksFilter) return;
  
  // Получить исходные задачи для текущего контекста (today/tomorrow/week/all/completed-7days)
  let tasks = getTasksFromCache(currentTasksFilter);
  
  // Применить фильтр по приоритету
  if (activeFilters.priorities.size > 0) {
    tasks = tasks.filter(task => activeFilters.priorities.has(task.priority));
  }
  
  // Применить фильтр по категории
  if (activeFilters.categories.size > 0) {
    tasks = tasks.filter(task => activeFilters.categories.has(task.category));
  }

  // 🔍 Применить поиск по названию задачи (в пределах текущего контекста)
  if (activeFilters.searchQuery && activeFilters.searchQuery.trim() !== '') {
    const query = activeFilters.searchQuery.trim().toLowerCase();
    tasks = tasks.filter(task => (task.title || '').toLowerCase().includes(query));
  }
  
  // Применить сортировку
  if (activeFilters.sort) {
    tasks = sortTasks(tasks, activeFilters.sort);
  }
  
  // Отрисовать отфильтрованный список
  renderFilteredTasks(tasks);
  
  console.log(`✓ Применены фильтры. Показано задач: ${tasks.length}`);
}

// 🔍 Переключение строки поиска в хедере списка
function toggleListSearch() {
  const searchWrapper = document.getElementById('listSearchWrapper');
  const searchInput = document.getElementById('listSearchInput');
  const searchButton = document.getElementById('searchToggleButton');

  if (!searchWrapper || !searchInput || !searchButton) return;
  if (!currentTasksFilter) return; // поиск только для списков задач

  const isActive = searchWrapper.classList.contains('active');

  if (isActive) {
    // Скрываем поиск и сбрасываем запрос
    searchWrapper.classList.remove('active');
    searchWrapper.style.display = 'none';
    searchInput.value = '';
    activeFilters.searchQuery = '';
    searchButton.classList.remove('active');
    applyFilters(); // перерисовать список без поиска
  } else {
    // Показываем строку поиска
    searchWrapper.classList.add('active');
    searchWrapper.style.display = 'flex';
    searchButton.classList.add('active');
    searchInput.focus();
  }
}
// Функция запроса к Supabase
async function searchTasksInDB(query, filterContext) {
  if (!query || query.length < 2) return [];

  console.log(`🔍 Ищу в базе: "${query}" внутри контекста: ${filterContext}`);
  
  // Базовый запрос
  let dbQuery = supabase
      .from('tasks')
      .select('*, subtasks(*)')
      .eq('user_id', CURRENT_USER_ID)
      .ilike('title', `%${query}%`)
      .limit(50);

  // --- ЛОГИКА КОНТЕКСТА (ИСПРАВЛЕНА НА ЛОКАЛЬНОЕ ВРЕМЯ) ---
  const todayStr = getToday();
  const tomorrowStr = getTomorrow();

  switch (filterContext) {
    case 'today':
        dbQuery = dbQuery
            .eq('date_for', todayStr) // Используем "2025-12-07", а не UTC
            .eq('completed', false);
        break;

    case 'tomorrow':
        dbQuery = dbQuery
            .eq('date_for', tomorrowStr)
            .eq('completed', false);
        break;

    case 'week':
        const weekLaterDate = new Date();
        weekLaterDate.setDate(weekLaterDate.getDate() + 7);
        const weekStr = toISODate(weekLaterDate);
        
        dbQuery = dbQuery
            .lte('date_for', weekStr) 
            .gte('date_for', todayStr)
            .eq('completed', false);
        break;

    case 'all':
        dbQuery = dbQuery.eq('completed', false);
        break;

    case 'completed-7days':
        const weekAgoDate = new Date();
        weekAgoDate.setDate(weekAgoDate.getDate() - 7);
        // Для timestamp with time zone (completed_at) используем ISO строку, 
        // так как тут сравнение точного времени, это нормально.
        dbQuery = dbQuery
            .eq('completed', true)
            .gte('completed_at', weekAgoDate.toISOString());
        break;
        
    default:
        break;
  }

  const { data, error } = await dbQuery.order('date_for', { ascending: false });

  if (error) {
      console.error('Ошибка поиска:', error);
      return [];
  }

  return data.map(mapTaskFromDB);
}

// Обработка ввода в поле поиска
let searchDebounceTimer;

// Вспомогательная функция для заголовка (можно добавить рядом)
function getFilterTitle(filter) {
  const titles = {
      'today': 'Сегодня',
      'tomorrow': 'Завтра',
      'week': '7 дней',
      'all': 'Все задачи',
      'completed-7days': 'Выполненные'
  };
  return titles[filter] || 'Текущий список';
}



async function handleListSearchInput(value) {
  const query = value ? value.trim() : '';
  activeFilters.searchQuery = query;

  // 1. Сначала показываем локальные результаты (мгновенно)
  applyFilters(); 

  // Если запрос пустой, останавливаемся
  if (query.length < 2) return;

  // 2. Очищаем предыдущий таймер
  clearTimeout(searchDebounceTimer);

  // 3. Запускаем поиск через 600мс
  searchDebounceTimer = setTimeout(async () => {
      
      // --- ИЗМЕНЕНИЕ: Передаем текущий фильтр (today, tomorrow и т.д.) ---
      const globalResults = await searchTasksInDB(query, currentTasksFilter);
      
      // Получаем текущие отображаемые задачи (локальные)
      let currentDisplay = getTasksFromCache(currentTasksFilter); 
      currentDisplay = currentDisplay.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));

      // Создаем Map для уникальности по ID
      const uniqueTasks = new Map();
      
      // Сначала добавляем локальные
      currentDisplay.forEach(t => uniqueTasks.set(t.id, t));
      
      // Потом добавляем найденные в базе
      globalResults.forEach(t => {
          if (!uniqueTasks.has(t.id)) {
              uniqueTasks.set(t.id, t);
          }
      });

      const combinedResults = Array.from(uniqueTasks.values());
      
      // Сортировка: Свежие сверху
      combinedResults.sort((a, b) => {
           return new Date(b.date || 0) - new Date(a.date || 0); 
      });

      // Рендер
      const listContent = document.getElementById('listModalContent');
      if (combinedResults.length > 0) {
           renderFilteredTasks(combinedResults);
           console.log(`✅ Найдено: ${combinedResults.length} (контекст: ${currentTasksFilter})`);
      } else {
           listContent.innerHTML = `
              <div class="empty-state">
                  <div class="empty-state-icon">🔍</div>
                  <div class="empty-state-text">Ничего не найдено</div>
                  <div class="empty-state-subtext">В категории "${getFilterTitle(currentTasksFilter)}"</div>
              </div>`;
      }

  }, 600); 
}

// Очистить строку поиска (кнопка ✕ справа)
function clearListSearch() {
  const searchInput = document.getElementById('listSearchInput');
  if (searchInput) {
    searchInput.value = '';
  }
  activeFilters.searchQuery = '';

  if (currentTasksFilter) {
    applyFilters();
  }
}


function closeListModal() {
  document.getElementById('listModalOverlay').classList.remove('active');
  document.body.classList.remove('body-modal-open');
  
  // Закрыть панель фильтров при закрытии списка
  const filtersPanel = document.getElementById('filtersPanel');
  const filtersOverlay = document.getElementById('filtersOverlay');
  const filterButton = document.getElementById('filterToggleButton');
  const goalCreateButton = document.getElementById('goalCreateButton');
  
  if (filtersPanel) {
        filtersPanel.classList.remove('active');
  }
  
  if (filtersOverlay) {
    filtersOverlay.classList.remove('active');
  }
  
  if (filterButton) {
    filterButton.classList.remove('active');
  }
  
  // Разблокировать скролл
  document.body.style.overflow = '';
  
  // Очистить состояние фильтров
  activeFilters.priorities.clear();
  activeFilters.categories.clear();
  activeFilters.sort = null;
  activeFilters.searchQuery = '';
  
  // Сбросить визуальное состояние чипов
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });

  // Сбросить и скрыть поиск
  const searchInput = document.getElementById('listSearchInput');
  const searchWrapper = document.getElementById('listSearchWrapper');
  const searchButton = document.getElementById('searchToggleButton');

  if (searchInput) {
    searchInput.value = '';
  }
  if (searchWrapper) {
    searchWrapper.style.display = 'none';
    searchWrapper.classList.remove('active');
  }
  if (searchButton) {
    searchButton.style.display = 'none';
    searchButton.classList.remove('active');
  }

  if (typeof setFabVisible === 'function') {
    setFabVisible(true);
  }
}


// Сортировка задач
function sortTasks(tasks, sortType) {
  const sorted = [...tasks];
  
  switch(sortType) {
    case 'date':
      // Сортировка по дате (раньше → позже)
      sorted.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      });
      break;
      
    case 'priority':
      // Сортировка по приоритету (extreme → high → medium → low)
      const priorityOrder = { extreme: 0, high: 1, medium: 2, low: 3 };
      sorted.sort((a, b) => {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
      break;
      
    case 'alphabet':
      // Сортировка по алфавиту
      sorted.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
      break;
  }
  
  return sorted;
}
function createListSummaryHTML(tasks) {
  if (!tasks || tasks.length === 0) return '';

  const count = tasks.length;
  let totalMinutes = 0;
  
  tasks.forEach(t => {
    if (t.duration_min) totalMinutes += parseInt(t.duration_min, 10);
  });

  // Логика склонения слова "задача"
  let suffix = 'задач';
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) { suffix = 'задач'; }
  else if (n1 > 1 && n1 < 5) { suffix = 'задачи'; }
  else if (n1 === 1) { suffix = 'задача'; }

  const timeLabel = totalMinutes > 0 ? `<span class="list-summary-sep">•</span> <span class="list-summary-time">⏱ ${formatDurationLabel(totalMinutes)}</span>` : '';

  return `
    <div class="list-summary-bar">
      <div class="list-summary-content">
        <span class="list-summary-icon">📊</span>
        <span>${count} ${suffix}</span>
        ${timeLabel}
      </div>
    </div>
  `;
}

// Отрисовка отфильтрованного списка задач
function renderFilteredTasks(tasks) {
  const listContent = document.getElementById('listModalContent');
  
  if (tasks.length === 0) {
    listContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">Задач не найдено</div>
        <div class="empty-state-subtext">Попробуйте изменить фильтры</div>
      </div>
    `;
    return;
  }

  // Если это список выполненных, показываем Timeline (там свои заголовки)
  if (currentTasksFilter === 'completed-7days') {
    renderCompletedTimeline(tasks, listContent);
    return;
  }

  // --- НОВАЯ ЛОГИКА ДЛЯ АКТИВНЫХ ЗАДАЧ ---
  // Генерируем сводку (кол-во + время)
  const summaryHTML = createListSummaryHTML(tasks);
  
  // Рендерим сводку + сами карточки
  const cardsHTML = tasks.map((task, index) => createTaskCardHTML(task, index)).join('');
  
  listContent.innerHTML = summaryHTML + cardsHTML;
  
  initSwipeForTasks();
}

// --- Хелпер для генерации HTML одной карточки (вынесли, чтобы переиспользовать) ---
function createTaskCardHTML(task, index = 0) {
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  const totalSubtasks = typeof task.totalSubtasks === 'number'
    ? task.totalSubtasks
    : (task.subtasks ? task.subtasks.length : 0);

  const completedSubtasks = typeof task.completedSubtasks === 'number'
    ? task.completedSubtasks
    : (task.subtasks ? task.subtasks.filter(st => st.completed).length : 0);

  // Иконка для свайпа влево (Галочка или Возврат)
  const swipeIconPath = task.completed
    ? 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z' 
    : 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';

  // Класс для фона свайпа (зеленый для выполнения, оранжевый для возврата)
  const leftActionClass = task.completed ? 'action-bg action-left return-action' : 'action-bg action-left';

  const priorityColor = getPriorityColor(task.priority);
  const categoryColor = getCategoryColor(task.category);

  // --- ОБНОВЛЕННАЯ ИКОНКА СЕРИИ ---
  const isSeries = !!task.groupId;
  // Используем ♾️ вместо 🔁
  const seriesIcon = isSeries ? '<span class="icon-series" title="Серия задач">♾️</span>' : '';

  return `
    <div class="task-item swipe-wrapper ${task.completed ? 'completed' : ''} ${hasSubtasks ? 'has-subtasks' : ''}" 
         style="animation-delay: ${index * 0.05}s" 
         data-task-id="${task.id}"
         onclick="toggleTaskAccordion(${task.id}, event)">

      <div class="swipe-actions">
        <div class="${leftActionClass}">
          <div class="action-icon icon-check">
            <svg viewBox="0 0 24 24"><path d="${swipeIconPath}"/></svg>
          </div>
        </div>
        <div class="action-bg action-right">
          <div class="action-icon icon-trash">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </div>
        </div>
      </div>

      <div class="task-card" style="--color: ${priorityColor};">
        <div class="task-indicator"></div>
        <div class="task-content">
          <div class="task-header-row">
            <div>
              <div class="task-title">${task.title} ${seriesIcon}</div>
              
              <div class="task-meta">
                <span class="badge badge-cat" style="color: ${categoryColor}; border-color: ${categoryColor}40; background: ${categoryColor}10;">
                  ${getCategoryIcon(task.category)} ${getCategoryText(task.category)}
                </span>
                ${task.date ? `<span class="badge">📅 ${formatDate(task.date)}</span>` : ''}
                ${task.duration_min ? `<span class="badge">⏱ ${formatDurationLabel(task.duration_min)}</span>` : ''}
                
                ${totalSubtasks > 0 ? `
                  <span class="badge ${completedSubtasks === totalSubtasks ? 'subtasks-complete' : ''}">
                    ✓ ${completedSubtasks}/${totalSubtasks}
                  </span>` : ''}
                
                ${task.completed && task.completedAt ? `
                  <span class="badge">✅ ${formatTime(task.completedAt)}</span>` : ''}
              </div>
            </div>
            ${hasSubtasks ? `<div class="accordion-toggle">▼</div>` : ''}
          </div>
        </div>

        <div class="task-subtasks-accordion" id="accordion-${task.id}">
          <div class="subtasks-area">
            <div class="subtasks-inner">
              <div class="inner-content">
                ${hasSubtasks ? task.subtasks.map((subtask) => `
                  <div class="sub-item ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}"
                       onclick="toggleSubtaskInCard(${task.id}, ${subtask.id}, event)">
                    <div class="sub-circle"></div>
                    <div class="sub-text">${subtask.title}</div>
                  </div>
                `).join('') : ''}
                
                <button class="edit-btn-internal" onclick="editTask(${task.id}, event)">
                  <span>✎</span> Редактировать задачу
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}


// --- ИСПРАВЛЕНИЕ: Рендер таймлайна с учетом ЛОКАЛЬНОГО времени ---
// --- ИСПРАВЛЕНИЕ: Рендер таймлайна с учетом ЛОКАЛЬНОГО времени ---
function renderCompletedTimeline(tasks, container) {
  // 1. Группируем задачи по дате завершения (ЛОКАЛЬНОЙ)
  const groups = {};
  
  tasks.forEach(task => {
    if (!task.completedAt) return;

    // Преобразуем UTC время из базы в Локальное время пользователя
    const d = new Date(task.completedAt);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    // Формируем ключ YYYY-MM-DD по местному времени
    const dateKey = `${year}-${month}-${day}`;
    
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(task);
  });

  // 2. Сортируем даты (от новых к старым)
  const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

  // 3. Генерируем HTML
  let html = '<div class="timeline-wrapper">';

  sortedDates.forEach(dateStr => {
    const dayTasks = groups[dateStr];
    
    // Внутренняя сортировка: сначала новые задачи внутри дня
    dayTasks.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const count = dayTasks.length;
    let totalMinutes = 0;
    dayTasks.forEach(t => {
      if (t.duration_min) totalMinutes += parseInt(t.duration_min, 10);
    });

    const headerLabel = getDayHeaderLabel(dateStr);
    const durationLabel = totalMinutes > 0 ? ` • ${formatDurationLabel(totalMinutes)}` : '';
    const summaryLabel = `${count} ${count === 1 ? 'задача' : count < 5 ? 'задачи' : 'задач'}${durationLabel}`;

    html += `
      <div class="day-group">
        <div class="day-header">
          <div class="day-dot"></div>
          <div class="day-info">
            <div class="day-title">${headerLabel}</div>
            <div class="day-summary">${summaryLabel}</div>
          </div>
        </div>
        
        ${dayTasks.map((task, idx) => createTaskCardHTML(task, idx)).join('')}
      </div>
    `;
  });

  html += '</div>';
  
  container.innerHTML = html;
  initSwipeForTasks();
}

// --- Хелпер для красивой даты заголовка (Сегодня/Вчера/12 Декабря) ---
function getDayHeaderLabel(dateStr) {
  if (dateStr === 'unknown') return 'Дата неизвестна';
  
  const dateObj = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Сравниваем строки YYYY-MM-DD
  const d = dateStr;
  const t = today.toISOString().split('T')[0];
  const y = yesterday.toISOString().split('T')[0];

  if (d === t) return 'Сегодня';
  if (d === y) return 'Вчера';

  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  let str = dateObj.toLocaleDateString('ru-RU', options);
  // Делаем первую букву заглавной
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Хелпер для отображения времени (чч:мм) ---
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'});
  } catch(e) { return ''; }
}

// Функция переключения подзадачи прямо в карточке списка
async function toggleSubtaskInCard(taskId, subtaskId, event) {
  if (event) event.stopPropagation();

  const task = tasksDB.find(t => t.id === taskId);
  const subtask = task?.subtasks?.find(st => st.id === subtaskId);
  if (!subtask) return;

  const newStatus = !subtask.completed;

  // 1. Оптимистичное обновление UI (Точечное!)
  const subtaskEl = document.querySelector(`.sub-item[data-subtask-id="${subtaskId}"]`);
  if (subtaskEl) {
    // Анимация чекбокса
    if (newStatus) subtaskEl.classList.add('completed');
    else subtaskEl.classList.remove('completed');
  }

  // Обновляем данные в памяти
  subtask.completed = newStatus;
  task.completedSubtasks = task.subtasks.filter(st => st.completed).length;

  // Обновляем счетчик "1/3" в шапке карточки без перезагрузки
  updateTaskBadgesInDOM(taskId);
  
  // Обновляем общий счетчик на дашборде (если нужно)
  updateDashboardCounters();

  try {
    // 2. Отправляем в Supabase (в фоне)
    const { error } = await supabase
        .from('subtasks')
        .update({ completed: newStatus })
        .eq('id', subtaskId);

    if (error) throw error;
    
  } catch (e) {
    console.error('Ошибка обновления подзадачи:', e);
    // Откат изменений UI при ошибке
    subtask.completed = !newStatus; 
    if (subtaskEl) {
        subtaskEl.classList.toggle('completed', !newStatus);
    }
    updateTaskBadgesInDOM(taskId);
    showToast('Ошибка синхронизации');
  }
}

function initSwipeForTasks() {
const wrappers = document.querySelectorAll('.task-item.swipe-wrapper');
wrappers.forEach(wrapper => {
if (!wrapper._swipeInstance) {
  wrapper._swipeInstance = new SwipeableTaskItem(wrapper);
}
});
}

class SwipeableTaskItem {
constructor(wrapper) {
this.wrapper = wrapper;
this.card = wrapper.querySelector('.task-card');
if (!this.card) return;

this.bgLeft = wrapper.querySelector('.action-left');
this.bgRight = wrapper.querySelector('.action-right');
this.iconCheck = wrapper.querySelector('.icon-check');
this.iconTrash = wrapper.querySelector('.icon-trash');

this.startX = 0;
this.startY = 0;
this.currentX = 0;
this.isDragging = false;
this.isScrolling = undefined;
this.triggerPoint = 120;

this.initEvents();
}

initEvents() {
// touch
this.card.addEventListener('touchstart', (e) => this.start(e), { passive: true });
this.card.addEventListener('touchmove', (e) => this.move(e));
this.card.addEventListener('touchend', (e) => this.end(e));

// mouse
this.card.addEventListener('mousedown', (e) => this.start(e));
window.addEventListener('mousemove', (e) => this.move(e));
window.addEventListener('mouseup', (e) => this.end(e));
}

start(e) {
// не начинаем свайп от кнопки редактирования / внутри аккордеона
if (e.target.closest('.edit-btn-internal')) return;
if (e.target.closest('.task-subtasks-accordion')) return;

this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
this.startY = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;

this.isDragging = true;
this.isScrolling = undefined;
this.wrapper.classList.add('is-dragging');
}

move(e) {
if (!this.isDragging) return;

const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
const y = e.type.includes('mouse') ? e.pageY : e.touches[0].clientY;
const deltaX = x - this.startX;
const deltaY = y - this.startY;

if (typeof this.isScrolling === 'undefined') {
  this.isScrolling = Math.abs(deltaY) > Math.abs(deltaX);
}

if (this.isScrolling) {
  this.isDragging = false;
  this.wrapper.classList.remove('is-dragging');
  return;
}

if (e.cancelable) e.preventDefault();

this.currentX = deltaX / (1 + Math.abs(deltaX) / 300);
this.card.style.transform = `translateX(${this.currentX}px)`;
this.updateVisuals(this.currentX);
}

updateVisuals(offset) {
this.bgLeft.style.opacity = '0';
this.bgRight.style.opacity = '0';
this.bgLeft.style.zIndex = '-1';
this.bgRight.style.zIndex = '-1';
this.iconCheck.style.transform = 'scale(0.5)';
this.iconTrash.style.transform = 'scale(0.5)';

const progress = Math.min(Math.abs(offset) / this.triggerPoint, 1);

if (offset > 0) {
  this.bgLeft.style.zIndex = '1';
  this.bgLeft.style.opacity = '1';
  if (offset > 40) {
    this.iconCheck.style.transform = `scale(${0.5 + progress * 0.7})`;
  }
} else if (offset < 0) {
  this.bgRight.style.zIndex = '1';
  this.bgRight.style.opacity = '1';
  if (Math.abs(offset) > 40) {
    this.iconTrash.style.transform = `scale(${0.5 + progress * 0.7})`;
  }
}
}

end() {
if (!this.isDragging) return;
this.isDragging = false;
this.wrapper.classList.remove('is-dragging');

if (this.currentX > this.triggerPoint) {
  this.completeAction('done');
} else if (this.currentX < -this.triggerPoint) {
  this.completeAction('delete');
} else {
  this.reset();
}
}

reset() {
this.currentX = 0;
this.card.style.transform = 'translateX(0)';
setTimeout(() => {
  this.bgLeft.style.opacity = '0';
  this.bgRight.style.opacity = '0';
  this.bgLeft.style.zIndex = '-1';
  this.bgRight.style.zIndex = '-1';
}, 200);
}

completeAction(type) {
const taskId = parseInt(this.wrapper.dataset.taskId, 10);
if (!taskId) {
  this.reset();
  return;
}

if (type === 'delete') {
  // логика удаления задачи
  deleteTask(taskId, null);
} else if (type === 'done') {
  // логика выполнения / возврата
  if (this.wrapper.classList.contains('completed')) {
    uncompleteTask(taskId, null);
  } else {
    completeTask(taskId, null);
  }
}

this.reset();
}
}


function isGoalsListOpen() {
  const listOverlay = document.getElementById('listModalOverlay');
  if (!listOverlay || !listOverlay.classList.contains('active')) {
    return false;
  }
  return currentGoalsFilter === 'active' || currentGoalsFilter === 'achieved';
}

function syncFabWithGoalsListState() {
  if (typeof setFabVisible !== 'function') return;
  setFabVisible(!isGoalsListOpen());
}

function rerenderGoalsListIfOpen() {
  if (isGoalsListOpen()) {
    // Перерисовываем текущий список целей, чтобы обновился goal-progress-bar
    showGoalsList(currentGoalsFilter);
  }
}

function rerenderTasksListIfOpen() {
  const listOverlay = document.getElementById('listModalOverlay');
  if (listOverlay.classList.contains('active') && currentTasksFilter) {
    // Перерисовываем тот же самый фильтр задач
    showTasksList(currentTasksFilter);
  }
}

function refreshFilterCountsIfOpen() {
  const filterOverlay = document.getElementById('filterModalOverlay');
  if (filterOverlay.classList.contains('active')) {
    updateFilterCounts();
  }
}

// Вызывать после любых изменений задач
function refreshOpenContextAfterTaskChange() {
  refreshFilterCountsIfOpen();   // если открыт экран фильтров — обновятся счётчики
  rerenderTasksListIfOpen();     // если открыт список задач — перерисуем текущий фильтр
}

// Вызывать после любых изменений целей
function refreshOpenContextAfterGoalChange() {
  rerenderGoalsListIfOpen();     // если открыт список целей — перерисуем его
}



// Функция отображения списка целей
function showGoalsList(filter) {
  currentGoalsFilter = filter; // <— запоминаем, какой список открыт
  currentTasksFilter = null;

  const listOverlay = document.getElementById('listModalOverlay');
  const listTitle = document.getElementById('listModalTitle');
  const listContent = document.getElementById('listModalContent');

  // 🔍 Скрываем поиск и фильтры задач при показе целей
  const searchButton = document.getElementById('searchToggleButton');
  const searchWrapper = document.getElementById('listSearchWrapper');
  const searchInput = document.getElementById('listSearchInput');
  const filterButton = document.getElementById('filterToggleButton');
  const goalCreateButton = document.getElementById('goalCreateButton');

  if (searchButton) {
    searchButton.style.display = 'none';
    searchButton.classList.remove('active');
  }
  if (searchWrapper) {
    searchWrapper.style.display = 'none';
    searchWrapper.classList.remove('active');
  }
  if (searchInput) {
    searchInput.value = '';
  }
  activeFilters.searchQuery = '';

  if (filterButton) {
    filterButton.style.display = 'none';
    filterButton.classList.remove('active');
  }
  if (goalCreateButton) {
    goalCreateButton.style.display = 'flex';
  }

  const titles = {
    'active': '🎯 Активные цели',
    'achieved': '🏁 Достигнутые цели'
  };
  listTitle.textContent = titles[filter] || 'Цели';

  const goals = getGoalsFromCache(filter);
  const isActiveView = filter === 'active';

  const formatDeadlineTag = (goal, progressValue) => {
    if (!goal.active || progressValue >= 100) {
      return '🏁 Завершено';
    }
    if (!goal.deadline) return 'Без срока';
    const date = new Date(goal.deadline);
    if (Number.isNaN(date.getTime())) return 'Без срока';
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const cardsMarkup = goals.map((goal, index) => {
    const categoryMeta = getGoalMilestoneCategory(goal.category);
    const totalSubgoals = Math.max(0, goal.totalSubgoals ?? (goal.subgoals ? goal.subgoals.length : 0) ?? 0);
    const completedSubgoalsRaw = goal.completedSubgoals ?? (goal.subgoals ? goal.subgoals.filter((sg) => sg.completed).length : 0) ?? 0;
    const completedSubgoals = Math.min(Math.max(completedSubgoalsRaw, 0), totalSubgoals || completedSubgoalsRaw || 0);
    const hasSteps = totalSubgoals > 0;
    const percent = (() => {
      if (typeof goal.progress === 'number' && !Number.isNaN(goal.progress)) {
        return Math.max(0, Math.min(Math.round(goal.progress), 100));
      }
      if (hasSteps) {
        return Math.round((completedSubgoals / totalSubgoals) * 100) || 0;
      }
      return goal.active ? 0 : 100;
    })();
    const remainingSteps = hasSteps ? Math.max(totalSubgoals - completedSubgoals, 0) : 0;
    const deadlineText = formatDeadlineTag(goal, percent);
    const maxVisualSegments = 40;
    const renderTotal = Math.max(1, hasSteps ? Math.min(totalSubgoals, maxVisualSegments) : 10);
    const referenceValue = hasSteps ? (totalSubgoals === 0 ? 0 : completedSubgoals / totalSubgoals) : (percent / 100);
    const renderDone = Math.min(renderTotal, Math.round(referenceValue * renderTotal));
    const isDense = renderTotal > 20;
    const glowColor = hexToRgba(categoryMeta.color, 0.35);

    const segmentsHTML = Array.from({ length: renderTotal }).map((_, segIndex) => {
      const filled = segIndex < renderDone;
      const delay = filled ? `style="animation-delay: ${segIndex * 0.03 + index * 0.08}s"` : '';
      return `<div class="segment ${filled ? 'filled' : ''}" ${delay}></div>`;
    }).join('');

    return `
      <div class="goal-milestone-card" style="--category-color: ${categoryMeta.color}; --category-glow: ${glowColor};" onclick="openGoalDetail(${goal.id})">
        <div class="card-header">
          <div>
            <div class="card-tags">
              <span class="tag category">${categoryMeta.label}</span>
              <span class="tag deadline">📅 ${deadlineText}</span>
            </div>
            <div class="card-title">${goal.title}</div>
          </div>
          <div class="card-stats-right">
            <div class="stat-big">${remainingSteps}</div>
            <div class="stat-label">Осталось<br>шагов</div>
          </div>
        </div>

        <div class="milestone-track-container">
          <div class="track-info">
            <span>Прогресс ${percent}%</span>
            <span>${completedSubgoals}/${totalSubgoals}</span>
          </div>
          <div class="segments-wrapper ${isDense ? 'dense' : ''}">
            ${segmentsHTML}
          </div>
        </div>
      </div>
    `;
  }).join('');

  const emptyState = `
    <div class="empty-state milestone-empty">
      <div class="empty-icon">${isActiveView ? '🚀' : '🏁'}</div>
      <div class="empty-title">${isActiveView ? 'Нет активных целей' : 'Нет выполненных целей'}</div>
      <div class="empty-text">${isActiveView ? 'Добавьте новую цель, чтобы начать прогресс.' : 'Как только цель будет завершена, она появится здесь.'}</div>
    </div>
  `;

  if (listContent) {
    listContent.innerHTML = `
      <div class="goals-milestone-wrapper">
        <div class="glass-goals-list ${goals.length === 0 ? 'empty' : ''}">
          ${goals.length === 0 ? emptyState : cardsMarkup}
        </div>
      </div>
    `;
  }

  listOverlay.classList.add('active');
  document.body.classList.add('body-modal-open');
  setFabVisible(false);
}


    // Создание пузырьков в прогресс-баре
function createProgressBubbles(progressElement) {
  if (!progressElement) return;
  
  // Очистить старые пузырьки
  progressElement.querySelectorAll('.goal-progress-bubble').forEach(b => b.remove());
  
  // Получить ширину прогресс-бара
  const width = progressElement.offsetWidth;
  if (width === 0) return;
  
  // Создать 3-5 случайных пузырьков
  const bubbleCount = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < bubbleCount; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'goal-progress-bubble';
    
    // Случайный размер (3-8px)
    const size = Math.floor(Math.random() * 6) + 3;
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    
    // Случайная позиция по горизонтали
    bubble.style.left = (Math.random() * 100) + '%';
    
    // Случайная задержка анимации
    bubble.style.animationDelay = (Math.random() * 2) + 's';
    
    // Случайная длительность анимации
    bubble.style.animationDuration = (Math.random() * 2 + 2) + 's';
    
    progressElement.appendChild(bubble);
  }
  
  // Удалить пузырьки через 5 секунд
  setTimeout(() => {
    progressElement.querySelectorAll('.goal-progress-bubble').forEach(b => b.remove());
  }, 5000);
}
// Ripple-эффект при клике на прогресс-бар
function createRippleEffect(element, event) {
  const ripple = document.createElement('div');
  ripple.style.cssText = `
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,.6);
    pointer-events: none;
    animation: rippleExpand .6s ease-out;
  `;
  
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;
  
  ripple.style.width = ripple.style.height = size + 'px';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  
  element.style.position = 'relative';
  element.appendChild(ripple);
  
  setTimeout(() => ripple.remove(), 600);
}

// Добавить CSS для ripple-анимации (добавится динамически)
if (!document.getElementById('ripple-animation')) {
  const style = document.createElement('style');
  style.id = 'ripple-animation';
  style.textContent = `
    @keyframes rippleExpand {
      from {
        transform: scale(0);
        opacity: 1;
      }
      to {
        transform: scale(1);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Активировать ripple на всех прогресс-барах
document.addEventListener('click', (e) => {
  const progressBar = e.target.closest('.goal-progress-bar, .weekday-bar-container');
  if (progressBar) {
    createRippleEffect(progressBar, e);
  }
});




// Моковые данные задач (ИСПРАВЛЕНО: корректная работа с датами)
// Моковые данные задач (ИСПРАВЛЕНО: корректная работа с датами)
function getTasksFromCache(filter) {
  const today = getToday();
  const tomorrow = getTomorrow();
  
  if (filter === 'today') {
    return tasksDB.filter(t => t.date === today && !t.completed);
  } else if (filter === 'tomorrow') {
    return tasksDB.filter(t => t.date === tomorrow && !t.completed);
  } else if (filter === 'week') {
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    const weekDate = weekLater.toISOString().split('T')[0];
    return tasksDB.filter(t => t.date && t.date >= today && t.date <= weekDate && !t.completed);
  } else if (filter === 'all') {
    return tasksDB.filter(t => !t.completed);
  } else if (filter === 'completed-7days') {
    // 🔥 ИСПРАВЛЕНИЕ: Используем более надежное сравнение времени
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0); // Сбрасываем время на начало дня 7 дней назад
    
    return tasksDB.filter(t => {
      if (!t.completed || !t.completedAt) return false;
      
      const completedDate = new Date(t.completedAt);
      // Сравниваем миллисекунды, это надежнее чем строки
      return completedDate.getTime() >= weekAgo.getTime();
    });
  }
  return [];
}

// Моковые данные целей
function getGoalsFromCache(filter) {
  if (filter === 'active') {
    return goalsDB.filter(g => g.active);
  } else if (filter === 'achieved') {
    return goalsDB.filter(g => !g.active);
  }
  return [];
}

// =====================
// 🔄 АВТООБНОВЛЕНИЕ ОТКРЫТОГО ОКНА ПОСЛЕ СОЗДАНИЯ/РЕДАКТИРОВАНИЯ
// =====================

// Определяем, какое окно сейчас открыто
function isFilterModalOpen() {
const el = document.getElementById('filterModalOverlay');
return el && el.classList.contains('active');
}
function isListModalOpen() {
const el = document.getElementById('listModalOverlay');
return el && el.classList.contains('active');
}

// Понимаем, какой именно список задач открыт (по заголовку)
function getCurrentTasksFilterFromTitle() {
  if (!isListModalOpen()) return null;

  // если уже знаем фильтр — возвращаем его
  if (currentTasksFilter) return currentTasksFilter;

  // fallback на случай, если где-то откроют модал без установки currentTasksFilter
  const title = (document.getElementById('listModalTitle')?.textContent || '').toLowerCase();

  if (title.includes('выполненные')) return 'completed-7days';
  if (title.includes('сегодня')) return 'today';
  if (title.includes('завтра')) return 'tomorrow';
  if (title.includes('7 дней') || title.includes('недел')) return 'week';
  if (title.includes('все')) return 'all';

  return null;
}


// Проверяем, подходит ли конкретная задача под заданный фильтр
function taskMatchesFilter(task, filter) {
  // Используем наши безопасные хелперы, которые берут локальное время
  const todayStr = getToday();
  const tomorrowStr = getTomorrow();

  // Для вычисления "через неделю" используем безопасную математику
  const weekLaterDate = new Date();
  weekLaterDate.setDate(weekLaterDate.getDate() + 7);
  const weekLaterStr = toISODate(weekLaterDate);

  if (filter === 'today') {
    return !task.completed && task.date === todayStr;
  }
  if (filter === 'tomorrow') {
    return !task.completed && task.date === tomorrowStr;
  }
  if (filter === 'week') {
    // Сравниваем строки YYYY-MM-DD лексикографически (это работает корректно)
    return !task.completed && task.date && task.date >= todayStr && task.date <= weekLaterStr;
  }
  if (filter === 'all') {
    return !task.completed;
  }
  if (filter === 'completed-7days') {
    if (!task.completed || !task.completedAt) return false;
    
    // Для completedAt (timestamp) нам нужно сравнение с датой неделю назад
    const weekAgoDate = new Date();
    weekAgoDate.setDate(weekAgoDate.getDate() - 7);
    // Приводим к YYYY-MM-DD для сравнения, но completedAt - это timestamp
    // Лучше сравнить объекты Date для точности
    const completedDate = new Date(task.completedAt);
    // Сбрасываем время у границы фильтра в начало дня неделю назад
    weekAgoDate.setHours(0,0,0,0);
    
    return completedDate >= weekAgoDate;
  }
  return false;
}
// Для целей — достаточно понять активна она или нет
function goalMatchesFilter(goal, filter) {
if (filter === 'active') return !!goal.active;
if (filter === 'achieved') return !goal.active;
return false;
}

// Обновление «где пользователь находится» после изменения задачи
// mode: 'create' | 'edit'
function refreshOpenViewAfterTaskChange(changedTask, mode = 'create') {
// Если открыт экран фильтров (кнопки «Сегодня/Завтра/7 дней/Все») — просто обновим счётчики
if (isFilterModalOpen()) {
updateFilterCounts();
}

// Если открыт список (list-modal-overlay)
if (isListModalOpen()) {
// Списки целей: если сейчас показываются цели — ничего для задач не делаем
// (в коде уже есть currentGoalsFilter, используем его, если он установлен)
if (typeof currentGoalsFilter === 'string' && (currentGoalsFilter === 'active' || currentGoalsFilter === 'achieved')) {
  return;
}

// Списки задач: выясняем текущий фильтр и решаем, перерисовывать ли
const currentFilter = getCurrentTasksFilterFromTitle();

if (!currentFilter) return;

// При редактировании — перерисовываем всегда (задача могла уйти из фильтра)
// При создании — перерисовываем только если новая задача подходит под текущий фильтр
const needRerender = (mode === 'edit') ? true : taskMatchesFilter(changedTask, currentFilter);

if (needRerender) {
  showTasksList(currentFilter);
}
}
}

// Обновление после изменения цели
function refreshOpenViewAfterGoalChange(changedGoal, mode = 'create') {
// Для фильтров задач (filter-modal) ничего не делаем — это другой экран.
// Обновление счётчиков на главной уже делает updateDashboardCounters().

if (isListModalOpen()) {
// Если открыт список целей — перерисуем по необходимости
if (typeof currentGoalsFilter === 'string' && (currentGoalsFilter === 'active' || currentGoalsFilter === 'achieved')) {
  const needRerender = (mode === 'edit') ? true : goalMatchesFilter(changedGoal, currentGoalsFilter);
  if (needRerender) {
    showGoalsList(currentGoalsFilter);
  }
}
}
}


// Вспомогательные функции форматирования
function getCategoryById(category) {
  return profileCategories.find((cat) => String(cat.id) === String(category));
}

function getCategoryIcon(category) {
  const found = getCategoryById(category);
  if (found?.icon) return found.icon;
  return '📝';
}

function getCategoryText(category) {
  const found = getCategoryById(category);
  if (found?.name) return found.name;
  if (category) return 'Удалённая категория';
  return 'Категория';
}

function getCategoryColor(category, fallback = '#ffd32a') {
  const found = getCategoryById(category);
  return found?.color || fallback || '#cfd8dc';
}


function getGoalMilestoneCategory(category) {
  const style = getCategoryStyle(category); // Просто переиспользуем логику выше
  return { label: style.label, color: style.color };
}

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(0, 0, 0, ${alpha})`;
  let c;
  if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    c = hex.substring(1).split('');
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    c = '0x' + c.join('');
    return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
  }
  return hex; // Возвращаем как есть, если не hex
}

const categoryStatsData = {
  week: [],
  month: [],
  year: [],
  all: []
};

function renderCategoryStats(periodKey, containerId) {
  const container = document.getElementById(containerId);
  const data = categoryStatsData[periodKey];
  if (!container || !Array.isArray(data)) return;

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);

  container.innerHTML = '';

  sorted.forEach(item => {
    const conf = getCategoryStyle(item.id);
    const percentRaw = total > 0 ? (item.count / total) * 100 : 0;
    const percent = Math.round(percentRaw);

    const card = document.createElement('div');
    card.className = 'category-stat-card';

    card.innerHTML = `
      <div class="category-stat-icon" style="background:${conf.color}20; color:${conf.color}; border:1px solid ${conf.color}40;">
        ${conf.icon}
      </div>
      <div class="category-stat-info">
        <div class="category-stat-top">
          <span class="category-stat-name">${conf.label}</span>
          <span class="category-stat-percent" style="color:${conf.color}">${percent}% <span>(${item.count})</span></span>
        </div>
        <div class="category-stat-progress">
          <div class="category-stat-fill" data-width="${percentRaw}%" style="background:${conf.bg}"></div>
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  setTimeout(() => {
    container.querySelectorAll('.category-stat-fill').forEach((fill, index) => {
      const target = fill.getAttribute('data-width') || '0%';
      fill.style.width = '0%';
      setTimeout(() => { fill.style.width = target; }, index * 80);
    });
  }, 80);
}

function renderAllCategoryStats() {
  renderCategoryStats('week', 'categoryStatsWeek');
  renderCategoryStats('month', 'categoryStatsMonth');
  renderCategoryStats('year', 'categoryStatsYear');
  renderCategoryStats('all', 'categoryStatsAll');
}

function animateCategoryStatBars() {
  const fills = document.querySelectorAll('.category-stat-fill');
  fills.forEach((fill, index) => {
    const target = fill.getAttribute('data-width') || '0%';
    fill.style.width = '0%';
    setTimeout(() => { fill.style.width = target; }, index * 70 + 60);
  });
}

function getPriorityText(priority) {
  const texts = { extreme: '🚨 Экстремальный', high: '🔴 Высокий', medium: '🟡 Средний', low: '🟢 Низкий' };
  return texts[priority] || priority;
}

function formatDate(dateStr) {
  const today = getToday();
  const tomorrow = getTomorrow();
  
  if (!dateStr) return '';
  if (dateStr === today) return 'Сегодня';
  if (dateStr === tomorrow) return 'Завтра';
  
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, month, day);
      return localDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch(e) {
    return dateStr;
  }
}

// Открыть/закрыть панель статистики
// Открыть/закрыть панель статистики
function openStats() {
  document.getElementById('statsOverlay').classList.add('active');
  document.getElementById('statsPanel').classList.add('active');
  setFabVisible(true);

  // 1. Запуск расчетов статистики задач
  if (typeof initRealTaskStats === 'function') {
    initRealTaskStats();
  }

  // 2. Запуск расчетов статистики целей
  if (typeof initRealGoalStats === 'function') {
    initRealGoalStats();
  }

  // --- ИСПРАВЛЕНИЕ: Синхронизация UI (убираем черный экран) ---
  
  // А) Определяем активный Тип (Задачи или Цели)
  const activeTypeBtn = document.querySelector('.stats-type-btn.active');
  const type = activeTypeBtn ? activeTypeBtn.dataset.type : 'tasks';

  // Показываем главную панель (panel-tasks или panel-goals)
  document.querySelectorAll('.stats-content-panel').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  const activeMainPanel = document.getElementById(`panel-${type}`);
  if (activeMainPanel) {
    activeMainPanel.style.display = 'block';
    // Небольшая задержка для анимации opacity, если она есть в CSS
    setTimeout(() => activeMainPanel.classList.add('active'), 10);
  }

  // Б) Управляем видимостью селекторов периода
  const tasksSelector = document.getElementById('statsPeriodSelector');
  const goalsSelector = document.getElementById('goalsPeriodSelector');
  if (tasksSelector) tasksSelector.style.display = (type === 'tasks') ? 'grid' : 'none';
  if (goalsSelector) goalsSelector.style.display = (type === 'goals') ? 'grid' : 'none';

  // В) Определяем активный Период (Неделя/Месяц/Год/Все)
  let periodSelectorId = type === 'tasks' ? 'statsPeriodSelector' : 'goalsPeriodSelector';
  const activePeriodBtn = document.querySelector(`#${periodSelectorId} .stats-period-btn.active`);

  if (activePeriodBtn) {
    const period = activePeriodBtn.dataset.period || activePeriodBtn.dataset.goalsPeriod;
    const targetPanelId = `${type}-${period}`; // например: tasks-month

    // Скрываем все под-панели периодов
    document.querySelectorAll('.stats-period-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // Показываем нужную под-панель
    const targetPanel = document.getElementById(targetPanelId);
    if (targetPanel) {
      targetPanel.style.display = 'block';
      setTimeout(() => targetPanel.classList.add('active'), 10);
    }
  }
  // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

  animateCategoryStatBars();

  // Активировать liquid-эффект для weekday bars
  setTimeout(() => {
    document.querySelectorAll('.weekday-bar').forEach((bar, index) => {
      setTimeout(() => {
        const targetWidth = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
          bar.style.width = targetWidth;
          if (bar.offsetWidth > 20) {
            createProgressBubbles(bar);
          }
        }, 50);
      }, index * 80);
    });
  }, 200);
}
function closeStats() {
  document.getElementById('statsOverlay').classList.remove('active');
  document.getElementById('statsPanel').classList.remove('active');
}

// Теплокарта (макет)
function generateHeatmap(containerId) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = '';
  const levels = [0, 1, 2, 3, 4];
  for (let i = 0; i < 28; i++) {
    const d = document.createElement('div');
    d.className = `heatmap-day level-${levels[Math.floor(Math.random() * levels.length)]}`;
    d.title = `День ${i + 1}`;
    grid.appendChild(d);
  }
}

// Генерация годового Heatmap (как на GitHub)
function generateYearHeatmap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Очистить контейнер
  container.innerHTML = '';
  
  // Получить текущую дату и дату год назад
  const today = new Date();
  const yearAgo = new Date(today);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  yearAgo.setDate(yearAgo.getDate() + 1); // Начинаем со следующего дня
  
  // Найти первое воскресенье
  const firstDay = new Date(yearAgo);
  while (firstDay.getDay() !== 0) {
    firstDay.setDate(firstDay.getDate() + 1);
  }
  
  // Создать массив дат для каждой недели
  const weeks = [];
  const currentDate = new Date(firstDay);
  
  while (currentDate <= today) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      if (currentDate <= today && currentDate >= yearAgo) {
        week.push(new Date(currentDate));
      } else {
        week.push(null);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }
  
  // Создать метки месяцев
  const monthsRow = document.createElement('div');
  monthsRow.className = 'heatmap-year-months';
  
  // Пустая ячейка для выравнивания с днями недели
  const emptyCell = document.createElement('div');
  monthsRow.appendChild(emptyCell);
  
  // Определить, какие месяцы показывать
  const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  let lastMonth = -1;
  
  weeks.forEach((week, weekIndex) => {
    const firstDayOfWeek = week.find(d => d !== null);
    if (firstDayOfWeek) {
      const month = firstDayOfWeek.getMonth();
      if (month !== lastMonth && weekIndex % 4 === 0) {
        const monthLabel = document.createElement('div');
        monthLabel.className = 'heatmap-year-month-label';
        monthLabel.textContent = monthLabels[month];
        monthLabel.style.gridColumn = `${weekIndex + 2} / span 4`;
        monthsRow.appendChild(monthLabel);
        lastMonth = month;
      }
    }
  });
  
  container.appendChild(monthsRow);
  
  // Создать ряды для дней недели
  const dayLabels = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const rows = [];
  
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.gap = '3px';
    row.style.alignItems = 'center';
    
    // Добавить метку дня недели (только для Пн, Ср, Пт)
    const dayLabel = document.createElement('div');
    dayLabel.className = 'heatmap-year-day-label';
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      dayLabel.textContent = dayLabels[dayOfWeek];
    }
    row.appendChild(dayLabel);
    
    // Добавить ячейки для каждой недели
    weeks.forEach(week => {
      const date = week[dayOfWeek];
      const cell = document.createElement('div');
      cell.className = 'heatmap-year-day';
      
      if (date) {
        // Случайный уровень активности для демонстрации
        const level = Math.floor(Math.random() * 5);
        cell.classList.add(`level-${level}`);
        
        // Форматировать дату для tooltip
        const dateStr = date.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        // Количество задач (случайное для демонстрации)
        const tasksCount = level === 0 ? 0 : Math.floor(Math.random() * 10) + 1;
        cell.title = `${dateStr}: ${tasksCount} ${tasksCount === 1 ? 'задача' : tasksCount < 5 ? 'задачи' : 'задач'}`;
      } else {
        cell.style.opacity = '0';
        cell.style.pointerEvents = 'none';
      }
      
      row.appendChild(cell);
    });
    
    container.appendChild(row);
  }
}

// Динамический размер контента
// function resizeAppContent() {
//   const container = document.querySelector('.phone-container');
//   const header = document.getElementById('appHeader');
//   const content = document.getElementById('appContent');
//   if (!container || !header || !content) return;
//   const h = container.clientHeight - header.offsetHeight;
//   content.style.top = header.offsetHeight + 'px';
//   content.style.height = h + 'px';
// }



function setupTabs() {
  // Селектор типа (Задачи / Цели)
  const typeButtons = document.querySelectorAll('.stats-type-btn');
  const contentPanels = document.querySelectorAll('.stats-content-panel');
  const tasksPeriodSelector = document.getElementById('statsPeriodSelector');
  const goalsPeriodSelector = document.getElementById('goalsPeriodSelector');

  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;

      // 1. Переключить активную кнопку типа
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // 2. Переключить главную панель контента
      const targetType = btn.dataset.type; // 'tasks' или 'goals'
      contentPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });
      
      const targetPanel = document.getElementById(`panel-${targetType}`);
      if (targetPanel) {
        targetPanel.style.display = 'block';
        // Небольшой тайм-аут для CSS анимации
        setTimeout(() => targetPanel.classList.add('active'), 10);
      }

      // 3. Показать/скрыть селекторы периода
      if (targetType === 'tasks') {
        tasksPeriodSelector.style.display = 'grid';
        if (goalsPeriodSelector) goalsPeriodSelector.style.display = 'none';
      } else if (targetType === 'goals') {
        tasksPeriodSelector.style.display = 'none';
        if (goalsPeriodSelector) goalsPeriodSelector.style.display = 'grid';
      }

      // --- ИСПРАВЛЕНИЕ: Принудительно показать активный период ---
      // Иначе панель откроется, но внутри будет пусто (display:none у всех под-панелей)
      
      // Скрываем вообще все под-панели сначала
      document.querySelectorAll('.stats-period-panel').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });

      // Находим активную кнопку периода в ТЕКУЩЕМ селекторе
      const currentSelector = targetType === 'tasks' ? tasksPeriodSelector : goalsPeriodSelector;
      const activePeriodBtn = currentSelector.querySelector('.stats-period-btn.active');

      if (activePeriodBtn) {
        // У задач атрибут data-period, у целей data-goals-period
        const periodKey = activePeriodBtn.dataset.period || activePeriodBtn.dataset.goalsPeriod;
        
        // Собираем ID (например: tasks-week или goals-month)
        const subPanelId = `${targetType}-${periodKey}`;
        const subPanel = document.getElementById(subPanelId);
        
        if (subPanel) {
          subPanel.style.display = 'block';
          setTimeout(() => subPanel.classList.add('active'), 10);
        }
      }
      // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
    });
  });

  // Селектор периода для задач (Неделя / Месяц / Год / Все)
  const tasksPeriodButtons = document.querySelectorAll('.stats-period-btn:not([data-goals-period])');

  tasksPeriodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;
      if (!btn.dataset.period) return; 

      // Переключить активную кнопку периода задач
      tasksPeriodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Переключить панель периода задач
      const targetPeriod = btn.dataset.period;
      // Скрываем только панели задач
      const tasksPanels = document.querySelectorAll('[id^="tasks-"]');
      
      tasksPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      const targetPeriodPanel = document.getElementById(`tasks-${targetPeriod}`);
      if (targetPeriodPanel) {
        targetPeriodPanel.style.display = 'block';
        setTimeout(() => targetPeriodPanel.classList.add('active'), 10);
      }
    });
  });

  // Селектор периода для целей (Месяц / Год / Всё время)
  const goalsPeriodButtons = document.querySelectorAll('[data-goals-period]');
  
  goalsPeriodButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;

      // Переключить активную кнопку периода целей
      goalsPeriodButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Переключить панель периода целей
      const targetPeriod = btn.dataset.goalsPeriod;
      // Скрываем только панели целей
      const goalsPanels = document.querySelectorAll('[id^="goals-"]');
      
      goalsPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      const targetPeriodPanel = document.getElementById(`goals-${targetPeriod}`);
      if (targetPeriodPanel) {
        targetPeriodPanel.style.display = 'block';
        setTimeout(() => targetPeriodPanel.classList.add('active'), 10);
      }
    });
  });
}

/* --- ============================================ --- */
/* --- НОВАЯ ЛОГИКА ДЛЯ МОДАЛЬНОГО ОКНА (Вариант А) --- */
/* --- ============================================ --- */

// 1. Ссылки на DOM-элементы модалки
const modalOverlay = document.getElementById('taskModalOverlay');
const titleInput = document.getElementById('taskTitleInput');
const titleError = document.getElementById('titleError');
const dateChipsContainer = document.getElementById('dateChips');
const customDateChip = document.getElementById('customDateChip');
const durationChipsContainer = document.getElementById('durationChips');
const priorityChipsContainer = document.getElementById('priorityChips');
const categoryChipsContainer = document.getElementById('categoryChips');
const subtasksCounter = document.getElementById('subtasksCounter');
const subtasksEmpty = document.getElementById('subtasksEmpty');
const goalCategoryChipsContainer = document.getElementById('goalCategoryChips');

function getGoalCategoryTheme(category) {
  const color = getCategoryColor(category, '#ffd32a');
  return { color, glow: hexToRgba(color, 0.35) };
}
const durationPickerOverlay = document.getElementById('durationPickerOverlay');
const durationHoursInput = document.getElementById('durationHoursInput');
const durationMinutesInput = document.getElementById('durationMinutesInput');
const durationPickerClose = document.getElementById('durationPickerClose');
const taskSummary = document.getElementById('taskSummary');
const saveButton = document.getElementById('saveTaskButton');
const fabBtn = document.querySelector('.fab-button');
const calendarOverlay = document.getElementById('calendarOverlay');
const calendarGrid = document.getElementById('calendarGrid');
const calendarTitle = document.getElementById('calendarTitle');

function renderTaskCategoryChips() {
  const container = document.getElementById('categoryChips');
  if (!container) return;
  container.innerHTML = '';

  profileCategories.forEach((cat) => {
    const btn = document.createElement('button');
    // Используем класс cat-story как в описании
    btn.className = 'cat-story'; 
    btn.dataset.category = cat.id;
    
    // Генерируем цвет свечения (полупрозрачный)
    const glow = hexToRgba(cat.color, 0.35);
    
    // Передаем переменные в CSS, чтобы стили работали реактивно
    btn.style.setProperty('--cat-color', cat.color);
    btn.style.setProperty('--cat-glow', glow);
    
    // HTML структура
    btn.innerHTML = `
      <span class="cat-ring">
        <span class="cat-fill">${cat.icon}</span>
      </span>
      <span class="cat-name">${cat.name}</span>
    `;

    // Логика Active: проверяем taskState.category
    // Приводим к строке для надежного сравнения
    const currentCatId = taskState.category ? String(taskState.category) : null;
    const thisCatId = String(cat.id);
    
    if (currentCatId === thisCatId) {
      btn.classList.add('active');
    } else if (!currentCatId && cat.isDefault) {
      // Если категория еще не выбрана, активируем дефолтную визуально
      btn.classList.add('active');
      // И обновляем стейт, чтобы он не был пустым
      taskState.category = cat.id;
    }

    container.appendChild(btn);
  });

  // Применяем тему модалки (перекрашиваем кнопку "Создать")
  if (taskState.category) {
    applyTaskTheme(taskState.category);
  }
}

function renderGoalCategoryChips() {
  const container = document.getElementById('goalCategoryChips');
  if (!container) return;
  container.innerHTML = '';

  profileCategories.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'cat-story';
    btn.dataset.category = cat.id;
    
    const glow = hexToRgba(cat.color, 0.35);
    
    btn.style.setProperty('--cat-color', cat.color);
    btn.style.setProperty('--cat-glow', glow);
    
    btn.innerHTML = `
      <span class="cat-ring">
        <span class="cat-fill">${cat.icon}</span>
      </span>
      <span class="cat-name">${cat.name}</span>
    `;
    
    const currentCatId = goalState.category ? String(goalState.category) : null;
    const thisCatId = String(cat.id);

    if (currentCatId === thisCatId) {
      btn.classList.add('active');
    } else if (!currentCatId && cat.isDefault) {
      btn.classList.add('active');
      goalState.category = cat.id;
    }
    
    container.appendChild(btn);
  });
  
  // Применяем тему для модалки целей
  if (goalState.category) {
    applyGoalTheme(goalState.category);
  }
}

function renderFilterCategoryChips() {
  const filterContainer = document.getElementById('filterCategoryChips');
  if (!filterContainer) return;
  filterContainer.innerHTML = '';

  profileCategories.forEach((cat) => {
    const btn = document.createElement('button');
    
    // Используем специфичный класс для категорий, который у вас уже есть в CSS
    // Например: filter-chip, но добавляем ему стили динамически
    btn.className = 'filter-chip';
    btn.dataset.category = cat.id;
    btn.textContent = `${cat.icon} ${cat.name}`;
    
    // Стилизация для фильтров (более простая, чем в модалках создания)
    btn.style.borderColor = `${cat.color}50`; // 30% прозрачность границы
    btn.style.backgroundColor = `${cat.color}15`; // 10% прозрачность фона
    btn.style.color = cat.color; // Цвет текста
    
    // Обработчик клика
    btn.onclick = () => toggleCategoryFilter(String(cat.id));
    
    // Состояние Active
    if (activeFilters.categories.has(String(cat.id))) {
      btn.classList.add('active');
      // При активном состоянии усиливаем цвет (перебиваем инлайн стили CSS-классом или здесь)
      btn.style.backgroundColor = `${cat.color}25`;
      btn.style.boxShadow = `0 4px 12px ${cat.color}30`;
    }
    
    filterContainer.appendChild(btn);
  });
}

function setFabVisible(isVisible){
  if (!fabBtn) return;
  const forceHidden = document.body.classList.contains('goal-detail-open');
  fabBtn.classList.toggle('fab-hidden', !isVisible || forceHidden);
}

function clampDuration(value) {
  if (isNaN(value)) return null;
  return Math.min(Math.max(value, 5), 480);
}

function formatDurationLabel(totalMinutes) {
  if (!totalMinutes) return '';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours}ч ${minutes}м`;
  if (hours) return `${hours}ч`;
  return `${minutes}м`;
}

function setDurationInputs(totalMinutes = 30) {
  if (!durationHoursInput || !durationMinutesInput) return;
  const clamped = clampDuration(totalMinutes ?? 30) ?? 30;
  durationHoursInput.value = Math.floor(clamped / 60);
  durationMinutesInput.value = clamped % 60;
}

function syncDurationFromInputs() {
  if (!durationHoursInput || !durationMinutesInput) return;
  const hours = parseInt(durationHoursInput.value, 10) || 0;
  const minutes = parseInt(durationMinutesInput.value, 10) || 0;
  const total = clampDuration(hours * 60 + minutes);
  if (total === null) return;
  durationHoursInput.value = Math.floor(total / 60);
  durationMinutesInput.value = total % 60;
  applyDuration(total);
}

function openDurationPicker() {
  if (!durationPickerOverlay || !durationHoursInput || !durationMinutesInput) return;
  setDurationInputs(taskState.duration_min || 30);
  durationPickerOverlay.classList.add('active');
  durationHoursInput.focus();
  durationHoursInput.select();
}

function closeDurationPicker() {
  if (!durationPickerOverlay) return;
  durationPickerOverlay.classList.remove('active');
}

function applyDuration(value) {
  const clamped = clampDuration(value);
  if (clamped === null) return;
  taskState.duration_min = clamped;
  updateUI();
}



// 2. Единый объект состояния (state)
let taskState = {};
let isEditMode = false;
let editingTaskId = null;
let taskReturnAfterEdit = false; // флаг возврата в список задач
let taskReturnToFilter = null; // какой фильтр был открыт ('today' | 'tomorrow' | 'week' | 'all' | 'completed-7days')


// 3. Значения по умолчанию (п.4)
const defaultState = {
  title: "",
  date: null,
  dates: [],
  duration_min: null,
  priority: "low",
  category: getDefaultCategoryId(),
  subtasks: []
};

// 4. Хелперы
function getToday() {
  const d = new Date();
  return toISODate(d);
}

function getTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

function toISODate(dateObj) {
  if (!dateObj) return null;
  
  // Если это уже строка YYYY-MM-DD, возвращаем как есть
  if (typeof dateObj === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateObj)) return dateObj;
    // Если это ISO строка с временем, пробуем создать объект
    const parsed = new Date(dateObj);
    if (isNaN(parsed.getTime())) return null;
    dateObj = parsed;
  }
  
  // Важно: getFullYear/getMonth/getDate берут локальное время системы пользователя
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function normalizeDateList(dates) {
  const seen = new Set();
  const normalized = [];
  (dates || []).forEach((d) => {
    if (!d) return;
    // Используем наш безопасный toISODate
    const iso = toISODate(d instanceof Date ? d : new Date(d));
    if (iso && !seen.has(iso)) {
      seen.add(iso);
      normalized.push(iso);
    }
  });
  normalized.sort((a, b) => new Date(a) - new Date(b));
  return normalized;
}


function formatDate(dateStr) {
  const today = getToday();
  const tomorrow = getTomorrow();
  
  if (!dateStr) return '';
  if (dateStr === today) return 'Сегодня';
  if (dateStr === tomorrow) return 'Завтра';
  
  try {
    // ВАЖНОЕ ИСПРАВЛЕНИЕ:
    // new Date("2025-10-20") -> UTC Midnight -> Local Previous Day (если пояс -X)
    // new Date(2025, 9, 20) -> Local Midnight -> Local Same Day.
    
    // Разбиваем строку "YYYY-MM-DD" на компоненты
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Месяцы в JS с 0
      const day = parseInt(parts[2], 10);
      
      const localDate = new Date(year, month, day);
      
      return localDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short'
      });
    }
    
    // Fallback, если формат странный
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  } catch(e) {
    return dateStr;
  }
}

function setSelectedDates(dates) {
  const normalized = normalizeDateList(dates);
  taskState.dates = normalized;
  // Основная дата - первая в списке
  taskState.date = normalized[0] || null;
}
function getSelectedDates() {
  if (Array.isArray(taskState.dates)) return taskState.dates;
  if (taskState.date) return [taskState.date];
  return [];
}

function getPrimaryDate() {
  const selected = getSelectedDates();
  return selected.length ? selected[0] : null;
}

function formatDateDisplay(dateStr, withWeekday = false) {
  if (!dateStr) return '';
  try {
    const options = { day: 'numeric', month: 'short' };
    if (withWeekday) options.weekday = 'short';
    const withYear = new Date(dateStr).getFullYear() !== new Date().getFullYear();
    if (withYear) options.year = 'numeric';
    return new Date(dateStr).toLocaleDateString('ru-RU', options);
  } catch (e) {
    return dateStr;
  }
}

// Состояние кастомного календаря
let calendarVisibleDate = new Date();
let calendarSelectedDates = [];
let calendarMultiMode = false;
let calendarRangeMode = false;
let calendarRangeAnchor = null;
let calendarOnSelect = null;
let calendarOnClear = null;

function renderCalendar() {
  if (!calendarGrid || !calendarTitle) return;
  const month = calendarVisibleDate.getMonth();
  const year = calendarVisibleDate.getFullYear();

  calendarTitle.textContent = new Date(year, month).toLocaleDateString('ru-RU', {
    month: 'long', year: 'numeric'
  });

  const selectedSet = new Set(calendarSelectedDates);
  calendarGrid.innerHTML = '';
  const startDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayISO = toISODate(new Date());

  for (let i = 0; i < 42; i++) {
    const dayEl = document.createElement('button');
    dayEl.className = 'calendar-day';

    let dayNumber;
    let date;
    if (i < startDay) {
      dayNumber = daysInPrevMonth - startDay + i + 1;
      date = new Date(year, month - 1, dayNumber);
      dayEl.classList.add('outside');
    } else if (i >= startDay + daysInMonth) {
      dayNumber = i - startDay - daysInMonth + 1;
      date = new Date(year, month + 1, dayNumber);
      dayEl.classList.add('outside');
    } else {
      dayNumber = i - startDay + 1;
      date = new Date(year, month, dayNumber);
    }

    const dateISO = toISODate(date);
    dayEl.textContent = dayNumber;
    dayEl.dataset.date = dateISO;

    if (dateISO === todayISO) dayEl.classList.add('today');
    if (selectedSet.has(dateISO)) {
      dayEl.classList.add('selected');
    }

    calendarGrid.appendChild(dayEl);
  }
}

function openCalendar(initialDate, onSelect, onClear, options = {}) {
  const initialList = Array.isArray(initialDate)
    ? initialDate
    : (initialDate ? [initialDate] : []);
  
  calendarSelectedDates = normalizeDateList(initialList);
  const firstDate = calendarSelectedDates[0];
  calendarVisibleDate = firstDate ? new Date(firstDate) : new Date();
  calendarVisibleDate.setDate(1);
  
  // Логика режимов
  calendarMultiMode = !!(options.multi || (calendarSelectedDates.length > 1));
  calendarRangeMode = false;
  calendarRangeAnchor = null;
  
  calendarOnSelect = onSelect;
  calendarOnClear = onClear;

  if (calendarOverlay) {
    calendarOverlay.classList.add('active');
    
    // --- НОВОЕ: Проверка флага для скрытия кнопок ---
    if (options.disableMulti) {
      calendarOverlay.classList.add('single-mode');
    } else {
      calendarOverlay.classList.remove('single-mode');
    }
    // ------------------------------------------------
  }
  
  renderCalendar();
  updateCalendarFooterState();
}

function closeCalendar() {
  if (calendarOverlay) calendarOverlay.classList.remove('active');
  calendarOnSelect = null;
  calendarOnClear = null;
}

function updateCalendarFooterState() {
  const footer = calendarOverlay ? calendarOverlay.querySelector('.calendar-footer') : null;
  if (!footer) return;
  const multiBtn = footer.querySelector('[data-action="multi"]');
  const rangeBtn = footer.querySelector('[data-action="range"]');
  const saveBtn = footer.querySelector('[data-action="save"]');
  if (multiBtn) multiBtn.classList.toggle('active', calendarMultiMode && !calendarRangeMode);
  if (rangeBtn) rangeBtn.classList.toggle('active', calendarRangeMode);
  const disableSave = (calendarMultiMode || calendarRangeMode) && (calendarSelectedDates.length === 0 || !!calendarRangeAnchor);
  if (saveBtn) saveBtn.disabled = disableSave;
}

function buildDateRange(startISO, endISO) {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const list = [];
  if (isNaN(start) || isNaN(end)) return list;
  const step = start <= end ? 1 : -1;
  let cursor = new Date(start);
  while ((step === 1 && cursor <= end) || (step === -1 && cursor >= end)) {
    list.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + step);
  }
  return normalizeDateList(list);
}

// 5. Функция сброса/инициализации состояния
function resetTaskState() {
  taskState = { ...defaultState, subtasks: [] };
  taskState.category = getDefaultCategoryId();
  setSelectedDates([]);
  isEditMode = false;
  editingTaskId = null;
  
  // Сбрасываем флаги возврата только если НЕ редактируем задачу
  if (!isEditMode) {
    taskReturnAfterEdit = false;
    taskReturnToFilter = null;
  }

  const subtasksList = document.getElementById('subtasksList');
  if (subtasksList) subtasksList.innerHTML = '';
  if (subtasksEmpty) subtasksEmpty.style.display = 'block';
  if (subtasksCounter) subtasksCounter.textContent = '0 шагов';

  titleInput.classList.remove('invalid');
  titleError.style.display = 'none';
}

function applyTaskTheme(categoryId) {
  // Находим категорию по ID (или берем дефолтную)
  let cat = profileCategories.find(c => String(c.id) === String(categoryId));
  if (!cat) cat = profileCategories.find(c => c.isDefault) || profileCategories[0];
  
  if (!cat) return; // Защита если категорий вообще нет

  const modal = document.querySelector('.task-modal.flow-design');
  const iconPreview = document.getElementById('taskIconPreview');
  const saveBtn = document.getElementById('saveTaskButton');
  const glow = hexToRgba(cat.color, 0.35);

  if (modal) {
    // Меняем глобальные переменные внутри скоупа модалки
    modal.style.setProperty('--theme-color', cat.color);
    modal.style.setProperty('--theme-glow', glow);
  }

  if (saveBtn) {
    saveBtn.style.boxShadow = `0 8px 30px ${glow}`;
  }

  if (iconPreview) {
    // Анимация иконки (pop effect)
    iconPreview.classList.remove('pop');
    void iconPreview.offsetWidth; // Trigger reflow
    iconPreview.textContent = cat.icon;
    iconPreview.classList.add('pop');
    
    iconPreview.style.borderColor = cat.color;
    iconPreview.style.boxShadow = `0 0 30px ${glow}`;
    // Фон иконки чуть прозрачнее основного цвета
    iconPreview.style.background = hexToRgba(cat.color, 0.15);
  }
}

function autoGrowTaskTitle() {
  const area = document.getElementById('taskTitleInput');
  if (!area) return;
  area.style.height = 'auto';
  area.style.height = Math.min(area.scrollHeight, 160) + 'px';
}

// 6. Главная функция обновления UI (View)
function updateUI() {
  if (!modalOverlay.classList.contains('active')) return;

  const selectedDates = getSelectedDates();
  const primaryDate = getPrimaryDate();

  // --- Обновление заголовка ---
  titleInput.value = taskState.title;
  autoGrowTaskTitle();

  // --- Обновление кнопок ДАТЫ ---
  dateChipsContainer.querySelectorAll('.chip').forEach(chip => {
    if (chip.dataset.date === 'custom') return;
    const chipDate = chip.dataset.date === 'today' ? getToday() : getTomorrow();
    chip.classList.toggle('active', selectedDates.length === 1 && selectedDates[0] === chipDate);
  });

  if (customDateChip) {
    // Логика: активна, если выбраны даты И (это не одна дата, совпадающая с Сегодня или Завтра)
    const isCustom = selectedDates.length > 0 && !(selectedDates.length === 1 && [getToday(), getTomorrow()].includes(selectedDates[0]));
    
    // 1. Ставим класс active
    customDateChip.classList.toggle('active', isCustom);
    
    // 2. ВАЖНО: Убираем chip-outline если активно, чтобы стиль был как у стандартных кнопок
    customDateChip.classList.toggle('chip-outline', !isCustom);

    // 3. Меняем текст
    if (isCustom && selectedDates.length === 1) {
      customDateChip.textContent = formatDateDisplay(selectedDates[0]); 
    } else {
      customDateChip.textContent = 'Другая';
    }
  }

  // --- Обновление кнопок ДЛИТЕЛЬНОСТИ ---
  const presetDurations = Array.from(durationChipsContainer.querySelectorAll('.chip[data-duration]'))
    .map(chip => parseInt(chip.dataset.duration, 10));

  durationChipsContainer.querySelectorAll('.chip').forEach(chip => {
    // 1. Логика для фиксированных кнопок
    if (chip.dataset.duration) {
      const chipDuration = parseInt(chip.dataset.duration, 10);
      chip.classList.toggle('active', taskState.duration_min === chipDuration);
    } 
    // 2. Логика для кнопки "Выбрать" (Custom)
    else if (chip.id === 'durationCustomChip') {
      const isPreset = presetDurations.includes(taskState.duration_min);
      const isCustom = Boolean(taskState.duration_min) && !isPreset;
      
      // Ставим active
      chip.classList.toggle('active', isCustom);
      // Убираем outline, чтобы была заливка как у +15м
      chip.classList.toggle('chip-outline', !isCustom);

      if (isCustom) {
        chip.textContent = formatDurationLabel(taskState.duration_min);
      } else {
        chip.textContent = 'Выбрать';
      }
    }
  });

  // --- Обновление Приоритета и Категории ---
  priorityChipsContainer.querySelectorAll('.chip').forEach(chip => {
    chip.classList.toggle('active', taskState.priority === chip.dataset.priority);
  });

  categoryChipsContainer.querySelectorAll('.cat-story').forEach(chip => {
    chip.classList.toggle('active', taskState.category === chip.dataset.category);
  });

  applyTaskTheme(taskState.category || getDefaultCategoryId());

  // Валидация кнопки сохранения
  const isTitleValid = taskState.title.trim().length >= 2;
  saveButton.disabled = !isTitleValid;

  updateSummary();
}

// 7. Обновление сводки в футере (п.7)
function updateSummary() {
  const selectedDates = getSelectedDates();
  const parts = [];
  const sep = '<span class="sep">•</span>';

  if (selectedDates.length > 0) {
    if (selectedDates.length > 1) {
      parts.push(`<span class="val">Несколько дат (${selectedDates.length})</span>`);
    } else {
      const dateValue = selectedDates[0];
      let dateStr = 'Без дедлайна';
      if (dateValue === getToday()) {
        dateStr = 'Сегодня';
      } else if (dateValue === getTomorrow()) {
        dateStr = 'Завтра';
      } else {
        try {
          dateStr = new Date(dateValue).toLocaleDateString('ru-RU', {
            day: 'numeric', month: 'short', weekday: 'short'
          });
        } catch(e) { dateStr = dateValue; }
      }
      parts.push(`<span class="val">${dateStr}</span>`);
    }
  } else {
    parts.push('Без дедлайна');
  }

  if (taskState.duration_min) {
    parts.push(`<span class="val">${formatDurationLabel(taskState.duration_min)}</span>`);
  }

  const prioMap = {
    extreme: '🚨 Экстремальный',
    high: '🔴 Высокий',
    medium: '🟡 Средний',
    low: '🟢 Низкий'
  };
  const prioClass = `val val-prio-${taskState.priority}`;
  const prioLabel = prioMap[taskState.priority] || 'Приоритет';
  parts.push(`<span class="${prioClass}">${prioLabel}</span>`);

  const catText = getCategoryText(taskState.category || getDefaultCategoryId());
  parts.push(`<span class="val">#${catText}</span>`);
    
    // Добавить информацию о подзадачах
    if (taskState.subtasks && taskState.subtasks.length > 0) {
      const subtasksCount = taskState.subtasks.filter(st => st.title.trim().length > 0).length;
      if (subtasksCount > 0) {
        parts.push(`<span class="val">${subtasksCount} ${subtasksCount === 1 ? 'подзадача' : subtasksCount < 5 ? 'подзадачи' : 'подзадач'}</span>`);
      }
    }
    
    taskSummary.innerHTML = parts.join(sep);
}

// --- Функции для работы с подзадачами ---

function addSubtask() {
  const newSubtask = {
    id: Date.now() + Math.random(),
    title: "",
    completed: false
  };
  
  taskState.subtasks.push(newSubtask);
  renderSubtasks();
  updateSummary();

  // Автофокус на новое поле ввода
  setTimeout(() => {
    const inputs = document.querySelectorAll('#subtasksList .flow-sub-input');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) lastInput.focus();
  }, 50);
}

function removeSubtask(subtaskId) {
  taskState.subtasks = taskState.subtasks.filter(st => st.id !== subtaskId);
  renderSubtasks();
  updateSummary();
}

function updateSubtask(subtaskId, field, value) {
  const subtask = taskState.subtasks.find(st => st.id === subtaskId);
  if (subtask) {
    subtask[field] = value;
    updateSummary();
  }
}

function toggleSubtaskInEditor(subtaskId) {
  const subtask = taskState.subtasks.find(st => st.id === subtaskId);
  if (!subtask) return;
  
  // Переключить состояние
  subtask.completed = !subtask.completed;
  
  // Перерисовать подзадачи
  renderSubtasks();
  
  // Обновить сводку
  updateSummary();
  
  console.log(`${subtask.completed ? '✓' : '○'} Подзадача "${subtask.title}" ${subtask.completed ? 'выполнена' : 'возвращена в активные'}`);
}

function renderSubtasks() {
  const container = document.getElementById('subtasksList');
  const counterEl = document.getElementById('subtasksCounter');
  const emptyMsg = document.getElementById('subtasksEmpty');

  if (!container) return;

  if (!taskState.subtasks || taskState.subtasks.length === 0) {
    container.innerHTML = '';
    if (emptyMsg) emptyMsg.style.display = 'block';
    if (counterEl) counterEl.textContent = '0 шагов';
    return;
  }

  if (emptyMsg) emptyMsg.style.display = 'none';

  container.innerHTML = taskState.subtasks.map((subtask, index) => {
    const isCompleted = subtask.completed || false;
    return `
      <div class="task-item ${isCompleted ? 'completed' : ''}" data-subtask-id="${subtask.id}">
        <div class="task-dot"></div>
        <div class="task-card">
          <div class="flow-sub-index">${String(index + 1).padStart(2, '0')}</div>
          <input
            type="text"
            class="flow-sub-input ${isCompleted ? 'completed' : ''}"
            placeholder="Название подзадачи"
            value="${subtask.title}"
            oninput="updateSubtask(${subtask.id}, 'title', this.value)"
          />
          <div class="flow-sub-del" onclick="removeSubtask(${subtask.id})" title="Удалить подзадачу">✕</div>
        </div>
      </div>
    `;
  }).join('');

  if (counterEl) {
    const count = taskState.subtasks.length;
    const label = count === 1 ? 'шаг' : count < 5 ? 'шага' : 'шагов';
    counterEl.textContent = `${count} ${label}`;
  }
}

// 8. Открытие и закрытие модального окна
function openCreateChoiceModal() {
  document.getElementById('createChoiceOverlay').classList.add('active');
  document.body.classList.add('body-modal-open');
  if (typeof setFabVisible === 'function') setFabVisible(false);
}


// Обновленная функция закрытия
function closeCreateChoiceModal(e) {
  // Если функция вызвана событием (клик), проверяем цель
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('create-choice-close')) {
    // Если кликнули ВНУТРИ модалки (по белой/цветной части), ничего не делаем
    return;
  }

  const overlay = document.getElementById('createChoiceOverlay');
  overlay.classList.remove('active');
  document.body.classList.remove('body-modal-open');
  
  if (typeof setFabVisible === 'function') setFabVisible(true);
}


function chooseCreateTask() {
  closeCreateChoiceModal();
  setTimeout(() => {
    openTaskModal();
  }, 200);
}

function chooseCreateGoal() {
  closeCreateChoiceModal();
  setTimeout(() => {
    openGoalModal();
  }, 200);
}

function openTaskModal(taskId = null) {
  resetTaskState();
  
  if (taskId) {
    // Режим редактирования
    const task = tasksDB.find(t => t.id === taskId);
    if (!task) {
      console.error('Задача не найдена:', taskId);
      return;
    }
    
    isEditMode = true;
    editingTaskId = taskId;
    
    // 🔙 Запоминаем, что нужно вернуться в список после редактирования
    const listOverlay = document.getElementById('listModalOverlay');
    if (listOverlay.classList.contains('active') && currentTasksFilter) {
      taskReturnAfterEdit = true;
      taskReturnToFilter = currentTasksFilter;
    }
    
    // Заполнить состояние данными задачи
    taskState = {
      title: task.title || "",
      date: task.date || null,
      dates: Array.isArray(task.dates) ? [...task.dates] : (task.date ? [task.date] : []),
      duration_min: task.duration_min || null,
      priority: task.priority || "low",
      category: task.category || "other",
      // --- 🔥 ИСПРАВЛЕНИЕ: Добавляем перенос статуса выполнения ---
      completed: task.completed,       // Сохраняем true/false
      completedAt: task.completedAt,   // Сохраняем дату завершения
      // -----------------------------------------------------------
      subtasks: task.subtasks ? [...task.subtasks] : []
    };
    setSelectedDates(taskState.dates);
    // Обновить заголовок модалки
    document.getElementById('taskModalTitle').textContent = '✎ Редактировать задачу';

    // Обновить текст кнопки
    const saveBtn = document.getElementById('saveTaskButton');
    saveBtn.innerHTML = 'Сохранить <span>✨</span>';

    if (task.subtasks && task.subtasks.length > 0) {
      renderSubtasks();
    }
  } else {
    // Режим создания
    document.getElementById('taskModalTitle').textContent = '✨ Новая задача';
    document.getElementById('saveTaskButton').innerHTML = 'Добавить <span>✨</span>';
  }
  
  modalOverlay.classList.add('active');
  document.body.classList.add('body-modal-open');
  setFabVisible(false); 
  updateUI();
  setTimeout(() => { titleInput.focus(); }, 300);
}

  function closeTaskModal() {
    modalOverlay.classList.remove('active');
    document.body.classList.remove('body-modal-open');
    
    // 🔁 Если редактировали задачу из списка — возвращаемся в тот же список
    if (taskReturnAfterEdit && taskReturnToFilter) {
      const returnFilter = taskReturnToFilter;
      // Сбрасываем флажки, чтобы не зациклиться
      taskReturnAfterEdit = false;
      taskReturnToFilter = null;
      
      setTimeout(() => {
        showTasksList(returnFilter);
      }, 200);
    } else {
      setFabVisible(true);
    }
  }
  // Карта соответствия: Текст -> Число
  const PRIORITY_LEVELS = {
    low: 1,      // 🟢 Низкий
    medium: 2,   // 🟡 Средний
    high: 3,     // 🔴 Высокий
    extreme: 4   // 🚨 Экстремальный
  }

      
// Вспомогательная функция для подготовки данных перед отправкой в БД
function prepareTaskPayload(jsTask) {
  let finalCategoryId = null;
  
  if (jsTask.category) {
    // Пробуем найти категорию в профиле, чтобы получить её настоящий ID
    // (даже если в state записана строка, мы найдем объект и возьмем его ID)
    const catObj = profileCategories.find(c => String(c.id) === String(jsTask.category));
    
    if (catObj) {
        // Если ID числовой (из базы), парсим. Если это временная строка 'other', обрабатываем.
        const parsed = parseInt(catObj.id, 10);
        if (!isNaN(parsed)) {
            finalCategoryId = parsed;
        } else {
            // Если ID это строка (например "other" при оффлайн режиме), 
            // лучше отправить null или найти дефолтную категорию с числовым ID
            const def = profileCategories.find(c => c.isDefault && !isNaN(parseInt(c.id)));
            if (def) finalCategoryId = parseInt(def.id, 10);
        }
    }
  }
  
  // Фолбек: если категория не найдена, ищем дефолтную
  if (finalCategoryId === null) {
      const def = profileCategories.find(c => c.isDefault);
      if (def && !isNaN(parseInt(def.id))) finalCategoryId = parseInt(def.id, 10);
  }

  const PRIORITY_LEVELS = { low: 1, medium: 2, high: 3, extreme: 4 };
  const pText = jsTask.priority || 'low';

  return {
    user_id: CURRENT_USER_ID,
    title: jsTask.title,
    duration: jsTask.duration_min || null,
    priority: pText,
    priority_level: PRIORITY_LEVELS[pText] || 1,
    category_id: finalCategoryId,
    // Теперь jsTask.completed будет корректным (true для выполненных)
    completed: jsTask.completed === true, 
    // 🔥 Важно: если задача выполнена, сохраняем её дату завершения, иначе null
    completed_at: jsTask.completed ? (jsTask.completedAt || new Date().toISOString()) : null 
  };
}


// Обновленная функция сохранения
// Обновленная функция сохранения
async function saveTask() {
  const title = taskState.title.trim();
  
  if (title.length < 2) {
    titleInput.classList.add('invalid');
    titleError.style.display = 'block';
    return;
  }

  // 1. Проверка на редактирование СЕРИИ
  // Если мы редактируем и у задачи есть groupId, показываем Action Sheet
  if (isEditMode && editingTaskId) {
    const originalTask = tasksDB.find(t => t.id === editingTaskId);
    
    // Если это часть серии
    if (originalTask && originalTask.groupId) {
      openSeriesActionSheet('save', 
        () => executeTaskSave('single'), // Пользователь выбрал "Только эту"
        () => executeTaskSave('series')  // Пользователь выбрал "Всю серию"
      );
      return; // Прерываем стандартное сохранение
    }
  }

  // Если это не серия или создание новой - выполняем стандартное сохранение
  executeTaskSave('single');
}

// [tasks.js] Исправленная функция сохранения с разделением операций для предотвращения ошибки 400
async function executeTaskSave(mode = 'single') {
  const saveBtn = document.getElementById('saveTaskButton');
  const originalBtnText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Сохранение...';

  try {
    const title = taskState.title.trim();
    // Подготовка дат
    const datesRaw = (taskState.dates && taskState.dates.length) ? taskState.dates : (taskState.date ? [taskState.date] : []);
    const uniqueDates = [...new Set(datesRaw)];
    
    // Валидные подзадачи из формы (ШАБЛОН)
    const validSubtasks = (taskState.subtasks || []).filter(st => st.title.trim().length > 0);
    
    // Подготовка объекта задачи
    const taskPayload = prepareTaskPayload(taskState);

    // ===========================================
    // ЛОГИКА РЕДАКТИРОВАНИЯ (UPDATE)
    // ===========================================
    if (isEditMode && editingTaskId) {
      
      // --- ВАРИАНТ А: Обновляем ТОЛЬКО ЭТУ задачу ---
      if (mode === 'single') {
        taskPayload.date_for = uniqueDates[0] ? uniqueDates[0].split('T')[0] : null; 
    
        // 1. Обновляем саму задачу
        const { data: updatedTaskData, error: updateError } = await supabase
          .from('tasks')
          .update(taskPayload)
          .eq('id', editingTaskId)
          .select()
          .single();
    
        if (updateError) throw updateError;
        
        // 2. Обновляем подзадачи
        const freshSubtasks = await updateSubtasksForTask(editingTaskId, validSubtasks);
        
        // 3. Обновляем локальный кэш и UI
        updateLocalTaskInDB(updatedTaskData, freshSubtasks);
        updateDashboardCounters();
        updateFilterCounts();
    
        const listContent = document.getElementById('listModalContent');
        if (listContent) {
            const updatedLocalTask = tasksDB.find(t => t.id === editingTaskId);
            const currentFilter = getCurrentTasksFilterFromTitle(); 
            if (currentFilter && updatedLocalTask) {
                if (taskMatchesFilter(updatedLocalTask, currentFilter)) {
                    replaceTaskCardInDOM(updatedLocalTask);
                    // 🔥 ДОБАВИТЬ ЭТОТ БЛОК КОДА 🔥
                    // Если мы в списке выполненных, обновляем шапку дня
                    if (currentFilter === 'completed-7days') {
                      updateDayHeaderSummary(updatedLocalTask.id);
                  }
                } else {
                    removeTaskElementFromDOM(updatedLocalTask.id);
                }
            } else {
                 refreshOpenContextAfterTaskChange();
            }
        }
        showTaskNotification('✎ Сохранено', `"${title}" обновлена`);
      }
      
      // --- ВАРИАНТ Б: Обновляем ВСЮ СЕРИЮ (ИСПРАВЛЕНО) ---
      // --- ВАРИАНТ Б: Обновляем ВСЮ СЕРИЮ (С УЧЕТОМ СТАТУСА) ---
      // --- ВАРИАНТ Б: Обновляем ВСЮ СЕРИЮ (С УЧЕТОМ СТАТУСА) ---
      else if (mode === 'series') {
        const currentTask = tasksDB.find(t => t.id === editingTaskId);
        if (!currentTask || !currentTask.groupId) throw new Error("Group ID not found");

        // 1. Разделяем данные на "Общие" и "Только для активных"
        
        // А. Поля, которые меняются у ВСЕХ (Активные + Выполненные)
        const commonPayload = {
          title: taskPayload.title,
          category_id: taskPayload.category_id
        };

        // Б. Поля, которые меняются ТОЛЬКО у АКТИВНЫХ (Приоритет, Длительность)
        const activeOnlyPayload = {
          duration: taskPayload.duration,
          priority: taskPayload.priority,
          priority_level: taskPayload.priority_level
        };

        // 2. Выполняем запросы к БД
        
        // Шаг 1: Обновляем общие поля для всей группы
        const { error: commonError } = await supabase
          .from('tasks')
          .update(commonPayload)
          .eq('group_id', currentTask.groupId);

        if (commonError) throw commonError;

        // Шаг 2: Обновляем специфичные поля ТОЛЬКО для активных задач (completed = false)
        const { error: activeError } = await supabase
          .from('tasks')
          .update(activeOnlyPayload)
          .eq('group_id', currentTask.groupId)
          .eq('completed', false);

        if (activeError) throw activeError;

        // 3. Обновляем подзадачи ТЕКУЩЕЙ задачи
        await updateSubtasksForTask(editingTaskId, validSubtasks);

        // 4. УМНАЯ СИНХРОНИЗАЦИЯ ПОДЗАДАЧ ДЛЯ ОСТАЛЬНЫХ
        // Получаем ID и статус задач группы
        const { data: groupTasks, error: groupFetchError } = await supabase
           .from('tasks')
           .select('id, completed') 
           .eq('group_id', currentTask.groupId);
           
        if(groupFetchError) throw groupFetchError;

        // Фильтруем: исключаем текущую задачу И исключаем выполненные задачи
        const otherTaskIds = groupTasks
            .filter(t => t.id !== editingTaskId && t.completed === false)
            .map(t => t.id);

        if (otherTaskIds.length > 0) {
            // А. Получаем подзадачи только для активных задач
            const { data: existingGroupSubtasks, error: subFetchError } = await supabase
                .from('subtasks')
                .select('*')
                .in('task_id', otherTaskIds)
                .order('position');

            if (subFetchError) throw subFetchError;

            // Б. Разделяем операции
            const toUpdate = [];
            const toInsert = [];
            const idsToDelete = [];

            otherTaskIds.forEach(targetId => {
                const currentTargetSubtasks = existingGroupSubtasks.filter(s => s.task_id === targetId);
                
                validSubtasks.forEach((template, index) => {
                    const existing = currentTargetSubtasks[index];
                    if (existing) {
                        toUpdate.push({
                            id: existing.id,
                            task_id: targetId,
                            title: template.title,
                            completed: existing.completed, 
                            position: index
                        });
                    } else {
                        toInsert.push({
                            task_id: targetId,
                            title: template.title,
                            completed: false,
                            position: index
                        });
                    }
                });

                if (currentTargetSubtasks.length > validSubtasks.length) {
                    for (let i = validSubtasks.length; i < currentTargetSubtasks.length; i++) {
                        idsToDelete.push(currentTargetSubtasks[i].id);
                    }
                }
            });

            // В. Выполняем запросы
            if (idsToDelete.length > 0) await supabase.from('subtasks').delete().in('id', idsToDelete);
            if (toUpdate.length > 0) await supabase.from('subtasks').upsert(toUpdate);
            if (toInsert.length > 0) await supabase.from('subtasks').insert(toInsert);
        }

        // 5. Обновление локального кэша (UI)
        const { data: allFinalSubtasks } = await supabase
            .from('subtasks')
            .select('*')
            .in('task_id', groupTasks.map(t => t.id))
            .order('position');

        tasksDB.forEach(t => {
          if (t.groupId === currentTask.groupId) {
            // Общие поля меняем у всех
            t.title = commonPayload.title;
            t.category = String(commonPayload.category_id || getDefaultCategoryId());
            
            // Специфику меняем только у активных (или текущей)
            const isTargetActive = !t.completed;
            const isCurrentEdit = t.id === editingTaskId;

            if (isTargetActive || isCurrentEdit) {
                if (isTargetActive) {
                    t.duration_min = activeOnlyPayload.duration;
                    t.priority = activeOnlyPayload.priority;
                }

                const mySubtasks = allFinalSubtasks ? allFinalSubtasks.filter(st => st.task_id === t.id) : [];
                t.subtasks = mySubtasks.map(st => ({
                    id: st.id,
                    title: st.title,
                    completed: st.completed,
                    position: st.position
                }));
                t.totalSubtasks = t.subtasks.length;
                t.completedSubtasks = t.subtasks.filter(s => s.completed).length;
            }
          }
        });

        refreshOpenContextAfterTaskChange(); 
        // ВЕРНУЛИ КОРОТКОЕ УВЕДОМЛЕНИЕ С КОЛИЧЕСТВОМ
        showTaskNotification('🔄 Серия обновлена', `Обновлено задач: ${groupTasks.length}`);
      }
    } 
    // ===========================================
    // ЛОГИКА СОЗДАНИЯ (INSERT) - (Без изменений)
    // ===========================================
    else {
      let groupId = null;
      if (uniqueDates.length > 1) {
        const { data: groupData, error: groupError } = await supabase
          .from('task_groups')
          .insert([{ user_id: CURRENT_USER_ID, description: `Series: ${title}` }])
          .select().single();
        if (groupError) throw groupError;
        groupId = groupData.id;
      }

      const datesForTask = uniqueDates.length > 0 ? uniqueDates : [null];
      const createPromises = datesForTask.map(async (dateValue) => {
        const payload = { ...taskPayload };
        payload.date_for = dateValue ? dateValue.split('T')[0] : null;
        payload.created_at = new Date().toISOString();
        if (groupId) payload.group_id = groupId;

        const { data: insertedTask, error: insertError } = await supabase.from('tasks').insert([payload]).select().single();
        if (insertError) throw insertError;

        let insertedSubtasks = await insertSubtasksForTask(insertedTask.id, validSubtasks);
        return { task: insertedTask, subtasks: insertedSubtasks };
      });

      const results = await Promise.all(createPromises);

      results.forEach(({ task, subtasks }) => {
          const mapped = mapTaskFromDB(task);
          mapped.subtasks = subtasks.map(st => ({ id: st.id, title: st.title, completed: st.completed, position: st.position }));
          mapped.totalSubtasks = mapped.subtasks.length;
          mapped.completedSubtasks = 0;
          tasksDB.unshift(mapped);
      });

      refreshOpenContextAfterTaskChange(); 
      showTaskNotification('✨ Готово', `Добавлено задач: ${results.length}`);
    }

    updateDashboardCounters();
    updateFilterCounts();
    taskReturnAfterEdit = false; 
    taskReturnToFilter = null;
    closeTaskModal();

  } catch (error) {
    console.error('Ошибка сохранения:', error);
    if(typeof showToast === 'function') showToast('Ошибка: ' + error.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalBtnText;
    }
  }
}

// Вспомогательные функции для работы с подзадачами (чтобы не дублировать код)
async function insertSubtasksForTask(taskId, subtasks) {
  if (!subtasks || subtasks.length === 0) return [];
  
  const payload = subtasks.map((st, index) => ({
    task_id: taskId,
    title: st.title,
    completed: st.completed || false, 
    position: index
  }));
  
  const { data, error } = await supabase.from('subtasks').insert(payload).select();
  if (error) throw error;
  return data.sort((a,b) => a.position - b.position);
}
// --- ИСПРАВЛЕННАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ПОДЗАДАЧ (SMART SYNC) ---
async function updateSubtasksForTask(taskId, uiSubtasks) {
  // 1. Получаем текущие ID из базы для этой задачи
  const { data: dbSubtasks, error: fetchError } = await supabase
      .from('subtasks')
      .select('id')
      .eq('task_id', taskId);
  
  if (fetchError) throw fetchError;
  
  const dbIds = dbSubtasks.map(s => s.id); // Список реальных ID из базы

  // 2. Фильтруем данные из UI
  const validUiSubtasks = uiSubtasks.filter(st => st.title.trim().length > 0);
  
  // Собираем ID, которые остались в UI и существуют в БД
  const uiIds = validUiSubtasks
      .map(s => parseInt(s.id))
      .filter(id => !isNaN(id) && dbIds.includes(id));

  // 3. УДАЛЕНИЕ: Есть в БД, но нет в UI -> удаляем
  const idsToDelete = dbIds.filter(dbId => !uiIds.includes(dbId));
  if (idsToDelete.length > 0) {
      await supabase.from('subtasks').delete().in('id', idsToDelete);
  }

  // 4. ПОДГОТОВКА ДАННЫХ (Разделяем на обновление и вставку)
  const toUpsert = []; // Для существующих (обновит заголовок и статус)
  const toInsert = []; // Для новых

  validUiSubtasks.forEach((st, index) => {
      const id = parseInt(st.id);
      // Проверяем, является ли ID настоящим (существует в БД)
      const existsInDb = !isNaN(id) && dbIds.includes(id);

      const payload = {
          task_id: taskId,
          title: st.title,
          completed: st.completed || false, // ВАЖНО: сохраняем текущий статус
          position: index
      };

      if (existsInDb) {
          payload.id = id; 
          toUpsert.push(payload);
      } else {
          // Новая подзадача (ID создаст база)
          toInsert.push(payload); 
      }
  });

  // 5. Выполняем запросы
  if (toUpsert.length > 0) {
      const { error: upsertError } = await supabase.from('subtasks').upsert(toUpsert);
      if (upsertError) throw upsertError;
  }
  
  if (toInsert.length > 0) {
      const { error: insertError } = await supabase.from('subtasks').insert(toInsert);
      if (insertError) throw insertError;
  }

  // 6. ВОЗВРАЩАЕМ СВЕЖИЕ ДАННЫЕ
  // Это критично: возвращаем актуальные ID, чтобы локальный интерфейс обновился
  const { data: freshSubtasks } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position');
      
  return freshSubtasks || [];
}

function updateLocalTaskInDB(updatedTaskData, newSubtasksData) {
  const localIndex = tasksDB.findIndex(t => t.id === updatedTaskData.id);
  if (localIndex > -1) {
    const mappedTask = mapTaskFromDB(updatedTaskData);
    // Применяем подзадачи из памяти, так как mapTaskFromDB может не получить их из updatedTaskData
    if (newSubtasksData) {
        mappedTask.subtasks = newSubtasksData.map(st => ({
           id: st.id || Date.now(), 
           title: st.title, 
           completed: st.completed, 
           position: st.position
        }));
    }
    mappedTask.totalSubtasks = mappedTask.subtasks ? mappedTask.subtasks.length : 0;
    mappedTask.completedSubtasks = mappedTask.subtasks ? mappedTask.subtasks.filter(s => s.completed).length : 0;
    
    tasksDB[localIndex] = mappedTask;
  }
}


    // Отметить задачу как выполненную
    async function completeTask(taskId, event) {
      if (event) event.stopPropagation();
    
      try {
        const now = new Date().toISOString();
    
        // 1. Отправляем в Supabase
        const { error } = await supabase
            .from('tasks')
            .update({ completed: true, completed_at: now })
            .eq('id', taskId);
    
        if (error) throw error;
    
        // 2. Обновляем локально
        const task = tasksDB.find(t => t.id === taskId);
        if (task) {
            task.completed = true;
            if (typeof totalCompletedTasksCount !== 'undefined') {
              totalCompletedTasksCount++; 
          }
            task.completedAt = now;
        }

       
    
        updateDashboardCounters();
        
        // Анимация (как была у тебя)
        const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
        if (taskElement) {
            taskElement.classList.add('completing');
            setTimeout(() => {
                 taskElement.remove();
                 // Если список пуст - показать Empty State (тут можно вызвать твою логику проверки)
            }, 500);
        }
        showTaskNotification('✅ Задача выполнена!', `"${task?.title}" завершена`);
    
      } catch (e) {
        console.error('Ошибка завершения:', e);
      }
    }
    /* --- Исправленная функция uncompleteTask (вставь в tasks.js вместо дублей) --- */
/* --- Обновленная функция uncompleteTask (tasks.js) --- */
async function uncompleteTask(taskId, event) {
  if (event) event.stopPropagation();
  
  // 1. Оптимистичное обновление данных в памяти
  const task = tasksDB.find(t => t.id === taskId);
  if (task) {
    task.completed = false;
    if (typeof totalCompletedTasksCount !== 'undefined') {
      totalCompletedTasksCount = Math.max(0, totalCompletedTasksCount - 1);
  }
    task.completedAt = null;
  }
  
  // Обновляем счетчики (в шапке, в фильтрах и т.д.)
  updateDashboardCounters();
  updateFilterCounts();
  
  // 2. Анимация удаления из DOM (без полной перерисовки)
  const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  
  if (taskElement) {
    // Настраиваем анимацию "улетания" вправо (как будто возвращаем)
    taskElement.style.transition = 'all 0.4s ease';
    taskElement.style.opacity = '0';
    taskElement.style.transform = 'translateX(100%)';
    taskElement.style.height = '0';
    taskElement.style.margin = '0'; // Убираем отступы, чтобы схлопнулось плавно
    taskElement.style.overflow = 'hidden';

    // Ждем окончания анимации перед удалением
    setTimeout(() => {
        // А. Удаляем саму задачу
        taskElement.remove();

        // Б. Чистка пустых заголовков дат (специфично для списка выполненных)
        // Ищем все группы дней и удаляем те, в которых не осталось задач
        document.querySelectorAll('.day-group').forEach(group => {
            const remainingTasks = group.querySelectorAll('.task-item');
            if (remainingTasks.length === 0) {
                // Если задач нет, плавно скрываем и удаляем заголовок даты
                group.style.transition = 'opacity 0.3s ease';
                group.style.opacity = '0';
                setTimeout(() => group.remove(), 300);
            }
        });

        // В. Проверка на полностью пустой список (показать Empty State)
        if (typeof checkEmptyState === 'function') checkEmptyState();

    }, 400); // 400ms совпадает с transition в CSS/JS
  }

  showTaskNotification('↶ Возвращено', 'Задача снова активна');

  try {
      // 3. Отправка в Supabase (в фоне)
      const { error } = await supabase
        .from('tasks')
        .update({ completed: false, completed_at: null })
        .eq('id', taskId);
      
      if(error) throw error;
      
      // ВАЖНО: Мы УБРАЛИ вызов refreshOpenContextAfterTaskChange(),
      // который вызывал полную перерисовку и рывок.
      
  } catch(e) {
      console.error('Ошибка при возврате задачи:', e);
      showTaskNotification('Ошибка', 'Не удалось сохранить статус');
      
      // Если ошибка - откатываем изменения UI (перерисовываем список полностью)
      if (task) {
          task.completed = true; // Возвращаем как было
          updateDashboardCounters();
          refreshOpenContextAfterTaskChange();
      }
  }
}

// Редактировать задачу (заглушка)
function editTask(taskId, event) {
  if (event) {
    event.stopPropagation();
  }
  
  const task = tasksDB.find(t => t.id === taskId);
  if (!task) return;
  
  console.log('✎ Редактирование задачи:', task);
  
  // 🔙 НЕ закрываем список задач — openTaskModal запомнит контекст
  // Просто открываем модалку редактирования
  openTaskModal(taskId);
}

// Удалить задачу (Оптимистичное удаление с возможностью отмены)
async function deleteTask(taskId, event) {
  if (event) event.stopPropagation();
  
  const taskToDelete = tasksDB.find(t => t.id === taskId);
  if (!taskToDelete) return;

  // 1. Проверка на СЕРИЮ
  if (taskToDelete.groupId) {
    openSeriesActionSheet('delete', 
      () => executeDelete('single', taskToDelete),
      () => executeDelete('series', taskToDelete)
    );
    return;
  }

  // Обычное удаление
  executeDelete('single', taskToDelete);
}

async function executeDelete(mode, task) {
  const taskId = task.id;
  const groupId = task.groupId;
  
  const taskIndex = tasksDB.findIndex(t => t.id === taskId);
  
  if (mode === 'single') {
    // === УДАЛЕНИЕ ОДНОЙ ЗАДАЧИ ===
    lastDeletedData = {
      type: 'task',
      item: { ...task }, 
      subtasks: task.subtasks ? JSON.parse(JSON.stringify(task.subtasks)) : [],
      index: taskIndex
    };

    // 1. Оптимистичное удаление UI
    tasksDB.splice(taskIndex, 1);

    // 👇 КОРРЕКЦИЯ СЧЕТЧИКА ВЫПОЛНЕННЫХ
    if (task.completed && typeof totalCompletedTasksCount !== 'undefined') {
        totalCompletedTasksCount = Math.max(0, totalCompletedTasksCount - 1);
    }

    updateDashboardCounters(); // Обновит карточки на главной
    updateFilterCounts(); 
    removeTaskElementFromDOM(taskId);
    
    showToast('🗑 Задача удалена', true);

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    } catch (e) {
      console.error(e);
      // Если ошибка - возвращаем задачу и счетчик
      tasksDB.splice(taskIndex, 0, lastDeletedData.item);
      if (task.completed) totalCompletedTasksCount++; // Возвращаем счетчик
      updateDashboardCounters();
      refreshOpenContextAfterTaskChange();
    }

  } else if (mode === 'series') {
    // === УДАЛЕНИЕ ВСЕЙ СЕРИИ ===
    
    const tasksToRemove = tasksDB.filter(t => t.groupId === groupId);
    const tasksBackup = JSON.parse(JSON.stringify(tasksToRemove));
    
    lastDeletedData = {
        type: 'task-series',
        tasks: tasksBackup, 
        groupId: groupId
    };

    // 1. Удаляем из памяти
    tasksDB = tasksDB.filter(t => t.groupId !== groupId);
    
    // 👇 КОРРЕКЦИЯ СЧЕТЧИКА ДЛЯ СЕРИИ
    // Считаем, сколько выполненных задач было в удаляемой серии (из тех, что были в памяти)
    const completedInSeries = tasksToRemove.filter(t => t.completed).length;
    if (completedInSeries > 0 && typeof totalCompletedTasksCount !== 'undefined') {
        totalCompletedTasksCount = Math.max(0, totalCompletedTasksCount - completedInSeries);
    }
    
    updateDashboardCounters();
    if (document.getElementById('filtersPanel').classList.contains('active')) {
        updateFilterCounts();
    }
    
    // Удаляем из DOM
    tasksToRemove.forEach(t => {
        removeTaskElementFromDOM(t.id);
    });
    
    showToast(`🗑 Серия удалена (${tasksToRemove.length} шт.)`, true);

    try {
      const { error: tasksDelError } = await supabase.from('tasks').delete().eq('group_id', groupId);
      if (tasksDelError) throw tasksDelError;
      
      const { error: groupDelError } = await supabase.from('task_groups').delete().eq('id', groupId);
      if (groupDelError) throw groupDelError;
      
      console.log(`✅ Серия ${groupId} удалена`);

    } catch (e) {
      console.error('Ошибка удаления серии:', e);
      showToast('Ошибка при удалении серии', false);
      
      // Откат
      tasksBackup.forEach(t => tasksDB.push(t));
      // Возвращаем счетчик приблизительно (на основе бэкапа)
      const completedRestored = tasksBackup.filter(t => t.completed).length;
      totalCompletedTasksCount += completedRestored;
      
      tasksDB.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
      updateDashboardCounters();
      refreshOpenContextAfterTaskChange();
    }
  }
}
// Улучшенная функция удаления элемента
function removeTaskElementFromDOM(taskId) {
  const el = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  if (el) {
    // Добавляем класс для анимации исчезновения (в CSS должен быть transition)
    el.style.transition = 'all 0.3s ease';
    el.style.opacity = '0';
    el.style.height = '0';
    el.style.margin = '0';
    el.style.overflow = 'hidden';
    
    setTimeout(() => {
        el.remove();
        // Проверка на пустой список после удаления
        checkEmptyState(); 
    }, 300);
  }
}

// Хелпер для проверки пустого списка (добавить в tasks.js)
function checkEmptyState() {
  const listContent = document.getElementById('listModalContent');
  const items = listContent.querySelectorAll('.task-item');
  if (items.length === 0 && listContent) {
      // Можно вызвать обычный рендер, чтобы показать Empty State картинку
      // Это не страшно, так как список и так пуст
      const filter = currentTasksFilter || 'all';
      const tasks = getTasksFromCache(filter);
      if (tasks.length === 0) renderFilteredTasks([]); 
  }
}



// Переключить подзадачу внутри карточки задачи (в списке задач)
function toggleSubtaskInTaskCard(taskId, subtaskId, event) {
// Эта функция теперь перенаправляет в новую логику попапа
  toggleSubtaskInManagePopup(taskId, subtaskId, event);
}

// Показать модалку с подзадачами
function showTaskSubtasksPopup(taskId, event) {
  if (event) {
    event.stopPropagation();
  }
  
  const task = tasksDB.find(t => t.id === taskId);
  if (!task || !task.subtasks || task.subtasks.length === 0) return;
  
  const overlay = document.getElementById('subtasksPopupOverlay');
  const title = document.getElementById('subtasksPopupTitle');
  const content = document.getElementById('subtasksPopupContent');
  
  title.textContent = `Подзадачи: ${task.title}`;
  
  content.innerHTML = task.subtasks.map((subtask, index) => {
    const isCompleted = subtask.completed || false;
    return `
      <div class="subtask-popup-item ${isCompleted ? 'completed' : ''}" style="animation-delay: ${index * 0.05}s">
        <div class="subtask-popup-checkbox ${isCompleted ? 'checked' : ''}" 
             onclick="toggleSubtaskInPopup(${task.id}, ${subtask.id}, event)"
             title="${isCompleted ? 'Отметить как невыполненную' : 'Отметить как выполненную'}">
          ${isCompleted ? '✓' : '○'}
        </div>
        <div class="subtask-popup-content-wrapper" onclick="toggleSubtaskInPopup(${task.id}, ${subtask.id}, event)">
          <div class="subtask-popup-title">${subtask.title}</div>
        </div>
        <div class="subtask-popup-delete" 
             onclick="deleteSubtaskFromPopup(${task.id}, ${subtask.id}, event)"
             title="Удалить подзадачу">✕</div>
      </div>
    `;
  }).join('');
  
  overlay.classList.add('active');
  document.body.classList.add('body-modal-open');
  setFabVisible(false);
}
  // 1. Переключение чекбокса в попапе
  async function toggleSubtaskInPopup(taskId, subtaskId, event) {
    if (event) event.stopPropagation();
    
    const task = tasksDB.find(t => t.id === taskId);
    if (!task) return;
    const subtask = task.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return;
    
    const newStatus = !subtask.completed;

    try {
      // A. Обновляем в Supabase
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: newStatus })
        .eq('id', subtaskId);

      if (error) throw error;

      // B. Обновляем локально (для UI)
      subtask.completed = newStatus;
      task.completedSubtasks = task.subtasks.filter(st => st.completed).length;

      // С. Обновляем UI
      showTaskSubtasksPopup(taskId); 
      rerenderTasksListIfOpen();
      updateDashboardCounters(); // Обновит цифры на главной

    } catch (e) {
      console.error('Ошибка обновления подзадачи:', e);
      showTaskNotification('Ошибка', 'Не удалось обновить статус');
    }
  }
  // Удалить подзадачу из popup
  async function deleteSubtaskFromPopup(taskId, subtaskId, event) {
    if (event) event.stopPropagation();
    
  
    try {
      // A. Удаляем из Supabase
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);
  
      if (error) throw error;
  
      // B. Удаляем локально
      const task = tasksDB.find(t => t.id === taskId);
      if (task) {
          task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
          task.totalSubtasks = task.subtasks.length;
          task.completedSubtasks = task.subtasks.filter(st => st.completed).length;
      }
  
      // C. Обновляем UI
      if (task && task.subtasks.length === 0) {
          closeSubtasksPopup();
      } else {
          showTaskSubtasksPopup(taskId);
      }
      rerenderTasksListIfOpen();
      updateDashboardCounters();
      
      // Используем красивое уведомление
      showTaskNotification('🗑 Удалено', 'Подзадача удалена');
  
    } catch (e) {
      console.error('Ошибка удаления подзадачи:', e);
      showTaskNotification('Ошибка', 'Не удалось удалить');
    }
  }
    
    // Переключить подзадачу в попапе управления
    // [tasks.js] Оптимизация переключения в попапе управления
async function toggleSubtaskInManagePopup(taskId, subtaskId, event) {
  if (event) event.stopPropagation();
  
  const task = tasksDB.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  
  const subtask = task.subtasks.find(st => st.id === subtaskId);
  if (!subtask) return;
  
  const oldStatus = subtask.completed;
  const newStatus = !subtask.completed;

  // 1. Обновляем память
  subtask.completed = newStatus;
  task.completedSubtasks = task.subtasks.filter(st => st.completed).length;
  
  // 2. Обновляем UI самого попапа (перерисовка только попапа — это быстро)
  if (typeof showTaskSubtasksManagePopup === 'function') {
      showTaskSubtasksManagePopup(taskId, null);
  } else {
      showTaskSubtasksPopup(taskId, null); 
  }

  // 3. Обновляем счетчики на главной
  updateDashboardCounters();
  
  // 4. Обновляем карточку задачи в списке НА ФОНЕ (без полной перерисовки)
  updateTaskBadgesInDOM(taskId);

  // ВАЖНО: УБРАЛИ refreshOpenContextAfterTaskChange()
  
  try {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: newStatus })
        .eq('id', subtaskId);

      if (error) throw error;
      
  } catch (e) {
      console.error('Ошибка сохранения подзадачи:', e);
      // Откат
      subtask.completed = oldStatus;
      task.completedSubtasks = task.subtasks.filter(st => st.completed).length;
      updateTaskBadgesInDOM(taskId);
      showToast('Не удалось обновить статус');
  }
}
// Удалить подзадачу из попапа управления
function deleteSubtaskFromManagePopup(taskId, subtaskId, event) {
  if (event) {
    event.stopPropagation();
  }
  
  const task = tasksDB.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  
  const subtask = task.subtasks.find(st => st.id === subtaskId);
  if (!subtask) return;
  
  
  // Проверить, была ли подзадача выполнена
  const wasCompleted = subtask.completed;
  
  // Удалить подзадачу из массива
  task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
  
  // Обновить общее количество подзадач
  task.totalSubtasks = task.subtasks.length;
  
  // Пересчитать количество выполненных подзадач
  if (wasCompleted) {
    task.completedSubtasks = Math.max(0, task.completedSubtasks - 1);
  } else {
    // Если удаляем невыполненную подзадачу, completedSubtasks остаётся без изменений
    task.completedSubtasks = task.subtasks.filter(st => st.completed).length;
  }
  
  // Если больше нет подзадач, сбросить счётчики
  if (task.totalSubtasks === 0) {
    task.completedSubtasks = 0;
  }
  
  updateDashboardCounters();
  
  // Если подзадач не осталось, закрыть попап
  if (task.subtasks.length === 0) {
    closeSubtasksPopup();
    showTaskNotification('🗑 Все подзадачи удалены', `Задача "${task.title}" теперь без подзадач`);
  } else {
    // Перерисовать попап с оставшимися подзадачами
    showTaskSubtasksManagePopup(taskId, null);
  }
  
  // Обновить список задач в фоне, если он открыт
  refreshOpenContextAfterTaskChange();
  
  console.log(`🗑 Подзадача "${subtask.title}" удалена из задачи "${task.title}"`);
  showTaskNotification('🗑 Подзадача удалена', `"${subtask.title}" удалена`);
}

// Закрыть модалку подзадач
function closeSubtasksPopup() {
  const overlay = document.getElementById('subtasksPopupOverlay');
  overlay.classList.remove('active');
  document.body.classList.remove('body-modal-open');
  syncFabWithGoalsListState();
}
// --- ФУНКЦИИ ДЛЯ АККОРДЕОНА ПОДЗАДАЧ В СПИСКЕ ---

function toggleTaskAccordion(taskId, event) {
  // Игнорировать клики по кнопкам действий
  if (
    event.target.closest('.task-item-actions') ||
    event.target.closest('.task-subtasks-accordion') ||
    event.target.classList.contains('task-badge') ||
    event.target.closest('.edit-btn-internal') ||
    event.target.closest('.action-bg') ||
    event.target.closest('.action-icon')
  ) {
    return;
  }
  
  const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  const accordion = document.getElementById(`accordion-${taskId}`);
  
  if (!taskElement || !accordion) return;
  
  // Закрыть все другие аккордеоны
  document.querySelectorAll('.task-subtasks-accordion.active').forEach(acc => {
    if (acc.id !== `accordion-${taskId}`) {
      acc.classList.remove('active');
      const parentTask = acc.closest('.task-item');
      if (parentTask) parentTask.classList.remove('accordion-open');
    }
  });
  
  // Переключить текущий аккордеон
  const isOpen = accordion.classList.toggle('active');
  taskElement.classList.toggle('accordion-open', isOpen);
  
  console.log(`${isOpen ? '▼' : '▶'} Аккордеон задачи ${taskId} ${isOpen ? 'открыт' : 'закрыт'}`);
}

// [tasks.js] Оптимизированное переключение подзадачи внутри списка
async function toggleSubtaskInline(taskId, subtaskId, event) {
  if (event) event.stopPropagation();
  
  const task = tasksDB.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  
  const subtask = task.subtasks.find(st => st.id === subtaskId);
  if (!subtask) return;
  
  // 1. Оптимистичное обновление данных
  const newStatus = !subtask.completed;
  subtask.completed = newStatus;
  
  // Пересчет счетчиков в памяти
  task.completedSubtasks = task.subtasks.filter(st => st.completed).length;

  // 2. Оптимистичное обновление UI (ТОЧЕЧНОЕ)
  
  // А. Ищем элемент подзадачи и меняем класс
  const subtaskEl = document.querySelector(`.sub-item[data-subtask-id="${subtaskId}"]`);
  if (subtaskEl) {
    if (newStatus) subtaskEl.classList.add('completed');
    else subtaskEl.classList.remove('completed');
  }

  // Б. Обновляем бейдж "1/3" в шапке задачи
  updateTaskBadgesInDOM(taskId);

  // В. Обновляем общие счетчики на главной
  updateDashboardCounters();
  
  // ВАЖНО: УБРАЛИ rerenderTasksListIfOpen() — теперь список не мигает
  
  const action = subtask.completed ? 'выполнена' : 'возвращена в активные';
  console.log(`${subtask.completed ? '✓' : '○'} Подзадача "${subtask.title}" ${action}`);

  // 3. Отправка в БД
  try {
      const { error } = await supabase
        .from('subtasks')
        .update({ completed: newStatus })
        .eq('id', subtaskId);

      if (error) throw error;
  } catch (e) {
      console.error('Ошибка сохранения подзадачи:', e);
      // Откат изменений UI
      subtask.completed = !newStatus;
      if (subtaskEl) subtaskEl.classList.toggle('completed', !newStatus);
      updateTaskBadgesInDOM(taskId);
      showToast('Ошибка синхронизации');
  }
}
// Функция инлайн-редактирования подзадачи с сохранением в БД
function editSubtaskInline(taskId, subtaskId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault(); // Предотвращаем клик по родительскому элементу (аккордеону/галочке)
  }
  
  // 1. Находим данные в локальном кэше
  const task = tasksDB.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  
  const subtask = task.subtasks.find(st => st.id === subtaskId);
  if (!subtask) return;
  
  // 2. Находим DOM-элементы
  // Ищем конкретный элемент подзадачи в списке
  const subtaskElement = document.querySelector(`.sub-item[data-subtask-id="${subtaskId}"]`);
  if (!subtaskElement) return;
  
  const textElement = subtaskElement.querySelector('.sub-text');
  if (!textElement) return;
  
  // Сохраняем оригинальный текст на случай отмены
  const originalText = subtask.title;
  
  // 3. Скрываем текст и создаем инпут
  textElement.style.display = 'none';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = originalText;
  input.className = 'inline-edit-input';
  
  // Применяем стили, чтобы инпут выглядел красиво внутри списка
  input.style.cssText = `
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid #4ecdc4;
    border-radius: 4px;
    color: #fff;
    font-size: 14px;
    padding: 2px 6px;
    outline: none;
    box-shadow: 0 0 5px rgba(78, 205, 196, 0.3);
  `;
  
  // Вставляем инпут вместо текста
  textElement.parentNode.insertBefore(input, textElement);
  input.focus();
  
  // Флаг для предотвращения двойного сохранения (Enter + Blur)
  let isSaving = false;

  // 4. Функция сохранения
  const save = async () => {
    if (isSaving) return; // Защита от двойного вызова
    isSaving = true;

    const newTitle = input.value.trim();
    
    // Если пусто или текст не менялся — просто возвращаем как было
    if (!newTitle || newTitle === originalText) {
      textElement.style.display = '';
      input.remove();
      return;
    }

    // A. Оптимистичное обновление UI (сразу показываем новый текст)
    subtask.title = newTitle;
    textElement.textContent = newTitle;
    textElement.style.display = '';
    input.remove();
    
    // B. Отправка в Supabase
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({ title: newTitle })
        .eq('id', subtaskId);

      if (error) throw error;
      
      console.log('✅ Подзадача переименована');
      // showToast('Изменено', false); // Опционально, чтобы не спамить тостами

    } catch (e) {
      console.error('Ошибка сохранения подзадачи:', e);
      showToast('Ошибка сохранения');
      
      // Откат изменений при ошибке
      subtask.title = originalText;
      textElement.textContent = originalText;
    }
  };

  // 5. Обработчики событий
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      save();
    } else if (e.key === 'Escape') {
      // Отмена
      isSaving = true; // Блокируем save на blur
      textElement.style.display = '';
      input.remove();
    }
  });

  // Сохраняем при потере фокуса (кликнули в другое место)
  input.addEventListener('blur', () => {
    save();
  });
}
// [tasks.js] Оптимизированное удаление подзадачи из списка
async function deleteSubtaskInline(taskId, subtaskId, event) {
  if (event) event.stopPropagation();
  
  const task = tasksDB.find(t => t.id === taskId);
  if (!task || !task.subtasks) return;
  
  const subtask = task.subtasks.find(st => st.id === subtaskId);
  if (!subtask) return;
  
  const wasCompleted = subtask.completed;

  // 1. UI: Находим элемент
  const subtaskEl = document.querySelector(`.sub-item[data-subtask-id="${subtaskId}"]`);

  try {
    // 2. БД: Удаляем
    const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

    if (error) throw error;

    // 3. Память: Обновляем данные
    task.subtasks = task.subtasks.filter(st => st.id !== subtaskId);
    task.totalSubtasks = task.subtasks.length;
    if (wasCompleted) {
      task.completedSubtasks = Math.max(0, task.completedSubtasks - 1);
    } else {
      task.completedSubtasks = task.subtasks.filter(st => st.completed).length;
    }

    // 4. UI: Анимация удаления
    if (subtaskEl) {
        subtaskEl.style.transition = 'all 0.3s ease';
        subtaskEl.style.height = '0px';
        subtaskEl.style.opacity = '0';
        subtaskEl.style.padding = '0';
        subtaskEl.style.margin = '0';
        setTimeout(() => subtaskEl.remove(), 300);
    }

    // 5. UI: Обновляем счетчики
    updateTaskBadgesInDOM(taskId);
    updateDashboardCounters();
    
    // ВАЖНО: УБРАЛИ rerenderTasksListIfOpen()
    
    showTaskNotification('🗑 Подзадача удалена', `"${subtask.title}" удалена`);

  } catch (e) {
    console.error('Ошибка удаления подзадачи:', e);
    if(typeof showToast === 'function') showToast('Ошибка при удалении');
  }
}
// Показать уведомление о действии с задачей
function showTaskNotification(title, message) {
  // Создаем элемент уведомления
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: linear-gradient(135deg, rgba(30,41,54,.95) 0%, rgba(15,20,25,.98) 100%);
    border: 1.5px solid rgba(78,205,196,.4);
    border-radius: 16px;
    padding: 16px 24px;
    box-shadow: 0 12px 40px rgba(0,0,0,.6), 0 0 0 1px rgba(78,205,196,.2) inset;
    backdrop-filter: blur(12px);
    z-index: 9999;
    opacity: 0;
    transition: all .4s cubic-bezier(0.34, 1.56, 0.64, 1);
    max-width: 320px;
  `;
  
  notification.innerHTML = `
    <div style="font-size: 15px; font-weight: 700; color: #4ecdc4; margin-bottom: 4px;">
      ${title}
    </div>
    <div style="font-size: 13px; color: rgba(255,255,255,.8);">
      ${message}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Анимация появления
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(-50%) translateY(0)';
  }, 10);
  
  // Удаление через 1.5 секунды
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => {
      notification.remove();
    }, 400);
  }, 1500);
}


/* --- ============================================ --- */
/* --- НОВАЯ ЛОГИКА: СЕРВЕРНАЯ СТАТИСТИКА ЗАДАЧ --- */
/* --- ============================================ --- */

// Хелпер: Запрос статистики с сервера (параллельно 3 запроса)
async function fetchServerStats(start, end) {
  try {
    const [kpiResp, dailyResp, catResp] = await Promise.all([
      supabase.rpc('get_tasks_stats_period', {
        target_user_id: CURRENT_USER_ID,
        start_iso: start.toISOString(),
        end_iso: end.toISOString()
      }),
      supabase.rpc('get_daily_activity_stats', {
        target_user_id: CURRENT_USER_ID,
        start_iso: start.toISOString(),
        end_iso: end.toISOString()
      }),
      supabase.rpc('get_categories_stats_period', {
        target_user_id: CURRENT_USER_ID,
        start_iso: start.toISOString(),
        end_iso: end.toISOString()
      })
    ]);

    if (kpiResp.error) throw kpiResp.error;
    if (dailyResp.error) throw dailyResp.error;
    if (catResp.error) throw catResp.error;

    return {
      kpi: kpiResp.data || { count: 0, duration: 0, subtasks: 0 },
      daily: dailyResp.data || [],
      categories: catResp.data || []
    };
  } catch (e) {
    console.error('Ошибка загрузки статистики:', e);
    return null;
  }
}

// Хелпер: Только KPI (для сравнения с прошлым периодом)
async function fetchServerKPIOnly(start, end) {
  const { data, error } = await supabase.rpc('get_tasks_stats_period', {
    target_user_id: CURRENT_USER_ID,
    start_iso: start.toISOString(),
    end_iso: end.toISOString()
  });
  return error ? { count: 0, duration: 0, subtasks: 0 } : data;
}

// Инициализация при открытии статистики
async function initRealTaskStats() {
  // Устанавливаем якоря дат на текущий момент
  currentStatsWeekAnchor = new Date();
  currentStatsMonthAnchor = new Date();
  currentStatsYearAnchor = new Date();
  
  // Запускаем обновление всех вкладок параллельно
  await Promise.all([
      updateTaskWeekStats(),
      updateTaskMonthStats(),
      updateTaskYearStats(),
      updateTaskAllStats()
  ]);
}



/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЗАДАЧИ - НЕДЕЛЯ) --- */
/* --- ============================================ --- */

// Текущая просматриваемая дата (якорь недели)
let currentStatsWeekAnchor = new Date();


// Смена недели (+1 или -1)
function changeTaskWeek(direction) {
  currentStatsWeekAnchor.setDate(currentStatsWeekAnchor.getDate() + (direction * 7));
  updateTaskWeekStats();
}

// Главная функция обновления статистики за неделю
async function updateTaskWeekStats() {
  const currentRange = getWeekRange(currentStatsWeekAnchor);
  
  // Вычисляем прошлую неделю для сравнения
  const prevAnchor = new Date(currentStatsWeekAnchor);
  prevAnchor.setDate(prevAnchor.getDate() - 7);
  const prevRange = getWeekRange(prevAnchor);

  updateWeekTitleUI(currentRange.start, currentRange.end);

  const [currentStats, prevKPI] = await Promise.all([
    fetchServerStats(currentRange.start, currentRange.end),
    fetchServerKPIOnly(prevRange.start, prevRange.end)
  ]);

  if (!currentStats) return;

  // Обновляем цифры, график и категории
  updateWeekKPIsUI(currentStats.kpi, prevKPI);
  renderRealWeekChartFromServer(currentStats.daily, currentRange.start);
  
  categoryStatsData['week'] = currentStats.categories;
  renderCategoryStats('week', 'categoryStatsWeek');
}

// --- Хелперы для дат ---

function getWeekRange(anchorDate) {
  const d = new Date(anchorDate);
  const day = d.getDay(); 
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

function updateWeekTitleUI(start, end) {
  const el = document.getElementById('statsWeekTitle');
  if (!el) return;
  
  const options = { day: 'numeric', month: 'short' };
  const startStr = start.toLocaleDateString('ru-RU', options);
  const endStr = end.toLocaleDateString('ru-RU', options);
  const year = start.getFullYear(); // Можно добавить проверку, если года разные
  
  el.textContent = `Неделя ${startStr} – ${endStr} ${year}`;
}


function calculateDelta(current, prev) {
  if (prev === 0) return current === 0 ? 0 : 100; // Если раньше 0, а сейчас есть - это 100% рост
  return Math.round(((current - prev) / prev) * 100);
}

// --- UI Обновление ---

function updateWeekKPIsUI(curr, prev) {
  // 1. Количество задач
  document.getElementById('kpiWeekCount').textContent = curr.count;
  renderDelta('kpiWeekCountDelta', calculateDelta(curr.count, prev.count));

  // 2. Время (форматирование)
  const hours = Math.floor(curr.duration / 60);
  const mins = curr.duration % 60;
  let timeStr = '0м';
  if (hours > 0) timeStr = `${hours}ч ${mins}м`;
  else if (mins > 0) timeStr = `${mins}м`;
  
  document.getElementById('kpiWeekDuration').textContent = timeStr;
  renderDelta('kpiWeekDurationDelta', calculateDelta(curr.duration, prev.duration));

  // 3. Подзадачи
  document.getElementById('kpiWeekSubtasks').textContent = curr.subtasks;
  renderDelta('kpiWeekSubtasksDelta', calculateDelta(curr.subtasks, prev.subtasks));
}

function renderDelta(elementId, percent) {
  const el = document.getElementById(elementId);
  if (!el) return;

  // 1. Сначала полностью очищаем старое состояние
  el.classList.remove('up', 'down');
  el.style.color = '';       // <--- Важно: убираем серый цвет
  el.style.background = '';  // <--- Важно: убираем фон
  el.style.border = '';      // <--- Важно: убираем рамку
  el.style.opacity = '';

  if (percent === 0) {
    el.textContent = '—';
    // Устанавливаем стили для "пустого" значения
    el.style.opacity = '0.5';
    el.style.background = 'transparent';
    el.style.border = '1px solid rgba(255,255,255,0.2)';
    el.style.color = 'rgba(255,255,255,0.5)';
  } else if (percent > 0) {
    el.textContent = `+${percent}%`;
    el.classList.add('up');
    el.style.opacity = '1';
  } else {
    el.textContent = `${percent}%`; // минус уже внутри числа, если это разница
    el.classList.add('down');
    el.style.opacity = '1';
  }
}


// --- Обновление глобальных данных категорий ---

function updateCategoryStatsDataForWeek(tasks) {
  // Группируем задачи по категориям
  const counts = {};
  tasks.forEach(t => {
    const cat = t.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  // Преобразуем в формат массива для renderCategoryStats
  const newData = Object.keys(counts).map(catId => ({
    id: catId,
    count: counts[catId]
  }));

  // Обновляем глобальный объект (он в tasks.js)
  // ВАЖНО: Мы перезаписываем только 'week'
  if (typeof categoryStatsData !== 'undefined') {
    categoryStatsData['week'] = newData;
  }

  // Вызываем существующую функцию рендера
  renderCategoryStats('week', 'categoryStatsWeek');
}


/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЗАДАЧИ - МЕСЯЦ) --- */
/* --- ============================================ --- */

// Якорь месяца
let currentStatsMonthAnchor = new Date();

// Смена месяца
function changeTaskMonth(direction) {
  currentStatsMonthAnchor.setMonth(currentStatsMonthAnchor.getMonth() + direction);
  updateTaskMonthStats();
}

// Главная функция обновления месяца
async function updateTaskMonthStats() {
  const year = currentStatsMonthAnchor.getFullYear();
  const month = currentStatsMonthAnchor.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999); // Конец месяца

  const prevStart = new Date(year, month - 1, 1);
  const prevEnd = new Date(year, month, 0, 23, 59, 59, 999);

  // Заголовок
  const titleEl = document.getElementById('statsMonthTitle');
  if (titleEl) {
    let title = start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    titleEl.textContent = title.charAt(0).toUpperCase() + title.slice(1);
  }

  const [currentStats, prevKPI] = await Promise.all([
    fetchServerStats(start, end),
    fetchServerKPIOnly(prevStart, prevEnd)
  ]);

  if (!currentStats) return;

  updateMonthKPIsUI(currentStats.kpi, prevKPI);
  renderRealMonthHeatmapFromServer(currentStats.daily, year, month);
  renderRealMonthWeeksChartFromServer(currentStats.daily, year, month);

  categoryStatsData['month'] = currentStats.categories;
  renderCategoryStats('month', 'categoryStatsMonth');
}
function updateMonthKPIsUI(curr, prev) {
  // Количество
  document.getElementById('kpiMonthCount').textContent = curr.count;
  renderDelta('kpiMonthCountDelta', calculateDelta(curr.count, prev.count));

  // Время
  const hours = Math.floor(curr.duration / 60);
  const mins = curr.duration % 60;
  document.getElementById('kpiMonthDuration').textContent = `${hours}ч ${mins > 0 ? mins + 'м' : ''}`;
  renderDelta('kpiMonthDurationDelta', calculateDelta(curr.duration, prev.duration));

  // Подзадачи
  document.getElementById('kpiMonthSubtasks').textContent = curr.subtasks;
  renderDelta('kpiMonthSubtasksDelta', calculateDelta(curr.subtasks, prev.subtasks));
}




// --- Генерация графика по неделям ---
function renderRealMonthWeeksChart(tasks, year, month) {
  const container = document.getElementById('monthWeeksChartContainer');
  if (!container) return;
  container.innerHTML = '';

  // 1. Инициализируем счетчики для 5 недель (обычно месяц укладывается в 5 "строк")
  // Нед 1: 1-7 число, Нед 2: 8-14 и т.д.
  const weekCounts = [0, 0, 0, 0, 0]; 
  
  // 2. Распределяем задачи
  tasks.forEach(t => {
    if (!t.completedAt) return;
    
    const date = new Date(t.completedAt);
    const day = date.getDate(); // День месяца (1-31)
    
    // Формула: (День - 1) / 7. 
    // Дни 1-7 -> index 0. Дни 8-14 -> index 1.
    let weekIndex = Math.floor((day - 1) / 7);
    
    // Если месяц длинный (например 30-31 число попадает в 5-й индекс), 
    // ограничиваем 4 (пятой неделей), чтобы не ломать верстку.
    if (weekIndex > 4) weekIndex = 4;
    
    weekCounts[weekIndex]++;
  });

  // 3. Находим максимум
  const maxCount = Math.max(...weekCounts, 1);

  // 4. Генерируем HTML
  weekCounts.forEach((count, index) => {
    const percent = Math.round((count / maxCount) * 100);
    const width = count > 0 ? Math.max(percent, 8) + '%' : '0%'; 

    const item = document.createElement('div');
    item.className = 'weekday-item';
    item.innerHTML = `
      <div class="weekday-label">Нед ${index + 1}</div>
      <div class="weekday-bar-container" style="position: relative;">
        <div class="weekday-bar" style="width: ${width}"></div>
      </div>
      <div class="weekday-count">${count}</div>
    `;
    container.appendChild(item);
  });

  // 5. Анимация пузырьков
  setTimeout(() => {
    container.querySelectorAll('.weekday-bar').forEach(bar => {
      if (bar.offsetWidth > 30 && typeof createProgressBubbles === 'function') {
        createProgressBubbles(bar);
      }
    });
  }, 300);
}

// --- Категории за месяц ---
function updateCategoryStatsDataForMonth(tasks) {
  const counts = {};
  tasks.forEach(t => {
    const cat = t.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const newData = Object.keys(counts).map(catId => ({
    id: catId,
    count: counts[catId]
  }));

  if (typeof categoryStatsData !== 'undefined') {
    categoryStatsData['month'] = newData;
  }

  renderCategoryStats('month', 'categoryStatsMonth');
}


/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЗАДАЧИ - ГОД) --- */
/* --- ============================================ --- */

// Якорь года
let currentStatsYearAnchor = new Date();

// Смена года
function changeTaskYear(direction) {
  currentStatsYearAnchor.setFullYear(currentStatsYearAnchor.getFullYear() + direction);
  updateTaskYearStats();
}

// Главная функция обновления года
async function updateTaskYearStats() {
  const year = currentStatsYearAnchor.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);

  const prevStart = new Date(year - 1, 0, 1);
  const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

  const titleEl = document.getElementById('statsYearTitle');
  if (titleEl) titleEl.textContent = year;

  const [currentStats, prevKPI] = await Promise.all([
    fetchServerStats(start, end),
    fetchServerKPIOnly(prevStart, prevEnd)
  ]);

  if (!currentStats) return;

  updateYearKPIsUI(currentStats.kpi, prevKPI);
  renderRealYearHeatmapFromServer(currentStats.daily, year);
  renderRealYearChartFromServer(currentStats.daily, year);

  categoryStatsData['year'] = currentStats.categories;
  renderCategoryStats('year', 'categoryStatsYear');
}
function updateYearKPIsUI(curr, prev) {
  // Количество
  document.getElementById('kpiYearCount').textContent = curr.count;
  renderDelta('kpiYearCountDelta', calculateDelta(curr.count, prev.count));

  // Время (показываем только часы для года, чтобы не было слишком длинно)
  const hours = Math.round(curr.duration / 60);
  document.getElementById('kpiYearDuration').textContent = `${hours}ч`;
  renderDelta('kpiYearDurationDelta', calculateDelta(curr.duration, prev.duration));

  // Подзадачи
  document.getElementById('kpiYearSubtasks').textContent = curr.subtasks;
  renderDelta('kpiYearSubtasksDelta', calculateDelta(curr.subtasks, prev.subtasks));
}

// --- Генерация реальной теплокарты года (GitHub style) ---
function renderRealYearHeatmap(tasks, year) {
  const container = document.getElementById('heatmapGridYear');
  if (!container) return;
  container.innerHTML = '';

  // 1. Создаем карту активности
  // ИСПОЛЬЗУЕМ ЛОКАЛЬНОЕ ВРЕМЯ ПОЛЬЗОВАТЕЛЯ
  const activityMap = {};
  
  tasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    // Получаем 'YYYY-MM-DD' в локальном часовом поясе
    const localDateKey = d.toLocaleDateString('en-CA'); 
    
    // Считаем только если год совпадает (на всякий случай)
    if (d.getFullYear() === year) {
        activityMap[localDateKey] = (activityMap[localDateKey] || 0) + 1;
    }
  });

  // 2. Подготовка сетки
  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  
  // Определяем день недели 1 января (0=Вс, 1=Пн...)
  const startDate = new Date(year, 0, 1);
  let startDayOfWeek = startDate.getDay(); 
  // Корректировка: если вы хотите, чтобы неделя начиналась с ПН (как в CSS grid), 
  // нужно сдвинуть индексы. Если у вас CSS heatmap-year-weeks display:flex (колонки),
  // то стандартный getDay() (Вс=0) подходит, если колонки идут Вс->Сб.
  // Обычно в GitHub: колонки - это недели, строки - это дни (0=Вс, 1=Пн).
  
  // Заполняем пустоты до начала года
  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek[i] = null;
  }

  // Проходим по всем дням года
  const daysInYear = ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;
  
  for (let i = 0; i < daysInYear; i++) {
    const currentDate = new Date(year, 0, 1 + i);
    const dayOfWeek = currentDate.getDay();
    
    currentWeek[dayOfWeek] = currentDate;

    // Если суббота (6), закрываем неделю и начинаем новую
    if (dayOfWeek === 6) {
      weeks.push(currentWeek);
      currentWeek = new Array(7).fill(null);
    }
  }
  
  if (currentWeek.some(d => d !== null)) {
    weeks.push(currentWeek);
  }

  // 3. Рендер HTML
  
  // А) Месяцы
  const monthsRow = document.createElement('div');
  monthsRow.className = 'heatmap-year-months';
  monthsRow.appendChild(document.createElement('div')); 
  
  const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  let lastMonthRendered = -1;

  weeks.forEach((week, index) => {
    const day = week.find(d => d !== null);
    if (day) {
      const m = day.getMonth();
      if (m !== lastMonthRendered) {
        const label = document.createElement('div');
        label.className = 'heatmap-year-month-label';
        label.textContent = monthLabels[m];
        label.style.gridColumnStart = index + 2; 
        monthsRow.appendChild(label);
        lastMonthRendered = m;
      }
    }
  });
  container.appendChild(monthsRow);

  // Б) Сетка дней
  const bodyRow = document.createElement('div');
  bodyRow.style.display = 'flex';

  // Колонка названий дней
  const labelsCol = document.createElement('div');
  labelsCol.className = 'heatmap-year-week';
  labelsCol.style.marginRight = '4px';
  
  // Метки дней (Пн, Ср, Пт) - подгоните индексы под вашу верстку (0=Вс или 1=Пн)
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  for(let d=0; d<7; d++) {
    const label = document.createElement('div');
    label.className = 'heatmap-year-day-label';
    label.style.height = '10px';
    label.style.marginBottom = '3px';
    // Показываем Пн(1), Ср(3), Пт(5)
    if(d===1 || d===3 || d===5) label.textContent = dayNames[d];
    labelsCol.appendChild(label);
  }
  bodyRow.appendChild(labelsCol);
  
  const weeksContainer = document.createElement('div');
  weeksContainer.className = 'heatmap-year-weeks';
  
  weeks.forEach(week => {
    const weekCol = document.createElement('div');
    weekCol.className = 'heatmap-year-week';
    
    for(let d=0; d<7; d++) {
      const date = week[d];
      const cell = document.createElement('div');
      cell.className = 'heatmap-year-day';
      
      if (date) {
        // ИСПОЛЬЗУЕМ ТУ ЖЕ ЛОГИКУ ГЕНЕРАЦИИ КЛЮЧА
        const localKey = date.toLocaleDateString('en-CA'); 
        const count = activityMap[localKey] || 0;
        
        let level = 0;
        if (count > 0) level = 1;
        if (count > 2) level = 2;
        if (count > 5) level = 3;
        if (count > 9) level = 4;
        
        cell.classList.add(`level-${level}`);
        
        const tooltipDate = date.toLocaleDateString('ru-RU', {day:'numeric', month:'short'});
        cell.title = `${tooltipDate}: ${count} задач`;

        cell.onclick = () => {
          // Формируем красивую дату с годом
          const fullDateStr = date.toLocaleDateString('ru-RU', {
              day: 'numeric', 
              month: 'long', 
              year: 'numeric'
          });

          // Логика окончаний (1 задача, 2 задачи, 5 задач)
          let suffix = 'задач';
          const n = Math.abs(count) % 100; 
          const n1 = n % 10;
          if (n > 10 && n < 20) { suffix = 'задач'; }
          else if (n1 > 1 && n1 < 5) { suffix = 'задачи'; }
          else if (n1 === 1) { suffix = 'задача'; }

          // Текст сообщения
          const message = count > 0 
              ? `Выполнено: ${count} ${suffix}` 
              : 'Нет выполненных задач';

          // Вызов красивого уведомления
          showTaskNotification(`📅 ${fullDateStr}`, message);
      };



      } else {
        cell.style.opacity = '0';
        cell.style.pointerEvents = 'none';
      }
      
      weekCol.appendChild(cell);
    }
    weeksContainer.appendChild(weekCol);
  });
  
  bodyRow.appendChild(weeksContainer);
  container.appendChild(bodyRow);
}
// --- Генерация графика по месяцам (Бары) ---
function renderRealYearChart(tasks, year) {
  const container = document.getElementById('yearChartContainer');
  if (!container) return;
  container.innerHTML = '';

  // 12 месяцев
  const monthCounts = new Array(12).fill(0);
  
  tasks.forEach(t => {
    const d = new Date(t.completedAt);
    const m = d.getMonth(); // 0..11
    monthCounts[m]++;
  });

  const maxCount = Math.max(...monthCounts, 1);
  const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

  monthCounts.forEach((count, index) => {
    const percent = Math.round((count / maxCount) * 100);
    // Высота бара. Мин 5% для видимости
    const height = count > 0 ? Math.max(percent, 5) + '%' : '2px';
    const opacity = count > 0 ? 1 : 0.3;

    const barWrapper = document.createElement('div');
    barWrapper.className = 'chart-bar';
    barWrapper.style.height = height;
    barWrapper.style.opacity = opacity;
    barWrapper.title = `${monthNames[index]}: ${count} задач`;

    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = monthNames[index];

    barWrapper.appendChild(label);
    container.appendChild(barWrapper);
  });
}

// --- Категории за год ---
function updateCategoryStatsDataForYear(tasks) {
  const counts = {};
  tasks.forEach(t => {
    const cat = t.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const newData = Object.keys(counts).map(catId => ({
    id: catId,
    count: counts[catId]
  }));

  if (typeof categoryStatsData !== 'undefined') {
    categoryStatsData['year'] = newData;
  }

  renderCategoryStats('year', 'categoryStatsYear');
}


/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЗАДАЧИ - ВСЕ) --- */
/* --- ============================================ --- */

async function updateTaskAllStats() {
  const start = new Date('2020-01-01');
  const end = new Date('2030-12-31');

  const stats = await fetchServerStats(start, end);

  if (!stats) return;

  const countEl = document.getElementById('totalTasksAllTime');
  if (countEl) countEl.textContent = stats.kpi.count;

  const timeEl = document.getElementById('totalTimeAllTime');
  if (timeEl) {
    const totalHours = Math.round(stats.kpi.duration / 60);
    timeEl.textContent = `${totalHours.toLocaleString()}ч`;
  }

  const subEl = document.getElementById('totalSubtasksAllTime');
  if (subEl) subEl.textContent = stats.kpi.subtasks.toLocaleString();

  categoryStatsData['all'] = stats.categories;
  renderCategoryStats('all', 'categoryStatsAll');
}

// --- Категории за всё время ---
function updateCategoryStatsDataForAll(tasks) {
  const counts = {};
  tasks.forEach(t => {
    const cat = t.category || 'other';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const newData = Object.keys(counts).map(catId => ({
    id: catId,
    count: counts[catId]
  }));

  if (typeof categoryStatsData !== 'undefined') {
    categoryStatsData['all'] = newData;
  }

  renderCategoryStats('all', 'categoryStatsAll');
}

/* --- ЛОГИКА УПРАВЛЕНИЯ СЕРИЯМИ ЗАДАЧ (ACTION SHEET) --- */

let pendingAction = null; // Хранит действие, ожидающее выбора (save или delete)

function closeSeriesActionSheet() {
  const overlay = document.getElementById('seriesActionSheetOverlay');
  overlay.classList.remove('active');
  document.body.classList.remove('body-modal-open');
  pendingAction = null;
}

function openSeriesActionSheet(type, onSingle, onSeries) {
  const overlay = document.getElementById('seriesActionSheetOverlay');
  const sheet = overlay.querySelector('.action-sheet');
  const title = overlay.querySelector('.action-sheet-title');
  const subtitle = overlay.querySelector('.action-sheet-subtitle');
  
  // Настройка UI в зависимости от типа
  if (type === 'delete') {
    sheet.classList.add('delete-mode');
    title.textContent = 'Удаление серии';
    subtitle.textContent = 'Как вы хотите удалить эту задачу?';
  } else {
    sheet.classList.remove('delete-mode');
    title.textContent = 'Изменение серии';
    subtitle.textContent = 'Как применить изменения?';
  }

  // Привязка обработчиков (ищем по data-action)
  const singleBtn = overlay.querySelector('[data-action="single"]');
  const seriesBtn = overlay.querySelector('[data-action="series"]');

  // Клонируем кнопки для очистки старых слушателей
  const newSingle = singleBtn.cloneNode(true);
  const newSeries = seriesBtn.cloneNode(true);
  
  singleBtn.parentNode.replaceChild(newSingle, singleBtn);
  seriesBtn.parentNode.replaceChild(newSeries, seriesBtn);

  newSingle.onclick = () => {
    closeSeriesActionSheet();
    onSingle();
  };

  newSeries.onclick = () => {
    closeSeriesActionSheet();
    onSeries();
  };

  overlay.classList.add('active');
  // Добавляем класс для блокировки скролла body
  document.body.classList.add('body-modal-open');
}


// [tasks.js] Вспомогательная функция для точечного обновления счетчика
function updateTaskBadgesInDOM(taskId) {
  const task = tasksDB.find(t => t.id === taskId);
  if (!task) return;

  const taskEl = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  if (!taskEl) return;

  // 1. Считаем актуальные цифры
  const total = task.subtasks ? task.subtasks.length : 0;
  const completed = task.subtasks ? task.subtasks.filter(s => s.completed).length : 0;

  // 2. Ищем бейдж с галочкой (счетчик)
  // Мы ищем среди всех бейджей тот, который похож на счетчик, или добавляем класс
  const badges = taskEl.querySelectorAll('.badge');
  let counterBadge = null;

  badges.forEach(b => {
    if (b.textContent.includes('✓') || b.textContent.includes('/')) {
      counterBadge = b;
    }
  });

  // 3. Если счетчик есть - обновляем, если нет (а подзадачи появились) - это сложнее, 
  // но для инлайн-переключения он обычно уже есть.
  if (counterBadge) {
    if (total === 0) {
      counterBadge.style.display = 'none';
    } else {
      counterBadge.style.display = 'inline-block'; // или пустая строка, зависит от CSS
      counterBadge.textContent = `✓ ${completed}/${total}`;
      
      // Подсвечиваем, если все выполнены
      if (completed === total && total > 0) {
        counterBadge.classList.add('subtasks-complete');
      } else {
        counterBadge.classList.remove('subtasks-complete');
      }
    }
  }
}


// [tasks.js] Функция точечной замены карточки задачи
function replaceTaskCardInDOM(task) {
  // 1. Ищем старую карточку
  const oldCard = document.querySelector(`.task-item[data-task-id="${task.id}"]`);
  if (!oldCard) return;

  // 2. Генерируем новый HTML (используем существующую функцию)
  // Получаем индекс для анимации (можно взять 0 или текущий индекс элемента)
  const index = Array.from(oldCard.parentNode.children).indexOf(oldCard);
  const newHTML = createTaskCardHTML(task, index);

  // 3. Создаем временный элемент
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = newHTML;
  const newCard = tempDiv.firstElementChild;

  // 4. Убираем анимацию появления, чтобы не мигало
  newCard.style.animation = 'none';
  newCard.style.opacity = '1';

  // 5. Подменяем элемент в DOM
  oldCard.replaceWith(newCard);

  // 6. Инициализируем свайпы для новой карточки
  if (typeof SwipeableTaskItem === 'function') {
    new SwipeableTaskItem(newCard);
  }
}


/* --- ============================================ --- */
/* --- ОБНОВЛЕННЫЕ РЕНДЕРЫ (Принимают Daily Stats)  --- */
/* --- ============================================ --- */

// 1. График Недели (Бары)
function renderRealWeekChartFromServer(dailyStats, weekStart) {
  const container = document.getElementById('weekDayStatsContainer');
  if (!container) return;
  container.innerHTML = '';

  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  
  // dailyStats = [{ date: '2025-10-10', count: 5 }, ...]
  dailyStats.forEach(item => {
    const d = new Date(item.date);
    let dayIndex = d.getDay() - 1; 
    if (dayIndex === -1) dayIndex = 6;
    dayCounts[dayIndex] = item.count;
  });

  const maxCount = Math.max(...dayCounts, 1); 
  const daysLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  dayCounts.forEach((count, index) => {
    const percent = Math.round((count / maxCount) * 100);
    const width = count > 0 ? Math.max(percent, 8) + '%' : '0%'; 
    
    const item = document.createElement('div');
    item.className = 'weekday-item';
    item.innerHTML = `
      <div class="weekday-label">${daysLabels[index]}</div>
      <div class="weekday-bar-container" style="position: relative;">
        <div class="weekday-bar" style="width: ${width}"></div>
      </div>
      <div class="weekday-count">${count}</div>
    `;
    container.appendChild(item);
  });
  
  // Анимация (если есть core.js helper)
  setTimeout(() => {
    container.querySelectorAll('.weekday-bar').forEach(bar => {
      if (bar.offsetWidth > 30 && typeof createProgressBubbles === 'function') {
        createProgressBubbles(bar);
      }
    });
  }, 300);
}


// 2. Теплокарта Месяца
function renderRealMonthHeatmapFromServer(dailyStats, year, month) {
  const container = document.getElementById('heatmapGridMonth');
  if (!container) return;
  container.innerHTML = '';

  // Преобразуем массив в Map для быстрого поиска: "15" -> count
  const activityMap = {};
  dailyStats.forEach(item => {
      const d = new Date(item.date);
      // Важно: проверяем, что это именно этот месяц (SQL может вернуть граничные значения)
      if (d.getMonth() === month) {
          activityMap[d.getDate()] = item.count;
      }
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDayIndex = new Date(year, month, 1).getDay();
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'heatmap-day empty'; 
    container.appendChild(emptyCell);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const count = activityMap[i] || 0;
    const d = document.createElement('div');
    
    let level = 0;
    if (count > 0) level = 1;
    if (count > 2) level = 2;
    if (count > 4) level = 3;
    if (count > 7) level = 4;

    d.className = `heatmap-day level-${level}`;
    const dateStr = new Date(year, month, i).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    d.title = `${dateStr}: выполнено ${count}`;
    d.textContent = i;
    d.style.color = count > 0 ? '#fff' : 'rgba(255,255,255,0.3)';
    
    d.onclick = () => {
      const message = count > 0 ? `Выполнено: ${count}` : 'Нет активности';
      if(typeof showTaskNotification === 'function') showTaskNotification(`📅 ${dateStr}`, message);
    };

    container.appendChild(d);
  }
}

// 3. График по Неделям Месяца
function renderRealMonthWeeksChartFromServer(dailyStats, year, month) {
  const container = document.getElementById('monthWeeksChartContainer');
  if (!container) return;
  container.innerHTML = '';

  const weekCounts = [0, 0, 0, 0, 0]; 
  
  dailyStats.forEach(item => {
    const date = new Date(item.date);
    if(date.getMonth() !== month) return;

    const day = date.getDate();
    let weekIndex = Math.floor((day - 1) / 7);
    if (weekIndex > 4) weekIndex = 4;
    weekCounts[weekIndex] += item.count;
  });

  const maxCount = Math.max(...weekCounts, 1);

  weekCounts.forEach((count, index) => {
    const percent = Math.round((count / maxCount) * 100);
    const width = count > 0 ? Math.max(percent, 8) + '%' : '0%'; 

    const item = document.createElement('div');
    item.className = 'weekday-item';
    item.innerHTML = `
      <div class="weekday-label">Нед ${index + 1}</div>
      <div class="weekday-bar-container" style="position: relative;">
        <div class="weekday-bar" style="width: ${width}"></div>
      </div>
      <div class="weekday-count">${count}</div>
    `;
    container.appendChild(item);
  });
}

// 4. Теплокарта Года
function renderRealYearHeatmapFromServer(dailyStats, year) {
  const container = document.getElementById('heatmapGridYear');
  if (!container) return;
  container.innerHTML = '';

  // Map: "YYYY-MM-DD" -> count
  const activityMap = {};
  dailyStats.forEach(item => {
      // item.date приходит как строка YYYY-MM-DD из SQL
      activityMap[item.date] = item.count;
  });

  // (Далее код построения сетки почти такой же, как был, 
  // но берем данные из activityMap по ключу даты)
  
  // ... Копируем логику из старой функции renderRealYearHeatmap ...
  // ... Единственное изменение внутри цикла по дням года: ...
  
  /* Вместо локального расчета ключа, берем ISO строку даты:
     const isoKey = currentDate.toISOString().split('T')[0]; 
     const count = activityMap[isoKey] || 0;
  */
 
  // Чтобы не раздувать ответ, я использую упрощенную версию рендера сетки:
  // (Вставь сюда старую логику renderRealYearHeatmap, заменив только получение count)
  
  const weeks = [];
  let currentWeek = new Array(7).fill(null);
  const startDate = new Date(year, 0, 1);
  let startDayOfWeek = startDate.getDay(); 
  
  for (let i = 0; i < startDayOfWeek; i++) currentWeek[i] = null;

  const daysInYear = ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;
  
  for (let i = 0; i < daysInYear; i++) {
    const currentDate = new Date(year, 0, 1 + i);
    const dayOfWeek = currentDate.getDay();
    currentWeek[dayOfWeek] = currentDate;
    if (dayOfWeek === 6) { weeks.push(currentWeek); currentWeek = new Array(7).fill(null); }
  }
  if (currentWeek.some(d => d !== null)) weeks.push(currentWeek);

  // Рендер месяцев (тот же код)
  const monthsRow = document.createElement('div');
  monthsRow.className = 'heatmap-year-months';
  monthsRow.appendChild(document.createElement('div')); 
  const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  let lastMonthRendered = -1;
  weeks.forEach((week, index) => {
    const day = week.find(d => d !== null);
    if (day && day.getMonth() !== lastMonthRendered) {
        const label = document.createElement('div');
        label.className = 'heatmap-year-month-label';
        label.textContent = monthLabels[day.getMonth()];
        label.style.gridColumnStart = index + 2; 
        monthsRow.appendChild(label);
        lastMonthRendered = day.getMonth();
    }
  });
  container.appendChild(monthsRow);

  // Рендер дней
  const bodyRow = document.createElement('div');
  bodyRow.style.display = 'flex';
  
  // Легенда дней
  const labelsCol = document.createElement('div');
  labelsCol.className = 'heatmap-year-week';
  labelsCol.style.marginRight = '4px';
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  for(let d=0; d<7; d++) {
    const label = document.createElement('div');
    label.className = 'heatmap-year-day-label';
    label.style.height = '10px';
    label.style.marginBottom = '3px';
    if(d===1 || d===3 || d===5) label.textContent = dayNames[d];
    labelsCol.appendChild(label);
  }
  bodyRow.appendChild(labelsCol);

  const weeksContainer = document.createElement('div');
  weeksContainer.className = 'heatmap-year-weeks';

  weeks.forEach(week => {
    const weekCol = document.createElement('div');
    weekCol.className = 'heatmap-year-week';
    for(let d=0; d<7; d++) {
      const date = week[d];
      const cell = document.createElement('div');
      cell.className = 'heatmap-year-day';
      
      if (date) {
        // 🔥 ВОТ ГЛАВНОЕ ИЗМЕНЕНИЕ: Формируем ключ YYYY-MM-DD вручную, чтобы совпал с SQL
        const yearStr = date.getFullYear();
        const monthStr = String(date.getMonth() + 1).padStart(2, '0');
        const dayStr = String(date.getDate()).padStart(2, '0');
        const isoKey = `${yearStr}-${monthStr}-${dayStr}`;

        const count = activityMap[isoKey] || 0;
        
        let level = 0;
        if (count > 0) level = 1;
        if (count > 2) level = 2;
        if (count > 5) level = 3;
        if (count > 9) level = 4;
        cell.classList.add(`level-${level}`);
        cell.title = `${date.toLocaleDateString()}: ${count}`;
        cell.onclick = () => { if(typeof showTaskNotification === 'function') showTaskNotification(date.toLocaleDateString(), `Выполнено: ${count}`); };
      } else {
        cell.style.opacity = '0';
        cell.style.pointerEvents = 'none';
      }
      weekCol.appendChild(cell);
    }
    weeksContainer.appendChild(weekCol);
  });
  bodyRow.appendChild(weeksContainer);
  container.appendChild(bodyRow);
}

// 5. График Года (Бары)
function renderRealYearChartFromServer(dailyStats, year) {
  const container = document.getElementById('yearChartContainer');
  if (!container) return;
  container.innerHTML = '';

  const monthCounts = new Array(12).fill(0);
  
  dailyStats.forEach(item => {
    const d = new Date(item.date);
    if(d.getFullYear() === year) {
        monthCounts[d.getMonth()] += item.count;
    }
  });

  const maxCount = Math.max(...monthCounts, 1);
  const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

  monthCounts.forEach((count, index) => {
    const percent = Math.round((count / maxCount) * 100);
    const height = count > 0 ? Math.max(percent, 5) + '%' : '2px';
    const opacity = count > 0 ? 1 : 0.3;

    const barWrapper = document.createElement('div');
    barWrapper.className = 'chart-bar';
    barWrapper.style.height = height;
    barWrapper.style.opacity = opacity;
    barWrapper.title = `${monthNames[index]}: ${count}`;

    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = monthNames[index];

    barWrapper.appendChild(label);
    container.appendChild(barWrapper);
  });
}


// --- Вставьте это в конец файла tasks.js ---

// Функция пересчета сводки дня (кол-во задач + время) для списка выполненных
function updateDayHeaderSummary(taskId) {
  // 1. Находим DOM-элемент задачи
  const taskEl = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
  if (!taskEl) return;

  // 2. Находим контейнер группы дня (.day-group)
  const dayGroup = taskEl.closest('.day-group');
  if (!dayGroup) return;

  // 3. Собираем все задачи внутри этого дня
  const taskItems = dayGroup.querySelectorAll('.task-item');
  let totalMinutes = 0;
  let count = 0;

  taskItems.forEach(item => {
    const id = parseInt(item.dataset.taskId, 10);
    // Берем актуальные данные из памяти (tasksDB), так как там уже обновленная длительность
    const taskData = tasksDB.find(t => t.id === id);
    
    if (taskData) {
      count++;
      if (taskData.duration_min) {
        totalMinutes += parseInt(taskData.duration_min, 10);
      }
    }
  });

  // 4. Формируем новый текст (копируем логику из renderCompletedTimeline)
  const durationLabel = totalMinutes > 0 ? ` • ${formatDurationLabel(totalMinutes)}` : '';
  
  // Логика склонения (задача/задачи/задач)
  let suffix = 'задач';
  const n = Math.abs(count) % 100; 
  const n1 = n % 10;
  if (n > 10 && n < 20) { suffix = 'задач'; }
  else if (n1 > 1 && n1 < 5) { suffix = 'задачи'; }
  else if (n1 === 1) { suffix = 'задача'; }

  const summaryLabel = `${count} ${suffix}${durationLabel}`;

  // 5. Обновляем DOM
  const summaryEl = dayGroup.querySelector('.day-summary');
  if (summaryEl) {
    summaryEl.textContent = summaryLabel;
    
    // Небольшой визуальный эффект обновления (мигание цветом)
    summaryEl.style.transition = 'color 0.3s';
    summaryEl.style.color = '#4ecdc4';
    setTimeout(() => { summaryEl.style.color = ''; }, 600);
  }
}
