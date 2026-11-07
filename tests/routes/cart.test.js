// const request = require("supertest");
// const express = require("express");
// const bodyParser = require("body-parser");
// const { initTestDb, closeTestDb } = require("../setup/testDb");
// const cartRouter = require("../../routes/cart");
// const Cart = require("../../models/cart");
// const Product = require("../../models/product");
// const Category = require("../../models/category");
// const CartItem = require("../../models/cartItem");

// const app = express();
// app.use(bodyParser.json());
// app.use("/api/carts", cartRouter);

// describe("Cart Routes", () => {
//   beforeAll(async () => {
//     await initTestDb();
//   });

//   afterAll(async () => {
//     await closeTestDb();
//   });

//   // beforeEach(async () => {
//   //   await Cart.destroy({ where: {} });
//   //   await Product.destroy({ where: {} });
//   //   await Category.destroy({ where: {} });
//   // });
//   beforeEach(async () => {
//     await CartItem.destroy({ where: {} });
//     await Cart.destroy({ where: {} });
//     await Product.destroy({ where: {} });
//     await Category.destroy({ where: {} });
//   });

//   describe("POST /api/carts/:userId", () => {
//     it("should create a new cart", async () => {});
//   });

//   describe("POST /api/carts/:cartId/items", () => {
//     //let cart, product;

//     // beforeEach(async () => {
//     //   const category = await Category.create({ name: 'Test Category' });
//     //   product = await Product.create({
//     //     name: 'Test Product',
//     //     price: 100,
//     //     inventory: 10,
//     //     categoryId: category.id
//     //   });
//     //   cart = await Cart.create({ userId: '1' });
//     // });

//     it("should add item to cart", async () => {});
//   });

//   describe("GET /api/carts/:cartId/items", () => {
//     it("should return 404 when cart does not exist", async () => {
//       const response = await request(app).get("/api/carts/1/items").expect(404);
//     });

//     it("should return 400 when cart id wrong format", async () => {
//       const response = await request(app)
//         .get("/api/carts/nonidad123/items")
//         .expect(400);
//     });
//   });
// });

const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");

const { initTestDb, closeTestDb } = require("../setup/testDb");

const cartRouter = require("../../routes/cart");

const Cart = require("../../models/cart");
const CartItem = require("../../models/cartItem");
const Product = require("../../models/product");
const Category = require("../../models/category");

const app = express();
app.use(bodyParser.json());
app.use("/api/carts", cartRouter);

