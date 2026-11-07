// // Mock the models
// jest.mock('../../models/cart', () => ({
//   create: jest.fn(),
//   findByPk: jest.fn()
// }));

// jest.mock('../../models/cartItem', () => ({
//   findOne: jest.fn(),
//   findAll: jest.fn(),
//   create: jest.fn(),
//   findByPk: jest.fn()
// }));

// jest.mock('../../models/product', () => ({
//   findByPk: jest.fn()
// }));

// const CartService = require('../../services/cartService');
// const Cart = require('../../models/cart');
// const CartItem = require('../../models/cartItem');
// const Product = require('../../models/product');

// describe('CartService', () => {
//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('createCart', () => {
//     it('should create a new cart', async () => {

//     });
//   });

//   describe('addItemToCart', () => {
//     const mockProduct = { id: 1, inventory: 10, price: 100 };
//     const mockCartItem = { cartId: 1, productId: 1, quantity: 2 };

//     it('should add new item to cart when product exists and has sufficient inventory', async () => {

//     });

//   });

//   describe('getCartItems', () => {
//     it('should return cart items with calculated totals', async () => {

//     });
//   });

//   describe('updateCartItem', () => {
//     it('should update cart item quantity when sufficient inventory', async () => {

//     });
//   });

//   describe('removeCartItem', () => {
//     it('should remove cart item successfully', async () => {

//     });
//   });
// });

