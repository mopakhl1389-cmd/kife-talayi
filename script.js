
"use strict";

// تنظیمات Supabase
const SUPABASE_URL = "https://uystisrtgdxccfafpywq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YD1PiOewdGcb-EgijEiRFg_yJyF4Jqo";
const ADMIN_UID = "6f42f9ba-fae7-42f0-a062-bb3eec8aa99d";
const BUCKET = "product-images";

const EITAA_LINK = "https://eitaa.com/KIF_TALAYY";

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

// پیام اطلاع‌رسانی
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "قیمت: ــ";
  }
  return money.format(Number(price)) + " تومان";
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

// مدیریت پنجره‌ها
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

// وضعیت مدیر
function updateAdminButton() {
  const button = $("#openAdmin");
  button.textContent = isAdminLoggedIn ? "خروج مدیر" : "⚙ مدیریت";

  const addButton = $("#addProductBtn");
  if (addButton) {
    addButton.hidden = !isAdminLoggedIn;
      const reviewsButton = $("#manageReviewsBtn");
  if (reviewsButton) {
    reviewsButton.hidden = !isAdminLoggedIn;
  }
  }
}

// دریافت محصولات
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

// ساخت کارت محصول
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
  image.style.cursor = "pointer";
image.addEventListener("click", () => {
  window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
});

  if (images.length) {
    image.src = images[0];
  } else {
    image.alt = "عکسی برای این محصول ثبت نشده است";
    image.style.objectFit = "contain";
  }

  gallery.append(image);
  const stock = Number(product.stock) || 0;

  const stockBadge = document.createElement("span");
  stockBadge.className = "stock-badge";
  stockBadge.textContent = stock > 0
    ? `موجودی: ${money.format(stock)} عدد`
    : "ناموجود";

  stockBadge.style.cssText = `
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 3;
    padding: 7px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
    color: ${stock > 0 ? "#f3d27a" : "#ffffff"};
    background: ${stock > 0 ? "rgba(20, 20, 20, 0.9)" : "rgba(120, 25, 25, 0.92)"};
    border: 1px solid ${stock > 0 ? "#b99545" : "#a94444"};
  `;

  gallery.style.position = "relative";
  gallery.append(stockBadge);
  
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
  title.style.cursor = "pointer";
title.addEventListener("click", () => {
  window.location.href = `product.html?id=${encodeURIComponent(product.id)}`;
});

  const description = document.createElement("p");
  description.textContent = product.description || "برای اطلاعات بیشتر پیام بده.";

  const price = document.createElement("div");
  price.className = "product-price";

if (product.price === null || product.price === "") {
  price.textContent = "قیمت: ــ";
} else {
  const finalPrice = Number(product.price) * (100 - discount) / 100;
  price.textContent = formatPrice(finalPrice);
}

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
  order.href = EITAA_LINK;
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


// نمایش محصولات
function renderProducts() {
  const query = $("#searchInput").value.trim().toLocaleLowerCase("fa");

  const selectedColor = $("#colorFilter").value;
  console.log("رنگ انتخابی فیلتر:", selectedColor, "رنگ محصولات:", products.map(p => p.color));
  const minPriceValue = $("#minPriceFilter").value.trim();
  const maxPriceValue = $("#maxPriceFilter").value.trim();

  const minPrice = minPriceValue === "" ? null : Number(minPriceValue);
  const maxPrice = maxPriceValue === "" ? null : Number(maxPriceValue);

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

    const matchesColor =
      !selectedColor || product.color === selectedColor;

    const price = product.price === null || product.price === ""
      ? null
      : Number(product.price);

    const discount = Number(product.discount) || 0;

    const finalPrice = price === null
      ? null
      : price * (100 - discount) / 100;

    const matchesMinPrice =
      minPrice === null || (finalPrice !== null && finalPrice >= minPrice);

    const matchesMaxPrice =
      maxPrice === null || (finalPrice !== null && finalPrice <= maxPrice);

    return matchesSearch &&
      matchesCategory &&
      matchesFavorite &&
      matchesColor &&
      matchesMinPrice &&
      matchesMaxPrice;
  });

  const sort = $("#sortSelect").value;

  if (sort === "cheap") {
    filtered.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  } else if (sort === "expensive") {
    filtered.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
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

// فرم محصول
function resetProductForm() {
  productForm.reset();
  $("#productId").value = "";
  $("#productDiscount").value = "0";
$("#productStock").value = "0";
  
  $("#modalTitle").textContent = "افزودن محصول";

  selectedFiles = [];
  currentImages = [];

  $("#adminImagePreview").replaceChildren();
  $("#productImages").value = "";
}

// ویرایش محصول
function openEditModal(product) {
  resetProductForm();

  $("#productId").value = product.id;
  $("#productName").value = product.name;
  $("#productPrice").value = product.price;
  $("#productDiscount").value = product.discount || 0;
$("#productStock").value = Number(product.stock) || 0;
  $("#productColor").value = product.color || "";
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

// آپلود تصاویر
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

// انتخاب تصاویر
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

// ذخیره محصول
productForm.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdminLoggedIn) {
    showToast("ابتدا وارد حساب مدیر شو.");
    return;
  }

  const id = $("#productId").value;
  const name = $("#productName").value.trim();
  const priceValue = $("#productPrice").value.trim();
const price = priceValue === "" ? null : Number(priceValue);
  const discount = Number($("#productDiscount").value);
  const category = $("#productCategory").value;
  const stock = Number($("#productStock").value);
  const color = $("#productColor").value;
  const description = $("#productDescription").value.trim();
  const saveButton = $("#saveProduct");

  if (!name || (price !== null && (!Number.isFinite(price) || price < 0))) {
  showToast("نام یا قیمت محصول درست نیست.");
  return;
}

  if (!Number.isFinite(discount) || discount < 0 || discount > 99) {
    showToast("تخفیف باید بین صفر تا ۹۹ باشد.");
    return;
  }

  if (!Number.isInteger(stock) || stock < 0) {
  showToast("موجودی باید یک عدد صحیح و صفر یا بیشتر باشد.");
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
      images = images.concat(uploaded);
    }

const productData = {
  name,
  price,
  discount,
    stock,
  color,
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

// حذف محصول
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

  // بعد از ورود، فرم افزودن محصول باز می‌شود
  resetProductForm();
  openProductModal();
});

