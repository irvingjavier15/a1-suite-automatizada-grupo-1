// const request = require('supertest');
// const express = require('express');
// const bodyParser = require('body-parser');
// const { initTestDb, closeTestDb } = require('../setup/testDb');
// const productRouter = require('../../routes/products');
// const Product = require('../../models/product');
// const Category = require('../../models/category');

// const app = express();
// app.use(bodyParser.json());
// app.use('/api/products', productRouter);

// describe('Product Routes', () => {
//   beforeAll(async () => {
//     await initTestDb();
//   });

//   afterAll(async () => {
//     await closeTestDb();
//   });

//   beforeEach(async () => {
//     await Product.destroy({ where: {} });
//     await Category.destroy({ where: {} });
//   });

//   describe('POST /api/products', () => {
//     // let category;

//     // beforeEach(async () => {
//     //   category = await Category.create({ name: 'Test Category' });
//     // });

//     it('should create a new product', async () => {

//     });

//     it('should return error when category does not exist', async () => {

//     });
//   });

//   describe('GET /api/products/category/:categoryId', () => {
//     it('should return products for category', async () => {

//     });
//   });
// });

const request = require("supertest");
const express = require("express");
const bodyParser = require("body-parser");

const { initTestDb, closeTestDb } = require("../setup/testDb");
const productRouter = require("../../routes/products");

const Product = require("../../models/product");
const Category = require("../../models/category");

const app = express();
app.use(bodyParser.json());
app.use("/api/products", productRouter);

describe("Product Routes", () => {
  let category;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });

    category = await Category.create({
      name: "Test Category",
    });
  });

  describe("POST /api/products", () => {
    it("[VÁLIDA] debe crear un producto con una categoría existente", async () => {
      const productData = {
        name: "Test Product",
        price: 100,
        description: "Product for testing",
        inventory: 10,
        taxRate: 0.07,
        categoryId: category.id,
      };

      const response = await request(app)
        .post("/api/products")
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.name).toBe("Test Product");
      expect(response.body.price).toBe(100);

      const savedProduct = await Product.findByPk(response.body.id);

      expect(savedProduct).not.toBeNull();
      expect(savedProduct.name).toBe("Test Product");
      expect(savedProduct.categoryId).toBe(category.id);
    });

    describe("GET /api/products", () => {
      it("[VÁLIDA] debe retornar todos los productos registrados", async () => {
        await Product.create({
          name: "Product One",
          price: 100,
          inventory: 10,
          taxRate: 0.07,
          categoryId: category.id,
        });

        await Product.create({
          name: "Product Two",
          price: 200,
          inventory: 5,
          taxRate: 0.1,
          categoryId: category.id,
        });

        const response = await request(app).get("/api/products").expect(200);

        expect(response.body).toHaveLength(2);

        expect(response.body.map((product) => product.name)).toEqual(
          expect.arrayContaining(["Product One", "Product Two"]),
        );

        const savedProducts = await Product.findAll();
        expect(savedProducts).toHaveLength(2);
      });
    });

    it("[INVÁLIDA] debe rechazar un producto con una categoría inexistente", async () => {
      const productData = {
        name: "Invalid Product",
        price: 100,
        description: "Invalid category",
        inventory: 10,
        taxRate: 0.07,
        categoryId: 999,
      };

      const response = await request(app)
        .post("/api/products")
        .send(productData)
        .expect(400);

      expect(response.body.error).toContain("does not exist");

      const products = await Product.findAll();

      expect(products).toHaveLength(0);
    });
  });

  describe("GET /api/products/category/:categoryId", () => {
    it("[VÁLIDA] debe retornar los productos de una categoría existente", async () => {
      await Product.create({
        name: "Product One",
        price: 100,
        description: "First product",
        inventory: 10,
        taxRate: 0.07,
        categoryId: category.id,
      });

      await Product.create({
        name: "Product Two",
        price: 200,
        description: "Second product",
        inventory: 5,
        taxRate: 0.1,
        categoryId: category.id,
      });

      const response = await request(app)
        .get(`/api/products/category/${category.id}`)
        .expect(200);

      expect(response.body).toHaveLength(2);

      expect(response.body.map((product) => product.name)).toEqual(
        expect.arrayContaining(["Product One", "Product Two"]),
      );
    });

    it("[INVÁLIDA] debe retornar una lista vacía para una categoría inexistente", async () => {
      const response = await request(app)
        .get("/api/products/category/999")
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it("[LÍMITE] debe ordenar y paginar los productos usando sort, limit y offset", async () => {
      await Product.create({
        name: "Alpha",
        price: 100,
        inventory: 10,
        taxRate: 0.07,
        categoryId: category.id,
      });

      await Product.create({
        name: "Beta",
        price: 200,
        inventory: 10,
        taxRate: 0.07,
        categoryId: category.id,
      });

      await Product.create({
        name: "Gamma",
        price: 300,
        inventory: 10,
        taxRate: 0.07,
        categoryId: category.id,
      });

      const response = await request(app)
        .get(
          `/api/products/category/${category.id}?sort=name,ASC&limit=2&offset=1`,
        )
        .expect(200);

      expect(response.body).toHaveLength(2);

      expect(response.body.map((product) => product.name)).toEqual([
        "Beta",
        "Gamma",
      ]);
    });
  });

  describe("GET /api/products/categories", () => {
    it("[VÁLIDA] debe retornar productos de varias categorías", async () => {
      const secondCategory = await Category.create({
        name: "Second Category",
      });

      await Product.create({
        name: "Product One",
        price: 100,
        inventory: 10,
        taxRate: 0.07,
        categoryId: category.id,
      });

      await Product.create({
        name: "Product Two",
        price: 200,
        inventory: 5,
        taxRate: 0.1,
        categoryId: secondCategory.id,
      });

      const response = await request(app)
        .get(
          `/api/products/categories?categories=${category.id},${secondCategory.id}`,
        )
        .expect(200);

      expect(response.body).toHaveLength(2);

      expect(response.body.map((product) => product.name)).toEqual(
        expect.arrayContaining(["Product One", "Product Two"]),
      );
    });

    it("[INVÁLIDA] debe rechazar una consulta sin el parámetro categories", async () => {
      const response = await request(app)
        .get("/api/products/categories")
        .expect(400);

      expect(response.body.error).toBe("Categories parameter is required");

      const products = await Product.findAll();
      expect(products).toHaveLength(0);
    });
  });
});
