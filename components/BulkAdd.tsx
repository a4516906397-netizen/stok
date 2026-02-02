import React, { useState } from 'react';
import { ref, push, set, serverTimestamp } from "firebase/database";
import { db } from '../firebaseConfig';
import { BulkAddItem, StockItem } from '../types';
import { Plus, Trash2, Save, X, Package, DollarSign, AlertTriangle } from 'lucide-react';

interface BulkAddProps {
  warehouseId: string;
  userEmail: string;
  onBack: () => void;
  existingItems: StockItem[];
}

export const BulkAdd: React.FC<BulkAddProps> = ({ warehouseId, userEmail, onBack, existingItems }) => {
  const [items, setItems] = useState<BulkAddItem[]>([
    {
      id: '1',
      name: '',
      category: '',
      quantity: 0,
      price: 0,
      minThreshold: 5,
      description: '',
      source: '',
      isNew: true
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['Electronics', 'Clothing', 'Food', 'Furniture', 'Books', 'Toys', 'Sports', 'Other'];

  const addItem = () => {
    const newItem: BulkAddItem = {
      id: Date.now().toString(),
      name: '',
      category: '',
      quantity: 0,
      price: 0,
      minThreshold: 5,
      description: '',
      source: '',
      isNew: true
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof BulkAddItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = async () => {
    const validItems = items.filter(item => item.name && item.category && item.quantity > 0 && item.price > 0);
    
    if (validItems.length === 0) {
      alert('Please add at least one valid item with all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const item of validItems) {
        const stockItem: Omit<StockItem, 'id'> = {
          warehouseId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          minThreshold: item.minThreshold,
          lastUpdated: serverTimestamp() as unknown as string,
          description: item.description,
          source: item.source
        };

        const newItemRef = push(ref(db, `stock/${warehouseId}`));
        await set(newItemRef, stockItem);

        // Add transaction record
        const transaction = {
          itemId: newItemRef.key,
          type: 'IN' as const,
          quantity: item.quantity,
          price: item.price,
          date: serverTimestamp() as unknown as string,
          partyName: item.source || 'Bulk Purchase',
          userEmail
        };

        await push(ref(db, `transactions/${warehouseId}`), transaction);
      }

      alert(`Successfully added ${validItems.length} items to inventory!`);
      onBack();
    } catch (error) {
      console.error('Error adding items:', error);
      alert('Error adding items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">Bulk Add Items</h2>
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
            {isSubmitting ? 'Saving...' : 'Save All Items'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (₹)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Threshold</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50">
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
                    <select
                      value={item.category}
                      onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
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
                      value={item.price}
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={item.minThreshold}
                      onChange={(e) => updateItem(item.id, 'minThreshold', parseInt(e.target.value) || 5)}
                      placeholder="5"
                      min="0"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.source}
                      onChange={(e) => updateItem(item.id, 'source', e.target.value)}
                      placeholder="Supplier name"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Optional description"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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

      {items.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Package className="w-5 h-5" />
            <span className="font-medium">Summary:</span>
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
              <span className="text-gray-600">Total Value:</span>
              <span className="ml-2 font-semibold">₹{items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Valid Items:</span>
              <span className="ml-2 font-semibold">{items.filter(item => item.name && item.category && item.quantity > 0 && item.price > 0).length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
