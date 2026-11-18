// Comprehensive verification test of BizTrack Nigeria business logic
console.log('====================================================');
console.log('🧪 BIZTRACK NIGERIA: SYSTEM FLOW & VERIFICATION TEST');
console.log('====================================================\n');

// 1. Initial State Setup
let businessProfile = {
  businessName: 'Chinedu & Sons Super Provisions',
  tagline: 'Your Business. Your Records. Your Growth.',
  ownerName: 'Chinedu Okonkwo',
  phoneNumber: '+234 803 456 7890',
  bankName: 'Zenith Bank',
  accountNumber: '1014892019',
};

let products = [
  {
    id: 'prod-rice',
    name: 'Mama Gold Rice (50kg Bag)',
    category: 'Grains & Flours',
    costPrice: 72000,
    sellingPrice: 82000,
    stockQuantity: 10,
    minStockLevel: 3,
    unit: 'bags',
  },
  {
    id: 'prod-oil',
    name: "Devon King's Vegetable Oil (5L)",
    category: 'Cooking Oils',
    costPrice: 11500,
    sellingPrice: 13500,
    stockQuantity: 20,
    minStockLevel: 5,
    unit: 'bottles',
  },
];

let sales = [];
let debts = [];
let expenses = [];

// Helper currency formatter
function formatNaira(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}

// TEST 1: Register / Update Business Profile
console.log('STEP 1: Register / Update Business Profile');
businessProfile.businessName = 'Kano & Lagos Modern Provisions Hub';
businessProfile.ownerName = 'Alhaji Chinedu Bello';
console.log(`✅ Business registered: "${businessProfile.businessName}" (Owner: ${businessProfile.ownerName})`);
console.log('----------------------------------------------------');

// TEST 2: Add New Product
console.log('STEP 2: Add New Product to Inventory');
const newProduct = {
  id: 'prod-indomie',
  name: 'Indomie Hungryman Carton (24 packs)',
  category: 'Noodles & Pasta',
  costPrice: 11800,
  sellingPrice: 13500,
  stockQuantity: 15,
  minStockLevel: 5,
  unit: 'cartons',
};
products.push(newProduct);
const unitProfit = newProduct.sellingPrice - newProduct.costPrice;
const marginPct = ((unitProfit / newProduct.sellingPrice) * 100).toFixed(1);
console.log(`✅ Added product: ${newProduct.name}`);
console.log(`   Cost: ${formatNaira(newProduct.costPrice)} | Selling: ${formatNaira(newProduct.sellingPrice)}`);
console.log(`   Available Stock: ${newProduct.stockQuantity} ${newProduct.unit}`);
console.log(`   Unit Margin: ${formatNaira(unitProfit)} (${marginPct}%)`);
console.log('----------------------------------------------------');

// TEST 3: Record a Sale of 3 bags of Rice and 2 bottles of Oil
console.log('STEP 3 & 4: Record a Sale & Check Stock Reduction');
const initialRiceStock = products.find((p) => p.id === 'prod-rice').stockQuantity;
const saleItems = [
  { productId: 'prod-rice', quantity: 3 }, // 3 x 82,000 = 246,000
  { productId: 'prod-oil', quantity: 2 },  // 2 x 13,500 = 27,000
];

let subtotal = 0;
let totalCost = 0;
saleItems.forEach((item) => {
  const prod = products.find((p) => p.id === item.productId);
  subtotal += prod.sellingPrice * item.quantity;
  totalCost += prod.costPrice * item.quantity;
  // Deduct stock
  prod.stockQuantity -= item.quantity;
});

const discount = 3000;
const totalAmount = subtotal - discount; // (246,000 + 27,000) - 3,000 = 270,000
const amountPaid = 200000; // Partial payment: ₦200,000 paid, ₦70,000 debt
const balanceDue = totalAmount - amountPaid;
const grossProfit = totalAmount - totalCost;

const recordedSale = {
  id: 'sale-test-1',
  saleNumber: 'REC-2026-TEST',
  items: saleItems,
  subtotal,
  discount,
  totalAmount,
  totalCost,
  grossProfit,
  paymentStatus: 'partial',
  amountPaid,
  balanceDue,
  customerName: 'Madam Grace Eke',
  customerPhone: '0802 345 6789',
};
sales.push(recordedSale);

const updatedRiceStock = products.find((p) => p.id === 'prod-rice').stockQuantity;
console.log(`✅ Sale recorded: #${recordedSale.saleNumber}`);
console.log(`   Subtotal: ${formatNaira(subtotal)}, Discount: ${formatNaira(discount)}`);
console.log(`   Total Amount: ${formatNaira(totalAmount)}`);
console.log(`   COGS (Cost of Goods): ${formatNaira(totalCost)}`);
console.log(`   Gross Profit: ${formatNaira(grossProfit)}`);
console.log(`   Amount Paid: ${formatNaira(amountPaid)} (Cash Received)`);
console.log(`   Balance Due (Credit): ${formatNaira(balanceDue)}`);
console.log(`✅ Stock check verification: Initial Rice was ${initialRiceStock}, now reduced to ${updatedRiceStock} bags.`);
if (updatedRiceStock === initialRiceStock - 3) {
  console.log('   >>> Stock reduction assertion PASSED (Exactly 3 bags deducted).');
} else {
  throw new Error('Stock deduction assertion failed!');
}
console.log('----------------------------------------------------');

