/* --- wishes.js --- */

// Глобальные данные
let wishesDB = [];
let currentDesireLevel = 2; // По умолчанию "Хочу"
let isWishEditMode = false;
let editingWishId = null;


// Конфигурация уровней
const DESIRE_LEVELS_CONFIG = [
  { level: 1, icon: '🙂', text: 'Любопытно' },
  { level: 2, icon: '😍', text: 'Хочу' },
  { level: 3, icon: '🤩', text: 'Очень хочу' },
  { level: 4, icon: '🔥', text: 'Безумно хочу' },
  { level: 5, icon: '🛐', text: 'Священная мечта' }
];

// --- Управление Модалкой ---

function openCreateWishModal(wishId = null) {
    // Закрываем меню выбора "Тип создания"
    const choiceOverlay = document.getElementById('createChoiceOverlay');
    if (choiceOverlay) choiceOverlay.classList.remove('active');
  
    const modal = document.getElementById('wishModalOverlay');
    const titleText = document.querySelector('#wishModalOverlay .flow-title');
    const saveBtn = document.getElementById('saveWishButton');

    if (modal) {
        modal.classList.add('active');
        document.body.classList.add('body-modal-open');
    }
    
    const input = document.getElementById('wishTitleInput');

    if (wishId) {
        // РЕЖИМ РЕДАКТИРОВАНИЯ
        isWishEditMode = true;
        editingWishId = wishId;
        const wish = wishesDB.find(w => w.id === wishId);
        
        if (input) input.value = wish.title;
        currentDesireLevel = wish.desire_level;
        if (titleText) titleText.textContent = '✎ ИЗМЕНИТЬ ЖЕЛАНИЕ';
        if (saveBtn) saveBtn.innerHTML = 'Сохранить <span>✨</span>';
    } else {
        // РЕЖИМ СОЗДАНИЯ
        isWishEditMode = false;
        editingWishId = null;
        if (input) input.value = '';
        currentDesireLevel = 2;
        if (titleText) titleText.textContent = '✨ НОВОЕ ЖЕЛАНИЕ';
        if (saveBtn) saveBtn.innerHTML = 'Загадать <span>✨</span>';
    }
    
    renderDesireLevelSelector();
    
    setTimeout(() => { if(input) input.focus(); }, 300);
}

function closeCreateWishModal() {
    const modal = document.getElementById('wishModalOverlay');
    if (modal) {
        modal.classList.remove('active');
        document.body.classList.remove('body-modal-open');
    }
    if (typeof setFabVisible === 'function') setFabVisible(true);
}

function renderDesireLevelSelector() {
    const container = document.getElementById('desireListContainer');
    if (!container) return;
    container.innerHTML = '';
  
    DESIRE_LEVELS_CONFIG.forEach(item => {
      const el = document.createElement('div');
      const isActive = item.level === currentDesireLevel;
      el.className = `chip ${isActive ? 'active' : ''}`;
      
      if (isActive) {
          el.style.borderColor = '#FF9966';
          el.style.background = 'linear-gradient(135deg, rgba(255, 153, 102, 0.25) 0%, rgba(255, 94, 98, 0.2) 100%)';
          el.style.color = '#FF9966';
          el.style.boxShadow = '0 6px 20px rgba(255, 153, 102, 0.35)';
      }
  
      el.innerHTML = `${item.icon} ${item.text}`;
      el.onclick = () => {
        currentDesireLevel = item.level;
        renderDesireLevelSelector();
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(5);
      };
      container.appendChild(el);
    });
}

// --- Работа с БД (Supabase) ---

async function saveNewWish() {
    const titleInput = document.getElementById('wishTitleInput');
    const title = titleInput.value.trim();
    const saveBtn = document.getElementById('saveWishButton');
  
    if (!title) {
      titleInput.classList.add('invalid');
      setTimeout(() => titleInput.classList.remove('invalid'), 500);
      return;
    }
  
    if(saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = 'Сохранение...';
    }
  
    try {
      if (isWishEditMode && editingWishId) {
        // ОБНОВЛЕНИЕ
        const { data, error } = await supabase
          .from('wishes')
          .update({ title: title, desire_level: currentDesireLevel })
          .eq('id', editingWishId)
          .select();
          
        if (error) throw error;
        
        const idx = wishesDB.findIndex(w => w.id === editingWishId);
        if (idx !== -1) wishesDB[idx] = data[0];
        showToast('Желание обновлено');
      } else {
        // СОЗДАНИЕ
        const newWish = {
          user_id: CURRENT_USER_ID,
          title: title,
          desire_level: currentDesireLevel,
          created_at: new Date().toISOString()
        };
        const { data, error } = await supabase.from('wishes').insert([newWish]).select();
        if (error) throw error;
        wishesDB.unshift(data[0]);
        showToast('✨ Желание загадано!');
      }
      
      updateWishCounters();
      renderWishesList(currentWishesFilter);
      closeCreateWishModal();
      
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Не удалось сохранить. Проверьте интернет.');
    } finally {
        if(saveBtn) saveBtn.disabled = false;
    }
}

