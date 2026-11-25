import { Router, Request, Response } from "express";
import multer from "multer";
import uploadConfig from "./config/multer";
import { isAuthenticated, can, USER_TYPES } from "./middlewares/permissions";
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
import { ListSalesController } from "./controllers/sale/ListSalesController";
import { RemoveSaleController } from "./controllers/sale/RemoveSaleController";
import { StockAssistantController } from "./controllers/ai/StockAssistantController";
import { ProductSuggestionController } from "./controllers/ai/ProductSuggestionController";
import { SalesInsightsController } from "./controllers/ai/SalesInsightsController";
import { SemanticSearchController } from "./controllers/ai/SemanticSearchController";
import { InvoiceExtractionController } from "./controllers/ai/InvoiceExtractionController";
import { StockEntryController } from "./controllers/product/StockEntryController";
import { RestockForecastController } from "./controllers/sale/RestockForecastController";

const router = Router();
const upload = multer(uploadConfig.upload("./tmp"));
const uploadToMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/test", (request: Request, response: Response) => {
  return response.json({ ok: true });
});

// Auth Route
router.post("/sign-in", new AuthUserController().handle);

// User Routes
router.post(
  "/user",
  isAuthenticated,
  can(USER_TYPES.ADMIN),
  new CreateUserController().handle,
);
router.get(
  "/users",
  isAuthenticated,
  can(USER_TYPES.ADMIN),
  new ListUsersController().handle,
);
router.get(
  "/user/:user_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN),
  new DetailUserController().handle,
);
router.put(
  "/user/:user_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN),
  new EditUserController().handle,
);
router.put(
  "/user/password/:user_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN),
  new UpdateUserPasswordController().handle,
);
router.delete(
  "/user/:user_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN),
  new RemoveUserController().handle,
);

// Category Routes
router.get(
  "/categories",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new ListCategoryController().handle,
);
router.post(
  "/category",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new CreateCategoryController().handle,
);
router.put(
  "/category/:category_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new EditCategoryController().handle,
);
router.delete(
  "/category/:category_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new RemoveCategoryController().handle,
);

// Product Routes
router.get(
  "/products",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new ListProductsController().handle,
);
router.get(
  "/product/:product_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new DetailProductController().handle,
);
router.get(
  "/products/:category_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new ListProductByCategoryController().handle,
);
router.post(
  "/product",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  upload.single("file"),
  new CreateProductController().handle,
);
router.put(
  "/product/:product_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  upload.single("file"),
  new EditProductController().handle,
);
router.delete(
  "/product/:product_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new RemoveProductController().handle,
);

// Sale Route
router.put(
  "/sale/:product_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new SaleProductController().handle,
);
router.get(
  "/sales",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new ListSalesController().handle,
);
router.get(
  "/sales/restock-forecast",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new RestockForecastController().handle,
);
router.delete(
  "/sales/:sale_id",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new RemoveSaleController().handle,
);

// AI Route
router.post(
  "/ai/assistant",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new StockAssistantController().handle,
);
router.post(
  "/ai/product-suggestion",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  uploadToMemory.single("file"),
  new ProductSuggestionController().handle,
);
router.post(
  "/ai/sales-insights",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new SalesInsightsController().handle,
);
router.get(
  "/ai/search",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new SemanticSearchController().search,
);
router.get(
  "/ai/search/status",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR, USER_TYPES.SELLER),
  new SemanticSearchController().status,
);
router.post(
  "/ai/search/reindex",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new SemanticSearchController().reindex,
);
router.post(
  "/ai/invoice-extraction",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  uploadToMemory.single("file"),
  new InvoiceExtractionController().handle,
);

// Stock Entry Route
router.post(
  "/stock-entries",
  isAuthenticated,
  can(USER_TYPES.ADMIN, USER_TYPES.OPERATOR),
  new StockEntryController().handle,
);

export { router };
