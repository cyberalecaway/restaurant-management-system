'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MenuCard } from '@/components/menu/MenuCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Table';
import { MenuItem, MenuCategory, MenuAvailability } from '@/lib/domain';
import { createClient } from '@/lib/supabase/client';
import { normalizeWhitespace, validateMenuInput } from '@/lib/input-validation.mjs';
import { useOnlineStatus } from '@/lib/use-online-status';

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
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<NewItemForm>>({});
  const [saving, setSaving] = useState(false);
  const online = useOnlineStatus();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') {
      openAddModal();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        if (active) setItems((data ?? []).map(row => ({ id: row.id, name: row.name, category: row.category as MenuCategory, price: Number(row.price), description: row.description, availability: row.availability as MenuAvailability, image: row.image_url ?? '' })));
      } catch (error) {
        if (active) setDataError(error instanceof Error ? error.message : 'Could not load menu items.');
      } finally {
        if (active) setLoadingData(false);
      }
    }
    void loadMenu();
    return () => { active = false; };
  }, []);

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

  async function handleDelete(id: string) {
    if (!online) { setDataError('You are offline. Reconnect before deleting menu items.'); return; }
    if (confirm('Delete this menu item?')) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) throw error;
        setItems(prev => prev.filter(i => i.id !== id));
        setDataError('');
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'Could not delete this menu item.');
      }
    }
  }

  async function handleToggle(id: string) {
    if (!online) { setDataError('You are offline. Reconnect before changing menu availability.'); return; }
    const item = items.find(current => current.id === id);
    if (!item) return;
    const availability: MenuAvailability = item.availability === 'Available' ? 'Sold Out' : 'Available';
    try {
      const supabase = createClient();
      const { error } = await supabase.from('menu_items').update({ availability }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(current => current.id === id ? { ...current, availability } : current));
      setDataError('');
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not change menu availability.');
    }
  }

  function openAddModal() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function validateForm(): Partial<NewItemForm> {
    return validateMenuInput(form) as Partial<NewItemForm>;
  }

  async function handleSave() {
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const normalizedName = normalizeWhitespace(form.name);
    const normalizedCategory = normalizeWhitespace(form.category);
    const duplicate = items.some(item => item.id !== editItem?.id &&
      normalizeWhitespace(item.name).toLocaleLowerCase() === normalizedName.toLocaleLowerCase() &&
      normalizeWhitespace(item.category).toLocaleLowerCase() === normalizedCategory.toLocaleLowerCase());
    if (duplicate) {
      setFormErrors({ name: 'This menu item already exists in that category.' });
      return;
    }
    if (!online) { setDataError('You are offline. Reconnect before saving menu changes.'); return; }
    setSaving(true);
    try {
      const supabase = createClient();
      const values = { name: normalizedName, category: normalizedCategory, price: Number(form.price), description: form.description.trim(), availability: form.availability as MenuAvailability };
      const result = editItem
        ? await supabase.from('menu_items').update(values).eq('id', editItem.id).select('*').single()
        : await supabase.from('menu_items').insert(values).select('*').single();
      if (result.error) {
        if (result.error.code === '23505') {
          setFormErrors({ name: 'This menu item already exists in that category.' });
          return;
        }
        throw result.error;
      }
      const row = result.data;
      const saved: MenuItem = { id: row.id, name: row.name, category: row.category as MenuCategory, price: Number(row.price), description: row.description, availability: row.availability as MenuAvailability, image: row.image_url ?? '' };
      setItems(prev => editItem ? prev.map(item => item.id === saved.id ? saved : item) : [saved, ...prev]);
      setDataError('');
      setModalOpen(false);
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not save the menu item.');
    } finally {
      setSaving(false);
    }
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
        <Button onClick={openAddModal} className="flex-shrink-0" disabled={!online}>
          <Plus size={15} /> Add Menu Item
        </Button>
      </div>

      {dataError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dataError}</p>}
      {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: menu data already loaded can be viewed, but changes need an internet connection.</p>}

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
      {loadingData ? <div role="status" className="py-12 text-center text-[#66716e]">Loading menu items…</div> : paginatedItems.length === 0 ? (
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
            maxLength={120}
            required
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
              min="0.01"
              max="100000"
              step="0.01"
              inputMode="decimal"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1A2332]">Description</label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              placeholder="Brief description of the dish..."
              rows={3}
              maxLength={1000}
              aria-invalid={Boolean(formErrors.description)}
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
            <Button className="flex-1" onClick={handleSave} isLoading={saving} disabled={!online}>
              {editItem ? 'Save Changes' : 'Add Menu Item'}
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
