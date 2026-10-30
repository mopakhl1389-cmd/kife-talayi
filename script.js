"use strict";

// تنظیمات Supabase
const SUPABASE_URL = "https://uystisrtgdxccfafpywq.supabase.co";

// کلید عمومی قبلی خودت را اینجا قرار بده
const SUPABASE_PUBLISHABLE_KEY = "کلید_عمومی_قبلی_خودت";

const ADMIN_UID = "6f42f9ba-fae7-42f0-a062-bb3eec8aa99d";
const BUCKET = "product-images";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const $ = selector => document.querySelector(selector);
const money = new Intl.NumberFormat("fa-IR");

const productGrid = $("#productGrid");
const productModal = $("#productModal");
const productForm = $("#productForm");
const loginModal = $("#loginModal");
const toast = $("#toast");

let products = [];
let activeCategory = "همه";
let favoritesOnly = false;
let favorites = JSON.parse(localStorage.getItem("golden-favorites") || "[]");
let isAdminLoggedIn = false;
let selectedFiles = [];
let currentImages = [];
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function formatPrice(price) {
  return money.format(Number(price) || 0) + " تومان";
}

function getImages(product) {
  if (Array.isArray(product.images) && product.images.length) {
    return product.images;
  }
  if (product.image) return [product.image];
  return [];
}

function saveFavorites() {
  localStorage.setItem("golden-favorites", JSON.stringify(favorites));
}

function closeProductModal() {
  productModal.hidden = true;
  document.body.style.overflow = "";
}

function closeLoginModal() {
  loginModal.hidden = true;
  document.body.style.overflow = "";
}