jest.mock("../../models/cart", () => ({
  create: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock("../../models/cartItem", () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn(),
}));

jest.mock("../../models/product", () => ({
  findByPk: jest.fn(),
}));

const CartService = require("../../services/cartService");
const Cart = require("../../models/cart");
const CartItem = require("../../models/cartItem");
const Product = require("../../models/product");

describe("CartService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createCart", () => {
    it("[VÁLIDA] debe crear un nuevo carrito", async () => {
      const userId = 1;
      const expectedCart = { id: 1, userId, status: "open" };

      Cart.create.mockResolvedValue(expectedCart);

      const result = await CartService.createCart(userId);

      expect(Cart.create).toHaveBeenCalledWith({ userId });
      expect(result).toEqual(expectedCart);
    });
  });

  describe("addItemToCart", () => {
    const mockProduct = {
      id: 1,
      inventory: 10,
      price: 100,
    };

    it("[VÁLIDA] debe agregar un producto existente con inventario suficiente", async () => {
      const expectedItem = {
        cartId: 1,
        productId: 1,
        quantity: 2,
      };

      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue(expectedItem);

      const result = await CartService.addItemToCart(1, 1, 2);

      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(CartItem.create).toHaveBeenCalledWith({
        cartId: 1,
        productId: 1,
        quantity: 2,
      });
      expect(result).toEqual(expectedItem);
    });

    it("[INVÁLIDA] debe rechazar un producto inexistente", async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(CartService.addItemToCart(1, 99, 2)).rejects.toThrow(
        "Product not found",
      );

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it("[INVÁLIDA] debe rechazar una cantidad superior al inventario", async () => {
      Product.findByPk.mockResolvedValue(mockProduct);

      await expect(CartService.addItemToCart(1, 1, 11)).rejects.toThrow(
        "Not enough inventory available",
      );

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it("[VÁLIDA] debe incrementar la cantidad de un producto ya existente", async () => {
      const existingItem = {
        cartId: 1,
        productId: 1,
        quantity: 2,
        save: jest.fn().mockResolvedValue(true),
      };

      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(existingItem);

      const result = await CartService.addItemToCart(1, 1, 3);

      expect(existingItem.quantity).toBe(5);
      expect(existingItem.save).toHaveBeenCalled();
      expect(result).toBe(existingItem);
    });

    it("[INVÁLIDA] debe rechazar una cantidad combinada superior al inventario", async () => {
      const existingItem = {
        cartId: 1,
        productId: 1,
        quantity: 8,
        save: jest.fn(),
      };

      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(existingItem);

      await expect(CartService.addItemToCart(1, 1, 3)).rejects.toThrow(
        "Not enough inventory available",
      );

      expect(existingItem.save).not.toHaveBeenCalled();
    });

    it("[LÍMITE] debe rechazar una cantidad igual a cero", async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      await expect(CartService.addItemToCart(1, 1, 0)).rejects.toThrow();

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it("[INVÁLIDA] debe rechazar una cantidad negativa", async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      await expect(CartService.addItemToCart(1, 1, -2)).rejects.toThrow();

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it("[INVÁLIDA] debe rechazar una cantidad decimal", async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      await expect(CartService.addItemToCart(1, 1, 1.5)).rejects.toThrow();

      expect(CartItem.create).not.toHaveBeenCalled();
    });

    it("[INVÁLIDA] debe rechazar una cantidad muy grande cuando el producto no existe", async () => {
      Product.findByPk.mockResolvedValue(null);

      await expect(CartService.addItemToCart(1, 999, 999)).rejects.toThrow(
        "Product not found",
      );

      expect(Product.findByPk).toHaveBeenCalledWith(999);
      expect(CartItem.create).not.toHaveBeenCalled();
    });
  });

  describe("getCartItems", () => {
    it("[INVÁLIDA] debe rechazar un ID de carrito no numérico", async () => {
      await expect(CartService.getCartItems("abc")).rejects.toThrow(
        "Cart ID should be a number",
      );

      expect(Cart.findByPk).not.toHaveBeenCalled();
    });

    it("[INVÁLIDA] debe retornar null cuando el carrito no existe", async () => {
      Cart.findByPk.mockResolvedValue(null);

      const result = await CartService.getCartItems(99);

      expect(result).toBeNull();
      expect(CartItem.findAll).not.toHaveBeenCalled();
    });

    it("[VÁLIDA] debe retornar los productos con sus totales calculados", async () => {
      const item = {
        quantity: 2,
        Product: {
          price: 100,
          taxRate: 0.07,
        },
        toJSON: () => ({
          quantity: 2,
          Product: {
            price: 100,
            taxRate: 0.07,
          },
        }),
      };

      Cart.findByPk.mockResolvedValue({ id: 1 });
      CartItem.findAll.mockResolvedValue([item]);

      const result = await CartService.getCartItems(1);

      // expect(result.items).toHaveLength(1);
      // expect(result.items[0].itemSubtotal).toBe(200);
      // expect(result.items[0].itemTax).toBe(14);
      // expect(result.summary).toEqual({
      //   subtotal: 200,
      //   totalTax: 14,
      //   total: 214
      // });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].itemSubtotal).toBeCloseTo(200, 2);
      expect(result.items[0].itemTax).toBeCloseTo(14, 2);

      expect(result.summary.subtotal).toBeCloseTo(200, 2);
      expect(result.summary.totalTax).toBeCloseTo(14, 2);
      expect(result.summary.total).toBeCloseTo(214, 2);
    });
  });

  describe("updateCartItem", () => {
    it("[VÁLIDA] debe actualizar la cantidad con inventario suficiente", async () => {
      const item = {
        quantity: 2,
        Product: { inventory: 10 },
        save: jest.fn().mockResolvedValue(true),
      };

      CartItem.findByPk.mockResolvedValue(item);

      const result = await CartService.updateCartItem(1, 5);

      expect(item.quantity).toBe(5);
      expect(item.save).toHaveBeenCalled();
      expect(result).toBe(item);
    });

    it("[INVÁLIDA] debe rechazar un artículo inexistente", async () => {
      CartItem.findByPk.mockResolvedValue(null);

      await expect(CartService.updateCartItem(99, 2)).rejects.toThrow(
        "Item not found",
      );
    });

    it("[INVÁLIDA] debe rechazar una cantidad superior al inventario al actualizar", async () => {
      const item = {
        quantity: 2,
        Product: { inventory: 5 },
        save: jest.fn(),
      };

      CartItem.findByPk.mockResolvedValue(item);

      await expect(CartService.updateCartItem(1, 6)).rejects.toThrow(
        "Not enough inventory available",
      );

      expect(item.save).not.toHaveBeenCalled();
    });
  });

  describe("removeCartItem", () => {
    it("[VÁLIDA] debe eliminar un artículo existente", async () => {
      const item = {
        destroy: jest.fn().mockResolvedValue(true),
      };

      CartItem.findByPk.mockResolvedValue(item);

      await CartService.removeCartItem(1);

      expect(item.destroy).toHaveBeenCalled();
    });

    it("[INVÁLIDA] debe rechazar la eliminación de un artículo inexistente", async () => {
      CartItem.findByPk.mockResolvedValue(null);

      await expect(CartService.removeCartItem(99)).rejects.toThrow(
        "Item not found",
      );
    });
  });
});
