let services = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchServices();
  loadUser();
});

async function fetchServices() {
  try {
    const res = await fetch('/api/services');
    services = await res.json();
    populateServicesUI();
  } catch (err) {
    console.error('Failed to load services:', err);
  }
}

function populateServicesUI() {
  const container = document.getElementById('servicesContainer');
  const priceSelect = document.getElementById('priceService');
  const orderSelect = document.getElementById('orderService');

  container.innerHTML = '';
  priceSelect.innerHTML = '';
  orderSelect.innerHTML = '';

  services.forEach(s => {
    // Services cards
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <h3>${s.name}</h3>
      <p style="color: var(--gray-text); font-size: 0.9rem; margin: 0.5rem 0;">Starting at ₹${s.unitPrice}/unit</p>
      <button class="btn btn-outline" style="width:100%; margin-top:0.8rem;" onclick="selectService('${s.id}')">Select</button>
    `;
    container.appendChild(card);

    // Dropdown options
    priceSelect.add(new Option(s.name, s.id));
    orderSelect.add(new Option(s.name, s.id));
  });

  calculatePrice();
}

function calculatePrice() {
  const serviceId = document.getElementById('priceService').value;
  const qty = parseInt(document.getElementById('priceQuantity').value) || 0;
  const service = services.find(s => s.id === serviceId);

  if (service) {
    let total = service.unitPrice * qty;
    if (qty >= 1000) total *= 0.85; // 15% discount
    document.getElementById('priceResult').innerText = `₹${Math.round(total).toLocaleString('en-IN')}`;
  }
}

function selectService(id) {
  document.getElementById('orderService').value = id;
  document.getElementById('priceService').value = id;
  calculatePrice();
  document.getElementById('order').scrollIntoView({ behavior: 'smooth' });
}

// User Profile logic
function saveUser(e) {
  e.preventDefault();
  const user = {
    name: document.getElementById('authName').value,
    phone: document.getElementById('authPhone').value,
    email: document.getElementById('authEmail').value
  };
  localStorage.setItem('sbipUser', JSON.stringify(user));
  loadUser();
  closeAuthModal();
}

function loadUser() {
  const userRaw = localStorage.getItem('sbipUser');
  if (userRaw) {
    const user = JSON.parse(userRaw);
    document.getElementById('userChip').innerText = `👤 ${user.name}`;
    document.getElementById('authBtn').innerText = 'Logout';
    document.getElementById('authBtn').onclick = logout;

    // Fill form fields
    if (document.getElementById('orderCustomerName')) document.getElementById('orderCustomerName').value = user.name;
    if (document.getElementById('orderPhone')) document.getElementById('orderPhone').value = user.phone;
    if (document.getElementById('orderEmail')) document.getElementById('orderEmail').value = user.email || '';
  } else {
    document.getElementById('userChip').innerText = '';
    document.getElementById('authBtn').innerText = 'Login / Register';
    document.getElementById('authBtn').onclick = openAuthModal;
  }
}

function logout() {
  localStorage.removeItem('sbipUser');
  loadUser();
}

function openAuthModal() {
  document.getElementById('authModal').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
}

// Submit Order
async function submitOrder(e) {
  e.preventDefault();
  const form = document.getElementById('orderForm');
  const formData = new FormData(form);
  const msg = document.getElementById('orderMessage');

  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      msg.style.color = '#4ade80';
      msg.innerText = `Order submitted! Tracking ID: ${data.order.id}`;
      form.reset();
      loadUser();
    }
  } catch (err) {
    msg.style.color = '#ef4444';
    msg.innerText = 'Error submitting order. Please try again.';
  }
}

// Track Order
async function trackOrder(e) {
  e.preventDefault();
  const id = document.getElementById('trackId').value;
  const result = document.getElementById('trackResult');

  try {
    const res = await fetch(`/api/orders/track/${id}`);
    const data = await res.json();

    if (data.success) {
      const o = data.order;
      result.innerHTML = `
        <div style="background: var(--dark); padding: 1rem; border-radius: 8px;">
          <p><strong>Order ID:</strong> ${o.id}</p>
          <p><strong>Customer:</strong> ${o.customerName}</p>
          <p><strong>Service:</strong> ${o.service} (${o.quantity} units)</p>
          <p><strong>Status:</strong> <span style="color: var(--cyan); font-weight: bold;">${o.status}</span></p>
        </div>
      `;
    } else {
      result.innerHTML = `<p style="color: #ef4444;">${data.message}</p>`;
    }
  } catch (err) {
    result.innerHTML = `<p style="color: #ef4444;">Error fetching tracking info.</p>`;
  }
}