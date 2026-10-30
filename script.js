
"use strict";
// اتصال به دیتابیس فروشگاه
const SUPABASE_URL = "https://uystisrtgdxccfafpywq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YD1PiOewdGcb-EgijEiRFg_yJyF4Jqo";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* =====================================
   کیف طلایی - مدیریت فروشگاه
   ===================================== */

const STORAGE_KEY = "kif-talayi-products-v1";

const $ = (selector) => document.querySelector(selector);

const productGrid = $("#productGrid");
const emptyState = $("#emptyState");
const productModal = $("#productModal");
const productForm = $("#productForm");
const imageInput = $("#productImage");
const imagePreview = $("#imagePreview");
const previewImg = $("#previewImg");
const toast = $("#toast");

const money = new Intl.NumberFormat("fa-IR");
const categoryNames = {
  "دستی": "کیف دستی",
  "دوشی": "کیف دوشی",
  "مجلسی": "کیف مجلسی",
  "کوله": "کوله‌پشتی",
  "سایر": "سایر"
};

// محصولات نمونه برای شروع کار
const demoProducts = [
  {
    id: "demo-1",
    name: "کیف دستی کلاسیک",
    price: 1250000,
    category: "دستی",
    description: "یک انتخاب شیک برای استفاده روزمره.",
    image: "",
    createdAt: 3
  },
  {
    id: "demo-2",
    name: "کیف دوشی مدرن",
    price: 980000,
    category: "دوشی",
    description: "طراحی ساده و مناسب استایل روزانه.",
    image: "",
    createdAt: 2
  },
  {
    id: "demo-3",
    name: "کیف مجلسی خاص",
    price: 1650000,
    category: "مجلسی",
    description: "انتخابی جذاب برای مهمانی‌ها.",
    image: "",
    createdAt: 1
  }
];

let products = [];
let activeCategory = "همه";
let selectedImage = "";
let toastTimeout;
let isAdminLoggedIn = false;

// بارگذاری محصولات ذخیره‌شده
function loadProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("خواندن محصولات ناموفق بود:", error);
  }

  return demoProducts.map(product => ({ ...product }));
}

// ذخیره محصولات در مرورگر
function saveProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (error) {
    console.error("ذخیره محصولات ناموفق بود:", error);
    showToast("فضای ذخیره‌سازی کافی نیست. عکس کوچک‌تری انتخاب کن.");
    return false;
  }
}

// پیام کوتاه پایین صفحه
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// ساخت عنصر متنی امن
function makeText(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

// نمایش قیمت
function formatPrice(price) {
  return money.format(price) + " تومان";
}

// ساخت کارت محصول
function createProductCard(product, index) {
  const card = document.createElement("article");
  card.className = "product-card";
  card.style.animationDelay = `${Math.min(index, 8) * 45}ms`;

  const imageBox = document.createElement("div");
  imageBox.className = "product-image";

  if (product.image) {
    const image = document.createElement("img");
    image.src = product.image;
    image.alt = product.name;
    image.loading = "lazy";

    image.addEventListener("error", () => {
      image.replaceWith(makeText("div", "image-placeholder", "✦"));
    });

    imageBox.append(image);
  } else {
    imageBox.append(makeText("div", "image-placeholder", "✦"));
  }

  const category = makeText(
    "span",
    "product-category",
    categoryNames[product.category] || "سایر"
  );
  imageBox.append(category);

  const info = document.createElement("div");
  info.className = "product-info";

  info.append(makeText("h3", "product-name", product.name));

  info.append(makeText(
    "p",
    "product-description",
    product.description || "برای اطلاعات بیشتر با فروشگاه تماس بگیرید."
  ));

  const bottom = document.createElement("div");
  bottom.className = "product-bottom";

  const price = document.createElement("div");
  price.className = "product-price";
  price.append(document.createTextNode(formatPrice(product.price)));
  price.append(makeText("small", "", "قیمت نهایی محصول"));

  const actions = document.createElement("div");
  actions.className = "product-actions";

  const editButton = makeText("button", "icon-button", "✎");
  editButton.type = "button";
  editButton.title = "ویرایش محصول";
  editButton.setAttribute("aria-label", `ویرایش ${product.name}`);
  editButton.addEventListener("click", () => openEditModal(product.id));

  const deleteButton = makeText("button", "icon-button delete", "×");
  deleteButton.type = "button";
  deleteButton.title = "حذف محصول";
  deleteButton.setAttribute("aria-label", `حذف ${product.name}`);
  deleteButton.addEventListener("click", () => deleteProduct(product.id));

if (isAdminLoggedIn) {
  actions.append(editButton, deleteButton);
}

if (isAdminLoggedIn) {
  bottom.append(price, actions);
} else {
  bottom.append(price);
}
  info.append(bottom);
  card.append(imageBox, info);

  return card;
}

// نمایش محصولات با توجه به جست‌وجو و فیلتر
function renderProducts() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("fa");

  let filtered = products.filter(product => {
    const searchableText = [
      product.name,
      product.description,
      categoryNames[product.category] || product.category
    ].join(" ").toLocaleLowerCase("fa");

    const matchesSearch = searchableText.includes(query);
    const matchesCategory =
      activeCategory === "همه" || product.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const sort = $("#sortSelect").value;

  if (sort === "cheap") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sort === "expensive") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name, "fa"));
  } else {
    filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  productGrid.replaceChildren();

  filtered.forEach((product, index) => {
    productGrid.append(createProductCard(product, index));
  });

  $("#resultCount").textContent = money.format(filtered.length);
  $("#heroCount").textContent = money.format(products.length);

  emptyState.hidden = filtered.length !== 0;
  productGrid.hidden = filtered.length === 0;
}

