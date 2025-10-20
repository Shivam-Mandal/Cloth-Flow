// routes/stocks.js
import express from 'express';
import * as stockController from '../controllers/stockController.js';
const router = express.Router();

router.get('/', stockController.getAllStocks);
router.get('/:id', stockController.getStockById);
router.post('/', stockController.createStock);
router.put('/:id', stockController.updateStock);
router.delete('/:id', stockController.deleteStock);

export {router as stockRouter};
