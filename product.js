
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
          src="${images[0] || ""}"
          alt="${escapeHTML(product.name)}"
        >
        <div class="detail-thumbnails">
          ${images.map((image, index) => `
            <img
              class="detail-thumb"
              src="${image}"
              alt="تصویر ${index + 1}"
              data-image="${image}"
            >
          `).join("")}
        </div>
      </section>

      <section class="detail-info">
        <span class="detail-category">${escapeHTML(product.category || "کیف طلایی")}</span>
        <h1>${escapeHTML(product.name || "محصول")}</h1>

        ${discount > 0 ? `<span class="eyebrow">${money.format(discount)}٪ تخفیف</span>` : ""}

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
  `;

  const mainImage = document.getElementById("detailMainImage");

  content.querySelectorAll(".detail-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      mainImage.src = thumb.dataset.image;
    });
  });
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
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
}

loadProduct();