// بازکردن فرم برای محصول جدید
function openAddModal() {
  productForm.reset();
  $("#productId").value = "";
  $("#modalTitle").textContent = "افزودن محصول جدید";
  $("#saveProduct").innerHTML = 'ذخیره محصول <span>←</span>';

  selectedImage = "";
  imageInput.value = "";
  imagePreview.hidden = true;
  previewImg.removeAttribute("src");

  productModal.hidden = false;
  document.body.style.overflow = "hidden";
  $("#productName").focus();
}

// بازکردن فرم برای ویرایش محصول
function openEditModal(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;

  productForm.reset();

  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productPrice").value = product.price;
  $("#productCategory").value = product.category;
  $("#productDescription").value = product.description || "";

  $("#modalTitle").textContent = "ویرایش محصول";
  $("#saveProduct").innerHTML = 'ذخیره تغییرات <span>←</span>';

  selectedImage = product.image || "";
  imageInput.value = "";

  if (selectedImage) {
    previewImg.src = selectedImage;
    imagePreview.hidden = false;
  } else {
    imagePreview.hidden = true;
    previewImg.removeAttribute("src");
  }

  productModal.hidden = false;
  document.body.style.overflow = "hidden";
  $("#productName").focus();
}

// بستن فرم
function closeModal() {
  productModal.hidden = true;
  document.body.style.overflow = "";
}

// حذف محصول
function deleteProduct(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;

  const confirmed = window.confirm(
    `محصول «${product.name}» حذف شود؟`
  );

  if (!confirmed) return;

  const previous = products;
  products = products.filter(item => item.id !== id);

  if (!saveProducts()) {
    products = previous;
    return;
  }

  renderProducts();
  showToast("محصول با موفقیت حذف شد.");
}

// انتخاب عکس و تبدیل آن برای ذخیره محلی
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    imageInput.value = "";
    showToast("لطفاً عکس JPG، PNG یا WEBP انتخاب کن.");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    imageInput.value = "";
    showToast("حجم عکس باید کمتر از ۲ مگابایت باشد.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedImage = reader.result;
    previewImg.src = selectedImage;
    imagePreview.hidden = false;
  };

  reader.onerror = () => {
    showToast("خواندن عکس ناموفق بود.");
  };

  reader.readAsDataURL(file);
});

// حذف عکس انتخاب‌شده
$("#removeImage").addEventListener("click", () => {
  selectedImage = "";
  imageInput.value = "";
  previewImg.removeAttribute("src");
  imagePreview.hidden = true;
});

