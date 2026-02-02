import React, { useState } from 'react';
import { ref, push, set, serverTimestamp, get, update } from "firebase/database";
import { db } from '../firebaseConfig';
import { BulkSellItem, StockItem, InvoiceData } from '../types';
import { Plus, Trash2, Save, X, Package, DollarSign, FileText, User, Building, Phone, Mail } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BulkSellProps {
  warehouseId: string;
  userEmail: string;
  onBack: () => void;
  existingItems: StockItem[];
}

export const BulkSell: React.FC<BulkSellProps> = ({ warehouseId, userEmail, onBack, existingItems }) => {
  const [items, setItems] = useState<BulkSellItem[]>([
    {
      id: '1',
      name: '',
      category: '',
      quantity: 0,
      sellPrice: 0,
      taxPercent: 18
    }
  ]);
  
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    sellerName: '',
    sellerAddress: '',
    sellerPhone: '',
    sellerEmail: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    items: [],
    date: new Date().toLocaleDateString('en-IN'),
    invoiceNumber: `INV-${Date.now()}`
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    const newItem: BulkSellItem = {
      id: Date.now().toString(),
      name: '',
      category: '',
      quantity: 0,
      sellPrice: 0,
      taxPercent: 18
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof BulkSellItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateInvoiceData = (field: keyof InvoiceData, value: any) => {
    setInvoiceData({ ...invoiceData, [field]: value });
  };

  const generateInvoicePDF = (data: InvoiceData) => {
    const doc = new jsPDF();
    
    // Calculate totals
    const subTotal = data.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0);
    const totalTax = data.items.reduce((sum, item) => sum + (item.quantity * item.sellPrice * item.taxPercent / 100), 0);
    const grandTotal = subTotal + totalTax;

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text("StockMaster", 14, 25);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text("Premium Inventory Solutions", 14, 32);

    // Invoice Title
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(20);
    doc.text("TAX INVOICE", 105, 55, { align: 'center' });

    // Invoice Details
    doc.setFontSize(10);
    doc.text(`Invoice #: ${data.invoiceNumber}`, 14, 70);
    doc.text(`Date: ${data.date}`, 14, 77);

    // Seller Details
    doc.setFont("helvetica", "bold");
    doc.text("Seller Details:", 14, 90);
    doc.setFont("helvetica", "normal");
    doc.text(data.sellerName, 14, 97);
    doc.text(data.sellerAddress, 14, 104);
    doc.text(`Phone: ${data.sellerPhone}`, 14, 111);
    doc.text(`Email: ${data.sellerEmail}`, 14, 118);

    // Customer Details
    doc.setFont("helvetica", "bold");
    doc.text("Customer Details:", 120, 90);
    doc.setFont("helvetica", "normal");
    doc.text(data.customerName, 120, 97);
    doc.text(data.customerAddress, 120, 104);
    doc.text(`Phone: ${data.customerPhone}`, 120, 111);
    doc.text(`Email: ${data.customerEmail}`, 120, 118);

    // Items Table
    const tableData = data.items.map(item => [
      item.name,
      item.category,
      item.quantity.toString(),
      `₹${item.sellPrice.toFixed(2)}`,
      `${item.taxPercent}%`,
      `₹${(item.quantity * item.sellPrice).toFixed(2)}`,
      `₹${(item.quantity * item.sellPrice * item.taxPercent / 100).toFixed(2)}`
    ]);

    autoTable(doc, {
      head: [['Item', 'Category', 'Qty', 'Price', 'Tax', 'Amount', 'Tax Amount']],
      body: tableData,
      startY: 130,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(`Subtotal: ₹${subTotal.toFixed(2)}`, 140, finalY);
    doc.text(`Total Tax: ₹${totalTax.toFixed(2)}`, 140, finalY + 7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`, 140, finalY + 14);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Thank you for your business!", 105, 280, { align: 'center' });

    // Save the PDF
    doc.save(`invoice-${data.invoiceNumber}.pdf`);
  };

  const handleSubmit = async () => {
    const validItems = items.filter(item => item.name && item.category && item.quantity > 0 && item.sellPrice > 0);
    
    if (validItems.length === 0) {
      alert('Please add at least one valid item with all required fields');
      return;
    }

    if (!invoiceData.sellerName || !invoiceData.customerName) {
      alert('Please fill in seller and customer details');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update inventory and create transactions
      for (const item of validItems) {
        let stockItem: StockItem | undefined;
        
        // Check if it's an existing item
        if (item.existingItemId) {
          stockItem = existingItems.find(existing => existing.id === item.existingItemId);
        }

        if (stockItem) {
          // Update existing item quantity
          const newQuantity = stockItem.quantity - item.quantity;
          if (newQuantity < 0) {
            alert(`Insufficient stock for ${item.name}. Available: ${stockItem.quantity}, Requested: ${item.quantity}`);
            continue;
          }

          await update(ref(db, `stock/${warehouseId}/${stockItem.id}`), {
            quantity: newQuantity,
            lastUpdated: serverTimestamp()
          });

          // Create transaction
          const transaction = {
            itemId: stockItem.id,
            type: 'OUT' as const,
            quantity: item.quantity,
            price: item.sellPrice,
            costPrice: stockItem.price,
            taxPercent: item.taxPercent,
            date: serverTimestamp() as unknown as string,
            partyName: invoiceData.customerName,
            userEmail
          };

          await push(ref(db, `transactions/${warehouseId}`), transaction);
        }
      }

      // Generate and save invoice
      const finalInvoiceData = { ...invoiceData, items: validItems };
      generateInvoicePDF(finalInvoiceData);

      alert(`Successfully processed sale for ${validItems.length} items! Invoice generated.`);
      onBack();
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Error processing sale. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectExistingItem = (id: string, itemId: string) => {
    const selectedItem = existingItems.find(item => item.id === itemId);
    if (selectedItem) {
      updateItem(id, 'name', selectedItem.name);
      updateItem(id, 'category', selectedItem.category);
      updateItem(id, 'existingItemId', selectedItem.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Bulk Sell Items</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Processing...' : 'Process Sale & Generate Invoice'}
          </button>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Seller Details */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Seller Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={invoiceData.sellerName}
                onChange={(e) => updateInvoiceData('sellerName', e.target.value)}
                placeholder="Your company name"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={invoiceData.sellerAddress}
                onChange={(e) => updateInvoiceData('sellerAddress', e.target.value)}
                placeholder="Your address"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={invoiceData.sellerPhone}
                  onChange={(e) => updateInvoiceData('sellerPhone', e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={invoiceData.sellerEmail}
                  onChange={(e) => updateInvoiceData('sellerEmail', e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold">Customer Details</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={invoiceData.customerName}
                onChange={(e) => updateInvoiceData('customerName', e.target.value)}
                placeholder="Customer name"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea
                value={invoiceData.customerAddress}
                onChange={(e) => updateInvoiceData('customerAddress', e.target.value)}
                placeholder="Customer address"
                rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={invoiceData.customerPhone}
                  onChange={(e) => updateInvoiceData('customerPhone', e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={invoiceData.customerEmail}
                  onChange={(e) => updateInvoiceData('customerEmail', e.target.value)}
                  placeholder="Email address"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select Existing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sell Price (₹)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <select
                      onChange={(e) => e.target.value && selectExistingItem(item.id, e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select existing item</option>
                      {existingItems.map(existing => (
                        <option key={existing.id} value={existing.id}>
                          {existing.name} (Stock: {existing.quantity})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      placeholder="Item name"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      placeholder="Category"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.sellPrice}
                      onChange={(e) => updateItem(item.id, 'sellPrice', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.taxPercent}
                      onChange={(e) => updateItem(item.id, 'taxPercent', parseFloat(e.target.value) || 0)}
                      placeholder="18"
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    ₹{(item.quantity * item.sellPrice).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Sale Summary:</span>
          </div>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Items:</span>
              <span className="ml-2 font-semibold">{items.length}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Quantity:</span>
              <span className="ml-2 font-semibold">{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div>
              <span className="text-gray-600">Subtotal:</span>
              <span className="ml-2 font-semibold">₹{items.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Valid Items:</span>
              <span className="ml-2 font-semibold">{items.filter(item => item.name && item.category && item.quantity > 0 && item.sellPrice > 0).length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