function openLoginModal() {
  loginModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function openProductModal() {
  productModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function updateAdminButton() {
  const button = $("#openAdmin");
  button.textContent = isAdminLoggedIn ? "خروج مدیر" : "⚙ مدیریت";
}

async function loadProductsFromDatabase() {
  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("دریافت محصولات ناموفق بود.");
    return;
  }

  products = (data || []).map(item => ({
    ...item,
    id: String(item.id),
    images: Array.isArray(item.images) ? item.images : [],
    image: item.image || "",
    createdAt: new Date(item.created_at).getTime()
  }));

  renderProducts();
}

function createProductCard(product) {
  const card = document.createElement("article");
  card.className = "product-card";

  const gallery = document.createElement("div");
  gallery.className = "product-gallery";

  const images = getImages(product);
  let imageIndex = 0;

  const image = document.createElement("img");
  image.className = "product-image";
  image.alt = product.name;
  image.loading = "lazy";

  if (images.length) {
    image.src = images[0];
  } else {
    image.alt = "عکسی برای این محصول ثبت نشده است";
    image.style.objectFit = "contain";
  }

  gallery.append(image);

  if (images.length > 1) {
    const controls = document.createElement("div");
    controls.className = "gallery-controls";

    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "›";

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "‹";

    previous.addEventListener("click", () => {
      imageIndex = (imageIndex - 1 + images.length) % images.length;
      image.src = images[imageIndex];
    });

    next.addEventListener("click", () => {
      imageIndex = (imageIndex + 1) % images.length;
      image.src = images[imageIndex];
    });

    controls.append(previous, next);
    gallery.append(controls);
  }

  const discount = Number(product.discount) || 0;

  if (discount > 0) {
    const badge = document.createElement("span");
    badge.className = "discount-badge";
    badge.textContent = `${money.format(discount)}٪ تخفیف`;
    gallery.append(badge);
  }

  const favorite = document.createElement("button");
  favorite.type = "button";
  favorite.className = "favorite-button";
  favorite.textContent = favorites.includes(product.id) ? "♥" : "♡";
  favorite.classList.toggle("active", favorites.includes(product.id));
  favorite.setAttribute("aria-label", "افزودن به علاقه‌مندی‌ها");

  favorite.addEventListener("click", () => {
    if (favorites.includes(product.id)) {
      favorites = favorites.filter(id => id !== product.id);
    } else {
      favorites.push(product.id);
    }

    saveFavorites();
    renderProducts();
  });

  gallery.append(favorite);

  const info = document.createElement("div");
  info.className = "product-info";

  const title = document.createElement("h3");
  title.textContent = product.name;

  const description = document.createElement("p");
  description.textContent = product.description || "برای اطلاعات بیشتر پیام بده.";

  const price = document.createElement("div");
  price.className = "product-price";

  const finalPrice = Number(product.price) * (100 - discount) / 100;
  price.textContent = formatPrice(finalPrice);

  if (discount > 0) {
    const oldPrice = document.createElement("span");
    oldPrice.className = "old-price";
    oldPrice.textContent = formatPrice(product.price);
    price.append(oldPrice);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const order = document.createElement("a");
  order.className = "button";
  order.textContent = "سفارش در ایتا";
  order.href = "https://web.eitaa.com/#@Abediny1365";
  order.target = "_blank";
  order.rel = "noopener";

  actions.append(order);

  const call = document.createElement("a");
  call.className = "button secondary";
  call.textContent = "تماس";
  call.href = "tel:09126531424";
  actions.append(call);

  info.append(title, description, price, actions);

  if (isAdminLoggedIn) {
    const adminActions = document.createElement("div");
    adminActions.className = "admin-actions";

    const edit = document.createElement("button");
    edit.className = "button secondary";
    edit.type = "button";
    edit.textContent = "ویرایش";
    edit.addEventListener("click", () => openEditModal(product));

    const remove = document.createElement("button");
    remove.className = "button secondary";
    remove.type = "button";
    remove.textContent = "حذف";
    remove.addEventListener("click", () => deleteProduct(product.id));

    adminActions.append(edit, remove);
    info.append(adminActions);
  }

  card.append(gallery, info);
  return card;
}

function renderProducts() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("fa");

  let filtered = products.filter(product => {
    const text = [
      product.name,
      product.description,
      product.category
    ].join(" ").toLocaleLowerCase("fa");

    const matchesSearch = text.includes(query);
    const matchesCategory =
      activeCategory === "همه" || product.category === activeCategory;
    const matchesFavorite =
      !favoritesOnly || favorites.includes(product.id);

    return matchesSearch && matchesCategory && matchesFavorite;
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

  filtered.forEach(product => {
    productGrid.append(createProductCard(product));
  });

  $("#resultCount").textContent = money.format(filtered.length);
  $("#heroCount").textContent = money.format(products.length);

  $("#emptyState").hidden = filtered.length > 0;
  productGrid.hidden = filtered.length === 0;
}

function resetProductForm() {
  productForm.reset();
  $("#productId").value = "";
  $("#productDiscount").value = "0";
  $("#modalTitle").textContent = "افزودن محصول";
  selectedFiles = [];
  currentImages = [];
  $("#adminImagePreview").replaceChildren();
  $("#productImages").value = "";
}

function openEditModal(product) {
  resetProductForm();

  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productPrice").value = product.price;
  $("#productDiscount").value = product.discount || 0;
  $("#productCategory").value = product.category;
  $("#productDescription").value = product.description || "";
  $("#modalTitle").textContent = "ویرایش محصول";

  currentImages = getImages(product).slice();

  currentImages.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "عکس فعلی محصول";
    $("#adminImagePreview").append(img);
  });

  openProductModal();
}

async function uploadImages(files) {
  const uploadedUrls = [];

  for (const file of files) {
    const extension = file.name.split(".").pop().toLowerCase();
    const path = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { error } = await supabaseClient.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (error) throw error;

    const { data } = supabaseClient.storage
      .from(BUCKET)
      .getPublicUrl(path);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

$("#productImages").addEventListener("change", event => {
  const files = Array.from(event.target.files || []);

  if (files.length > 5) {
    showToast("حداکثر ۵ عکس انتخاب کن.");
    event.target.value = "";
    selectedFiles = [];
    return;
  }

  const allowed = ["image/jpeg", "image/png", "image/webp"];

  for (const file of files) {
    if (!allowed.includes(file.type)) {
      showToast("فقط عکس JPG، PNG یا WEBP انتخاب کن.");
      event.target.value = "";
      selectedFiles = [];
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("حجم هر عکس باید کمتر از ۲ مگابایت باشد.");
      event.target.value = "";
      selectedFiles = [];
      return;
    }
  }

  selectedFiles = files;
  $("#adminImagePreview").replaceChildren();

  files.forEach(file => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.alt = "پیش‌نمایش عکس جدید";
    $("#adminImagePreview").append(img);
  });
});

productForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdminLoggedIn) {
    showToast("ابتدا وارد حساب مدیر شو.");
    return;
  }

  const id = $("#productId").value;
  const name = $("#productName").value.trim();
  const price = Number($("#productPrice").value);
  const discount = Number($("#productDiscount").value);
  const category = $("#productCategory").value;
  const description = $("#productDescription").value.trim();
  const saveButton = $("#saveProduct");

  if (!name || !Number.isFinite(price) || price < 0) {
    showToast("نام و قیمت محصول را درست وارد کن.");
    return;
  }

  if (!Number.isFinite(discount) || discount < 0 || discount > 99) {
    showToast("تخفیف باید بین صفر تا ۹۹ باشد.");
    return;
  }

  if (selectedFiles.length && currentImages.length + selectedFiles.length > 5) {
    showToast("مجموع عکس‌های محصول نباید بیشتر از ۵ تا باشد.");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "در حال ذخیره...";

  try {
    let images = currentImages.slice();

    if (selectedFiles.length) {
      const uploaded = await uploadImages(selectedFiles);
      images = uploaded;
    }

    const productData = {
      name,
      price,
      discount,
      category,
      description,
      images,
      image: images[0] || ""
    };

    let result;

    if (id) {
      result = await supabaseClient
        .from("products")
        .update(productData)
        .eq("id", Number(id))
        .select()
        .single();
    } else {
      result = await supabaseClient
        .from("products")
        .insert(productData)
        .select()
        .single();
    }

    if (result.error) throw result.error;

    await loadProductsFromDatabase();
    closeProductModal();
    showToast(id ? "تغییرات ذخیره شد." : "محصول جدید اضافه شد.");
    resetProductForm();

  } catch (error) {
    console.error("خطای ذخیره محصول:", error);
    showToast("ذخیره ناموفق بود: " + (error.message || "خطای نامشخص"));
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "ذخیره محصول";
  }
});

