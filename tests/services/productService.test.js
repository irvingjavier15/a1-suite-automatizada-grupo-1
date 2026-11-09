jest.mock("../../models/product", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  belongsTo: jest.fn(),
}));

jest.mock("../../models/category", () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
}));

const ProductService = require("../../services/productService");
const Product = require("../../models/product");
const Category = require("../../models/category");

describe("ProductService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllProducts", () => {
    it("[VÁLIDA] debe retornar todos los productos", async () => {
      const products = [
        { id: 1, name: "Laptop", price: 1200 },
        { id: 2, name: "Mouse", price: 25 },
      ];

      Product.findAll.mockResolvedValue(products);

      const result = await ProductService.getAllProducts();

      expect(Product.findAll).toHaveBeenCalledWith();
      expect(result).toEqual(products);
    });
  });

  describe("getProductById", () => {
    it("[VÁLIDA] debe retornar un producto existente", async () => {
      const product = { id: 1, name: "Laptop", price: 1200 };

      Product.findByPk.mockResolvedValue(product);

      const result = await ProductService.getProductById(1);

      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(product);
    });

    it("[INVÁLIDA] debe retornar null cuando el producto no existe", async () => {
      Product.findByPk.mockResolvedValue(null);

      const result = await ProductService.getProductById(99);

      expect(Product.findByPk).toHaveBeenCalledWith(99);
      expect(result).toBeNull();
    });
  });

  describe("createProduct", () => {
    it("[VÁLIDA] debe crear un producto cuando la categoría existe", async () => {
      const newProduct = {
        name: "Keyboard",
        price: 50,
        categoryId: 2,
      };

      const createdProduct = { id: 1, ...newProduct };

      Category.findByPk.mockResolvedValue({ id: 2 });
      Product.create.mockResolvedValue(createdProduct);

      const result = await ProductService.createProduct(newProduct);

      expect(Category.findByPk).toHaveBeenCalledWith(2);
      expect(Product.create).toHaveBeenCalledWith(newProduct);
      expect(result).toEqual(createdProduct);
    });

    it("[INVÁLIDA] debe rechazar la creación cuando la categoría no existe", async () => {
      const newProduct = {
        name: "Keyboard",
        price: 50,
        categoryId: 99,
      };

      Category.findByPk.mockResolvedValue(null);

      await expect(ProductService.createProduct(newProduct)).rejects.toThrow(
        "Category with id 99 does not exist",
      );

      expect(Product.create).not.toHaveBeenCalled();
    });
  });

  describe("getProductsByCategory", () => {
    it("[VÁLIDA] debe buscar productos por categoría", async () => {
      const products = [{ id: 1, name: "Laptop", categoryId: 2 }];

      Product.findAll.mockResolvedValue(products);

      const result = await ProductService.getProductsByCategory(2);

      expect(Product.findAll).toHaveBeenCalledWith({
        where: { categoryId: 2 },
        include: Category,
      });
      expect(result).toEqual(products);
    });

    it("[LÍMITE] debe aplicar ordenamiento, límite y desplazamiento", async () => {
      const products = [{ id: 1, name: "Laptop", categoryId: 2 }];

      Product.findAll.mockResolvedValue(products);

      const result = await ProductService.getProductsByCategory(2, {
        sort: "price,DESC",
        limit: "10",
        offset: "5",
      });

      expect(Product.findAll).toHaveBeenCalledWith({
        where: { categoryId: 2 },
        include: Category,
        order: [["price", "DESC"]],
        limit: 10,
        offset: 5,
      });

      expect(result).toEqual(products);
    });

    it("[LÍMITE] debe aplicar límite y desplazamiento sin ordenamiento", async () => {
      const products = [
        { id: 2, name: "Mouse", categoryId: 2 },
        { id: 3, name: "Teclado", categoryId: 2 },
      ];

      Product.findAll.mockResolvedValue(products);

      const result = await ProductService.getProductsByCategory(2, {
        limit: "2",
        offset: "1",
      });

      expect(Product.findAll).toHaveBeenCalledWith({
        where: { categoryId: 2 },
        include: Category,
        limit: 2,
        offset: 1,
      });

      expect(result).toEqual(products);
    });
  });

  describe("getProductsByCategories", () => {
    it("[VÁLIDA] debe buscar productos de varias categorías", async () => {
      const products = [
        { id: 1, name: "Laptop", categoryId: 2 },
        { id: 2, name: "Mouse", categoryId: 3 },
      ];

      Product.findAll.mockResolvedValue(products);

      const result = await ProductService.getProductsByCategories("2,3");

      expect(Product.findAll).toHaveBeenCalledWith({
        where: {
          categoryId: {
            [require("sequelize").Op.in]: [2, 3],
          },
        },
        include: Category,
      });

      expect(result).toEqual(products);
    });

    it("[INVÁLIDA] debe rechazar una lista de categorías vacía", async () => {
      await expect(ProductService.getProductsByCategories("")).rejects.toThrow(
        "Categories parameter is required",
      );

      expect(Product.findAll).not.toHaveBeenCalled();
    });

    it("[LÍMITE] debe aplicar ordenamiento, límite y desplazamiento", async () => {
      Product.findAll.mockResolvedValue([]);

      await ProductService.getProductsByCategories("2,3", {
        sort: "price,ASC",
        limit: "5",
        offset: "10",
      });

      expect(Product.findAll).toHaveBeenCalledWith({
        where: {
          categoryId: {
            [require("sequelize").Op.in]: [2, 3],
          },
        },
        include: Category,
        order: [["price", "ASC"]],
        limit: 5,
        offset: 10,
      });
    });
  });

  describe("updateProduct", () => {
    it("[VÁLIDA] debe actualizar un producto sin cambiar su categoría", async () => {
      const changes = { name: "Laptop Pro", price: 1500 };

      Product.update.mockResolvedValue([1]);

      const result = await ProductService.updateProduct(1, changes);

      expect(Category.findByPk).not.toHaveBeenCalled();
      expect(Product.update).toHaveBeenCalledWith(changes, {
        where: { id: 1 },
      });
      expect(result).toEqual([1]);
    });

    it("[VÁLIDA] debe actualizar un producto cuando la nueva categoría existe", async () => {
      const changes = { categoryId: 3, name: "Laptop Pro" };

      Category.findByPk.mockResolvedValue({ id: 3 });
      Product.update.mockResolvedValue([1]);

      const result = await ProductService.updateProduct(1, changes);

      expect(Category.findByPk).toHaveBeenCalledWith(3);
      expect(Product.update).toHaveBeenCalledWith(changes, {
        where: { id: 1 },
      });
      expect(result).toEqual([1]);
    });

    it("[INVÁLIDA] debe rechazar la actualización cuando la categoría no existe", async () => {
      const changes = { categoryId: 99 };

      Category.findByPk.mockResolvedValue(null);

      await expect(ProductService.updateProduct(1, changes)).rejects.toThrow(
        "Category with id 99 does not exist",
      );

      expect(Product.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteProduct", () => {
    it("[VÁLIDA] debe eliminar un producto por su identificador", async () => {
      Product.destroy.mockResolvedValue(1);

      const result = await ProductService.deleteProduct(1);

      expect(Product.destroy).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBe(1);
    });
  });
});
