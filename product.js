
const SUPABASE_URL = "https://uystisrtgdxccfafpywq.supabase.co";
const SUPABASE_KEY = "sb_publishable_YD1PiOewdGcb-EgijEiRFg_yJyF4Jqo";

const EITAA_LINK = "https://eitaa.com/KIF_TALAYY";
const PHONE_NUMBER = "09126531424";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const content = document.getElementById("productContent");
const money = new Intl.NumberFormat("fa-IR");

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "قیمت: ــ";
  }
  return money.format(Number(value)) + " تومان";
}

function getProductImages(product) {
  let images = product.images;

  if (typeof images === "string") {
    try {
      images = JSON.parse(images);
    } catch {
      images = [];
    }
  }

  if (!Array.isArray(images)) images = [];

  const allImages = [
    ...images,
    ...(product.image ? [product.image] : [])
  ];

  return [...new Set(allImages.filter(Boolean))];
}

function showProduct(product) {
  const images = getProductImages(product);
  const discount = Number(product.discount) || 0;
  const price = product.price === null ? null : Number(product.price);

  const finalPrice = price !== null && discount > 0
    ? price * (1 - discount / 100)
    : price;

  const stock = Number(product.stock) || 0;

  content.innerHTML = `
    <div class="detail-layout">
      <section class="detail-gallery">
        <img
          id="detailMainImage"
          class="detail-main-image"
          src="${escapeHTML(images[0] || "")}"
          alt="${escapeHTML(product.name || "")}"
        >

        <div class="detail-thumbnails">
          ${images.map((image, index) => `
            <img
              class="detail-thumb"
              src="${escapeHTML(image)}"
              alt="تصویر ${index + 1}"
              data-image="${escapeHTML(image)}"
            >
          `).join("")}
        </div>
      </section>

      <section class="detail-info">
        <span class="detail-category">
          ${escapeHTML(product.category || "کیف طلایی")}
        </span>

        <h1>${escapeHTML(product.name || "محصول")}</h1>

        ${discount > 0
          ? `<span class="eyebrow">${money.format(discount)}٪ تخفیف</span>`
          : ""}

        <div class="detail-price">
          ${formatPrice(finalPrice)}
          ${discount > 0 && price !== null
            ? `<span class="detail-old-price">${formatPrice(price)}</span>`
            : ""}
        </div>

        <div class="detail-stock">
          ${stock > 0
            ? `موجودی: ${money.format(stock)} عدد`
            : "ناموجود"}
        </div>

        <div class="detail-description">
          ${escapeHTML(product.description || "توضیحاتی برای این محصول ثبت نشده است.")}
        </div>

        <div class="detail-actions">
          <a
            class="button"
            href="${EITAA_LINK}"
            target="_blank"
            rel="noopener noreferrer"
          >سفارش از ایتا</a>

          <a
            class="button"
            href="tel:${PHONE_NUMBER}"
          >تماس با فروشگاه</a>
        </div>
      </section>
    </div>

    <section class="detail-info" id="reviewsSection">
      <h2>نظرات و امتیاز مشتریان</h2>

      <div id="reviewsList">در حال دریافت نظرات...</div>

      <h3>ثبت نظر شما</h3>

      <form id="reviewForm">
        <label for="reviewName">نام شما</label>
        <input
          id="reviewName"
          type="text"
          maxlength="60"
          minlength="2"
          required
          placeholder="نام خود را وارد کنید"
        >

        <label for="reviewRating">امتیاز شما</label>
        <select id="reviewRating" required>
          <option value="5">۵ ستاره</option>
          <option value="4">۴ ستاره</option>
          <option value="3">۳ ستاره</option>
          <option value="2">۲ ستاره</option>
          <option value="1">۱ ستاره</option>
        </select>

        <label for="reviewComment">متن نظر</label>
        <textarea
          id="reviewComment"
          maxlength="1000"
          minlength="3"
          required
          placeholder="نظر خود درباره این کیف را بنویسید..."
        ></textarea>

        <button class="button" type="submit">
          ارسال نظر برای تأیید
        </button>
      </form>

      <p id="reviewMessage" role="status"></p>
    </section>
  `;

  const mainImage = document.getElementById("detailMainImage");

  content.querySelectorAll(".detail-thumb").forEach(thumb => {
    thumb.addEventListener("click", () => {
      mainImage.src = thumb.dataset.image;
    });
  });
}

async function loadReviews(productId) {
  const list = document.getElementById("reviewsList");

  list.textContent = "در حال دریافت نظرات...";

  const { data, error } = await supabaseClient
    .from("reviews")
    .select("customer_name, rating, comment, created_at")
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.textContent = "دریافت نظرات با مشکل مواجه شد.";
    return;
  }

  if (!data || data.length === 0) {
    list.textContent = "هنوز نظری برای این محصول ثبت نشده است.";
    return;
  }

  list.innerHTML = data.map(review => `
    <article class="review-item">
      <strong>${escapeHTML(review.customer_name)}</strong>
      <div>${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}</div>
      <p>${escapeHTML(review.comment)}</p>
    </article>
  `).join("");
}

function submitReview(productId) {
  const form = document.getElementById("reviewForm");
  const message = document.getElementById("reviewMessage");

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const customerName = document.getElementById("reviewName").value.trim();
    const rating = Number(document.getElementById("reviewRating").value);
    const comment = document.getElementById("reviewComment").value.trim();

    if (
      customerName.length < 2 ||
      comment.length < 3 ||
      comment.length > 1000 ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      message.textContent = "لطفاً نام، امتیاز و متن نظر را بررسی کنید.";
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    message.textContent = "در حال ارسال نظر...";

    const { error } = await supabaseClient
      .from("reviews")
      .insert({
        product_id: productId,
        customer_name: customerName,
        rating,
        comment,
        is_approved: false
      });

    button.disabled = false;

    if (error) {
      console.error(error);
      message.textContent = "ارسال نظر ناموفق بود. دوباره تلاش کنید.";
      return;
    }

    form.reset();
    message.textContent =
      "نظر شما ثبت شد و پس از تأیید مدیر نمایش داده می‌شود.";
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    content.textContent = "شناسه محصول مشخص نیست.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error(error);
    content.textContent = "دریافت اطلاعات محصول با مشکل مواجه شد.";
    return;
  }

  if (!data) {
    content.textContent = "این محصول پیدا نشد.";
    return;
  }

  showProduct(data);

  loadReviews(productId);
  submitReview(productId);
}

loadProduct();