// --- Управление списком желаний ---

let currentWishesFilter = 'active';

function openWishes(state) {
    currentWishesFilter = state;
    const listOverlay = document.getElementById('listModalOverlay');
    const listTitle = document.getElementById('listModalTitle');
  
    if (!listOverlay || !listTitle) return;
  
    listTitle.textContent = state === 'achieved' ? '🌟 Исполненные мечты' : '🧞 Мои желания';
  
    // Прячем лишние кнопки хедера (от задач/целей)
    ['filterToggleButton', 'searchToggleButton', 'goalCreateButton'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
  
    renderWishesList(state);
    listOverlay.classList.add('active');
    document.body.classList.add('body-modal-open');
  
    // ИСПРАВЛЕНИЕ: Меняем false на true, чтобы кнопка "+" не пропадала
    if (typeof setFabVisible === 'function') setFabVisible(true); 
  }

function renderWishesList(filter) {
  const listContent = document.getElementById('listModalContent');
  if (!listContent) return;

  const filtered = wishesDB.filter(w => filter === 'achieved' ? !!w.achieved_at : !w.achieved_at);

  if (filtered.length === 0) {
    listContent.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">${filter === 'achieved' ? '✨' : '🧞'}</div>
        <div class="empty-state-text">${filter === 'achieved' ? 'Пока нет исполненных мечт' : 'Список желаний пуст'}</div>
    </div>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  listContent.innerHTML = filtered.map((wish, index) => createWishCardHTML(wish, index)).join('');
  
  // Инициализируем свайпы после рендера
  initSwipeForWishes();
}

function createWishCardHTML(wish, index) {
  const levelCfg = DESIRE_LEVELS_CONFIG.find(l => l.level === wish.desire_level) || DESIRE_LEVELS_CONFIG[1];
  const isAchieved = !!wish.achieved_at;
  const wishColor = '#FF9966';
  
  // Иконка свайпа (как у задач)
  const swipeIconPath = isAchieved 
    ? 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z' 
    : 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';

  return `
    <div class="task-item swipe-wrapper wish-item ${isAchieved ? 'completed' : ''}" 
         style="animation-delay: ${index * 0.05}s" 
         data-wish-id="${wish.id}"
         onclick="editWish(${wish.id}, event)">

      <div class="swipe-actions">
        <div class="action-bg action-left ${isAchieved ? 'return-action' : ''}">
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

      <div class="task-card" style="--color: ${wishColor};">
        <div class="task-indicator"></div>
        <div class="task-content">
          <div class="task-header-row">
            <div>
              <div class="task-title">${wish.title}</div>
              <div class="task-meta">
                <span class="badge" style="color: ${wishColor}; border-color: ${wishColor}40; background: ${wishColor}10;">
                  ${levelCfg.icon} ${levelCfg.text}
                </span>
                <span class="badge">📅 ${formatDate(wish.created_at)}</span>
                ${isAchieved ? `<span class="badge" style="color:#a8ff78">🌟 ${formatDate(wish.achieved_at)}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function editWish(id, event) {
    if (event) event.stopPropagation();
    openCreateWishModal(id);
}

// --- Свайп логика (адаптировано из tasks.js) ---

function initSwipeForWishes() {
    const wrappers = document.querySelectorAll('.wish-item.swipe-wrapper');
    wrappers.forEach(wrapper => {
        if (!wrapper._swipeInstance) wrapper._swipeInstance = new SwipeableWishItem(wrapper);
    });
}

class SwipeableWishItem {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.card = wrapper.querySelector('.task-card');
        this.bgLeft = wrapper.querySelector('.action-left');
        this.bgRight = wrapper.querySelector('.action-right');
        this.iconCheck = wrapper.querySelector('.icon-check');
        this.iconTrash = wrapper.querySelector('.icon-trash');

        this.startX = 0; this.currentX = 0;
        this.isDragging = false; this.triggerPoint = 120;
        this.initEvents();
    }

    initEvents() {
        this.card.addEventListener('touchstart', (e) => this.start(e), { passive: true });
        this.card.addEventListener('touchmove', (e) => this.move(e));
        this.card.addEventListener('touchend', () => this.end());
        this.card.addEventListener('mousedown', (e) => this.start(e));
        window.addEventListener('mousemove', (e) => this.move(e));
        window.addEventListener('mouseup', () => this.end());
    }

    start(e) {
        this.startX = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        this.isDragging = true;
        this.wrapper.classList.add('is-dragging');
    }

    move(e) {
        if (!this.isDragging) return;
        const x = e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        const deltaX = x - this.startX;
        this.currentX = deltaX / (1 + Math.abs(deltaX) / 300);
        this.card.style.transform = `translateX(${this.currentX}px)`;
        this.updateVisuals(this.currentX);
    }

    updateVisuals(offset) {
        const progress = Math.min(Math.abs(offset) / this.triggerPoint, 1);
        [this.bgLeft, this.bgRight].forEach(el => { el.style.opacity = '0'; el.style.zIndex = '-1'; });
        
        if (offset > 0) {
            this.bgLeft.style.zIndex = '1'; this.bgLeft.style.opacity = '1';
            this.iconCheck.style.transform = `scale(${0.5 + progress * 0.7})`;
        } else if (offset < 0) {
            this.bgRight.style.zIndex = '1'; this.bgRight.style.opacity = '1';
            this.iconTrash.style.transform = `scale(${0.5 + progress * 0.7})`;
        }
    }

    end() {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.wrapper.classList.remove('is-dragging');

        const wishId = parseInt(this.wrapper.dataset.wishId, 10);
        if (this.currentX > this.triggerPoint) {
            toggleWishStatus(wishId);
        } else if (this.currentX < -this.triggerPoint) {
            deleteWish(wishId);
        }
        this.reset();
    }

    reset() {
        this.currentX = 0;
        this.card.style.transform = 'translateX(0)';
    }
}

async function toggleWishStatus(id) {
  const wish = wishesDB.find(w => w.id === id);
  if (!wish) return;

  const isExecuting = !wish.achieved_at;
  const newAchievedAt = isExecuting ? new Date().toISOString() : null;

  try {
    wish.achieved_at = newAchievedAt;
    updateWishCounters();
    renderWishesList(currentWishesFilter);

    const { error } = await supabase.from('wishes').update({ achieved_at: newAchievedAt }).eq('id', id);
    if (error) throw error;
    
    showToast(isExecuting ? '✨ Желание сбылось!' : 'Желание возвращено');
    if (window.navigator.vibrate) window.navigator.vibrate(20);

  } catch (e) {
    console.error('Error toggling wish:', e);
    renderWishesList(currentWishesFilter);
    showToast('Ошибка сохранения');
  }
}

async function deleteWish(id) {
    const wishIndex = wishesDB.findIndex(w => w.id === id);
    if (wishIndex === -1) return;
  
    const wishToDelete = wishesDB[wishIndex];
  
    // 1. Сохраняем данные для восстановления (Undo)
    lastDeletedData = {
      type: 'wish',
      item: { ...wishToDelete },
      index: wishIndex
    };
  
    try {
      // 2. Оптимистичное удаление из локальной памяти
      wishesDB.splice(wishIndex, 1);
      
      // 3. Обновляем счетчики и список мгновенно
      updateWishCounters();
      renderWishesList(currentWishesFilter);
      
      // 4. Показываем тост с кнопкой "Отмена"
      showToast('🗑 Желание удалено', true);
  
      // 5. Удаляем из Supabase
      const { error } = await supabase
        .from('wishes')
        .delete()
        .eq('id', id);
  
      if (error) throw error;
      console.log(`✅ Желание ${id} удалено из БД`);
  
    } catch (e) {
      console.error('Ошибка при удалении желания:', e);
      showToast('Не удалось удалить');
      
      // Откат при ошибке
      wishesDB.splice(wishIndex, 0, wishToDelete);
      updateWishCounters();
      renderWishesList(currentWishesFilter);
    }
}

async function fetchWishes() {
  try {
    const { data, error } = await supabase
      .from('wishes')
      .select('*')
      .eq('user_id', CURRENT_USER_ID)
      .order('created_at', { ascending: false });
    if (error) throw error;
    wishesDB = data || [];
    updateWishCounters();
  } catch (e) { console.error('Error fetching wishes', e); }
}

function updateWishCounters() {
  const activeCount = wishesDB.filter(w => !w.achieved_at).length;
  const achievedCount = wishesDB.filter(w => w.achieved_at).length;
  const elActive = document.getElementById('countWishesActive');
  const elAchieved = document.getElementById('countWishesAchieved');
  if (elActive) elActive.textContent = activeCount;
  if (elAchieved) elAchieved.textContent = achievedCount;
}