async function deleteProduct(id) {
  if (!isAdminLoggedIn) {
    showToast("ابتدا وارد حساب مدیر شو.");
    return;
  }

  const product = products.find(item => item.id === id);
  if (!product) return;

  if (!confirm(`محصول «${product.name}» حذف شود؟`)) return;

  const { error } = await supabaseClient
    .from("products")
    .delete()
    .eq("id", Number(id));

  if (error) {
    console.error(error);
    showToast("حذف محصول ناموفق بود.");
    return;
  }

  products = products.filter(item => item.id !== id);
  renderProducts();
  showToast("محصول حذف شد.");
}

// ورود مدیر
$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const email = $("#adminEmail").value.trim();
  const password = $("#adminPassword").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast("ایمیل یا رمز عبور اشتباه است.");
    return;
  }

  if (data.user.id !== ADMIN_UID) {
    await supabaseClient.auth.signOut();
    showToast("این حساب اجازه مدیریت فروشگاه را ندارد.");
    return;
  }

  isAdminLoggedIn = true;
  closeLoginModal();
  updateAdminButton();
  renderProducts();
  showToast("ورود مدیر موفق بود.");
  openProductModal();
});

// بررسی نشست قبلی مدیر
async function checkAdminSession() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;

  if (user && user.id === ADMIN_UID) {
    isAdminLoggedIn = true;
  } else {
    isAdminLoggedIn = false;
  }

  updateAdminButton();
  renderProducts();
}

$("#openAdmin").addEventListener("click", async () => {
  if (isAdminLoggedIn) {
    await supabaseClient.auth.signOut();
    isAdminLoggedIn = false;
    updateAdminButton();
    renderProducts();
    showToast("از حساب مدیر خارج شدی.");
  } else {
    openLoginModal();
  }
});

// بستن پنجره‌ها
document.querySelectorAll("[data-close-modal]").forEach(button => {
  button.addEventListener("click", closeProductModal);
});

document.querySelectorAll("[data-close-login]").forEach(button => {
  button.addEventListener("click", closeLoginModal);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeProductModal();
    closeLoginModal();
  }
});

// جست‌وجو و مرتب‌سازی
$("#searchInput").addEventListener("input", renderProducts);
$("#sortSelect").addEventListener("change", renderProducts);

$("#categories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  activeCategory = button.dataset.category;

  document.querySelectorAll(".category").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  renderProducts();
});

$("#favoritesFilter").addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  $("#favoritesFilter").textContent = favoritesOnly
    ? "نمایش همه محصولات"
    : "♡ علاقه‌مندی‌ها";

  renderProducts();
});

$("#clearSearch").addEventListener("click", () => {
  $("#searchInput").value = "";
  activeCategory = "همه";
  favoritesOnly = false;
  $("#sortSelect").value = "newest";
  $("#favoritesFilter").textContent = "♡ علاقه‌مندی‌ها";

  document.querySelectorAll(".category").forEach(item => {
    item.classList.toggle("active", item.dataset.category === "همه");
  });

  renderProducts();
});

// شروع فروشگاه
async function startStore() {
  await checkAdminSession();
  await loadProductsFromDatabase();
}

startStore();