describe("Cart Routes", () => {
  let cart;
  let product;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await CartItem.destroy({ where: {} });
    await Cart.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  const createTestData = async () => {
    const category = await Category.create({
      name: "Test Category",
    });

    product = await Product.create({
      name: "Test Product",
      price: 100,
      inventory: 10,
      taxRate: 0.07,
      categoryId: category.id,
    });

    cart = await Cart.create({
      userId: "1",
    });
  };

  describe("POST /api/carts/:userId", () => {
    it("[VÁLIDA] debe crear un carrito para un usuario", async () => {
      const response = await request(app).post("/api/carts/1").expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.userId).toBe("1");

      const savedCart = await Cart.findByPk(response.body.id);

      expect(savedCart).not.toBeNull();
      expect(String(savedCart.userId)).toBe("1");
    });
  });

  describe("POST /api/carts/:cartId/items", () => {
    beforeEach(async () => {
      await createTestData();
    });

    it("[VÁLIDA] debe agregar un producto con inventario suficiente", async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: 2,
        })
        .expect(201);

      expect(Number(response.body.cartId)).toBe(cart.id);
      expect(Number(response.body.productId)).toBe(product.id);
      expect(response.body.quantity).toBe(2);

      const savedItem = await CartItem.findOne({
        where: {
          cartId: cart.id,
          productId: product.id,
        },
      });

      expect(savedItem).not.toBeNull();
      expect(savedItem.quantity).toBe(2);
    });

    it("[INVÁLIDA] debe rechazar un producto inexistente", async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: 999,
          quantity: 2,
        })
        .expect(400);

      expect(response.body.error).toBe("Product not found");

      const items = await CartItem.findAll();

      expect(items).toHaveLength(0);
    });

    it("[LÍMITE] debe rechazar una cantidad igual a cero", async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: 0,
        })
        .expect(400);

      expect(response.body.error).toBe("Quantity must be a positive integer");

      expect(await CartItem.count()).toBe(0);
    });

    it("[INVÁLIDA] debe rechazar una cantidad negativa", async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: -2,
        })
        .expect(400);

      expect(response.body.error).toBe("Quantity must be a positive integer");

      expect(await CartItem.count()).toBe(0);
    });

    it("[INVÁLIDA] debe rechazar una cantidad superior al inventario", async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: 11,
        })
        .expect(400);

      expect(response.body.error).toBe("Not enough inventory available");

      expect(await CartItem.count()).toBe(0);
    });
  });

  describe("GET /api/carts/:cartId/items", () => {
    it("[INVÁLIDA] debe retornar 404 cuando el carrito no existe", async () => {
      const response = await request(app)
        .get("/api/carts/999/items")
        .expect(404);

      expect(response.body.error).toBe("Cart doesn't exist");
    });

    it("[INVÁLIDA] debe rechazar un identificador de carrito no numérico", async () => {
      const response = await request(app)
        .get("/api/carts/nonidad123/items")
        .expect(400);

      expect(response.body.error).toBe("Cart ID should be a number");
    });

    it("[VÁLIDA] debe retornar los artículos y calcular correctamente los totales", async () => {
      await createTestData();

      await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .get(`/api/carts/${cart.id}/items`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(2);
      expect(response.body.items[0].itemSubtotal).toBeCloseTo(200, 2);
      expect(response.body.items[0].itemTax).toBeCloseTo(14, 2);

      expect(response.body.summary.subtotal).toBeCloseTo(200, 2);
      expect(response.body.summary.totalTax).toBeCloseTo(14, 2);
      expect(response.body.summary.total).toBeCloseTo(214, 2);
    });
  });

  describe("PUT /api/carts/:cartId/items/:itemId", () => {
    beforeEach(async () => {
      await createTestData();
    });

    it("[VÁLIDA] debe actualizar la cantidad de un artículo existente", async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 5 })
        .expect(200);

      expect(response.body.quantity).toBe(5);

      const updatedItem = await CartItem.findByPk(item.id);

      expect(updatedItem.quantity).toBe(5);
    });

    // HALLAZGO: updateCartItem permite quantity = 0; incumple la regla de cantidad positiva.
    it("[LÍMITE] debe rechazar una cantidad igual a cero al actualizar un artículo", async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 0 })
        .expect(400);

      expect(response.body.error).toBe("Quantity must be a positive integer");

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it("[INVÁLIDA] debe rechazar una cantidad negativa al actualizar un artículo", async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: -2 })
        .expect(400);

      expect(response.body.error).toBe("Quantity must be a positive integer");

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it("[INVÁLIDA] debe rechazar una cantidad decimal al actualizar un artículo", async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 2.5 })
        .expect(400);

      expect(response.body.error).toBe("Quantity must be a positive integer");

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it("[INVÁLIDA] debe rechazar una cantidad superior al inventario al actualizar un artículo", async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 11 })
        .expect(400);

      expect(response.body.error).toBe("Not enough inventory available");

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it("[INVÁLIDA] debe rechazar la actualización de un artículo inexistente", async () => {
      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/999`)
        .send({ quantity: 3 })
        .expect(400);

      expect(response.body.error).toBe("Item not found");

      const items = await CartItem.findAll();
      expect(items).toHaveLength(0);
    });
  });

  describe("DELETE /api/carts/:cartId/items/:itemId", () => {
    beforeEach(async () => {
      await createTestData();
    });

    it("[VÁLIDA] debe eliminar un artículo existente", async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      await request(app)
        .delete(`/api/carts/${cart.id}/items/${item.id}`)
        .expect(204);

      const deletedItem = await CartItem.findByPk(item.id);

      expect(deletedItem).toBeNull();
    });

    it("[INVÁLIDA] debe rechazar la eliminación de un artículo inexistente", async () => {
      const response = await request(app)
        .delete(`/api/carts/${cart.id}/items/999`)
        .expect(400);

      expect(response.body.error).toBe("Item not found");

      const items = await CartItem.findAll();
      expect(items).toHaveLength(0);
    });
  });
});
