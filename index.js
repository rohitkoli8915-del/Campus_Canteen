/* Campus Canteen — front-end demo. A production version should store orders
   and authorize staff actions on a server, not in browser localStorage. */

const menu = [
  { id: 1, name: 'Vada Pav', price: 20, category: 'Snacks', description: 'Spiced potato fritter, soft pav and chutney.', image: 'https://bf1af2.akinoncloudcdn.com/products/2025/04/22/363808/ec64a0ec-4851-40da-86ee-38d3aa8a15fe_size3840_cropCenter.jpg' },
  { id: 2, name: 'Samosa', price: 15, category: 'Snacks', description: 'Crispy pastry filled with a flavourful potato mixture.', image: 'https://loremflickr.com/800/500/samosa?lock=21' },
  { id: 3, name: 'Bhel Puri', price: 30, category: 'Snacks', description: 'Tangy puffed-rice chaat with fresh chutneys.', image: 'https://economictimes.indiatimes.com/thumb/msid-99728495,width-640,height-480,resizemode-75,imgsize-85720/bhel-puri.jpg' },
  { id: 4, name: 'Masala Tea', price: 10, category: 'Beverages', description: 'A hot, refreshing cup of Indian masala chai.', image: 'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80' },
  { id: 5, name: 'Idli Vada', price: 40, category: 'Meals', description: 'Soft idlis and crispy vada with sambar and chutney.', image: 'https://media-assets.swiggy.com/swiggy/image/upload/f_auto,q_auto,fl_lossy/d537667dbc8e9d87b1485ef8f92db6ec' },
  { id: 6, name: 'Masala Dosa', price: 60, category: 'Meals', description: 'Crisp dosa filled with seasoned potato masala.', image: 'https://dineout-media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_600,h_468/v1669037563/pz1plv3qopsdgu5lyuuw.jpg' },
  { id: 7, name: 'Veg Thali', price: 90, category: 'Meals', description: 'A complete vegetarian meal with rice, roti and curry.', image: 'https://b.zmtcdn.com/data/pictures/5/19179345/0c6edff360de0a07017370f52559565f_featured_v2.jpg' },
  { id: 8, name: 'Cold Drink', price: 20, category: 'Beverages', description: 'A chilled soft drink served ice-cold.', image: 'https://images.unsplash.com/photo-1617814192855-5bd13c3f0977?auto=format&fit=crop&w=900&q=80' }, 
  { id: 10, name: 'Veg Sandwich', price: 40, category: 'Snacks', description: 'Golden grilled bread with crisp vegetables.', image: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?auto=format&fit=crop&w=900&q=80' }
];

const STORAGE = { cart: 'canteenCart', orders: 'canteenOrders', token: 'canteenToken' };
const STATUS_FLOW = { Pending: 'Preparing', Preparing: 'Ready', Ready: 'Completed' };
const fallbackImage = 'https://placehold.co/800x500/fff0e6/d9480f?text=Food+Image';
let cart = readStorage(STORAGE.cart, []);
let orders = readStorage(STORAGE.orders, []).map(normalizeOrder);
let currentCategory = 'All';
let splitEnabled = false;
let tokenNumber = Number(readStorage(STORAGE.token, 100)) || 100;
let toastTimer;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    showToast('Your browser could not save this change');
  }
}

function normalizeOrder(order) {
  return { ...order, createdAt: order.createdAt || new Date().toISOString(), splitBill: order.splitBill || { enabled: false, people: 1 } };
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value) || 0);
}

function cartTotal() { return cart.reduce((sum, item) => sum + item.price * item.quantity, 0); }
function cartQuantity() { return cart.reduce((sum, item) => sum + item.quantity, 0); }
function saveCart() { writeStorage(STORAGE.cart, cart); }
function saveOrders() { writeStorage(STORAGE.orders, orders); }

function renderMenu() {
  const search = document.querySelector('#searchInput').value.trim().toLowerCase();
  const filtered = menu.filter(item => (currentCategory === 'All' || item.category === currentCategory) && item.name.toLowerCase().includes(search));
  document.querySelector('#menuGrid').innerHTML = filtered.length ? filtered.map(foodCard).join('') : emptyState('⌕', 'No matching food', 'Try a different search or category.', 'Browse all items', 'menu');
}

function foodCard(item) {
  return `<article class="food-card"><div class="image-wrap"><img class="food-image" src="${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" loading="lazy"></div><div class="food-info"><div class="food-meta"><h3>${escapeHTML(item.name)}</h3><span class="food-category">${escapeHTML(item.category)}</span></div><p>${escapeHTML(item.description)}</p><div class="food-bottom"><strong class="price">${formatMoney(item.price)}</strong><button class="add-btn" type="button" data-add="${item.id}">+ Add</button></div></div></article>`;
}

