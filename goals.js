// --- Функции для работы с целями ---


let isGoalEditMode = false;
let editingGoalId = null;

// Флаги навигации
let goalReturnAfterEdit = false;
let goalReturnTargetId = null;

const defaultGoalState = {
  title: "",
  deadline: null,
  description: "",
  subgoals: [],
  category: null 
};
let goalState = { ...defaultGoalState };

function resetGoalState() {
  // При сбросе берем дефолтную категорию из загруженных
  const defCat = typeof getDefaultCategoryId === 'function' ? getDefaultCategoryId() : null;
  goalState = { ...defaultGoalState, subgoals: [], category: defCat };
  isGoalEditMode = false;
  editingGoalId = null;
  
  const titleInput = document.getElementById('goalTitleInput');
  const errorEl = document.getElementById('goalTitleError');
  const subList = document.getElementById('subgoalsList');
  const accord = document.getElementById('subgoalsAccordionContent');
  
  if(titleInput) titleInput.classList.remove('invalid');
  if(errorEl) errorEl.style.display = 'none';
  if(subList) subList.innerHTML = '';
  if(accord) accord.classList.remove('active');
}

function updateGoalUI() {
  // 1. ЗАЩИТА: Не обновляем UI, если модалка закрыта
  const overlay = document.getElementById('goalModalOverlay');
  if (!overlay || !overlay.classList.contains('active')) return;
 
  // Дополнительная защита: если state пустой, выходим
  if (!goalState || typeof goalState.title === 'undefined') return;
 
  const titleInput = document.getElementById('goalTitleInput');
  const descInput = document.getElementById('goalDescriptionInput');
  
  // 1. Синхронизируем поля (если нужно)
  if(titleInput && titleInput.value !== goalState.title) {
      titleInput.value = goalState.title;
  }
  if(descInput && descInput.value !== goalState.description) {
      descInput.value = goalState.description;
  }
  
  // 2. Обновляем чипы категорий
  if(document.getElementById('goalCategoryChips')) {
      const chips = document.querySelectorAll('#goalCategoryChips .cat-story');
      chips.forEach(c => {
          // Безопасное приведение к строке
          c.classList.toggle('active', c.dataset.category === String(goalState.category || ''));
      });
  }
  
  // 3. Валидация кнопки сохранения
  const saveBtn = document.getElementById('saveGoalButton');
  if (saveBtn) {
      // Кнопка активна, если заголовок длиннее 2 символов
      const isValid = goalState.title && goalState.title.trim().length >= 3;
      saveBtn.disabled = !isValid;
  }
  
  // 4. Обновляем сводку внизу
  updateGoalSummary();
 
  // --- 🔥 ИСПРАВЛЕНИЕ: Применяем тему выбранной категории ---
  if (goalState.category) {
      applyGoalTheme(goalState.category);
  }
 }


function updateGoalSummary() {
 const sumEl = document.getElementById('goalSummary');
 if(!sumEl) return;
 
 // ЗАЩИТА: Используем значения по умолчанию, если state не инициализирован
 const subgoals = goalState.subgoals || [];
 const title = goalState.title || '';

 const count = subgoals.length;
 
 if(title.length < 3) {
     sumEl.textContent = 'Начните вводить название...';
 } else {
     sumEl.innerHTML = `Цель: <b>${title}</b><br>${count} этапов`;
 }
}

function applyGoalTheme(categoryId) {
  let cat = profileCategories.find(c => String(c.id) === String(categoryId));
  if (!cat) cat = profileCategories.find(c => c.isDefault) || profileCategories[0];
  if (!cat) return;

  const modal = document.querySelector('.goal-modal.flow-design');
  const iconPreview = document.getElementById('goalIconPreview');
  const saveBtn = document.getElementById('saveGoalButton');
  const glow = hexToRgba(cat.color, 0.35);

  if (modal) {
    modal.style.setProperty('--theme-color', cat.color);
    modal.style.setProperty('--theme-glow', glow);
  }

  if (saveBtn) {
    saveBtn.style.boxShadow = `0 8px 30px ${glow}`;
  }

  if (iconPreview) {
    iconPreview.classList.remove('pop');
    void iconPreview.offsetWidth;
    iconPreview.textContent = cat.icon;
    iconPreview.classList.add('pop');
    
    iconPreview.style.borderColor = cat.color;
    iconPreview.style.boxShadow = `0 0 30px ${glow}`;
    iconPreview.style.background = hexToRgba(cat.color, 0.15);
  }
}

