const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

const { initTestDb, closeTestDb } = require('../setup/testDb');

const cartRouter = require('../../routes/cart');

const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');
const Category = require('../../models/category');
const Order = require('../../models/order');

const app = express();
app.use(bodyParser.json());
app.use('/api/carts', cartRouter);

describe('Cart Routes', () => {
  let cart;
  let product;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await Order.destroy({ where: {} });
    await CartItem.destroy({ where: {} });
    await Cart.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  const createTestData = async () => {
    const category = await Category.create({
      name: 'Test Category',
    });

    product = await Product.create({
      name: 'Test Product',
      price: 100,
      inventory: 10,
      taxRate: 0.07,
      categoryId: category.id,
    });

    cart = await Cart.create({
      userId: '1',
    });
  };

  describe('POST /api/carts/:userId', () => {
    it('[VÁLIDA] debe crear un carrito para un usuario', async () => {
      const response = await request(app).post('/api/carts/1').expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe('1');

      const savedCart = await Cart.findByPk(response.body.id);

      expect(savedCart).not.toBeNull();
      expect(String(savedCart.userId)).toBe('1');
    });
  });

  describe('POST /api/carts/:cartId/items', () => {
    beforeEach(async () => {
      await createTestData();
    });

    it('[VÁLIDA] debe agregar un producto con inventario suficiente', async () => {
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

    it('[INVÁLIDA] debe rechazar un producto inexistente', async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: 999,
          quantity: 2,
        })
        .expect(400);

      expect(response.body.error).toBe('Product not found');

      const items = await CartItem.findAll();

      expect(items).toHaveLength(0);
    });

    it('[LÍMITE] debe rechazar una cantidad igual a cero', async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: 0,
        })
        .expect(400);

      expect(response.body.error).toBe('Quantity must be a positive integer');

      expect(await CartItem.count()).toBe(0);
    });

    it('[INVÁLIDA] debe rechazar una cantidad decimal', async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: 1.5,
        })
        .expect(400);

      expect(response.body.error).toBe('Quantity must be a positive integer');
      expect(await CartItem.count()).toBe(0);
    });

    it('[INVÁLIDA] debe rechazar una cantidad negativa', async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: -2,
        })
        .expect(400);

      expect(response.body.error).toBe('Quantity must be a positive integer');

      expect(await CartItem.count()).toBe(0);
    });

    it('[INVÁLIDA] debe rechazar una cantidad superior al inventario', async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/items`)
        .send({
          productId: product.id,
          quantity: 11,
        })
        .expect(400);

      expect(response.body.error).toBe('Not enough inventory available');

      expect(await CartItem.count()).toBe(0);
    });
  });

  describe('GET /api/carts/:cartId/items', () => {
    it('[INVÁLIDA] debe retornar 404 cuando el carrito no existe', async () => {
      const response = await request(app)
        .get('/api/carts/999/items')
        .expect(404);

      expect(response.body.error).toBe("Cart doesn't exist");
    });

    it('[INVÁLIDA] debe rechazar un identificador de carrito no numérico', async () => {
      const response = await request(app)
        .get('/api/carts/nonidad123/items')
        .expect(400);

      expect(response.body.error).toBe('Cart ID should be a number');
    });

    it('[VÁLIDA] debe retornar los artículos y calcular correctamente los totales', async () => {
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

  describe('PUT /api/carts/:cartId/items/:itemId', () => {
    beforeEach(async () => {
      await createTestData();
    });

    it('[VÁLIDA] debe actualizar la cantidad de un artículo existente', async () => {
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

    it('[LÍMITE] debe rechazar una cantidad igual a cero al actualizar un artículo', async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 0 })
        .expect(400);

      expect(response.body.error).toBe('Quantity must be a positive integer');

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it('[INVÁLIDA] debe rechazar una cantidad negativa al actualizar un artículo', async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: -2 })
        .expect(400);

      expect(response.body.error).toBe('Quantity must be a positive integer');

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it('[INVÁLIDA] debe rechazar una cantidad decimal al actualizar un artículo', async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 2.5 })
        .expect(400);

      expect(response.body.error).toBe('Quantity must be a positive integer');

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it('[INVÁLIDA] debe rechazar una cantidad superior al inventario al actualizar un artículo', async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 11 })
        .expect(400);

      expect(response.body.error).toBe('Not enough inventory available');

      const savedItem = await CartItem.findByPk(item.id);
      expect(savedItem.quantity).toBe(2);
    });

    it('[INVÁLIDA] debe rechazar la actualización de un artículo inexistente', async () => {
      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/999`)
        .send({ quantity: 3 })
        .expect(400);

      expect(response.body.error).toBe('Item not found');

      const items = await CartItem.findAll();
      expect(items).toHaveLength(0);
    });

    it('[LÍMITE] debe actualizar un artículo hasta el inventario disponible', async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });

      const response = await request(app)
        .put(`/api/carts/${cart.id}/items/${item.id}`)
        .send({ quantity: 10 })
        .expect(200);

      expect(response.body.quantity).toBe(10);
      expect((await CartItem.findByPk(item.id)).quantity).toBe(10);
    });
  });

  describe('DELETE /api/carts/:cartId/items/:itemId', () => {
    beforeEach(async () => {
      await createTestData();
    });

    it('[VÁLIDA] debe eliminar un artículo existente', async () => {
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

    it('[INVÁLIDA] debe rechazar la eliminación de un artículo inexistente', async () => {
      const response = await request(app)
        .delete(`/api/carts/${cart.id}/items/999`)
        .expect(400);

      expect(response.body.error).toBe('Item not found');

      const items = await CartItem.findAll();
      expect(items).toHaveLength(0);
    });

    it('[VÁLIDA] debe eliminar solo el artículo solicitado y conservar los demás', async () => {
      const item = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });
      const remainingItem = await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 3,
      });

      const response = await request(app)
        .delete(`/api/carts/${cart.id}/items/${item.id}`)
        .expect(204);

      expect(await CartItem.findByPk(item.id)).toBeNull();
      expect((await CartItem.findByPk(remainingItem.id)).quantity).toBe(3);
    });
  });

  // MEJORA POR MUTANTE A LINEA 65 DE routes/cart.js
  describe('POST /api/carts/:cartId/checkout', () => {
    beforeEach(async () => {
      await createTestData();
      await CartItem.create({
        cartId: cart.id,
        productId: product.id,
        quantity: 2,
      });
    });

    it('[VÁLIDA] debe procesar el checkout y responder con la orden', async () => {
      const response = await request(app)
        .post(`/api/carts/${cart.id}/checkout`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.cartId).toBe(cart.id);
      expect(response.body).toMatchObject({
        subtotal: 200,
        discount: 0,
        taxable: 200,
        tax: 14,
        shipping: 0,
        total: 214,
      });
      expect(response.body.lines).toHaveLength(1);
      expect(response.body.lines[0]).toMatchObject({
        productId: product.id,
        quantity: 2,
        unitPrice: 100,
        lineSubtotal: 200,
        lineDiscount: 0,
        lineTax: 14,
      });

      expect((await Cart.findByPk(cart.id)).status).toBe('checked_out');
      expect((await Product.findByPk(product.id)).inventory).toBe(8);

      const savedOrder = await Order.findOne({ where: { cartId: cart.id } });
      expect(savedOrder).not.toBeNull();

      const orderResponse = await request(app)
        .get(`/api/carts/${cart.id}/order`)
        .expect(200);
      expect(orderResponse.body.id).toBe(response.body.id);
    });

    it('[INVÁLIDA] debe responder error cuando el checkout falla por carrito inexistente', async () => {
      const response = await request(app)
        .post('/api/carts/99999/checkout')
        .send()
        .expect(404);

      expect(response.body.error).toBe("Cart doesn't exist");
    });

    it('[INVÁLIDA] debe rechazar un segundo checkout sin volver a descontar inventario', async () => {
      await request(app)
        .post(`/api/carts/${cart.id}/checkout`)
        .expect(201);

      const response = await request(app)
        .post(`/api/carts/${cart.id}/checkout`)
        .expect(400);

      expect(response.body.error).toBe('Cart already checked out');
      expect((await Product.findByPk(product.id)).inventory).toBe(8);
      expect(await Order.count({ where: { cartId: cart.id } })).toBe(1);
    });

    it('[VÁLIDA] debe cobrar envío bajo el umbral y no cobrarlo al alcanzar el umbral', async () => {
      await Product.update(
        { price: 40, taxRate: 0 },
        { where: { id: product.id } },
      );
      await CartItem.update({ quantity: 1 }, { where: { cartId: cart.id } });

      const belowThreshold = await request(app)
        .post(`/api/carts/${cart.id}/checkout`)
        .expect(201);

      expect(belowThreshold.body).toMatchObject({
        subtotal: 40,
        shipping: 5,
        total: 45,
      });

      const thresholdCart = await Cart.create({ userId: '2' });
      const thresholdProduct = await Product.create({
        name: 'Threshold Product',
        price: 50,
        inventory: 10,
        taxRate: 0,
        categoryId: product.categoryId,
      });
      await CartItem.create({
        cartId: thresholdCart.id,
        productId: thresholdProduct.id,
        quantity: 1,
      });

      const atThreshold = await request(app)
        .post(`/api/carts/${thresholdCart.id}/checkout`)
        .expect(201);

      expect(atThreshold.body).toMatchObject({
        subtotal: 50,
        shipping: 0,
        total: 50,
      });
    });
  });
});
