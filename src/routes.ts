import { Router, Request, Response } from "express";
import multer from "multer";
import uploadConfig from "./config/multer";
import { isAuthenticated } from "./middlewares/isAuthenticated";
import { AuthUserController } from "./controllers/user/AuthUserController";
import { ListUsersController } from "./controllers/user/ListUsersController";
import { DetailUserController } from "./controllers/user/DetailUserController";
import { CreateUserController } from "./controllers/user/CreateUserController";
import { EditUserController } from "./controllers/user/EditUserController";
import { UpdateUserPasswordController } from "./controllers/user/UpdateUserPasswordController";
import { RemoveUserController } from "./controllers/user/RemoveUserController";
import { CreateCategoryController } from "./controllers/category/CreateCategoryController";
import { EditCategoryController } from "./controllers/category/EditCategoryController";
import { ListCategoryController } from "./controllers/category/ListCategoryController";
import { RemoveCategoryController } from "./controllers/category/RemoveCategoryController";
import { CreateProductController } from "./controllers/product/CreateProductController";
import { EditProductController } from "./controllers/product/EditProductController";
import { DetailProductController } from "./controllers/product/DetailProductController";
import { ListProductByCategoryController } from "./controllers/product/ListProductByCategoryController";
import { ListProductsController } from "./controllers/product/ListProductsController";
import { RemoveProductController } from "./controllers/product/RemoveProductController";
import { SaleProductController } from "./controllers/sale/SaleProductController";

const router = Router();
const upload = multer(uploadConfig.upload("./tmp"));

router.get("/test", (request: Request, response: Response) => {
  return response.json({ ok: true });
});

// Auth Route
router.post("/sign-in", new AuthUserController().handle);

// User Routes
router.get("/users", isAuthenticated, new ListUsersController().handle);
router.get("/user/:user_id", new DetailUserController().handle);
router.post("/user", new CreateUserController().handle);
router.put("/user/:user_id", isAuthenticated, new EditUserController().handle);
router.put(
  "/user/password/:user_id",
  isAuthenticated,
  new UpdateUserPasswordController().handle,
);
router.delete("/user/:user_id", new RemoveUserController().handle);

// Category Routes
router.get("/categories", isAuthenticated, new ListCategoryController().handle);
router.post(
  "/category",
  isAuthenticated,
  new CreateCategoryController().handle,
);
router.put(
  "/category/:category_id",
  isAuthenticated,
  new EditCategoryController().handle,
);
router.delete(
  "/category/:category_id",
  isAuthenticated,
  new RemoveCategoryController().handle,
);

// Product Routes
router.get("/products", isAuthenticated, new ListProductsController().handle);
router.get(
  "/product/:product_id",
  isAuthenticated,
  new DetailProductController().handle,
);
router.get(
  "/products/:category_id",
  isAuthenticated,
  new ListProductByCategoryController().handle,
);
router.post(
  "/product",
  isAuthenticated,
  upload.single("file"),
  new CreateProductController().handle,
);
router.put(
  "/product/:product_id",
  isAuthenticated,
  upload.single("file"),
  new EditProductController().handle,
);
router.delete(
  "/product/remove/:product_id",
  isAuthenticated,
  new RemoveProductController().handle,
);

// Sale Route
router.put(
  "/sale/:product_id",
  isAuthenticated,
  new SaleProductController().handle,
);

export { router };