function emptyState(icon, title, message, action = '', target = '') {
  const button = action ? `<a class="btn btn-primary" href="#${target}">${action} →</a>` : '';
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><h3>${title}</h3><p>${message}</p>${button}</div>`;
}

function addToCart(id) {
  const selected = menu.find(item => item.id === id);
  if (!selected) return;
  const existing = cart.find(item => item.id === id);
  existing ? existing.quantity += 1 : cart.push({ ...selected, quantity: 1 });
  saveCart(); renderCart(); showToast(`${selected.name} added to your order`);
}

function changeQuantity(id, amount) {
  const item = cart.find(entry => entry.id === id);
  if (!item) return;
  item.quantity += amount;
  cart = cart.filter(entry => entry.quantity > 0);
  saveCart(); renderCart();
}

function renderCart() {
  const sum = cartTotal();
  document.querySelector('#cartSubtotal').textContent = formatMoney(sum);
  document.querySelector('#cartTotal').textContent = formatMoney(sum);
  document.querySelector('#cartCount').textContent = cartQuantity();
  document.querySelector('#cartItems').innerHTML = cart.length ? cart.map(cartItem).join('') : emptyState('🛒', 'Your cart is waiting', 'Choose something from the menu and it will appear here.', 'Explore menu', 'menu');
  updateSplitBill();
}

function cartItem(item) {
  const name = escapeHTML(item.name);
  return `<article class="cart-item"><img src="${escapeHTML(item.image)}" alt="${name}" loading="lazy"><div class="cart-item-info"><h3>${name}</h3><p>${formatMoney(item.price)} each</p></div><div class="quantity"><button type="button" aria-label="Remove one ${name}" data-change="${item.id}" data-amount="-1">−</button><b>${item.quantity}</b><button type="button" aria-label="Add one ${name}" data-change="${item.id}" data-amount="1">+</button></div></article>`;
}

function updateSplitBill() {
  const people = Number(document.querySelector('#splitPeople').value) || 1;
  document.querySelector('#perPerson').textContent = formatMoney(cartTotal() / people);
}

function placeOrder() {
  if (!Array.isArray(cart) || !cart.length) {
    return showToast("Add something tasty before placing an order");
  }

  if (!Array.isArray(orders)) {
    orders = [];
  }

  tokenNumber += 1;

  const pickup = document.querySelector("#pickupTime").value;
  const people = Number(document.querySelector("#splitPeople").value) || 1;

  const order = {
    id: `order-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    token: `C${tokenNumber}`,
    items: cart.map(item => ({ ...item })),
    total: cartTotal(),
    status: "Pending",
    readyTime: pickup === "ASAP" ? 5 : Number(pickup),
    createdAt: new Date().toISOString(),
    splitBill: {
      enabled: splitEnabled,
      people: splitEnabled ? people : 1
    }
  };

  orders.unshift(order);

  writeStorage(STORAGE.token, tokenNumber);
  saveOrders();

  cart = [];
  saveCart();

  splitEnabled = false;

  document.querySelector("#splitBill").checked = false;
  document.querySelector("#splitBillBox").classList.add("hidden");

  renderCart();
  renderOrders();
  renderStaff();
  updateQueue();

  showToast(`Order placed — your token is ${order.token}`);

  setTimeout(() => {
    document.querySelector("#orders").scrollIntoView({
      behavior: "smooth"
    });
  }, 350);
}