function syncDateChip() {
  const dateInput = document.getElementById('goalDeadlineInput');
  const dateText = document.getElementById('dateBtnText');
  const dateIcon = document.getElementById('dateBtnIcon');
  const chip = document.querySelector('.flow-date-chip');

  if (!dateInput || !dateText || !dateIcon || !chip) return;

  if (goalState.deadline) {
    const dateStr = new Date(goalState.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    dateText.textContent = dateStr;
    dateIcon.textContent = '🏁';
    chip.classList.add('has-date');
    dateInput.value = dateStr;
  } else {
    dateText.textContent = 'Срок';
    dateIcon.textContent = '📅';
    chip.classList.remove('has-date');
    dateInput.value = '';
  }
}

function autoGrowGoalTitle() {
  const titleInput = document.getElementById('goalTitleInput');
  if (!titleInput) return;
  titleInput.style.height = 'auto';
  titleInput.style.height = `${titleInput.scrollHeight}px`;
}

function updateSubgoalCounter() {
  const el = document.getElementById('subgoalCounter');
  if(el) el.textContent = `${goalState.subgoals.length} этапов`;
}

function openGoalModal(goalId = null) {
  resetGoalState();
  
  if (goalId) {
    // Режим РЕДАКТИРОВАНИЯ
    const goal = goalsDB.find(g => g.id === goalId);
    if (!goal) return;
    
    isGoalEditMode = true;
    editingGoalId = goalId;
    
    goalState = {
      title: goal.title || "",
      deadline: goal.deadline || null,
      description: goal.description || "",
      subgoals: goal.subgoals ? JSON.parse(JSON.stringify(goal.subgoals)) : [],
      category: goal.category // string ID
    };
    
    document.getElementById('goalModalTitle').textContent = '✎ Редактировать цель';
    document.getElementById('saveGoalButton').innerHTML = 'Сохранить <span>✨</span>';
    
    // Показываем подцели если есть
    if (goalState.subgoals.length > 0) {
       const accord = document.getElementById('subgoalsAccordionContent');
       const toggle = document.getElementById('subgoalsAccordionToggle');
       if(accord) accord.classList.add('active');
       if(toggle) toggle.textContent = '🎯 Скрыть подцели';
       renderSubgoals();
    }
  } else {
    // Режим СОЗДАНИЯ
    document.getElementById('goalModalTitle').textContent = 'СОЗДАНИЕ ЦЕЛИ';
    document.getElementById('saveGoalButton').innerHTML = 'Создать <span>✨</span>';
  }
  
  document.getElementById('goalModalOverlay').classList.add('active');
  document.body.classList.add('body-modal-open');
  
  updateGoalUI();
}

function closeGoalModal() {
  document.getElementById('goalModalOverlay').classList.remove('active');
  document.body.classList.remove('body-modal-open');
  
  // Возврат в детали, если редактировали оттуда
  if (goalReturnAfterEdit && goalReturnTargetId) {
    const id = goalReturnTargetId;
    goalReturnAfterEdit = false;
    goalReturnTargetId = null;
    setTimeout(() => openGoalDetail(id), 200);
  }
}

async function saveGoal() {
  const title = goalState.title.trim();
  const titleInput = document.getElementById('goalTitleInput');
  const titleError = document.getElementById('goalTitleError');

  if (title.length < 3) {
    titleInput.classList.add('invalid');
    titleError.style.display = 'block';
    return;
  }

  const saveBtn = document.getElementById('saveGoalButton');
  const oldText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Сохранение...';

  try {
      // 1. Сначала готовим подцели, чтобы посчитать актуальный прогресс
      const validSubgoals = goalState.subgoals.filter(sg => sg.title.trim().length > 0);
      
      const totalSteps = validSubgoals.length;
      const completedSteps = validSubgoals.filter(sg => sg.completed).length;
      
      // Считаем процент (защита от деления на 0)
      const newProgress = totalSteps > 0 
          ? Math.round((completedSteps / totalSteps) * 100) 
          : 0;

      // 2. Готовим данные категории
      let catId = parseInt(goalState.category, 10);
      if (isNaN(catId)) {
        const def = typeof getDefaultCategoryId === 'function' ? getDefaultCategoryId() : null;
        catId = def ? parseInt(def, 10) : null;
      }

      // 3. Объект для записи цели (С УЧЕТОМ НОВОГО ПРОГРЕССА)
      const goalPayload = {
          user_id: CURRENT_USER_ID,
          title: title,
          deadline: goalState.deadline || null,
          description: goalState.description || "",
          category_id: catId,
          progress: newProgress // <--- Записываем актуальный процент сразу
      };
      
      let targetGoalId = null;

      if (isGoalEditMode && editingGoalId) {
          // === РЕДАКТИРОВАНИЕ (UPDATE) ===
          targetGoalId = editingGoalId;

          // Логика авто-статуса:
          // Если добавили подцель и прогресс упал ниже 100% -> цель снова активна
          if (totalSteps > 0 && newProgress < 100) {
              goalPayload.completed = false;
              goalPayload.completed_at = null; 
          }
          // Если все подцели выполнены -> цель завершена (можно убрать, если хотите завершать только вручную)
          else if (totalSteps > 0 && newProgress === 100) {
              goalPayload.completed = true;
              goalPayload.completed_at = new Date().toISOString();
          }
          
          const { error: updateError } = await supabase
            .from('goals')
            .update(goalPayload)
            .eq('id', targetGoalId);

          if (updateError) throw updateError;

      } else {
          // === СОЗДАНИЕ (INSERT) ===
          goalPayload.completed = false; 
          goalPayload.created_at = new Date().toISOString();

          const { data: newGoal, error: createError } = await supabase
              .from('goals')
              .insert([goalPayload])
              .select()
              .single();

          if (createError) throw createError;
          targetGoalId = newGoal.id;
      }

      // 4. РАБОТА С ПОДЦЕЛЯМИ (Безопасное сохранение ID)
      
      if (targetGoalId) {
        if (isGoalEditMode && editingGoalId) {
            // --- ЛОГИКА ДЛЯ РЕДАКТИРОВАНИЯ ---

            // А. Получаем ID из базы
            const { data: dbSubgoals, error: fetchError } = await supabase
                .from('subgoals')
                .select('id')
                .eq('goal_id', targetGoalId);
            
            if (fetchError) throw fetchError;
            
            const dbIds = dbSubgoals.map(s => s.id); 

            // Б. УДАЛЕНИЕ (есть в БД, нет в UI)
            const uiIds = validSubgoals.map(s => s.id);
            const idsToDelete = dbIds.filter(dbId => !uiIds.some(uiId => String(uiId) === String(dbId)));

            if (idsToDelete.length > 0) {
                await supabase.from('subgoals').delete().in('id', idsToDelete);
            }

            // В. РАЗДЕЛЕНИЕ НА UPDATE / INSERT
            const subgoalsToUpdate = [];
            const subgoalsToInsert = [];

            validSubgoals.forEach(sg => {
                const existsInDb = dbIds.some(dbId => String(dbId) === String(sg.id));
                const payload = {
                    goal_id: targetGoalId,
                    title: sg.title,
                    deadline: sg.deadline,
                    completed: sg.completed || false,
                    completed_at: sg.completed ? (sg.completedAt || new Date().toISOString()) : null
                };

                if (existsInDb) {
                    payload.id = sg.id;
                    subgoalsToUpdate.push(payload);
                } else {
                    subgoalsToInsert.push(payload); // ID не передаем
                }
            });

            // Г. ОТПРАВКА
            if (subgoalsToUpdate.length > 0) {
                const { error: upsertError } = await supabase.from('subgoals').upsert(subgoalsToUpdate);
                if (upsertError) throw upsertError;
            }
            if (subgoalsToInsert.length > 0) {
                const { error: insertError } = await supabase.from('subgoals').insert(subgoalsToInsert);
                if (insertError) throw insertError;
            }

        } else {
            // --- ЛОГИКА ДЛЯ НОВОЙ ЦЕЛИ ---
            if (validSubgoals.length > 0) {
                const subPayload = validSubgoals.map(sg => ({
                    goal_id: targetGoalId,
                    title: sg.title,
                    deadline: sg.deadline,
                    completed: sg.completed || false,
                    completed_at: sg.completed ? (sg.completedAt || new Date().toISOString()) : null
                }));
                const { error: subError } = await supabase.from('subgoals').insert(subPayload);
                if (subError) throw subError;
            }
        }
      }

      showToast(isGoalEditMode ? 'Цель обновлена' : 'Цель создана');
      
      // Полная перезагрузка данных
      await loadData(); 
      
      closeGoalModal();

      // Если мы редактировали цель, находясь в ее деталях, нужно обновить детали
      // (проверяем, открыто ли окно деталей для этой цели)
      const detailOverlay = document.getElementById('goalDetailOverlay');
      if (detailOverlay && detailOverlay.classList.contains('active')) {
          // Ищем обновленную цель в загруженных данных
          const freshGoal = goalsDB.find(g => g.id === targetGoalId);
          if (freshGoal) {
              // Принудительно вызываем открытие деталей с новыми данными
              if (typeof openGoalDetail === 'function') openGoalDetail(targetGoalId);
          }
      }

  } catch (e) {
      console.error('Ошибка сохранения цели:', e);
      if(typeof showToast === 'function') showToast('Ошибка: ' + (e.message || 'Сбой сохранения'));
  } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = oldText;
      }
  }
}