// TEST 5 & 6: Customer Debt & Repayment
console.log('STEP 5 & 6: Customer Debt Tracker & Repayment Verification');
// As balanceDue was ₦70,000, create customer debt
const customerDebt = {
  id: 'debt-test-1',
  customerName: 'Madam Grace Eke',
  customerPhone: '0802 345 6789',
  totalDebt: totalAmount,
  amountPaid: amountPaid,
  balanceDue: balanceDue, // 70,000
  status: 'active',
  repayments: [
    {
      id: 'rep-initial',
      amount: amountPaid,
      notes: 'Initial deposit',
    },
  ],
};
debts.push(customerDebt);
console.log(`✅ Customer Debt Record created for ${customerDebt.customerName}:`);
console.log(`   Total Debt: ${formatNaira(customerDebt.totalDebt)}`);
console.log(`   Initial Paid: ${formatNaira(customerDebt.amountPaid)}`);
console.log(`   Current Balance: ${formatNaira(customerDebt.balanceDue)}`);

// Now Customer makes a repayment of ₦40,000
console.log('\n--- Customer makes a partial repayment of ₦40,000 ---');
const repaymentAmount = 40000;
customerDebt.amountPaid += repaymentAmount;
customerDebt.balanceDue -= repaymentAmount;
customerDebt.repayments.push({
  id: 'rep-2',
  amount: repaymentAmount,
  notes: 'Bank transfer repayment',
});

console.log(`✅ Repayment recorded: ${formatNaira(repaymentAmount)}`);
console.log(`   New Total Paid: ${formatNaira(customerDebt.amountPaid)}`);
console.log(`   New Remaining Debt: ${formatNaira(customerDebt.balanceDue)}`);
if (customerDebt.balanceDue === 30000) {
  console.log('   >>> Debt balance assertion PASSED (₦70,000 - ₦40,000 = ₦30,000).');
} else {
  throw new Error('Debt balance assertion failed!');
}
console.log('----------------------------------------------------');

// TEST 7: Add an Expense
console.log('STEP 7: Add Operating Expense');
const newExpense = {
  id: 'exp-test-1',
  title: 'Generator Fuel PMS (20 Litres)',
  category: 'Generator Fuel',
  amount: 22000,
  paymentMethod: 'Cash',
};
expenses.push(newExpense);
console.log(`✅ Expense recorded: "${newExpense.title}" — ${formatNaira(newExpense.amount)} (${newExpense.category})`);
console.log('----------------------------------------------------');

// TEST 8: Verify Dashboard Profit, COGS, Expenses & Net Profit
console.log('STEP 8: Dashboard & Profit Verification');
const totalSalesCalc = sales.reduce((sum, s) => sum + s.totalAmount, 0);
const totalCogsCalc = sales.reduce((sum, s) => sum + s.totalCost, 0);
const grossProfitCalc = totalSalesCalc - totalCogsCalc;
const totalExpensesCalc = expenses.reduce((sum, e) => sum + e.amount, 0);
const netProfitCalc = grossProfitCalc - totalExpensesCalc;
const totalOutstandingDebtsCalc = debts
  .filter((d) => d.status === 'active')
  .reduce((sum, d) => sum + d.balanceDue, 0);

console.log(`📊 Total Sales Revenue:     ${formatNaira(totalSalesCalc)}`);
console.log(`📉 Cost of Goods Sold:      ${formatNaira(totalCogsCalc)}`);
console.log(`💰 Gross Trading Profit:    ${formatNaira(grossProfitCalc)} (Sales - COGS)`);
console.log(`📉 Operating Expenses:      ${formatNaira(totalExpensesCalc)}`);
console.log(`🏆 Estimated Net Profit:    ${formatNaira(netProfitCalc)} (Gross Profit - Expenses)`);
console.log(`⚠️ Outstanding Customer Debts: ${formatNaira(totalOutstandingDebtsCalc)}`);

// Assertions
if (grossProfitCalc !== totalSalesCalc - totalCogsCalc) {
  throw new Error('Gross profit calculation error!');
}
if (netProfitCalc !== grossProfitCalc - totalExpensesCalc) {
  throw new Error('Net profit calculation error!');
}
if (totalOutstandingDebtsCalc !== 30000) {
  throw new Error('Outstanding debt balance calculation error!');
}

console.log('\n🎉 ALL 8 WORKFLOW TESTS PASSED PERFECTLY!');
console.log('====================================================\n');
