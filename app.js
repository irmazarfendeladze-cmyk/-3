const API_URL = "https://restaurant.stepprojects.ge/api";

// DOM ელემენტები
const productsGrid = document.getElementById("products-grid");
const categoriesContainer = document.getElementById("categories-container");
const filterVegetarian = document.getElementById("filter-vegetarian");
const filterNuts = document.getElementById("filter-nuts");
const filterSpicy = document.getElementById("filter-spicy");
const applyFiltersBtn = document.getElementById("apply-filters");
const cartCountSpan = document.getElementById("cart-count");
const cartBtn = document.getElementById("cart-btn");
const cartModal = document.getElementById("cart-modal");
const cartItemsList = document.getElementById("cart-items-list");
const closeCartBtn = document.getElementById("close-cart");
const cartTotal = document.getElementById("cart-total");

// აპლიკაციის ინიციალიზაცია
document.addEventListener("DOMContentLoaded", () => {
  loadCategories();
  loadProducts(); // თავიდან ტვირთავს ყველა პროდუქტს
  updateCartCount(); // ანახლებს კალათის ციფრს ზემოთ

  // კალათის ღილაკის ფუნქციონალობა
  cartBtn.addEventListener("click", showCart);
  closeCartBtn.addEventListener("click", hideCart);
  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) hideCart();
  });
});

// 1. კატეგორიების წამოღება და გამოჩენა რადიო ღილაკებად
async function loadCategories() {
  try {
    const response = await fetch(`${API_URL}/Categories/GetAll`);
    const categories = await response.json();

    categories.forEach((category) => {
      const label = document.createElement("label");
      label.className = "radio-label";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "category";
      input.value = category.id;
      // დავამატებ change ივენტ ლისნერ კატეგორიის რადიო ღილაკს
      input.addEventListener("change", applyFilters);
      label.appendChild(input);
      label.appendChild(document.createTextNode(` ${category.name}`));
      categoriesContainer.appendChild(label);
    });
  } catch (error) {
    console.error("კატეგორიების ჩატვირთვა ვერ მოხერხდა:", error);
  }
}

// 2. პროდუქტების წამოღება (ფილტრების გათვალისწინებით)
async function loadProducts(queryString = "") {
  productsGrid.innerHTML = '<p class="loading-text">მენიუ ახლდება...</p>';

  try {
    // თუ ფილტრი ცარიელია, მიაქვს GetAll, თუ არა - GetFiltered
    const endpoint = queryString
      ? `/Products/GetFiltered${queryString}`
      : "/Products/GetAll";
    const response = await fetch(`${API_URL}${endpoint}`);
    const products = await response.json();

    renderProducts(products);
  } catch (error) {
    productsGrid.innerHTML =
      '<p class="loading-text">შეცდომა პროდუქტების ჩატვირთვისას.</p>';
    console.error("პროდუქტების ჩატვირთვა ვერ მოხერხდა:", error);
  }
}