function displayTime(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? 'Recently' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderOrders() {
  document.querySelector('#ordersContainer').innerHTML = orders.length ? orders.map(orderCard).join('') : emptyState('📦', 'No orders yet', 'Your digital tokens will appear here after checkout.');
}

function orderCard(order) {
  const items = order.items.map(item => `${escapeHTML(item.name)} × ${Number(item.quantity)}`).join(' · ');
  const split = order.splitBill.enabled ? `<br>👥 Split among ${Number(order.splitBill.people)} people` : '';
  return `<article class="order-card"><div class="order-header"><div><small>Digital token</small><div class="token">${escapeHTML(order.token)}</div></div><span class="order-status">${escapeHTML(order.status)}</span></div><p class="order-items">${items}${split}</p><div class="order-footer"><div><strong>${formatMoney(order.total)}</strong><br><small>Ordered at ${displayTime(order.createdAt)} · Ready in ~${Number(order.readyTime) || 5} min</small></div><button class="reorder-btn" type="button" data-reorder="${escapeHTML(order.id)}">↻ Order again</button></div></article>`;
}

function reorder(id) {
  const previous = orders.find(order => order.id === id);
  if (!previous) return;
  previous.items.forEach(item => {
    const existing = cart.find(entry => entry.id === item.id);
    existing ? existing.quantity += item.quantity : cart.push({ ...item });
  });
  saveCart(); renderCart(); document.querySelector('#cart').scrollIntoView({ behavior: 'smooth' });
  showToast('Your previous items are in the cart');
}

function updateOrderStatus(id) {
  const order = orders.find(entry => entry.id === id);
  const nextStatus = order && STATUS_FLOW[order.status];
  if (!order || !nextStatus) return;
  order.status = nextStatus;
  saveOrders(); renderOrders(); renderStaff(); updateQueue();
  showToast(`${order.token} is now ${nextStatus.toLowerCase()}`);
}

function renderStaff() {
  document.querySelector('#staffOrders').innerHTML = orders.length ? orders.map(staffCard).join('') : emptyState('👨‍🍳', 'The kitchen is clear', 'New student orders will show up here.');
}

function staffCard(order) {
  const nextStatus = STATUS_FLOW[order.status];
  const action = nextStatus ? `<button type="button" data-next-status="${escapeHTML(order.id)}">Mark ${nextStatus}</button>` : '<small>Order complete</small>';
  const items = order.items.map(item => `${escapeHTML(item.name)} × ${Number(item.quantity)}`).join(' · ');
  return `<article class="staff-order"><div class="staff-order-header"><div><strong>${escapeHTML(order.token)}</strong><p>${items}</p></div><strong>${formatMoney(order.total)}</strong></div><small>Current status: <b>${escapeHTML(order.status)}</b></small><div class="staff-actions">${action}</div></article>`;
}

function updateQueue() {
  const active = orders.filter(order => order.status !== 'Completed');
  const pending = orders.filter(order => order.status === 'Pending');
  const preparing = orders.filter(order => order.status === 'Preparing').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0];
  const ready = orders.filter(order => order.status === 'Ready');
  const traffic = active.length <= 2 ? 'Low' : active.length <= 5 ? 'Moderate' : 'High';
  const wait = Math.max(5, active.length * 3);
  document.querySelector('#currentToken').textContent = preparing ? preparing.token : '—';
  document.querySelector('#pendingCount').textContent = pending.length;
  document.querySelector('#readyCount').textContent = ready.length;
  document.querySelector('#trafficLevel').textContent = traffic;
  document.querySelector('#averageTime').textContent = `About ${wait} minutes`;
  document.querySelector('#homeActiveOrders').textContent = active.length;
  document.querySelector('#homeWaitTime').textContent = `${wait} min`;
  document.querySelector('#heroTraffic').textContent = traffic === 'Low' ? 'Relaxed right now' : `${traffic} traffic`;
  document.querySelector('#trafficBar').style.width = `${traffic === 'Low' ? 25 : traffic === 'Moderate' ? 55 : 85}%`;
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setActiveCategory(button) {
  currentCategory = button.dataset.category;
  document.querySelectorAll('.category').forEach(entry => {
    const selected = entry === button;
    entry.classList.toggle('active', selected);
    entry.setAttribute('aria-selected', selected);
  });
  renderMenu();
}

async function shareBill() {
  if (!cartTotal()) return showToast('Your cart is empty');
  const people = Number(document.querySelector('#splitPeople').value) || 1;
  const text = `Campus Canteen bill: ${formatMoney(cartTotal())} total — ${formatMoney(cartTotal() / people)} each for ${people} people.`;
  try {
    if (navigator.share) await navigator.share({ title: 'Campus Canteen bill', text });
    else if (navigator.clipboard) { await navigator.clipboard.writeText(text); showToast('Bill copied to clipboard'); }
    else showToast('Bill sharing is not available in this browser');
  } catch (error) {
    if (error.name !== 'AbortError') showToast('Could not share the bill');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderMenu(); renderCart(); renderOrders(); renderStaff(); updateQueue();
  document.querySelector('#searchInput').addEventListener('input', renderMenu);
  document.querySelectorAll('.category').forEach(button => button.addEventListener('click', () => setActiveCategory(button)));
  document.querySelector('#splitBill').addEventListener('change', event => {
    splitEnabled = event.target.checked;
    document.querySelector('#splitBillBox').classList.toggle('hidden', !splitEnabled);
    updateSplitBill();
  });
  document.querySelector('#splitPeople').addEventListener('change', updateSplitBill);
  document.querySelector('#placeOrder').addEventListener('click', placeOrder);
  document.querySelector('#shareBill').addEventListener('click', shareBill);
  document.addEventListener('error', event => {
    if (event.target.matches('.food-image, .cart-item img')) {
      event.target.src = fallbackImage;
      event.target.onerror = null;
    }
  }, true);
  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add]');
    const quantityButton = event.target.closest('[data-change]');
    const reorderButton = event.target.closest('[data-reorder]');
    const statusButton = event.target.closest('[data-next-status]');
    if (addButton) addToCart(Number(addButton.dataset.add));
    if (quantityButton) changeQuantity(Number(quantityButton.dataset.change), Number(quantityButton.dataset.amount));
    if (reorderButton) reorder(reorderButton.dataset.reorder);
    if (statusButton) updateOrderStatus(statusButton.dataset.nextStatus);
  });
});
