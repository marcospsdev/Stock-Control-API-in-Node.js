import express, { Request, Response, NextFunction } from "express";
import { router } from "./routes";

const app = express();
const port = 3333;
app.use(express.json());
app.use(router);

app.listen(port, () => {
  console.log(
    "Servidor rodando na porta 3333 - Projeto Controle de Estoque curso NodeJs",
  );
});