// --- Функции для работы с подцелями ---

function addSubgoal() {
  goalState.subgoals.push({
      id: Date.now(), // временный ID для UI
      title: "",
      deadline: null,
      completed: false
  });
  renderSubgoals();
  updateGoalSummary();
}

function removeSubgoal(id) {
goalState.subgoals = goalState.subgoals.filter(sg => sg.id !== id);
renderSubgoals();
updateGoalSummary();
}

function updateSubgoal(id, field, value) {
  const sg = goalState.subgoals.find(s => s.id === id);
  if(sg) {
      sg[field] = value;
      updateGoalSummary();
  }
}

function renderSubgoals() {
const list = document.getElementById('subgoalsList');
if (!list) return;

if (goalState.subgoals.length === 0) {
    list.innerHTML = '';
    const empty = document.getElementById('subgoalsEmpty');
    if(empty) empty.style.display = 'block';
    return;
}

document.getElementById('subgoalsEmpty').style.display = 'none';

list.innerHTML = goalState.subgoals.map((sg, idx) => {
    // Форматирование даты для кнопки
    let dateDisplay = '📅';
    let dateClass = '';
    if (sg.deadline) {
        try {
            const d = new Date(sg.deadline);
            dateDisplay = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
            dateClass = 'has-date';
        } catch (e) { console.error(e); }
    }

    return `
    <div class="task-item">
        <div class="task-dot"></div>
        <div class="task-card">
            <div class="flow-sub-index">${idx + 1}</div>
            <input type="text" class="flow-sub-input" value="${sg.title}" 
                placeholder="Название этапа"
                oninput="updateSubgoal(${sg.id}, 'title', this.value)">
            
            <div class="flow-sub-date ${dateClass}" 
                 onclick="openSubgoalCalendar(${sg.id})"
                 title="Срок этапа">
                 ${dateDisplay}
            </div>

            <div class="flow-sub-del" onclick="removeSubgoal(${sg.id})">✕</div>
        </div>
    </div>
`}).join('');

updateSubgoalCounter();
}

function openSubgoalCalendar(subgoalId) {
  const subgoal = goalState.subgoals.find(sg => sg.id === subgoalId);
  if (!subgoal) return;
  
  // Добавили 4-й аргумент: { disableMulti: true }
  openCalendar(subgoal.deadline || getToday(), (dateStr) => {
    const [firstDate] = Array.isArray(dateStr) ? dateStr : (dateStr ? [dateStr] : [null]);
    subgoal.deadline = firstDate;
    renderSubgoals();
    updateGoalSummary();
  }, () => {
    subgoal.deadline = null;
    renderSubgoals();
    updateGoalSummary();
  }, { disableMulti: true });
}

function initGoalModalEventListeners() {
  // 1. Закрытие по клику на фон
  const overlay = document.getElementById('goalModalOverlay');
  if(overlay) {
      overlay.addEventListener('click', (e) => {
          if(e.target === overlay) closeGoalModal();
      });
  }
  
  // 2. Ввод названия (обновляет state + автовысота + валидация кнопки)
  const titleIn = document.getElementById('goalTitleInput');
  if(titleIn) {
      titleIn.addEventListener('input', (e) => {
          goalState.title = e.target.value;
          
          // Авто-высота textarea
          e.target.style.height = 'auto'; 
          e.target.style.height = e.target.scrollHeight + 'px';
          
          updateGoalUI();
      });
  }

  // 3. Ввод описания (ИСПРАВЛЕНИЕ: добавленный обработчик)
  const descIn = document.getElementById('goalDescriptionInput');
  if (descIn) {
      descIn.addEventListener('input', (e) => {
          goalState.description = e.target.value;
      });
  }
  
  // 4. Кнопка добавления подцели
  const addBtn = document.getElementById('addSubgoalButton');
  if(addBtn) addBtn.addEventListener('click', addSubgoal);
  
  // 5. Выбор даты (Календарь)
  const dateChip = document.querySelector('#goalModalOverlay .flow-date-chip');
  if (dateChip) {
      dateChip.addEventListener('click', (e) => {
          e.preventDefault(); 
          openCalendar(
              goalState.deadline || getToday(), 
              (dateStr) => { 
                  // onSelect
                  const selected = Array.isArray(dateStr) ? dateStr[0] : dateStr;
                  goalState.deadline = selected;
                  syncDateChip(); 
              }, 
              () => {
                  // onClear
                  goalState.deadline = null;
                  syncDateChip();
              }, 
              { disableMulti: true } // Только одна дата
          );
      });
  }
  
  // 6. Выбор категории
  const catContainer = document.getElementById('goalCategoryChips');
  if(catContainer) {
      catContainer.addEventListener('click', (e) => {
          const chip = e.target.closest('.cat-story');
          if(chip) {
              goalState.category = chip.dataset.category;
              updateGoalUI();
          }
      });
  }
  
  // 7. Аккордеон подцелей (показать/скрыть)
  const toggle = document.getElementById('subgoalsAccordionToggle');
  const content = document.getElementById('subgoalsAccordionContent');
  if(toggle && content) {
      toggle.addEventListener('click', () => {
          content.classList.toggle('active');
          toggle.textContent = content.classList.contains('active') ? '🎯 Скрыть подцели' : '🎯 Добавить подцели';
      });
  }
}

// --- Функции для модалки деталей цели ---

