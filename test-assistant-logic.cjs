const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync('src/utils/bizTrackAssistant.ts', 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const transpiledModule = { exports: {} };
new Function('module', 'exports', compiled)(transpiledModule, transpiledModule.exports);

const { completeProductPricing, parseAssistantRequest } = transpiledModule.exports;

const product = parseAssistantRequest(
  'I bought 12 pairs of shoes. Each cost ₦3,000 and I want to sell each for ₦5,000. Add them to my inventory.'
);
assert.equal(product.type, 'addProduct');
assert.equal(product.quantity, 12);
assert.equal(product.name, 'shoes');
assert.equal(product.unit, 'pairs');
assert.equal(product.costPrice, 3000);
assert.equal(product.sellingPrice, 5000);
assert.equal(product.ambiguousCost, false);

const ambiguousProduct = parseAssistantRequest('I bought 12 shoes for ₦3,000.');
assert.equal(ambiguousProduct.type, 'addProduct');
assert.equal(ambiguousProduct.ambiguousCost, true);
const clarifiedProduct = completeProductPricing(ambiguousProduct, 'That is the total for all of them; selling price is ₦5,000 each.');
assert.equal(clarifiedProduct.costPrice, 250);
assert.equal(clarifiedProduct.sellingPrice, 5000);
assert.equal(clarifiedProduct.ambiguousCost, false);
assert.equal(
  completeProductPricing(ambiguousProduct, 'Selling price is ₦5,000 each.').ambiguousCost,
  true
);

const expense = parseAssistantRequest('I spent ₦8,000 on transportation today.');
assert.equal(expense.type, 'expense');
assert.equal(expense.amount, 8000);
assert.equal(expense.category, 'Transportation & Logistics');

const sale = parseAssistantRequest('I sold 3 pairs of shoes.');
assert.equal(sale.type, 'sale');
assert.equal(sale.quantity, 3);
assert.equal(sale.productName, 'shoes');
assert.equal(sale.paymentStatus, undefined);
assert.equal(sale.customerName, undefined);

const creditSale = parseAssistantRequest('I sold 3 pairs of shoes to John on credit.');
assert.equal(creditSale.type, 'sale');
assert.equal(creditSale.paymentStatus, 'credit');
assert.equal(creditSale.customerName, 'John');
assert.equal(creditSale.unitPrice, undefined);
assert.equal(parseAssistantRequest('I sold 3 pairs of shoes for ₦5,000 each.').unitPrice, 5000);

const repayment = parseAssistantRequest('John has paid ₦10,000.');
assert.equal(repayment.type, 'repayment');
assert.equal(repayment.customerName, 'John');
assert.equal(repayment.amount, 10000);

assert.deepEqual(parseAssistantRequest('Which products are running low?'), {
  type: 'question',
  question: 'lowStock',
});
assert.deepEqual(parseAssistantRequest('Which product made the most gross profit?'), {
  type: 'question',
  question: 'topProductProfit',
});
assert.equal(parseAssistantRequest('What is the weather tomorrow?').type, 'unknown');

console.log('BizTrack AI parser tests passed.');