// بررسی نشست قبلی مدیر
async function checkAdminSession() {
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;

  isAdminLoggedIn = !!(user && user.id === ADMIN_UID);

  updateAdminButton();
  renderProducts();
}

// دکمه افزودن کیف در نوار بالا
$("#addProductBtn").addEventListener("click", () => {
  if (!isAdminLoggedIn) return;

  resetProductForm();
  openProductModal();
});

// ورود و خروج مدیر
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
// فیلتر رنگ و محدوده قیمت
$("#colorFilter").addEventListener("change", renderProducts);
$("#minPriceFilter").addEventListener("input", renderProducts);
$("#maxPriceFilter").addEventListener("input", renderProducts);

// پاک کردن فیلترها
$("#clearFilters").addEventListener("click", () => {
  $("#colorFilter").value = "";
  $("#minPriceFilter").value = "";
  $("#maxPriceFilter").value = "";
  renderProducts();
});

// دسته‌بندی
$("#categories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;

  activeCategory = button.dataset.category;

  document.querySelectorAll(".category").forEach(item => {
    item.classList.toggle("active", item === button);
  });

  renderProducts();
});

// علاقه‌مندی‌ها
$("#favoritesFilter").addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;

  $("#favoritesFilter").textContent = favoritesOnly
    ? "نمایش همه محصولات"
    : "♡ علاقه‌مندی‌ها";

  renderProducts();
});

// پاک کردن فیلترها
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

// ===== مدیریت نظرات مشتریان =====

const reviewsModal = document.querySelector("#reviewsModal");
const manageReviewsBtn = document.querySelector("#manageReviewsBtn");
const adminReviewsList = document.querySelector("#adminReviewsList");

// باز کردن پنجره نظرات
manageReviewsBtn?.addEventListener("click", async () => {
  if (!isAdminLoggedIn) return;

  reviewsModal.hidden = false;
  document.body.style.overflow = "hidden";
  await loadAdminReviews();
});

// بستن پنجره
document.querySelectorAll("[data-close-reviews]").forEach(button => {
  button.addEventListener("click", () => {
    reviewsModal.hidden = true;
    document.body.style.overflow = "";
  });
});

// دریافت نظرات
async function loadAdminReviews() {
  if (!isAdminLoggedIn) return;

  adminReviewsList.textContent = "در حال دریافت نظرات...";

  const { data: reviews, error } = await supabaseClient
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    adminReviewsList.textContent = "دریافت نظرات ناموفق بود.";
    return;
  }

  const { data: productData } = await supabaseClient
    .from("products")
    .select("id,name");

  const productNames = new Map(
    (productData || []).map(product => [String(product.id), product.name])
  );

  adminReviewsList.replaceChildren();

  if (!reviews || reviews.length === 0) {
    adminReviewsList.textContent = "هنوز نظری ثبت نشده است.";
    return;
  }

  reviews.forEach(review => {
    const card = document.createElement("div");
    card.style.cssText = `
      padding: 14px;
      margin: 12px 0;
      border: 1px solid rgba(217,173,82,.3);
      border-radius: 12px;
      background: #191714;
      color: #f6f0e5;
    `;

    const title = document.createElement("h3");
    title.textContent = review.customer_name;

    const product = document.createElement("p");
    product.textContent =
      "محصول: " + (productNames.get(String(review.product_id)) || "محصول حذف‌شده");

    const rating = document.createElement("p");
    rating.textContent = "امتیاز: " + "★".repeat(review.rating);

    const comment = document.createElement("p");
    comment.textContent = review.comment;

    const status = document.createElement("p");
    status.textContent = review.is_approved ? "وضعیت: تأیید شده" : "وضعیت: در انتظار تأیید";

    card.append(title, product, rating, comment, status);

    if (!review.is_approved) {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "button";
      approve.textContent = "تأیید نظر";

      approve.addEventListener("click", () => approveReview(review.id));

      card.append(approve);
    }

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button secondary";
    remove.textContent = "حذف نظر";
    remove.style.marginRight = "8px";

    remove.addEventListener("click", () => deleteReview(review.id));

    card.append(remove);
    adminReviewsList.append(card);
  });
}

// تأیید نظر
async function approveReview(id) {
  if (!isAdminLoggedIn) return;

  const { error } = await supabaseClient
    .from("reviews")
    .update({ is_approved: true })
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("تأیید نظر ناموفق بود.");
    return;
  }

  showToast("نظر تأیید شد.");
  await loadAdminReviews();
}

// حذف نظر
async function deleteReview(id) {
  if (!isAdminLoggedIn) return;

  if (!confirm("این نظر حذف شود؟")) return;

  const { error } = await supabaseClient
    .from("reviews")
    .delete()
    .eq("id", id);

  if (error) {
    console.error(error);
    showToast("حذف نظر ناموفق بود.");
    return;
  }

  showToast("نظر حذف شد.");
  await loadAdminReviews();
}

// بستن با کلید Escape
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && reviewsModal && !reviewsModal.hidden) {
    reviewsModal.hidden = true;
    document.body.style.overflow = "";
  }
});