/* --- Исправленная функция: Открытие деталей цели с сортировкой --- */
function openGoalDetail(goalId) {
const goal = goalsDB.find(g => g.id === goalId);
if (!goal) return;

const overlay = document.getElementById('goalDetailOverlay');

// 1. Основная информация (Заголовок, Описание)
document.getElementById('goalDetailTitle').textContent = goal.title;
document.getElementById('goalDescriptionText').textContent = goal.description || "Нет описания";
// --- НОВОЕ: Логика даты создания ---
const createdDateEl = document.getElementById('goalCreatedDateContainer');
if (createdDateEl) {
if (goal.createdAt) {
  const dateObj = new Date(goal.createdAt);
  // Проверяем валидность даты
  if (!isNaN(dateObj.getTime())) {
    const dateStr = dateObj.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    createdDateEl.innerHTML = `<span>📅 Создано ${dateStr}</span>`;
    createdDateEl.style.display = 'block';
  } else {
    createdDateEl.style.display = 'none';
  }
} else {
  createdDateEl.style.display = 'none';
}
}

// 2. Категория (Badge)
const catBadge = document.getElementById('goalCategoryBadge');
if (catBadge) {
const catId = goal.category; 
let catName = 'Другое';
let catIcon = '⭐';

if (typeof profileCategories !== 'undefined') {
    const foundCat = profileCategories.find(c => String(c.id) === String(catId));
    if (foundCat) {
        catName = foundCat.name;
        catIcon = foundCat.icon;
    }
}
catBadge.textContent = `${catIcon} ${catName}`;
}

// 3. СТАТИСТИКА
const deadlineEl = document.getElementById('goalDeadlineStat');
const daysLeftEl = document.getElementById('goalDaysLeftStat');
const subCountEl = document.getElementById('goalSubgoalCountStat');

const checklistCounterEl = document.getElementById('goalSubgoalsCounter');



// 3.1 Дедлайн
if (goal.deadline) {
  const d = new Date(goal.deadline);
  deadlineEl.textContent = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
} else {
  deadlineEl.textContent = 'Нет срока';
}

// 3.2 Дней осталось
if (goal.active && goal.deadline) {
  const now = new Date();
  now.setHours(0,0,0,0);
  const dead = new Date(goal.deadline);
  dead.setHours(0,0,0,0);
  
  const diffTime = dead - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
      daysLeftEl.textContent = Math.abs(diffDays) + ' дн.';
      daysLeftEl.style.color = '#ff6b6b';
      daysLeftEl.nextElementSibling.textContent = 'Просрочено';
  } else {
      daysLeftEl.textContent = diffDays;
      daysLeftEl.style.color = '';
      daysLeftEl.nextElementSibling.textContent = 'Дней ост.';
  }
} else if (!goal.active) {
  daysLeftEl.textContent = '✓';
  daysLeftEl.style.color = '#4ecdc4';
  daysLeftEl.nextElementSibling.textContent = 'Готово';
} else {
  daysLeftEl.textContent = '∞';
  daysLeftEl.nextElementSibling.textContent = 'Без срока';
}

// 3.3 Количество этапов
const totalSub = goal.totalSubgoals || (goal.subgoals ? goal.subgoals.length : 0);
const doneSub = goal.completedSubgoals || (goal.subgoals ? goal.subgoals.filter(s => s.completed).length : 0);


// Обновляем верхний стат-бокс (существующий код)
if (subCountEl) subCountEl.textContent = `${doneSub}/${totalSub}`;

// --- ВСТАВЛЯЕМ СЮДА ОБНОВЛЕНИЕ СЧЕТЧИКА ЧЕК-ЛИСТА ---
if (checklistCounterEl) {
checklistCounterEl.textContent = `${doneSub} из ${totalSub}`;
}

// 4. Прогресс бар
document.getElementById('goalProgressPercent').textContent = `${goal.progress}%`;
document.getElementById('goalProgressValue').textContent = `${doneSub} из ${totalSub} подцелей выполнено`;

const fill = document.getElementById('goalProgressFill');
if(fill) fill.style.width = `${goal.progress}%`;

// Статус бар
const statusEl = document.getElementById('goalStatus');
if (statusEl) {
  if (goal.active) {
      statusEl.className = 'goal-progress-status in-progress';
      statusEl.innerHTML = '<span>⏳</span><span>В процессе</span>';
  } else {
      statusEl.className = 'goal-progress-status achieved';
      statusEl.innerHTML = '<span>🏆</span><span>Достигнута</span>';
  }
}

