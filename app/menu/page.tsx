'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MenuCard } from '@/components/menu/MenuCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select, PasswordInput } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Table';
import { mockMenuItems, MenuItem, MenuCategory, MenuAvailability } from '@/lib/mock-data';

const ITEMS_PER_PAGE = 8;

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Main Course', label: 'Main Course' },
  { value: 'Appetizer', label: 'Appetizer' },
  { value: 'Dessert', label: 'Dessert' },
  { value: 'Beverages', label: 'Beverages' },
];

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'Available', label: 'Available' },
  { value: 'Sold Out', label: 'Sold Out' },
];

interface NewItemForm {
  name: string;
  category: string;
  price: string;
  description: string;
  availability: string;
}

const EMPTY_FORM: NewItemForm = {
  name: '', category: 'Main Course', price: '', description: '', availability: 'Available',
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>(mockMenuItems);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<NewItemForm>>({});

  // Filter
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesStatus = !statusFilter || item.availability === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleEdit(item: MenuItem) {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, price: String(item.price), description: item.description, availability: item.availability });
    setFormErrors({});
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    if (confirm('Delete this menu item?')) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  }

  function handleToggle(id: string) {
    setItems(prev => prev.map(i =>
      i.id === id ? { ...i, availability: i.availability === 'Available' ? 'Sold Out' : 'Available' as MenuAvailability } : i
    ));
  }

  function openAddModal() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function validateForm(): Partial<NewItemForm> {
    const errs: Partial<NewItemForm> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.category) errs.category = 'Category is required.';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) errs.price = 'Enter a valid price.';
    return errs;
  }

  function handleSave() {
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    if (editItem) {
      setItems(prev => prev.map(i =>
        i.id === editItem.id
          ? { ...i, name: form.name, category: form.category as MenuCategory, price: Number(form.price), description: form.description, availability: form.availability as MenuAvailability }
          : i
      ));
    } else {
      const newItem: MenuItem = {
        id: `M-${Date.now()}`,
        name: form.name,
        category: form.category as MenuCategory,
        price: Number(form.price),
        description: form.description,
        availability: form.availability as MenuAvailability,
        image: '',
      };
      setItems(prev => [newItem, ...prev]);
    }
    setModalOpen(false);
  }

  function setField(field: keyof NewItemForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      setFormErrors(fe => ({ ...fe, [field]: undefined }));
    };
  }

  return (
    <DashboardLayout searchPlaceholder="Search menu items...">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">Menu Management</h1>
          <p className="text-sm text-[#9BAAB8] mt-0.5">Manage active Pinoy dishes, prices, and availability</p>
        </div>
        <Button onClick={openAddModal} className="flex-shrink-0">
          <Plus size={15} /> Add Menu Item
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search dishes..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332] cursor-pointer"
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332] cursor-pointer"
        >
          {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {paginatedItems.length === 0 ? (
        <div className="text-center py-16 text-[#9BAAB8]">No menu items found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {paginatedItems.map(item => (
            <MenuCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemLabel="native dishes"
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Edit Menu Item' : 'Add Menu Item'}
        subtitle={editItem ? `Editing: ${editItem.name}` : 'Add a new dish to the HBA menu'}
      >
        <div className="space-y-4">
          <Input
            label="Food Name"
            placeholder="e.g. Chicken Adobo"
            value={form.name}
            onChange={setField('name')}
            error={formErrors.name}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={setField('category') as (e: React.ChangeEvent<HTMLSelectElement>) => void}
              error={formErrors.category}
              options={[
                { value: 'Main Course', label: 'Main Course' },
                { value: 'Appetizer', label: 'Appetizer' },
                { value: 'Dessert', label: 'Dessert' },
                { value: 'Beverages', label: 'Beverages' },
              ]}
            />
            <Input
              label="Price (₱)"
              type="number"
              placeholder="e.g. 185"
              value={form.price}
              onChange={setField('price')}
              error={formErrors.price}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1A2332]">Description</label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              placeholder="Brief description of the dish..."
              rows={3}
              className="w-full px-3 py-2 text-sm text-[#1A2332] bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] resize-none placeholder:text-[#9BAAB8]"
            />
          </div>
          <Select
            label="Availability"
            value={form.availability}
            onChange={setField('availability') as (e: React.ChangeEvent<HTMLSelectElement>) => void}
            options={[
              { value: 'Available', label: 'Available' },
              { value: 'Sold Out', label: 'Sold Out' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {editItem ? 'Save Changes' : 'Add Menu Item'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