// 3. პროდუქტების HTML-ში გენერირება
function renderProducts(products) {
  productsGrid.innerHTML = "";

  if (products.length === 0) {
    productsGrid.innerHTML =
      '<p class="loading-text">შესაბამისი პროდუქტი ვერ მოიძებნა.</p>';
    return;
  }

  products.forEach((product) => {
    const card = document.createElement("div");
    card.className = "product-card";

    // თეგების ლოგიკა (თუ ვეგეტარიანულია ან ცხარეა)
    let tagsHTML = "";
    if (product.vegeterian)
      tagsHTML += '<span class="badge badge-veg">🥦 ვეგეტარიანული</span>';
    if (product.spiciness > 0)
      tagsHTML += `<span class="badge badge-spicy">🌶️ ცხარე (დონე: ${product.spiciness})</span>`;

    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" class="product-img" onerror="this.src='https://placehold.co/600x400?text=No+Image'">
      <div class="product-info">
        <h3 class="product-title">${product.name}</h3>
        <div class="product-tags">${tagsHTML}</div>
        <div class="product-footer">
          <span class="product-price">${product.price} ₾</span>
          <button class="btn btn-add" onclick="addToBasket(${product.id}, ${product.price})">დამატება</button>
        </div>
      </div>
    `;
    productsGrid.appendChild(card);
  });
}

// 4. ფილტრაციის ლოგიკა (გამოიძახება როგორც კატეგორიის რადიო ღილაკიდან ისე "ფილტრის გამოყენება" ღილაკიდან)
function applyFilters() {
  const params = new URLSearchParams();

  // კატეგორიის შემოწმება
  const categoryRadio = document.querySelector(
    'input[name="category"]:checked',
  );
  if (categoryRadio) {
    const selectedCategory = categoryRadio.value;
    if (selectedCategory !== "all") {
      params.append("categoryId", selectedCategory);
    }
  }

  // ჩეკბოქსების შემოწმება (აქ წერია ბექენდის "vegeterian" შეცდომა!)
  if (filterVegetarian.checked) params.append("vegeterian", "true");
  if (filterNuts.checked) params.append("nuts", "false"); // თუ მონიშნულია, ვფილტრავთ იმათ, ვისაც ნიგოზი/თხილი (nuts) არ აქვს (false)

  if (filterSpicy.checked) {
    params.append("spiciness", "1"); // მაგალითისთვის, აჩვენოს 1-ზე მაღალი ცხარის მქონე
  }

  // თუ არცერთი ფილტრი არაა მონიშნული, ჩვეულებრივად წამოიღებს ყველაფერს
  const queryString = params.toString() ? `?${params.toString()}` : "";
  loadProducts(queryString);
}

// "ფილტრის გამოყენება" ღილაკის ივენტ ლისნერი
applyFiltersBtn.addEventListener("click", applyFilters);

// 5. კალათაში პროდუქტის დამატება ან რაოდენობის განახლება
async function addToBasket(productId, price) {
  try {
    // თავიდან შემოწმებას კალათის ყველა ელემენტი
    const getResponse = await fetch(`${API_URL}/Baskets/GetAll`);
    const basketItems = await getResponse.json();

    // ეძებს თუ არის უკვე ეს პროდუქტი კალათში
    const existingItem = basketItems.find(
      (item) => item.product?.id === productId,
    );

    if (existingItem) {
      // თუ არის, განაახლებს რაოდენობას PUT-ით
      const response = await fetch(`${API_URL}/Baskets/UpdateBasket`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: existingItem.id || existingItem.basketId,
          quantity: existingItem.quantity + 1,
          price: price,
          productId: productId,
        }),
      });

      if (response.ok) {
        alert("პროდუქტის რაოდენობა განახლდა!");
        updateCartCount();
      } else {
        alert("რაოდენობის განახლება ვერ მოხერხდა.");
      }
    } else {
      // თუ არ არის, მაშინ ამატებს POST-ით
      const response = await fetch(`${API_URL}/Baskets/AddToBasket`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quantity: 1,
          price: price,
          productId: productId,
        }),
      });

      if (response.ok) {
        alert("პროდუქტი წარმატებით დაემატა კალათაში!");
        updateCartCount();
      } else {
        alert("კალათაში დამატება ვერ მოხერხდა.");
      }
    }
  } catch (error) {
    console.error("შეცდომა კალათაში დამატებისას:", error);
    alert("შეცდომა კალათაში დამატებისას: " + error.message);
  }
}

// 6. კალათაში არსებული ნივთების რაოდენობის განახლება (GET)
async function updateCartCount() {
  try {
    const response = await fetch(`${API_URL}/Baskets/GetAll`);
    const basketItems = await response.json();

    // ითვლის ყველა ელემენტის ჯამურ რაოდენობას
    const totalQuantity = basketItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    cartCountSpan.textContent = totalQuantity;
  } catch (error) {
    console.error("კალათის რაოდენობის განახლება ვერ მოხერხდა:", error);
  }
}

// 7. კალათის გამოჩენა მოდალურ ფანჯარაში
async function showCart() {
  try {
    const response = await fetch(`${API_URL}/Baskets/GetAll`);
    const basketItems = await response.json();

    console.log("კალათის ელემენტები:", basketItems); // DEBUG

    cartItemsList.innerHTML = "";
    let total = 0;

    if (basketItems.length === 0) {
      cartItemsList.innerHTML = '<p class="empty-cart">კალათა ცარიელია</p>';
      cartTotal.textContent = "0 ₾";
    } else {
      basketItems.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        // სცადე ყველა შესაძლო ID ფორმატი: product.id, productId, ან basket item-ის id
        const basketItemId = item.product?.id || item.productId || item.id;

        console.log(
          `ელემენტი ${index}:`,
          item,
          "product.id:",
          item.product?.id,
          "productId:",
          item.productId,
          "id:",
          item.id,
          "Final ID:",
          basketItemId,
        ); // DEBUG

        const itemRow = document.createElement("div");
        itemRow.className = "cart-item";
        itemRow.innerHTML = `
          <div class="cart-item-info">
           <img src="${item.product?.image || "https://placehold.co/100x100?text=No+Image"}" alt="${item.product?.name || `პროდუქტი #${item.productId}`}" class="cart-item-img">
            <h4>${item.product?.name || `პროდუქტი #${item.productId}`}</h4>
            <p>ერთეულის ფასი: ${item.price} ₾</p>
            <p>რაოდენობა: ${item.quantity}</p>
            <p class="item-total">ჯამი: ${itemTotal.toFixed(2)} ₾</p>
          </div>
          <button class="btn btn-delete" data-basket-id="${basketItemId}" onclick="removeFromBasket(event)">წაშლა</button>
        `;
        cartItemsList.appendChild(itemRow);
      });
      cartTotal.textContent = total.toFixed(2) + " ₾";
    }

    cartModal.style.display = "flex";
  } catch (error) {
    console.error("კალათის ჩატვირთვა ვერ მოხერხდა:", error);
    cartItemsList.innerHTML =
      '<p class="error">შეცდომა კალათის ჩატვირთვისას</p>';
  }
}

// 8. კალათის დამალვა
function hideCart() {
  cartModal.style.display = "none";
}

// 9. ელემენტის წაშლა კალათიდან
async function removeFromBasket(event) {
  // event-ის მეშვეობით აიღებ button-ის data attribute-ს
  const basketItemId = event.target.getAttribute("data-basket-id");

  console.log("წაშლისთვის გამოცემული ID:", basketItemId); // DEBUG

  if (
    !basketItemId ||
    basketItemId === "undefined" ||
    basketItemId === "null"
  ) {
    console.error("ID არ არის ხელმისაწვდომი:", basketItemId);
    alert(
      "წასაშლელი პროდუქტის იდენტიფიკატორი ვერ მოიძებნა. თქვენი ბექენდი შეიძლება განსხვავებული ფორმატი აბრუნებს. კონსოლი გახსენით დეტალებისთვის.",
    );
    return;
  }

  try {
    const response = await fetch(
      `${API_URL}/Baskets/DeleteProduct/${basketItemId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      alert("პროდუქტი წაშლილია!");
      await updateCartCount(); // ციფრის განახლება
      await showCart(); // კალათის განახლება
    } else {
      console.error("წაშლის მოთხოვნა ვერ შესრულდა:", response.status);
      alert("წაშლა ვერ მოხერხდა. სტატუსი: " + response.status);
    }
  } catch (error) {
    console.error("შეცდომა კალათიდან წაშლისას:", error);
    alert("შეცდომა კალათიდან წაშლისას: " + error.message);
  }
}

// 10. შეკვეთის გაგრძელება
function checkout() {
  alert("შეკვეთის ფუნქცია მოახლოვებული კოდირებისა");
}