// ذخیره محصول جدید یا ویرایش محصول قبلی
productForm.addEventListener("submit", event => {
  event.preventDefault();

  const name = $("#productName").value.trim();
  const price = Number($("#productPrice").value);
  const category = $("#productCategory").value;
  const description = $("#productDescription").value.trim();
  const id = $("#productId").value;

  if (!name) {
    showToast("نام محصول را وارد کن.");
    return;
  }

  if (
    $("#productPrice").value.trim() === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    showToast("قیمت واردشده معتبر نیست.");
    return;
  }

  const previous = products.map(item => ({ ...item }));
  const existing = id ? products.find(item => item.id === id) : null;

  if (id && !existing) {
    showToast("این محصول دیگر وجود ندارد.");
    return;
  }

  const product = {
    id: existing ? existing.id : (
      window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2)
    ),
    name,
    price,
    category,
    description,
    image: selectedImage,
    createdAt: existing ? existing.createdAt : Date.now()
  };

  if (existing) {
    products = products.map(item => item.id === id ? product : item);
  } else {
    products.unshift(product);
  }

  if (!saveProducts()) {
    products = previous;
    return;
  }

  closeModal();
  renderProducts();
  showToast(existing ? "تغییرات ذخیره شد." : "محصول جدید اضافه شد.");
});

// بازکردن پنل مدیریت
$("#openAdmin").addEventListener("click", openLoginModal);

// بستن پنجره با دکمه‌ها و پس‌زمینه
document.querySelectorAll("[data-close-modal]").forEach(element => {
  element.addEventListener("click", closeModal);
});

// بستن با کلید Escape
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !productModal.hidden) {
    closeModal();
  }
});

// جست‌وجوی زنده
$("#searchInput").addEventListener("input", renderProducts);

// مرتب‌سازی
$("#sortSelect").addEventListener("change", renderProducts);

// انتخاب دسته‌بندی
$("#categories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  activeCategory = button.dataset.category;

  document.querySelectorAll(".category").forEach(categoryButton => {
    categoryButton.classList.toggle("active", categoryButton === button);
  });

  renderProducts();
});

// پاک‌کردن جست‌وجو و فیلتر
$("#clearSearch").addEventListener("click", () => {
  $("#searchInput").value = "";
  activeCategory = "همه";
  $("#sortSelect").value = "newest";

  document.querySelectorAll(".category").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.category === "همه"
    );
  });

  renderProducts();
  $("#products").scrollIntoView({ behavior: "smooth" });
});

// ذرات تزئینی پس‌زمینه
const particleContainer = $("#particles");

for (let i = 0; i < 24; i++) {
  const particle = document.createElement("span");
  particle.className = "particle";
  particle.style.left = `${(i * 37 + 11) % 100}%`;
  particle.style.top = `${(i * 53 + 7) % 100}%`;
  particle.style.animationDelay = `${(i % 9) * -0.8}s`;
  particle.style.animationDuration = `${6 + (i % 7)}s`;
  particleContainer.append(particle);
}


// ورود مدیر فروشگاه
const loginModal = $("#loginModal");
const loginForm = $("#loginForm");

function openLoginModal() {
  loginForm.reset();
  loginModal.hidden = false;
  document.body.style.overflow = "hidden";
  $("#adminEmail").focus();
}

function closeLoginModal() {
  loginModal.hidden = true;
  document.body.style.overflow = "";
}

// بستن پنجره ورود
document.querySelectorAll("[data-close-login]").forEach(element => {
  element.addEventListener("click", closeLoginModal);
});

// بررسی اطلاعات ورود مدیر
loginForm.addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;

  const submitButton = loginForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "در حال بررسی...";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // فقط حساب مدیر اصلی اجازه ورود به پنل دارد
    if (data.user.id !== "6f42f9ba-fae7-42f0-a062-bb3eec8aa99d") {
      await supabaseClient.auth.signOut();
      showToast("این حساب اجازه مدیریت فروشگاه را ندارد.");
      return;
    }

    closeLoginModal();
    showToast("ورود مدیر موفق بود.");
    openAddModal();

  } catch (error) {
    console.error("خطای ورود:", error.message);
    showToast("ایمیل یا رمز عبور اشتباه است.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "ورود به مدیریت ←";
  }
});


// دریافت محصولات از دیتابیس Supabase
async function loadProductsFromDatabase() {
  productGrid.hidden = true;

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("خطای دریافت محصولات:", error.message);
    showToast("دریافت محصولات ناموفق بود.");
    return;
  }

  products = data.map(item => ({
    id: String(item.id),
    name: item.name,
    price: Number(item.price),
    category: item.category,
    description: item.description || "",
    image: item.image || "",
    createdAt: new Date(item.created_at).getTime()
  }));

  renderProducts();
}

// نمایش اولیه فروشگاه
loadProductsFromDatabase();