// 5. Рендер списка подцелей (timeline) с СОРТИРОВКОЙ
const list = document.getElementById('goalSubgoalsList');
if(list && goal.subgoals) {
  
  // --- ЛОГИКА СОРТИРОВКИ ---
  const sortedSubgoals = [...goal.subgoals].sort((a, b) => {
      // 1. Сначала невыполненные (false < true, нам нужно false first)
      if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
      }
      
      // 2. Если статус одинаковый, сортируем по дате (ближайшие сверху)
      // Если даты нет, считаем её "очень далекой" (в конец списка)
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1; 
      if (!b.deadline) return -1;
      
      return new Date(a.deadline) - new Date(b.deadline);
  });
  // -------------------------

  list.innerHTML = sortedSubgoals.map(sg => {
      // Форматируем дату для отображения внутри карточки подцели (опционально)
      let dateStr = '';
      if (sg.deadline) {
         const d = new Date(sg.deadline);
         dateStr = ` • 📅 ${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
      }

      return `
      <div class="goal-timeline-item ${sg.completed ? 'completed' : ''}" onclick="toggleSubgoal(${goal.id}, ${sg.id}, event)">
          <div class="goal-timeline-dot"></div>
          <div class="goal-timeline-card">
             <div class="goal-timeline-info">
                <h4>${sg.title}</h4>
                <span>${sg.completed ? 'Выполнено' : 'В ожидании'}${dateStr}</span>
             </div>
             <div class="timeline-delete-btn" onclick="deleteSubgoalFromGoal(${goal.id}, ${sg.id}, event)">✕</div>
          </div>
      </div>
  `}).join('');
}

// 6. ПРИВЯЗКА КНОПОК

const editBtn = overlay.querySelector('.goal-action-btn.edit');
if(editBtn) editBtn.onclick = () => editGoal(goal.id);

const delBtn = overlay.querySelector('.goal-action-btn.delete');
if(delBtn) delBtn.onclick = () => deleteGoal(goal.id);

const completeBtn = overlay.querySelector('.goal-action-btn.complete');
if(completeBtn) {
  const newBtn = completeBtn.cloneNode(true);
  completeBtn.parentNode.replaceChild(newBtn, completeBtn);
  
  const btnLabel = newBtn.querySelector('span:last-child');
  const btnIcon = newBtn.querySelector('span:first-child');

  if (goal.active) {
      if(btnLabel) btnLabel.textContent = 'Завершить';
      if(btnIcon) btnIcon.textContent = '✓';
      newBtn.onclick = () => completeGoal(goal.id);
  } else {
      if(btnLabel) btnLabel.textContent = 'Вернуть';
      if(btnIcon) btnIcon.textContent = '↺';
      newBtn.onclick = () => reactivateGoal(goal.id);
  }
}

overlay.classList.add('active');
document.body.classList.add('body-modal-open');

if (typeof setFabVisible === 'function') setFabVisible(false);

// Обновляем отступ для стики-описания (если используется)
if (typeof refreshGoalDetailStickyOffset === 'function') {
  refreshGoalDetailStickyOffset();
}
}

function refreshGoalDetailStickyOffset() {
  const detailContent = document.querySelector('.goal-detail-content');
  const descSection = document.getElementById('goalDescriptionSection');

  if (!detailContent) {
    return;
  }

  requestAnimationFrame(() => {
    if (!descSection || window.getComputedStyle(descSection).display === 'none') {
      detailContent.style.setProperty('--goal-desc-sticky-offset', '0px');
      return;
    }

    const offset = descSection.offsetHeight + 6;
    detailContent.style.setProperty('--goal-desc-sticky-offset', `${offset}px`);
  });
}

async function toggleSubgoal(goalId, subgoalId, event) {
  if (event) event.stopPropagation();
  
  const goal = goalsDB.find(g => g.id === goalId);
  if (!goal) return;
  
  const subgoal = goal.subgoals.find(sg => sg.id === subgoalId);
  if (!subgoal) return;
  
  // 1. Оптимистичное обновление UI
  const newStatus = !subgoal.completed;
  const newDate = newStatus ? new Date().toISOString() : null;

  subgoal.completed = newStatus;
  subgoal.completedAt = newDate;

  // Пересчет прогресса локально
  goal.completedSubgoals = goal.subgoals.filter(sg => sg.completed).length;
  goal.progress = goal.totalSubgoals > 0 
    ? Math.round((goal.completedSubgoals / goal.totalSubgoals) * 100) 
    : 0;
  
  // Если прогресс < 100 и цель была завершена, возвращаем её в активные
  if (!goal.active && goal.progress < 100) {
      goal.active = true;
  }

  // Обновляем UI
  updateDashboardCounters();
  openGoalDetail(goalId); // Обновляем модалку деталей
  rerenderGoalsListIfOpen(); // Обновляем список, если открыт

  // 2. ОТПРАВКА В БАЗУ ДАННЫХ (Параллельно обновляем подцель и прогресс родителя)
  try {
      const updates = [
        // А. Обновляем статус подцели
        supabase
          .from('subgoals')
          .update({ 
              completed: newStatus,
              completed_at: newDate
          })
          .eq('id', subgoalId),

        // Б. Обновляем прогресс и статус самой цели
        supabase
          .from('goals')
          .update({
             progress: goal.progress,
             completed: !goal.active // В базе completed=true значит достигнута
          })
          .eq('id', goalId)
      ];

      const results = await Promise.all(updates);
      if (results.some(r => r.error)) throw new Error('DB Error');
      
      console.log(`✅ Подцель и прогресс обновлены в БД`);

  } catch (e) {
      console.error('Ошибка сохранения подцели:', e);
      // Откат изменений UI (упрощенно)
      subgoal.completed = !newStatus;
      showToast('Ошибка синхронизации');
  }
}


async function deleteSubgoalFromGoal(goalId, subgoalId, event) {
  if (event) event.stopPropagation();
  
  const goal = goalsDB.find(g => g.id === goalId);
  if (!goal) return;

  try {
      // 1. Удаление из БД
      const { error } = await supabase
          .from('subgoals')
          .delete()
          .eq('id', subgoalId);

      if (error) throw error;

      // 2. Локальное обновление
      const subIndex = goal.subgoals.findIndex(sg => sg.id === subgoalId);
      if (subIndex > -1) {
          // Сохраняем для Undo
          const subgoal = goal.subgoals[subIndex];
          lastDeletedData = { 
            type: 'subgoal-detail', 
            item: subgoal, 
            index: subIndex,
            goalId: goalId
          };

          goal.subgoals.splice(subIndex, 1);
          
          // Пересчет прогресса
          goal.totalSubgoals = goal.subgoals.length;
          goal.completedSubgoals = goal.subgoals.filter(sg => sg.completed).length;
          goal.progress = goal.totalSubgoals > 0 
             ? Math.round((goal.completedSubgoals / goal.totalSubgoals) * 100) 
             : 0;

          // 3. ВАЖНО: Обновляем прогресс цели в БД, так как общее число этапов изменилось
           await supabase
            .from('goals')
            .update({ progress: goal.progress })
            .eq('id', goalId);

          updateDashboardCounters();
          openGoalDetail(goalId);
          rerenderGoalsListIfOpen();
          showToast('Подцель удалена', true);
      }

  } catch (e) {
      console.error('Ошибка удаления подцели:', e);
      showToast('Не удалось удалить');
  }
}

/* --- Обновленная функция completeGoal в goals.js --- */
async function completeGoal(goalId) {
const goal = goalsDB.find(g => g.id === goalId);
if (!goal) return;

const now = new Date().toISOString();

// 1. Оптимистичное UI обновление
// Сохраняем состояние для отмены (Undo)
const goalSnapshot = JSON.parse(JSON.stringify(goal));
lastDeletedData = { type: 'goal-complete', item: goalSnapshot, index: goalsDB.indexOf(goal) };

// Обновляем локальные данные
if (goal.subgoals) {
    goal.subgoals.forEach(sg => { 
        sg.completed = true; 
        if (!sg.completedAt) sg.completedAt = now;
    });
}
goal.completedSubgoals = goal.totalSubgoals; // Все этапы выполнены
goal.progress = 100;
goal.active = false; // completed
goal.completedAt = now;

// Обновляем UI счетчики на главной
updateDashboardCounters();

// Закрываем модалку деталей
closeGoalDetail();

// Обновляем список, если он открыт
if (typeof rerenderGoalsListIfOpen === 'function') rerenderGoalsListIfOpen();

showToast('🏆 Цель достигнута!', true); // true = показать кнопку отмены

// 2. ОТПРАВКА В БАЗУ ДАННЫХ
try {
    // Обновляем саму цель
    const { error: goalError } = await supabase
        .from('goals')
        .update({ 
            completed: true, 
            completed_at: now,
            progress: 100
        })
        .eq('id', goalId);
    
    if (goalError) throw goalError;

    // Массово обновляем подцели
    await supabase
        .from('subgoals')
        .update({ completed: true, completed_at: now })
        .eq('goal_id', goalId);
        
    console.log('Цель синхронизирована с БД');

} catch (e) {
    console.error('Ошибка завершения цели:', e);
    showToast('Ошибка сохранения');
    // В реальном приложении здесь стоит откатить изменения UI
}
}

async function reactivateGoal(goalId) {
// 1. Находим цель и её индекс
const goalIndex = goalsDB.findIndex(g => g.id === goalId);
if (goalIndex === -1) return;
const goal = goalsDB[goalIndex];

// 2. Убираем нативный confirm. Действуем сразу.
// if (!confirm(`Вернуть цель "${goal.title}" в активные?`)) return;

// 3. Сохраняем состояние ДЛЯ ОТМЕНЫ (Snapshot того, как было "до")
// Сохраняем как 'goal-reactivate', чтобы undoAction знал, что делать (вернуть в завершенные)
lastDeletedData = {
type: 'goal-reactivate',
item: JSON.parse(JSON.stringify(goal)), // Глубокая копия завершенной цели
index: goalIndex
};

// 4. ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ UI
goal.active = true;
goal.completedAt = null;

// Сбрасываем прогресс (логика: начинаем заново или доделываем?)
// Обычно при возврате цели логично сбросить галочки, если она была "завершена" полностью.
if (goal.subgoals) {
  goal.subgoals.forEach(sg => {
      sg.completed = false;
      sg.completedAt = null;
  });
}
goal.completedSubgoals = 0;
goal.progress = 0;

// Обновляем интерфейс
updateDashboardCounters(); // Цифры на главной
closeGoalDetail();         // Закрываем модалку деталей

// Если открыт список целей - перерисовываем его (чтобы цель перепрыгнула в "Активные")
if (typeof rerenderGoalsListIfOpen === 'function') rerenderGoalsListIfOpen();

// Показываем красивый тост с кнопкой ОТМЕНА
showToast('↶ Цель возвращена', true);

// 5. ОТПРАВКА В БАЗУ ДАННЫХ
try {
  // Сброс цели
  const { error: goalError } = await supabase
      .from('goals')
      .update({ 
          completed: false, 
          completed_at: null,
          progress: 0
      })
      .eq('id', goalId);

  if (goalError) throw goalError;

  // Сброс подцелей
  await supabase
      .from('subgoals')
      .update({ completed: false, completed_at: null })
      .eq('goal_id', goalId);

  console.log('✅ Цель реактивирована в БД');

} catch (e) {
  console.error('Ошибка реактивации:', e);
  showToast('Ошибка синхронизации', false);
  // В случае ошибки сети можно откатить изменения локально
  goalsDB[goalIndex] = lastDeletedData.item;
  updateDashboardCounters();
}
}


/* --- Обновленная функция deleteGoal в goals.js --- */
/* --- Обновленная функция deleteGoal (Оптимистичное удаление) --- */
async function deleteGoal(goalId) {
// 1. Убираем confirm для мгновенного действия
// if (!confirm('Удалить эту цель?')) return;

// 2. Находим цель в памяти
const goalIndex = goalsDB.findIndex(g => g.id === goalId);
if (goalIndex === -1) return;
const goalToDelete = goalsDB[goalIndex];

// 3. Сохраняем данные для ОТМЕНЫ (Undo)
// Делаем глубокую копию (JSON), чтобы сохранить массив subgoals неизменным
lastDeletedData = {
  type: 'goal',
  item: JSON.parse(JSON.stringify(goalToDelete)), 
  index: goalIndex
};

try {
  // 4. ОПТИМИСТИЧНОЕ УДАЛЕНИЕ (Сразу обновляем UI)
  
  // А. Удаляем из локального массива
  goalsDB.splice(goalIndex, 1);
  
  // Б. Закрываем детали, если они открыты
  const detailOverlay = document.getElementById('goalDetailOverlay');
  if(detailOverlay) {
      detailOverlay.classList.remove('active');
      document.body.classList.remove('body-modal-open');
      document.body.classList.remove('goal-detail-open');
      // Если есть FAB кнопка, возвращаем её
      if (typeof setFabVisible === 'function') setFabVisible(true);
  }
  
  // В. Обновляем счетчики на главной
  updateDashboardCounters();
  
  // Г. Если открыт список целей — перерисовываем его без этой цели
  if (typeof rerenderGoalsListIfOpen === 'function') {
      rerenderGoalsListIfOpen();
  }

  // Д. Показываем тост с кнопкой ОТМЕНА
  showToast('🗑 Цель удалена', true);
  
  // 5. ОТПРАВКА В БАЗУ ДАННЫХ (Фоновая операция)
  const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId);

  if (error) throw error;
  
  console.log('✅ Цель удалена из БД (подцели удалены каскадно)');
  
} catch (e) {
  console.error('Ошибка удаления:', e);
  showToast('Ошибка удаления', false);
  
  // В случае ошибки возвращаем цель назад
  goalsDB.splice(goalIndex, 0, goalToDelete);
  updateDashboardCounters();
  if (typeof rerenderGoalsListIfOpen === 'function') rerenderGoalsListIfOpen();
}
}

function editGoal(goalId) {
// Закрываем детали
document.getElementById('goalDetailOverlay').classList.remove('active');
// Ставим флаг возврата
goalReturnAfterEdit = true;
goalReturnTargetId = goalId;
// Открываем форму
openGoalModal(goalId);
}



function closeGoalDetail() {
  const overlay = document.getElementById('goalDetailOverlay');
  overlay.classList.remove('active');
  document.body.classList.remove('body-modal-open');
  document.body.classList.remove('goal-detail-open');
  syncFabWithGoalsListState();
}





/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЦЕЛИ - МЕСЯЦ) --- */
/* --- ============================================ --- */

let currentStatsGoalMonthAnchor = new Date();

function initRealGoalStats() {
currentStatsGoalMonthAnchor = new Date();
currentStatsGoalYearAnchor = new Date();

updateGoalMonthStats();
updateGoalYearStats();
updateGoalAllStats(); // <--- Добавили финал
}

function changeGoalMonth(direction) {
currentStatsGoalMonthAnchor.setMonth(currentStatsGoalMonthAnchor.getMonth() + direction);
updateGoalMonthStats();
}

function updateGoalMonthStats() {
const year = currentStatsGoalMonthAnchor.getFullYear();
const month = currentStatsGoalMonthAnchor.getMonth();

// 1. Границы текущего месяца
const start = new Date(year, month, 1);
const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

// 2. Границы прошлого месяца (для дельты)
const prevStart = new Date(year, month - 1, 1);
const prevEnd = new Date(year, month, 0, 23, 59, 59, 999);

// 3. Обновляем заголовок
const titleEl = document.getElementById('statsGoalMonthTitle');
if (titleEl) {
let title = start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
title = title.charAt(0).toUpperCase() + title.slice(1);
titleEl.textContent = title;
}

// 4. Получаем метрики
const currentMetrics = calculateGoalMetricsForPeriod(start, end);
const prevMetrics = calculateGoalMetricsForPeriod(prevStart, prevEnd);

// 5. Обновляем UI
updateGoalMonthUI(currentMetrics, prevMetrics);
}

// Вспомогательная функция расчета метрик целей


function calculateGoalMetricsForPeriod(startDate, endDate) {
  // Safe date parser: returns Date or null
  const parseDate = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  // 1) Достигнутые цели (завершенные ИМЕННО в выбранном периоде)
  const achievedInPeriod = goalsDB.filter(g => {
    const completedAt = parseDate(g.completedAt || g.completed_at);
    if (!completedAt) return false;

    // Цель должна быть завершенной (на всякий случай страхуемся, если active не синхронизирован)
    const isCompleted = (g.active === false) || (g.completed === true);
    if (!isCompleted) return false;

    return completedAt >= startDate && completedAt <= endDate;
  });

  // 2) Активные цели (были "в работе" в любой момент выбранного периода)
  // Правильное условие пересечения интервалов:
  // [createdAt .. completedAt/∞] пересекается с [startDate .. endDate]
  const activeInPeriod = goalsDB.filter(g => {
    const completedAt = parseDate(g.completedAt || g.completed_at);

    // createdAt обязателен для корректного определения "когда цель существовала".
    // Если его нет/битый — делаем безопасный фоллбек:
    // - если цель завершена: считаем что она "появилась" в момент завершения (иначе будем раздувать активность в прошлых годах)
    // - если цель активна и createdAt неизвестен: НЕ учитываем (иначе появятся фантомные активные цели в старых годах)
    let createdAt = parseDate(g.createdAt || g.created_at);
    if (!createdAt) {
      if (completedAt) createdAt = completedAt;
      else return false;
    }

    // Если создана после конца периода — точно не была активна
    if (createdAt > endDate) return false;

    // Если завершена до начала периода — уже была архивной
    if (completedAt && completedAt < startDate) return false;

    // Иначе интервалы пересекаются -> цель была активна в этот период
    return true;
  });

  // 3) Сбор всех уникальных целей для подсчета "Всего подцелей" (объем работы)
  const uniqueGoalsMap = new Map();
  [...achievedInPeriod, ...activeInPeriod].forEach(g => uniqueGoalsMap.set(g.id, g));
  const allInvolvedGoals = Array.from(uniqueGoalsMap.values());

  let totalSubgoals = 0;
  let totalAchievedSubgoalsInPeriod = 0;

  // Считаем общее количество подцелей у вовлеченных целей
  allInvolvedGoals.forEach(g => {
    totalSubgoals += (g.totalSubgoals || 0);

    if (g.subgoals && Array.isArray(g.subgoals)) {
      g.subgoals.forEach(sub => {
        if (!sub.completed) return;

        let subDate = parseDate(sub.completedAt || sub.completed_at);

        // ФОЛЛБЕК: если у подцели нет даты, но цель завершена — берем дату завершения цели
        if (!subDate) {
          const goalCompletedAt = parseDate(g.completedAt || g.completed_at);
          if (goalCompletedAt && (g.active === false || g.completed === true)) {
            subDate = goalCompletedAt;
          }
        }

        if (subDate && subDate >= startDate && subDate <= endDate) {
          totalAchievedSubgoalsInPeriod++;
        }
      });
    }
  });

  return {
    activeCount: activeInPeriod.length,
    achievedCount: achievedInPeriod.length,
    subgoalsTotal: totalSubgoals,
    subgoalsAchieved: totalAchievedSubgoalsInPeriod
  };
}
function updateGoalMonthUI(curr, prev) {
// Активные
document.getElementById('kpiGoalMonthActive').textContent = curr.activeCount;
renderGoalDelta('kpiGoalMonthActiveDelta', calculateGoalDelta(curr.activeCount, prev.activeCount));

// Достигнутые
document.getElementById('kpiGoalMonthAchieved').textContent = curr.achievedCount;
renderGoalDelta('kpiGoalMonthAchievedDelta', calculateGoalDelta(curr.achievedCount, prev.achievedCount));

// Всего подцелей
document.getElementById('kpiGoalMonthSubTotal').textContent = curr.subgoalsTotal;
renderGoalDelta('kpiGoalMonthSubTotalDelta', calculateGoalDelta(curr.subgoalsTotal, prev.subgoalsTotal));

// --- ИЗМЕНЕНИЯ ЗДЕСЬ: Достигнутые подцели ---
const elValue = document.getElementById('kpiGoalMonthSubAchieved');
const elDelta = document.getElementById('kpiGoalMonthSubAchievedDelta');

if (elValue) elValue.textContent = curr.subgoalsAchieved;
if (elDelta) renderGoalDelta('kpiGoalMonthSubAchievedDelta', calculateGoalDelta(curr.subgoalsAchieved, prev.subgoalsAchieved));
}

// Хелпер для дельты (можно переиспользовать из tasks.js, но лучше продублировать или вынести в core, чтобы goals.js был автономным)
function calculateGoalDelta(current, prev) {
if (prev === 0) return current === 0 ? 0 : 100;
return Math.round(((current - prev) / prev) * 100);
}
function renderGoalDelta(elementId, percent) {
const el = document.getElementById(elementId);
if (!el) return;

// 1. Очищаем старые стили перед применением новых
el.classList.remove('up', 'down');
el.style.color = '';
el.style.background = '';
el.style.border = '';
el.style.opacity = '';

if (percent === 0) {
el.textContent = '—';
// Стили для нуля (как в задачах, для единообразия)
el.style.opacity = '0.5';
el.style.background = 'transparent';
el.style.border = '1px solid rgba(255,255,255,0.2)';
el.style.color = 'rgba(255,255,255,0.5)';
} else if (percent > 0) {
el.textContent = `+${percent}%`;
el.classList.add('up');
el.style.opacity = '1';
} else {
el.textContent = `${percent}%`;
el.classList.add('down'); 
el.style.opacity = '1';
}
}

/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЦЕЛИ - ГОД) --- */
/* --- ============================================ --- */

// Якорь года
let currentStatsGoalYearAnchor = new Date();

function changeGoalYear(direction) {
currentStatsGoalYearAnchor.setFullYear(currentStatsGoalYearAnchor.getFullYear() + direction);
updateGoalYearStats();
}

function updateGoalYearStats() {
const year = currentStatsGoalYearAnchor.getFullYear();

// 1. Границы текущего года
const start = new Date(year, 0, 1);
const end = new Date(year, 11, 31, 23, 59, 59, 999);

// 2. Границы прошлого года
const prevStart = new Date(year - 1, 0, 1);
const prevEnd = new Date(year - 1, 11, 31, 23, 59, 59, 999);

// 3. Заголовок
const titleEl = document.getElementById('statsGoalYearTitle');
if (titleEl) {
titleEl.textContent = year;
}

// 4. Метрики KPI
const currentMetrics = calculateGoalMetricsForPeriod(start, end);
const prevMetrics = calculateGoalMetricsForPeriod(prevStart, prevEnd);

// 5. UI KPI
updateGoalYearKPIsUI(currentMetrics, prevMetrics);

// 6. Графики
// Нам нужны именно достигнутые цели для построения графиков по месяцам
const achievedInYear = goalsDB.filter(g => {
if (g.active) return false;
if (!g.completedAt) return false;
const d = new Date(g.completedAt);
return d >= start && d <= end;
});

renderGoalYearCharts(achievedInYear);
}

function updateGoalYearKPIsUI(curr, prev) {
// Активные
document.getElementById('kpiGoalYearActive').textContent = curr.activeCount;
renderGoalDelta('kpiGoalYearActiveDelta', calculateGoalDelta(curr.activeCount, prev.activeCount));

// Достигнутые
document.getElementById('kpiGoalYearAchieved').textContent = curr.achievedCount;
renderGoalDelta('kpiGoalYearAchievedDelta', calculateGoalDelta(curr.achievedCount, prev.achievedCount));

// Всего подцелей
document.getElementById('kpiGoalYearSubTotal').textContent = curr.subgoalsTotal;
renderGoalDelta('kpiGoalYearSubTotalDelta', calculateGoalDelta(curr.subgoalsTotal, prev.subgoalsTotal));

// Достигнутых подцелей
document.getElementById('kpiGoalYearSubAchieved').textContent = curr.subgoalsAchieved;
renderGoalDelta('kpiGoalYearSubAchievedDelta', calculateGoalDelta(curr.subgoalsAchieved, prev.subgoalsAchieved));
}


// --- Рендер графиков года ---
function renderGoalYearCharts() {
// Получаем текущий год из глобального якоря статистики
const targetYear = currentStatsGoalYearAnchor.getFullYear();

// Инициализируем массивы для 12 месяцев
const goalsPerMonth = new Array(12).fill(0);
const subgoalsPerMonth = new Array(12).fill(0);

// Проходим по ВСЕМ целям в базе (локальном кэше)
goalsDB.forEach(g => {

// 1. ЛОГИКА ДЛЯ ЦЕЛЕЙ
// Цель должна быть не активна (достигнута) и иметь дату завершения
if (!g.active && g.completedAt) {
  const d = new Date(g.completedAt);
  // Проверяем, что дата валидна и год совпадает
  if (!isNaN(d.getTime()) && d.getFullYear() === targetYear) {
    goalsPerMonth[d.getMonth()]++;
  }
}

// 2. ЛОГИКА ДЛЯ ПОДЦЕЛЕЙ
if (g.subgoals && Array.isArray(g.subgoals)) {
  g.subgoals.forEach(sub => {
    if (sub.completed) {
      // ВАЖНО: Если у подцели нет своей даты, берем дату завершения цели (fallback)
      // Это чинит график, если цель была завершена "оптом"
      let dateStr = sub.completedAt;
      if (!dateStr && !g.active) {
         dateStr = g.completedAt;
      }

      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime()) && d.getFullYear() === targetYear) {
           subgoalsPerMonth[d.getMonth()]++;
        }
      }
    }
  });
}
});

// Рендерим графики
renderSimpleBarChart('goalsYearChartContainer', goalsPerMonth, 'целей');
renderSimpleBarChart('subgoalsYearChartContainer', subgoalsPerMonth, 'подцелей');
}

// Универсальная функция для рисования простых столбиков (переиспользуем стиль задач)
function renderSimpleBarChart(containerId, dataArray, tooltipSuffix) {
const container = document.getElementById(containerId);
if (!container) return;
container.innerHTML = '';

const maxCount = Math.max(...dataArray, 1);
const monthNames = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'];

dataArray.forEach((count, index) => {
const percent = Math.round((count / maxCount) * 100);
const height = count > 0 ? Math.max(percent, 5) + '%' : '2px';
const opacity = count > 0 ? 1 : 0.3;

const barWrapper = document.createElement('div');
barWrapper.className = 'chart-bar'; // Используем классы из tasks.css
barWrapper.style.height = height;
barWrapper.style.opacity = opacity;
// Меняем цвет для графиков целей на бирюзовый (через CSS style или класс, если нужно)
// barWrapper.style.background = 'linear-gradient(180deg, #4ecdc4 0%, #44a08d 100%)'; 

barWrapper.title = `${monthNames[index]}: ${count} ${tooltipSuffix}`;

const label = document.createElement('div');
label.className = 'chart-label';
label.textContent = monthNames[index];

barWrapper.appendChild(label);
container.appendChild(barWrapper);
});
}


/* --- ============================================ --- */
/* --- ЛОГИКА РЕАЛЬНОЙ СТАТИСТИКИ (ЦЕЛИ - ВСЕ) --- */
/* --- ============================================ --- */

function updateGoalAllStats() {
// 1. KPI по Целям
const totalGoals = goalsDB.length;
const achievedGoals = goalsDB.filter(g => !g.active).length; // active: false значит достигнута

// 2. KPI по Подцелям (Этапам)
let totalSub = 0;
let achievedSub = 0;

goalsDB.forEach(g => {
totalSub += (g.totalSubgoals || 0);

// Считаем реально выполненные, чтобы быть точнее
let completedCount = g.completedSubgoals;
if (typeof completedCount !== 'number' && g.subgoals) {
   completedCount = g.subgoals.filter(s => s.completed).length;
}
achievedSub += (completedCount || 0);
});

// 3. Обновляем UI
const elTotal = document.getElementById('kpiGoalAllTotal');
const elAchieved = document.getElementById('kpiGoalAllAchieved');
const elAchievedNote = document.getElementById('kpiGoalAllAchievedNote');

const elSubTotal = document.getElementById('kpiGoalAllSubTotal');
const elSubAchieved = document.getElementById('kpiGoalAllSubAchieved');
const elSubAchievedNote = document.getElementById('kpiGoalAllSubAchievedNote');

if (elTotal) elTotal.textContent = totalGoals;

if (elAchieved) elAchieved.textContent = achievedGoals;
if (elAchievedNote) {
const percentGoals = totalGoals > 0 ? Math.round((achievedGoals / totalGoals) * 100) : 0;
elAchievedNote.textContent = `${percentGoals}% от всех целей`;
}

if (elSubTotal) elSubTotal.textContent = totalSub;

if (elSubAchieved) elSubAchieved.textContent = achievedSub;
if (elSubAchievedNote) {
const percentSub = totalSub > 0 ? Math.round((achievedSub / totalSub) * 100) : 0;
elSubAchievedNote.textContent = `${percentSub}% от всех этапов`;
}

// 4. Категории для целей
updateCategoryStatsDataForGoalsAll();
}

function updateCategoryStatsDataForGoalsAll() {
const counts = {};
goalsDB.forEach(g => {
const cat = g.category || 'other';
counts[cat] = (counts[cat] || 0) + 1;
});

const newData = Object.keys(counts).map(catId => ({
id: catId,
count: counts[catId]
}));

// Добавляем данные в глобальный объект (определен в tasks.js)
// Используем ключ 'goals-all'
if (typeof categoryStatsData !== 'undefined') {
categoryStatsData['goals-all'] = newData;
}

// Вызываем рендер (функция из tasks.js)
if (typeof renderCategoryStats === 'function') {
renderCategoryStats('goals-all', 'categoryStatsGoalsAll');
}
}
